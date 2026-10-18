import { describe, expect, it } from 'vitest';
import { noteEditorExtensions } from './extensions';

/**
 * Pins the editor's capability set. Extension configuration is evaluated at
 * import time, so a bad option (a renamed one, a removed node) throws here
 * instead of only in the browser — the build cannot see that class of failure.
 *
 * The names asserted are the ones `sanitizeNoteHtml` was widened for: if an
 * extension is dropped or renamed, the whitelist and the editor stop agreeing
 * and stored content silently loses formatting on the next render.
 */
describe('noteEditorExtensions', () => {
  it('builds the extension set without throwing', () => {
    expect(Array.isArray(noteEditorExtensions)).toBe(true);
    expect(noteEditorExtensions.length).toBeGreaterThan(0);
  });

  it('declares every node the note body depends on', () => {
    const names = noteEditorExtensions.map((extension) => extension.name);

    expect(names).toContain('table');
    expect(names).toContain('tableRow');
    expect(names).toContain('tableHeader');
    expect(names).toContain('tableCell');
    expect(names).toContain('taskList');
    expect(names).toContain('taskItem');
    expect(names).toContain('image');
    expect(names).toContain('highlight');
    expect(names).toContain('placeholder');
  });
});
