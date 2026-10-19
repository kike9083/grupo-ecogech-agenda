import type { MetadataRoute } from 'next';

/**
 * Web app manifest (spec `pwa` → "Installable app").
 *
 * `start_url` is the workspace rather than the root: `/` only redirects there,
 * so pointing at it would make the installed app take an extra hop on every
 * cold start. `display: standalone` is what removes the browser chrome once
 * the app is added to a home screen.
 *
 * The maskable icon is a separate file with the glyph pulled into the safe
 * zone: Android crops a maskable icon to whatever shape the launcher uses, and
 * reusing the rounded-corner icon would clip its own corners twice.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grupo Ecotech Agenda',
    short_name: 'Agenda',
    description: 'Notas, tareas y citas compartidas del equipo Grupo Ecotech.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/notas',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f8f7',
    theme_color: '#059669',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
