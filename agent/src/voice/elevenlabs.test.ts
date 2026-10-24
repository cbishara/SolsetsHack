import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElevenLabsVoice, elevenLabsFromEnv, SOL_VOICE_ID, VoiceError, voiceErrorStatus } from './elevenlabs.ts';

const audio = new Uint8Array([73, 68, 51, 1]);
const fail = async () => { throw new Error('unexpected paid request'); };

test('voice requires a server credential and validates audio before making a paid request', async () => {
  assert.throws(() => elevenLabsFromEnv({}), /ELEVENLABS_API_KEY/);
  assert.throws(() => createElevenLabsVoice({ apiKey: 'key', timeoutMs: NaN }), /plazo/);
  const voice = createElevenLabsVoice({ apiKey: 'key', fetcher: fail });
  await assert.rejects(voice.transcribe(new Uint8Array(), 'audio/mp4'), /audio válido/);
  await assert.rejects(voice.transcribe(new Uint8Array(5 * 1024 * 1024 + 1), 'audio/mp4'), /audio válido/);
  await assert.rejects(voice.transcribe(audio, 'text/plain'), /audio válido/);
  await assert.rejects(voice.speak('Hola'), /VOICE_ID/);
});

test('STT uploads audio as multipart with Spanish, without leaking the key into the body', async () => {
  const voice = createElevenLabsVoice({ apiKey: 'private-key', fetcher: async (url, init) => {
    assert.equal(url, 'https://api.elevenlabs.io/v1/speech-to-text');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('xi-api-key'), 'private-key');
    assert.equal(new Headers(init?.headers).get('content-type'), null);
    const form = init?.body as FormData;
    assert.equal(form.get('model_id'), 'scribe_v2');
    assert.equal(form.get('language_code'), 'es');
    assert.equal(form.get('tag_audio_events'), 'false');
    assert.equal(form.get('diarize'), 'false');
    assert.ok(form.get('file') instanceof Blob);
    assert.equal(form.has('xi-api-key'), false);
    return Response.json({ text: '  Mañana llamar al taller.  ', language_code: 'spa' });
  } });
  assert.deepEqual(await voice.transcribe(audio, 'audio/webm;codecs=opus'), { text: 'Mañana llamar al taller.', languageCode: 'spa' });
});

test('empty or overlong transcriptions fail instead of creating a chat turn', async () => {
  for (const text of ['', '  ', 'x'.repeat(2001), null]) {
    const voice = createElevenLabsVoice({ apiKey: 'key', fetcher: async () => Response.json({ text }) });
    await assert.rejects(voice.transcribe(audio, 'audio/mp4'), e => e instanceof VoiceError && e.code === 'invalid-response');
  }
});

test('TTS reads the exact Sol reply with the configured voice and returns MP3', async () => {
  const text = 'Podemos dejar una sola pregunta lista para mañana.';
  const voice = createElevenLabsVoice({ apiKey: 'key', voiceId: 'chosen-voice', fetcher: async (url, init) => {
    assert.equal(url, 'https://api.elevenlabs.io/v1/text-to-speech/chosen-voice?output_format=mp3_44100_128');
    assert.deepEqual(JSON.parse(init?.body as string), { text, model_id: 'eleven_multilingual_v2' });
    return new Response(audio, { headers: { 'content-type': 'audio/mpeg' } });
  } });
  assert.deepEqual(await voice.speak(text), { audio, contentType: 'audio/mpeg' });
});

test('TTS rejects empty or oversized replies without calling the provider', async () => {
  const voice = createElevenLabsVoice({ apiKey: 'key', voiceId: 'voice', fetcher: fail });
  await assert.rejects(voice.speak(' '), /2000/);
  await assert.rejects(voice.speak('x'.repeat(2001)), /2000/);
});

test('TTS fails visibly for JSON, empty audio and audio exceeding the local limit', async () => {
  const responses = [
    Response.json({ text: 'not an audio' }),
    new Response(new Uint8Array(), { headers: { 'content-type': 'audio/mpeg' } }),
    new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { 'content-type': 'audio/mpeg' } }),
  ];
  for (const response of responses) {
    const voice = createElevenLabsVoice({ apiKey: 'key', voiceId: 'voice', fetcher: async () => response });
    await assert.rejects(voice.speak('Hola'), e => e instanceof VoiceError && e.code === 'invalid-response');
  }
});

