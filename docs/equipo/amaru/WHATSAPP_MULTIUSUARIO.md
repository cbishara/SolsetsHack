# WhatsApp: sugerencias, selección y un bot para varios usuarios

## Pedido y decisiones de Amaru, 2026-10-23

Este documento presenta a Quito el plan de backend y fija lo que debe recibir Bishara al integrarlo en móvil. El acuerdo se coordina en [#30](https://github.com/cbishara/SolsetsHack/issues/30); el puente en [#24](https://github.com/cbishara/SolsetsHack/issues/24). Continúa el transporte de PR #23. La implementación candidata y sus pruebas se describen abajo; tiene un candidato separado desplegado; la integración completa del modelo y cliente sigue en curso. Plan maestro: [PLAN_MAESTRO.md](PLAN_MAESTRO.md).

Amaru pidió expresamente: el agente sugiere chats/grupos relevantes, el usuario confirma cuáles monitorear y puede elegir cualquiera del catálogo aunque no se haya sugerido; un número de SOL atiende a varios usuarios; QR y un código enviado por el bot que se introduce en el panel vinculan la identidad sin mezclar contexto. La app móvil es el destino principal, la web es alternativa.

**Respuesta confirmada por Amaru:** el filtro inicial usa nombres y tipos; mensajes solamente de chats elegidos. No leer muestras de conversaciones no seleccionadas. El catálogo es metadatos, no historial.

## Conclusión y recorrido

1. La app tiene una sesión individual emitida/verificada por el servidor; nunca comparte el Bearer de propietario del piloto. El servidor determina `userId`, no un campo libre enviado por el cliente.
2. Esa sesión pide conectar su cuenta personal de WhatsApp. Backend genera enlace de Unipile/QR y correlación de un solo uso. El callback se verifica y se contrasta con la cuenta del proveedor; el navegador no puede atribuirse un `account_id` arbitrario.
3. Desde la cuenta BOT de SOL se envía un código al propietario de la cuenta recién vinculada, obtenido de datos canónicos del proveedor, nunca a un teléfono libre. Se introduce en la misma sesión. Código con seis dígitos, caducidad, límite de intentos, enfriamiento de reenvío y consumo atómico. Solo se guarda un HMAC/hash con secreto de servidor, nunca el código plano en logs/base pública.
4. Confirmar une de forma exclusiva `userId ↔ cuenta personal ↔ identidad WhatsApp del propietario`. Un mismo número bot puede atender muchos usuarios; una cuenta personal/identidad no puede pertenecer simultáneamente a dos usuarios. Reconectar no reasigna al dueño. Recuperación de cuenta requiere un procedimiento aparte.
5. Se obtiene el catálogo paginado de chats/grupos de esa cuenta. El agente de Quito compara únicamente `{id,name,type}` con necesidades declaradas y devuelve sugerencias explicadas. No puede habilitar seguimiento ni inventar chats. Baja confianza significa pedir que el usuario elija; nunca leer más por su cuenta.
6. El usuario confirma una selección o busca cualquier chat del catálogo. Recomendación y permiso son campos separados. Todo empieza sin seleccionar. Desmarcar prevalece sobre recomendaciones futuras y cancela uso pendiente del chat.
7. Solo mensajes de chats seleccionados entran a contexto. Cada lectura, webhook, trabajo del agente, memoria y respuesta vuelve a comprobar usuario, cuenta y permisos vigentes. El historial no dispara respuestas; el texto de terceros no escribe preferencias personales ni da instrucciones al sistema.
8. Mensajes directos al bot se resuelven por remitente verificado y cuenta BOT. App y WhatsApp usan la misma conversación/memoria del usuario. Los grupos seleccionados aportan contexto, pero no se responde en grupos automáticamente. El bot responde al usuario cuando este le escribe; recordatorios proactivos quedan para después.

Amaru confirmó explícitamente que la cuenta ya conectada y con marca SOL es el bot definitivo. El escaneo vincula otra cuenta personal; el número BOT es el remitente de SOL. No publicar sus identificadores ni secretos. Si faltan esa cuenta o el puente real, estado explícito de no disponible, sin respuestas simuladas.

## Reparto propuesto a Quito

| Responsable | Entrega |
| --- | --- |
| Amaru / server | Sesiones individuales, almacenamiento por usuario, conexión y OTP, catálogo/selección, permisos, enrutado del bot, persistencia de trabajos/resultados y envíos. Pruebas de aislamiento y contrato HTTP. |
| Quito / agent | Trabajo de sugerencias por metadatos, razonamiento de chat, memoria por usuario, validación del contexto recibido y trabajador saliente. Adaptar #24 y publicar contrato/types + pruebas; credenciales Codex permanecen con Quito. |
| Ambos | Acordar formatos/versiones, ejecutar recorrido sintético con dos usuarios y luego prueba controlada del bot; documentar evidencia y límites. |
| Bishara / mobile | Tras contrato comprobado: conectar WhatsApp, introducir código, elegir sugeridos o catálogo completo, editar exclusiones, estados/error/reconexión, chat con continuidad. No presentar como integrado antes de pasar prueba backend. |

Continuidad: el agente anterior cerró PR #23 en `d7fe1ac`; confirmó que no sigue editando server. No hay una tercera implementación de API identificada. Nueva rama de coordinación/backend: `amaru/whatsapp-multiuser`, basada en PR #23 y main. Mantener el piloto desplegado hasta verificar este cambio.

## Contrato a cerrar antes del acoplamiento

Separar API de sesión de usuario, API del trabajador y webhook del proveedor. El token del trabajador nunca autentica un usuario; el Bearer global legado nunca abre rutas multiusuario. Propuesta de prefijo público nuevo `/api/v1` para no cambiar silenciosamente `/api/whatsapp` ni `/api/disconnect`.

- Sesión/identidad: una sesión propia por instalación/usuario; nada de `userId` libre ni tokens compartidos en Expo. El MVP debe explicar la recuperación y el acceso desde otro dispositivo; vincular por OTP no autoriza reasignar una cuenta existente.
- Conexión: iniciar, consultar estado y recibir callback; estados `connecting`, `awaiting_code`, `verified`, `disconnected`, `unavailable`. La autenticación por código de vinculación de WhatsApp en móvil es distinta del OTP enviado por SOL.
- Verificación: emitir/reintentar y confirmar código ligados a sesión + conexión. Repeticiones/callbacks paralelos no duplican identidades ni mensajes.
- Chats: catálogo completo paginado y sugerencias separadas. Selección escrita por el usuario, verificada contra pertenencia real. Historial y lectura requieren selección actual.
- Agente: conservar las reservas/resultados idempotentes de #24. Añadir sugerencias en versión negociada (no mandar un `kind` desconocido al trabajador v0). IDs y contexto entregados por servidor; Quito no busca otras cuentas ni conserva un singleton de memoria.
- Chat: UUID por petición, persistencia por usuario y conversación, comprobación de versión al aplicar memoria. Bot y app comparten ese estado. Un webhook propio, duplicado o histórico nunca inicia una respuesta.
- Envío: bandeja de salida persistente por usuario/cuenta bot/destinatario/solicitud. Ante entrega incierta no reenviar a ciegas. Antes de enviar comprobar vinculación/permisos actuales.

No reusar las rutas globales de `Guard` para esta API; no son multiusuario. El servidor debe rechazar consultas cruzadas aunque alguien cambie un ID en una URL.

## Pruebas que permiten entregar a Bishara

1. Dos sesiones A/B, dos cuentas personales y un bot: cada mensaje, historial, sugerencia, trabajo y memoria solo aparecen en el usuario correcto.
2. B no usa el código ni los IDs de A. Código vencido, reutilizado o tras agotar intentos falla. Dos verificaciones concurrentes de la misma identidad no crean dos propietarios.
3. Callback falsificado, cuenta ajena, resultado de trabajador para otro usuario y remitente no vinculado no acceden al contenido.
4. Se listan TODOS los chats disponibles por páginas; filtro inicial no invoca endpoint de mensajes. Un chat no sugerido puede seleccionarse manualmente.
5. Un chat desmarcado no entra al agente; quitar permiso invalida trabajos pendientes. Se conserva la distinción entre dejar de monitorear y borrar datos previamente guardados.
6. El bot contesta a A con contexto de A y a B con contexto de B. Mensaje propio/duplicado/histórico no genera bucles ni doble envío; reiniciar no pierde identidad o selección.
7. Contrato HTTP y fixtures sintéticos publicados; typecheck/tests/tablero pasan; recorrido con agente real y envío real informado como probado o pendiente, sin confundirlos.

## Entrega y coordinación

Este plan se envía a los agentes de Quito para confirmar reparto y contrato. Se implementa cada carril por separado; nadie edita mobile por adelantado. Al completar la evidencia, se notifica en #21 a Bishara con PR, versión de API, ejemplos, autenticación, estados y resultados de las pruebas. Antes de eso, cualquier aviso a frontend debe decir que es preparación y que el backend no está listo todavía.

Proveedores: [conexión WhatsApp](https://developer.unipile.com/docs/whatsapp), [Hosted Auth](https://developer.unipile.com/docs/hosted-auth), [mensajes y envíos](https://developer.unipile.com/docs/send-messages). No se promete todo el historial del teléfono: solo lo que Unipile haya sincronizado.

## Candidato construido en esta rama

`server/src/multiuser/` implementa identidad/sesión por instalación, callback privado contrastado con Unipile, OTP de seis dígitos enviado desde cuenta BOT, verificación atómica, catálogo paginado de nombres/tipos, selección explícita, historial autorizado, recepción por usuario y bandeja individual del bot. Los IDs y teléfonos del callback no vienen del frontend: se contrastan con la cuenta canónica del proveedor. Para entradas del bot se usa el chat individual creado al enviar el código; no se inventa una conversión LID/teléfono.

Al revocar una selección cambia su generación. Una descarga iniciada antes de revocar no se guarda aunque se vuelva a seleccionar después. Desconectar cambia la versión de vinculación e invalida callbacks y códigos pendientes. La propiedad de la cuenta no se libera para que otro usuario pueda apropiársela.

La persistencia multiusuario usa `sol_identity.documents`, separada del piloto. Las transacciones cortas llevan bloqueo asesor de Postgres para excluir carreras entre procesos; no contienen llamadas externas. Esto prioriza corrección en el piloto y serializa escrituras: no se acredita capacidad para tráfico masivo. El adaptador en memoria aplica el mismo rollback para pruebas.

La verificación se consume antes de configurar suscripciones. Si ese segundo paso falla, la app consulta el estado y reintenta `/activate`; no vuelve a pedir OTP ni convierte la entrega fallida en doble envío. Una entrega de código incierta exige reenvío explícito tras el enfriamiento; no se reenvía automáticamente.

### Contrato HTTP candidato para revisar con Quito/Bishara

Todos los endpoints bajo `/api/v1`, salvo crear sesión, solicitar/verificar login y callbacks/webhook, requieren sesión individual: Bearer nativo o cookie privada web con comprobación de origen. Ni el Bearer global del piloto ni el futuro token del trabajador sirven aquí. El código del OTP nunca se devuelve en una respuesta HTTP. Las rutas no aceptan `userId`, `accountId` o teléfono del cliente para autorizar operaciones.

| Método / ruta | Cuerpo / resultado |
| --- | --- |
| POST `/sessions` | `{}` → sesión aleatoria individual y expiración. Guardarla en almacenamiento seguro móvil; no compartirla entre usuarios. |
| GET `/me` | Identidad de la sesión y estado de vinculación. |
| POST `/whatsapp/connections` | `{}` → `connectionId`, enlace de conexión Unipile y expiración. Reconectar usa la cuenta guardada en servidor. |
| GET `/whatsapp/connections/:id` | Estado `connecting`, `awaiting_code`, `verified` o `disconnected`; estado/caducidad del código sin el código. |
| POST `/whatsapp/connections/:id/code` | `{}` → reenvío explícito sujeto a límite/enfriamiento. |
| POST `/whatsapp/connections/:id/verify` | `{code}` → verificación y activación de recepción. |
| POST `/whatsapp/connections/:id/activate` | `{}` → reintentar solo la activación tras verificar. |
| DELETE `/whatsapp/connection` | Detener el uso del vínculo en SOL, sin borrar historial ni eliminar la cuenta de Unipile. |
| GET `/whatsapp/chats?cursor=...` | Catálogo paginado; recorrer hasta cursor nulo. No obtiene contenido. |
| GET `/whatsapp/selections` | Selecciones y generaciones vigentes. |
| PUT `/whatsapp/chats/:id/selection` | `{selected:boolean}`; pertenencia validada por proveedor. |
| POST `/whatsapp/chats/:id/import` | `{cursor?}`; solo seleccionado, sin alertas. |
| GET `/whatsapp/chats/:id/messages` | Hasta 200 mensajes recientes del chat seleccionado. |
| GET `/whatsapp/catalog-snapshot` | Metadatos disponibles y `complete`; no fingir catálogo completo antes de paginar todo. |
| GET `/whatsapp/bot/messages` | Bandeja del usuario verificado, separada del resto de usuarios. |
| POST `/whatsapp/recommendations`, POST `/chat` | Actualmente 503 `agent_not_connected`; nunca respuestas fingidas. |

Callbacks privados: `POST /api/v1/webhooks/connected/:connectionId/:capability`, y mensajes con cabecera secreta a `/api/v1/webhooks/unipile`. No registrar URLs privadas, códigos o cuerpos de mensajes en logs de aplicación/proxy. Suscripciones se crean por cuenta; una existente con secretos/filtros incompatibles exige revisión y no se declara lista.

### Activación y límites comprobables

Opt-in `SOL_MULTIUSER_ENABLED=true`, Postgres obligatorio, `UNIPILE_BOT_ACCOUNT_ID`, `SOL_IDENTITY_SECRET` y `SOL_MULTIUSER_WEBHOOK_SECRET` distintos de los secretos legados. Credenciales Unipile y `PUBLIC_URL` se mantienen privadas. Al habilitarlo se desactiva el transporte legado de propietario único; no reutilizar el Bearer legado en Expo. Por defecto está desactivado y se conserva el piloto existente.

El login compartido de #37 ya crea una nueva sesión de la identidad canónica verificada en otro dispositivo. Contrato exacto, cookies, OTP de login, logout y pruebas: [LOGIN_COMPARTIDO.md](LOGIN_COMPARTIDO.md). La recuperación ante pérdida o cambio de número y el cliente integrado siguen pendientes. El límite de creación usa IP del socket sin confiar en cabeceras del cliente; ajustar el edge verificado antes de escalar tras proxy.

No se han enviado OTP reales. El candidato separado `sol-multiuser-demo` está desplegado en Railway con almacén propio y API global del piloto bloqueada. La integración real del trabajador, las sugerencias del modelo, respuestas salientes del agente, borrado/retención y frontend siguen pendientes. Quito publicó v0 sintético en PR #31; el extremo de servidor y la interoperabilidad ya están verificados abajo. La ampliación v1 para sugerencias y evidencia de chats se propuso en #30; no enviar esos trabajos a v0.

Evidencia actual: 75 pruebas server aprobadas (54 nuevas de identidad, catálogo, proveedor, HTTP y cola); TypeScript pasa. Las pruebas HTTP ejercitan dos usuarios, callback/OTP/activación, selección manual, revocación durante REST, bot compartido, mensajes propios/antiguos ignorados y reintento tras falla de suscripción. Son fixtures sintéticos del proveedor, no una prueba real de Unipile ni del modelo.

## Puente de Quito: v0 probado, v1 pendiente

`server/src/multiuser/agent-queue.ts` implementa el servidor del contrato de Quito `8f939eeadcda82b5ed02b179b71bffcd5471b09f`: `POST /internal/agent/v0/claim`, `/jobs/:id/result` y `/jobs/:id/failure`. Autenticación exclusiva del trabajador; resultado y memoria se aplican atómicamente si la reserva y versión siguen vigentes. Repetir una entrega idéntica no la aplica dos veces. Una inferencia interrumpida o reserva vencida queda incierta; no se vuelve a ejecutar automáticamente.

Se habilita solamente con `SOL_AGENT_DEMO_ENABLED=true` y `SOL_AGENT_WORKER_TOKEN` propio. API de prueba, también con sesión individual: `POST /api/v1/demo/chat` acepta `{requestId:UUID,scenario}` y responde 202; `GET /api/v1/demo/chat` devuelve estado persistido y operaciones. Escenarios permitidos: `two_minute_steps`, `correct_routine`, `new_concern`, `forget_chat`. Sin trabajador que haya reservado recientemente devuelve 503. No acepta texto libre ni mensajes reales como si fueran sintéticos. `/api/v1/chat` y recomendaciones reales permanecen explícitamente no conectados.

Prueba reproducible del contrato exacto de Quito:

```sh
git fetch cbishara quito/puente-agente
cd server
node --import tsx scripts/verify-agent-contract.ts
```

Extrae el código del commit inmutable a un directorio temporal y ejecuta su trabajador/procesador reales con un runner inyectado sintético. Verificado: acuse perdido recuperado sin repetir inferencia, memoria corregida de dos a cinco minutos, aislamiento A/B y borrado de A sin afectar B. **Cero llamadas reales a Codex**; esta prueba no acredita respuesta real del modelo en Railway.

Prueba de base real: `scripts/verify-multiuser-postgres.ts`, con `SOL_TEST_DATABASE_URL` suministrada privadamente. Verificada en instancia temporal local de **PostgreSQL 17.11**, detenida y eliminada después: 20 transacciones concurrentes en dos conexiones, rollback, OTP de un solo uso, usuarios separados, resultado del agente idempotente y recuperación de identidad/chat/memoria al reconectar. Solo filas sintéticas con prefijo aleatorio, limpiadas al terminar. No se modificó la base del servicio Railway; su acceso es privado y no hay SSH configurado en este equipo.

Entrega completa a Bishara condicionada a #30: Quito confirma/implementa sugerencias y chat v1, se verifica el recorrido con su motor y cuenta BOT reales, y se publica evidencia de aislamiento. PR #36 es candidato de revisión, no anuncia ese hito como completado.
