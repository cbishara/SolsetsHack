# Traspaso a Opus: voz de SOL

Guardado a pedido de Quito el 2026-10-23: «guárdalo para que lo siga con Opus».

## Retomar desde aquí

Workspace: /Users/quitoogv/conductor/workspaces/solsetshack/antananarivo.

La tarea activa es revisar y continuar el diseño de la conversación por voz de SOL. No empezar de cero: ya existe una segunda maqueta interactiva con sus fuentes, librerías y evidencia. Leer este archivo y [README.md](./README.md), abrir la maqueta y mostrar el estado actual antes de seguir iterando con Quito.

La rama observada al guardar es quito/activar-agente-v1. Otras sesiones han cambiado ramas y trabajado en este mismo workspace. Hay WIP ajeno, archivos sin seguimiento y cambios ya preparados en Git: conservarlos, no hacer reset, no cambiar de rama ni incluir trabajo ajeno en un commit. Este traspaso y la maqueta siguen locales; no se ha autorizado su commit, push, PR ni merge.

Actualización 2026-10-24: Opus retomó y cerró la revisión 03 (cielo animado, personaje de líneas, diez estilos de botones). Quito eligió los controles 05 con los tokens de Bishara y los confirmó como oficiales; el personaje y el cielo quedaron por confirmar. Quito autorizó commit, PR y merge a main de esta carpeta, sus ADR y sus fichas del tablero. El estado vigente está en [README.md](./README.md).

Respaldo independiente de las fuentes del diseño, la spec y la evidencia local: .context/voz-sol/RESPALDO-OPUS.tar.gz. Incluye solo una lista explícita de archivos de este trabajo, sin node_modules ni credenciales. No restaura el repo completo ni sustituye el trabajo nuevo de otras sesiones; consultar el archivo si algún cambio de rama hace faltar un artefacto.

## Qué quiere Quito

- Entrada desde un botón circular central en la barra inferior.
- Conversación manos libres, con un círculo que reaccione a la voz; no mantener pulsado ni iniciar cada turno a mano.
- Si la persona habla mientras SOL responde, SOL se detiene y prioriza su nueva voz. También se puede interrumpir tocando el círculo.
- Micrófono silenciable, texto consultable y control para terminar.
- Hablar con SOL y escuchar sus respuestas con ElevenLabs; voz Miguel G ya elegida y aceptada.
- Familiaridad con apps reales de conversación, especialmente el patrón de voz de ChatGPT, conservando la identidad de SOL.

Feedback más reciente sobre la primera propuesta: le gusta el azul suave sobre oscuro, pero la considera demasiado plana. Pidió darle vida a la voz, usar paquetes más completos para ondas e iconos y un fondo más temático.

La revisión 02 ya responde a ese pedido. Quito pidió guardarla para Opus; todavía no dio aprobación final a este acabado ni se convirtió en un ADR oficial.

## Estado que se puede mostrar ahora

- Maqueta completa: [.context/voz-sol/index.html](../../../../../.context/voz-sol/index.html).
- Movimiento: [voz-en-movimiento.gif](../../../../../.context/voz-sol/voz-en-movimiento.gif).
- Tres estados nocturnos: [propuesta-voz-noche.png](../../../../../.context/voz-sol/propuesta-voz-noche.png).
- Versión clara: [propuesta-voz-dia.png](../../../../../.context/voz-sol/propuesta-voz-dia.png).
- Revisión 01 para comparar: .context/voz-sol/revision-01/.

La copia de revisión es un HTML local con las librerías y una muestra sintética de Miguel G incrustadas. Para abrirla desde la raíz:

    open .context/voz-sol/index.html

«Estás hablando» permite ver las ondas de ejemplo. «SOL responde» reproduce la muestra. «Probar con mi micrófono» pide permiso para medir el volumen local y mover el círculo; no graba, transcribe, guarda ni envía ese audio. No se ha probado el micrófono físico de Quito.

No hace falta levantar un servidor para revisar el diseño. En esta sesión el hook quito-no-servidores bloqueó un servidor de preview; se completó la revisión usando archivos locales. No sortear ese bloqueo.

## Qué se construyó

Fuentes en esta carpeta:

| Archivo | Función |
| --- | --- |
| index.html | Pantallas, estados, controles, audio de ejemplo y captura local opcional |
| visuals.jsx | Puente entre los niveles de voz y el componente visual; transiciones |
| orb.tsx | Orb de ElevenLabs UI adaptado, con pausa y captura reproducible |
| orb.frag | Superficie fluida propia de SOL e iluminación |
| perlin-texture.ts | Textura determinista generada en memoria, sin pedir imágenes externas |
| build.mjs | Compila las librerías e iconos y genera el HTML de revisión |
| package.json / package-lock.json | Dependencias aisladas de esta maqueta |
| THIRD-PARTY-NOTICES.md | Fuentes, adaptaciones y licencias MIT |

Paquetes reales: React Three Fiber 9.8.2, Three.js 0.186.1, Motion 14.6.0 y Phosphor Core 2.1.1, con React/React DOM 19.3.1. El Orb deriva de ElevenLabs UI, commit 3a28ebab197f8cfa599934f52db12ad1396e54f4. No se instaló un segundo agente de ElevenLabs.

