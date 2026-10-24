// Hands-free voice turns: record, measure the level (the orb reacts to it),
// end the turn on silence, transcribe, and speak Sol's answer back.
// - Recording: expo-audio (works in Expo Go and on web).
// - Transcription: server/ (POST /api/transcribe). On web, the browser's speech
//   recognition also gives live text while you speak.
// - Speaking: expo-speech with the phone's Spanish voice, until server/ streams
//   the ElevenLabs voice Quito chose (#28, #29).
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type VoicePhase = 'idle' | 'listening' | 'muted' | 'thinking' | 'speaking' | 'denied';
export type Turn = { uri: string | null; text: string | null; seconds: number };

const SPEECH_DB = -38; // above this, someone is talking
const END_SILENCE_MS = 1600; // this long under it ends the turn

type WebRecognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: (() => void) | null };

function webRecognition(): WebRecognition | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Ctor = (window as unknown as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => WebRecognition }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'es-CL';
  r.interimResults = true;
  r.continuous = true;
  return r;
}

export function useVoice(onTurn: (turn: Turn) => void) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const status = useAudioRecorderState(recorder, 100);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [live, setLive] = useState('');
  const heard = useRef(false);
  const quietSince = useRef<number | null>(null);
  const startedAt = useRef(0);
  const rec = useRef<WebRecognition | null>(null);
  const liveText = useRef('');
  const ending = useRef(false);

  const db = typeof status.metering === 'number' ? status.metering : -160;
  // 0..1 for the orb; on web without metering, the live text keeps it breathing.
  const level = phase === 'listening' ? Math.max(0, Math.min(1, (db + 60) / 50)) : 0;

  const listen = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) { setPhase('denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      heard.current = false;
      quietSince.current = null;
      startedAt.current = Date.now();
      ending.current = false;
      liveText.current = '';
      setLive('');
      setPhase('listening');
      const r = webRecognition();
      if (r) {
        r.onresult = (e) => {
          let text = '';
          for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
          liveText.current = text;
          setLive(text);
          heard.current = true;
          quietSince.current = null;
        };
        r.onerror = () => {};
        try { r.start(); rec.current = r; } catch { rec.current = null; }
      }
    } catch {
      setPhase('denied');
    }
  }, [recorder]);

  const finish = useCallback(async (send: boolean) => {
    if (ending.current) return;
    ending.current = true;
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    try { rec.current?.stop(); } catch { /* already stopped */ }
    rec.current = null;
    try { await recorder.stop(); } catch { /* not recording */ }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (!send) { setPhase('idle'); return; }
    setPhase('thinking');
    onTurn({ uri: recorder.uri, text: liveText.current.trim() || null, seconds });
  }, [recorder, onTurn]);

  // End of turn on silence, after the person has said something.
  useEffect(() => {
    if (phase !== 'listening') return;
    if (db > SPEECH_DB) { heard.current = true; quietSince.current = null; return; }
    if (!heard.current) return;
    if (quietSince.current === null) quietSince.current = Date.now();
    else if (Date.now() - quietSince.current > END_SILENCE_MS) void finish(true);
  }, [db, phase, finish]);

  // Web without metering: end the turn when the live text stops changing.
  useEffect(() => {
    if (phase !== 'listening' || Platform.OS !== 'web' || !live) return;
    const t = setTimeout(() => { if (typeof status.metering !== 'number') void finish(true); }, END_SILENCE_MS + 400);
    return () => clearTimeout(t);
  }, [live, phase, status.metering, finish]);

  const mute = useCallback(() => {
    if (phase === 'listening') { recorder.pause(); setPhase('muted'); }
    else if (phase === 'muted') { recorder.record(); setPhase('listening'); quietSince.current = null; }
  }, [phase, recorder]);

  const speak = useCallback((text: string, then?: () => void) => {
    setPhase('speaking');
    Speech.stop();
    Speech.speak(text, {
      language: 'es-CL',
      rate: Platform.OS === 'ios' ? 0.52 : 1,
      onDone: () => { setPhase('idle'); then?.(); },
      onStopped: () => setPhase('idle'),
      onError: () => { setPhase('idle'); then?.(); },
    });
  }, []);

  const hush = useCallback(() => { Speech.stop(); setPhase('idle'); }, []);

  useEffect(() => () => {
    Speech.stop();
    try { rec.current?.abort(); } catch { /* noop */ }
    recorder.stop().catch(() => {});
  }, [recorder]);

  return { phase, level, live, seconds: Math.round((status.durationMillis ?? 0) / 1000), listen, finish, mute, speak, hush, setPhase };
}
