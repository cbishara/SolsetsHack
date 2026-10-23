# SolsetsHack: caso Rodrigo (Hackatón Señales, Makana)

Hackatón presencial, 23 y 24 de octubre de 2026. Equipo: Amaru Paillan (diseño, chatbot, dashboard), Cristóbal Gonzalez "Quito" (backend, integraciones, lidera lo técnico), Cristóbal Bishara (Python).
Entrega el sábado 24: solución funcionando + este repo con README de una página (problema, elección, qué se excluyó) + pitch de 5 min. Confirmar hora (13:00 o 15:00); se planifica para las 13:00.

## Reglas que no se rompen
- Solo datos sintéticos. Nada de mensajes, correos ni tickets reales de nadie.
- Todo el código se escribe en el evento. Nada de código, prompts o configuraciones hechos antes (tampoco la carpeta `research/`).

## Objetivo de esta rama: desconexión por WhatsApp

Rama `codex/sol-desconexion-whatsapp`. La visión es una app móvil/web que ayude a desconectar según el contexto de cada persona. La entrega concreta es una demo funcional conectable a WhatsApp: pendiente ficticio → obstáculo confirmado → propuesta pequeña → corrección → adaptación conservada. No construir la app nativa completa ni monitorización o bloqueos del teléfono.

- `/desconectar`: prueba web del mismo motor y vista del contexto de cada remitente permitido de WhatsApp. La sesión web es compartida por el equipo y no envía mensajes.
- Motor guiado y determinista en `backend/disconnect-flow.mjs`; persistencia y transporte en `backend/disconnect.mjs`. No presentarlo como comprensión general por IA.
- Reutilizar webhook Kapso firmado, lista de remitentes, cola persistida y almacenamiento existente. Responder al mismo remitente, nunca al número fijo de Rodrigo.
- Modo sombra no envía. Pausa conserva la cola. Solo enviar con `reply=auto` y timestamp original verificable dentro de la ventana conservadora de 23 h. Resultados ambiguos no se reintentan automáticamente.
- Memoria explícita: pendiente, obstáculo y preferencia por pasos de dos minutos. `BORRAR` elimina contenido y derivados; se conservan identificadores de deduplicación.
- La conexión real sigue pendiente del número de Kapso. Las pruebas locales del SDK usan transporte simulado. Aceptación del proveedor no significa entrega.
- `/app` y `/demo` conservan el prototipo anterior para comparar. Gmail y escenarios de guardia conservan su clasificador y políticas; los mensajes entrantes de WhatsApp ahora usan el flujo de desconexión.
- No declarar obligaciones resueltas, relevo confirmado ni mejoras de sueño a partir de un borrador o feedback favorable.

Leer `docs/PRODUCTO_SOL.md`, `docs/DEMO.md` y `SETUP.md` para el alcance vigente.

## Documentos de contexto (leer solo la sección que haga falta)
- Plan de construcción, alcance, datos, mensajes, escenario de prueba y horario: `/Users/bisos/Desktop/experimental/hackathon-sueno/PLAN-HACKATON.md`
- El porqué de cada decisión y las preguntas del jurado: `/Users/bisos/Desktop/experimental/hackathon-sueno/PROPUESTA-EQUIPO.md`

## Convenciones
- Comunicación en español; código e identificadores en inglés.
- Commits chicos y frecuentes; no hacer push ni commits sin que el usuario lo pida.
