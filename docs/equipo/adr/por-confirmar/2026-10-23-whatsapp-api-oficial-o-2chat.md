# Por dónde entra WhatsApp: API oficial de Meta o 2Chat

Estado: por confirmar
Fecha: 2026-10-23
Decidió: la decide Bishara (conexiones)
Carril: bishara

## Contexto

La guardia de Rodrigo llega por grupos de WhatsApp. La demo usa un número nuevo y grupos creados por el equipo con mensajes inventados.

## La pregunta

1. API oficial de Meta. Es la vía oficial, pero no lee grupos.
2. 2Chat (developers.2chat.co). Se conecta por código QR como dispositivo vinculado y tiene el evento `whatsapp.group.message.received` para grupos. Solo ve mensajes que llegan después de conectar el número: no lee historial, así que el onboarding no puede leer el pasado por esta vía. No es la API oficial: hay riesgo de bloqueo del número (según fuentes de terceros, no de 2Chat).

Lo de 2Chat se verificó en su documentación el 2026-10-23, según `.context/decisiones-propuesta.md`.

## Cambios
