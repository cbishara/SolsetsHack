# SOL tiene un rostro de líneas y un cielo animado en la pantalla de voz

Estado: por confirmar
Fecha: 2026-10-24
Decidió: lo decide Quito
Carril: quito (diseño de la voz); la implementación en `mobile/` es de Bishara

## Contexto

Quito encontró la revisión 02 de la voz sin personalidad. Pidió un fondo animado y «algún animatrónico con vida, pero simple», y después algo «más neutro y más de líneas». La [maqueta](../../quito/diseno/voz-sol/README.md) muestra cuatro personajes (A ojos, B antena, C criatura, D líneas) y parte con el D.

## La pregunta

Esto también es oficial, junto con los [controles 05](../oficiales/2026-10-24-controles-de-voz-forma-que-cambia.md)? Quito confirmó como oficiales los controles. Del personaje y del cielo dijo «me encantó» al ver las capturas, pero no se le preguntó por ellos en particular.

1. Personaje D, líneas: dos trazos dentro del círculo que parpadean, siguen el dedo, miran hacia arriba al pensar y quedan horizontales al silenciar, con una antena de trazo fino que flota. Costo medio en Expo, con react-native-svg y animación por fotograma.
2. Cielo animado: estrellas que titilan, una estrella fugaz de vez en cuando, aurora azul, luna, colinas que se mecen y luciérnagas que se aceleran con la voz. Costo medio; en el teléfono hay que cuidar la batería y respetar el movimiento reducido.
3. Volver al círculo sin rostro de la revisión 02, que no cuesta nada nuevo.

Choque con Soltra: el 2026-10-24 Bishara oficializó Soltra ([ADR](../oficiales/2026-10-24-soltra-negro-inspirado-en-opal.md)): negro siempre, interfaz monocroma, color solo para Sol (#F2CF8C), tranquilo y urgente, y brillo ambiental solo arriba, nunca como fondo decorativo. El cielo azul y el círculo azul de la maqueta no cumplen eso. Si se confirma el personaje, hay que decidir cómo adaptarlo:

1. Pantalla de voz negra con brillo leve arriba, estrellas muy tenues y el círculo en la luz cálida de Sol, con los ojos de línea. Costo bajo en la maqueta.
2. Usar en la voz el avatar de Sol que Bishara ya tiene en `mobile/src/components/sol-orb.tsx`, y sumarle solo los ojos. Costo medio y requiere acordarlo con Bishara.
3. Mantener el azul solo en la voz, como excepción. Contradice un ADR oficial, así que necesitaría que Bishara lo acepte.

## Por qué

Un rostro mínimo hace que la persona sepa de un vistazo si SOL escucha, piensa o tiene el micrófono silenciado, sin leer el texto. Los trazos mantienen el tono sobrio que Quito pidió y no compiten con los controles.

## Lo que cuesta

1. Construirlo en Expo es trabajo de Bishara y necesita medirse en un teléfono. La maqueta web no acredita rendimiento ni batería.
2. El personaje y el cielo siguen moviéndose suave con el micrófono silenciado. La superficie del círculo sí queda quieta.

## Cambios
