/**
 * Guards a caller-supplied post-action redirect target (spec `calendar-view` →
 * "Task detail modal"): the calendar modal posts a `returnTo` so an edit lands
 * back on the calendar instead of the home list. Only same-origin absolute
 * paths are allowed — anything that could leave the origin returns
 * `undefined`, so the caller falls back to its own default destination and an
 * attacker can never steer the redirect.
 *
 * Pure and dependency-free: unit-tested in the node environment.
 */

/** Longest path the guard accepts before it gives up. */
export const RETURN_TO_MAX_LENGTH = 500;

/** Control characters (including CR/LF) never belong in a redirect path. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Returns the path when it is a safe same-origin target, otherwise
 * `undefined`. Rejected: empty input, over-long input, anything not starting
 * with `/`, protocol-relative targets (`//host`), backslashes (browsers treat
 * them as `/`, so `/\evil.com` is a real escape hatch), embedded schemes
 * (`://`) and control characters.
 */
export function sanitizeReturnTo(value: string): string | undefined {
  const raw = value.trim();

  if (raw === '' || raw.length > RETURN_TO_MAX_LENGTH) {
    return undefined;
  }
  if (!raw.startsWith('/')) {
    return undefined;
  }
  if (raw.startsWith('//')) {
    return undefined;
  }
  if (raw.includes('\\') || raw.includes('://')) {
    return undefined;
  }
  if (CONTROL_CHARACTERS.test(raw)) {
    return undefined;
  }

  return raw;
}
