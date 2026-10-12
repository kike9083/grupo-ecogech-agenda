'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

/**
 * Reusable modal chrome (spec `calendar-view` → "Task detail modal"): a fixed
 * overlay that dismisses on a backdrop click or the Escape key, and a panel
 * with a header and a close link. The body is passed in as `children`, so the
 * calendar renders its server-side detail inside a small client shell.
 *
 * Dismissal is a GET navigation to `closeHref` (the same URL without the
 * `task` parameter), which keeps the modal URL-driven — no local open/closed
 * state to drift out of sync with the address bar.
 */
export function ModalShell({
  closeHref,
  label,
  closeLabel,
  children,
}: {
  /** Calendar URL without the `task` parameter — closes the modal. */
  closeHref: string;
  /** Accessible name of the dialog. */
  label: string;
  /** Copy of the visible close control. */
  closeLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.push(closeHref);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeHref, router]);

  // Freeze the page behind the overlay while it is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={() => router.push(closeHref)}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="card relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{label}</h2>
          <Link href={closeHref} className="btn btn-ghost btn-sm">
            {closeLabel}
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
