import { redirect } from 'next/navigation';

/**
 * The root used to be the flat task list. The notes workspace is the app's
 * main screen now (spec `note-capture` → "Notes workspace"), so `/` simply
 * sends the visitor there — which keeps every existing link, bookmark and
 * "back" target working instead of dead-ending on a removed page.
 */
export default function HomePage(): never {
  redirect('/notas');
}
