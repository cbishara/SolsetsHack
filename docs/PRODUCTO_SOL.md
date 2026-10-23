# SOL: ayudar a desconectar en el contexto de cada persona

Actualización de enfoque · 23 de octubre de 2026 · Rama `codex/sol-desconexion-whatsapp`.

## Problema

Las personas pueden terminar su jornada y seguir sosteniendo mentalmente tareas, decisiones y asuntos incompletos. Una lista registra el pendiente, pero no necesariamente ayuda a entender qué impide soltarlo. Configurar otro sistema también exige esfuerzo.

Para Rodrigo, salir del turno no resuelve la incertidumbre sobre un registro o un relevo. En otros contextos puede faltar claridad para empezar, sobrar carga o aparecer una distracción. Son situaciones para preguntar y comprobar, no diagnósticos que podamos deducir del tiempo de pantalla.

## Objetivo del producto y entrega concreta

La visión es una app móvil/web que ayude a desconectar según la situación de cada persona y ajuste su ayuda con el tiempo. Su valor se mide en carga operativa evitada y pendientes encaminados con menos esfuerzo.

**La entrega actual es una demo funcional conectable a WhatsApp, con un panel web que comparte el contexto de esas conversaciones.** No es construir toda la app móvil ni obtener todo el contexto de una vida. Se prueba un ciclo pequeño y verificable:

1. La persona cuenta un pendiente ficticio por texto.
2. SOL pregunta qué le impide avanzar: falta de claridad, demasiados pendientes o distracción.
3. Prepara una acción breve y un texto para retomar el asunto.
4. La persona corrige: «MÁS PEQUEÑO» o «CAMBIAR».
5. SOL modifica la propuesta; la preferencia explícita por dos minutos se conserva en el siguiente pendiente.
6. «ME AYUDÓ» registra una respuesta del usuario, sin declarar una mejora de sueño ni una obligación resuelta.

## Estado analizado y decisión

Antes de este experimento había una landing, un panel React, borradores locales por persona ilustrativa y un backend de clasificación de guardias. Las dos memorias estaban separadas. El adaptador Kapso, el webhook firmado y la cola persistida ofrecían la vía más corta para probar continuidad real.

Esta rama reutiliza esa infraestructura y agrega una conversación persistente por remitente. El navegador permite probar el mismo motor sin claves; su sesión es independiente de los teléfonos. El panel puede leer las conversaciones de WhatsApp. La autenticación sigue siendo la del equipo y no representa aislamiento comercial entre cuentas.

El motor nuevo es una conversación guiada con reglas y plantillas, no un agente conversacional general. Se eligió para verificar el ciclo y el transporte sin depender de configurar Hermes. El clasificador Hermes anterior permanece disponible para el laboratorio de guardia y Gmail; no interviene en este nuevo recorrido.

## Contexto mínimo y memoria

Se guardan el pendiente aportado, el obstáculo elegido, la propuesta, la preferencia explícita por pasos pequeños y el feedback. La conversación sobrevive a una recarga y al reinicio del backend mediante el almacenamiento existente. «CAMBIAR» conserva el pendiente e invalida la propuesta anterior. «NUEVO» inicia otro pendiente y conserva la preferencia. «BORRAR» elimina el contenido y las preferencias de esa conversación en SOL, sin borrar mensajes en WhatsApp.

Se conservan como máximo 60 entradas de historial por conversación, 20 respuestas de feedback y los últimos 2.000 identificadores de procesamiento del espacio para evitar duplicados. La protección contra replays se limita a esa ventana. No hay embeddings, monitorización pasiva ni inferencias psicológicas en esta entrega.

## Una demo con evidencia

- Los mensajes entrantes deben tener firma válida y pertenecer a números de prueba permitidos.
- Solo se recibe texto; audios y otros medios se ignoran en esta entrega.
- La respuesta se dirige al mismo remitente; la prueba web nunca puede elegir un teléfono ni generar un envío.
- Pausa impide procesar la cola; al reanudar se retoma. Modo sombra prepara respuestas sin enviarlas y no las envía retroactivamente.
- El envío requiere permiso automático para responder, modo sombra desactivado y timestamp entrante verificable de menos de 23 horas: margen conservador dentro de la ventana de 24 horas.
- Antes del envío se persisten respuesta e identificador. Una falla de red o interrupción puede dejar el resultado incierto: se muestra para revisión en Kapso y no se reintenta automáticamente. No se promete entrega exactamente una vez.
- Una aceptación del proveedor con identificador queda registrada; entrega y lectura no se verifican todavía.
- El sistema guarda un pendiente abierto y una propuesta preparada. El feedback favorable no cierra el pendiente.

## Criterio de éxito

La validación final requiere que un teléfono permitido envíe el ejemplo al número del bot, reciba la respuesta, corrija su preferencia y reciba una segunda propuesta adaptada. El panel debe mostrar el mismo contexto después de recargar. Reenviar el mismo webhook no debe duplicar la respuesta.

Las pruebas automatizadas ejercitan transición, adaptación, borrado, permisos, deduplicación, autenticación, webhook HTTP y SDK Kapso con transporte simulado. **La prueba real queda pendiente del número y las credenciales de Kapso.** Hasta entonces se presenta como flujo funcional local con conexión preparada.

En un piloto posterior mediríamos tiempo hasta la primera ayuda útil, intervenciones necesarias, correcciones, repetición de preguntas y valoración del usuario. Menos tiempo de pantalla por sí solo no demuestra que desconectó mejor.

## Después de demostrar el recorrido

Primero observar usuarios con este ciclo y mejorar las propuestas. Después incorporar razonamiento con contexto estructurado, una integración que quite trabajo, identidad por usuario y una app móvil con capacidades nativas verificadas. Monitorización y bloqueos adaptativos son hipótesis posteriores: dependen de permisos, límites de iOS/Android y aceptación del usuario. Cada intervención debe permanecer dentro de capacidades probadas y reglas aceptadas.

## Referencias de implementación

- [Eventos y payload v2 de Kapso](https://docs.kapso.ai/docs/platform/webhooks/message-events).
- [Firma HMAC e idempotencia de webhooks](https://docs.kapso.ai/docs/platform/webhooks/security).
- `backend/disconnect-flow.mjs`: conversación y preferencias.
- `backend/disconnect.mjs`: persistencia, deduplicación y envío.
- `web/src/DisconnectDemo.jsx`: prueba web y lectura del contexto de WhatsApp.