test('provider rejection never exposes its body or retries billable calls automatically', async () => {
  for (const status of [401, 403, 402, 429, 500]) {
    let calls = 0;
    const voice = createElevenLabsVoice({ apiKey: 'secret', voiceId: 'voice', fetcher: async () => {
      calls++;
      return new Response('secret and submitted user content', { status });
    } });
    await assert.rejects(voice.speak('Hola'), e => {
      assert.ok(e instanceof VoiceError);
      assert.equal(e.status, status);
      assert.ok(!e.message.includes('secret'));
      assert.ok(!e.message.includes('user content'));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test('timeouts and cancellations remain distinguishable from network failure', async () => {
  const untilAborted: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    if (init?.signal?.aborted) reject(new Error('aborted'));
    else init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  // AbortSignal.timeout timers are unref'ed, keep this fake network request alive.
  const keepAlive = setTimeout(() => {}, 5000);
  try {
    const timeout = createElevenLabsVoice({ apiKey: 'key', timeoutMs: 20, fetcher: untilAborted });
    await assert.rejects(timeout.transcribe(audio, 'audio/mp4'), e => e instanceof VoiceError && e.code === 'timeout');
    const controller = new AbortController();
    controller.abort();
    const cancelled = createElevenLabsVoice({ apiKey: 'key', fetcher: untilAborted });
    await assert.rejects(cancelled.transcribe(audio, 'audio/mp4', controller.signal), e => e instanceof VoiceError && e.code === 'cancelled');
    const network = createElevenLabsVoice({ apiKey: 'key', fetcher: async () => { throw new Error('raw secret'); } });
    await assert.rejects(network.transcribe(audio, 'audio/mp4'), e => e instanceof VoiceError && e.code === 'provider' && !e.message.includes('secret'));
  } finally { clearTimeout(keepAlive); }
});

test('voice catalog returns only IDs and names and does not synthesize or choose a voice', async () => {
  const voice = createElevenLabsVoice({ apiKey: 'key', fetcher: async (url, init) => {
    assert.equal(url, 'https://api.elevenlabs.io/v2/voices?page_size=100');
    assert.equal(init?.method, 'GET');
    return Response.json({ voices: [{ voice_id: 'one', name: 'Una voz', private: 'not returned' }, { name: 'invalid' }] });
  } });
  assert.deepEqual(await voice.listVoices(), [{ id: 'one', name: 'Una voz' }]);
});

test('from env, Sol speaks with Miguel G unless another voice is configured', async () => {
  const urls: string[] = [];
  const fetcher = async (url: string | URL | Request) => {
    urls.push(String(url));
    return new Response(audio, { headers: { 'content-type': 'audio/mpeg' } });
  };
  await elevenLabsFromEnv({ ELEVENLABS_API_KEY: 'key' }, fetcher).speak('Hola');
  await elevenLabsFromEnv({ ELEVENLABS_API_KEY: 'key', ELEVENLABS_VOICE_ID: ' other ' }, fetcher).speak('Hola');
  assert.equal(SOL_VOICE_ID, 'k8cFOyAg7B9qwBlDDNTC');
  assert.deepEqual(urls.map(u => new URL(u).pathname), ['/v1/text-to-speech/k8cFOyAg7B9qwBlDDNTC', '/v1/text-to-speech/other']);
});

test('each error maps to one HTTP status for the server routes', () => {
  assert.equal(voiceErrorStatus(new VoiceError('invalid-input', 'x')), 400);
  assert.equal(voiceErrorStatus(new VoiceError('not-configured', 'x')), 503);
  assert.equal(voiceErrorStatus(new VoiceError('provider', 'x', 429)), 503);
  assert.equal(voiceErrorStatus(new VoiceError('provider', 'x', 401)), 502);
  assert.equal(voiceErrorStatus(new VoiceError('timeout', 'x')), 504);
  assert.equal(voiceErrorStatus(new VoiceError('cancelled', 'x')), 499);
  assert.equal(voiceErrorStatus(new VoiceError('invalid-response', 'x')), 502);
});
