'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';
import { createTaskAction, updateTaskAction } from '@/actions/tasks';
import { AudioRecorder } from '@/components/audio-recorder';
import { uploadAttachmentFile } from '@/lib/attachment-upload';
import { joinDictation } from '@/lib/dictation';
import {
  INITIAL_CREATE_STATE,
  type CreateTaskState,
} from '@/lib/task-creation';
import {
  INITIAL_UPDATE_STATE,
  type UpdateTaskState,
} from '@/lib/task-update';
import { TAG_INPUT_HINT, formatTags } from '@/lib/tags';
import {
  DESCRIPTION_MAX_LENGTH,
  TASK_TYPES,
  TITLE_MAX_LENGTH,
  type TaskDraft,
} from '@/lib/validation/task';
import { typeLabel } from '@/lib/task-view';

/**
 * The types THIS form may create or edit. `note` is excluded on purpose: a
 * note is authored in `NoteForm`, the only editor that writes `bodyHtml` and
 * rebuilds `searchText` from the body. Minting one here would attach a
 * required `time` and a `description`, and the first edit through `NoteForm`
 * would drop that description out of the search index for good.
 */
const TASK_FORM_TYPES = TASK_TYPES.filter((type) => type !== 'note');

/**
 * Create/edit task form (PR3 task 4.3): a client component wrapping a server
 * action with `useActionState` — validation failures re-render inline from
 * the returned state (field errors + banner) while the submitted values are
 * preserved through `defaultValue`.
 *
 * Passing `recordId` switches it into edit mode: it posts to
 * `updateTaskAction`, seeds the fields from the server-rendered record, and
 * changes the submit copy. Both action hooks are called unconditionally so
 * the hook order never depends on the mode.
 */
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

export function TaskForm({
  defaultDate = '',
  recordId,
  createdBy,
  initial,
  initialTags,
  cancelHref = '/',
  returnTo,
}: {
  defaultDate?: string;
  /** Present only in edit mode — switches action, submit copy and payload. */
  recordId?: string;
  /** Owner id of the target record; advisory, Appwrite enforces the write. */
  createdBy?: string;
  /** Server-rendered record values used until the first failed submission. */
  initial?: TaskDraft;
  /**
   * The record's stored tags. They arrive as an array, the input holds the
   * raw comma-separated string, so the form renders them through
   * `formatTags` — same seeding rules as `initial`.
   */
  initialTags?: string[];
  /** Where the Cancel link goes — the calendar modal closes back to itself. */
  cancelHref?: string;
  /** Post-success destination forwarded to the update action (edit mode only). */
  returnTo?: string;
}) {
  const editing = recordId !== undefined;
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [createState, createAction, createPending] = useActionState<
    CreateTaskState,
    FormData
  >(createTaskAction, INITIAL_CREATE_STATE);
  const [updateState, updateAction, updatePending] = useActionState<
    UpdateTaskState,
    FormData
  >(updateTaskAction, INITIAL_UPDATE_STATE);

  const state = editing ? updateState : createState;
  const pending = editing ? updatePending : createPending;
  const formAction = editing ? updateAction : createAction;

  // Seed from the record until a submission's echoed values take over.
  const values: TaskDraft =
    Object.keys(state.values).length > 0
      ? state.values
      : editing
        ? { ...(initial ?? {}), tags: formatTags(initialTags ?? []) }
        : { date: defaultDate };

  /**
   * Appends a dictated block to the description. The textarea is uncontrolled
   * (its value is the submitted one), so the insertion goes through the DOM
   * node and is capped exactly like typing into it would be.
   */
  function handleTranscript(text: string): void {
    const field = descriptionRef.current;
    if (field === null) {
      return;
    }
    field.value = joinDictation(field.value, text).slice(0, DESCRIPTION_MAX_LENGTH);
  }

  /** Stores the dictation audio as an attachment — only an existing record can own one. */
  async function handleDictatedAudio(file: File): Promise<void> {
    if (recordId === undefined) {
      return;
    }
    const result = await uploadAttachmentFile(recordId, file);
    if (!result.ok) {
      throw new Error(result.message);
    }
  }

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-5">
      {state.formError !== null ? (
        <p role="alert" className="banner banner-danger">
          {state.formError}
        </p>
      ) : null}

      {editing ? (
        <>
          <input type="hidden" name="documentId" value={recordId} />
          <input type="hidden" name="createdBy" value={createdBy ?? ''} />
          {returnTo !== undefined ? (
            <input type="hidden" name="returnTo" value={returnTo} />
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="field-label">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          defaultValue={values.type ?? 'task'}
          className="field"
        >
          {TASK_FORM_TYPES.map((option) => (
            <option key={option} value={option}>
              {typeLabel(option)}
            </option>
          ))}
        </select>
        <FieldError message={state.fieldErrors.type} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="field-label">
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={TITLE_MAX_LENGTH}
          defaultValue={values.title}
          aria-invalid={state.fieldErrors.title !== undefined}
          className="field"
        />
        <FieldError message={state.fieldErrors.title} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="field-label">
          Descripción
        </label>
        <textarea
          ref={descriptionRef}
          id="description"
          name="description"
          rows={4}
          maxLength={DESCRIPTION_MAX_LENGTH}
          defaultValue={values.description}
          aria-invalid={state.fieldErrors.description !== undefined}
          className="field"
        />
        <AudioRecorder
          onTranscript={handleTranscript}
          onAudio={
            recordId === undefined
              ? undefined
              : (file) => handleDictatedAudio(file)
          }
        />
        <FieldError message={state.fieldErrors.description} />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date" className="field-label">
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={values.date ?? ''}
            aria-invalid={state.fieldErrors.date !== undefined}
            className="field"
          />
          <FieldError message={state.fieldErrors.date} />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="time" className="field-label">
            Hora
          </label>
          <input
            id="time"
            name="time"
            type="time"
            defaultValue={values.time ?? ''}
            aria-invalid={state.fieldErrors.time !== undefined}
            className="field"
          />
          <FieldError message={state.fieldErrors.time} />
        </div>
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
            : editing
              ? 'Guardar cambios'
              : 'Crear tarea'}
        </button>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
