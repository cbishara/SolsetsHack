# Tablero humano de funcionalidades, cambios y flujos

Destino elegido por Quito: fichas en el repo con panel visual y Excalidraw. El panel local lee estas fichas; compartir cambios entre computadores sigue el flujo de ramas del equipo.

## Para qué sirve

Que cualquiera del equipo pueda entender qué hace Solsets, por qué existe cada funcionalidad, cómo la usa Rodrigo, qué pasa cuando algo falla y qué está realmente comprobado. El tablero también debe permitir ordenar funcionalidades y ver cómo se conectan, sin tener que leer el código.

Este tablero documenta el trabajo. No decide el alcance del producto ni autoriza acciones del agente. Las decisiones de producto siguen en [adr/oficiales](../../adr/oficiales/).

## Tres piezas conectadas

1. **Funcionalidad:** una capacidad que una persona puede explicar y probar. Ejemplo: «Confirmar si esta noche estoy de guardia».
2. **Flujo:** un recorrido desde una situación inicial hasta un resultado, incluyendo decisiones y desvíos. Ejemplo: «Preparar la noche».
3. **Cambio:** qué se modificó en una funcionalidad o flujo y por qué. Conserva el antes y el después; no necesita crear otra funcionalidad para cada ajuste pequeño.

Cada pieza tiene un identificador estable. Cambiar el título o mover una tarjeta no cambia su identidad. Los enlaces entre piezas usan identificadores, no su posición en el lienzo.

## Cómo se escribe para personas

- Títulos con acción y resultado: «Confirmar guardia», «Reconocer una alerta», «Encontrar mis pendientes al despertar».
- Primero explicar qué le pasa a Rodrigo. Archivos, endpoints y pruebas quedan en una sección de respaldo, debajo del detalle humano.
- Cada explicación incluye un ejemplo ficticio y concreto. Evitar descripciones como «integra la API», «mejora el flujo» o «se optimizó el sistema» sin decir qué cambia para alguien.
- Separar lo que ya ocurre de lo que se propone. Una maqueta, una simulación, una integración aceptada por API y una prueba en dispositivo son evidencias diferentes.
- Escribir también lo que queda fuera y las preguntas abiertas. No completar huecos inventando decisiones.

## Qué contiene una tarjeta de funcionalidad

En el lienzo se ve un resumen: **nombre, para qué sirve, responsable, estado y flujos relacionados**. Al abrirla se lee la ficha completa de la [plantilla de funcionalidad](./plantillas/funcionalidad.md):

1. Necesidad humana y resultado esperado.
2. Qué hace Rodrigo y qué hace Solsets.
3. Un ejemplo de principio a fin.
4. Reglas, límites y comportamiento ante fallos.
5. Cómo se sabe si funciona.
6. Qué está construido, dónde está disponible y qué se probó.
7. Relación con otras funcionalidades, flujos y decisiones.
8. Historial de cambios y evidencia.

Una ficha puede enlazar capturas, una grabación breve o un diagrama. Las imágenes deben estar disponibles para el equipo; una ruta `.context/` de otro computador no basta como evidencia compartida.

## Qué contiene un flujo

Usar la [plantilla de flujo](./plantillas/flujo.md). El lienzo muestra el recorrido con flechas; la ficha conserva la explicación completa.

**Inicio → acción → decisión → resultado.**

Cada paso indica quién actúa: Rodrigo, Solsets o un servicio externo. Cada decisión explica sus salidas con lenguaje concreto: «Sí, estoy de guardia» / «No, esta noche descanso». Los errores y la falta de respuesta tienen salidas visibles; no quedan escondidos dentro de un paso genérico.

Relacionar los pasos con las funcionalidades que los hacen posibles. No confundir el recorrido humano con una lista de llamadas técnicas. Si hace falta un diagrama técnico, enlazarlo como respaldo separado.

## Estados que no se deben mezclar

| Dimensión | Qué responde | Valores orientativos |
| --- | --- | --- |
| Decisión de producto | ¿El equipo quiere esto? | Propuesta / Acordada / Descartada / Retirada |
| Construcción | ¿Cuánto existe? | Sin verificar / Por hacer / En curso / Implementada / Bloqueada |
| Disponibilidad | ¿Dónde puede usarse? | Sin verificar / Solo propuesta / Rama de trabajo / Integrada en main / Desplegada |
| Verificación | ¿Qué comprobamos? | Sin verificar / Simulación / Pruebas automatizadas / Dispositivo real |

