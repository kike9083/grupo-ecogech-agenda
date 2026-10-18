import { describe, expect, it } from 'vitest';
import type { Task, TagCount } from '@/lib/appwrite/tasks';
import { NOTE_EMPTY_HEADING } from '@/lib/task-view';
import {
  NOTES_ALL_LABEL,
  NOTES_EMPTY_MESSAGE,
  NOTES_EMPTY_TAG_MESSAGE,
  buildNotesFolders,
  buildNotesHref,
  notesEmptyMessage,
  resolveNotesEditorState,
  toNoteListItem,
} from './notes-workspace';

function note(overrides: Partial<Task> = {}): Task {
  return {
    $id: 'n1',
    $createdAt: '2026-10-04T12:00:00.000+00:00',
    type: 'note',
    title: '',
    description: '',
    date: '',
    time: '',
    status: 'open',
    createdBy: 'u1',
    createdByEmail: 'a@b.test',
    tags: [],
    ...overrides,
  };
}

describe('buildNotesHref', () => {
  it('collapses an empty state to the bare route', () => {
    expect(buildNotesHref({})).toBe('/notas');
    expect(buildNotesHref({ tag: '', id: '' })).toBe('/notas');
  });

  it('carries the folder and the open note', () => {
    expect(buildNotesHref({ tag: 'compras' })).toBe('/notas?tag=compras');
    expect(buildNotesHref({ id: 'n1' })).toBe('/notas?id=n1');
    expect(buildNotesHref({ tag: 'compras', id: 'n1' })).toBe(
      '/notas?tag=compras&id=n1',
    );
  });
});

describe('toNoteListItem', () => {
  it('prefers the title over the body snippet', () => {
    const item = toNoteListItem(note({ title: 'Lista del súper' }), 'comprar pan');

    expect(item.heading).toBe('Lista del súper');
    expect(item.snippet).toBe('comprar pan');
    expect(item.id).toBe('n1');
  });

  it('falls back to the snippet when the note has no title', () => {
    expect(toNoteListItem(note(), 'reunión de octubre').heading).toBe(
      'reunión de octubre',
    );
  });

  it('keeps a completely empty note addressable', () => {
    const item = toNoteListItem(note(), '');

    expect(item.heading).toBe(NOTE_EMPTY_HEADING);
    expect(item.snippet).toBe('');
  });

  it('formats the creation line in Spanish', () => {
    expect(toNoteListItem(note(), 'x').notedAt).toBe(
      'Anotado el 4 de octubre de 2026',
    );
  });
});

describe('buildNotesFolders', () => {
  const counts: TagCount[] = [
    { tag: 'compras', count: 3 },
    { tag: 'trabajo', count: 1 },
  ];

  it('always lists "Todas las notas" first, without a count', () => {
    const folders = buildNotesFolders(counts, '');

    expect(folders[0]).toMatchObject({
      tag: '',
      label: NOTES_ALL_LABEL,
      count: null,
      href: '/notas',
      active: true,
    });
  });

  it('keeps the tag order and its counts, marking the active folder', () => {
    const folders = buildNotesFolders(counts, 'trabajo');

    expect(folders.slice(1)).toEqual([
      {
        tag: 'compras',
        label: 'compras',
        count: 3,
        href: '/notas?tag=compras',
        active: false,
      },
      {
        tag: 'trabajo',
        label: 'trabajo',
        count: 1,
        href: '/notas?tag=trabajo',
        active: true,
      },
    ]);
    expect(folders[0]?.active).toBe(false);
  });

  it('renders only the synthetic folder when no tag exists yet', () => {
    expect(buildNotesFolders([], '')).toHaveLength(1);
  });
});

describe('resolveNotesEditorState', () => {
  it('reports the failure before anything else', () => {
    expect(resolveNotesEditorState(null, true)).toEqual({ kind: 'error' });
  });

  it('prompts when nothing is selected', () => {
    expect(resolveNotesEditorState(null, false)).toEqual({ kind: 'empty' });
  });

  it('returns the note when one is open', () => {
    const target = note({ title: 'Acta' });

    expect(resolveNotesEditorState(target, false)).toEqual({
      kind: 'note',
      note: target,
    });
  });
});

describe('notesEmptyMessage', () => {
  it('distinguishes an empty folder from an empty agenda', () => {
    expect(notesEmptyMessage({ filtered: false })).toBe(NOTES_EMPTY_MESSAGE);
    expect(notesEmptyMessage({ filtered: true })).toBe(NOTES_EMPTY_TAG_MESSAGE);
  });
});
