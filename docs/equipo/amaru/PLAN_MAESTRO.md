# SOL: plan de integración de la demo

Actualizado: 2026-10-23. Ejecución solicitada por Amaru. Coordinación: [#24](https://github.com/cbishara/SolsetsHack/issues/24), [#30](https://github.com/cbishara/SolsetsHack/issues/30), [#21](https://github.com/cbishara/SolsetsHack/issues/21), [#37](https://github.com/cbishara/SolsetsHack/issues/37). Rama de backend: `amaru/whatsapp-multiuser`, PR #36.

## Objetivo comprobable

Una persona conecta WhatsApp, elige qué chats puede usar SOL y recibe una propuesta pequeña que le ayuda a desconectar. Puede corregir lo que SOL recuerda y retomar desde iPhone, web o un mensaje al bot. Dos personas usan el mismo bot con identidades, permisos y memoria separados.

La primera entrega es texto. Voz y monitoreo/bloqueo de apps siguen después de comprobar este recorrido. La cuenta ya conectada, con marca SOL, es el bot definitivo confirmado por Amaru; cada persona conecta otra cuenta personal. Los identificadores y secretos se mantienen en configuración privada.

## Reparto y orden

| Prioridad | Dueño | Entrega y condición de cierre | Estado |
| --- | --- | --- | --- |
| P0 | Amaru | Servidor candidato separado, base persistente, token exclusivo y rutas v0 exactas de Quito. | Desplegado cba8980; salud y límites HTTP comprobados. |
| P0 | Quito + Amaru, #24 | Trabajador del Mac con la sesión Codex de Quito → Railway → resultado persistido; corregir memoria y repetir entrega sin nueva inferencia. | Interoperabilidad con runner sintético comprobada; ejecución conjunta real pendiente. |
| P0 | Quito, #30 | Confirmar e implementar contrato v1 `suggest_chats` y `chat` con evidencia autorizada; pruebas y commit del trabajador. | Solicitado. No enviar contenido real a v0. |
| P1 paralelo | Amaru, #37 | Login WhatsApp reutiliza usuario verificado en web/iPhone; OTP por propósito, sesiones y revocación. | Backend implementado y probado; integración cliente pendiente. |
| P1 paralelo | Bishara, #21 | Cliente móvil/web: acceso, conexión, selección, chat, memoria y estados. Export web servido desde el mismo origen de API. | Solicitud enviada; integración pendiente. |
| P1 | Amaru | Emparejamiento en el mismo teléfono, QR web, OTP SOL y activación de recepción, sin confiar en el teléfono escrito para autorizar. | QR/OTP implementados; emparejamiento móvil pendiente. |
| P1 | Amaru + Quito | Encolar chat real y sugerencias v1, persistir memoria y validar permisos al reservar y aplicar. Outbox durable antes de responder por WhatsApp. | Espera contrato v1. |
| P2 | Los tres | Recorrido físico iPhone + web + dos cuentas; publicar evidencia, resolver dependencias de PR y entregar a main. | Pendiente de lo anterior. |
| Después | Bishara + Amaru + Quito | Voz (#28/#29), recuperación ante pérdida/cambio de número, borrado/retención, monitoreo nativo y bloqueo de apps. | Fuera de la primera prueba textual. |

## Contratos y reglas de la demo

- Identidad determinada por servidor y cuenta canónica verificada. El teléfono escrito sirve para localizar una cuenta, nunca para conceder propiedad ni enviar a un destinatario arbitrario.
- Catálogo inicial: solo nombre/tipo. Recomendaciones no conceden permisos. Todo chat disponible se puede elegir manualmente; historial solo tras elegirlo.
- Grupos aportan evidencia no confiable, separada de las instrucciones y preferencias del propietario. No cambian por sí solos su memoria ni reciben respuestas automáticas.
- App y bot comparten conversación y memoria. Responder en el canal que inició el turno; consultar desde el otro recupera lo guardado sin duplicar envíos.
- Desmarcar/desconectar invalida trabajo pendiente. Comprobar permiso al reservar, aplicar resultado y enviar.
- OTP de emparejamiento de WhatsApp, OTP de vinculación SOL y OTP de login SOL son pasos distintos. Un código no se reutiliza entre propósitos ni identidades.
- Credenciales Codex permanecen en el Mac de Quito. El trabajador usa un token propio contra el servidor. Un trabajador ausente o resultado incierto se muestra como tal.
- v0 acepta escenarios sintéticos fijos. Nunca marcar datos reales como `synthetic: true`. La compatibilidad sintética no prueba el modelo real.

## Publicación y reversibilidad

Conservar `sol-whatsapp-demo` como piloto. Candidato `sol-multiuser-demo`, almacenamiento `sol_identity`, sin abrir el esquema `server` del piloto ni sus rutas globales. La configuración usa flags y secretos independientes. No copiar `.env`, credenciales ni datos al paquete de despliegue.

Integrar bases verificadas #15/#23 antes de #36; Quito resuelve #31 en su carril, Bishara #32 en el suyo. El conflicto actual con main del tablero se resolvió regenerando sus archivos. No presentar el backend como integrado con móvil/modelo mientras falte la prueba conjunta.

## Prueba de aceptación

1. Una preferencia introducida en la app y corregida en WhatsApp reaparece corregida al abrir web/iPhone; mismo `userId`.
2. A/B no cruzan sesiones, OTP, resultados, chats, memoria ni destinos manipulando IDs. OTP caducados o repetidos fallan.
3. Catálogo no lee mensajes; elegir un chat no sugerido funciona. Revocar durante una descarga o inferencia impide aplicar evidencia vieja.
4. Duplicados, acuse perdido, reinicio, Mac desconectado y resultado tardío no producen doble inferencia/envío ni sobrescriben memoria nueva.
5. Proveedor/modelo reales verificados por separado de fixtures; frontend muestra estados reales. Ninguna respuesta simulada se presenta como integración.
6. La persona plantea un bloqueo, recibe un paso útil, ve/corrige lo recordado y puede continuar desde otro canal.

## Siguiente acción por persona

- **Quito:** tomar #30, confirmar tipos v1 y arrancar el trabajador de #24 con origen HTTPS y token desde las variables privadas del candidato.
- **Bishara:** confirmar contrato de #7/#37, preparar adaptadores y export web, integrar tras la evidencia del backend.
- **Amaru/agente:** terminar acceso compartido y despliegue; publicar contrato exacto, pruebas y bloqueos verificables.
- **Amaru/usuario:** cuando llegue el cliente integrado, hacer la prueba con iPhone y una cuenta personal distinta de la cuenta BOT. No hace falta compartir claves en el chat.
