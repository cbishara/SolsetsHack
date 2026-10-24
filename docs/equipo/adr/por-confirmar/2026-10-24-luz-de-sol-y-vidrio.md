# Soltra sigue negra, pero Sol tiñe con luz ámbar las pantallas donde está y las superficies flotantes son de vidrio

Estado: por confirmar
Fecha: 2026-10-24
Decidió: Bishara (dueño de `mobile/`) eligió esta opción la noche del 23; falta que diga si es oficial
Carril: bishara

## Contexto

La dirección oficial `oficiales/2026-10-24-soltra-negro-inspirado-en-opal.md` deja la interfaz monocroma y prohíbe el gradiente de fondo. Bishara la revisó en el teléfono y pidió que se vea más pro, con la referencia de una app de asistente con gradientes cálidos, vidrio esmerilado y un orbe al centro.

## La pregunta

¿Se ajusta la dirección oficial así?

1. **Negro con la luz de Sol (elegida por Bishara).** El fondo sigue negro. En Inicio, el chat, el perfil y el detalle de un mensaje, Sol emite un gradiente ámbar-naranja desde arriba (`sol #FF9548`, `solDeep #D9531C`, `ember #3B1407`). Las tarjetas que flotan sobre esa luz, las barras y las hojas son de vidrio (desenfoque más relleno translúcido y un borde de 1 px).
2. **Colores de categoría.** Las categorías de la persona son el único otro color, siempre como punto, etiqueta o ícono pequeño y nunca como fondo (`categoryColors` en `mobile/src/theme/tokens.ts`).
3. **Sin títulos en mayúscula.** Los rótulos de sección van en minúscula y semibold, sin el texto chico en mayúsculas con espaciado.

## Por qué

1. El color concentrado en Sol mantiene la calma de Opal y hace que el personaje se sienta vivo y presente.
2. Las categorías necesitan color para reconocerse de un vistazo, como las etiquetas del correo.
3. Los rótulos chicos en mayúscula leían como interfaz generada por IA.

## Lo que cuesta

1. Si se confirma, la ADR oficial de Soltra recibe un cambio fechado que permite este gradiente.
2. Desenfoque y gradientes cuestan más en teléfonos viejos. En Android el vidrio cae a un relleno sólido.

## Cambios
