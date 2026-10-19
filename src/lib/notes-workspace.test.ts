import { describe, expect, it } from 'vitest';
import type { Task, TagCount } from '@/lib/appwrite/tasks';
import { NOTE_EMPTY_HEADING } from '@/lib/task-view';
import {
  NOTES_ALL_LABEL,
  NOTES_EMPTY_MESSAGE,
  NOTES_EMPTY_TASK_HEADING,
  NOTES_EMPTY_TAG_MESSAGE,
  buildNotesHref,
  buildTagFolders,
  buildTypeFilters,
  hasActiveFilter,
  notesEmptyMessage,
  resolveNotesEditorState,
  toWorkspaceListItem,
} from './notes-workspace';

function record(overrides: Partial<Task> = {}): Task {
  return {
    $id: 'r1',
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
    expect(buildNotesHref({ type: '', tag: '', q: '', id: '' })).toBe('/notas');
  });

  it('carries the type filter, the folder, the keyword and the open record', () => {
    expect(buildNotesHref({ type: 'task' })).toBe('/notas?type=task');
    expect(buildNotesHref({ tag: 'compras' })).toBe('/notas?tag=compras');
    expect(buildNotesHref({ q: 'pago' })).toBe('/notas?q=pago');
    expect(buildNotesHref({ id: 'r1' })).toBe('/notas?id=r1');
    expect(
      buildNotesHref({ type: 'note', tag: 'compras', q: 'pago', id: 'r1' }),
    ).toBe('/notas?type=note&tag=compras&q=pago&id=r1');
  });
});

describe('toWorkspaceListItem', () => {
  it('prefers a note title over its body snippet', () => {
    const item = toWorkspaceListItem(
      record({ title: 'Lista del súper' }),
      'comprar pan',
    );

    expect(item.heading).toBe('Lista del súper');
    expect(item.snippet).toBe('comprar pan');
    expect(item.type).toBe('note');
    expect(item.when).toBe('Anotado el 4 de octubre de 2026');
  });

  it('falls back to the snippet for an untitled note', () => {
    expect(toWorkspaceListItem(record(), 'reunión de octubre').heading).toBe(
      'reunión de octubre',
    );
  });

  it('keeps a completely empty note addressable', () => {
    const item = toWorkspaceListItem(record(), '');

    expect(item.heading).toBe(NOTE_EMPTY_HEADING);
    expect(item.snippet).toBe('');
  });

  it('uses the task copy and placeholder for a non-note record', () => {
    const item = toWorkspaceListItem(
      record({ type: 'task', title: 'Llamar al cliente' }),
      'pedir presupuesto',
    );

    expect(item.heading).toBe('Llamar al cliente');
    expect(item.when).toBe('Creada el 4 de octubre de 2026');
    expect(item.type).toBe('task');
  });

  it('gives an untitled task without text a placeholder instead of a blank row', () => {
    expect(
      toWorkspaceListItem(record({ type: 'event' }), '').heading,
    ).toBe(NOTES_EMPTY_TASK_HEADING);
  });
});

describe('buildTypeFilters', () => {
  it('lists "Todo" first and marks the active one', () => {
    const filters = buildTypeFilters('task', { tag: 'compras' });

    expect(filters[0]).toEqual({
      tag: '',
      label: NOTES_ALL_LABEL,
      count: null,
      href: '/notas?tag=compras',
      active: false,
    });
    expect(filters.find((filter) => filter.tag === 'task')).toEqual({
      tag: 'task',
      label: 'Tareas',
      count: null,
      href: '/notas?type=task&tag=compras',
      active: true,
    });
  });

  it('keeps the keyword alive across the ladder', () => {
    const filters = buildTypeFilters('', { q: 'pago' });

    expect(filters[0]?.active).toBe(true);
    expect(filters[1]?.href).toBe('/notas?type=note&q=pago');
  });
});

describe('buildTagFolders', () => {
  const counts: TagCount[] = [
    { tag: 'compras', count: 3 },
    { tag: 'trabajo', count: 1 },
  ];

  it('keeps the tag order and its counts, preserving the type filter', () => {
    expect(buildTagFolders(counts, 'trabajo', { type: 'note' })).toEqual([
      {
        tag: 'compras',
        label: 'compras',
        count: 3,
        href: '/notas?type=note&tag=compras',
        active: false,
      },
      {
        tag: 'trabajo',
        label: 'trabajo',
        count: 1,
        href: '/notas?type=note&tag=trabajo',
        active: true,
      },
    ]);
  });

  it('renders nothing when there are no tags', () => {
    expect(buildTagFolders([], '', {})).toEqual([]);
  });
});

describe('resolveNotesEditorState', () => {
  it('reports the failure before anything else', () => {
    expect(resolveNotesEditorState(null, true)).toEqual({ kind: 'error' });
  });

  it('prompts when nothing is selected', () => {
    expect(resolveNotesEditorState(null, false)).toEqual({ kind: 'empty' });
  });

  it('returns the record when one is open', () => {
    const target = record({ title: 'Acta' });

    expect(resolveNotesEditorState(target, false)).toEqual({
      kind: 'record',
      record: target,
    });
  });
});

describe('notesEmptyMessage', () => {
  it('distinguishes a filtered empty list from an empty workspace', () => {
    expect(notesEmptyMessage({ filtered: false })).toBe(NOTES_EMPTY_MESSAGE);
    expect(notesEmptyMessage({ filtered: true })).toBe(NOTES_EMPTY_TAG_MESSAGE);
  });
});

describe('hasActiveFilter', () => {
  it('is false only when nothing narrows the list', () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(hasActiveFilter({ type: '', tag: '', q: '' })).toBe(false);
    expect(hasActiveFilter({ type: 'note' })).toBe(true);
    expect(hasActiveFilter({ tag: 'compras' })).toBe(true);
    expect(hasActiveFilter({ q: 'pago' })).toBe(true);
  });
});
