/** Explicit smoke test; without a flag it never calls ElevenLabs. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { elevenLabsFromEnv, VoiceError } from '../src/voice/elevenlabs.ts';

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--live') && !args.includes('--voices')) {
    console.log('Desde agent/: npm run verify:voice -- --voices');
    console.log('Prueba real con Miguel G: npm run verify:voice -- --live [--report ../.context/voice-elevenlabs.json]');
    console.log('--live genera una frase ficticia y la transcribe: dos llamadas con consumo de ElevenLabs. No llama a Codex.');
    return;
  }
  const index = args.indexOf('--report');
  if (index !== -1 && (!args[index + 1] || args[index + 1].startsWith('--'))) throw new Error('Falta la ruta de --report.');
  const voice = elevenLabsFromEnv();
  if (args.includes('--voices')) {
    console.log(JSON.stringify(await voice.listVoices(), null, 2));
    return;
  }
  const text = 'Mañana tengo que llamar al taller. Prefiero dar un paso de dos minutos.';
  const started = Date.now();
  const speech = await voice.speak(text);
  const synthesizedMs = Date.now() - started;
  const transcription = await voice.transcribe(speech.audio, speech.contentType);
  const report = {
    provider: 'elevenlabs', synthetic: true, text, transcript: transcription.text,
    audioBytes: speech.audio.length, synthesizedMs, totalMs: Date.now() - started,
    scope: 'TTS y STT reales; revisar fidelidad de la transcripción. No verifica conversación, Expo ni micrófono físico.',
  };
  if (index !== -1) {
    const file = resolve(args[index + 1]);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(report, null, 2) + '\n');
    await writeFile(file + '.mp3', speech.audio);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error instanceof VoiceError ? `${error.code}: ${error.message}` : 'No se pudo completar la prueba de voz.');
  process.exitCode = 1;
});
