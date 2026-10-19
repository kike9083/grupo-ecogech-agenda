import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Databases, Storage } from 'node-appwrite';
import { AppHeader } from '@/components/app-header';
import { AttachmentForm } from '@/components/attachment-form';
import { AttachmentGallery } from '@/components/attachment-gallery';
import { NoteForm } from '@/components/note-form';
import { NotesList } from '@/components/notes-list';
import { NotesSidebar } from '@/components/notes-sidebar';
import { TaskForm } from '@/components/task-form';
import {
  ATTACHMENTS_BUCKET_ID,
  ATTACHMENTS_COLLECTION_ID,
  createAttachmentsApi,
  type Attachment,
} from '@/lib/appwrite/attachments';
import { createAdminClient, createSessionClient } from '@/lib/appwrite/clients';
import { isDomainError } from '@/lib/appwrite/errors';
import {
  getCurrentUser,
  getSessionSecret,
  isAdmin,
} from '@/lib/appwrite/session';
import {
  createTasksApi,
  loadTagCounts,
  loadWorkspaceRecords,
  type TagCount,
  type Task,
  type TaskPage,
} from '@/lib/appwrite/tasks';
import { loadEnv } from '@/lib/env';
import {
  NOTES_ATTACHMENTS_HEADING,
  NOTES_LOAD_ERROR_MESSAGE,
  NOTES_NEW_LABEL,
  NOTES_NEW_TASK_LABEL,
  NOTES_SELECT_PROMPT,
  NOTES_SUBTITLE,
  NOTES_TITLE,
  buildNotesHref,
  buildTagFolders,
  buildTypeFilters,
  resolveNotesEditorState,
  toWorkspaceListItem,
  type WorkspaceListItem,
} from '@/lib/notes-workspace';
import { plainTextFromHtml, sanitizeNoteHtml } from '@/lib/rich-text';
import { normalizeSearchTerm, type RawSearchParams } from '@/lib/search-query';
import { normalizeTagParam } from '@/lib/tags';
import { formatCreatedAt, formatNotedAt } from '@/lib/task-view';
import { TASK_TYPES } from '@/lib/validation/task';

