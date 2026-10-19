import type { Metadata, Viewport } from 'next';
import { Manrope, Inter } from 'next/font/google';
import { MobileNav } from '@/components/mobile-nav';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Metadata for the installable app (spec `pwa` → "Installable app").
 *
 * The web app manifest itself is generated from `app/manifest.ts`, which Next
 * links automatically. The icon set is declared here because the files live in
 * `public/` rather than following the `app/icon.png` convention — the same
 * generated PNGs serve the manifest, the browser tab and the iOS home screen
 * (`appleWebApp`), which is the only one of the three that ignores the
 * manifest.
 */
export const metadata: Metadata = {
  title: 'Grupo Ecotech Agenda',
  description: 'Shared task and request agenda for the Grupo Ecotech team',
  applicationName: 'Agenda',
  appleWebApp: {
    capable: true,
    title: 'Agenda',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

/**
 * `themeColor` lives on the viewport export in Next 15; it tints the status
 * bar of an installed app. `viewportFit: cover` lets the layout reach under a
 * notch instead of being letterboxed on a phone.
 */
export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${inter.variable} antialiased`}>
        {children}
        {/* The phone's primary destinations live in a fixed bottom bar; the
            body reserves its height (see globals.css). */}
        <MobileNav />
        <PwaRegister />
      </body>
    </html>
  );
}
