'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Mobile bottom navigation (spec `note-capture` → "Notes workspace").
 *
 * The reference design for this app's phone layout puts the four primary
 * destinations in a fixed bottom bar rather than in the header: on a 390px
 * screen they are one thumb-reach away, the header stops wrapping onto four
 * rows, and the page keeps its vertical space. Everything that is not a
 * primary destination (creating records, admin, signing out) stays behind the
 * header's hamburger.
 *
 * Rendered from the root layout so the bar is identical on every route, and
 * the body carries the matching bottom padding so it never covers content.
 */

const DESTINATIONS = [
  {
    href: '/notas',
    label: 'Notas',
    icon: 'M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z M14 3v5h5',
  },
  {
    href: '/calendario',
    label: 'Calendario',
    icon: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z M4 10h16 M8 3v4 M16 3v4',
  },
  {
    href: '/etiquetas',
    label: 'Etiquetas',
    icon: 'M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9Z M7.5 7.5h.01',
  },
  {
    href: '/telegram',
    label: 'Telegram',
    icon: 'M21 4 3 11l5 2 2 6 3-4 5 4Z',
  },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-surface md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {DESTINATIONS.map((destination) => {
        const active =
          pathname === destination.href ||
          pathname.startsWith(`${destination.href}/`);

        return (
          <Link
            key={destination.href}
            href={destination.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.6875rem] font-semibold transition-colors ${
              active ? 'text-accent-ink' : 'text-ink-subtle'
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={destination.icon} />
            </svg>
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}
