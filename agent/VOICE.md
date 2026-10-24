# Voz de Sol con ElevenLabs

Pedido: hablar con Sol y escuchar su respuesta. El [PRD/spec](../docs/equipo/quito/specs/2026-10-23-sol-conversacion-y-voz.md) define conversación, casos y dependencias.

## Qué existe

`src/voice/elevenlabs.ts` pasa audio a texto (STT), lee la respuesta de Sol en voz alta (TTS) y consulta las primeras 100 voces de la cuenta. Usa `fetch`, sin dependencias nuevas. El cerebro y la memoria siguen en `src/chat.ts`; sus instrucciones editables están en `criteria/chat.md`.

La voz de Sol es Miguel G, masculina en español latinoamericano (`k8cFOyAg7B9qwBlDDNTC`), elegida por Quito el 2026-10-23. Es la voz por defecto de `elevenLabsFromEnv`; `ELEVENLABS_VOICE_ID` solo hace falta para cambiarla. La prueba real desde el Mac generó audio en 1989 ms y completó síntesis más transcripción en 5350 ms, recuperando la frase sintética salvo la puntuación final.

Estado al 2026-10-24: la app ya graba con `expo-audio` y manda cada turno a `POST /api/transcribe` (`mobile/src/api/server.ts`), pero esa ruta todavía no existe en `server/`. Mientras tanto la app habla con la voz del teléfono (`expo-speech`). El agente ya expone las rutas de voz (abajo); falta el tramo del servidor y probar el recorrido en un teléfono.

## Interfaz estable

```ts
import { elevenLabsFromEnv, VoiceError, voiceErrorStatus } from './src/voice/elevenlabs.ts';
const voice = elevenLabsFromEnv();
const { text } = await voice.transcribe(audioBytes, 'audio/m4a', signal);   // { text, languageCode? }
const { audio, contentType } = await voice.speak(replyText, signal);        // Uint8Array, 'audio/mpeg'
const voices = await voice.listVoices(signal);                              // [{ id, name }]
```

1. `transcribe(audio: Uint8Array, mimeType: string, signal?)`: acepta m4a, mp4, mp3, wav, webm, ogg y aac, hasta 5 MiB. Devuelve texto de 1 a 2000 caracteres, ya recortado. Un audio vacío o sin voz falla; nunca inventa texto.
2. `speak(text: string, signal?)`: lee exactamente ese texto, de 1 a 2000 caracteres, en MP3 de 44,1 kHz. El audio de respuesta también tiene un tope de 5 MiB.
3. `listVoices(signal?)`: solo nombres e identificadores. No elige ni clona voces.
4. Plazo de 30 s por llamada (`ELEVENLABS_TIMEOUT_MS`, entre 1 y 120000). Sin reintentos automáticos.
5. Errores `VoiceError` con `code`: `not-configured`, `invalid-input`, `provider` (con `status` del proveedor), `timeout`, `cancelled` e `invalid-response`. Nunca incluyen el cuerpo de error del proveedor ni la clave. `voiceErrorStatus(error)` da el HTTP que conviene responder: 400, 503, 502, 504 o 499. Cuota agotada (402 o 429) y falta de configuración salen como 503, que la app ya trata como "no disponible" y le permite seguir con su voz propia.

El adaptador no guarda grabaciones. Esto no garantiza retención cero de ElevenLabs: el proveedor recibe el audio para transcribir y el texto para leer, no el historial ni la memoria.

## Rutas del agente

El servidor le habla al agente por HTTP y no importa su código (`server/src/agent.ts`), así que el agente expone la voz detrás del mismo `AGENT_TOKEN` de `/v1/app/classify`. La clave de ElevenLabs vive solo en el servicio del agente.

