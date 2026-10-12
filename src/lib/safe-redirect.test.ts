import { describe, expect, it } from 'vitest';
import { RETURN_TO_MAX_LENGTH, sanitizeReturnTo } from './safe-redirect';

describe('sanitizeReturnTo', () => {
  it('accepts a same-origin absolute path and keeps its query', () => {
    const target = '/calendario?month=2026-10&day=2026-10-15&updated=1';
    expect(sanitizeReturnTo(target)).toBe(target);
  });

  it('trims the edges', () => {
    expect(sanitizeReturnTo('  /calendario  ')).toBe('/calendario');
    expect(sanitizeReturnTo('  /  ')).toBe('/');
  });

  it('rejects an empty or blank value', () => {
    expect(sanitizeReturnTo('')).toBeUndefined();
    expect(sanitizeReturnTo('   ')).toBeUndefined();
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(sanitizeReturnTo('//evil.com')).toBeUndefined();
    expect(sanitizeReturnTo('https://evil.com')).toBeUndefined();
    expect(sanitizeReturnTo('http://evil.com')).toBeUndefined();
  });

  it('rejects relative paths that do not start with a slash', () => {
    expect(sanitizeReturnTo('calendario')).toBeUndefined();
    expect(sanitizeReturnTo('../etc')).toBeUndefined();
  });

  it('rejects a backslash escape browsers normalise to a slash', () => {
    expect(sanitizeReturnTo('/\\evil.com')).toBeUndefined();
  });

  it('rejects an embedded scheme', () => {
    expect(sanitizeReturnTo('/redirect?to=https://evil.com')).toBeUndefined();
  });

  it('rejects control characters such as a newline', () => {
    expect(sanitizeReturnTo('/calendario\nx')).toBeUndefined();
  });

  it('rejects an over-long value and keeps one at the limit', () => {
    expect(
      sanitizeReturnTo('/' + 'a'.repeat(RETURN_TO_MAX_LENGTH)),
    ).toBeUndefined();
    expect(
      sanitizeReturnTo('/' + 'a'.repeat(RETURN_TO_MAX_LENGTH - 1)),
    ).toHaveLength(RETURN_TO_MAX_LENGTH);
  });
});
