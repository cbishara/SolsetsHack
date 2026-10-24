# server/

Backend oficial: recibe WhatsApp y correo, los pasa al agente y expone la API que usa la app. Dueño: ver `CLAUDE.md`, sección "Cómo trabajamos los tres".

## Estado

TypeScript + Express. Corre sin claves, en memoria:

```sh
cd server && npm ci && npm run dev    # http://localhost:3002
curl -X POST localhost:3002/api/simulate/night
curl localhost:3002/api/report
npm test
```

1. **Rutas del contrato v0** (issue #7, sin confirmar): `night/today`, `feed`, `alerts/:id/seen`, `messages/:id/feedback`, `worries`, `report`, `metrics`, `settings`, `chat`, más `sources` y `devices`.
2. **WhatsApp por 2Chat:** `POST /api/webhooks/2chat/<token>`. Lee grupos y mensajes directos. Guarda cada evento crudo antes de procesarlo, porque 2Chat no documenta el formato de los mensajes de grupo. Si el número se desconecta, `GET /api/sources` lo muestra como `disconnected`.
3. **Correo por IMAP:** lee cada 30 segundos los no leídos cuyo asunto trae `[SOLSETS-DEMO]` y los marca como leídos.
4. **Consola de respaldo:** `POST /api/messages` con `{ text, sender, group }` mete un mensaje a mano.
5. **Agente:** `server/src/agent.ts` define la interfaz `classify` + `decide`. Con `AGENT_URL` llama al servicio `agent` por HTTP (ver abajo). Sin esa variable usa un reemplazo conservador por palabras clave. Si el agente falla, el mensaje despierta igual.
6. **Pendiente:** push con Expo, llamada de respaldo con temporizador de 3 minutos, calendario de turnos, deploy en Railway.

Variables en `server/.env.example`.

## Agente por HTTP y categorías (contrato app v2, #61)

`server/` no importa el código de `agent/` ni corre Codex: llama al servicio `agent` de Railway.

1. **`AGENT_URL`** (por ejemplo `https://agent.up.railway.app`) y **`AGENT_TOKEN`** (el Bearer interno de `/v1/*` del agente). Opcionales. Sin `AGENT_URL`, todo corre local con el reemplazo conservador. `AGENT_USER_ID` (por defecto `rodrigo-demo`) es el dueño fijo mientras no haya multiusuario; `AGENT_TIMEOUT_MS` (por defecto 30000). Con **`AGENT_WHATSAPP=true`** también van al agente los WhatsApp del número de demo, que el equipo llena con mensajes inventados; el agente debe tener `AGENT_APP_ALLOW_WHATSAPP=true`. El correo nunca sale del server.
2. **Qué manda:** cada mensaje `simulated` va a `POST /v1/app/classify` con `requestId` nuevo, `ownerVerified: true`, `synthetic: true`, hasta 30 incidentes recientes distintos (`{userId, incidentKey, text, group, receivedAt}`, solo de mensajes simulados) y las categorías activas. Las sugeridas no se mandan.
3. **Solo datos sintéticos:** `/v1/app/classify` acepta solo `source: simulated`. Un mensaje de WhatsApp o de correo **no sale del server**: lo clasifica el reemplazo conservador y pasa por la misma política.
4. **Política en código** (`src/policy.ts`, réplica de `decideForServer` de `agent/src/integration/server-policy.ts`, fijada con los mismos casos en `test/policy.test.ts`): nuevo o confianza < 0.7 despierta; una categoría con `wakeAtNight` agrega un despertar si la noche tiene avisos activos; una categoría nunca quita un despertar; duplicado del mismo incidente en menos de 30 minutos no re-despierta; el modo sombra no silencia. Error, respuesta inválida o más de 30 s → despierta.
5. **Veredictos:** `/api/feed` y `/api/report` traen además `categoryId` (o `null`), `summary` y `context` cuando los dio el agente.
6. **Categorías:** `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id`, con el mismo token que el resto de `/api/*`. Forma `{ id, name, color, icon, description, action, wakeAtNight, origin, status, createdAt }`. Máximo 30. `id`, `origin` y `createdAt` no cambian con `PATCH`. Con `ALLOW_SIMULATE` encendido se siembran una sola vez tres categorías sintéticas (`c-incident`, `c-security`, `c-request`) si no hay ninguna.

## WhatsApp por Unipile (rama de Amaru)

Implementado el transporte de contexto por chat: selección explícita, historial paginado, webhook autenticado, deduplicación y persistencia. No invoca el agente provisional ni responde automáticamente. El agente real y la pantalla móvil son dependencias de Quito y Bishara.

Guía, contrato y límites: [WHATSAPP_UNIPILE.md](../docs/equipo/amaru/WHATSAPP_UNIPILE.md). La configuración local se lee de `.env.local` y no se publica. `npm run unipile:check` valida la cuenta; `npm run unipile:subscribe` registra webhooks cuando `PUBLIC_URL` esté desplegada. Usar un servicio Railway separado del prototipo, con esta carpeta como raíz y Postgres.

## Conectar 2Chat (una vez)

1. Cuenta de prueba en 2Chat y conectar el número de demo con el QR.
2. En Railway: `TWOCHAT_API_KEY`, `TWOCHAT_NUMBER`, `TWOCHAT_WEBHOOK_TOKEN` (`openssl rand -hex 24`), `PUBLIC_URL`, `API_TOKEN`.
3. `npm run 2chat:subscribe` con esas variables. Registra `whatsapp.message.received`, `whatsapp.group.message.received` y `whatsapp.number.status`.
4. Crear el grupo de demo con el número del agente y escribir un mensaje inventado. Revisar `raw_events` para confirmar el formato y ajustar `parseTwoChat` si hace falta.