1. `POST /v1/voice/transcribe`: el cuerpo es el audio crudo, con su tipo en `content-type` (por ejemplo `audio/m4a`), hasta 5 MiB. Responde `{ "text": "...", "languageCode": "spa" }`.
2. `POST /v1/voice/speak`: JSON `{ "text": "..." }` con la respuesta de Sol. Responde el MP3 con `content-type: audio/mpeg`.
3. Errores en JSON `{ "error": "<code>", "message": "..." }` con el estado de `voiceErrorStatus`. Sin `ELEVENLABS_API_KEY` en el agente, las dos responden 503 `not-configured`. Si quien llama corta, se cancela la llamada al proveedor.

Verificado el 2026-10-24 contra ElevenLabs real, con las rutas en un puerto local: `speak` respondió 200 con 84470 bytes de MP3 en 4627 ms, y `transcribe` devolvió la misma frase sintética en 1170 ms.

## Contrato propuesto para `server/`

Lo implementa Amaru en `server/`; esta sección es la propuesta para acordarla entre los tres.

1. `POST /api/transcribe`: multipart con el campo `audio` (la app manda `nota.m4a` como `audio/m4a`, o `nota.webm` en web). Reenvía los bytes a `/v1/voice/transcribe` y responde `{ "text": "..." }`. Ya está en `docs/equipo/bishara/CONTRATO_APP_V2.md` y la app lo llama hoy.
2. `POST /api/speak`: JSON `{ "text": "..." }` con la respuesta de Sol que la app ya tiene. Reenvía a `/v1/voice/speak` y devuelve el MP3. Como recibe el texto ya guardado, volver a escuchar una respuesta no repite la inferencia del agente (casos sol-11 y sol-12 de `cases/conversacion-voz.json`).
3. Ambas detrás del `API_TOKEN` de la API, pasando tal cual el estado del agente. Un 503 le dice a la app que siga con su voz propia.

## Configuración

`ELEVENLABS_API_KEY` es la única variable secreta. Vive en `agent/.env` en el Mac (ignorado por Git) y en las variables del servicio `agent` de Railway. Nunca en `EXPO_PUBLIC_*`, el bundle de la app, un issue, un PR ni el repositorio.

Para crear `agent/.env`, copiar `.env.example` y completar la clave, o autorizar la cuenta con la CLI oficial, que la guarda sin pasar por el chat:

```sh
npx --yes @elevenlabs/cli@latest onboard init --env-path .env
npx --yes @elevenlabs/cli@latest onboard connect --env-path .env
```

Si devuelve `next: wait`, seguir esperando la misma autorización con `onboard connect --wait --env-path .env`; no iniciar otra conexión ni reemplazar una clave existente. Verificar con `onboard check --env-path .env`.

Valores por defecto ajustables: `ELEVENLABS_STT_MODEL=scribe_v2`, `ELEVENLABS_TTS_MODEL=eleven_multilingual_v2`, `ELEVENLABS_TIMEOUT_MS=30000`.

## Verificar

```sh
npm test                                   # incluye las pruebas del adaptador; no llama a ElevenLabs
npm run verify:voice -- --voices           # lista voces de la cuenta; no genera audio
npm run verify:voice -- --live --report ../.context/voice-elevenlabs.json
```

`--live` hace dos llamadas con consumo: genera una frase ficticia con Miguel G y la transcribe. El informe guarda tiempos, bytes y transcripción, y el MP3 queda junto al informe con sufijo `.mp3`. No conversa con Codex ni prueba el micrófono del teléfono. Sin `--live` ni `--voices` solo muestra ayuda.

## Pendiente por carril

1. Amaru (`server/`): las dos rutas de arriba, `ELEVENLABS_API_KEY` en el servicio `agent` de Railway y `/api/chat` conectado al agente (hoy responde 503).
2. Bishara (`mobile/`): reproducir el MP3 de `/api/speak` cuando exista, con la voz del teléfono como respaldo.
3. Equipo: probar el mismo turno en un teléfono, con eco, audífonos y red cortada.

## Fuentes

[ElevenLabs STT](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [TTS](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [OpenAPI](https://api.elevenlabs.io/openapi.json) y [conexión para agentes de desarrollo](https://elevenlabs.io/docs/eleven-api/quickstart#set-up-with-your-coding-agent), consultados el 2026-10-23.
