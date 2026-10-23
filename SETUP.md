# Configuración para la demo

## 1. Panel en Railway

Desplegar este repositorio con el Dockerfile raíz. `railway.json` define healthcheck `/api/health` y una réplica. Configurar `APP_URL` con la URL HTTPS pública y `DASHBOARD_PASSWORD`. Para persistir sin Supabase, montar un volumen en `/app/.data`; con Supabase no es necesario. No colocar claves en variables VITE ni en el código del navegador.

## 2. Supabase

Ejecutar los dos archivos de `supabase/migrations` en orden desde SQL Editor. Configurar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` únicamente en el servicio backend. RLS está activo y los clientes anon/authenticated no tienen acceso: esta demo usa acceso servidor con autenticación básica. No es todavía una aplicación multiusuario. El primer inicio crea el workspace sintético.

El almacenamiento local no se importa automáticamente al activar Supabase. La nueva base comienza con el escenario inicial; conserva `.data/state.json` si necesitas recuperar una sesión local. `knowledge_chunks` usa vectores de 1536 dimensiones; escoger ese tamaño cuando se implemente la ingestión.

## 3. Google

1. Crear un proyecto Google Cloud. Habilitar Gmail API y Google Calendar API.
2. Configurar pantalla de consentimiento en testing y agregar una cuenta de prueba a test users.
3. Crear cliente OAuth «Aplicación web». Redirect URI exacta: `APP_URL/auth/google/callback`.
4. Agregar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_ID=primary`.
5. Generar `TOKEN_ENCRYPTION_KEY` con `openssl rand -hex 32`; conservar la misma clave mientras existan tokens guardados. No compartir su salida.
6. Reiniciar; abrir Conexiones → Gmail → Autorizar con Google.
7. Preparar correos ficticios con `[SOLSETS-DEMO]` en el asunto. Pulsar «Leer correos» para procesarlos. Se usa asunto/snippet; no adjuntos. Modo sombra propone; modo activo prepara borradores, nunca envía correos.
8. Calendar → crear evento de prueba. Se agenda dos minutos más adelante con popup al inicio. Probar con el teléfono/reloj reales; aceptar el evento en API no confirma que el usuario recibió o sintió una vibración.

## 4. Kapso

Conectar un número de prueba en Kapso. Variables: `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_WEBHOOK_SECRET`, `RODRIGO_WHATSAPP_NUMBER`, `KAPSO_ALLOWED_NUMBERS` (lista separada por comas, formato internacional sin +).

Registrar webhook v2 con destino `APP_URL/api/webhooks/kapso`, evento `whatsapp.message.received`, secret igual a `KAPSO_WEBHOOK_SECRET`, sin buffering. Se verifica HMAC-SHA256 sobre bytes originales y se guarda antes de responder. Se aceptan solo textos de números de prueba permitidos. Descartar eventos pasivos y salientes evita responder sobre conversaciones de otras apps. El código lee `X-Webhook-Event`, según el formato oficial.

El usuario escribe primero al número de demo antes de presentar, dentro de la ventana de conversación de WhatsApp. El registro «Aceptado por API» no significa entregado ni leído. Grupos y seguimiento de entrega permanecen pendientes. En modo sombra no se envían respuestas rutinarias, pero los mensajes críticos se escalan. La alerta automática por Calendar solo se crea si el permiso de calendario está en Automático; WhatsApp sigue siendo el canal de escalamiento.

## 5. Hermes en Docker

`docker-compose.yml` usa el Dockerfile oficial fijado a un commit. Requiere Docker/BuildKit y una clave `HERMES_API_KEY` compartida solo entre app y Hermes. Su puerto 8642 es privado; no se publica en el host. Configurar proveedor en el volumen persistente antes de arrancar el gateway:

```sh
cp .env.example .env
# Completar .env, APP_URL=http://localhost:3001 si usas Docker local.
docker compose --profile agent build
docker compose --profile agent run --rm hermes setup
docker compose --profile agent up -d
```

En `hermes setup`, seleccionar el proveedor autorizado por el equipo (por ejemplo Anthropic con `ANTHROPIC_API_KEY`). Para Railway, desplegar Hermes como servicio aparte a partir del mismo Dockerfile oficial; montar su volumen en `/opt/data`, configurar `API_SERVER_ENABLED=true`, `API_SERVER_HOST=0.0.0.0`, `API_SERVER_PORT=8642`, `API_SERVER_KEY`, y establecer `HERMES_BASE_URL=http://<servicio-hermes>.railway.internal:8642/v1` en Solsets.

El endpoint de clasificación usa el prompt de `classifier/system-prompt.txt`. Configurar Hermes sin herramientas operativas para este perfil: no debe disponer de credenciales de Gmail/Kapso/Supabase ni montar el volumen del backend. El backend consulta `/v1/toolsets` antes de clasificar y rechaza perfiles con herramientas habilitadas o cuyo estado no pueda verificar; en ese caso escala para revisión humana. El prompt por sí solo no constituye aislamiento. No se ha ejecutado Docker en la máquina de desarrollo por falta del ejecutable.

## Pendientes de prueba en vivo

- OAuth completo y renovación del token.
- Mensaje entrante Kapso → Hermes → política → respuesta rutinaria autorizada.
- Incidente crítico → WhatsApp y Calendar, comprobar los dispositivos.
- Reinicio con Supabase y conservación de la cola.
- Revisar permisos tras una aprobación. Las aprobaciones del panel solo ejecutan acciones sintéticas en esta versión; compras y cambios de turno reales necesitan un flujo específico.

## Documentación utilizada

- [Hermes API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server)
- [Docker oficial Hermes](https://github.com/NousResearch/hermes-agent/blob/cb757fac59c92b49e9b8f2910e5cd7ab75efffdd/docker-compose.yml)
- [Kapso eventos](https://docs.kapso.ai/docs/platform/webhooks/message-events)
- [Kapso firmas](https://docs.kapso.ai/docs/platform/webhooks/security)
- [OAuth Google](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Eventos Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
