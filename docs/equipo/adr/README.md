# Decisiones del equipo (ADR)

ADR es "registro de decisión de arquitectura": una decisión por archivo, con su porqué y lo que cuesta. Sirve para que nadie tenga que adivinar si algo se decidió o solo se conversó.

## Dos carpetas

1. `oficiales/`: lo que el equipo decidió. Se construye sobre esto. Si `CLAUDE.md` y un ADR oficial chocan, manda el ADR.
2. `por-confirmar/`: ideas y preguntas abiertas. No se construye sobre esto hasta que alguien con autoridad lo confirme.

La lista de decisiones es la carpeta misma. No hay un índice aparte que editar, porque tres personas agregando líneas al mismo índice desde tres ramas es justo el conflicto de merge que queremos evitar.

## Cómo entra una decisión

Cuando alguien fija algo en una conversación con su agente (elige un camino, define una regla, deja algo fuera o asigna un dueño), el agente le pregunta en una línea: "Esto es oficial o es una idea por confirmar?".

1. Si es oficial, el agente escribe el archivo en `oficiales/` con la [plantilla](./plantilla.md).
2. Si es una idea, lo escribe en `por-confirmar/`, con la pregunta abierta y quién la decide.
3. Si no contesta, queda en `por-confirmar/`. El agente nunca marca algo como oficial por su cuenta.

Es oficial cuando la confirma quien manda en ese tema: el dueño del carril, o los tres si toca el contrato compartido o más de un carril.

Al cerrar cada tarea, antes del PR, el agente revisa si en la sesión hubo decisiones sin registrar y hace la misma pregunta. El archivo de la decisión viaja en el mismo PR que el código.

## Nombre de los archivos

`AAAA-MM-DD-slug.md`, por ejemplo `2026-10-23-expo-react-native.md`. Sin número correlativo: si dos ramas crean la "ADR 7" al mismo tiempo, chocan. La fecha y el slug no.

## Promover, cambiar y descartar

1. Una idea que se confirma se mueve de `por-confirmar/` a `oficiales/` con `git mv`, y se le cambia el estado. Se le agrega quién la confirmó y cuándo.
2. Una idea descartada queda en `por-confirmar/` con estado "descartada" y una línea de por qué. Así nadie la vuelve a proponer sin saber que ya se miró.
3. Un ajuste chico a una decisión oficial se edita en el mismo archivo, con una línea fechada al final en "Cambios".
4. Un cambio de rumbo es un archivo nuevo. El anterior no se borra: queda con estado "reemplazada por" y el nombre del nuevo.
