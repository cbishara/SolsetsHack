# Hablar con Sol: propuesta para revisar

Fecha: 2026-10-23, revisión 03 el 2026-10-24. Propuesta: Quito. Implementación móvil: Bishara; transporte: Amaru. Estado: controles oficiales ([ADR](../../../adr/oficiales/2026-10-24-controles-de-voz-forma-que-cambia.md)); personaje de líneas y cielo animado por confirmar; no integrada en Expo.

Continuidad de la sesión: [traspaso a Opus](./TRASPASO-OPUS.md), guardado a pedido de Quito con las rutas, pruebas y próximos pasos.

Revisión 02: a Quito le gusta la dirección azul sobre oscuro, pero pide quitar el acabado plano, dar vida a la voz, usar librerías más completas para ondas e iconos y hacer el fondo más temático. Esta versión responde con una superficie fluida, luz y paisaje nocturno abstracto, y controles con profundidad. Su revisión final sigue pendiente.

Revisión 03, en curso desde el 2026-10-24: Quito pide un fondo animado y más personalidad, con algún animatrónico con vida pero simple. La maqueta suma un cielo nocturno que se mueve (estrellas que titilan, una estrella fugaz de vez en cuando, aurora azul que deriva, luna, colinas que se mecen y luciérnagas que se aceleran con la voz) y un personaje dentro del círculo, en tres opciones para elegir: A, solo ojos; B, ojos más antena y flotación; C, ojos más boca y cuerpo elástico. Las tres parpadean, siguen el cursor o el dedo con la mirada y cambian de gesto por estado. Se comparan con `?view=options`; `?character=ojos|antena|criatura` fija una en la vista normal. Ninguna está aprobada todavía.

