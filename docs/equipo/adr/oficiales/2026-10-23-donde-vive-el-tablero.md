# Dónde vive el tablero de funcionalidades y cómo lo actualizan los agentes

Estado: oficial
Fecha: 2026-10-23
Decidió: Quito, confirmado como oficial el 2026-10-23
Carril: quito

## Decisión

El tablero del equipo es el panel de referencia y el lugar central para diseñar, consultar y mantener las funcionalidades de Solsets. Conecta necesidades, reglas, límites, pantallas, flujos, responsables, cambios y evidencia. Se abre con `npm run tablero`, normalmente en http://127.0.0.1:4175.

## Contexto

Quito pidió documentar cada funcionalidad, cambio y flujo en un panel visual pensado para personas. Eligió «Repo + panel visual y Excalidraw» y agregó que sea fácil de acceder.

## Elección e implementación

Fuentes versionadas por carril en `docs/equipo/<persona>/tablero/`, con panel local y Excalidraw generados. `npm run tablero` abre el navegador y reúne las fuentes de esta copia. El acceso también está en el README principal.

Las fichas explican necesidades, acciones, ejemplos, reglas, límites y evidencia. Los flujos incluyen decisiones y preguntas abiertas. El orden guardado en el panel se conserva en `disposicion.json`, separado del contenido y los estados.

Quito pidió además dejar documentado que este es el lugar central del equipo para el diseño de funcionalidades. La ficha de cada capacidad conecta su necesidad, reglas y límites con las pantallas y los flujos que la concretan. Las maquetas, capturas y apps de referencia se consultan desde el mapa de pantallas; los ajustes se registran en «Qué cambió».

Este papel central no cambia quién decide el alcance ni quién mantiene cada carril: las decisiones oficiales siguen en los ADR y una propuesta visual no acredita implementación ni verificación. La apariencia estilo Notion es la del tablero del equipo; no fija la dirección visual de la app de Rodrigo.

Las actualizaciones de otros computadores llegan al compartir e integrar ramas; no hay colaboración en tiempo real entre equipos. El Excalidraw es una vista generada: sus ediciones manuales no se importan a las fichas. Guía: [tablero/README.md](../../quito/tablero/README.md).

Quito confirmó expresamente que este acuerdo es oficial. Las guías del tablero y su protocolo reflejan esta decisión.

## Cambios

- 2026-10-23: elección de Quito y acceso simplificado; panel, generador, plantillas, validación e instrucciones para agentes.
- 2026-10-23: Quito pidió documentarlo como lugar central del diseño de funcionalidades, conectado a pantallas, flujos y cambios. Clasificación oficial/por confirmar pendiente de su respuesta.
- 2026-10-23: Quito respondió «Oficial». El registro pasa de `por-confirmar/` a `oficiales/` y se actualizan las referencias de la guía y el protocolo. Quito pidió avisarle a Bishara que este es el panel de referencia.
