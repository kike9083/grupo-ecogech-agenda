import Image from '@tiptap/extension-image';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import type { Extensions } from '@tiptap/react';

/**
 * Note editor extension set (spec `note-capture` → "Rich-text body and
 * sanitization").
 *
 * This list is the single place where the note body's capabilities are
 * declared, and it is deliberately narrow enough that everything it can emit
 * survives `sanitizeNoteHtml` (`@/lib/rich-text`). The two must move together:
 * an extension whose output the whitelist rejects would silently lose content
 * on the next render.
 *
 * Notes on the choices that are not obvious:
 *
 * - `StarterKit` already ships heading/link/underline/strike and the undo-redo
 *   pair in v3, so they are configured here instead of added as extra packages.
 * - `heading.levels` is capped at 3 because the app's type scale only defines
 *   h1–h3; a deeper level would render unstyled.
 * - `link.openOnClick` is off so a click in the editor places the caret instead
 *   of navigating away mid-edit.
 * - `Table.resizable` is off on purpose: a resizable table writes inline
 *   `style`/`colwidth` into the document, and the sanitizer only ever keeps a
 *   validated `color` on `span` — the borders are drawn by `.rich-text` CSS.
 * - `Image.allowBase64` is off: a `data:` URI is rejected by the sanitizer, and
 *   inline images are uploaded to the attachment bucket instead.
 * - `TaskItem.nested` lets a checklist indent, matching the list behaviour the
 *   other two list types already have.
 */
export const noteEditorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer' },
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Image.configure({ allowBase64: false, inline: false }),
  Highlight,
  TextStyle,
  Color,
  Placeholder.configure({
    placeholder: 'Escribí el contenido de la nota…',
  }),
];
