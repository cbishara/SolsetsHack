# Soltra es negra siempre, inspirada en Opal, con Sol como avatar

Estado: oficial
Fecha: 2026-10-24
Decidió: Bishara (dueño de `mobile/`), confirmado con Quito y Amaru el 2026-10-24
Carril: bishara
Reemplaza a: `oficiales/2026-10-23-sistema-visual-mi-espacio-con-modo-noche.md`

## Contexto

La primera versión de la app ("Mi espacio": blanco, azul `#2E59E5`, amarillo lima `#E4F51A` y la flecha ↗) se hizo rápido con IA. Funciona, pero no se siente como una app nativa bien terminada, y el lima eléctrico no transmite la calma que vende el producto: que la persona descanse sabiendo que alguien vigila por ella.

La referencia elegida es Opal (finalista del Apple Design Award): negro puro, texto blanco, grises cálidos, interfaz casi monocroma y el color concentrado en un objeto central.

## Decisión

Es la dirección visual oficial. Los detalles se siguen puliendo con el feedback de pantallas, dentro de esta dirección.

1. **Negro siempre.** No hay modo claro. El modo noche sigue existiendo, pero es la misma estética con menos brillo (blancos y colores más tenues para las 3 de la mañana).
2. **Interfaz monocroma.** Botón principal blanco en cápsula, secundarios gris oscuro, tarjetas casi negras con borde de blanco al 8 %. Sin el lima ni la textura de flechas.
3. **Color con significado, solo tres:** la luz cálida de Sol (`#F2CF8C`), tranquilo (salvia `#86D3B6`) y urgente (coral `#FF7B72`).
4. **Brillo ambiental muy leve** arriba de cada pantalla para que el negro no se vea plano. Nunca como gradiente decorativo de fondo.
5. **Sol tiene avatar**: reemplaza la gema de Opal y muestra el estado sin palabras (tranquilo, mirando, te despierto, sombra). Mientras llega el render 3D, es una luz animada en `mobile/src/components/sol-orb.tsx`. El 3D entra como video en loop sobre negro puro, sin motor 3D en la app.
6. **Tipografía**: se mantiene Inter Tight, con titulares en bold y espaciado apretado.
7. **Movimiento**: Reanimated en el hilo de UI. Presión a 0.97 en 120 ms y springs solo cuando hay un dedo. Las pestañas no se animan.

## Por qué

1. Lo oscuro y monocromo se ve profesional y no encandila de noche, que es cuando más se usa la app.
2. Sacar el color de la interfaz hace que el color de Sol y de una urgencia se lean de inmediato.
3. Un personaje transmite "alguien está pendiente por ti" mejor que un ícono, y el jurado lo recuerda.

## Lo que cuesta

1. Se pierde la identidad de "Mi espacio" de Amaru (flecha ↗, "Suelta."). El texto "Suelta." sigue en la bienvenida hasta el feedback de pantallas.
2. Agrega dos dependencias: `react-native-reanimated` (con `react-native-worklets`) y `expo-blur`. Las dos funcionan en Expo Go.

## Hecho en `mobile/`

Tokens nuevos en `src/theme/tokens.ts`, componentes base (botón, tarjeta, lista, chips, switches, presión animada) en `src/components/ui.tsx`, barra de pestañas flotante tipo vidrio, logo Soltra, tarjeta destacada oscura, bienvenida y alerta rediseñadas, y Sol en el inicio, el chat, la alerta y la vista de WhatsApp.
