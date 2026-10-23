# WhatsApp → contexto de SOL

Trabajo de Amaru en `amaru/whatsapp-context`, sobre PR #15 y main. Coordinación: #17 (servidor), #7 (contrato), #14 (agente de Quito), #21 (móvil de Bishara).

## Qué está construido

La cuenta de WhatsApp conectada a Unipile alimenta un servidor propio. El propietario elige un chat o grupo; solo ese contenido entra a la base. La app puede consultar estado, selección y mensajes por conversación. No se usa el clasificador provisional para convertir conversaciones personales en alertas ni para escribir memoria del usuario.

Implementado: cliente Unipile v1, verificación de cuenta, listado paginado de chats, selección/revocación, importación de historial por páginas de 50, webhook autenticado, deduplicación compartida entre historial y eventos nuevos, persistencia local y Postgres. Las credenciales permanecen en el servidor. La app recibe `agent: not_connected` y `autoReply: false` mientras falta el agente real.

El servicio de prueba es independiente del `backend` del prototipo y de Hermes. Su despliegue se realiza desde un paquete que contiene solo código y manifiestos. No se publica `.env.local`, historial ni datos de la cuenta en GitHub.

### Verificación de despliegue, 2026-10-23

- Servicio `sol-whatsapp-demo`: [health público](https://sol-whatsapp-demo-production.up.railway.app/api/health), responde `{ok:true,service:"solsets-server"}`. Despliegue Railway `4a36220a-fa16-4a7f-beb9-6a2ac01ad72f`, estado SUCCESS; Postgres conectado y selección persistida.
- Cuenta real verificada en estado `OK`. Grupo de prueba encontrado y seleccionado explícitamente por Amaru; no se publican identificadores personales.
- Ambos webhooks creados y verificados como habilitados, con filtro de cuenta y cabecera secreta.
- En el servidor público: API privada sin Bearer → 401; webhook sin secreto → 401; evento sintético de cuenta ajena → 200 ignorado; agente todavía no conectado → 503.
- La primera importación del grupo devolvió cero mensajes y cursor nulo. La recepción de un nuevo mensaje por WhatsApp y su persistencia quedan pendientes de la prueba del participante; no se acredita esa prueba solo por tener el webhook registrado.

## Tutorial para Amaru

1. En Unipile, conectar WhatsApp. En Railway, guardar la clave completa como `UNIPILE_API_KEY`. **Esto ya se realizó y la cuenta respondió OK durante esta sesión.**
2. Crear el grupo **SOL Demo**, incluir el número conectado y escribir un mensaje inventado. **Grupo encontrado durante la sesión.**
3. Con el webhook registrado, escribir otra frase nueva en ese grupo. Revisar que aparezca una sola vez en la bandeja del servidor.
4. Bishara conecta esta bandeja y el estado de WhatsApp a la app; Quito conecta su agente para producir propuestas. Hasta entonces el bot todavía no conversa ni responde automáticamente.

No necesitas volver a escanear el QR ni poner claves en Expo. Los pasos técnicos siguientes sirven para reproducir la conexión y para el equipo.

## Correr localmente

```sh
cd server
npm ci
cp .env.example .env.local
# Completar .env.local; nunca subirlo al repo.
npm run unipile:check
npm start
```

El primer comando solo verifica la cuenta, sin leer mensajes ni enviar nada. `npm start` carga `.env.local`; las variables del proceso tienen prioridad. Para una prueba totalmente sintética, omitir Unipile y usar `ALLOW_SIMULATE=true` con el servidor base.

Variables requeridas para Unipile: `UNIPILE_DSN`, `UNIPILE_API_KEY`, `UNIPILE_ACCOUNT_ID`, `API_TOKEN`, `UNIPILE_WEBHOOK_SECRET` y `DATABASE_URL` o `LOCAL_DATA_FILE`. Los dos secretos de SOL deben ser distintos, largos y aleatorios. DSN acepta el origen HTTPS de Unipile y conserva el puerto; también normaliza la URL `/api/v1/accounts` que aparece en su ejemplo de curl.

En otra terminal, desde `server/`:

```sh
npm run unipile -- chats
npm run unipile -- select ID_DEL_CHAT
npm run unipile -- import ID_DEL_CHAT
npm run unipile -- inbox ID_DEL_CHAT
npm run unipile -- unselect ID_DEL_CHAT
```

`chats` devuelve metadatos, no mensajes. `import` solicita una sola página de hasta 50 y devuelve `cursor` si hay más; pasar ese cursor como argumento adicional para continuar deliberadamente. `inbox` muestra hasta los 200 mensajes más recientes por fecha. La consola puede mostrar información del chat elegido: no copiar su salida a issues públicas. Si `PUBLIC_URL` está configurada, estos comandos operan contra ese servidor; dejarla vacía para usar localhost.

La base local usa un diario privado (`.data/`, modo 0600), confirma las escrituras antes de responder al webhook y recupera selección/mensajes al reiniciar. Solo admite un proceso a la vez. Si detecta corrupción, falla explícitamente en lugar de perder silenciosamente información. Para Railway se exige Postgres; su disco efímero no sirve para este diario.

## Despliegue y webhooks

Servicio nuevo `sol-whatsapp-demo`, raíz `server/`, Dockerfile y `railway.json` de esa carpeta. Variables: las anteriores, `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `ALLOW_SIMULATE=false`, `PORT=3004` y `PUBLIC_URL` con su origen HTTPS público. No apuntar este código al servicio `backend` del prototipo.

Con el servicio saludable y las mismas variables disponibles al CLI:

```sh
npm run unipile:subscribe
npm run unipile -- status
```

El registro crea dos webhooks filtrados por la cuenta: mensajes y estado. Usa `Content-Type: application/json` y `X-Sol-Webhook-Secret`. Revisa todas las páginas de suscripciones para evitar duplicados. Si ya existe una suscripción con el mismo nombre/destino, no la reemplaza: revisar manualmente su activación y secreto si hubo una rotación. No hay reintentos automáticos de creación tras una respuesta incierta.

El webhook es `POST /api/webhooks/unipile`. Secreto ausente/incorrecto → 401; Unipile sin configurar → 503. Cuenta/chat fuera de selección o evento no compatible → 200 ignorado **sin guardar el cuerpo crudo**. Evento compatible → persistir y después 200. Fallo de base → 500 para que el proveedor reintente. No existe una cola de inferencia parcialmente implementada: el mensaje queda disponible y el agente pendiente es explícito.

## Contrato incremental para la app y Quito

Propuesta versionada con esta rama; pendiente de integración con los otros carriles. Todas las rutas siguientes requieren `Authorization: Bearer <API_TOKEN>` del propietario del piloto. La clave de Unipile nunca viaja al móvil.

| Método y ruta | Entrada / salida |
| --- | --- |
| GET `/api/whatsapp/status` | `configured`, `providerStatus`, `selectedChatIds`, `lastEvent`, `agent`, `autoReply` |
| GET `/api/whatsapp/chats?cursor=...` | `{items:[{id,name,providerChatType,selected}],cursor}` |
| PUT `/api/whatsapp/chats/:id/selection` | `{selected:boolean}`; verifica pertenencia antes de habilitar |
| POST `/api/whatsapp/chats/:id/import` | `{cursor?:string}` → `{imported,skipped,cursor,agent,notifications:0}` |
| GET `/api/whatsapp/chats/:id/messages` | `{items:[WhatsAppMessage],limit:200,agent}` |

`WhatsAppMessage` contiene `id`, `accountId`, `chatId`, `senderId`, `text`, `direction` (`incoming`, `outgoing` o `unknown`), `sentAt`, `storedAt`, `origin` (`history` o `webhook`) y `agentStatus` (`not_connected`). La clave de deduplicación incluye cuenta, chat e ID de Unipile. Las páginas antiguas no desplazan mensajes recientes por orden de importación.

Quito debe consumir contexto de la conversación adecuada. El ID de la cuenta transportadora no identifica al dueño de todos los mensajes. Texto externo se trata como evidencia no confiable, nunca como instrucciones del sistema ni como memoria validada del propietario. El historial no genera alertas retroactivas; mensajes propios o de dirección desconocida no disparan respuestas. No existe todavía endpoint de envío ni conexión de este transporte con `agent/`.

`POST /api/chat` responde 503 `agent_not_connected`; se retiró el 200 engañoso del placeholder. El resto del contrato base conserva su comportamiento.

## Límites y pendientes

- Piloto de un propietario: el Bearer actual da acceso a los chats que ese propietario seleccionó. Antes de varios usuarios, hace falta autenticación individual y aislamiento por usuario, no repartir este token.
- Desmarcar detiene nuevas capturas y bloquea lectura desde la API, pero no borra automáticamente los datos ya guardados. Falta el flujo de borrado y retención antes de usar historial personal a escala.
- Solo texto; no descarga audios/adjuntos, transcribe ni procesa ediciones/borrados/reacciones. El historial disponible depende de lo que Unipile haya sincronizado. No se fuerza una sincronización completa ni se promete todo el historial del teléfono.
- Una importación solicita una página. No hay tarea periódica de recuperación de huecos ni análisis en segundo plano. Las entregas repetidas se deduplican.
- El agente real, respuestas por WhatsApp, memoria validada y UI móvil integrada siguen pendientes de #14/#21. La conexión por sí sola no demuestra que SOL entiende el contexto ni que responde bien.
- Unipile y este servidor no monitorizan el uso de otras apps ni bloquean TikTok. Esas funciones nativas de iOS son otro trabajo.

## Evidencia y fuentes

`server/test/unipile.test.ts` cubre secretos/URLs, cuenta/chat fuera de alcance, historial, duplicados concurrentes, mensajes propios, revocación, fechas inválidas, separación por conversación, límite cronológico, reinicio, autenticación y registro paginado de webhooks. Ejecutar `cd server && npm run typecheck && npm test`.

Los eventos de nuevos mensajes también incluyen mensajes enviados por la propia cuenta, y el historial inicial se obtiene por REST, no por el webhook: [documentación oficial](https://developer.unipile.com/docs/new-messages-webhook). Esquemas contrastados con [mensajes](https://developer.unipile.com/docs/message-payload), [historial paginado](https://developer.unipile.com/reference/chatscontroller_listchatmessages) y [creación de webhooks](https://developer.unipile.com/reference/webhookscontroller_createwebhook).
