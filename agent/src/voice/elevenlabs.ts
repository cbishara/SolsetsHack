/** Server-side ElevenLabs transport. Sol's conversation and memory stay in createChat. */
const API = 'https://api.elevenlabs.io';
/** Miguel G, Latin American Spanish male voice chosen by Quito on 2026-10-23. Not a secret. */
export const SOL_VOICE_ID = 'k8cFOyAg7B9qwBlDDNTC';
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 2000;
const AUDIO_TYPES = new Map([
  ['audio/mp4', 'm4a'], ['audio/m4a', 'm4a'], ['audio/x-m4a', 'm4a'],
  ['audio/mpeg', 'mp3'], ['audio/wav', 'wav'], ['audio/x-wav', 'wav'],
  ['audio/webm', 'webm'], ['audio/ogg', 'ogg'], ['audio/aac', 'aac'],
]);

export type VoiceErrorCode = 'not-configured' | 'invalid-input' | 'provider' | 'timeout' | 'cancelled' | 'invalid-response';

export class VoiceError extends Error {
  readonly code: VoiceErrorCode;
  readonly status?: number;

  constructor(code: VoiceErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'VoiceError';
    this.code = code;
    this.status = status;
  }
}

export interface VoiceOptions {
  apiKey: string;
  voiceId?: string;
  sttModel?: string;
  ttsModel?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

/** Limits buffered provider audio; never stores a recording or an API key. */
async function readAudio(response: Response): Promise<Uint8Array> {
  if (!response.body) throw new VoiceError('invalid-response', 'ElevenLabs no devolvió audio.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_AUDIO_BYTES) {
        await reader.cancel();
        throw new VoiceError('invalid-response', 'El audio de respuesta supera el límite local de 5 MiB.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!length) throw new VoiceError('invalid-response', 'ElevenLabs devolvió un audio vacío.');
  const audio = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.byteLength; }
  return audio;
}

export function createElevenLabsVoice(options: VoiceOptions) {
  const apiKey = options.apiKey.trim();
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new VoiceError('not-configured', 'Falta ELEVENLABS_API_KEY en el servidor.');
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new VoiceError('invalid-input', 'El plazo de voz debe estar entre 1 y 120000 ms.');
  }
  const fetcher = options.fetcher ?? fetch;

  async function call<T>(path: string, init: RequestInit, consume: (response: Response) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const response = await fetcher(API + path, {
        ...init,
        headers: { ...init.headers, 'xi-api-key': apiKey },
        signal: combined,
        redirect: 'error',
      });
      if (!response.ok) {
        // Provider bodies can contain submitted content. Return only a controlled error.
        await response.body?.cancel();
        const message = response.status === 401 || response.status === 403
          ? 'ElevenLabs rechazó el acceso. Revisa la clave y sus permisos.'
          : response.status === 402 || response.status === 429
            ? 'ElevenLabs no está disponible por cuota o límite de uso.'
            : 'ElevenLabs no pudo completar la solicitud.';
        throw new VoiceError('provider', message, response.status);
      }
      return await consume(response);
    } catch (error) {
      if (signal?.aborted) throw new VoiceError('cancelled', 'Operación de voz cancelada.');
      if (timeout.aborted) throw new VoiceError('timeout', 'ElevenLabs no respondió dentro del plazo de voz.');
      if (error instanceof VoiceError) throw error;
      throw new VoiceError('provider', 'No se pudo completar la conexión con ElevenLabs.');
    }
  }