Visual: azul de SOL, superficie con ondas fluidas, bruma y horizonte nocturno, puntos de luz discretos, iconos Phosphor Duotone y una base translúcida con relieve para los controles. Mantiene Mi espacio y modo noche; no reintroduce la dirección Ocaso descartada.

Para regenerar, desde esta carpeta:

    npm ci --ignore-scripts --no-audit --no-fund
    npm run build

Produce .context/voz-sol/index.html. El audio de muestra es opcional: el build lo incrusta si encuentra .context/voz-sol/miguel-sample.mp3. El HTML fuente abierto sin compilar mantiene un respaldo 2D y no muestra el acabado completo.

## Verificación y límites

Pasaron 20 comprobaciones de navegador. Se comprobó que se carga WebGL y Phosphor, que la superficie cambia entre fotogramas y queda quieta al silenciar, además de controles, interrupción, texto, error, permiso rechazado, ancho 390 px y reducción de movimiento. Una señal de micrófono sintética verificó la medición de volumen, desactivación de la pista, interrupción de la muestra y cierre de recursos.

Evidencia local:

- .context/voz-sol/verification.json: 20 comprobaciones, sin errores JavaScript ni peticiones a proveedores desde la vista.
- .context/voz-sol/verify.mjs: comprobaciones con Playwright; usa una instalación local cuya ruta está al inicio del archivo.
- .context/voz-sol/render.mjs: capturas. Desactiva las animaciones de entrada al fotografiar para que no se transparente el chat inferior.
- .context/voz-sol/record-motion.mjs: grabación del propio prototipo.
- .context/voz-sol/bundle-meta.json: metadatos del build.

El GIF usa el estado de voz de ejemplo. La muestra de audio es sintética. Esto no acredita una conversación con el agente, una prueba en iPhone, FPS, autonomía ni rendimiento de Expo.

## Lo que falta y quién lo lleva

1. Revisar la segunda propuesta con Quito, una decisión por turno. Su petición de guardar no equivale a aprobar el diseño final.
2. Coordinar la adaptación nativa con Bishara, dueño de mobile/. El componente actual usa DOM/WebGL: no presentarlo como código Expo listo para pegar ni cambiar dependencias móviles sin coordinar el carril.
3. Acordar con Amaru, dueño de server/, el transporte de audio y la identidad. Mantener el agente propio y su memoria como cerebro común de texto y voz.
4. Implementar y probar detección del final del turno, control de eco y ruido, interrupción por voz y descarte de respuestas atrasadas. Volver a escuchar una respuesta no debe repetir la inferencia.
5. Verificar en un teléfono físico permisos, captura, reproducción, altavoz/audífonos, silencio, salida, VoiceOver y movimiento reducido.
6. Tras aprobación y verificación del alcance que se cierre, proponer commit selectivo, push, PR y merge a main. No hay autorización de publicación dada en este pedido.

Coordinación existente: [móvil #28](https://github.com/cbishara/SolsetsHack/issues/28) y [transporte #29](https://github.com/cbishara/SolsetsHack/issues/29). El primer pedido del botón central ya fue enviado a Bishara; esta revisión 02 no se publicó como diseño aprobado.

## Contexto de voz y documentos relacionados

- [PRD/spec de conversación y voz](../../specs/2026-10-23-sol-conversacion-y-voz.md).
- [ADR por confirmar](../../../adr/por-confirmar/2026-10-23-sol-conversacion-y-voz.md).
- [Sistema visual oficial](../../../adr/oficiales/2026-10-23-sistema-visual-mi-espacio-con-modo-noche.md).
- [Funcionalidad de descarga](../../tablero/features/feat-quito-descarga.json).
- [Flujo de pendientes](../../tablero/flujos/flujo-quito-recuperar-pendientes.json).
- [Cambio de la revisión 02](../../tablero/cambios/cambio-quito-20261023-voz-fluida.json).

También se prepararon agent/src/voice/elevenlabs.ts y sus pruebas, agent/VOICE.md, agent/scripts/verify-voice.ts y agent/.env.example. La cuenta de ElevenLabs ya se autorizó; la credencial local está en agent/.env, ignorada por Git. Nunca mostrar ni copiar sus valores al traspaso, un issue o el bundle móvil.

Miguel G: voice ID k8cFOyAg7B9qwBlDDNTC. Se verificaron síntesis y transcripción reales de una frase sintética desde el Mac. Ese resultado es distinto de la prueba de la maqueta y no conecta por sí solo Expo. Para continuar con el motor o el despliegue, releer el estado actual del repo: otras sesiones avanzaron esas partes después del trabajo visual.

## Reglas que conserva Opus

- Español con Quito; código e identificadores en inglés.
- Solo datos sintéticos; no usar chats, correos ni tickets reales.
- Leer el AGENTS.md vigente y comprobar el carril antes de editar.
- Quito: agente y estas fuentes de diseño; Bishara: app; Amaru: servidor.
- No modificar ni revertir WIP de otras sesiones.
- Guardar decisiones nuevas como por confirmar mientras Quito no las declare oficiales.
- Registrar cambios lógicos en las fichas existentes y ejecutar tablero:build y tablero:check si se actualizan.
- No levantar servidores ni publicar cambios sin la autorización que corresponda.

## Frase para iniciar en Opus

«Lee docs/equipo/quito/diseno/voz-sol/TRASPASO-OPUS.md y retoma el diseño de voz de SOL desde la revisión 02. Muéstrame la maqueta y continuemos con una decisión a la vez.»
