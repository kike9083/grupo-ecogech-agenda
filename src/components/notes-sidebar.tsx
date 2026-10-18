import Link from 'next/link';
import {
  NOTES_FOLDERS_HEADING,
  NOTES_NO_TAGS_MESSAGE,
  NOTES_TAGS_HEADING,
  type NotesFolder,
} from '@/lib/notes-workspace';

/**
 * First column of the notes workspace (spec `note-capture` → "Notes
 * workspace"): the folders list, Apple-Notes style. The synthetic "Todas las
 * notas" entry always comes first so an unfiltered view is one click away,
 * followed by every tag the caller's notes carry, each with its count.
 *
 * A server component: it renders links and text only, so the workspace keeps
 * its state in the URL (`?tag=`) exactly like the rest of the app.
 */
export function NotesSidebar({ folders }: { folders: NotesFolder[] }) {
  const [all, ...tags] = folders;

  return (
    <aside className="flex flex-col gap-5 border-hairline bg-surface-sunken/50 p-4 md:min-h-0 md:overflow-y-auto md:border-r">
      <div>
        <h2 className="meta font-semibold tracking-wide uppercase">
          {NOTES_FOLDERS_HEADING}
        </h2>
        {all === undefined ? null : (
          <ul className="mt-2 flex flex-col gap-1">
            <li>
              <FolderLink folder={all} />
            </li>
          </ul>
        )}
      </div>

      <div className="min-h-0">
        <h2 className="meta font-semibold tracking-wide uppercase">
          {NOTES_TAGS_HEADING}
        </h2>
        {tags.length === 0 ? (
          <p className="meta mt-2">{NOTES_NO_TAGS_MESSAGE}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {tags.map((folder) => (
              <li key={folder.tag}>
                <FolderLink folder={folder} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function FolderLink({ folder }: { folder: NotesFolder }) {
  return (
    <Link
      href={folder.href}
      aria-current={folder.active ? 'true' : undefined}
      className={`flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors ${
        folder.active
          ? 'bg-accent-soft font-semibold text-accent-ink'
          : 'text-ink-muted hover:bg-surface hover:text-ink'
      }`}
    >
      <span className="truncate">{folder.label}</span>
      {folder.count === null ? null : (
        <span className="meta shrink-0">{folder.count}</span>
      )}
    </Link>
  );
}
