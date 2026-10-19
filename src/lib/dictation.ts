/**
 * Dictation helpers (spec `note-capture` → "Dictation").
 *
 * Pure functions and copy only: the browser APIs (`SpeechRecognition`,
 * `MediaRecorder`) are touched exclusively by the `AudioRecorder` client
 * component, so every branch that can be reasoned about — what counts as
 * "supported", how a transcript is assembled, how a dictated block joins
 * existing text, what the file is called — is unit-testable in the node
 * environment.
 *
 * Dictation uses the browser's own speech recognition (the Web Speech API):
 * no audio leaves the app through our backend and no service is billed, at
 * the cost of being available only in Chromium-based browsers.
 */

/** Spanish (Argentina) is the app's locale; the recognizer is told so. */
export const DICTATION_LANG = 'es-AR';

/**
 * Container preference for the recorded audio, best first. The first entry
 * `MediaRecorder.isTypeSupported` accepts wins, so Chromium lands on webm and
 * a browser that only offers ogg or mp4 still produces an allowed type — the
 * upload route accepts all three (see `@/lib/attachments`).
 */
export const DICTATION_AUDIO_MIME_TYPES: readonly string[] = Object.freeze([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
]);

export const DICTATION_LABEL = 'Dictar';

export const DICTATION_STOP_LABEL = 'Detener';

export const DICTATION_RECORDING_LABEL = 'Grabando…';

export const DICTATION_HINT =
  'Hablá y el texto se agrega solo. Funciona en Chrome y Edge.';

export const DICTATION_UNSUPPORTED_MESSAGE =
  'Tu navegador no soporta dictado por voz. Usá Chrome o Edge.';

export const DICTATION_DENIED_MESSAGE =
  'Permiso de micrófono denegado. Habilitalo para dictar.';

export const DICTATION_FAILURE_MESSAGE =
  'No se pudo iniciar el dictado. Intenta de nuevo.';

export const DICTATION_NO_SPEECH_MESSAGE =
  'No se escuchó nada. Probá de nuevo más cerca del micrófono.';

export const DICTATION_AUDIO_FAILURE_MESSAGE =
  'No se pudo adjuntar el audio.';

/** Extension per container, so the uploaded name matches its MIME. */
const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
};

/** The minimal shape of a `SpeechRecognitionResult` this module reads. */
export interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string } | undefined;
}

export interface RecognitionResultsLike {
  length: number;
  [index: number]: RecognitionResultLike | undefined;
}

/** The transcript so far, plus how far into the results list we have read. */
export interface TranscriptState {
  /** Settled text, ready to insert once the user stops. */
  settled: string;
}

export const EMPTY_TRANSCRIPT: TranscriptState = Object.freeze({
  settled: '',
});

/**
 * Reads one `result` event's list into the phrase it currently represents.
 *
 * Two real-world behaviours live in this list and both have to survive:
 *
 * - **Distinct phrases.** The common shape: each finalized entry is the new
 *   phrase, so the entries are concatenated in order.
 * - **Cumulative prefixes.** Android Chrome re-delivers the whole session in
 *   each finalized entry (`"Esto"`, `"Esto es una"`, `"Esto es una prueba"`).
 *   Concatenating those is exactly the reported bug — "EstoEsto es unaEsto es
 *   una prueba…". An entry that already starts with what came before it
 *   REPLACES it instead of being appended.
 *
 * Only finalized entries reach the text; the interim tail is returned for the
 * preview alone, because inserting it would rewrite the document on every
 * partial word.
 */
function readSession(results: RecognitionResultsLike): {
  text: string;
  interim: string;
} {
  let text = '';
  let interim = '';

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (result === undefined) {
      continue;
    }

    const raw = result[0]?.transcript ?? '';
    if (!result.isFinal) {
      interim += raw;
      continue;
    }

    const cumulative = raw.trim();
    if (cumulative === '') {
      continue;
    }

    text = cumulative.startsWith(text.trim()) ? cumulative : `${text}${raw}`;
  }

  return { text: text.trim(), interim: interim.trim() };
}

/**
 * Folds one `result` event into the transcript and returns the phrase still
 * being spoken for the live preview.
 *
 * It is idempotent by design: the session text is recomputed from the whole
 * list on every event and only ever merged into what was already settled, so a
 * result the browser delivers twice cannot be counted twice. A recognizer that
 * restarts after a pause (Android does it on every phrase) hands back a fresh
 * list that does not overlap the settled text — that session is appended
 * rather than replacing what was already heard.
 */
export function accumulateTranscript(
  state: TranscriptState,
  results: RecognitionResultsLike,
): { state: TranscriptState; interim: string } {
  const session = readSession(results);
  const settled = mergeSettled(state.settled, session.text);

  return { state: { settled }, interim: session.interim };
}

/** Merges a session's text into what was already settled, without repeating it. */
function mergeSettled(settled: string, session: string): string {
  if (session === '') {
    return settled;
  }
  if (settled === '' || session.startsWith(settled)) {
    return session;
  }
  if (settled.startsWith(session)) {
    return settled;
  }
  return `${settled} ${session}`;
}

/**
 * Appends a dictated block to text the user already typed, separated by a
 * blank line. Empty pieces never add stray whitespace, so dictating into an
 * empty description stores just the transcript.
 */
export function joinDictation(existing: string, dictated: string): string {
  const addition = dictated.trim();
  if (addition === '') {
    return existing;
  }
  const base = existing.trimEnd();
  return base === '' ? addition : `${base}\n\n${addition}`;
}

/** True when this environment exposes the Web Speech API recognizer. */
export function hasSpeechRecognition(scope: {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}): boolean {
  return (
    typeof scope.SpeechRecognition === 'function' ||
    typeof scope.webkitSpeechRecognition === 'function'
  );
}

/**
 * The first audio container the recorder can actually produce, or null when
 * none of the preferred ones is supported (in which case the audio attachment
 * is skipped and only the transcript is kept).
 */
export function pickAudioMimeType(
  isTypeSupported: (mimeType: string) => boolean,
): string | null {
  for (const candidate of DICTATION_AUDIO_MIME_TYPES) {
    if (isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * A stable, sortable file name for a recording, with the extension that
 * matches its container. Timestamped because a note can hold several.
 */
export function audioFileName(mimeType: string, now: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'webm';

  return `dictado-${stamp}.${extension}`;
}

/**
 * Maps a `SpeechRecognitionErrorEvent.error` to the Spanish copy to show.
 * Anything not specifically recognised degrades to the generic message rather
 * than leaking a raw browser code to the user.
 */
export function dictationErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return DICTATION_DENIED_MESSAGE;
    case 'no-speech':
      return DICTATION_NO_SPEECH_MESSAGE;
    default:
      return DICTATION_FAILURE_MESSAGE;
  }
}

/** Elapsed recording time as `m:ss`, for the recorder's live label. */
export function formatElapsed(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
