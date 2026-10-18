/**
 * Tag normalization for records (spec `task-tagging`).
 *
 * A record's tags live in the `tags` array attribute of the `tasks`
 * collection. The canonical form is lowercase, edge-trimmed and with inner
 * whitespace collapsed, so "Compras", "compras " and "COMPRAS  " are the same
 * tag — filtering and the section's counts depend on that one form.
 *
 * Pure functions only: nothing here touches Appwrite or React.
 */

/** Longest single tag the `tags` attribute accepts (its per-element size). */
export const TAG_MAX_LENGTH = 30;

/** How many tags one record may carry. */
export const MAX_TAGS_PER_RECORD = 10;

/** The character the form splits on — a plain text input, no chip editor. */
export const TAG_SEPARATOR = ',';

/** Helper text under the form's tags input. */
export const TAG_INPUT_HINT = `Separá con comas. Hasta ${MAX_TAGS_PER_RECORD} etiquetas.`;

/** Inline copy for the two ways a tag list can be rejected. */
export const TAG_ERROR_MESSAGES = {
  tooLong: `Cada etiqueta debe tener como máximo ${TAG_MAX_LENGTH} caracteres.`,
  tooMany: `Podés usar hasta ${MAX_TAGS_PER_RECORD} etiquetas por registro.`,
} as const;

/** Section copy (the `/etiquetas` route). */
export const TAGS_SECTION_TITLE = 'Etiquetas';

export const TAGS_SECTION_SUBTITLE =
  'Elegí una etiqueta para ver los registros que la llevan.';

export const TAGS_EMPTY_MESSAGE = 'No hay etiquetas todavía.';

export const TAGS_NO_MATCH_MESSAGE = 'Sin etiquetas para esa búsqueda.';

export const TAGS_SEARCH_LABEL = 'Buscar etiqueta';

export const TAGS_SEARCH_PLACEHOLDER = 'Buscar…';

export const TAGS_SEARCH_SUBMIT_LABEL = 'Buscar';

export const TAGS_SEARCH_CLEAR_LABEL = 'Limpiar';

/** Active-filter chip on the list: "Etiqueta: compras" plus its clear action. */
export const TAG_FILTER_PREFIX = 'Etiqueta:';

export const TAG_FILTER_CLEAR_LABEL = 'Quitar';

/** Singular/plural record count shown next to a tag in the section. */
export function tagCountLabel(count: number): string {
  return count === 1 ? '1 registro' : `${count} registros`;
}

/**
 * The one canonical tag form: trim the edges, collapse inner whitespace runs
 * and lowercase. Accents and digits survive — only case and spacing fold.
 */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Splits the form's raw comma-separated input into canonical tags, dropping
 * empties and de-duplicating case-insensitively (the first occurrence wins,
 * which is also the first in the returned order).
 */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const piece of input.split(TAG_SEPARATOR)) {
    const tag = normalizeTag(piece);
    if (tag === '' || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

/**
 * Canonical single tag read from a URL parameter. Blank and over-long values
 * collapse to `''`, which callers treat as "no tag filter" — an unusable
 * parameter never reaches a query.
 */
export function normalizeTagParam(raw: string): string {
  const tag = normalizeTag(raw);
  return tag.length > TAG_MAX_LENGTH ? '' : tag;
}

/** Renders a record's tags for the edit form's text input. */
export function formatTags(tags: readonly string[]): string {
  return tags.join(`${TAG_SEPARATOR} `);
}

/**
 * Rejects a parsed tag list that breaks either limit, returning the inline
 * message — or `null` when the list is acceptable. Empty lists are valid.
 */
export function validateTags(tags: readonly string[]): string | null {
  if (tags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
    return TAG_ERROR_MESSAGES.tooLong;
  }
  if (tags.length > MAX_TAGS_PER_RECORD) {
    return TAG_ERROR_MESSAGES.tooMany;
  }
  return null;
}
