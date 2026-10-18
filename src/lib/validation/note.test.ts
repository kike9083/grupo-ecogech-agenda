import { describe, expect, it } from 'vitest';
import { buildNoteRecord, buildNoteUpdate, validateNoteDraft } from './note';

const owner = { id: 'user-123', email: 'ana@grupoecotech.com' };

describe('validateNoteDraft (spec note-capture → Note creation)', () => {
  it('accepts a note without a title (title is optional)', () => {
    const result = validateNoteDraft({ bodyHtml: '<p>Acuerdo de octubre</p>' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe('note');
      expect(result.value.title).toBe('');
    }
  });

  it('accepts an undated note and keeps the empty-string date sentinel', () => {
    const result = validateNoteDraft({ title: 'Recordatorio' });

    expect(result).toEqual({
      ok: true,
      value: {
        type: 'note',
        title: 'Recordatorio',
        bodyHtml: '',
        date: '',
        tags: [],
      },
    });
  });

  it('trims the title and keeps a valid date', () => {
    const result = validateNoteDraft({
      title: '  Reunión  ',
      bodyHtml: '<p>Acta</p>',
      date: '2026-10-04',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        type: 'note',
        title: 'Reunión',
        bodyHtml: '<p>Acta</p>',
        date: '2026-10-04',
        tags: [],
      },
    });
  });

  it('normalizes a missing body to the empty string', () => {
    const result = validateNoteDraft({ title: 'Sin cuerpo' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bodyHtml).toBe('');
    }
  });

  it('rejects a title over 200 characters with the Spanish message', () => {
    const result = validateNoteDraft({ title: 'a'.repeat(201) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toBe(
        'El título debe tener como máximo 200 caracteres.',
      );
    }
  });

  it('accepts a 200-character title', () => {
    expect(validateNoteDraft({ title: 'a'.repeat(200) }).ok).toBe(true);
  });

  it('rejects a malformed date that is not YYYY-MM-DD', () => {
    const result = validateNoteDraft({ title: 'Con fecha', date: '04/10/2026' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.date).toBe(
        'La fecha debe ser una fecha válida en formato AAAA-MM-DD.',
      );
    }
  });

  it('rejects a date with no real calendar day (2026-02-30)', () => {
    expect(validateNoteDraft({ date: '2026-02-30' }).ok).toBe(false);
  });
});

describe('validateNoteDraft → tags (spec task-tagging)', () => {
  it('parses the raw comma-separated input into canonical tags', () => {
    const result = validateNoteDraft({ title: 'Acta', tags: ' Reunión , acta ' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tags).toEqual(['reunión', 'acta']);
    }
  });

  it('treats a missing tags field as an empty list', () => {
    const result = validateNoteDraft({ title: 'Acta' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tags).toEqual([]);
    }
  });

  it('rejects an over-long tag with the shared message', () => {
    const result = validateNoteDraft({ title: 'Acta', tags: 'a'.repeat(31) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.tags).toBe(
        'Cada etiqueta debe tener como máximo 30 caracteres.',
      );
    }
  });

  it('rejects more tags than the per-record limit', () => {
    const tags = Array.from({ length: 11 }, (_, index) => `t${index}`).join(',');

    const result = validateNoteDraft({ title: 'Acta', tags });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.tags).toBe(
        'Podés usar hasta 10 etiquetas por registro.',
      );
    }
  });
});

describe('buildNoteRecord (design D1 sentinels)', () => {
  it('fills the sentinels and derives searchText from title plus body text', () => {
    const validated = validateNoteDraft({
      title: 'Reunión',
      bodyHtml: '<p>Acuerdo de <strong>octubre</strong></p>',
      date: '2026-10-04',
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    expect(buildNoteRecord(validated.value, owner, 'Acuerdo de octubre')).toEqual({
      type: 'note',
      title: 'Reunión',
      description: '',
      date: '2026-10-04',
      time: '',
      status: 'open',
      createdBy: 'user-123',
      createdByEmail: 'ana@grupoecotech.com',
      bodyHtml: '<p>Acuerdo de <strong>octubre</strong></p>',
      searchText: 'Reunión Acuerdo de octubre',
      tags: [],
    });
  });

  it('carries the parsed tags onto the record (spec task-tagging)', () => {
    const validated = validateNoteDraft({ title: 'Acta', tags: 'compras' });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    expect(buildNoteRecord(validated.value, owner, '').tags).toEqual(['compras']);
  });

  it('keeps every sentinel empty for an untitled, undated note', () => {
    const validated = validateNoteDraft({});
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const record = buildNoteRecord(validated.value, owner, '');

    expect(record.title).toBe('');
    expect(record.date).toBe('');
    expect(record.time).toBe('');
    expect(record.description).toBe('');
    expect(record.status).toBe('open');
    expect(record.searchText).toBe(' ');
  });

  it('cuts searchText to the 700-char attribute size', () => {
    const validated = validateNoteDraft({ title: 't'.repeat(200) });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const record = buildNoteRecord(validated.value, owner, 'b'.repeat(600));

    expect(record.searchText).toHaveLength(700);
    expect(record.searchText).toBe('t'.repeat(200) + ' ' + 'b'.repeat(499));
  });
});

describe('buildNoteUpdate (note edit payload)', () => {
  it('sends only the editable attributes plus the derived index', () => {
    const validated = validateNoteDraft({
      title: 'Acuerdo',
      date: '2026-10-09',
      bodyHtml: '<p>Texto de la nota</p>',
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    expect(buildNoteUpdate(validated.value, 'Texto de la nota')).toEqual({
      title: 'Acuerdo',
      date: '2026-10-09',
      bodyHtml: '<p>Texto de la nota</p>',
      searchText: 'Acuerdo Texto de la nota',
      tags: [],
    });
  });

  it('carries the edited tag list, so tags survive a note edit', () => {
    const validated = validateNoteDraft({ title: 'Acuerdo', tags: 'compras' });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    expect(buildNoteUpdate(validated.value, '').tags).toEqual(['compras']);
  });

  it('never carries the attributes a note edit must not touch', () => {
    const validated = validateNoteDraft({ title: 'Acuerdo', bodyHtml: '<p>x</p>' });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const keys = Object.keys(buildNoteUpdate(validated.value, 'x'));

    expect(keys).toEqual(
      expect.arrayContaining(['title', 'date', 'bodyHtml', 'searchText', 'tags']),
    );
    for (const forbidden of ['type', 'status', 'time', 'description', 'createdBy']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('indexes the body text, not the (always empty) note description', () => {
    const validated = validateNoteDraft({ title: ' agua', bodyHtml: '<p>pago</p>' });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const update = buildNoteUpdate(validated.value, 'pago');

    expect(update.searchText).toBe('agua pago');
  });
});
