# Auditoría del repo, 23 de octubre de 2026 (21:00)

Foto tomada sobre `origin/main` en `51d3fce` (merge de #45). Solo lectura: no se cambió código.

## Veredicto

Las tres piezas existen y pasan sus pruebas por separado, pero todavía no forman una cadena. El servidor no llama al agente, el contrato entre los dos no coincide, y lo que más se vende en el pitch (el push y la llamada a los 3 minutos) no existe en ninguna capa. No es un problema complejo: son cuatro trabajos acotados, uno por carril, más una limpieza de documentos.

## Estado de cada carpeta

Checks corridos con Node 24.11.1, todos en verde.

1. `agent/` (Quito): `tsc --noEmit` OK, 85/85 pruebas, `npm run eval` sale con 0. La política está en código y probada (`agent/src/policy.ts:22-44`): lo nuevo o con confianza menor a 0.7 despierta, un duplicado en menos de 30 min no vuelve a despertar y el modo sombra no cambia la decisión. El motor de reglas, que es el respaldo si Codex falla, acierta 22 de 39 casos propuestos (56 %) y despierta de más con mensajes como "se acabó el café… jajaja".
2. `server/` (Amaru): `tsc --noEmit` OK, 21/21 pruebas. Tiene la pregunta "te toca guardia?" (`GET/PUT /api/night/today`), el parte de la mañana (`/api/report`), el modo sombra y la noche simulada sin claves. Pero clasifica con un clasificador falso hecho con expresiones regulares (`server/src/index.ts:14`, `server/src/agent.ts:15-29`). Ese clasificador usa `incidentKey = message.id`, así que dos avisos del mismo portal caído despiertan dos veces.
3. `mobile/` (Bishara): `tsc --noEmit` OK, 19/19 pruebas. El build (`expo export`) no se corrió. La app arranca con datos locales de ejemplo (`mobile/src/api/backend.tsx:47`) hasta que alguien pega la URL del servidor en Ajustes. La pantalla de alerta cuenta 180 segundos en local y "Lo vi" no avisa al servidor (`mobile/src/app/alerta.tsx:15`).

## Lo que falta para la meta

1. Conectar servidor y agente. Hoy nada de lo que muestra la app pasa por el agente ni por su política.
2. Traducir el contrato. El agente habla `DESPERTAR/PARTE/RUIDO`, `is_new` y feedback `ok|should_wake|should_not_wake` (`agent/src/contract.ts:5,68`). El servidor y la app hablan `wake/report/noise`, `isNew` y `right|should_have_woken|should_not_have_woken` (`server/src/contract.ts:16,37`). El servidor y la app coinciden entre sí; el agente ya trae un traductor en `agent/src/integration/`, pero el servidor no tiene las rutas que ese traductor espera.
3. Push: `expo-notifications` no está instalado, `registerDevice` nunca se llama y el notificador del servidor solo escribe un log (`server/src/guard.ts:15-19`). Ojo: el ADR de Expo dice que el push no funciona en Expo Go desde el SDK 53 y exige un build propio.
4. Llamada a los 3 minutos: no hay temporizador ni proveedor de llamadas en ninguna capa.
5. Chat: el servidor responde 503 `agent_not_connected` (`server/src/app.ts:107-111`).
6. README de una página (problema, elección, qué se excluyó): no existe. El `README.md` actual describe el prototipo web con Hermes.
7. CI: no hay `.github/`. Nada corre pruebas antes de un merge.

## Ramas

1. `amaru/whatsapp-multiuser` (PR #36, borrador): 10 commits adelante, 40 archivos. Trae identidad, cola del agente y WhatsApp multiusuario en `server/`. Vale mergear, pero hoy está en conflicto en `docs/equipo/quito/tablero/index.html` y `tablero.excalidraw`, que son del carril de Quito y se generan solos. Para destrabarlo hay que tomar esos dos archivos de `main` y correr `npm run tablero:build`.
2. `codex/sol-desconexion-whatsapp`: obsoleta. Edita el prototipo y reescribe `CLAUDE.md` con el rumbo viejo de SOL. No mergear. El issue #14 la cita como referencia visual, así que conviene que Amaru confirme antes de borrarla.
3. `Quitogonzalez/repo-familiarizate`: un commit de estilo del tablero, sin conflicto. Edita a mano `index.html`, que es generado; habría que regenerarlo.
4. Ya mergeadas y borrables (17): todas las `quito/*`, `bishara/*`, `amaru/whatsapp-context`, `amaru/mobile-expo`, `codex/railway-deploy`, `codex/solsets-demo` y `Quitogonzalez/codex-chat-branching-strategy`.

## Issues

1. Se pueden cerrar: #8 (Hermes descartado), #6 (superado por el trueque y el contrato v1), #20, #34 y #35 (avisos informativos).
2. #30: la parte de Quito entró con #44 y #45; falta la de Amaru (#36).
3. #41 y #14: siguen abiertos. Dependen de que el servidor llame al agente.
4. Probablemente superados, a confirmar por Amaru: #7 (contrato API) y #17 (tomar `server/`).

## Contradicciones entre documentos

Todos los ADR son del 23 de octubre, así que la fecha no desempata. Se aplica la regla del repo: el ADR oficial manda sobre `CLAUDE.md`.

1. Producto. El ADR oficial dice guardia de noche. `docs/equipo/amaru/TRASPASO_BISHARA.md:15-17` dice que SOL saca pendientes de la cabeza y que no hay que prometer "yo vigilo". `docs/equipo/bishara/BRIEF_APP.md:7-14` agrega un modo secretaria de día sin ADR. Vigente: guardia.
2. Motor. El ADR oficial dice Codex sin Hermes. `README.md`, `SETUP.md`, `mobile/README.md:37` y `deploy/hermes/` siguen hablando de Hermes. `agent/README.md:35-41` documenta Luna como activo, pero su ADR sigue por confirmar.
3. Dónde corre Codex. El ADR oficial dice Railway; `agent/INTEGRATION.md:9,47` dice que la sesión queda en el Mac. Resuelto en código después de esta foto: `539d733` (PR #47) levanta el trabajador en Railway cuando existe `AGENT_WORKER_URL`. Falta actualizar `agent/INTEGRATION.md`.
4. WhatsApp. El ADR por confirmar duda entre API oficial y 2Chat, pero en la práctica ya manda Unipile (`docs/equipo/amaru/WHATSAPP_UNIPILE.md:7,15`), que no tiene ADR. `SETUP.md` habla además de Kapso.
5. Datos sintéticos. `CLAUDE.md:7` lo prohíbe todo; el ADR oficial de contexto de WhatsApp autorizado lo reemplaza para los chats elegidos. `CLAUDE.md` no se actualizó.
6. Código desde cero. `docs/equipo/amaru/DISENO_MOBILE.md:9` y `HANDOFF_AGENTE.md:52-61` proponen reutilizar el prototipo.
7. Carriles. `mobile/README.md:5` todavía dice que la app es del carril de Amaru. `docs/equipo/quito/README.md:3` dice que las métricas son de Quito y el ADR de cinco funcionalidades dice Bishara.
8. Modo sombra. `CLAUDE.md` dice "las primeras semanas", el ADR por confirmar dice "5 noches seguidas" y el oficial dice "unas noches".
9. Pitch. `README.md:13` promete "una hora más de sueño"; el ADR por confirmar de la frase del pitch lo prohíbe y tampoco usa la palabra "guardia".
10. Navegación de la app. El código usa Expo Router; `mobile/README.md` describe la navegación vieja de `App.tsx` y `mobile/index.ts` sigue registrando `App`.
11. Deploy. Hay al menos cinco servicios de Railway mencionados (`sol-whatsapp-demo`, `sol-multiuser-demo`, el backend del prototipo, `hermes`, `agent`) y ningún documento dice cuál es el oficial.

## ADR por confirmar que el código ya decidió

1. Contrato compartido: ya implementado en `server/src/contract.ts` y usado por la app.
2. Nombres de carpetas: `agent/`, `server/` y `mobile/` ya existen; `CLAUDE.md` aún los llama propuesta.
3. Consola de respaldo: ya existe (`POST /api/messages`).
4. Caída grave sin guardia: el agente ya aplica `off_duty` y no despierta (`agent/src/integration/server-policy.ts:21`).
5. WhatsApp: superado por Unipile.

Bloquean la entrega: quién lleva el pitch y la frase del pitch.

## Documentos con referencias muertas

1. `CLAUDE.md:22-23` y `AGENTS.md:22-23` apuntan a `/Users/bisos/Desktop/...`, que solo existe en la máquina de Bishara.
2. `docs/ideas/2026-10-23-guardia-universal.md:38` cita `docs/PRODUCTO_SOL.md`, que se movió a `docs/equipo/amaru/`.
3. `docs/equipo/bishara/README.md:18` dice que el contrato está en el issue #7.
4. `mobile/README.md:52` depende de la rama obsoleta `codex/sol-desconexion-whatsapp`.

## Orden propuesto hasta la entrega

1. Amaru: destrabar #36 y conectar el servidor al agente (cambiar `stubAgent` por una llamada a `agent/`).
2. Quito: dejar el traductor del contrato del lado del agente para que el servidor no tenga que cambiar sus nombres, y subir el acierto del motor de reglas.
3. Bishara: que la app arranque conectada al servidor desplegado y que la alerta use una alerta real.
4. Push y llamada: se muestran simulados y se dice en voz alta, disparados por una alerta real del servidor. Decidido en `docs/equipo/adr/oficiales/2026-10-23-push-y-llamada-simulados-en-la-demo.md`.
5. README de una página y limpieza de documentos obsoletos, al final.