  async function transcribe(audio: Uint8Array, mimeType: string, signal?: AbortSignal): Promise<{ text: string; languageCode?: string }> {
    const type = mimeType.toLowerCase().split(';')[0].trim();
    const extension = AUDIO_TYPES.get(type);
    if (!extension || !audio.byteLength || audio.byteLength > MAX_AUDIO_BYTES) {
      throw new VoiceError('invalid-input', 'Se necesita un audio válido de hasta 5 MiB.');
    }
    const form = new FormData();
    form.set('file', new Blob([Uint8Array.from(audio)], { type }), `recording.${extension}`);
    form.set('model_id', options.sttModel ?? 'scribe_v2');
    form.set('language_code', 'es');
    form.set('tag_audio_events', 'false');
    form.set('diarize', 'false');
    form.set('timestamps_granularity', 'none');
    return call('/v1/speech-to-text', { method: 'POST', body: form }, async response => {
      let result: unknown;
      try { result = await response.json(); }
      catch { throw new VoiceError('invalid-response', 'ElevenLabs no devolvió una transcripción válida.'); }
      const value = result as { text?: unknown; language_code?: unknown } | null;
      if (!value || typeof value.text !== 'string' || !value.text.trim() || value.text.length > MAX_TEXT) {
        throw new VoiceError('invalid-response', 'La transcripción está vacía o supera los 2000 caracteres del chat.');
      }
      return { text: value.text.trim(), ...(typeof value.language_code === 'string' ? { languageCode: value.language_code } : {}) };
    }, signal);
  }

  async function speak(text: string, signal?: AbortSignal): Promise<{ audio: Uint8Array; contentType: 'audio/mpeg' }> {
    const voiceId = options.voiceId?.trim();
    if (!voiceId) throw new VoiceError('not-configured', 'Falta ELEVENLABS_VOICE_ID: hay que elegir la voz de Sol.');
    if (!text.trim() || text.length > MAX_TEXT) throw new VoiceError('invalid-input', 'La respuesta debe tener entre 1 y 2000 caracteres.');
    return call(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: options.ttsModel ?? 'eleven_multilingual_v2' }),
    }, async response => {
      if (!/^audio\/(mpeg|mp3)(;|$)/i.test(response.headers.get('content-type') ?? '')) {
        throw new VoiceError('invalid-response', 'ElevenLabs no devolvió audio MP3.');
      }
      return { audio: await readAudio(response), contentType: 'audio/mpeg' };
    }, signal);
  }

  /** Reads only voice IDs and names; never chooses or clones a voice automatically. */
  async function listVoices(signal?: AbortSignal): Promise<Array<{ id: string; name: string }>> {
    return call('/v2/voices?page_size=100', { method: 'GET' }, async response => {
      const result = await response.json() as { voices?: Array<{ voice_id?: unknown; name?: unknown }> };
      if (!Array.isArray(result?.voices)) throw new VoiceError('invalid-response', 'No se pudo leer el catálogo de voces.');
      return result.voices.filter(v => typeof v?.voice_id === 'string' && typeof v.name === 'string')
        .map(v => ({ id: v.voice_id as string, name: v.name as string }));
    }, signal);
  }

  return { transcribe, speak, listVoices };
}

export type Voice = ReturnType<typeof createElevenLabsVoice>;

/** HTTP status a server route should answer for each error. 503 lets the app fall back to its own voice. */
export function voiceErrorStatus(error: VoiceError): number {
  switch (error.code) {
    case 'invalid-input': return 400;
    case 'not-configured': return 503;
    case 'provider': return error.status === 402 || error.status === 429 ? 503 : 502;
    case 'timeout': return 504;
    case 'cancelled': return 499;
    case 'invalid-response': return 502;
  }
}

export function elevenLabsFromEnv(env: NodeJS.ProcessEnv = process.env, fetcher?: typeof fetch) {
  return createElevenLabsVoice({
    apiKey: env.ELEVENLABS_API_KEY ?? '', voiceId: env.ELEVENLABS_VOICE_ID?.trim() || SOL_VOICE_ID,
    sttModel: env.ELEVENLABS_STT_MODEL, ttsModel: env.ELEVENLABS_TTS_MODEL,
    timeoutMs: env.ELEVENLABS_TIMEOUT_MS ? Number(env.ELEVENLABS_TIMEOUT_MS) : undefined,
    fetcher,
  });
}
