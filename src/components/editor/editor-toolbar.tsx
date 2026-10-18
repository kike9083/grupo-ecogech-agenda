'use client';

import { useEditorState, type Editor } from '@tiptap/react';

/**
 * Note editor toolbar (spec `note-capture` → "Rich-text body and
 * sanitization"). Apple Notes' format set, rendered with the app's own
 * button classes: no icon dependency, Spanish labels, and a block-style
 * selector that mirrors the "Aa" menu's Cuerpo/Título/Encabezado/Subtítulo/
 * Monoespaciado ladder.
 *
 * Active state is read through `useEditorState` rather than `editor.isActive`
 * during render: Tiptap v3 does not re-render on every transaction by default,
 * so a selector is what keeps the pressed states in sync without re-rendering
 * the whole form on each keystroke.
 */

const BLOCK_OPTIONS = [
  { value: 'paragraph', label: 'Cuerpo' },
  { value: 'h1', label: 'Título' },
  { value: 'h2', label: 'Encabezado' },
  { value: 'h3', label: 'Subtítulo' },
  { value: 'codeBlock', label: 'Monoespaciado' },
] as const;

type BlockValue = (typeof BLOCK_OPTIONS)[number]['value'];

function currentBlock(editor: Editor): BlockValue {
  if (editor.isActive('codeBlock')) {
    return 'codeBlock';
  }
  if (editor.isActive('heading', { level: 1 })) {
    return 'h1';
  }
  if (editor.isActive('heading', { level: 2 })) {
    return 'h2';
  }
  if (editor.isActive('heading', { level: 3 })) {
    return 'h3';
  }
  return 'paragraph';
}

function applyBlock(editor: Editor, value: BlockValue): void {
  const chain = editor.chain().focus();
  switch (value) {
    case 'paragraph':
      chain.setParagraph().run();
      return;
    case 'codeBlock':
      chain.setCodeBlock().run();
      return;
    case 'h1':
      chain.setHeading({ level: 1 }).run();
      return;
    case 'h2':
      chain.setHeading({ level: 2 }).run();
      return;
    case 'h3':
      chain.setHeading({ level: 3 }).run();
  }
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick(): void;
}

function ToolButton({ label, active = false, disabled = false, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="btn btn-tool"
    >
      {label}
    </button>
  );
}

function Separator() {
  return <span aria-hidden className="mx-0.5 h-5 w-px self-center bg-hairline" />;
}

export interface EditorToolbarProps {
  editor: Editor;
  /**
   * False while creating a note: an image is stored as an attachment of the
   * note record, so there is nothing to attach it to until the note exists.
   */
  canAttachImages: boolean;
  /** True while an image upload is in flight — the button reports it. */
  imageUploading: boolean;
  onPickImage(): void;
}

export function EditorToolbar({
  editor,
  canAttachImages,
  imageUploading,
  onPickImage,
}: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      block: currentBlock(instance),
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      underline: instance.isActive('underline'),
      strike: instance.isActive('strike'),
      bulletList: instance.isActive('bulletList'),
      orderedList: instance.isActive('orderedList'),
      taskList: instance.isActive('taskList'),
      blockquote: instance.isActive('blockquote'),
      codeBlock: instance.isActive('codeBlock'),
      highlight: instance.isActive('highlight'),
      link: instance.isActive('link'),
      inTable: instance.isActive('table'),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  const setLink = () => {
    const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
    const href = window.prompt('Dirección del enlace', previous);
    if (href === null) {
      return;
    }
    const trimmed = href.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-[var(--radius-control)] border border-b-0 border-hairline bg-surface-sunken px-2 py-1.5">
      <label className="sr-only" htmlFor="note-block-style">
        Estilo del párrafo
      </label>
      <select
        id="note-block-style"
        value={state.block}
        onChange={(event) => applyBlock(editor, event.target.value as BlockValue)}
        className="rounded-[var(--radius-control)] border border-hairline bg-surface px-2 py-1 text-[0.8125rem] font-semibold text-ink-muted"
      >
        {BLOCK_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <Separator />

      <ToolButton
        label="Negrita"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolButton
        label="Cursiva"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolButton
        label="Subrayado"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolButton
        label="Tachado"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolButton
        label="Resaltar"
        active={state.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      />

      <Separator />

      <ToolButton
        label="Viñetas"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        label="Numerada"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolButton
        label="Checklist"
        active={state.taskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />

      <Separator />

      <ToolButton
        label="Cita"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolButton
        label="Código"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <ToolButton label="Enlace" active={state.link} onClick={setLink} />

      <Separator />

      <ToolButton
        label={imageUploading ? 'Subiendo…' : 'Imagen'}
        disabled={!canAttachImages || imageUploading}
        onClick={onPickImage}
      />
      <ToolButton
        label="Tabla"
        active={state.inTable}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />

      {state.inTable ? (
        <>
          <Separator />
          <ToolButton
            label="+ Fila"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          />
          <ToolButton
            label="− Fila"
            onClick={() => editor.chain().focus().deleteRow().run()}
          />
          <ToolButton
            label="+ Columna"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          />
          <ToolButton
            label="− Columna"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          />
          <ToolButton
            label="Borrar tabla"
            onClick={() => editor.chain().focus().deleteTable().run()}
          />
        </>
      ) : null}

      <Separator />

      <ToolButton
        label="Deshacer"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolButton
        label="Rehacer"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  );
}
