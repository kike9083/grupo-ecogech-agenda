import type { ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';

/**
 * Shared chrome for the sub-routes (Nueva, Nota, Editar, Calendario,
 * Telegram, Etiquetas, Admin): the single `AppHeader` over a `page-shell`
 * content column, with the route's own title as the page heading.
 *
 * It used to take an `actions` cluster per route, which is what made every
 * page show a different menu. The navigation now lives entirely in
 * `AppHeader`, so a page only states what it is and what it renders.
 */
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="page-shell flex flex-col gap-6 py-8">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle !== undefined ? (
            <p className="meta mt-1">{subtitle}</p>
          ) : null}
        </div>

        {children}
      </main>
    </div>
  );
}
