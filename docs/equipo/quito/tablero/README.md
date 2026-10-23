# Tablero del equipo

## Abrirlo

Desde la raíz del repo:

```sh
npm run tablero
```

Requiere Node 22 o superior, sin instalar dependencias adicionales ni configurar claves. En el Mac abre el navegador; el enlace aparece siempre en la terminal. Normalmente es **http://127.0.0.1:4175**. Si el puerto está ocupado, imprime otro disponible.

El proceso queda activo hasta pulsar `Ctrl+C`. Lee las fichas de esta copia del repo cada vez que el panel consulta cambios. Si cambia el código de `herramientas/model.mjs` o `serve.mjs`, hay que reiniciarlo: el proceso guarda esa versión en memoria. No depende de la app de Rodrigo, Railway, Hermes ni WhatsApp.

También se puede abrir [index.html](./index.html) directamente. Es una copia sin servidor: permite leer todo y conservar el orden en ese navegador, pero no escribe en el repo ni recibe las fichas nuevas hasta regenerarla y abrirla otra vez.

## Qué ves

- **Funcionalidades:** agrupadas por momentos de Rodrigo; abrir para leer necesidad, acciones, ejemplo, reglas, límites y evidencia.
- **Flujos:** recorridos con actores, decisiones, resultados y preguntas abiertas. Cada paso puede enlazar su funcionalidad.
- **Qué cambió:** antes/después de cada cambio lógico, autor, motivo y comprobaciones.
- **Cómo lo mantenemos:** rutina resumida para el equipo y exportación del orden.

Las cinco fichas iniciales consolidan el [ADR oficial](../../adr/oficiales/2026-10-23-cinco-funcionalidades.md). No certifican implementación: construcción, disponibilidad y verificación están separadas. La excepción de una caída grave sin guardia permanece abierta, como indica su [ADR por confirmar](../../adr/por-confirmar/2026-10-23-caida-grave-sin-guardia.md).

## Ordenarlo sin perder el trabajo

1. Arrastrar una tarjeta a una columna o abrir su ficha y usar «Mover al principio / al final».
2. En Flujos, usar «Subir / Bajar recorrido». Esto ordena la presentación; no modifica los pasos ni las decisiones del flujo.
3. Pulsar **Guardar orden**. Con `npm run tablero`, escribe [disposicion.json](./disposicion.json) y regenera el panel y [tablero.excalidraw](./tablero.excalidraw).

El orden se guarda separado de las fichas. Los agentes no deben reescribirlo al actualizar una funcionalidad. Si las fuentes cambian mientras alguien organiza, el servidor rechaza guardar sobre una revisión antigua; se puede exportar el orden antes de recargar.

Una copia editada manualmente en Excalidraw es un boceto independiente: sus cambios no se importan al panel. Para conservar la organización compartida, mover las tarjetas desde el panel.

Si se usó el HTML sin servidor, ir a «Cómo lo mantenemos → Exportar orden» y luego:

```sh
npm run tablero:importar -- /ruta/solsets-disposicion.json
```

## Cómo aporta cada agente

Antes de empezar, buscar el ID o el nombre de la capacidad. Evitar tarjetas duplicadas por persona, sesión o rama.

Cada persona escribe **un archivo por pieza** en su carril:

```text
docs/equipo/<quito|bishara|amaru>/tablero/
  features/feat-<persona>-<tema>.json
  flujos/flujo-<persona>-<recorrido>.json
  cambios/cambio-<persona>-<AAAAMMDD>-<tema>.json
```

El generador descubre esas carpetas; no hay un índice que todos tengan que editar. Los IDs son estables. Una funcionalidad compartida conserva un único ID y un responsable de mantener su ficha; los colaboradores y el responsable funcional se indican aparte.

Las fichas iniciales fueron consolidadas por Quito en su carpeta. Si otro carril modifica parte de ellas, registra el antes/después y los IDs afectados en una entrada de su propio carril. Esa entrada aparece automáticamente en «Qué cambió» y en la ficha relacionada. La actualización de la explicación o estado común se coordina con quien mantiene la ficha; no se modifica un archivo ajeno sin aviso. Para trasladar su mantenimiento a otro carril, coordinar el movimiento del mismo archivo conservando el ID.

### Pantallas y apps de ejemplo

La pestaña **Mapa de pantallas** une cuatro cosas: apps de ejemplo → pantallas → funcionalidades → flujos.

```text
docs/equipo/<persona>/tablero/
  pantallas/pant-<persona>-<tema>.json   una ficha por pantalla del celular, con su maqueta y sus apps de ejemplo (inspiredBy)
  referentes/ref-<app>.json              una ficha por app de ejemplo del benchmark
  capturas/rutas.json                    qué ruta de la app corresponde a cada pantalla
  capturas/<id-de-pantalla>.png          foto de la app construida (la genera el comando)
```

