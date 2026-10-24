# Sugerir chats y responder con contexto elegido

Estado: implementación del carril de Quito para [#30](https://github.com/cbishara/SolsetsHack/issues/30). El contrato se entrega por separado en [PR #44](https://github.com/cbishara/SolsetsHack/pull/44); el procesador y el trabajador se entregan en el PR de esta funcionalidad. Amaru aceptó los campos de catálogo/evidencia y la precisión de identidad/modo real. V1 está activado en el servicio candidato de Railway; salud, autenticación y reservas del trabajador están comprobadas. Falta el primer turno remoto con una cuenta vinculada. El puente v0 del PR #31 conserva su contrato y sigue siendo sintético.

Quito autorizó en esta sesión procesar nombres/tipos de sus chats reales y mensajes únicamente de los chats que seleccione. La decisión quedó [oficial](../docs/equipo/adr/oficiales/2026-10-23-contexto-whatsapp-autorizado.md). Esta autorización no convierte las pruebas en datos reales: las pruebas y evaluación usan fixtures. El agente no descarga chats, resuelve identidades ni envía mensajes. Servidor y app conservan esas responsabilidades.

## Contrato candidato

Tipos y validación ejecutable: [contract-v1.ts](src/integration/contract-v1.ts). La especificación independiente está en [CONTRACT-V1.md](CONTRACT-V1.md), entregada en PR #44 antes de esta implementación. No cambian las respuestas de `/api/v1` ni requieren enviar v1 a un trabajador v0.

Mismas operaciones de reserva, resultado y fallo que v0, bajo **`/internal/agent/v1`**. Bearer exclusivo, HTTPS, UUID e idempotencia de entrega. Un trabajador consume solo una versión y usa su propia bandeja. Las identidades se obtienen de servidor; ningún campo enviado por el móvil autoriza una cuenta.

El envelope contiene:

```ts
{
  version: 'v1', kind: 'suggest_chats' | 'chat',
  id, userId, requestId, leaseId, leaseExpiresAt, deadlineAt, contextVersion,
  synthetic: boolean,
  ownerVerified: true,
  authorization: { userId, contextVersion, bindingVersion },
  payload
}
```

IDs, versiones y generaciones son strings opacos no vacíos, de hasta 200 caracteres. `requestId` es UUID. `authorization.userId/contextVersion` deben coincidir con el envelope. El servidor certifica vínculo/OTP y generación de vinculación vigente antes de reservar y vuelve a comprobarlos al aceptar. El trabajador valida consistencia, no sustituye esa comprobación ni consulta permisos por su cuenta. Cuerpo completo: máximo 128.000 caracteres.

### Sugerencias

Payload: `{snapshotId, contextVersion, needs:string[], chats:[{id,name,type}]}`. `contextVersion` debe coincidir con el envelope. Máximo 50 chats por lote, 12 necesidades de hasta 500 caracteres, nombres de hasta 200 y `type: direct|group|unknown`. No aceptar mensajes, participantes, teléfono ni previews en ningún campo del catálogo. Un nombre puede estar vacío.

Resultado: `{kind:'suggest_chats',snapshotId,contextVersion,suggestions:[{chatId,relevance,reason}],engine,model}`. Relevancia: `relevant|uncertain|not_relevant`; razón de hasta 500 caracteres. Una salida por ID, en orden de entrada. IDs extra, repetidos, omitidos o campos de efecto invalidan la respuesta. Sin necesidades, todos quedan `uncertain` con motor `rules`, sin llamar a Codex. Sin catálogo, devuelve lista vacía.

El servidor pagina todo el catálogo, divide en lotes y conserva el snapshot. Un lote no acredita haber procesado el catálogo completo. La recomendación nunca selecciona; cualquier chat puede elegirse manualmente. El servidor vuelve a verificar pertenencia y versión al guardar sugerencias.

### Chat

Mismo payload base de chat v0, con dos campos adicionales en `context`:

```ts
evidence: [{chatId, messageId, text, sentAt, selectionGeneration}],
authorization: {
  userId, contextVersion, selectionVersion,
  selectedChats: [{chatId, generation}]
}
```

`ownerVerified:true` también en payload. La autorización de contexto debe pertenecer al mismo dueño y versión del envelope. Cada evidencia debe corresponder a un grant y generación exactos; no se aceptan duplicados ni campos extra. Máximo 20 evidencias de hasta 4.000 caracteres, 24.000 caracteres en total y 200 grants. Son datos de contexto, no eventos que desencadenen alertas o respuestas. `sentAt` debe incluir zona horaria.

Resultado: deltas de chat v0 (`reply`, `concern`, `plan`, `memoryUpdates`, `forgetKeys`, `clearHistory`) más `contextVersion`, `selectionVersion`, `citations:[{chatId,messageId}]`. Cada cita debe existir en la evidencia de ese trabajo. El servidor debe rechazar resultados si cambiaron vínculo, contexto o permisos, incluso si la reserva aún no venció. Una revocación durante inferencia no puede resolverse mirando solo el snapshot del Mac.

La primera llamada decide memoria y el estado del pendiente únicamente con texto del propietario, memoria validada y turnos anteriores del propietario. Excluye evidencia externa y respuestas anteriores del asistente, que podrían citarla. Si hay evidencia, una segunda llamada redacta la respuesta y las citas; su esquema no permite modificar memoria, borrarla, seleccionar ni enviar. Si falla esta llamada, no se entrega un delta parcial. Los comandos como BORRAR se resuelven sin consultar evidencia. Sin evidencia hay una sola llamada; los comandos no llaman al modelo.

La separación impide que la evidencia recibida cambie directamente los datos que ve el extractor de memoria. La exactitud factual de texto/citas sigue requiriendo evaluación del modelo; una cita válida no prueba por sí sola que la frase sea cierta.

## Activación del trabajador

Desde `agent/`, con configuración privada del operador:

```sh
# AGENT_WORKER_URL: origen HTTPS con las rutas v1.
# AGENT_WORKER_TOKEN: token dedicado; nunca el de la app ni credenciales Codex.
AGENT_WORKER_VERSION=v1 npm run worker
# Solo tras autorización explícita del dueño y servidor listo:
AGENT_WORKER_VERSION=v1 AGENT_WORKER_ALLOW_REAL=true npm run worker
```

Por defecto rechaza `synthetic:false`. El flag real solo existe en v1. Procesa `synthetic:false` conservando ese valor; no lo reetiqueta como demo. El diario también aplica el modo al recuperar un trabajo: desactivar el modo real no entrega trabajos reales pendientes. La configuración del servidor debe respetar por separado los permisos de cada usuario.

ID por defecto: `quito-mac-demo-v1`; bandeja: `agent/.data/worker-v1.json`. No reutilizar la bandeja ni arrancar otra instancia sobre el trabajador v0 activo. La bandeja vincula origen, trabajador y protocolo. Plazo total máximo de 60 segundos para el trabajo, compartido entre ambas llamadas. Guardar resultado antes de entregar; ante pérdida del acuse, reenviar el mismo resultado. Tras interrupción durante inferencia: fallo `inference_interrupted`, sin repetirla automáticamente.

## Verificación y pendientes

```sh
npm run typecheck
node --test src/integration/*.test.ts
# Consume llamadas reales de Codex; cinco casos, todos ficticios:
node scripts/verify-v1.ts
```

Verificado: **85 pruebas aprobadas en el cierre sobre main con el contrato del PR #44**, incluidas 19 nuevas entre contrato e implementación, y TypeScript correcto. La comprobación previa sobre una copia limpia del PR #31 pasó 83 pruebas. La batería local de reglas conserva 2/2 casos confirmados y 22/39 propuestos; no mide la exactitud de Codex. La evaluación v1 con Codex real aprobó cinco casos con siete inferencias sobre datos ficticios (catálogo relevante/irrelevante, nombre ambiguo, inyección en nombre, memoria protegida ante evidencia y corrección del dueño). No acredita un recorrido v1 de red ni calidad general del modelo.

Pruebas nuevas: catálogo sin contenido, IDs/efectos inválidos, límites, identidad, contexto y permisos, memoria A/B, inyección por evidencia y respuesta anterior, corrección/borrado, plazos, instantánea inmutable, modo real explícito, HTTP v1, reinicio y reentrega persistente. Se conserva la batería v0.

Contrato e implementación se entregan en PR separados. El cotejo local entre ambos extremos pasó y el servidor candidato ya acepta reservas v1. Falta verificar el primer turno remoto desde una cuenta vinculada y completar el recorrido de dos usuarios en el servicio compartido. La conexión v0 ya fue comprobada por Amaru en Railway con el Codex de este Mac: tres inferencias reales, corrección de dos a cinco minutos y aislamiento A/B, informados en #24. La prueba de acuse perdido es local; no se atribuye a esa sesión de red. La conexión de reservas v1 a Railway está comprobada; siguen pendientes el turno remoto con modelo, el móvil y un envío controlado de WhatsApp.

## Cotejo publicado y ejecución desde el Mac

El trabajador del commit **2a171bf8d1e7574e9713f263af0d6fd05368520d** se cotejó contra `server/` del commit **7703ab7e9cca26f077654446c48a427185f1ac6e**, extraídos a una copia aislada. HTTP v1, acuse perdido con reinicio sin reinferencia, corrección 2→5 minutos, aislamiento A/B, 51 chats en dos lotes sin leer contenido adicional, revocación antes de aceptar y borrado solo de A pasaron con fixtures. Después, dos llamadas reales a Codex sobre texto/evidencia ficticios produjeron una respuesta y memoria aceptadas por ese mismo servidor local. No hubo proveedor, OTP ni envíos WhatsApp. [Evidencia comunicada a Amaru](https://github.com/cbishara/SolsetsHack/issues/30#issuecomment-6377357142).

Se dejó un proceso independiente ejecutándose desde el Mac, con código fijado a ese commit, identidad `quito-mac-demo-v1` y bandeja privada propia. Lee el token dedicado por el canal privado de Railway; las credenciales de Codex permanecen en el Mac. Requiere que el Mac siga encendido y la sesión Codex permanezca válida. No se configura inicio automático tras reiniciar el Mac.

**Estado al arrancar (2026-10-24 00:14 UTC):** el servidor candidato todavía tenía v1 deshabilitado y respondió 503 a los claims; el trabajador quedó vivo esperando con backoff, sin inferencia pendiente. Se pidió a Amaru activar su extremo tras el cotejo. El arranque no acredita disponibilidad desde la app, prueba v1 en Railway ni funcionamiento real de WhatsApp; esa activación y su verificación deben registrarse aparte.

## Activación del servidor candidato (2026-10-24)

Quito autorizó explícitamente intervenir en el carril de Amaru: «Actívalo tú y avisa a Amaru». Se avisó antes de cambiar **solo `SOL_AGENT_V1_ENABLED=false → true`** en `sol-multiuser-demo`; no se editaron archivos de servidor, pairing, secretos ni el piloto anterior. El despliegue `e8ef721a-aebc-42e0-879d-bb69c4499556` terminó **SUCCESS**.

Comprobado en el servicio compartido: `/api/health` devuelve 200; chat sin sesión y reservas sin token devuelven 401; las reservas autenticadas del propio trabajador `quito-mac-demo-v1` pasaron de 503 a **204**. El proceso del Mac sigue vivo, con el código publicado `2a171bf`. No se hicieron reservas manuales ni se generaron trabajos de otras personas para probar.

Esto verifica habilitación y conexión, no una respuesta de modelo remota v1: las reservas estaban vacías. La prueba local anterior sí completó dos llamadas reales a Codex con datos ficticios. No se enviaron OTP ni mensajes WhatsApp en esta activación. Falta el primer turno ficticio desde una cuenta personalmente vinculada/verificada; no se sembraron identidades verificadas en producción para sustituir ese paso.

Si el acoplamiento falla, la reversión es desactivar únicamente `SOL_AGENT_V1_ENABLED`; no reinferir operaciones inciertas. La activación y estos límites se comunicaron a Amaru en #30.
