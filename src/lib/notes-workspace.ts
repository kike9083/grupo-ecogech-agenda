import type { Task, TagCount } from '@/lib/appwrite/tasks';
import { formatNotedAt, noteHeading, noteSnippet } from '@/lib/task-view';

/**
 * Notes workspace helpers (spec `note-capture` → "Notes workspace").
 *
 * Pure functions and copy only — no Appwrite, no rich-text import — so the
 * three-pane layout's branches stay unit-testable in the node environment and
 * the module can be read from either side of the server/client boundary.
 */

export const NOTES_TITLE = 'Notas';

export const NOTES_SUBTITLE = 'Tus notas, con formato, tablas e imágenes.';

export const NOTES_ALL_LABEL = 'Todas las notas';

export const NOTES_FOLDERS_HEADING = 'Carpetas';

export const NOTES_TAGS_HEADING = 'Etiquetas';

export const NOTES_EMPTY_MESSAGE = 'No hay notas todavía.';

export const NOTES_EMPTY_TAG_MESSAGE = 'No hay notas con esa etiqueta.';

export const NOTES_NO_TAGS_MESSAGE = 'Sin etiquetas todavía.';

export const NOTES_SELECT_PROMPT =
  'Elegí una nota de la lista para verla y editarla.';

export const NOTES_LOAD_ERROR_MESSAGE =
  'No se pudieron cargar las notas. Intenta de nuevo más tarde.';

export const NOTES_NEW_LABEL = 'Nueva nota';

export const NOTES_NEW_TASK_LABEL = 'Nueva tarea';

export const NOTES_LIST_HEADING = 'Notas';

export const NOTES_ATTACHMENTS_HEADING = 'Adjuntos';

/**
 * Builds a `/notas` URL from the workspace state. `tag` picks the folder, `id`
 * picks the note shown in the editor pane; an empty state collapses to the
 * bare route so "Todas las notas" is just `/notas`.
 */
export function buildNotesHref(params: { tag?: string; id?: string }): string {
  const query = new URLSearchParams();
  if (params.tag !== undefined && params.tag !== '') {
    query.set('tag', params.tag);
  }
  if (params.id !== undefined && params.id !== '') {
    query.set('id', params.id);
  }

  const serialized = query.toString();
  return serialized === '' ? '/notas' : `/notas?${serialized}`;
}

/** One row of the middle column. */
export interface NoteListItem {
  id: string;
  /** Title when the author gave one, otherwise the body snippet. */
  heading: string;
  snippet: string;
  /** Spanish "Anotado el …" line. */
  notedAt: string;
}

/**
 * Builds a list row from a stored note. `bodyText` is the plain text of the
 * body, derived by the caller through `plainTextFromHtml` so this module never
 * pulls the server-only sanitizer into a bundle.
 */
export function toNoteListItem(note: Task, bodyText: string): NoteListItem {
  const snippet = noteSnippet(bodyText);

  return {
    id: note.$id,
    heading: noteHeading(note.title, snippet),
    snippet,
    notedAt: formatNotedAt(note.$createdAt),
  };
}

/** A folder in the sidebar: one tag, or the synthetic "all notes" entry. */
export interface NotesFolder {
  /** Canonical tag, or '' for the "all notes" folder. */
  tag: string;
  label: string;
  /**
   * How many notes the folder holds, or null for "Todas las notas": the list
   * read is paginated and does not expose a total, so the unfiltered folder
   * shows no number rather than a page-sized one that would read as a total.
   */
  count: number | null;
  href: string;
  active: boolean;
}

/**
 * Builds the sidebar folders: "Todas las notas" first (so an unfiltered view
 * is always reachable), then every tag the caller's notes carry, most-used
 * first — the order `loadTagCounts` already returns.
 */
export function buildNotesFolders(
  counts: readonly TagCount[],
  activeTag: string,
): NotesFolder[] {
  const all: NotesFolder = {
    tag: '',
    label: NOTES_ALL_LABEL,
    count: null,
    href: buildNotesHref({}),
    active: activeTag === '',
  };

  const tags = counts.map(({ tag, count }) => ({
    tag,
    label: tag,
    count,
    href: buildNotesHref({ tag }),
    active: tag === activeTag,
  }));

  return [all, ...tags];
}

/**
 * Which of the editor pane's states to render: the note being edited, the
 * prompt to pick one, or the load failure. A discriminated union so the page
 * narrows without casts.
 */
export type NotesEditorState =
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'note'; note: Task };

export function resolveNotesEditorState(
  note: Task | null,
  failed: boolean,
): NotesEditorState {
  if (failed) {
    return { kind: 'error' };
  }
  if (note === null) {
    return { kind: 'empty' };
  }
  return { kind: 'note', note };
}

/** Empty-state copy for the middle column, split by why it is empty. */
export function notesEmptyMessage(options: { filtered: boolean }): string {
  return options.filtered ? NOTES_EMPTY_TAG_MESSAGE : NOTES_EMPTY_MESSAGE;
}
