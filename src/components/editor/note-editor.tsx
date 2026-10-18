'use client';

import { useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { EditorToolbar } from './editor-toolbar';
import { noteEditorExtensions } from './extensions';
import { IMAGE_ATTACHMENT_ACCEPT } from '@/lib/attachments';
import { uploadNoteImage } from '@/lib/note-image';

/**
 * Rich-text note body editor (spec `note-capture` → "Rich-text body and
 * sanitization").
 *
 * Uncontrolled by design: `initialHtml` only seeds the document, and every
 * edit is reported through `onChange` so the form can carry it in a hidden
 * input. Keeping the document inside Tiptap is what stops a failed submit from
 * wiping what the user typed — the server can re-render the form with fresh
 * errors while the body stays exactly where it was.
 *
 * Inline images need the note's `recordId`: the upload route stores each file
 * as an attachment of that record, which is what the read proxy later
 * authorizes against. While creating, the button is disabled and the form
 * explains why.
 */
export interface NoteEditorProps {
  /** Seed content; later changes are owned by the editor, not by this prop. */
  initialHtml: string;
  onChange(html: string): void;
  /** The note id once it exists — absent while creating a new note. */
  recordId?: string;
}

export function NoteEditor({ initialHtml, onChange, recordId }: NoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: noteEditorExtensions,
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'rich-text field min-h-40 rounded-t-none border-t-0 focus:outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  async function handlePickedFile(file: File): Promise<void> {
    if (recordId === undefined || editor === null) {
      return;
    }
    setImageError(null);
    setImageUploading(true);
    const result = await uploadNoteImage(recordId, file);
    setImageUploading(false);

    if (!result.ok) {
      setImageError(result.message);
      return;
    }

    editor.chain().focus().setImage({ src: result.src, alt: file.name }).run();
  }

  return (
    <div className="flex flex-col">
      {editor === null ? (
        <div className="min-h-[2.625rem] rounded-t-[var(--radius-control)] border border-b-0 border-hairline bg-surface-sunken px-2 py-1.5" />
      ) : (
        <EditorToolbar
          editor={editor}
          canAttachImages={recordId !== undefined}
          imageUploading={imageUploading}
          onPickImage={() => fileInputRef.current?.click()}
        />
      )}

      <EditorContent editor={editor} />

      {recordId === undefined ? (
        <p className="meta mt-1">
          Guardá la nota para poder adjuntar imágenes.
        </p>
      ) : null}

      {imageError !== null ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {imageError}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file twice still fires `change`.
          event.target.value = '';
          if (file !== undefined) {
            void handlePickedFile(file);
          }
        }}
      />
    </div>
  );
}
