import { describe, expect, it } from 'vitest';
import {
  MAX_TAGS_PER_RECORD,
  TAG_MAX_LENGTH,
  formatTags,
  normalizeTag,
  normalizeTagParam,
  parseTags,
  tagCountLabel,
  validateTags,
} from './tags';

describe('normalizeTag', () => {
  it('trims the edges, collapses inner whitespace and lowercases', () => {
    expect(normalizeTag('  Compras   del   mes  ')).toBe('compras del mes');
  });

  it('keeps accents and digits', () => {
    expect(normalizeTag('Instalación 2')).toBe('instalación 2');
  });
});

describe('parseTags', () => {
  it('splits on commas and normalizes every piece', () => {
    expect(parseTags('Compras, URGENTE , luis')).toEqual([
      'compras',
      'urgente',
      'luis',
    ]);
  });

  it('drops empty pieces from stray or trailing separators', () => {
    expect(parseTags(' , compras,, ,urgente, ')).toEqual(['compras', 'urgente']);
  });

  it('de-duplicates case-insensitively, keeping the first occurrence', () => {
    expect(parseTags('Compras, compras, COMPRAS')).toEqual(['compras']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags('   ')).toEqual([]);
  });
});

describe('formatTags', () => {
  it('joins with a comma and a space for the edit form', () => {
    expect(formatTags(['compras', 'urgente'])).toBe('compras, urgente');
  });

  it('renders an empty list as an empty string', () => {
    expect(formatTags([])).toBe('');
  });
});

describe('normalizeTagParam', () => {
  it('normalizes a usable query parameter', () => {
    expect(normalizeTagParam(' Compras ')).toBe('compras');
  });

  it('rejects a blank or over-long parameter', () => {
    expect(normalizeTagParam('')).toBe('');
    expect(normalizeTagParam('   ')).toBe('');
    expect(normalizeTagParam('a'.repeat(TAG_MAX_LENGTH + 1))).toBe('');
  });
});

describe('validateTags', () => {
  it('accepts a list within both limits', () => {
    expect(validateTags(['compras', 'urgente'])).toBeNull();
    expect(validateTags([])).toBeNull();
  });

  it('rejects a tag over the length limit', () => {
    expect(validateTags(['a'.repeat(TAG_MAX_LENGTH + 1)])).not.toBeNull();
  });

  it('rejects more tags than allowed', () => {
    const many = Array.from(
      { length: MAX_TAGS_PER_RECORD + 1 },
      (_, index) => `t${index}`,
    );
    expect(validateTags(many)).not.toBeNull();
  });
});

describe('tagCountLabel', () => {
  it('uses the singular for one record', () => {
    expect(tagCountLabel(1)).toBe('1 registro');
  });

  it('uses the plural for any other count', () => {
    expect(tagCountLabel(0)).toBe('0 registros');
    expect(tagCountLabel(7)).toBe('7 registros');
  });
});
