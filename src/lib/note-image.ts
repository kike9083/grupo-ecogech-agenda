import { attachmentImageSrc } from '@/lib/attachments';

/**
 * Inline note image upload (spec `note-capture` → "Rich-text body and
 * sanitization").
 *
 * The editor cannot talk to Appwrite directly, and the existing upload route
 * is the only path that stores a file: it links the new attachment document to
 * a note record, which is what makes the read proxy authorize the bytes later.
 * That is why a note must already exist (`recordId`) before an image can be
 * attached — the create flow redirects to the edit route for exactly this
 * reason (see `noteCreatedRedirect`).
 *
 * `fetch` is a parameter so the failure branches are unit-testable without a
 * network (design D5's injectable-edge pattern).
 */

export const NOTE_IMAGE_UPLOAD_URL = '/api/attachments/upload';

export const NOTE_IMAGE_FAILURE_MESSAGE = 'No se pudo subir la imagen.';

export type NoteImageUploadResult =
  | { ok: true; src: string }
  | { ok: false; message: string };

/** The slice of `fetch` this module uses, injectable for tests. */
export type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

interface UploadResponseBody {
  attachment?: { fileId?: string };
  error?: string;
}

/**
 * Uploads one image for `recordId` and resolves to the `src` the sanitizer
 * accepts, or a Spanish message for the editor to show inline. A network
 * failure, a non-2xx status and a malformed success body all collapse to the
 * same user-visible outcome: nothing is inserted.
 */
export async function uploadNoteImage(
  recordId: string,
  file: File,
  fetchImpl: FetchLike = fetch,
): Promise<NoteImageUploadResult> {
  const body = new FormData();
  body.append('recordId', recordId);
  body.append('file', file);

  let response: Response;
  try {
    response = await fetchImpl(NOTE_IMAGE_UPLOAD_URL, {
      method: 'POST',
      body,
    });
  } catch {
    return { ok: false, message: NOTE_IMAGE_FAILURE_MESSAGE };
  }

  const payload = (await response
    .json()
    .catch(() => null)) as UploadResponseBody | null;

  if (!response.ok) {
    return {
      ok: false,
      message: payload?.error ?? NOTE_IMAGE_FAILURE_MESSAGE,
    };
  }

  const fileId = payload?.attachment?.fileId;
  if (typeof fileId !== 'string' || fileId === '') {
    return { ok: false, message: NOTE_IMAGE_FAILURE_MESSAGE };
  }

  return { ok: true, src: attachmentImageSrc(fileId) };
}
