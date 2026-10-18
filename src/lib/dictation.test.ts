import { describe, expect, it } from 'vitest';
import {
  DICTATION_DENIED_MESSAGE,
  DICTATION_FAILURE_MESSAGE,
  DICTATION_NO_SPEECH_MESSAGE,
  audioFileName,
  dictationErrorMessage,
  formatElapsed,
  hasSpeechRecognition,
  joinDictation,
  pickAudioMimeType,
  splitTranscript,
  type RecognitionResultsLike,
} from './dictation';

function results(
  entries: Array<{ text: string; final: boolean }>,
): RecognitionResultsLike {
  const list = entries.map((entry) => ({
    isFinal: entry.final,
    length: 1,
    0: { transcript: entry.text },
  }));

  return Object.assign(list, { length: list.length }) as RecognitionResultsLike;
}

describe('splitTranscript', () => {
  it('separates the settled text from the phrase still being spoken', () => {
    const { final, interim } = splitTranscript(
      results([
        { text: 'llamar a la empresa', final: true },
        { text: ' y pedir', final: false },
      ]),
    );

    expect(final).toBe('llamar a la empresa');
    expect(interim).toBe('y pedir');
  });

  it('joins several settled fragments in order', () => {
    const { final } = splitTranscript(
      results([
        { text: 'uno ', final: true },
        { text: 'dos', final: true },
      ]),
    );

    expect(final).toBe('uno dos');
  });

  it('returns empty strings when nothing was heard', () => {
    expect(splitTranscript(results([]))).toEqual({ final: '', interim: '' });
  });
});

describe('joinDictation', () => {
  it('stores just the transcript when there was no text', () => {
    expect(joinDictation('', 'comprar pan')).toBe('comprar pan');
    expect(joinDictation('   ', 'comprar pan')).toBe('comprar pan');
  });

  it('appends a dictated block after a blank line', () => {
    expect(joinDictation('Notas previas', 'lo dictado')).toBe(
      'Notas previas\n\nlo dictado',
    );
  });

  it('never adds stray whitespace for an empty dictation', () => {
    expect(joinDictation('Notas previas', '   ')).toBe('Notas previas');
    expect(joinDictation('', '')).toBe('');
  });
});

describe('hasSpeechRecognition', () => {
  it('accepts either the standard or the webkit-prefixed constructor', () => {
    expect(hasSpeechRecognition({ SpeechRecognition: () => {} })).toBe(true);
    expect(hasSpeechRecognition({ webkitSpeechRecognition: () => {} })).toBe(true);
  });

  it('is false when neither exists', () => {
    expect(hasSpeechRecognition({})).toBe(false);
  });
});

describe('pickAudioMimeType', () => {
  it('prefers webm, then ogg, then mp4', () => {
    expect(pickAudioMimeType((mime) => mime === 'audio/webm')).toBe('audio/webm');
    expect(pickAudioMimeType((mime) => mime === 'audio/ogg')).toBe('audio/ogg');
    expect(pickAudioMimeType((mime) => mime === 'audio/mp4')).toBe('audio/mp4');
  });

  it('returns null when no preferred container is supported', () => {
    expect(pickAudioMimeType(() => false)).toBeNull();
  });
});

describe('audioFileName', () => {
  it('stamps the time and matches the extension to the container', () => {
    const now = new Date(2026, 9, 18, 9, 4, 7);

    expect(audioFileName('audio/webm', now)).toBe('dictado-20261018-090407.webm');
    expect(audioFileName('audio/mp4', now)).toBe('dictado-20261018-090407.m4a');
  });
});

describe('dictationErrorMessage', () => {
  it('names a denied microphone', () => {
    expect(dictationErrorMessage('not-allowed')).toBe(DICTATION_DENIED_MESSAGE);
    expect(dictationErrorMessage('service-not-allowed')).toBe(
      DICTATION_DENIED_MESSAGE,
    );
  });

  it('names an empty recording', () => {
    expect(dictationErrorMessage('no-speech')).toBe(DICTATION_NO_SPEECH_MESSAGE);
  });

  it('degrades anything else to the generic message', () => {
    expect(dictationErrorMessage('aborted')).toBe(DICTATION_FAILURE_MESSAGE);
    expect(dictationErrorMessage('network')).toBe(DICTATION_FAILURE_MESSAGE);
  });
});

describe('formatElapsed', () => {
  it('renders minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7)).toBe('0:07');
    expect(formatElapsed(65)).toBe('1:05');
  });

  it('never renders a negative or fractional value', () => {
    expect(formatElapsed(-3)).toBe('0:00');
    expect(formatElapsed(9.7)).toBe('0:09');
  });
});
