'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { createNoteAction, updateNoteAction } from '@/actions/notes';
import { NoteEditor } from '@/components/editor/note-editor';
import {
  INITIAL_NOTE_STATE,
  type CreateNoteState,
} from '@/lib/note-creation';
import { TAG_INPUT_HINT, formatTags } from '@/lib/tags';
import {
  NOTE_TITLE_MAX_LENGTH,
  type NoteDraft,
} from '@/lib/validation/note';

/**
 * Note form (PR3 task 3.4, spec `note-capture`): a client component wrapping
 * the note server actions with `useActionState`. Without `recordId` it
 * creates through `createNoteAction`; with it, it edits through
 * `updateNoteAction` — notes previously had no edit affordance anywhere, so
 * the calendar's Editar link dead-ended in `TaskForm`, which requires a time
 * a note never stores. The body is authored in the shared `NoteEditor` module
 * (block styles, marks, lists, checklists, tables and inline images) and
 * submitted as HTML through a hidden `bodyHtml` input; the title and date are
 * optional. The editor renders client-side only (`immediatelyRender: false`)
 * so SSR and hydration stay in sync.
 */
interface NoteFormProps {
  /** Present → edit this note instead of creating a new one. */
  recordId?: string;
  /** Owner id, advisory — the action re-checks it against the session. */
  createdBy?: string;
  /** Server-rendered current values for edit mode. */
  initial?: { title: string; date: string; bodyHtml: string };
  /**
   * The note's stored tags. They arrive as an array, the input holds the raw
   * comma-separated string, so the form renders them through `formatTags`.
   */
  initialTags?: string[];
  /** Where the Cancel link goes — the calendar modal closes back to itself. */
  cancelHref?: string;
  /** Post-success destination forwarded to the update action (edit mode only). */
  returnTo?: string;
}

function FieldError({ message }: { message?: string }) {
  if (message === undefined) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-red-700">
      {message}
    </p>
  );
}

export function NoteForm({
  recordId,
  createdBy,
  initial,
  initialTags,
  cancelHref = '/',
  returnTo,
}: NoteFormProps = {}) {
  // Both actions share the same state shape, so the hook never changes shape
  // between modes — only which action it dispatches to.
  const action = recordId === undefined ? createNoteAction : updateNoteAction;
  const initialValues: NoteDraft = {
    ...(initial ?? {}),
    tags: formatTags(initialTags ?? []),
  };
  const [state, formAction, pending] = useActionState<CreateNoteState, FormData>(
    action,
    recordId === undefined
      ? INITIAL_NOTE_STATE
      : { fieldErrors: {}, formError: null, values: initialValues },
  );
  const values = state.values;
  const [bodyHtml, setBodyHtml] = useState(values.bodyHtml ?? '');

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-5">
      {recordId !== undefined ? (
        <>
          <input type="hidden" name="documentId" defaultValue={recordId} />
          <input type="hidden" name="createdBy" defaultValue={createdBy ?? ''} />
          {returnTo !== undefined ? (
            <input type="hidden" name="returnTo" value={returnTo} />
          ) : null}
        </>
      ) : null}
      {state.formError !== null ? (
        <p role="alert" className="banner banner-danger">
          {state.formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="field-label">
          Título (opcional)
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={NOTE_TITLE_MAX_LENGTH}
          defaultValue={values.title}
          aria-invalid={state.fieldErrors.title !== undefined}
          className="field"
        />
        <FieldError message={state.fieldErrors.title} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Contenido</span>
        <NoteEditor
          initialHtml={values.bodyHtml ?? ''}
          onChange={setBodyHtml}
          recordId={recordId}
        />
        <input type="hidden" name="bodyHtml" value={bodyHtml} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="field-label">
          Fecha (opcional)
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={values.date}
          aria-invalid={state.fieldErrors.date !== undefined}
          className="field"
        />
        <FieldError message={state.fieldErrors.date} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tags" className="field-label">
          Etiquetas
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={values.tags ?? ''}
          aria-invalid={state.fieldErrors.tags !== undefined}
          aria-describedby="tags-hint"
          placeholder="compras, urgente"
          className="field"
        />
        <p id="tags-hint" className="meta">
          {TAG_INPUT_HINT}
        </p>
        <FieldError message={state.fieldErrors.tags} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary disabled:opacity-60"
        >
          {pending
            ? 'Guardando…'
            : recordId === undefined
              ? 'Guardar nota'
              : 'Guardar cambios'}
        </button>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
