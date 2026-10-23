# Dónde vive el tablero de funcionalidades y cómo lo actualizan los agentes

Estado: por confirmar
Fecha: 2026-10-23
Decidió: Quito eligió la ubicación; falta clasificar formalmente el acuerdo
Carril: quito

## Contexto

Quito pidió documentar cada funcionalidad, cambio y flujo en un panel visual pensado para personas. Eligió «Repo + panel visual y Excalidraw» y agregó que sea fácil de acceder.

## Elección e implementación

Fuentes versionadas por carril en `docs/equipo/<persona>/tablero/`, con panel local y Excalidraw generados. `npm run tablero` abre el navegador y reúne las fuentes de esta copia. El acceso también está en el README principal.

Las fichas explican necesidades, acciones, ejemplos, reglas, límites y evidencia. Los flujos incluyen decisiones y preguntas abiertas. El orden guardado en el panel se conserva en `disposicion.json`, separado del contenido y los estados.

Las actualizaciones de otros computadores llegan al compartir e integrar ramas; no hay colaboración en tiempo real entre equipos. El Excalidraw es una vista generada: sus ediciones manuales no se importan a las fichas. Guía: [tablero/README.md](../../quito/tablero/README.md).

Se mantiene en `por-confirmar/` hasta que Quito indique si la rutina queda oficial para el equipo, según la regla ADR de `CLAUDE.md`. Esto no deja pendiente la elección de ubicación ni la implementación solicitada.

## Cambios

- 2026-10-23: elección de Quito y acceso simplificado; panel, generador, plantillas, validación e instrucciones para agentes.
