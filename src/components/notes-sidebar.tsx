import Link from 'next/link';
import {
  NOTES_FOLDERS_HEADING,
  NOTES_NO_TAGS_MESSAGE,
  NOTES_TAGS_HEADING,
  type NotesFolder,
} from '@/lib/notes-workspace';

/**
 * First column of the workspace (spec `note-capture` → "Notes workspace").
 *
 * Two ladders: the record types the workspace can show (Todo, Notas, Tareas,
 * Solicitudes, Citas) and the tags the caller's records carry, most-used
 * first. Both keep the rest of the query alive, so narrowing by type does not
 * drop the keyword or the folder and vice versa.
 *
 * A server component: it renders links and text only, so the workspace keeps
 * its state in the URL (`?type=`, `?tag=`) exactly like the rest of the app.
 */
export function NotesSidebar({
  typeFilters,
  tagFolders,
}: {
  typeFilters: NotesFolder[];
  tagFolders: NotesFolder[];
}) {
  return (
    <aside className="flex flex-col gap-5 border-hairline bg-surface-sunken/50 p-4 md:min-h-0 md:overflow-y-auto md:border-r">
      <div>
        <h2 className="meta font-semibold tracking-wide uppercase">
          {NOTES_FOLDERS_HEADING}
        </h2>
        <ul className="mt-2 flex flex-col gap-1">
          {typeFilters.map((folder) => (
            <li key={folder.tag === '' ? 'all' : folder.tag}>
              <FolderLink folder={folder} />
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-0">
        <h2 className="meta font-semibold tracking-wide uppercase">
          {NOTES_TAGS_HEADING}
        </h2>
        {tagFolders.length === 0 ? (
          <p className="meta mt-2">{NOTES_NO_TAGS_MESSAGE}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {tagFolders.map((folder) => (
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
