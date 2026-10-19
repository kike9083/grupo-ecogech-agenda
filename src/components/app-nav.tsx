'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logout } from '@/actions/auth';

/**
 * The header's navigation (spec `note-capture` → "Notes workspace").
 *
 * A client component because the mobile menu needs open/closed state. On a
 * phone the eight destinations wrapped onto four rows and overlapped the page
 * content, so below `md` the primary destinations move to the fixed bottom bar
 * (`MobileNav`) and what remains — creating records, admin, signing out —
 * collapses behind a hamburger; from `md` up everything stays inline exactly
 * as before.
 */

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/nota', label: 'Nueva nota' },
];

export function AppNav({ admin }: { admin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: every destination inline, as it always was. */}
      <nav className="hidden flex-wrap items-center justify-end gap-2 md:flex">
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

      {/* Mobile: one control instead of four wrapped rows. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="app-nav-mobile"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((value) => !value)}
        className="btn btn-secondary md:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open ? (
        <nav
          id="app-nav-mobile"
          className="flex w-full flex-col gap-2 border-t border-hairline pt-3 md:hidden"
        >
          <Link
            href="/nueva"
            onClick={() => setOpen(false)}
            className="btn btn-primary w-full"
          >
            Nueva tarea
          </Link>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="btn btn-secondary w-full"
            >
              {link.label}
            </Link>
          ))}
          {admin ? (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="btn btn-secondary w-full"
            >
              Administración
            </Link>
          ) : null}
          <form action={logout} className="w-full">
            <button type="submit" className="btn btn-ghost w-full">
              Cerrar sesión
            </button>
          </form>
        </nav>
      ) : null}
    </>
  );
}
