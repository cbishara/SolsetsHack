# Quito · agente, inteligencia y pruebas

Funcionalidad: que el agente decida bien, y poder demostrarlo. Incluye el onboarding del agente (cada check o X de Rodrigo se vuelve una regla), el feedback de un toque que se vuelve ejemplo y después regla, lo que el agente puede hacer, el cerebro del chat y las métricas de acierto.

Archivos del carril: `agent/` y sus pruebas. Se parte de cero; `classifier/` y `backend/agent.mjs` del prototipo quedan como referencia.

Listo cuando (propuesta): cada mensaje de la semana simulada tiene su decisión esperada, `npm test` la corre entera, y sale un número de aciertos que se puede mostrar en el pitch.

## Motor del agente

Decidido el 2026-10-23: agente propio en `agent/`, sin Hermes. El motor es el Codex CLI con la sesión del plan de Quito (`codex exec --output-schema` o `@openai/codex-sdk`), detrás de un adaptador que después se cambia a API key. Detalle y pruebas en [`adr/oficiales/2026-10-23-agente-propio-con-codex.md`](../adr/oficiales/2026-10-23-agente-propio-con-codex.md).

## En esta carpeta

El [tablero del equipo](./tablero/README.md#lugar-central-del-diseño-de-funcionalidades) es el lugar central para diseñar y consultar las funcionalidades de Solsets: necesidades, reglas, pantallas, flujos y cambios. Se abre con `npm run tablero` (normalmente en http://127.0.0.1:4175). Reúne las fichas de los tres carriles y genera el mapa Excalidraw; los acuerdos oficiales siguen en los ADR y los estados de construcción y verificación se muestran por separado.

1. `research/sueno/`: tres investigaciones sobre el sueño de Rodrigo (guardia, turnos rotativos, cabeza y teléfono), con sus fuentes.
2. `research/wellness/`: benchmark de soluciones de bienestar y sueño, mapa en Excalidraw y tablero.
3. `diseno/`: dos propuestas de dirección visual para el panel.
