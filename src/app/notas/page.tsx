import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Databases } from 'node-appwrite';
import { NoteForm } from '@/components/note-form';
import { NotesList } from '@/components/notes-list';
import { NotesSidebar } from '@/components/notes-sidebar';
import { createSessionClient } from '@/lib/appwrite/clients';
import { isDomainError } from '@/lib/appwrite/errors';
import {
  getCurrentUser,
  getSessionSecret,
  isAdmin,
} from '@/lib/appwrite/session';
import {
  createTasksApi,
  loadNoteTasks,
  loadTagCounts,
  type TagCount,
  type Task,
  type TaskPage,
} from '@/lib/appwrite/tasks';
import { loadEnv } from '@/lib/env';
import {
  NOTES_LOAD_ERROR_MESSAGE,
  NOTES_NEW_LABEL,
  NOTES_SELECT_PROMPT,
  NOTES_SUBTITLE,
  NOTES_TITLE,
  buildNotesFolders,
  buildNotesHref,
  resolveNotesEditorState,
  toNoteListItem,
  type NoteListItem,
} from '@/lib/notes-workspace';
import { plainTextFromHtml, sanitizeNoteHtml } from '@/lib/rich-text';
import type { RawSearchParams } from '@/lib/search-query';
import { normalizeTagParam } from '@/lib/tags';
import { formatNotedAt } from '@/lib/task-view';

/**
 * Notes workspace (spec `note-capture` → "Notes workspace"): the three-pane
 * layout the Apple Notes quick-note screen uses — folders on the left, the
 * note list in the middle, the open note on the right.
 *
 * Every piece of state lives in the URL, like the calendar modal (design D4):
 * `?tag=` picks the folder, `?id=` picks the note shown in the editor pane. So
 * a pane is never a client-side island, the browser's back button walks the
 * selection, and a link to one note is just a link.
 *
 * The editor pane reuses `NoteForm`, which is already the single authoring
 * surface for a note (Tiptap body, title, date, tags) — the workspace changes
 * where it is shown, not what it does.
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
  // Same canonicalization the list query expects for a tag param.
  const tag = normalizeTagParam(first(params.tag));
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

  // Middle column: the caller's notes, optionally narrowed to one tag.
  let page: TaskPage | null = null;
  try {
    page = await loadNoteTasks(user, secret, admin, deps, { tag });
  } catch (error) {
    if (isDomainError(error) && error.kind === 'session-expired') {
      redirect('/login?error=expired');
    }
    // Any other failure degrades to the error state in the list column.
  }

  // Left column: the folders. A failure here never hides the notes.
  let counts: TagCount[] = [];
  try {
    counts = await loadTagCounts(user, secret, admin, deps);
  } catch {
    // Leave the tag folders empty — "Todas las notas" still renders.
  }

  // Right column: the open note. A record that is not a note (or that the
  // caller cannot read) resolves to the prompt rather than to a broken pane.
  let selected: Task | null = null;
  let noteFailed = false;
  if (selectedId !== '') {
    try {
      const api = createTasksApi(deps.databasesFor(secret), deps.config);
      const found = await api.getTask(selectedId);
      selected = found !== null && found.type === 'note' ? found : null;
    } catch {
      noteFailed = true;
    }
  }

  const items: NoteListItem[] =
    page === null
      ? []
      : page.tasks.map((note) =>
          toNoteListItem(note, plainTextFromHtml(note.bodyHtml ?? '')),
        );

  const folders = buildNotesFolders(counts, tag);
  const editor = resolveNotesEditorState(selected, noteFailed);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="frosted">
        <div className="page-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl bg-accent-soft"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <path d="M14 3v5h5" />
                <path d="M8 13h8M8 17h5" />
              </svg>
            </span>
            <div className="flex flex-col leading-tight">
              <h1 className="text-base font-bold">{NOTES_TITLE}</h1>
              <span className="meta">{NOTES_SUBTITLE}</span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/nota" className="btn btn-primary">
              {NOTES_NEW_LABEL}
            </Link>
            <Link href="/" className="btn btn-secondary">
              Agenda
            </Link>
            <Link href="/calendario" className="btn btn-secondary">
              Calendario
            </Link>
            <Link href="/etiquetas" className="btn btn-secondary">
              Etiquetas
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex flex-col md:grid md:min-h-0 md:flex-1 md:grid-cols-[15rem_19rem_minmax(0,1fr)]">
        <NotesSidebar folders={folders} />

        <NotesList
          items={items}
          activeId={selectedId}
          tag={tag}
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
              <Link href="/nota" className="btn btn-primary btn-sm">
                {NOTES_NEW_LABEL}
              </Link>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
              <p className="meta">{formatNotedAt(editor.note.$createdAt)}</p>
              <NoteForm
                recordId={editor.note.$id}
                createdBy={editor.note.createdBy}
                initial={{
                  title: editor.note.title,
                  date: editor.note.date,
                  bodyHtml: sanitizeNoteHtml(editor.note.bodyHtml ?? ''),
                }}
                initialTags={editor.note.tags}
                cancelHref={buildNotesHref({ tag, id: editor.note.$id })}
                returnTo={buildNotesHref({ tag, id: editor.note.$id })}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
