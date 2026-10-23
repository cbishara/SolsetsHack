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
5. **Agente:** `server/src/agent.ts` define la interfaz `classify` + `decide` que implementa Quito en `agent/`. Mientras no existe, usa un reemplazo conservador por palabras clave. Si el agente falla, el mensaje despierta igual.
6. **Pendiente:** push con Expo, llamada de respaldo con temporizador de 3 minutos, calendario de turnos, deploy en Railway.

Variables en `server/.env.example`.

## WhatsApp por Unipile (rama de Amaru)

Implementado el transporte de contexto por chat: selección explícita, historial paginado, webhook autenticado, deduplicación y persistencia. No invoca el agente provisional ni responde automáticamente. El agente real y la pantalla móvil son dependencias de Quito y Bishara.

Guía, contrato y límites: [WHATSAPP_UNIPILE.md](../docs/equipo/amaru/WHATSAPP_UNIPILE.md). La configuración local se lee de `.env.local` y no se publica. `npm run unipile:check` valida la cuenta; `npm run unipile:subscribe` registra webhooks cuando `PUBLIC_URL` esté desplegada. Usar un servicio Railway separado del prototipo, con esta carpeta como raíz y Postgres.

## Conectar 2Chat (una vez)

1. Cuenta de prueba en 2Chat y conectar el número de demo con el QR.
2. En Railway: `TWOCHAT_API_KEY`, `TWOCHAT_NUMBER`, `TWOCHAT_WEBHOOK_TOKEN` (`openssl rand -hex 24`), `PUBLIC_URL`, `API_TOKEN`.
3. `npm run 2chat:subscribe` con esas variables. Registra `whatsapp.message.received`, `whatsapp.group.message.received` y `whatsapp.number.status`.
4. Crear el grupo de demo con el número del agente y escribir un mensaje inventado. Revisar `raw_events` para confirmar el formato y ajustar `parseTwoChat` si hace falta.
