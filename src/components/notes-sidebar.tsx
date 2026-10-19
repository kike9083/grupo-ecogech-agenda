import Link from 'next/link';
import {
  NOTES_FOLDERS_HEADING,
  NOTES_NO_TAGS_MESSAGE,
  NOTES_TAGS_HEADING,
  type NotesFolder,
} from '@/lib/notes-workspace';

/**
 * The workspace's filters (spec `note-capture` → "Notes workspace").
 *
 * Two shapes for one model, matching the phone reference design: below `md`
 * the type ladder and the tag list become horizontally scrollable chip rows
 * under the header, which keeps the list at the top of the screen instead of
 * pushing it below two stacked columns; from `md` up they are the vertical
 * sidebar the three-pane layout was built around.
 *
 * Both shapes preserve the rest of the query, so narrowing by type never drops
 * the keyword or the folder and vice versa.
 */
export function NotesSidebar({
  typeFilters,
  tagFolders,
}: {
  typeFilters: NotesFolder[];
  tagFolders: NotesFolder[];
}) {
  return (
    <>
      {/* Phone: chips. */}
      <div className="flex flex-col gap-2 border-b border-hairline p-3 md:hidden">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {typeFilters.map((folder) => (
            <li key={folder.tag === '' ? 'all' : folder.tag} className="shrink-0">
              <Chip folder={folder} />
            </li>
          ))}
        </ul>

        {tagFolders.length > 0 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {tagFolders.map((folder) => (
              <li key={folder.tag} className="shrink-0">
                <Chip folder={folder} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Desktop: the sidebar the grid reserves a column for. */}
      <aside className="hidden flex-col gap-5 border-hairline bg-surface-sunken/50 p-4 md:flex md:min-h-0 md:overflow-y-auto md:border-r">
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
    </>
  );
}

/** A filter as a pill, for the phone's chip rows. */
function Chip({ folder }: { folder: NotesFolder }) {
  return (
    <Link
      href={folder.href}
      aria-current={folder.active ? 'true' : undefined}
      className={`badge ${
        folder.active ? 'badge-accent border border-accent' : 'badge-tag'
      }`}
    >
      {folder.label}
      {folder.count === null ? null : (
        <span className="opacity-70">{folder.count}</span>
      )}
    </Link>
  );
}

/** A filter as a full-width row, for the desktop sidebar. */
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
