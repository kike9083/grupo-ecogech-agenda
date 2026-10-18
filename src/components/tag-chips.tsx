import Link from 'next/link';
import { buildListHref } from '@/lib/task-view';

/**
 * The tags of one record, rendered as outlined pills (spec `task-tagging`).
 *
 * `link` mode makes each chip a link to the home list filtered by that tag —
 * the one-click path from "I see this label" to "show me everything that
 * carries it". The calendar modal renders them as plain labels instead,
 * because its own navigation is a GET back to the calendar.
 */
export function TagChips({
  tags,
  link = false,
}: {
  tags: readonly string[];
  link?: boolean;
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <li key={tag}>
          {link ? (
            <Link href={buildListHref({ tag })} className="badge badge-tag">
              {tag}
            </Link>
          ) : (
            <span className="badge badge-tag">{tag}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