Segunda vuelta de la revisión 03: Quito pide algo más neutro y de líneas, y otros botones, planos y elegantes, con animaciones simples, fluidas y precisas. Se suma la opción D, Líneas: los ojos son dos trazos que se encogen a un punto al parpadear y quedan horizontales al silenciar, con antena de trazo fino. Los iconos pasan a Phosphor Light. `?view=buttons` muestra diez estilos de botones, cada uno descrito como interpretación en la línea de una app conocida (no copias verificadas contra esas apps), con costo y riesgo; tocar uno lo aplica al teléfono y `?dock=<id>` lo fija en la vista normal. El micrófono cambia a tachado con un barrido diagonal en todos los estilos. Quito eligió la 05, forma que cambia, y pidió alinearla a los colores de Bishara. En ese momento Bishara reemplazó "Mi espacio" por Soltra (PR #57), así que la 05 usa los tokens de Soltra: botones `surface` casi negros, silenciado en blanco, Terminar en coral, radio 22, tamaño 56, presión a 0,97 en 120 ms y resorte de 400 ms. El cielo y el círculo azules son anteriores a Soltra y quedan por adaptar. La vista normal parte ahora con el personaje D y la opción 05. Quito confirmó los controles como oficiales el 2026-10-24 ([ADR](../../../adr/oficiales/2026-10-24-controles-de-voz-forma-que-cambia.md)); el personaje de líneas y el cielo animado siguen [por confirmar](../../../adr/por-confirmar/2026-10-24-personaje-de-lineas-y-cielo-animado.md).

Quito pidió diseñar aquí la experiencia, usando el patrón familiar de las apps de conversación: círculo que reacciona a la voz, conversación sin mantener un botón pulsado, posibilidad de interrumpir a Sol al hablar y micrófono silenciable. Amplía el pedido anterior de un botón central para grabar un turno. No se declara una llamada continua ya implementada.

## Intención y dirección visual

La persona quiere contar lo que tiene dando vueltas con una mano y poca carga visual, de día o antes de dormir. Debe distinguir quién habla, saber si el micrófono está activo y poder detener la conversación.

- Territorio: descanso, turno de guardia, descarga, escucha, pendiente y continuidad del hilo.
- Colores del producto: blanco de Mi espacio, azul de marca #2E59E5, azul profundo de noche #0C1429, azul claro para el círculo, tinta suave y lima #E4F51A para el acceso principal. Derivan del ADR visual vigente.
- Firma: el mismo círculo vive en el acceso central de la barra y en la conversación; la flecha ↗ y el azul de Soltra conservan la identidad. El interior fluye con la voz y los contornos acompañan su intensidad. La noche tiene bruma azul, un horizonte tenue y puntos de luz discretos; se conserva la paleta Mi espacio.
- Patrones ajustados al caso: conversación en una pantalla tranquila en lugar de burbujas en movimiento; tres controles persistentes en lugar de un menú escondido; modo noche con brillo contenido.

Antes de construir los componentes: intención de conversación cómoda al final del día; paleta Mi espacio; profundidad mediante superficies cercanas, iluminación del círculo y una base translúcida para los controles; tipografía del sistema para que el móvil resulte familiar; escala de separación de 4 pt. Círculo principal aproximado de 220–270 pt, acceso inferior de 66 pt y controles de 58 pt. El movimiento representa intensidad de voz y no implica vibración continua del teléfono.

## Recorrido propuesto

1. Tocar el botón circular central «Hablar con Sol» desde el chat.
2. Pedir permiso de micrófono solo si hace falta. Al concederlo, entrar a la conversación manos libres.
3. Hablar sin mantener pulsado. El círculo sigue la intensidad del micrófono; el sistema identifica el fin del turno. El texto se puede consultar.
4. Mientras Sol prepara la respuesta, mostrar «Un momento…». No animar una voz inexistente ni esconder esperas reales.
5. Escuchar la respuesta exacta de Sol con Miguel G. Si la persona empieza a hablar, detener la reproducción y priorizar su nuevo turno; tocar el círculo ofrece la misma interrupción manual.
6. Silenciar desactiva la entrada. El agente puede terminar lo que ya estaba diciendo, pero el micrófono apagado no produce interrupciones.
7. «Ver texto» abre la conversación en una hoja; «Terminar» cierra captura y reproducción. Volver al chat conserva el hilo.

La maqueta abre directamente la vista de voz para revisarla. «Entrada desde el chat» permite recorrer el acceso central. «Sol responde» reproduce una muestra sintética de Miguel G si está junto al HTML local. Los turnos de ejemplo y sus estados están identificados fuera de la pantalla del producto.

## Qué incluye la maqueta

[index.html](./index.html) conserva los estados de escucha, voz de la persona, espera, respuesta, silencio y fallo; modo día/noche; acceso central desde el chat; texto consultable y salida al mismo hilo sintético. El build local incorpora las librerías visuales y la muestra opcional de Miguel G en un solo HTML. Abrir únicamente la fuente conserva una representación 2D de respaldo, sin cargar esas librerías. La consulta ?view=board&capture=1 muestra tres estados juntos; ?theme=day permite revisar la versión clara.

Librerías usadas realmente en la maqueta, con versiones fijadas en su propio package-lock.json:

- ElevenLabs UI Orb, adaptado desde su registro público con licencia MIT, sobre React Three Fiber 9.8.2 y Three.js 0.186.1. La superficie de Sol está en orb.frag; se conservan el componente y su control de volumen, con textura generada en memoria, pausa explícita y captura reproducible.
- Motion 14.6.0 para las transiciones de estado.
- Phosphor Core 2.1.1: un subconjunto de diez iconos originales, en peso Light (línea) desde la revisión 03; la revisión 02 usaba Duotone.

El control de voz continúa siendo el del prototipo: el componente recibe los niveles manualmente; no abre otro micrófono ni incorpora un agente de ElevenLabs. No hay CDN ni descarga de textura al abrir la vista. La escena limita la densidad de píxeles y usa renderizado bajo demanda al silenciar, ocultar la página o reducir movimiento.

Para regenerar la copia de revisión desde esta carpeta:

    npm ci --ignore-scripts --no-audit --no-fund
    npm run build

El resultado es .context/voz-sol/index.html en la raíz del workspace; se abre como archivo local. Las dependencias pertenecen exclusivamente a esta maqueta: no se editaron package.json ni lockfiles de mobile/ o de la raíz.

Se puede activar voluntariamente el micrófono del navegador en localhost/HTTPS para mover el círculo con el volumen real y detener la muestra reproducida al detectar voz. No se graba, transcribe, guarda ni envía ese audio. Silenciar deshabilita la pista; terminar o esconder la página la cierra. Esta prueba local no es una conversación con el agente ni demuestra cancelación por voz en un iPhone.

El permiso rechazado deja disponibles los estados de ejemplo y el chat. El movimiento se reduce según la preferencia del sistema. Los controles tienen nombres accesibles y texto; el estado no depende solo del color.

Verificación de la revisión 02: 20 comprobaciones de navegador aprobadas, sin errores JavaScript ni peticiones a proveedores desde la maqueta. Incluyen carga real del Orb WebGL y de los iconos Phosphor, cambio real de la superficie entre fotogramas, círculo quieto al silenciar y renderizado bajo demanda, además de las 17 comprobaciones previas: inicio central, silencio reversible, reproducción de la muestra, interrupción al tocar, texto con foco y Escape, espera/fallo, modo día/noche, salida conservando el hilo, ancho de 390 px, movimiento reducido y permiso rechazado. Con una señal de micrófono sintética se comprobó medición por Web Audio, desactivación de la pista al silenciar, interrupción al detectar voz y cierre de la pista al terminar. No se usó el micrófono personal de Quito ni se probó un teléfono físico. Esto acredita interacción y movimiento en Chrome; no es una medición de FPS en Expo.

Para abrir sin levantar un servidor, usar la copia generada. Lleva las librerías, sus licencias y la muestra sintética incrustadas para poder reproducirla como archivo local; la fuente versionable no contiene audio ni credenciales. La revisión 01 se conservó localmente para comparar el antes y el después.

## Lo que se debe integrar y comprobar

- Bishara: captura, reproducción simultánea con detección de voz, permisos, silencio real, niveles reales de entrada/salida, cierre del micrófono y texto del mismo chat. Verificar altavoz y audífonos, eco y ruido, áreas seguras, VoiceOver y dispositivo físico.
- El componente elegido aquí usa DOM/WebGL y no se presenta como un componente Expo listo para pegar. Bishara debe acordar la implementación nativa de este acabado y medirla en el teléfono. Las capturas web y el tamaño de este bundle no certifican rendimiento, autonomía ni tamaño del bundle móvil.
- Amaru y Quito: el nuevo turno tiene prioridad sobre la reproducción anterior; las respuestas atrasadas no vuelven a sonar después de una interrupción. El historial conserva qué se interrumpió sin repetir la inferencia ni crear un segundo cerebro.
- No elegir otro motor conversacional de ElevenLabs para conseguir la interfaz: STT/TTS siguen conectados al agente propio. El adaptador actual funciona por llamadas completas; el flujo manos libres, la detección del fin del turno y la interrupción deben implementarse y medirse.
- La cancelación de reproducción debe sentirse inmediata; los tiempos concretos son un objetivo pendiente de medir en dispositivo. Una animación fluida no elimina el tiempo de Codex.
- Corregir una transcripción mantiene el contexto y marca la corrección; no añade un turno duplicado. No se promete edición de texto aún programada en esta maqueta.

## Referencias y evidencia

- [Sistema visual oficial](../../../adr/oficiales/2026-10-23-sistema-visual-mi-espacio-con-modo-noche.md): Mi espacio y modo noche.
- [PRD de conversación y voz](../../specs/2026-10-23-sol-conversacion-y-voz.md).
- [ChatGPT Voice](https://help.openai.com/en/articles/20001274-chatgpt-voice), documentación oficial consultada el 2026-10-23: inicio desde el chat, silenciar, salir, texto e interrupción como referencia de familiaridad. Esta propuesta usa la identidad de Sol.
- [ElevenLabs UI Orb](https://ui.elevenlabs.io/docs/components/orb), [fuente con licencia MIT](https://github.com/elevenlabs/ui/tree/3a28ebab197f8cfa599934f52db12ad1396e54f4), [Motion](https://motion.dev/docs/animate) y [Phosphor Core](https://github.com/phosphor-icons/core), consultados el 2026-10-23. Las adaptaciones y licencias están en [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
- [Tarea móvil #28](https://github.com/cbishara/SolsetsHack/issues/28) y [transporte #29](https://github.com/cbishara/SolsetsHack/issues/29).

Las capturas y el informe de interacción se guardan en .context/voz-sol/ para la revisión en este Mac. Ese directorio no se publica con Git; la fuente y la explicación de diseño de esta carpeta sí son compartibles cuando Quito autorice publicar la rama. No se acredita implementación por mostrar una captura.

La muestra de movimiento se generó grabando el propio prototipo: voz-en-movimiento.gif. No es un video de Expo ni una conversación real. Su movimiento usa el estado de voz sintético, indicado como demostración en la maqueta.
