# Todos parten de cero y el prototipo queda solo como referencia

Estado: oficial
Fecha: 2026-10-23
Decidió: Quito
Carril: los tres

## Contexto

Antes de esta decisión ya había código en el repo: `web/`, `backend/`, `classifier/`, `supabase/` y `deploy/`. Describe otro producto, un panel web con un asistente.

## Decisión

Lo oficial se construye desde cero, en carpetas nuevas. El prototipo se lee como referencia y no se edita. Lo mismo vale para `README.md`, `SETUP.md` y los documentos de Amaru (`DEMO.md`, `PRODUCTO_SOL.md`), que describen el prototipo y no la app.

El `README.md` de la entrega se reescribe al final: una página con el problema, la elección y lo que se excluyó.

## Por qué

No quedó escrito. Lo que sí consta: el producto cambió a una app de celular (ver `2026-10-23-app-de-celular-para-la-guardia.md`) y el prototipo es un panel web.

## Lo que cuesta

Se pierde lo ya construido como base. Sirven de guía la política de `classifier/policy.mjs` y el flujo de `backend/processor.mjs`.

## Cambios
