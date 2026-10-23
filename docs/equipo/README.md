# Cómo nos repartimos

Cada uno tiene una funcionalidad completa y es dueño de los archivos de esa funcionalidad. Nadie edita archivos de otro carril sin avisar. Así dos personas nunca tocan el mismo archivo a la vez. En el prototipo, `web/src/main.jsx` tenía el panel entero en un solo archivo, y si dos lo editaban el merge se rompía.

1. [Quito](./quito/): que el agente decida bien, y poder demostrarlo.
2. [Amaru](./amaru/): que el mensaje llegue y la alerta salga.
3. [Cristóbal Bishara](./bishara/): que Rodrigo entienda qué hizo el agente y confíe en él.

Bishara y Amaru intercambiaron estos carriles el 2026-10-23 ([ADR](./adr/oficiales/2026-10-23-trueque-bishara-amaru.md)).

Lo decidido (producto, stack de la app y funcionalidades con su dueño) está en [adr/oficiales](./adr/oficiales/), una decisión por archivo. Las ideas y preguntas abiertas, en [adr/por-confirmar](./adr/por-confirmar/). Cómo entra una decisión nueva, en [adr/README.md](./adr/README.md).

## Lo que nos une

El [tablero humano de funcionalidades y flujos](./quito/tablero/README.md) es el panel de referencia y el lugar central para diseñar y consultar las funcionalidades, según el [ADR oficial](./adr/oficiales/2026-10-23-donde-vive-el-tablero.md). Se abre con `npm run tablero`. Cada agente mantiene las fichas y cambios de su carril; las vistas visuales se generan juntas. El orden de las tarjetas se guarda desde el panel.

El JSON que devuelve el agente y las respuestas de la API que usa la app. Se definen entre los tres antes de construir. Quien necesite cambiarlos avisa a los otros dos antes.

## Reglas de trabajo

Están en `CLAUDE.md`, sección "Cómo trabajamos los tres": qué archivos son de quién, dónde trabajar y cómo mantener las ramas cerca de `main`. `AGENTS.md` apunta al mismo archivo para que Codex también las lea.

Al terminar y verificar cada funcionalidad, su responsable cierra el trabajo con commit, push, PR y merge a `main`, con pruebas y build en verde. Los agentes deben proponerle siempre ese cierre a Quito y ejecutarlo cuando esté autorizado. [Acuerdo oficial de cierre](./adr/oficiales/2026-10-23-cierre-funcionalidades-con-merge.md).