Los tipos de verificación pueden coexistir. Siempre indicar fecha, alcance y resultado, incluidos fallos. «Implementada en mi rama» no significa «desplegada»; «aceptado por API» no significa «Rodrigo recibió la alerta».

No usar porcentajes de avance inventados. Una funcionalidad acordada en un ADR oficial no se marca como implementada hasta revisar el código y su evidencia.

## Regla de trabajo para cada agente

### Entender

1. Leer `AGENTS.md` / `CLAUDE.md`, [adr/oficiales](../../adr/oficiales/) y el carril del responsable.
2. Buscar si ya existe una ficha de la capacidad o flujo. Reutilizar su identificador y actualizarla; no duplicar tarjetas por agente, rama o sesión.
3. Registrar la intención, el dueño y lo acordado. Si falta una decisión, dejar la pregunta visible y preguntarla a Quito; no presentar la propuesta como aprobada.

### Implementar

4. Trabajar dentro del carril asignado. Cada responsable mantiene sus fichas; un cambio de otro carril se registra en una entrada propia y se señala la coordinación pendiente.
5. Registrar cada cambio lógico usando la [plantilla de cambio](./plantillas/cambio.md). Los ajustes pequeños de una misma tarea pueden agruparse. Si solo cambia algo técnico, explicar su efecto en confiabilidad, mantenimiento o trabajo del equipo; no inventar un beneficio para Rodrigo.
6. Actualizar tanto las funcionalidades como los flujos afectados. Si cambia una regla, una pantalla o una salida de error, revisar los recorridos que dependían de ella.

### Verificar

7. Documentar qué se probó y qué falta. Usar solo datos sintéticos y no incluir credenciales, mensajes reales o información privada.
8. Comprobar que los enlaces apuntan a piezas existentes y que el resumen del tablero coincide con la ficha. Adjuntar evidencia legible para personas.
9. En la entrega, enlazar las fichas y flujos actualizados y aclarar qué todavía vive solo en la rama. Los documentos acompañan al mismo cambio de código cuando se prepare un PR autorizado; no se hacen commits, push ni publicaciones sin la instrucción correspondiente.

Si un trabajo no afecta una funcionalidad o flujo, dejarlo explícito en su entrada de cambio y explicar por qué. No se exige crear una tarjeta artificial para cada línea de código.

## Trabajo de tres personas sin pisarse

- Mantener las fuentes de cada carril separadas, siguiendo `docs/equipo/<persona>/`. Un único archivo enorme editado por todos facilita conflictos.
- Un cambio conserva su autor y responsable. Las funcionalidades compartidas tienen un responsable de coordinación y colaboradores por parte, según `adr/oficiales/2026-10-23-cinco-funcionalidades.md`.
- Una relación puede cruzar carriles sin dar permiso para editar sus archivos. Registrar la dependencia y la coordinación que falta.
- No sobrescribir posiciones, agrupaciones o notas que el equipo haya ordenado manualmente. La posición visual y la explicación de una funcionalidad deben poder cambiar de forma independiente.
- No eliminar historia para acomodar una nueva versión. Marcar lo reemplazado y enlazar su sucesor.
- En ramas o computadores distintos, las fichas llegan al compartir e integrar las ramas según el flujo Git del equipo. El panel reúne las fuentes presentes en esta copia; no sincroniza computadores en tiempo real.

## Qué debería permitir ver el tablero

- Un mapa de capacidades agrupadas por momentos: preparar la noche, descansar, atender una urgencia y despertar.
- Quién está trabajando cada parte y qué depende de otra persona.
- Abrir una capacidad para leer la explicación, su ejemplo y sus límites.
- Recorrer los flujos y sus decisiones, con enlaces a las capacidades correspondientes.
- Ordenar y agrupar las tarjetas, sin alterar el estado de implementación por moverlas.
- Distinguir propuestas, trabajo en ramas, integración y verificación.
- Leer qué cambió desde la última revisión del equipo.

Estos son requisitos de la experiencia del equipo, no una selección cerrada de herramienta.

## Destino y sincronización elegidos

Quito eligió fuentes versionadas en el repo, panel visual y Excalidraw. `npm run tablero` reúne las fichas de esta copia, abre el panel y actualiza las vistas cuando cambian sus fuentes. No reúne automáticamente ramas sin integrar ni computadores ajenos. El registro formal de esta elección sigue en el ADR por confirmar hasta que Quito indique su categoría.
