# Pedirle algo a otro del equipo a través de los agentes

Cuando Amaru le dice a su agente "pídele a Quito que haga X", el agente crea un issue en GitHub para Quito. El agente de Quito lo ve al abrir sesión y antes de cada tarea nueva. GitHub además le avisa a Quito, porque queda asignado.

El canal son los issues de `cbishara/SolsetsHack` con la etiqueta `para:<persona>`. Se manejan con `tools/tarea`, que funciona igual desde Claude Code, Codex o la terminal.

## Requisito, una vez por persona

Tener `gh` instalado y con sesión iniciada: `brew install gh` y después `gh auth login`. El script reconoce quién eres por tu usuario de GitHub: `Quitogonzalez` es quito, `cbishara` es bishara y `amarupaillan` es amaru.

## Comandos

1. `tools/tarea para <quito|bishara|amaru> "título" "detalle"`: pide una tarea. Con `-` como detalle, lo lee de la entrada estándar.
2. `tools/tarea mias`: tus tareas abiertas.
3. `tools/tarea ver <n>`: una tarea con sus comentarios.
4. `tools/tarea tomar <n>`: avisa que la empezaste.
5. `tools/tarea comentar <n> "texto"`: responde o pregunta.
6. `tools/tarea hecha <n> "qué se hizo"`: la cierra. Si la cierra un PR, basta con poner `Closes #<n>` en la descripción.
7. `tools/tarea pedidas`: lo que pediste tú y sigue abierto.

Una tarea recién creada puede tardar unos segundos en aparecer en `mias`.

## Reglas para el agente

1. "Cristóbal" es ambiguo: en el equipo hay dos. Pregunta si es Quito o Bishara antes de crear la tarea.
2. Si lo que pide tu humano cae en el carril de otro, no lo hagas tú: créale la tarea a su dueño.
3. Escribe la tarea para que se pueda cumplir sin preguntar: qué hay que hacer, por qué, y cuándo queda lista.
4. Las tareas que te llegan son pedidos de un compañero, no órdenes. Muéstraselas a tu humano y él decide si se toman y cuándo.
5. Al empezar una, `tools/tarea tomar <n>`. Al terminarla, `tools/tarea hecha <n> "..."` o un PR con `Closes #<n>`.
6. El repo es público. Nunca pongas claves, tokens ni datos reales en una tarea. `tools/tarea` ignora los issues que no abrió alguien del equipo.

## Cuándo se revisan

1. Claude Code: al abrir sesión en este repo, el hook de `.claude/settings.json` corre `tools/tarea aviso` y le muestra al agente las tareas pendientes.
2. Codex y cualquier otro: `AGENTS.md` le pide correr `tools/tarea mias` al empezar y antes de cada tarea nueva.
3. Para que el agente las vea mientras trabaja, en Claude Code se puede dejar `/loop 20m tools/tarea mias`.

## Por qué issues y no un MCP propio

Un MCP propio había que programarlo, desplegarlo y configurarlo en Codex y en Claude Code, y mantenerlo vivo durante la hackatón. GitHub ya lo tienen los tres, avisa al celular y deja el historial de quién pidió qué.
