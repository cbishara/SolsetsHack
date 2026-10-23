# Cristóbal Bishara · app, diseño UX/UI y chat

Funcionalidad: que Rodrigo entienda qué hizo el agente y confíe en él.

Archivos del carril: `mobile/` (la app Expo, en TypeScript). Se parte de cero; `web/` es el prototipo de Amaru y queda como referencia. El prompt del agente vive en `agent/` y lo edita Quito (`adr/oficiales/2026-10-23-quien-edita-el-prompt.md`). Ese ADR le da el tono a Amaru; si el tono pasa a Bishara con la app, hay que confirmarlo con Quito y Amaru.

Tomó este carril el 2026-10-23, en el trueque con Amaru (`adr/oficiales/2026-10-23-trueque-bishara-amaru.md`). Antes llevaba `server/`; esa base quedó en el PR #15 y pasó a Amaru.

Listo cuando (propuesta): alguien mira la app 10 segundos y entiende qué habría hecho el agente anoche en modo sombra, y puede marcar "Bien", "Debió despertarme" o "No debió despertarme" con un toque.

## Pantallas del carril (de `adr/oficiales/2026-10-23-cinco-funcionalidades.md`)

1. Contrato de la noche: "Te toca guardia esta noche?", sí o no, y qué lo va a despertar.
2. La alerta con el botón "Lo vi".
3. Métricas y graduación del modo sombra.
4. El chat con el agente, donde se hace la descarga de pendientes.

La API que usa la app es la de `server/` (Amaru). El borrador del contrato está en el issue #7.
