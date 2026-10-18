import { describe, expect, it, vi } from 'vitest';
import { attachmentImageSrc } from './attachments';
import {
  NOTE_IMAGE_FAILURE_MESSAGE,
  uploadNoteImage,
  type FetchLike,
} from './note-image';
import { sanitizeNoteHtml } from './rich-text';

/**
 * The upload helper's failure branches and — more importantly — the contract
 * it shares with the sanitizer: the `src` this module produces must be one the
 * server whitelist keeps. If the two ever drift, every stored image silently
 * disappears on the next render, so the coupling is pinned here.
 */

const FILE = new File(['bytes'], 'foto.png', { type: 'image/png' });

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('uploadNoteImage', () => {
  it('posts the record id and the file, and resolves to the attachment src', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ attachment: { fileId: 'file-1' } }, 201),
    );

    const result = await uploadNoteImage('note-1', FILE, fetchImpl);

    expect(result).toEqual({ ok: true, src: '/api/attachments/file-1' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/attachments/upload');
    expect(init?.method).toBe('POST');
    const body = init?.body as FormData;
    expect(body.get('recordId')).toBe('note-1');
    expect(body.get('file')).toBe(FILE);
  });

  it('surfaces the server message when the route rejects the upload', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ error: 'Tipo de archivo no soportado.' }, 415),
    );

    const result = await uploadNoteImage('note-1', FILE, fetchImpl);

    expect(result).toEqual({
      ok: false,
      message: 'Tipo de archivo no soportado.',
    });
  });

  it('falls back to the generic message when the network throws', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw new Error('offline');
    });

    const result = await uploadNoteImage('note-1', FILE, fetchImpl);

    expect(result).toEqual({ ok: false, message: NOTE_IMAGE_FAILURE_MESSAGE });
  });

  it('rejects a success body without a usable fileId', async () => {
    const missing = vi.fn<FetchLike>(async () =>
      jsonResponse({ attachment: {} }, 201),
    );
    const malformed = vi.fn<FetchLike>(async () =>
      new Response('not json', { status: 201 }),
    );

    expect(await uploadNoteImage('note-1', FILE, missing)).toEqual({
      ok: false,
      message: NOTE_IMAGE_FAILURE_MESSAGE,
    });
    expect(await uploadNoteImage('note-1', FILE, malformed)).toEqual({
      ok: false,
      message: NOTE_IMAGE_FAILURE_MESSAGE,
    });
  });

  it('produces a src the note sanitizer keeps (cross-module contract)', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ attachment: { fileId: 'file-1' } }, 201),
    );

    const result = await uploadNoteImage('note-1', FILE, fetchImpl);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const rendered = sanitizeNoteHtml(`<p><img src="${result.src}" alt="foto"></p>`);

    expect(rendered).toContain(`src="${attachmentImageSrc('file-1')}"`);
  });
});
