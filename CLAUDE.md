# SolsetsHack: caso Rodrigo (Hackatón Señales, Makana)

Hackatón presencial, 23 y 24 de octubre de 2026. Equipo: Amaru Paillan (backend e integraciones), Cristóbal Gonzalez "Quito" (agente, inteligencia y pruebas; lidera lo técnico), Cristóbal Bishara (app, diseño UX/UI y chat). Quién lleva el guion de la demo y el pitch está por confirmar.
Entrega el sábado 24: solución funcionando + este repo con README de una página (problema, elección, qué se excluyó) + pitch de 5 min. Confirmar hora (13:00 o 15:00); se planifica para las 13:00.

## Reglas que no se rompen
- Solo datos sintéticos. Nada de mensajes, correos ni tickets reales de nadie.
- Todo el código se escribe en el evento. Nada de código, prompts o configuraciones hechos antes (tampoco la carpeta `research/`).

> Decidido por Quito el 2026-10-23: el producto es una app de celular hecha con Expo (React Native) en TypeScript. Todo el código que hay hoy en el repo (`web/`, `backend/`, `classifier/`, `supabase/`, `deploy/`) es el prototipo y queda solo como referencia: lo oficial se construye desde cero. Funcionalidades y dueños en `docs/equipo/adr/oficiales/`. Si este archivo y un ADR oficial chocan, manda el ADR.

## La solución en una frase
Nombre: la app se llama **Soltra** (desde el 2026-10-24) y **Sol** es su agente. Escribir "Soltra", nunca "SOL" en mayúsculas. Los identificadores técnicos con `sol` no se renombran.

Una app de celular que hace la guardia de noche por Rodrigo (soporte TI, turnos rotativos, guardia por WhatsApp). Antes de dormir le pregunta si esa noche le toca guardia. Si le toca, revisa lo que entra y lo despierta solo si algo es urgente o nuevo: push en la app y, si no lo ve en 3 minutos, una llamada. El resto queda para el parte de la mañana. Las primeras semanas trabaja en modo sombra (no silencia nada, solo muestra qué habría hecho) hasta que Rodrigo confía. Ante la duda, despierta.

## Núcleo técnico
- Clasificación con un agente propio en `agent/` (sin Hermes), con la cuenta de Codex de Quito como motor para la demo, detrás de un adaptador que después se cambia a API key: DESPERTAR / PARTE / RUIDO + motivo de una línea + `es_nuevo` + `confianza`. Memoria por usuario en la base, escrita solo desde el feedback y el chat del usuario. Ver `docs/equipo/adr/oficiales/2026-10-23-agente-propio-con-codex.md`.
- La política va en código, no en el prompt: `es_nuevo` o `confianza < 0.7` → DESPERTAR; duplicado de un incidente ya despertado en 30 min → no re-despertar; modo sombra nunca silencia.
- Feedback de un toque ("Bien" / "Debió despertarme" / "No debió despertarme") que se guarda y se usa como ejemplo en la siguiente clasificación; puede convertirse en regla.
- Fuentes: WhatsApp de un número de demo + semana simulada. Por decidir: si WhatsApp entra por la API oficial (no lee grupos) o por 2Chat (lee grupos, no es oficial). Por decidir: si hay consola de respaldo dentro de la app. Las preguntas abiertas están en `docs/equipo/adr/por-confirmar/`.

## Documentos de contexto (leer solo la sección que haga falta)
- Plan de construcción, alcance, datos, mensajes, escenario de prueba y horario: `/Users/bisos/Desktop/experimental/hackathon-sueno/PLAN-HACKATON.md`
- El porqué de cada decisión y las preguntas del jurado: `/Users/bisos/Desktop/experimental/hackathon-sueno/PROPUESTA-EQUIPO.md`

## Convenciones
- Comunicación en español; código e identificadores en inglés.
- Commits chicos y frecuentes; no hacer push ni commits sin que el usuario lo pida.
- Al terminar una funcionalidad y verificarla, proponer siempre el cierre completo: commit selectivo, push, PR y merge a `main`. Si el usuario ya autorizó ese cierre, ejecutarlo y entregar los enlaces sin pedir de nuevo la misma autorización.

