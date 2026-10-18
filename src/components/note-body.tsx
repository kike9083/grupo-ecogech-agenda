import { sanitizeNoteHtml } from '@/lib/rich-text';
import { NOTE_EMPTY_MESSAGE, resolveNoteBodyState } from '@/lib/note-ui-states';

/**
 * Renders a stored note body (PR3 task 3.5, spec `note-capture` → "XSS
 * stripped"): the HTML goes through the server-side `sanitizeNoteHtml`
 * whitelist, so `<script>`/handlers never reach the browser. An absent or
 * blank body renders the distinct empty state (task 4.5). Server component —
 * `sanitize-html` is server-only and must not be bundled for the client.
 */
export function NoteBody({ html }: { html: string }) {
  if (resolveNoteBodyState(html) === 'empty') {
    return <p className="meta">{NOTE_EMPTY_MESSAGE}</p>;
  }

  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(html) }}
    />
  );
}
