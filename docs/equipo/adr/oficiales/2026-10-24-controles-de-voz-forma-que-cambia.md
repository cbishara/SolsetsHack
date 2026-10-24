# Los controles de la voz de SOL usan la "forma que cambia" con los tokens de Bishara

Estado: oficial
Fecha: 2026-10-24
Decidió: Quito
Carril: quito (diseño de la voz); la implementación en `mobile/` es de Bishara

## Contexto

En la revisión 02 de la voz, los tres controles (Silenciar, Ver texto, Terminar) tenían relieve y degradado propios, distintos de los botones de la app. Quito los quería planos y elegantes, con animaciones simples, fluidas y precisas. Pidió diez opciones de referencia, que están en la [maqueta](../../quito/diseno/voz-sol/README.md) con `?view=buttons`.

## Decisión

1. Los controles de la pantalla de voz usan la opción 05, "forma que cambia", en la línea de Material 3 Expressive. En reposo el botón es redondo. Al presionarlo, o mientras el micrófono está silenciado, pasa a un cuadrado suave con un resorte.
2. Los colores, radios, tamaños y tiempos salen de `mobile/src/theme/tokens.ts`, hoy el sistema Soltra ([ADR](./2026-10-24-soltra-negro-inspirado-en-opal.md)).
   1. Noche: fondo `surface` #121214 con borde `line`, icono `ink` #E6E6E9, etiqueta `muted` #A09FA5. Silenciado: relleno `accent` #E6E6E9 con icono `onAccent` negro. Terminar: `urgentSoft` con icono `urgent` #F2756C.
   2. Día, que en Soltra también es oscuro: fondo `surface` #161618, icono `ink` blanco, etiqueta `muted` #BCBBC0. Silenciado: `accent` blanco con icono negro. Terminar: `urgentSoft` con icono `urgent` #FF7B72.
   3. Tamaño `size.fab` 56; Terminar mide 72 de ancho. El radio va de redondo a `radius.lg` 22.
   4. Movimiento `motion`: al presionar se achica a `pressScale` 0,97 en 120 ms; el color cambia en 200 ms con `easeOut`; la forma usa el resorte `snapBack` (400 ms, amortiguación 0,8), que Soltra reserva para cuando hay un dedo.
3. Al silenciar, el icono del micrófono pasa a tachado con un barrido diagonal.
4. Las etiquetas van bajo cada botón, en 13 px como `type.caption`.

## Por qué

Quito eligió la 05 entre las diez («me gusta el forma que cambia, alinéalo a los colores de Bishara») y la confirmó como oficial el 2026-10-24 («SI OFICIAL ME ENCANTO»). Usar los tokens de la app evita un segundo sistema visual dentro de la voz. Mientras Quito elegía, Bishara reemplazó "Mi espacio" por Soltra (PR #57, 2026-10-24 00:54); como el pedido fue alinearlos a los colores de Bishara, los controles siguen los tokens de Soltra y no los anteriores.

## Lo que cuesta

1. Construirlo en Expo es trabajo de Bishara. El cambio de forma con resorte y el barrido del icono se pueden hacer con Reanimated, que Soltra ya agregó, y hay que medirlos en un teléfono. La maqueta es web y no acredita rendimiento en el teléfono.
2. La 05 es la que más se mueve de las diez. Si en el teléfono compite con el círculo de SOL, se puede bajar el resorte sin cambiar la decisión.
3. En la maqueta las etiquetas usan la fuente del sistema si Inter Tight no está instalada. La app ya carga Inter Tight.
4. Si los tokens de Bishara cambian, los controles los siguen. Los valores de arriba son los de `main` al 2026-10-24, después del PR #57.
5. El resto de la pantalla de voz de la maqueta (cielo azul, círculo azul, modo día blanco) es anterior a Soltra y choca con su regla de negro siempre y color solo para Sol. Su adaptación está en la [pregunta abierta del personaje y el cielo](../por-confirmar/2026-10-24-personaje-de-lineas-y-cielo-animado.md).

## Cambios

2026-10-24: Bishara los construyó en `mobile/src/features/sol/voice-controls.tsx` (`ShapeButton`, PR #64, ajustado en #66) con Reanimated y los tokens de Soltra.
