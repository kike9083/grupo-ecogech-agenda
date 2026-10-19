import Link from 'next/link';
import {
  NOTES_LIST_HEADING,
  NOTES_LOAD_ERROR_MESSAGE,
  NOTES_NEW_LABEL,
  NOTES_SEARCH_CLEAR_LABEL,
  NOTES_SEARCH_LABEL,
  NOTES_SEARCH_PLACEHOLDER,
  NOTES_SEARCH_SUBMIT_LABEL,
  buildNotesHref,
  notesEmptyMessage,
  type WorkspaceListItem,
} from '@/lib/notes-workspace';
import { statusLabel, typeLabel } from '@/lib/task-view';
import type { TaskType } from '@/lib/validation/task';

/**
 * Middle column of the workspace (spec `note-capture` → "Notes workspace"):
 * the records, newest first, with the one open in the editor pane marked
 * through `aria-current`.
 *
 * It is the app's list now that `/` redirects here, so it carries the keyword
 * box the old flat list had — and it holds notes, tasks, requests and events,
 * each labelled with its type (and, for the non-notes, its status).
 */
export interface NotesListProps {
  items: WorkspaceListItem[];
  /** Id of the record shown in the editor pane; '' when nothing is selected. */
  activeId: string;
  /** Active type filter; '' for every type. */
  type: string;
  /** Canonical tag the list is filtered to; '' for every tag. */
  tag: string;
  /** Active keyword; '' for the plain list. */
  q: string;
  /** True when the list could not be read at all. */
  failed: boolean;
}

/** Notes are the workspace's own kind; everything else reads as neutral. */
function typeBadgeClass(type: TaskType): string {
  return type === 'note' ? 'badge badge-accent' : 'badge badge-neutral';
}

export function NotesList({
  items,
  activeId,
  type,
  tag,
  q,
  failed,
}: NotesListProps) {
  return (
    <section className="flex min-h-0 flex-col border-hairline md:border-r">
      <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <h2 className="text-sm font-bold">{NOTES_LIST_HEADING}</h2>
        <Link href="/nota" className="btn btn-primary btn-sm">
          {NOTES_NEW_LABEL}
        </Link>
      </header>

      <form
        method="get"
        action="/notas"
        className="flex items-center gap-2 border-b border-hairline px-4 py-2"
      >
        {type !== '' ? <input type="hidden" name="type" value={type} /> : null}
        {tag !== '' ? <input type="hidden" name="tag" value={tag} /> : null}
        <label htmlFor="q" className="sr-only">
          {NOTES_SEARCH_LABEL}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={NOTES_SEARCH_PLACEHOLDER}
          className="field"
        />
        <button type="submit" className="btn btn-secondary btn-sm shrink-0">
          {NOTES_SEARCH_SUBMIT_LABEL}
        </button>
        {q !== '' ? (
          <Link
            href={buildNotesHref({ type, tag })}
            className="btn btn-ghost btn-sm shrink-0"
          >
            {NOTES_SEARCH_CLEAR_LABEL}
          </Link>
        ) : null}
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed ? (
          <p role="alert" className="banner banner-danger m-4">
            {NOTES_LOAD_ERROR_MESSAGE}
          </p>
        ) : items.length === 0 ? (
          <p className="meta m-4">
            {notesEmptyMessage({
              filtered: type !== '' || tag !== '' || q !== '',
            })}
          </p>
        ) : (
          <ul className="divide-y divide-hairline-soft">
            {items.map((item) => {
              const active = item.id === activeId;

              return (
                <li key={item.id}>
                  <Link
                    href={buildNotesHref({ type, tag, q, id: item.id })}
                    aria-current={active ? 'true' : undefined}
                    className={`block px-4 py-3 transition-colors ${
                      active ? 'bg-accent-soft' : 'hover:bg-surface-sunken/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={typeBadgeClass(item.type)}>
                        {typeLabel(item.type)}
                      </span>
                      {item.type !== 'note' ? (
                        <span className="badge badge-neutral">
                          {statusLabel(item.status)}
                        </span>
                      ) : null}
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          active
                            ? 'font-bold text-accent-ink'
                            : 'font-semibold text-ink'
                        }`}
                      >
                        {item.heading}
                      </span>
                    </span>
                    <span className="meta mt-1 block truncate">
                      {item.snippet === ''
                        ? item.when
                        : `${item.when} — ${item.snippet}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
