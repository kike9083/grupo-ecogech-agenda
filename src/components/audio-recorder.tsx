'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DICTATION_AUDIO_FAILURE_MESSAGE,
  DICTATION_FAILURE_MESSAGE,
  DICTATION_HINT,
  DICTATION_LABEL,
  DICTATION_LANG,
  DICTATION_NO_SPEECH_MESSAGE,
  DICTATION_RECORDING_LABEL,
  DICTATION_STOP_LABEL,
  DICTATION_UNSUPPORTED_MESSAGE,
  audioFileName,
  dictationErrorMessage,
  formatElapsed,
  pickAudioMimeType,
  splitTranscript,
  type RecognitionResultsLike,
} from '@/lib/dictation';

/**
 * Dictation control (spec `note-capture` → "Dictation"): one button that
 * listens, shows what it heard, and hands the settled text to its parent when
 * the user stops. Used by the note editor (text lands in the body) and by the
 * task form (text lands in the description).
 *
 * Two browser APIs run together and either may be unavailable:
 *
 * - `SpeechRecognition` produces the transcript. It is Chromium-only, so its
 *   absence is a stated limitation rather than a broken button.
 * - `MediaRecorder` captures the audio so it can be attached to the record.
 *   It is skipped when the parent supplies no `onAudio` (a record that does
 *   not exist yet cannot own an attachment) or when no allowed container is
 *   supported.
 *
 * The transcript is only handed over on STOP. Inserting the interim text would
 * rewrite the document on every partial word.
 */

interface SpeechRecognitionEventLike {
  results: RecognitionResultsLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  const scope = window as unknown as SpeechWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface AudioRecorderProps {
  /** Receives the settled transcript when the user stops. */
  onTranscript(text: string): void;
  /**
   * Receives the recording, when the caller can attach it. Omit it for a
   * record that does not exist yet — the transcript still lands.
   */
  onAudio?(file: File): Promise<void> | void;
  /** Greys the control out, with `disabledHint` explaining why. */
  disabled?: boolean;
  disabledHint?: string;
}

export function AudioRecorder({
  onTranscript,
  onAudio,
  disabled = false,
  disabledHint,
}: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const settledRef = useRef('');
  const mimeRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  // The recognizer's own `onend` and the stop handler both read this, so it
  // cannot be the state value: their closures are created before it settles.
  const activeRef = useRef(false);

  function fail(message: string): void {
    setError(message);
  }

  function clearTimer(): void {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function releaseStream(): void {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream !== null) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
  }

  // A recording in flight when the component unmounts must not keep the
  // microphone open.
  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimer();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      releaseStream();
    };
  }, []);

  async function start(): Promise<void> {
    const Ctor = recognitionCtor();
    if (Ctor === null) {
      fail(DICTATION_UNSUPPORTED_MESSAGE);
      return;
    }

    setError(null);
    setPreview('');
    setElapsed(0);
    settledRef.current = '';
    chunksRef.current = [];
    mimeRef.current = null;

    // Audio capture first (best effort): the recognizer asks for the
    // microphone on its own, and losing the file must not lose the text.
    if (onAudio !== undefined) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = pickAudioMimeType((candidate) =>
          MediaRecorder.isTypeSupported(candidate),
        );
        if (mimeType === null) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
        } else {
          const recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          recorder.start();
          recorderRef.current = recorder;
          streamRef.current = stream;
          mimeRef.current = mimeType;
        }
      } catch {
        // No microphone permission for the file; the recognizer will report
        // its own denial through `onerror`.
      }
    }

    const recognition = new Ctor();
    recognition.lang = DICTATION_LANG;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const { final, interim } = splitTranscript(event.results);
      settledRef.current = final;
      setPreview([final, interim].filter((part) => part !== '').join(' '));
    };
    recognition.onerror = (event) => {
      fail(dictationErrorMessage(event.error));
    };
    // Chromium ends the session after a pause; while the user is still
    // recording, that must restart rather than silently drop the dictation.
    recognition.onend = () => {
      if (activeRef.current) {
        try {
          recognition.start();
        } catch {
          // Already restarting or torn down — nothing to recover.
        }
      }
    };

    try {
      recognition.start();
    } catch {
      fail(DICTATION_FAILURE_MESSAGE);
      releaseStream();
      return;
    }

    recognitionRef.current = recognition;
    activeRef.current = true;
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      setElapsed((seconds) => seconds + 1);
    }, 1000);
  }

  async function stop(): Promise<void> {
    activeRef.current = false;
    setRecording(false);
    clearTimer();

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition !== null) {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder !== null && recorder.state !== 'inactive') {
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.stop();
      await stopped;
    }
    releaseStream();

    const text = settledRef.current.trim();
    setPreview('');
    setElapsed(0);

    if (text === '') {
      // Nothing usable came back; the denied-mic case already set its message.
      if (recognition !== null) {
        setError((current) => current ?? DICTATION_NO_SPEECH_MESSAGE);
      }
      return;
    }

    onTranscript(text);

    const mimeType = mimeRef.current;
    if (onAudio !== undefined && mimeType !== null && chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], audioFileName(mimeType, new Date()), {
        type: mimeType,
      });
      setBusy(true);
      try {
        await onAudio(file);
      } catch {
        fail(DICTATION_AUDIO_FAILURE_MESSAGE);
      } finally {
        setBusy(false);
      }
    }
    chunksRef.current = [];
  }

  const unavailable = disabled || busy;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={unavailable}
          aria-pressed={recording}
          onClick={() => {
            void (recording ? stop() : start());
          }}
          className={`btn btn-sm ${
            recording ? 'btn-danger' : 'btn-secondary'
          } disabled:opacity-60`}
        >
          {busy
            ? 'Adjuntando…'
            : recording
              ? `${DICTATION_STOP_LABEL} ${formatElapsed(elapsed)}`
              : DICTATION_LABEL}
        </button>

        {recording ? (
          <span role="status" className="text-xs font-semibold text-danger">
            {DICTATION_RECORDING_LABEL}
          </span>
        ) : null}
      </div>

      {recording && preview !== '' ? (
        <p className="text-xs text-ink-muted italic">{preview}</p>
      ) : null}

      {disabled && disabledHint !== undefined ? (
        <p className="meta">{disabledHint}</p>
      ) : !recording ? (
        <p className="meta">{DICTATION_HINT}</p>
      ) : null}

      {error !== null ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
