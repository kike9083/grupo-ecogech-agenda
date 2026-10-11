'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ATTACHMENT_ACCEPT } from '@/lib/attachments';

/**
 * Upload form for one record (PR6 task 6.6, spec `attachments` → "Attachment
 * upload" / "Upload failure handling"): posts the file to the route handler
 * (NOT a server action — Next caps action bodies at 1 MB), surfaces the
 * server's inline Spanish error and lets the user retry in place. On success
 * it refreshes the server-rendered gallery.
 *
 * The native input is visually hidden and the visible control is a button that
 * opens it. The button used to BE the submit, so pressing a control labelled
 * "Adjuntar" did nothing until a file had already been chosen through a
 * separate, easy-to-miss file field — which reads as "the picker is broken".
 * Choosing a file now uploads it in the same action.
 */
export function AttachmentForm({ recordId }: { recordId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (file === undefined) {
      // Defensive: the picker is the only path into this handler, so a file is
      // normally present. Say why nothing happened instead of failing silently.
      setSuccess(false);
      setError('Selecciona un archivo antes de adjuntar.');
      return;
    }

    const body = new FormData();
    body.set('recordId', recordId);
    body.set('file', file);

    setPending(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? 'No se pudo subir el archivo. Intenta de nuevo.');
        return;
      }
      // Explicit confirmation: without it a silent refresh reads as "nothing
      // happened" and the user assumes the attachment was lost.
      setSuccess(true);
      router.refresh();
    } catch {
      setError('No se pudo subir el archivo. Intenta de nuevo.');
    } finally {
      // A file input fires `change` only when its value actually changes, so
      // re-picking the same file after a failure would otherwise be silent.
      if (inputRef.current !== null) {
        inputRef.current.value = '';
      }
      setPending(false);
    }
  }

  /** Picking a file IS the action — upload it without a second click. */
  function handleFileChange(): void {
    setError(null);
    setSuccess(false);
    formRef.current?.requestSubmit();
  }

  const inputId = `attachment-${recordId}`;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        Adjuntar archivo
      </label>
      <input
        ref={inputRef}
        id={inputId}
        name="file"
        type="file"
        accept={ATTACHMENT_ACCEPT}
        onChange={handleFileChange}
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="btn btn-secondary btn-sm disabled:opacity-60"
      >
        {pending ? 'Subiendo…' : 'Adjuntar archivo'}
      </button>
      {error !== null ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-xs text-accent-ink">
          Archivo adjuntado correctamente.
        </p>
      ) : null}
    </form>
  );
}
