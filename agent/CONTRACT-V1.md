# Contrato v1 del agente: catálogo y evidencia elegida

Acordado con Amaru en [#30](https://github.com/cbishara/SolsetsHack/issues/30). Esta entrega define tipos, límites y validación; el procesador y el trabajador se publican en un PR aparte. No habilita rutas ni operaciones de servidor.

Quito autorizó oficialmente metadatos reales y contenido solo tras selección explícita: [decisión](../docs/equipo/adr/oficiales/2026-10-23-contexto-whatsapp-autorizado.md). Pruebas y evaluaciones continúan sintéticas. v0 conserva su contrato y restricción sintética.

Tipos ejecutables: [contract-v1.ts](src/integration/contract-v1.ts). Validación independiente: [contract-v1.test.ts](src/integration/contract-v1.test.ts).

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

## Verificación del contrato

`npm run typecheck` y `npm test` desde agent/. La validación conserva el rechazo de trabajos v1/reales en v0, exige un opt-in explícito para datos reales en v1, comprueba identidad y versiones y rechaza contenido adicional en el catálogo. El servidor conserva la autoridad sobre permisos y debe revalidarlos al aplicar un resultado.
