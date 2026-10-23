# Para el hackatón, el agente corre en Railway con una sesión de Codex propia del servidor

Estado: oficial, solo para el hackatón
Fecha: 2026-10-23
Decidió: Quito, el 2026-10-23. Toca el deploy, que es carril de Amaru: hay que avisarle.
Carril: quito

## Decisión

`agent/` corre como servicio aparte, `agent`, en el proyecto `solsets-hack` de Railway: https://agent-production-f80a.up.railway.app. El motor es la cuenta de Codex de Quito, con una sesión creada solo para el servidor (`codex login --device-auth`), distinta de la del Mac. La sesión y el estado del piloto viven en el disco `/data`. Una sola réplica.

Después del hackatón, el motor pasa a una API key de OpenAI. El servidor y el adaptador no cambian: solo la forma de iniciar sesión en el arranque.

## Por qué

Quito pidió que el chat de la app use su Codex como servicio, no en local, para que Amaru y Bishara lo ocupen sin levantar nada. La app ya aceptaba en Ajustes una URL https con contraseña (`mobile/src/api.ts`), así que bastaba con publicar `agent/`.

La sesión va aparte porque la documentación de Codex recomienda el login por código para máquinas sin navegador, y así el servidor y el Mac no se pisan al renovar el token.

## Lo que se verificó el 2026-10-23

1. Contra la URL pública: sin credenciales, chat y clasificación responden 401. Un mensaje de chat respondió con `engine: codex` en 7 s y guardó el horario en memoria. "URGENTE: se cayó el servidor de facturación" dio DESPERTAR con `engine: codex` en 4 s.
2. Tras reiniciar el servicio, la sesión se leyó del disco sin volver a sembrarse y la memoria seguía: a "A qué hora termino mi turno?" respondió "18:00".
3. Desde la vista web de la app, conectada a esa URL, un mensaje respondió con Codex en 5,8 s. No se probó en un iPhone físico.

## Lo que queda débil

1. Los términos de OpenAI prohíben poner la cuenta a disposición de otros (ver `2026-10-23-agente-propio-con-codex.md`). Para la demo es zona gris; por eso es solo para el hackatón.
2. El equipo gasta el mismo límite de uso del plan de Quito.
3. Si la sesión vence, hay que repetir el login por código y cargarla en la variable `CODEX_AUTH_JSON_B64`.
4. La conversación `demo:web` es una sola, compartida por todo el equipo. No hay identidad por persona ni conexión con `server/`.

## Las opciones que se miraron

1. Agente en Railway con la sesión de Codex de Quito. Es la elegida: funciona hoy y no cuesta plata.
2. API key de OpenAI. La documentación de Codex la recomienda para automatizar. Se paga por uso. Queda como paso siguiente.
3. Agente en el Mac de Quito con un túnel. Se descartó: depende de que el Mac esté encendido y Quito pidió que no fuera local.
