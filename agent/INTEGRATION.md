# Puente candidato entre el servidor y el Codex del Mac

**Estado: implementado y probado en el carril de Quito, contrato propuesto en [#24](https://github.com/cbishara/SolsetsHack/issues/24), sin activar en Railway.** Amaru confirmó en #24 que toma el extremo servidor en `amaru/whatsapp-multiuser` y conservará las rutas y garantías de este v0 como base. Falta contrastar los tipos y completar el acoplamiento; el contrato no se marca oficial por esta aceptación de trabajo. No se editó `server/` ni `mobile/`, ni se sustituyó el piloto local que Quito abre desde Expo Go.

La recepción WhatsApp → Unipile → servidor → Postgres pertenece al [PR #23](https://github.com/cbishara/SolsetsHack/pull/23). Su entrega no implementa por sí sola esta cola, el chat real ni las respuestas por WhatsApp. Este puente no envía mensajes a terceros. Las pruebas usan exclusivamente datos sintéticos.

## Qué recibe cada parte

El servidor resuelve usuario y conversación, conserva el historial y la memoria y entrega una reserva de trabajo. El Mac devuelve una clasificación o un cambio propuesto de chat/memoria. El servidor valida reserva, plazo, usuario y versión del contexto antes de aceptarlo. La sesión de Codex permanece en el Mac.

Los tipos concretos están en [`src/integration/contract.ts`](src/integration/contract.ts). Son tipos candidatos en nuestro carril, no una modificación unilateral del contrato compartido. No tienen dependencias de Expo o Unipile.

| Operación propuesta | Cuerpo | Respuesta |
| --- | --- | --- |
| `POST /internal/agent/v0/claim` | `{workerId, requestId: UUID}` | `204` o `200 {job}` |
| `POST /internal/agent/v0/jobs/:id/result` | `{leaseId, result}` | `200 {status:"accepted"}` |
| `POST /internal/agent/v0/jobs/:id/failure` | `{leaseId, code}` | `200 {status:"failed"}` |

Las rutas usan HTTPS y un Bearer exclusivo del trabajador. No reutilizar el acceso móvil ni exponer el token al frontend. `409` en una entrega significa reserva obsoleta o trabajo ya resuelto: descartar el resultado, sin repetir la inferencia. `401/403`, `404` o un contrato incompatible detienen el trabajador explícitamente.

`job` incluye `version:"v0"`, `id`, `kind`, `userId`, `requestId`, `leaseId`, `leaseExpiresAt`, `deadlineAt`, `contextVersion`, `synthetic:true` y `payload`. El `requestId` de la reserva es distinto del UUID de la operación original. El servidor debe persistir ambos y repetir la misma reserva al perderse una respuesta.

El contexto lleva perfil, memoria con clave/valor/tipo/origen y ejemplos de feedback. Se valida antes de inferir; cada trabajo usa un almacén privado en memoria y no escribe el estado compartido. La salida del chat contiene `reply`, `concern`, `plan`, `memoryUpdates`, `forgetKeys` y `clearHistory`. No contiene una sesión completa que pueda sobrescribir cambios recientes del servidor. Este debe volver a validar las citas de memoria contra el texto del propietario y guardar todo atómicamente.

Solo el texto de un propietario con `ownerVerified:true` puede generar un turno de chat con aprendizaje. Los mensajes importados de WhatsApp no deben presentarse como intervenciones del propietario. En clasificación de WhatsApp se exige `origin:"webhook"` y `direction:"incoming"`; `history`, `outgoing` y `unknown` se rechazan antes de llamar al modelo. No se activan alertas por recuperar historial. Todos los trabajos de esta primera integración deben ser sintéticos; el marcador no reemplaza la responsabilidad del servidor de entregar únicamente datos de demo.

## Política del servidor

La clasificación devuelve el criterio del motor antes de aplicar la política, con nombres del servidor: `wake/report/noise`, `isNew`, `messageId`, `incidentKey`, más `engine`, `model`, `fallbackReason` y `kind:"classify"`. Correo se traduce a `gmail` solo dentro del agente. Si falla el motor, la clasificación utiliza las reglas conservadoras; un fallo de chat se devuelve como código fijo y no como una respuesta ficticia.

[`src/integration/server-policy.ts`](src/integration/server-policy.ts) exporta `decideForServer(classification, context, receivedAt)`, reutilizando `src/policy.ts`. No carga Codex, almacenamiento local ni archivos de prompts. El contexto usa la guardia, modo y veredictos recientes del servidor. Conserva el comportamiento v0 actual para noche sin guardia; no resuelve la excepción de caída grave todavía abierta. `wouldWake` expresa lo que haría: el servidor sigue siendo responsable de impedir efectos en modo sombra.

Amaru debe incluir los módulos requeridos del agente en el contexto de construcción de su servicio antes de importarlos. El Dockerfile del PR #23 solo copia `server/`; agregar una importación no basta para distribuir estos archivos. No copiar reglas a mano ni ejecutar dos veces la política.

## Ejecutar el trabajador después del acuerdo

Desde `agent/`, con las variables privadas cargadas por el operador:

```sh
# AGENT_WORKER_URL: origen HTTPS del servidor con las rutas acordadas.
# AGENT_WORKER_TOKEN: Bearer exclusivo, al menos 32 caracteres para el servidor candidato; nunca en Git/Expo.
# AGENT_WORKER_ID: identificador de este trabajador, por defecto quito-mac-demo.
# AGENT_WORKER_STATE: ruta privada opcional; por defecto agent/.data/worker.json.
npm run worker
```

El 2026-10-23 se inició el trabajador v0 del Mac contra el servicio candidato sintético `sol-multiuser-demo` de Railway, con `AGENT_WORKER_ID=quito-mac-demo`. El token se obtuvo privadamente de las variables del servicio; la sesión de Codex permanece en el Mac. El proceso no arranca sin configuración válida. HTTP solo se admite en loopback para pruebas. `CODEX_BIN` y `CODEX_MODEL` son opcionales; el timeout efectivo es el menor entre la reserva pendiente y 60 segundos de chat o 25 de clasificación.

La bandeja privada se escribe en modo `0600`, sin tokens, y tiene un candado de proceso. Se guarda el UUID antes de reservar y el resultado antes de entregarlo. Si se pierde la confirmación, reiniciar vuelve a entregar el mismo resultado sin otra llamada al motor. Un proceso interrumpido durante la inferencia devuelve `inference_interrupted`: el servidor debe conservar la incertidumbre del chat y no reejecutarlo automáticamente. No se promete una única llamada si el servidor crea otra operación distinta. No cambiar servidor o identidad con trabajo pendiente ni ejecutar varias instancias sobre la misma bandeja.

## Verificación y entrega

```sh
npm run typecheck
npm test
npm run eval
# Consume una llamada real de la sesión Codex; receptor HTTP local de prueba:
npm run integration:verify
```

Se añadieron 17 pruebas específicas del puente: aislamiento, corrección/borrado, traducción, política sobre estado vigente, origen y propietario, plazos, autenticación, entrega perdida, reinicio, reserva reutilizada, resultado tardío y corrupción del diario. La prueba real del 2026-10-23 completó **HTTP local → trabajador → Codex → receptor local en 11.1 segundos**, con un primer paso de dos minutos y una preferencia con evidencia literal. El receptor es un fixture de este módulo; no acredita que `server/` ni Railway ya estén conectados.

### Prueba conjunta del 2026-10-23

El extremo servidor de `amaru/whatsapp-multiuser` (`e087f29`) implementó los tipos v0 del trabajador `8f939ee`. Se volvió a ejecutar su verificador de contrato exacto: recuperación de un acuse perdido sin otra inferencia, corrección de memoria, aislamiento A/B y borrado selectivo, con runner de prueba. Esta comprobación local no se cuenta como una llamada real a Codex.

Después se conectó el trabajador del Mac a https://sol-multiuser-demo-production.up.railway.app. Amaru ejecutó los escenarios sintéticos contra Railway y comprobó:

| Caso | Resultado |
| --- | --- |
| A: `two_minute_steps` | Respuesta Codex aceptada en 16,7 s; memoria de dos minutos. |
| A: `correct_routine` | Codex aceptado en 12,4 s; misma conversación y memoria corregida a cinco minutos. |
| B: `two_minute_steps` | Codex aceptado en 21,3 s; conversación distinta, B conserva dos minutos y A cinco. |
| Mismo `requestId` | Mismo trabajo recuperado sin una segunda inferencia. |
| Redespliegue del servidor a `67ec1c7` | Sesiones y memoria conservadas. |
| `new_concern` | Comando determinista, excluido del recuento de inferencias. |

Son **tres inferencias reales**, con datos sintéticos y sin enviar OTP ni mensajes WhatsApp. La pérdida de acuse se verificó en la prueba local, no se atribuye al ensayo de red. [Evidencia conjunta en #24](https://github.com/cbishara/SolsetsHack/issues/24#issuecomment-6377022311).

Pendiente con Amaru/Bishara: conectar Expo al backend compartido, probar dispositivo físico y fallos con el Mac desconectado. La vinculación app–WhatsApp, las sugerencias por catálogo v1 y los canales de alerta requieren sus propias pruebas. El puente v0 sigue limitado a escenarios sintéticos y no acredita que el chat real ni WhatsApp estén integrados.

La ampliación de WhatsApp multiusuario está solicitada en #30. Este v0 solo acepta `chat` y `classify`: las sugerencias de catálogo por nombres/tipos requieren acordar otro tipo/versionado y no habilitan lectura ni monitoreo por sí mismas.
