import sanitizeHtml from 'sanitize-html';
import { ATTACHMENT_IMAGE_PATH } from '@/lib/attachments';

/**
 * Rich-text helpers (spec `note-capture`). SERVER-ONLY: `sanitize-html` must
 * never reach the client bundle. `plainTextFromHtml` derives the text that
 * feeds `searchText`; `sanitizeNoteHtml` renders the stored body safely.
 */

/**
 * The only image sources a stored note may render: the app's own attachment
 * endpoint (pattern owned by `@/lib/attachments`). Inline images are uploaded
 * through `/api/attachments/upload` and served back from
 * `/api/attachments/[fileId]`, so every legitimate `src` is a relative path of
 * that exact shape. Anything else (absolute URLs, data URIs, protocol-relative
 * `//host`) is a tracking pixel or an exfiltration vector and is dropped whole
 * by `exclusiveFilter` below.
 */
const ALLOWED_IMAGE_SRC = ATTACHMENT_IMAGE_PATH;

/**
 * A single CSS declaration value that `allowedStyles` may keep. Anchored and
 * closed to a hex colour or an `rgb()`/`rgba()` triplet, so `url(...)`,
 * `expression(...)` and anything carrying a resource reference can never
 * survive — the reason `style` is not blanket-allowed on any tag.
 */
const COLOR_VALUE =
  /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/;

/**
 * Whitelist for note bodies: the editor's formatting set only — block styles,
 * inline marks, lists (including checklists), tables, images, links and the
 * highlight mark. `sanitize-html` strips `<script>` (with its content), inline
 * event handlers (`onerror`, …) and non-`http(s)`/`mailto` URLs by default.
 *
 * `style` stays forbidden on every tag except `span`, where `allowedStyles`
 * narrows it to a single, regex-validated `color` declaration. A blanket
 * `style` would let a pasted body carry `position:fixed` overlays or `url()`
 * trackers that `NoteBody` renders through `dangerouslySetInnerHTML`;
 * `StarterKit`, `TaskList`, `Table` and `Image` never need more than that.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'del',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'a',
    'hr',
    'span',
    'mark',
    'img',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'label',
    'input',
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    ul: ['data-type'],
    ol: ['data-type'],
    li: ['data-type', 'data-checked'],
    input: ['type', 'checked', 'disabled'],
    span: ['style'],
  },
  allowedStyles: {
    span: { color: [COLOR_VALUE] },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
  exclusiveFilter: (frame) =>
    frame.tag === 'img' && !ALLOWED_IMAGE_SRC.test(frame.attribs.src ?? ''),
};

/**
 * Renders a stored note body safely (spec `note-capture` → "XSS stripped"):
 * the formatting whitelist survives, everything executable is removed.
 */
export function sanitizeNoteHtml(html: string): string {
  if (html === '') {
    return '';
  }
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

const ENTITIES: ReadonlyArray<[RegExp, string]> = [
  [/&nbsp;/gi, ' '],
  [/&amp;/gi, '&'],
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&quot;/gi, '"'],
  [/&#39;/gi, "'"],
];

/**
 * Derives a plain-text representation of a rich-text body (spec
 * `note-capture` → "Plain-text search index"): script/style blocks are
 * dropped whole, remaining tags become whitespace, common entities are
 * decoded, and runs of whitespace collapse to single spaces. Because every
 * tag becomes a separator, text inside table cells and checklist items is
 * indexed exactly like paragraph text.
 */
export function plainTextFromHtml(html: string): string {
  if (html === '') {
    return '';
  }

  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const withoutTags = withoutBlocks.replace(/<[^>]*>/g, ' ');

  const decoded = ENTITIES.reduce(
    (text, [pattern, value]) => text.replace(pattern, value),
    withoutTags,
  );

  return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * A body is meaningful when it carries text OR a media node. Text alone is
 * not enough anymore: an image-only note is legitimate content (spec
 * `note-capture` → "Note creation"), and collapsing it to `''` would silently
 * drop the picture on save.
 */
function hasMeaningfulContent(html: string): boolean {
  return plainTextFromHtml(html) !== '' || /<img\b/i.test(html);
}

/**
 * Normalizes a stored note body: Tiptap emits `<p></p>` for a document the
 * user has cleared, which is not "empty" for `resolveNoteBodyState` — the
 * list would render a blank content block instead of the empty state. Writing
 * `''` keeps the stored value canonical from the first save onward. A body
 * that still holds text or an image is kept verbatim.
 */
export function normalizeNoteBodyHtml(html: string): string {
  return hasMeaningfulContent(html) ? html : '';
}