/**
 * Workspace (spec `note-capture` → "Notes workspace"): the three-pane layout
 * the Apple Notes quick-note screen uses — folders on the left, the list in
 * the middle, the open record on the right.
 *
 * It is the app's main screen: `/` redirects here and the header's brand
 * points here. The middle column therefore holds every kind of record, not
 * only notes, and the right pane renders `NoteForm` for a note and `TaskForm`
 * for anything else.
 *
 * Every piece of state lives in the URL, like the calendar modal (design D4):
 * `?type=` the type filter, `?tag=` the folder, `?q=` the keyword and `?id=`
 * the open record. So a pane is never a client-side island, the browser's back
 * button walks the selection, and a link to one record is just a link.
 */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await getCurrentUser();
  if (user === null) {
    redirect('/login?error=expired');
  }

  const secret = await getSessionSecret();
  if (secret === null) {
    redirect('/login?error=expired');
  }

  const params = await searchParams;
  const rawType = first(params.type).trim();
  // An unknown type is ignored rather than passed to the query layer.
  const type = (TASK_TYPES as readonly string[]).includes(rawType) ? rawType : '';
  // Same canonicalization the list query expects for a tag param.
  const tag = normalizeTagParam(first(params.tag));
  const q = normalizeSearchTerm(first(params.q));
  const selectedId = first(params.id).trim();

  const admin = await isAdmin();
  const env = loadEnv();
  const deps = {
    config: {
      databaseId: env.APPWRITE_DATABASE_ID,
      collectionId: env.APPWRITE_TASKS_COLLECTION_ID,
      adminsTeamId: env.APPWRITE_ADMINS_TEAM_ID,
    },
    databasesFor: (sessionSecret: string) =>
      new Databases(createSessionClient(sessionSecret)),
  };

  // Middle column: the caller's records, narrowed by the URL state.
  let page: TaskPage | null = null;
  try {
    page = await loadWorkspaceRecords(user, secret, admin, deps, {
      type: type === '' ? undefined : (type as Task['type']),
      tag,
      q,
    });
  } catch (error) {
    if (isDomainError(error) && error.kind === 'session-expired') {
      redirect('/login?error=expired');
    }
    // Any other failure degrades to the error state in the list column.
  }

  // Left column: the folders. A failure here never hides the list.
  let counts: TagCount[] = [];
  try {
    counts = await loadTagCounts(user, secret, admin, deps);
  } catch {
    // Leave the tag folders empty — the type ladder still renders.
  }

  // Right column: the open record. Anything the caller cannot read resolves to
  // the prompt rather than to a broken pane.
  let selected: Task | null = null;
  let recordFailed = false;
  if (selectedId !== '') {
    try {
      const api = createTasksApi(deps.databasesFor(secret), deps.config);
      selected = await api.getTask(selectedId);
    } catch {
      recordFailed = true;
    }
  }

  const items: WorkspaceListItem[] =
    page === null
      ? []
      : page.tasks.map((record) =>
          toWorkspaceListItem(
            record,
            record.type === 'note'
              ? plainTextFromHtml(record.bodyHtml ?? '')
              : (record.description ?? ''),
          ),
        );

  // Below the editor: the open record's attachments. Loaded exactly like
  // `/editar` does — a session-scoped read for the record list plus the
  // API-key client for storage — and a failure never hides the record.
  let attachments: Attachment[] = [];
  if (selected !== null) {
    try {
      const client = admin ? createAdminClient() : createSessionClient(secret);
      attachments = await createAttachmentsApi(
        new Databases(client),
        new Storage(createAdminClient()),
        {
          databaseId: env.APPWRITE_DATABASE_ID,
          bucketId: ATTACHMENTS_BUCKET_ID,
          collectionId: ATTACHMENTS_COLLECTION_ID,
        },
      ).listAttachmentsForRecords([selected.$id]);
    } catch {
      // Leave the gallery empty — the record is still editable.
    }
  }

  const typeFilters = buildTypeFilters(type, { tag, q });
  const tagFolders = buildTagFolders(counts, tag, { type, q });
  const editor = resolveNotesEditorState(selected, recordFailed);
  const returnTo = buildNotesHref({ type, tag, q, id: selectedId });

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <div className="flex flex-col md:grid md:min-h-0 md:flex-1 md:grid-cols-[15rem_19rem_minmax(0,1fr)]">
        <NotesSidebar typeFilters={typeFilters} tagFolders={tagFolders} />

        <NotesList
          items={items}
          activeId={selectedId}
          type={type}
          tag={tag}
          q={q}
          failed={page === null}
        />

        <section className="min-h-0 overflow-y-auto p-4 md:p-6">
          {editor.kind === 'error' ? (
            <p role="alert" className="banner banner-danger">
              {NOTES_LOAD_ERROR_MESSAGE}
            </p>
          ) : editor.kind === 'empty' ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-ink-muted">{NOTES_SELECT_PROMPT}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/nota" className="btn btn-primary btn-sm">
                  {NOTES_NEW_LABEL}
                </Link>
                <Link href="/nueva" className="btn btn-secondary btn-sm">
                  {NOTES_NEW_TASK_LABEL}
                </Link>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
              <p className="meta">
                {editor.record.type === 'note'
                  ? formatNotedAt(editor.record.$createdAt)
                  : formatCreatedAt(editor.record.$createdAt)}
              </p>

              {editor.record.type === 'note' ? (
                <NoteForm
                  recordId={editor.record.$id}
                  createdBy={editor.record.createdBy}
                  initial={{
                    title: editor.record.title,
                    date: editor.record.date,
                    bodyHtml: sanitizeNoteHtml(editor.record.bodyHtml ?? ''),
                  }}
                  initialTags={editor.record.tags}
                  cancelHref={returnTo}
                  returnTo={returnTo}
                />
              ) : (
                <TaskForm
                  recordId={editor.record.$id}
                  createdBy={editor.record.createdBy}
                  initial={{
                    type: editor.record.type,
                    title: editor.record.title ?? '',
                    description: editor.record.description ?? '',
                    date: editor.record.date ?? '',
                    time: editor.record.time ?? '',
                  }}
                  initialTags={editor.record.tags}
                  cancelHref={returnTo}
                  returnTo={returnTo}
                />
              )}

              <section className="card flex flex-col gap-3 p-5">
                <h3 className="text-sm font-semibold">
                  {NOTES_ATTACHMENTS_HEADING}
                </h3>
                <AttachmentGallery attachments={attachments} />
                <AttachmentForm recordId={editor.record.$id} />
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