Quien diseña mantiene la ficha de la pantalla y su maqueta. Quien construye la app no edita esa ficha: declara sus rutas en su propio `capturas/rutas.json`, por ejemplo `{ "pant-quito-alerta": "/alerta" }`, levanta la app en el navegador (`npx expo start --web`) y corre:

```sh
npm run tablero:pantallas -- --url http://localhost:8081
```

El comando abre cada ruta con Chrome sin ventana, en tamaño iPhone (390 × 844, doble resolución), guarda `<id-de-pantalla>.png` en esa carpeta y regenera el panel. El mapa la muestra al lado de la maqueta como "Construida". Lo que solo existe en el teléfono, como una notificación en la pantalla bloqueada, no se puede capturar así y queda como maqueta.

Las apps de ejemplo son opcionales: el mapa parte sin ellas y se encienden con un interruptor. Cada pantalla las enlaza en `inspiredBy`, con el porqué de cada una citado del benchmark (`docs/equipo/quito/research/wellness/`); el porqué aparece al pasar el cursor por la línea.

Enlaces directos: `http://127.0.0.1:4175/#mapa` abre el mapa, `#mapa-apps` lo abre con las apps de ejemplo y `#pantalla=<id>` abre una pantalla.

### Qué debe documentar un cambio

Usar el [protocolo humano](./PROTOCOLO.md) y las [plantillas](./plantillas/):

- Qué problema resuelve y qué cambia para Rodrigo o para el equipo.
- Qué hace la persona, qué hace Solsets y un ejemplo ficticio reconocible.
- Reglas, límites, errores, falta de respuesta y decisiones abiertas.
- Funcionalidades y flujos afectados, con sus IDs.
- Qué existe realmente, en qué rama o despliegue y qué se probó, con evidencia.
- Antes/después del cambio. Los cambios pequeños de una misma tarea pueden agruparse.

Los archivos JSON son la fuente estructurada de la ficha, con textos completos en español. No duplicar la descripción en otro Markdown que pueda quedar desactualizado. Las plantillas Markdown explican cómo redactar; las JSON muestran el formato que lee el tablero.

### Rutina de entrega

```sh
npm run tablero:build
npm run tablero:check
npm run tablero:test
```

1. Actualizar las fuentes de su carril y los recorridos afectados.
2. Generar el panel y Excalidraw. El generador conserva `disposicion.json`.
3. Validar IDs, relaciones, evidencia y que las vistas correspondan a las fuentes.
4. Abrir el panel y leer la ficha como persona; comprobar que el flujo muestre todas sus salidas.
5. Entregar los enlaces y el resultado de verificación junto con el cambio. No hacer commits, push ni publicaciones sin la instrucción correspondiente.

`tablero:check` falla si falta una fuente, hay un ID repetido, una relación no existe, una decisión no tiene sus salidas o las vistas generadas están desactualizadas. No editar `index.html` ni `tablero.excalidraw` para corregir un dato: cambiar la ficha y regenerar.

Las referencias a otras piezas deben existir en esta copia del repo. Una dependencia todavía no disponible se escribe como pregunta o coordinación pendiente, hasta compartir la ficha correspondiente.

## Cómo lo compartimos

El panel reúne lo que está en **esta rama y este computador**. Cada agente lleva sus fichas, cambios y vistas con el mismo trabajo que entrega al equipo. Para ver aportes de otras personas hay que traer e integrar sus cambios según el flujo de ramas acordado. El servidor no mezcla workspaces ni contacta otros computadores.

Si hay conflicto en una vista generada, resolver primero las fichas y `disposicion.json`, y después ejecutar `npm run tablero:build`. No fusionar a mano miles de líneas de HTML o Excalidraw.

No se publicaron páginas ni se configuró una automatización remota o una regla de CI. Esta entrega agrega la rutina compartida a las instrucciones de agentes, un generador comprobable y actualización local mientras el servidor está abierto. Que los agentes sigan la rutina depende de que reciban estas instrucciones; la comprobación detecta vistas obsoletas cuando se ejecuta.

## Respaldo técnico de la herramienta

- [model.mjs](./herramientas/model.mjs): recoge y valida las fichas.
- [build.mjs](./herramientas/build.mjs): genera las dos vistas de manera reproducible.
- [serve.mjs](./herramientas/serve.mjs): acceso local, consulta de cambios y guardado del orden.
- [diagram.mjs](./herramientas/diagram.mjs): mismo modelo de flujo para el panel y Excalidraw.

La herramienta solo escribe su disposición y vistas. No ejecuta acciones de la app ni cambia los estados de producto al mover una tarjeta.
