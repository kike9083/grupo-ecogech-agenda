import type { Task, TagCount } from '@/lib/appwrite/tasks';
import {
  descriptionSnippet,
  formatCreatedAt,
  formatNotedAt,
  noteHeading,
  noteSnippet,
} from '@/lib/task-view';
import type { TaskStatus, TaskType } from '@/lib/validation/task';

/**
 * Notes workspace helpers (spec `note-capture` → "Notes workspace").
 *
 * Pure functions and copy only — no Appwrite, no rich-text import — so the
 * three-pane layout's branches stay unit-testable in the node environment and
 * the module can be read from either side of the server/client boundary.
 *
 * The workspace lists every kind of record, not just notes: the middle column
 * is the app's list now that `/` redirects here, so notes, tasks, requests and
 * events all appear and the right pane edits whichever is open.
 */

export const NOTES_TITLE = 'Notas';

export const NOTES_SUBTITLE = 'Notas, tareas y citas, con formato e imágenes.';

export const NOTES_ALL_LABEL = 'Todo';

export const NOTES_FOLDERS_HEADING = 'Mostrar';

export const NOTES_TAGS_HEADING = 'Etiquetas';

export const NOTES_EMPTY_MESSAGE = 'No hay registros todavía.';

export const NOTES_EMPTY_TAG_MESSAGE = 'No hay registros con ese filtro.';

export const NOTES_NO_TAGS_MESSAGE = 'Sin etiquetas todavía.';

export const NOTES_SELECT_PROMPT =
  'Elegí un registro de la lista para verlo y editarlo.';

export const NOTES_LOAD_ERROR_MESSAGE =
  'No se pudieron cargar los registros. Intenta de nuevo más tarde.';

export const NOTES_NEW_LABEL = 'Nueva nota';

export const NOTES_NEW_TASK_LABEL = 'Nueva tarea';

export const NOTES_LIST_HEADING = 'Registros';

export const NOTES_ATTACHMENTS_HEADING = 'Adjuntos';

export const NOTES_SEARCH_LABEL = 'Buscar';

export const NOTES_SEARCH_PLACEHOLDER = 'Buscar por título o texto';

export const NOTES_SEARCH_SUBMIT_LABEL = 'Buscar';

export const NOTES_SEARCH_CLEAR_LABEL = 'Limpiar';

export const NOTES_EMPTY_TASK_HEADING = 'Sin título';

/** The synthetic "every type" filter value. */
export type WorkspaceTypeFilter = '' | TaskType;

/** The left column's type ladder, mirroring the Notes "folders" list. */
export const WORKSPACE_TYPE_FILTERS: ReadonlyArray<{
  value: WorkspaceTypeFilter;
  label: string;
}> = Object.freeze([
  { value: '', label: NOTES_ALL_LABEL },
  { value: 'note', label: 'Notas' },
  { value: 'task', label: 'Tareas' },
  { value: 'request', label: 'Solicitudes' },
  { value: 'event', label: 'Citas' },
]);

/** The query state a workspace link preserves. */
export interface WorkspaceQuery {
  type?: string;
  tag?: string;
  q?: string;
  id?: string;
}

/**
 * Builds a `/notas` URL from the workspace state. `type` picks the type
 * filter, `tag` the tag folder, `q` the keyword and `id` the record shown in
 * the editor pane; an empty state collapses to the bare route so "Todo" is
 * just `/notas`.
 */
export function buildNotesHref(params: WorkspaceQuery): string {
  const query = new URLSearchParams();
  if (params.type !== undefined && params.type !== '') {
    query.set('type', params.type);
  }
  if (params.tag !== undefined && params.tag !== '') {
    query.set('tag', params.tag);
  }
  if (params.q !== undefined && params.q !== '') {
    query.set('q', params.q);
  }
  if (params.id !== undefined && params.id !== '') {
    query.set('id', params.id);
  }

  const serialized = query.toString();
  return serialized === '' ? '/notas' : `/notas?${serialized}`;
}

/** One row of the middle column. */
export interface WorkspaceListItem {
  id: string;
  type: TaskType;
  status: TaskStatus;
  /** Title when the author gave one, otherwise the text preview. */
  heading: string;
  snippet: string;
  /** Spanish "Anotado el …" for a note, "Creada el …" for anything else. */
  when: string;
}

/**
 * Builds a list row from a stored record. `snippetText` is the plain text to
 * preview — the body for a note, the description for a task — derived by the
 * caller so this module never pulls the server-only sanitizer into a bundle.
 */
export function toWorkspaceListItem(
  record: Task,
  snippetText: string,
): WorkspaceListItem {
  const snippet = noteSnippet(snippetText ?? '');
  const isNote = record.type === 'note';
  const title = (record.title ?? '').trim();

  return {
    id: record.$id,
    type: record.type,
    status: record.status,
    heading: isNote
      ? noteHeading(title, snippet)
      : title !== ''
        ? title
        : snippet !== ''
          ? snippet
          : NOTES_EMPTY_TASK_HEADING,
    snippet,
    when: isNote
      ? formatNotedAt(record.$createdAt)
      : formatCreatedAt(record.$createdAt),
  };
}

/** A folder in the sidebar: one type filter, one tag, or the "all" entry. */
export interface NotesFolder {
  /** Type value for the type ladder; tag value for the tag list. */
  tag: string;
  label: string;
  /**
   * How many records the folder holds, or null when the count is not known.
   * The type ladder and the "Todo" entry show no number: the list read is
   * paginated and does not expose a total, so a page-sized number would read
   * as a total.
   */
  count: number | null;
  href: string;
  active: boolean;
}

/** The type ladder for the left column, preserving the tag and keyword. */
export function buildTypeFilters(
  activeType: string,
  query: { tag?: string; q?: string },
): NotesFolder[] {
  return WORKSPACE_TYPE_FILTERS.map(({ value, label }) => ({
    tag: value,
    label,
    count: null,
    href: buildNotesHref({ type: value, tag: query.tag, q: query.q }),
    active: value === activeType,
  }));
}

/**
 * Builds the tag folders, most-used first — the order `loadTagCounts` already
 * returns — each preserving the active type filter and keyword.
 */
export function buildTagFolders(
  counts: readonly TagCount[],
  activeTag: string,
  query: { type?: string; q?: string },
): NotesFolder[] {
  return counts.map(({ tag, count }) => ({
    tag,
    label: tag,
    count,
    href: buildNotesHref({ type: query.type, tag, q: query.q }),
    active: tag === activeTag,
  }));
}

/**
 * Which of the editor pane's states to render: the record being edited, the
 * prompt to pick one, or the load failure. A discriminated union so the page
 * narrows without casts.
 */
export type NotesEditorState =
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'record'; record: Task };

export function resolveNotesEditorState(
  record: Task | null,
  failed: boolean,
): NotesEditorState {
  if (failed) {
    return { kind: 'error' };
  }
  if (record === null) {
    return { kind: 'empty' };
  }
  return { kind: 'record', record };
}

/** Empty-state copy for the middle column, split by why it is empty. */
export function notesEmptyMessage(options: { filtered: boolean }): string {
  return options.filtered ? NOTES_EMPTY_TAG_MESSAGE : NOTES_EMPTY_MESSAGE;
}

/** True when any filter narrows the list, so the empty copy can say which. */
export function hasActiveFilter(options: {
  type?: string;
  tag?: string;
  q?: string;
}): boolean {
  return (
    (options.type !== undefined && options.type !== '') ||
    (options.tag !== undefined && options.tag !== '') ||
    (options.q !== undefined && options.q !== '')
  );
}
