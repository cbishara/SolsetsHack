# Aviso a Bishara: panel de referencia funcional

Fecha: 2026-10-23
Remitente: Quito, a través de su agente
Destinatario: Cristóbal Bishara (`cbishara`)
Estado: publicado en GitHub; lectura o confirmación de Bishara sin comprobar

## Qué se necesitaba comunicar

Quito confirmó como oficial que el tablero es el panel de referencia y el lugar central para diseñar y consultar las funcionalidades de Solsets. Registro: [ADR oficial](../../adr/oficiales/2026-10-23-donde-vive-el-tablero.md). Guía: [tablero del equipo](../tablero/README.md).

## Fallo observado y recuperación

En el primer intento, `gh api user` falló al conectar con `api.github.com`. El conector de GitHub pudo leer el perfil y el issue #20, pero rechazó tanto crear el comentario como crear un issue: HTTP 403, `Resource not accessible by integration`. Ninguno de esos intentos acreditó un envío.

Al reintentar más tarde, `tools/tarea mias` y `gh issue view 20` volvieron a funcionar. El hilo todavía no tenía comentarios. Se publicó el aviso con `tools/tarea comentar 20` y se comprobó por API su autor, su contenido y su pertenencia al issue #20.

Evidencia de publicación: [comentario en #20](https://github.com/cbishara/SolsetsHack/issues/20#issuecomment-6376276658). Esto verifica la publicación; no demuestra que Bishara lo haya leído.

## Texto enviado

> @cbishara, Quito confirmó como oficial que el tablero es el panel de referencia y el lugar central para diseñar y consultar las funcionalidades de Solsets.
>
> En tu copia del repo: trae main y ejecuta `npm run tablero`. Normalmente abre en http://127.0.0.1:4175; mapa directo: http://127.0.0.1:4175/#mapa. El rediseño del tablero estilo Notion ya está integrado en el PR #22.
>
> Úsalo como referencia para necesidades, reglas, límites, responsables, pantallas y flujos. Cada persona mantiene sus fichas y cambios en su carril. Guía: docs/equipo/quito/tablero/README.md.
>
> El estilo Notion es el del tablero del equipo; la estética vigente de la app sigue sus ADR de diseño. La confirmación oficial está registrada localmente en docs/equipo/adr/oficiales/2026-10-23-donde-vive-el-tablero.md, pendiente de publicar.

## Segundo medio pendiente de elegir

Quito pidió documentar el incidente y tener otro medio si GitHub falla. Se le plantearon WhatsApp y una bandeja de avisos en el repo como alternativas; no eligió ninguna. El 2026-10-23 indicó: «lo veo con otro agente, documentalo nomas».

La elección y configuración del segundo medio quedan para ese trabajo con otro agente. Esta entrega conserva el incidente, el mensaje enviado y su evidencia de publicación; no selecciona ni configura un canal alternativo.

El procedimiento para avisos fallidos está en [tareas del equipo](../../tareas.md#si-falla-el-envío).
