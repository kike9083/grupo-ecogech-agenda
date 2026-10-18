import { attachmentImageSrc } from '@/lib/attachments';

/**
 * Attachment upload from the browser (spec `note-capture` → "Rich-text body
 * and sanitization", `attachments` → "Attachment upload").
 *
 * The client cannot talk to Appwrite directly, and the existing upload route
 * is the only path that stores a file: it links the new attachment document to
 * a record, which is what makes the read proxy authorize the bytes later. That
 * is why a record must already exist (`recordId`) before anything can be
 * attached — the note create flow redirects to the edit route for exactly this
 * reason (see `noteCreatedRedirect`), and dictation only offers to save its
 * audio once the note or task has an id.
 *
 * `fetch` is a parameter so the failure branches are unit-testable without a
 * network (design D5's injectable-edge pattern).
 */

export const ATTACHMENT_UPLOAD_URL = '/api/attachments/upload';

export const ATTACHMENT_UPLOAD_FAILURE_MESSAGE = 'No se pudo subir el archivo.';

export const NOTE_IMAGE_FAILURE_MESSAGE = 'No se pudo subir la imagen.';

/** The slice of `fetch` this module uses, injectable for tests. */
export type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

interface UploadResponseBody {
  attachment?: { fileId?: string };
  error?: string;
}

export type AttachmentUploadResult =
  | { ok: true; fileId: string }
  | { ok: false; message: string };

/**
 * Uploads one file for `recordId`. A network failure, a non-2xx status and a
 * malformed success body all collapse to the same user-visible outcome: the
 * caller shows the returned Spanish message and nothing is inserted.
 */
export async function uploadAttachmentFile(
  recordId: string,
  file: File,
  fallbackMessage: string = ATTACHMENT_UPLOAD_FAILURE_MESSAGE,
  fetchImpl: FetchLike = fetch,
): Promise<AttachmentUploadResult> {
  const body = new FormData();
  body.append('recordId', recordId);
  body.append('file', file);

  let response: Response;
  try {
    response = await fetchImpl(ATTACHMENT_UPLOAD_URL, {
      method: 'POST',
      body,
    });
  } catch {
    return { ok: false, message: fallbackMessage };
  }

  const payload = (await response
    .json()
    .catch(() => null)) as UploadResponseBody | null;

  if (!response.ok) {
    return { ok: false, message: payload?.error ?? fallbackMessage };
  }

  const fileId = payload?.attachment?.fileId;
  if (typeof fileId !== 'string' || fileId === '') {
    return { ok: false, message: fallbackMessage };
  }

  return { ok: true, fileId };
}

export type NoteImageUploadResult =
  | { ok: true; src: string }
  | { ok: false; message: string };

/**
 * Uploads one image and resolves to the `src` the sanitizer accepts (see
 * `ATTACHMENT_IMAGE_PATH`), or a Spanish message for the editor to show.
 */
export async function uploadNoteImage(
  recordId: string,
  file: File,
  fetchImpl: FetchLike = fetch,
): Promise<NoteImageUploadResult> {
  const result = await uploadAttachmentFile(
    recordId,
    file,
    NOTE_IMAGE_FAILURE_MESSAGE,
    fetchImpl,
  );

  return result.ok
    ? { ok: true, src: attachmentImageSrc(result.fileId) }
    : { ok: false, message: result.message };
}
