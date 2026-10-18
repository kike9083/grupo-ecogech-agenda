import { describe, expect, it, vi } from 'vitest';
import { attachmentImageSrc } from './attachments';
import {
  ATTACHMENT_UPLOAD_FAILURE_MESSAGE,
  NOTE_IMAGE_FAILURE_MESSAGE,
  uploadAttachmentFile,
  uploadNoteImage,
  type FetchLike,
} from './attachment-upload';
import { sanitizeNoteHtml } from './rich-text';

/**
 * The upload helper's failure branches and — more importantly — the contract
 * it shares with the sanitizer: the `src` the image helper produces must be
 * one the server whitelist keeps. If the two ever drift, every stored image
 * silently disappears on the next render, so the coupling is pinned here.
 */

const FILE = new File(['bytes'], 'foto.png', { type: 'image/png' });
const AUDIO = new File(['bytes'], 'dictado.webm', { type: 'audio/webm' });

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('uploadAttachmentFile', () => {
  it('posts the record id and the file, and resolves to the file id', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ attachment: { fileId: 'file-1' } }, 201),
    );

    const result = await uploadAttachmentFile('note-1', AUDIO, undefined, fetchImpl);

    expect(result).toEqual({ ok: true, fileId: 'file-1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/attachments/upload');
    expect(init?.method).toBe('POST');
    const body = init?.body as FormData;
    expect(body.get('recordId')).toBe('note-1');
    expect(body.get('file')).toBe(AUDIO);
  });

  it('surfaces the server message when the route rejects the upload', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ error: 'Tipo de archivo no soportado.' }, 415),
    );

    const result = await uploadAttachmentFile('note-1', AUDIO, undefined, fetchImpl);

    expect(result).toEqual({
      ok: false,
      message: 'Tipo de archivo no soportado.',
    });
  });

  it('falls back to the caller message when the network throws', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw new Error('offline');
    });

    expect(await uploadAttachmentFile('note-1', AUDIO, undefined, fetchImpl)).toEqual({
      ok: false,
      message: ATTACHMENT_UPLOAD_FAILURE_MESSAGE,
    });
    expect(
      await uploadAttachmentFile('note-1', AUDIO, 'No se pudo adjuntar el audio.', fetchImpl),
    ).toEqual({ ok: false, message: 'No se pudo adjuntar el audio.' });
  });

  it('rejects a success body without a usable fileId', async () => {
    const missing = vi.fn<FetchLike>(async () =>
      jsonResponse({ attachment: {} }, 201),
    );
    const malformed = vi.fn<FetchLike>(async () =>
      new Response('not json', { status: 201 }),
    );

    expect(await uploadAttachmentFile('note-1', AUDIO, undefined, missing)).toEqual({
      ok: false,
      message: ATTACHMENT_UPLOAD_FAILURE_MESSAGE,
    });
    expect(await uploadAttachmentFile('note-1', AUDIO, undefined, malformed)).toEqual({
      ok: false,
      message: ATTACHMENT_UPLOAD_FAILURE_MESSAGE,
    });
  });
});

describe('uploadNoteImage', () => {
  it('resolves to the attachment src on success', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ attachment: { fileId: 'file-1' } }, 201),
    );

    expect(await uploadNoteImage('note-1', FILE, fetchImpl)).toEqual({
      ok: true,
      src: '/api/attachments/file-1',
    });
  });

  it('uses the image-specific fallback message', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw new Error('offline');
    });

    expect(await uploadNoteImage('note-1', FILE, fetchImpl)).toEqual({
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
