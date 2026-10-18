import Link from 'next/link';
import {
  NOTES_LIST_HEADING,
  NOTES_LOAD_ERROR_MESSAGE,
  NOTES_NEW_LABEL,
  buildNotesHref,
  notesEmptyMessage,
  type NoteListItem,
} from '@/lib/notes-workspace';

/**
 * Middle column of the notes workspace (spec `note-capture` → "Notes
 * workspace"): the note rows, newest first, with the row currently open in the
 * editor pane marked through `aria-current`. The header carries the one action
 * the column owns — starting a new note, which goes to the existing create
 * route so the editor stays the single authoring surface.
 */
export interface NotesListProps {
  items: NoteListItem[];
  /** Id of the note shown in the editor pane; '' when nothing is selected. */
  activeId: string;
  /** Canonical tag the list is filtered to; '' for every note. */
  tag: string;
  /** True when the list could not be read at all. */
  failed: boolean;
}

export function NotesList({ items, activeId, tag, failed }: NotesListProps) {
  return (
    <section className="flex min-h-0 flex-col border-hairline md:border-r">
      <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <h2 className="text-sm font-bold">{NOTES_LIST_HEADING}</h2>
        <Link href="/nota" className="btn btn-primary btn-sm">
          {NOTES_NEW_LABEL}
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed ? (
          <p role="alert" className="banner banner-danger m-4">
            {NOTES_LOAD_ERROR_MESSAGE}
          </p>
        ) : items.length === 0 ? (
          <p className="meta m-4">{notesEmptyMessage({ filtered: tag !== '' })}</p>
        ) : (
          <ul className="divide-y divide-hairline-soft">
            {items.map((item) => {
              const active = item.id === activeId;

              return (
                <li key={item.id}>
                  <Link
                    href={buildNotesHref({ tag, id: item.id })}
                    aria-current={active ? 'true' : undefined}
                    className={`block px-4 py-3 transition-colors ${
                      active
                        ? 'bg-accent-soft'
                        : 'hover:bg-surface-sunken/60'
                    }`}
                  >
                    <span
                      className={`block truncate text-sm ${
                        active
                          ? 'font-bold text-accent-ink'
                          : 'font-semibold text-ink'
                      }`}
                    >
                      {item.heading}
                    </span>
                    <span className="meta mt-0.5 block truncate">
                      {item.snippet === ''
                        ? item.notedAt
                        : `${item.notedAt} — ${item.snippet}`}
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
