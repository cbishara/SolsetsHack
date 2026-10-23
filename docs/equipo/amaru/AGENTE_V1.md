# Chat y sugerencias: servidor v1

Contrato coordinado con Quito en #30. El v0 permanece intacto para escenarios sintéticos. El servidor v1 se implementa en `server/src/multiuser/live-agent.ts`, separado del estado del piloto y del chat de prueba. La activación requiere `SOL_AGENT_V1_ENABLED=true`; el trabajador de Quito exige además `AGENT_WORKER_ALLOW_REAL=true` para datos autorizados. No activar sin cotejar el commit publicado del trabajador.

## API para la app y web

La autenticación es la de [LOGIN_COMPARTIDO.md](LOGIN_COMPARTIDO.md). Chat y sugerencias requieren cuenta personal vinculada y verificada. La identidad no llega en el JSON del cliente.

| Ruta | Entrada / resultado |
| --- | --- |
| POST `/api/v1/chat` | `{requestId:UUID,text}` →202 trabajo. Hasta 2000 caracteres. Repetir UUID y contenido recupera el trabajo; reutilizarlo para otra entrada devuelve409. |
| GET `/api/v1/chat` | Conversación, mensajes, memoria, preocupación, propuesta, operaciones y disponibilidad real del trabajador. Incluye el texto de turnos pendientes; consultar no infiere ni envía mensajes. |
| POST `/api/v1/whatsapp/recommendations` | `{requestId:UUID,snapshotId,needs:string[]}` →202 trabajos. Hasta12 necesidades; snapshot completo obtenido tras paginar catálogo. |
| GET `/api/v1/whatsapp/recommendations` | Recomendaciones persistidas, snapshot y operaciones. Una sugerencia nunca selecciona un chat. |

La app conserva el UUID durante reintentos y consulta GET mientras una operación está pendiente; pausa el polling en background. `agent_not_connected` es503; una conversación ocupada devuelve409 para evitar resultados simultáneos sobre una memoria vieja. Un resultado incierto requiere decisión explícita, no reintento automático de inferencia.

El catálogo permite elegir manualmente cualquier chat disponible, aunque no sea recomendado. Recomendaciones procesan hasta1000 chats en lotes de50; si se excede ese límite se devuelve error explícito, nunca una lista parcial presentada como completa. Contexto acotado de chats elegidos: hasta20 evidencias, hasta10 por chat y2000 caracteres por evidencia. Estos límites no equivalen a leer todo el historial del teléfono.

## Transporte del trabajador

Rutas `/internal/agent/v1/claim`, `/jobs/:id/result`, `/jobs/:id/failure`; bearer exclusivo del trabajador. Envelope v1 con `ownerVerified:true`, `synthetic:false` para datos del recorrido autorizado y `authorization:{userId,contextVersion,bindingVersion}`. Versiones y generaciones viajan como strings opacos. V0 nunca recibe trabajos de este recorrido.

Chat separa turnos del dueño, memoria validada y `context.evidence` de terceros. `context.authorization` contiene usuario, versión de contexto, versión de selección y chats/generaciones autorizados. El servidor verifica identidad y permisos antes de reservar y aplicar, y comprueba que citas y evidencia de cambios de memoria correspondan a la entrada permitida. Quito separa la decisión de memoria de la respuesta que consulta evidencia externa.

Reservas, resultados y fallos tienen recibos idempotentes. Una reserva vencida o inferencia interrumpida no se vuelve a ejecutar automáticamente. Un resultado tardío no sobrescribe memoria nueva ni restaura permisos revocados.

## Mensajes del bot

Solo DMs de un propietario canónico verificado, en el chat creado al verificar el vínculo. Se guarda inbox e índice pendiente en la misma transacción. El proceso drena ese índice tras reinicio y cuando deja de estar ocupada la conversación; no pierde un turno porque el webhook ya estaba deduplicado.

Una respuesta a un mensaje iniciado en la app queda en la conversación. Una respuesta a un DM queda también en una bandeja de salida persistente. El adaptador comprueba cuenta/chat individual con Unipile y vuelve a comprobar permiso después de esa consulta, inmediatamente antes de enviar. Grupos no reciben respuestas. Una entrega incierta no se reenvía a ciegas. Los mensajes previos a activar v1 no se reencolan al activarlo.

Plazo de respuesta:180 segundos. Si ya venció, el inbox o envío pendiente se cancela, evitando contestar horas después al reiniciar el Mac. `borrar` limpia el historial visible y cancela respuestas antiguas pendientes; no se presenta como borrado físico completo de todos los registros de auditoría/proveedor.

## Evidencia y pendiente

119 pruebas server y TypeScript pasan; 18 son de la cola v1. Las pruebas de cola y proveedor cubren aislamiento A/B, permisos revocados, deduplicación, acuse perdido, memoria del dueño, sugerencias sin selección, inbox ocupado/reinicio, borrado, mensajes pendientes visibles y revocación durante la consulta previa al envío. El cotejo con el commit exacto de Quito y la prueba real v1 se registran al completarse; no se sustituyen por fixtures.

El flujo de emparejamiento en el mismo iPhone está preparado con `SOL_WHATSAPP_PAIRING_ENABLED`, apagado por defecto. La [guía Unipile](https://developer.unipile.com/docs/whatsapp) permite `pairing_phone_number`, pero el [esquema publicado](https://developer.unipile.com/reference/accountscontroller_createaccount) solo especifica `Checkpoint/QRCODE/qrcode`. Se rechaza cualquier variante desconocida, devolviendo `unsupported_checkpoint` y alternativa `hosted_auth`; falta validar el checkpoint real con una cuenta personal. QR/Hosted Auth y OTP de SOL siguen siendo el flujo disponible.


Despliegue candidato verificado: commit `844117c`, servicio `sol-multiuser-demo`, deployment `e8d03ec5-85a5-498d-9178-5cb160ecd52e`. Salud200, piloto anterior salud200, memoria A/B conservada; v1 devuelve `agent_v1_not_enabled`, chat real `agent_not_connected` y pairing `pairing_not_enabled`. Gates apagados, sin llamadas nuevas al proveedor. El commit final del trabajador de Quito sigue pendiente de publicación; no se acredita interoperabilidad v1 todavía.
