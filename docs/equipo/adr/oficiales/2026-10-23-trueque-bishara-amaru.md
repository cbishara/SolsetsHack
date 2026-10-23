# Bishara y Amaru intercambian carriles: Bishara toma la app y Amaru el backend

Estado: oficial
Fecha: 2026-10-23
Decidió: Bishara y Amaru (los dos dueños de los carriles que cambian)
Carril: bishara, amaru

## Contexto

El reparto del PR #5 dejaba a Bishara con `server/` (backend, integraciones y deploy) y a Amaru con `mobile/` (la app Expo). Bishara quiere dedicarse al diseño UX/UI y Amaru a la integración con WhatsApp.

## Decisión

1. **Bishara:** `mobile/`, la app Expo. Incluye el diseño UX/UI, las pantallas y el chat dentro de la app. Funcionalidad: que Rodrigo entienda qué hizo el agente y confíe en él.
2. **Amaru:** `server/` y el deploy. Incluye la API, la base, las conexiones (WhatsApp, correo, calendario de turnos), el push, la llamada de respaldo y Railway. Funcionalidad: que el mensaje llegue y la alerta salga.
3. Quito no cambia: `agent/` y sus pruebas.
4. Cada carpeta de `docs/equipo/<persona>/` sigue siendo de su persona. Los documentos del prototipo de Amaru (`DEMO.md`, `PRODUCTO_SOL.md`) se quedan en `docs/equipo/amaru/`.
5. Lo ya hecho cambia de dueño con su carril: la base de `server/` (PR #15, rama `bishara/server-base`) pasa a Amaru. Las tareas abiertas de `server/` (#7, #9) pasan a Amaru.
6. El guion de la demo y el pitch quedan como pregunta abierta en `por-confirmar/2026-10-23-quien-lleva-el-pitch.md`.

Este archivo cambia los dueños nombrados en los ADR anteriores. Donde otro documento diga "Bishara" para `server/` o "Amaru" para `mobile/`, manda este.

## Por qué

Cada uno prefiere trabajar en el área del otro.

## Lo que cuesta

El cambio ocurre con trabajo ya empezado. Amaru recibe `server/` a medio hacer (lo pendiente está en `server/README.md`). Bishara parte `mobile/` desde cero, con el borrador de contrato del issue #7 como guía.

## Cambios