## Cómo trabajamos los tres
Reparto por funcionalidad en `docs/equipo/README.md`. Antes de tocar un archivo, revisa de qué carril es.
- Quito: `agent/` (clasificación, política, onboarding del agente, cerebro del chat, semana simulada) y sus pruebas.
- Amaru: `server/` (API, base, conexiones, push, llamada, calendario de turnos) y el deploy. `web/` y `backend/` son su prototipo de referencia.
- Bishara: `mobile/` (la app Expo): diseño UX/UI, pantallas y chat.
- Bishara y Amaru intercambiaron carriles el 2026-10-23 (`docs/equipo/adr/oficiales/2026-10-23-trueque-bishara-amaru.md`). Si un documento anterior dice otra cosa, manda ese ADR.
- Los nombres `agent/`, `server/` y `mobile/` son la propuesta para lo oficial. El código del prototipo no se edita: se lee como referencia.
- Toca solo los archivos de tu carril. Si necesitas cambiar uno ajeno, avisa a su dueño antes. No muevas, renombres ni reformatees archivos de otro carril.
- Vale igual para los tres, Quito incluido: si lo que pide tu humano cae en otro carril o en el prototipo, avísale antes de empezar, no a mitad de camino, y ofrécele pedírselo al dueño con `tools/tarea`. Solo si tu humano confirma que igual quiere meterse, corre `tools/carril permitir <ruta>` y avísale al dueño. `tools/carril de <ruta>` dice de quién es cada ruta.
- En Claude Code, un hook bloquea las ediciones en otro carril hasta ese permiso. En Codex no hay hook: corre `tools/carril revisar <archivo>` antes de editar.
- Contrato compartido: el JSON que devuelve el agente y las respuestas de la API que usa la app. Se define entre los tres antes de construir, y después se cambia solo en un PR chico aparte, avisando a los otros dos.
- Dónde trabajar: en tu propia rama (`amaru/<tema>`, `bishara/<tema>`, `quito/<tema>`), nunca directo en `main`. `main` es lo que se despliega. En local, todo tiene que poder correr sin claves con la semana simulada.
- Ramas cortas: antes de empezar cada tarea, trae `main` (`git pull origin main`). PR a `main` cada 1 o 2 horas, con las pruebas y el build en verde. Una rama vive horas, no días.
- Integrar cada funcionalidad terminada y verificada mediante su PR y merge a `main`, sin acumular varias funcionalidades completas en una rama. Cada persona mantiene el cierre de su propio carril. Acuerdo oficial: `docs/equipo/adr/oficiales/2026-10-23-cierre-funcionalidades-con-merge.md`.
- Documentos de cada uno en `docs/equipo/<persona>/`. `README.md` y `SETUP.md` quedan en la raíz.

## Decisiones (ADR)
Una decisión por archivo. Lo oficial en `docs/equipo/adr/oficiales/`, las ideas sin confirmar en `docs/equipo/adr/por-confirmar/`. Cómo funciona, en `docs/equipo/adr/README.md`.
- Cuando alguien del equipo fija una decisión en la conversación (elige un camino, define una regla, deja algo fuera o asigna un dueño), pregúntale en una línea: "Esto es oficial o es una idea por confirmar?". Si es oficial, va a `oficiales/`. Si es idea, o no contesta, va a `por-confirmar/`. Nunca la marques oficial por tu cuenta.
- Al cerrar cada tarea, antes del PR, revisa si en la sesión hubo decisiones sin registrar y haz la misma pregunta. El archivo de la decisión va en el mismo PR que el código.
- Una decisión oficial no se borra. Si cambia de rumbo, se escribe una nueva y la anterior queda "reemplazada por".

## Pedirle algo a otro del equipo
Protocolo completo en `docs/equipo/tareas.md`. Requiere `gh` con sesión iniciada.
- Al empezar la sesión y antes de cada tarea nueva, corre `tools/tarea mias` y muéstrale a tu humano lo que haya. Él decide si se toma.
- Si tu humano dice "dile a X que haga Y", crea la tarea con `tools/tarea para <quito|bishara|amaru> "título" "detalle"`. No la hagas tú si es de otro carril.
- "Cristóbal" es ambiguo: pregunta si es Quito o Bishara.
- Al empezar una tarea, `tools/tarea tomar <n>`. Al terminarla, `tools/tarea hecha <n> "..."` o un PR con `Closes #<n>`.
- El repo es público: nada de claves ni datos reales en una tarea.

## Documentar funcionalidades y flujos
El tablero humano se abre con `npm run tablero`. Guía y plantillas: `docs/equipo/quito/tablero/README.md`; criterio de escritura: `docs/equipo/quito/tablero/PROTOCOLO.md`.
- En cada cambio lógico, crear una entrada en `docs/equipo/<persona>/tablero/cambios/` y actualizar las funcionalidades y flujos afectados dentro del carril propio. Reutilizar identificadores; para fichas compartidas, registrar la dependencia y coordinar con quien las mantiene.
- Explicar para una persona: qué cambia, por qué, ejemplo, reglas, límites y evidencia. Separar acuerdo de producto, construcción, disponibilidad y verificación; no acreditar implementación por estar acordada.
- Antes de entregar, ejecutar `npm run tablero:build` y `npm run tablero:check`; enlazar las fichas actualizadas y señalar lo que falta comprobar. Al modificar las herramientas del tablero, ejecutar también `npm run tablero:test`.
- No editar a mano `index.html` ni `tablero.excalidraw`: se generan desde las fichas. Conservar `disposicion.json`, que guarda el orden elegido por las personas. Esto no autoriza commits ni publicaciones.
