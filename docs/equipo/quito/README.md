# Quito · agente, inteligencia y pruebas

Funcionalidad: que el agente decida bien, y poder demostrarlo. Incluye el onboarding del agente (cada check o X de Rodrigo se vuelve una regla), el feedback de un toque que se vuelve ejemplo y después regla, lo que el agente puede hacer, el cerebro del chat y las métricas de acierto.

Archivos del carril: `agent/` y sus pruebas. Se parte de cero; `classifier/` y `backend/agent.mjs` del prototipo quedan como referencia.

Listo cuando (propuesta): cada mensaje de la semana simulada tiene su decisión esperada, `npm test` la corre entera, y sale un número de aciertos que se puede mostrar en el pitch.

## Pregunta abierta

El prototipo clasificaba a través de Hermes, un servicio aparte en Railway que, según `deploy/hermes/README.md`, todavía necesitaba que le configuraran un modelo. Para lo oficial, la alternativa es llamar a Claude directo con la API de Anthropic. Conviene decidirlo temprano, porque cambia qué hay que desplegar.

## En esta carpeta

1. `research/sueno/`: tres investigaciones sobre el sueño de Rodrigo (guardia, turnos rotativos, cabeza y teléfono), con sus fuentes.
2. `research/wellness/`: benchmark de soluciones de bienestar y sueño, mapa en Excalidraw y tablero.
3. `diseno/`: dos propuestas de dirección visual para el panel.
