# El prompt del agente vive en `agent/` y lo edita Quito; el tono lo define Amaru

Estado: oficial
Fecha: 2026-10-23
Decidió: Quito, el 2026-10-23. Toca los carriles de Bishara y Amaru: hay que avisarles.
Carril: quito

## Contexto

Dos documentos decían cosas distintas.

1. `CLAUDE.md`, sección "Cómo trabajamos los tres": `agent/` es de Quito e incluye la clasificación y el cerebro del chat.
2. `docs/equipo/amaru/README.md` decía: "El tono de lo que el agente le escribe a Rodrigo lo define Amaru; el archivo del prompt lo edita Bishara."

## Decisión

El archivo del prompt vive en `agent/` y lo edita Quito. Amaru define el tono de lo que el agente le escribe a Rodrigo. Bishara no edita el prompt.

## Por qué

Así coincide con `CLAUDE.md`, donde la clasificación y el cerebro del chat son del carril de Quito.

## Lo que cuesta

Cuando Amaru quiera cambiar el tono, se lo pide a Quito en vez de editarlo directo.

## Cambios

2026-10-23: se corrigió `docs/equipo/amaru/README.md` para que diga lo mismo.
