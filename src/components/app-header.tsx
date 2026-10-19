import Link from 'next/link';
import { logout } from '@/actions/auth';
import { getCurrentUser, isAdmin } from '@/lib/appwrite/session';

/**
 * The app's single header (spec `note-capture` → "Notes workspace").
 *
 * Every authenticated page renders THIS header instead of its own action
 * cluster, so the menu is identical everywhere, stays pinned while the page
 * scrolls, and offers the same jump points — including the Telegram settings
 * and its linking flow, which used to be missing from the workspace.
 *
 * The brand links to the workspace, the app's main screen: that is the
 * "back to start" the user reaches for, and it replaced a brand that pointed
 * at the old flat task list.
 *
 * `getCurrentUser` and `isAdmin` are wrapped in React `cache()`, so calling
 * them here costs nothing when the page already resolved them for its own
 * gate.
 */
export async function AppHeader() {
  const user = await getCurrentUser();
  if (user === null) {
    // The login screen has no navigation; the page gate already redirected.
    return null;
  }

  const admin = await isAdmin();

  return (
    <header className="frosted">
      <div className="page-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <Link
          href="/notas"
          aria-label="Ir a Notas"
          className="flex items-center gap-2.5 rounded-xl transition hover:opacity-90"
        >
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
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold">Agenda</span>
            <span className="meta">Grupo Ecotech</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/nueva" className="btn btn-primary">
            Nueva tarea
          </Link>
          <Link href="/nota" className="btn btn-secondary">
            Nueva nota
          </Link>
          <Link href="/notas" className="btn btn-secondary">
            Notas
          </Link>
          <Link href="/calendario" className="btn btn-secondary">
            Calendario
          </Link>
          <Link href="/etiquetas" className="btn btn-secondary">
            Etiquetas
          </Link>
          <Link href="/telegram" className="btn btn-secondary">
            Telegram
          </Link>
          {admin ? (
            <Link href="/admin" className="btn btn-secondary">
              Administración
            </Link>
          ) : null}
          <form action={logout}>
            <button type="submit" className="btn btn-ghost">
              Cerrar sesión
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
