import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Databases } from 'node-appwrite';
import { PageShell } from '@/components/page-shell';
import { createSessionClient } from '@/lib/appwrite/clients';
import { isDomainError } from '@/lib/appwrite/errors';
import {
  getCurrentUser,
  getSessionSecret,
  isAdmin,
} from '@/lib/appwrite/session';
import { loadTagCounts, type TagCount } from '@/lib/appwrite/tasks';
import { loadEnv } from '@/lib/env';
import { normalizeSearchTerm, type RawSearchParams } from '@/lib/search-query';
import {
  TAGS_EMPTY_MESSAGE,
  TAGS_NO_MATCH_MESSAGE,
  TAGS_SEARCH_CLEAR_LABEL,
  TAGS_SEARCH_LABEL,
  TAGS_SEARCH_PLACEHOLDER,
  TAGS_SEARCH_SUBMIT_LABEL,
  TAGS_SECTION_SUBTITLE,
  TAGS_SECTION_TITLE,
  normalizeTag,
  tagCountLabel,
} from '@/lib/tags';
import { buildListHref } from '@/lib/task-view';

/**
 * Tag section (spec `task-tagging` → "Tag section"): every tag the caller's
 * records carry, most-used first, with a search box over the tag names. A tag
 * links to the home list filtered by it (`/?tag=`), which is the whole point
 * of the section — find the label, then see everything that carries it.
 *
 * The tallies are computed by `loadTagCounts` under the caller's own scope,
 * so a member only ever sees tags on their own records.
 */
export default async function EtiquetasPage({
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
  const rawQ = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = normalizeSearchTerm(rawQ ?? '');

  const admin = await isAdmin();
  const env = loadEnv();

  let counts: TagCount[] | null = null;
  try {
    counts = await loadTagCounts(user, secret, admin, {
      config: {
        databaseId: env.APPWRITE_DATABASE_ID,
        collectionId: env.APPWRITE_TASKS_COLLECTION_ID,
        adminsTeamId: env.APPWRITE_ADMINS_TEAM_ID,
      },
      databasesFor: (sessionSecret) =>
        new Databases(createSessionClient(sessionSecret)),
    });
  } catch (error) {
    if (isDomainError(error) && error.kind === 'session-expired') {
      redirect('/login?error=expired');
    }
    // Any other failure degrades to the error state below.
  }

  // The box filters the TAG NAMES, not the records — `normalizeTag` brings
  // the term to the same canonical form the stored tags use.
  const term = normalizeTag(q);
  const visible =
    counts === null
      ? []
      : term === ''
        ? counts
        : counts.filter((entry) => entry.tag.includes(term));

  return (
    <PageShell
      title={TAGS_SECTION_TITLE}
      subtitle={TAGS_SECTION_SUBTITLE}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <form method="get" action="/etiquetas" className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor="q" className="field-label">
              {TAGS_SEARCH_LABEL}
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={TAGS_SEARCH_PLACEHOLDER}
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {TAGS_SEARCH_SUBMIT_LABEL}
          </button>
          {q !== '' ? (
            <Link href="/etiquetas" className="btn btn-ghost">
              {TAGS_SEARCH_CLEAR_LABEL}
            </Link>
          ) : null}
        </form>

        {counts === null ? (
          <p role="alert" className="banner banner-danger">
            No se pudieron cargar las etiquetas. Intenta de nuevo más tarde.
          </p>
        ) : visible.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-sm text-ink-muted">
              {term === '' ? TAGS_EMPTY_MESSAGE : TAGS_NO_MATCH_MESSAGE}
            </p>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {visible.map(({ tag, count }) => (
              <li key={tag}>
                <Link
                  href={buildListHref({ tag })}
                  className="card card-hover flex items-center gap-2 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-ink">{tag}</span>
                  <span className="meta">{tagCountLabel(count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
