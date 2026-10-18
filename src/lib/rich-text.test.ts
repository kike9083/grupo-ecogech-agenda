import { describe, expect, it } from 'vitest';
import {
  normalizeNoteBodyHtml,
  plainTextFromHtml,
  sanitizeNoteHtml,
} from './rich-text';

describe('plainTextFromHtml (spec note-capture → Plain-text search index)', () => {
  it('keeps inline text and drops the tags', () => {
    expect(plainTextFromHtml('<p>Acuerdo de <strong>octubre</strong></p>')).toBe(
      'Acuerdo de octubre',
    );
  });

  it('joins block elements with a single space', () => {
    expect(
      plainTextFromHtml('<h1>Título</h1><ul><li>Uno</li><li>Dos</li></ul>'),
    ).toBe('Título Uno Dos');
  });

  it('decodes the common HTML entities', () => {
    expect(plainTextFromHtml('<p>Pan &amp; vino &lt;bueno&gt;</p>')).toBe(
      'Pan & vino <bueno>',
    );
  });

  it('drops script and style content entirely', () => {
    expect(plainTextFromHtml('<script>alert(1)</script>Hola')).toBe('Hola');
    expect(plainTextFromHtml('<style>p{color:red}</style>Texto')).toBe('Texto');
  });

  it('returns an empty string for markup with no text', () => {
    expect(plainTextFromHtml('<p></p>')).toBe('');
    expect(plainTextFromHtml('')).toBe('');
  });

  it('indexes table cells and checklist items like paragraph text', () => {
    expect(
      plainTextFromHtml(
        '<table><tbody><tr><td>jose</td><td>45</td></tr></tbody></table>',
      ),
    ).toBe('jose 45');

    expect(
      plainTextFromHtml(
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">' +
          '<label><input type="checkbox"><span></span></label>' +
          '<div><p>Comprar pan</p></div></li></ul>',
      ),
    ).toBe('Comprar pan');
  });
});

