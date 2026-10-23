# Configuración para la demo

## 1. Panel en Railway

La infraestructura actual vive en `.railway/railway.ts`: backend con Dockerfile raíz, Hermes con Dockerfile en `/deploy/hermes`, PostgreSQL y sus volúmenes. Usar `railway config plan` y revisar que no haya destrucciones antes de `railway config apply --yes`. Las variables son unmanaged para configurar credenciales directamente en Railway sin guardarlas en GitHub. El backend usa healthcheck `/api/health`, una réplica y verifica PostgreSQL antes de cada despliegue. Configurar `APP_URL` con la URL HTTPS pública y `DASHBOARD_PASSWORD`. Sin PostgreSQL ni Supabase, montar un volumen en `/app/.data`. No colocar claves en variables VITE ni en el código del navegador.

## 2. Supabase

### Alternativa desplegada: PostgreSQL en Railway

El proyecto `solsets-hack` contiene `backend`, `Postgres` y `hermes`. El backend recibe `DATABASE_URL` por referencia a `${{Postgres.DATABASE_URL}}`; las conexiones permanecen en la red privada. El arranque crea las tablas del esquema `solsets` mediante una transacción y un bloqueo de migración. El volumen de PostgreSQL conserva los datos entre despliegues. No configurar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` a la vez que `DATABASE_URL`.

La fase pre-deploy ejecuta `node backend/verify-postgres.mjs` dentro de Railway. Comprueba migración repetible, estado y tokens cifrados con un workspace sintético que elimina al terminar. También puede ejecutarse por `railway ssh --service backend node backend/verify-postgres.mjs` si la cuenta tiene clave SSH registrada. Desplegar solo una réplica de backend: las decisiones se serializan en ese proceso.

Cambiar de proveedor no importa datos automáticamente. Para volver a Supabase o al almacenamiento local, respaldar y transferir primero los datos deseados; quitar `DATABASE_URL` solo después. Las tablas PostgreSQL permanecen intactas. Las migraciones de Supabase siguientes se conservan para quien elija ese proveedor.

### Configuración de Supabase

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

## 4. Kapso · Demo de desconexión

Esta rama recibe textos dirigidos al bot y responde al mismo remitente. Usa solo un número de prueba y ejemplos ficticios. No lee conversaciones personales ni grupos. No requiere Hermes.

1. Crear o conectar el número del bot en Kapso.
2. Configurar en el backend `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_WEBHOOK_SECRET`, `KAPSO_ALLOWED_NUMBERS` y `DASHBOARD_PASSWORD`. Los números permitidos llevan código de país, sin `+`, separados por comas. `RODRIGO_WHATSAPP_NUMBER` se mantiene como alternativa para un solo probador.
3. Configurar `APP_URL` con la URL HTTPS del **despliegue de esta rama**. No basta subir el código a GitHub: el servicio debe desplegar este commit. Para probarlo aisladamente usar otro servicio/entorno con su propia base o volumen y su propio número/webhook de prueba; no apuntar la demo experimental a los datos de producción.
4. Opcional: `WHATSAPP_DEMO_NUMBER` contiene el teléfono público del bot, sin `+`; habilita el enlace «Abrir WhatsApp». Es distinto del identificador `KAPSO_PHONE_NUMBER_ID`.
5. Registrar webhook v2 `APP_URL/api/webhooks/kapso`, evento `whatsapp.message.received`, secret igual al del backend, **sin buffering**. Se verifica HMAC-SHA256 de los bytes originales antes de guardar. Se descartan mensajes salientes, pasivos, medios distintos de texto y remitentes fuera de la lista.
6. Abrir `/desconectar` e ingresar con usuario `solsets` y la contraseña configurada. En «Conexión y controles del equipo», comprobar variables y pulsar «Habilitar respuestas». La configuración inicial es modo sombra: no se envía ninguna respuesta.
7. Desde el teléfono permitido, escribir **Hola SOL** al bot y continuar con el [guion](./docs/DEMO.md). La respuesta vuelve a ese mismo remitente. Seleccionar la conversación de WhatsApp en el panel para observar su contexto.

Pausa conserva mensajes en cola hasta reanudar. El modo sombra registra propuestas sin enviarlas; al desactivarlo se debe escribir un mensaje nuevo. El permiso `reply` debe ser `auto`. El timestamp original debe ser verificable y tener menos de 23 horas, margen conservador dentro de la ventana de 24 horas. Si vence, volver a escribir desde el teléfono.

El panel muestra configuración, cola y evidencia de recepción/aceptación en el historial conservado. «Configurado» solo comprueba presencia de variables; no valida credenciales ni registro del webhook. «Aceptada por API» requiere un identificador de mensaje y no significa entregada o leída. Ante un error o un resultado incierto se deja constancia y no se reenvía automáticamente; revisar en Kapso y escribir nuevamente desde el teléfono cuando corresponda.

El flujo web usa la misma lógica con envíos deshabilitados por el servidor. No admite un destinatario arbitrario. El panel es de equipo, no una aplicación multiusuario comercial. La instancia debe tener una sola réplica como en la arquitectura existente.

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
- Mensaje entrante Kapso → conversación de desconexión → respuesta al mismo remitente → corrección → nueva propuesta adaptada. Verificar la respuesta en el teléfono.
- El laboratorio anterior de guardia y sus integraciones se prueba por separado; no es el destino del webhook de esta rama.
- Reinicio con Supabase y conservación de la cola.
- Revisar permisos tras una aprobación. Las aprobaciones del panel solo ejecutan acciones sintéticas en esta versión; compras y cambios de turno reales necesitan un flujo específico.

## Documentación utilizada

- [Hermes API server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server)
- [Docker oficial Hermes](https://github.com/NousResearch/hermes-agent/blob/cb757fac59c92b49e9b8f2910e5cd7ab75efffdd/docker-compose.yml)
- [Kapso eventos](https://docs.kapso.ai/docs/platform/webhooks/message-events)
- [Kapso firmas](https://docs.kapso.ai/docs/platform/webhooks/security)
- [OAuth Google](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Eventos Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