describe('sanitizeNoteHtml (spec note-capture → Rich-text body and sanitization)', () => {
  it('strips script tags and their content', () => {
    const clean = sanitizeNoteHtml('<p>Hola</p><script>alert(1)</script>');

    expect(clean).toContain('<p>Hola</p>');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert(1)');
  });

  it('strips inline event handlers such as onerror', () => {
    const clean = sanitizeNoteHtml('<img src="x" onerror="alert(1)">');

    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert(1)');
  });

  it('drops javascript: URLs from links', () => {
    const clean = sanitizeNoteHtml('<a href="javascript:alert(1)">x</a>');

    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('x');
  });

  it('preserves bold, lists and headings (formatting round-trip)', () => {
    const clean = sanitizeNoteHtml(
      '<h2>Título</h2><ul><li><strong>Uno</strong> y <em>dos</em></li></ul>',
    );

    expect(clean).toContain('<h2>');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<li>');
    expect(clean).toContain('<strong>');
    expect(clean).toContain('<em>');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeNoteHtml('')).toBe('');
  });

  it('strips inline style attributes so pasted markup cannot overlay the UI', () => {
    const clean = sanitizeNoteHtml(
      '<p style="position:fixed;inset:0;background:url(https://evil.test/pixel)">Hola</p>',
    );

    expect(clean).toBe('<p>Hola</p>');
    expect(clean).not.toContain('style');
    expect(clean).not.toContain('url(');
  });

  it('keeps link attributes while dropping style from headings and lists', () => {
    const clean = sanitizeNoteHtml(
      '<h2 style="background:url(https://evil.test/x)">Título</h2>' +
        '<ul><li style="position:fixed">Uno</li></ul>' +
        '<a href="https://example.test" style="position:fixed">enlace</a>',
    );

    expect(clean).toContain('href="https://example.test"');
    expect(clean).not.toContain('style');
    expect(clean).not.toContain('position:fixed');
  });

  it('keeps an inline image only when it points at the attachment endpoint', () => {
    const clean = sanitizeNoteHtml(
      '<p><img src="/api/attachments/abc123" alt="Acta"></p>',
    );

    expect(clean).toContain('src="/api/attachments/abc123"');
    expect(clean).toContain('alt="Acta"');
  });

  it('drops images whose src is not the app attachment endpoint', () => {
    const external = sanitizeNoteHtml('<img src="https://evil.test/pixel.gif">');
    const absolute = sanitizeNoteHtml('<img src="http://evil.test/pixel.gif">');
    const protocolRelative = sanitizeNoteHtml('<img src="//evil.test/pixel.gif">');
    const dataUri = sanitizeNoteHtml(
      '<img src="data:image/svg+xml,<svg onload=alert(1)>">',
    );

    expect(external).toBe('');
    expect(absolute).toBe('');
    expect(protocolRelative).toBe('');
    expect(dataUri).not.toContain('data:');
    expect(dataUri).not.toContain('onload');
  });

  it('keeps tables and their cell structure', () => {
    const clean = sanitizeNoteHtml(
      '<table><tbody><tr><th colspan="1" rowspan="1"><p>Nombre</p></th>' +
        '<td colspan="1" rowspan="1"><p>Edad</p></td></tr></tbody></table>',
    );

    expect(clean).toContain('<table>');
    expect(clean).toContain('<th');
    expect(clean).toContain('<td');
    expect(clean).toContain('colspan="1"');
    expect(clean).toContain('Nombre');
    expect(clean).toContain('Edad');
  });

  it('keeps checklist items with their checkbox state', () => {
    const clean = sanitizeNoteHtml(
      '<ul data-type="taskList">' +
        '<li data-type="taskItem" data-checked="true">' +
        '<label><input type="checkbox" checked="checked"><span></span></label>' +
        '<div><p>Hecho</p></div></li></ul>',
    );

    expect(clean).toContain('data-type="taskList"');
    expect(clean).toContain('data-type="taskItem"');
    expect(clean).toContain('data-checked="true"');
    expect(clean).toContain('type="checkbox"');
    expect(clean).toContain('Hecho');
  });

  it('keeps the highlight mark', () => {
    const clean = sanitizeNoteHtml('<p><mark>Importante</mark></p>');

    expect(clean).toContain('<mark>');
    expect(clean).toContain('Importante');
  });

  it('keeps only a colour declaration on span styles', () => {
    const kept = sanitizeNoteHtml('<span style="color: #ff0000">Rojo</span>');
    const dropped = sanitizeNoteHtml(
      '<span style="position:fixed;background:url(https://evil.test/x)">x</span>',
    );

    expect(kept).toContain('color:#ff0000');
    expect(kept).not.toContain('position');
    expect(dropped).not.toContain('position:fixed');
    expect(dropped).not.toContain('url(');
  });
});

describe('normalizeNoteBodyHtml (cleared Tiptap documents)', () => {
  it('collapses an emptied editor document to the empty string', () => {
    expect(normalizeNoteBodyHtml('<p></p>')).toBe('');
    expect(normalizeNoteBodyHtml('<p><br></p>')).toBe('');
    expect(normalizeNoteBodyHtml('')).toBe('');
    expect(normalizeNoteBodyHtml('   ')).toBe('');
  });

  it('keeps a body that still carries text', () => {
    expect(normalizeNoteBodyHtml('<p>Hola</p>')).toBe('<p>Hola</p>');
    expect(normalizeNoteBodyHtml('<p> </p><p>Hola</p>')).toBe(
      '<p> </p><p>Hola</p>',
    );
  });

  it('keeps an image-only body instead of collapsing it away', () => {
    const body = '<p><img src="/api/attachments/abc123" alt="Acta"></p>';

    expect(normalizeNoteBodyHtml(body)).toBe(body);
  });
});
