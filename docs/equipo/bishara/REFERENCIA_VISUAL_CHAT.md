# Referencia visual del chat con Sol (para el chat web de `agent/console`)

Respuesta de Bishara a #54. Fuente: `mobile/` en `main` después de los PR #57, #59 y #64.

- Pantalla: `mobile/src/app/sol.tsx`
- Tokens: `mobile/src/theme/tokens.ts`
- Componentes: `mobile/src/components/ui.tsx`

**Ojo:** la dirección visual vigente es **Soltra** (`adr/oficiales/2026-10-24-soltra-negro-inspirado-en-opal.md`), no "Mi espacio". Además, por confirmar, se agregó la luz de Sol y el vidrio (`adr/por-confirmar/2026-10-24-luz-de-sol-y-vidrio.md`).

Para verlo en vivo: `cd mobile && npx expo start --web` y abrir `/sol` a 390 px de ancho.

## Colores

Siempre negro: no hay modo claro. "Noche" es la misma estética con menos brillo.

| Token | Día | Noche | Uso en el chat |
|---|---|---|---|
| `bg` | `#000000` | `#000000` | Fondo |
| `surface` | `#161618` | `#121214` | Campos y botones secundarios |
| `card` | `#0D0D0F` | `#0A0A0B` | Tarjetas sólidas |
| `line` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.07)` | Bordes de 1 px |
| `ink` | `#FFFFFF` | `#E6E6E9` | Texto principal |
| `muted` | `#BCBBC0` | `#A09FA5` | Texto secundario |
| `faint` | `#7A7980` | `#6C6B71` | Pistas y estados (nunca info esencial) |
| `sol` | `#FF9548` | `#E3823F` | Burbuja del usuario, botón de micrófono y envío, acentos |
| `solHi` / `solDeep` / `ember` | `#FFD3A1` / `#D9531C` / `#3B1407` | `#EDBF8E` / `#B04419` / `#2A0E05` | Orbe y luz de fondo |
| `onSol` | `#1F0B02` | `#1F0B02` | Texto sobre `sol` |
| `glass` | `rgba(30,30,33,.56)` | `rgba(24,24,26,.56)` | Vidrio: sugerencias y tarjetas de respuesta |
| `glassStrong` | `rgba(38,38,42,.82)` | `rgba(30,30,33,.84)` | Compositor y hojas |
| `glassLine` | `rgba(255,255,255,.10)` | `rgba(255,255,255,.08)` | Borde del vidrio |
| `urgent` / `urgentSoft` | `#FF7B72` / `rgba(255,123,114,.14)` | `#F2756C` / `rgba(242,117,108,.13)` | Errores y "Terminar" en voz |
| `calm` / `calmSoft` | `#86D3B6` / `rgba(134,211,182,.12)` | `#79C2A6` / `rgba(121,194,166,.11)` | Confirmaciones ("Anoté…") |

- **Vidrio**: `backdrop-filter: blur(36px)`, relleno `glass` y borde de 1 px `glassLine`. En la línea superior lleva un brillo de `rgba(255,255,255,.18)` con 16 px de margen a cada lado.
- **Luz de Sol detrás**: dos gradientes radiales que nacen en la parte superior del centro.
  - Base: `solDeep` al 55 %, de 95 % × 90 %.
  - Encima: `sol` al 34 %, de 55 % × 42 %.
  - Abarcan unos 700 px de alto y se apagan hacia el negro.
  - Nunca se usa un fondo de color plano.

## Tipografía

Inter Tight. Sin rótulos en mayúscula.

| Rol | Peso / tamaño / interlineado / espaciado |
|---|---|
| Saludo (`title`) | 700 / 29 / 34 / -1.1 |
| Texto de mensaje (`body`) | 400 / 17 / 25 / -0.2 |
| Botón y énfasis (`bodyStrong`, `calloutStrong`) | 600 / 17 o 15 |
| Secundario (`callout`) | 400 / 15 / 21 |
| Estados y metadatos (`caption`) | 500 / 13 / 18 |

## Espacio y radios

- **Espacios**: 4, 8, 12, 16, 20, 24, 32 y 40. El margen lateral del hilo es 20 y el espacio entre mensajes es 16.
- **Radios**: `md` 14, `lg` 22, `xl` 28, y cápsula. El compositor usa 28 y las tarjetas 22.

## Piezas

1. **Arriba**: una cápsula de vidrio centrada, "× Cerrar", de 38 de alto. A la derecha, el ícono "Nueva conversación".
2. **Vacío**:
   - Orbe de Sol de 130 centrado.
   - Saludo "¿En qué te ayudo, {nombre}?" (`title`).
   - Debajo, una línea en `muted`.
   - Abajo, tarjetas de sugerencia de vidrio de 156 × 104: ícono de destello en `sol` arriba y el texto `calloutStrong` abajo. Se desplazan en horizontal.
3. **Mensaje del usuario**: a la derecha, con un ancho máximo de 84 %.
   - Fondo `sol` y texto `onSol` (`body`).
   - Radio 22, con la esquina inferior derecha en 6.
   - Relleno de 16 × 12.
   - Si fue por voz, lleva un ícono de micrófono de 13.
4. **Mensaje de Sol**: sin burbuja, texto `body` en `ink`.
   - A la izquierda, el orbe de 20 alineado con la primera línea.
   - Debajo, si Sol hizo algo, una **tarjeta de vidrio** con filas de 36:
     - Eventos: barra de 3 px del color del calendario, título y "Hoy, 10:00 a 10:30".
     - Tareas: círculo, título y fecha a la derecha en `muted`.
     - "Deshacer" en `faint`.
5. **Esperando**: el orbe de 20 en estado "urgente" (respira más rápido) y "Sol está pensando…" en `callout` `faint`.
6. **Error**: una línea en `urgent` bajo el mensaje y el botón "Reintentar" en cápsula `surface`. Reintentar usa el mismo UUID de la operación; no se crea una nueva.
7. **Compositor**:
   - Vidrio fuerte de 56 de alto mínimo y radio 28; el texto multilínea crece hasta 140.
   - Placeholder "Pregúntale o cuéntale algo a Sol" en `faint`.
   - A la derecha, un círculo `sol` de 44: micrófono si está vacío, flecha arriba si hay texto. **Un solo micrófono**, sin botón "Dictar" aparte.
8. **Voz**:
   - Orbe de 180 que escala hasta 1.18 con el volumen.
   - Estado bajo el orbe en `callout` `muted`: "Te escucho…", "Pensando…" o "Sol habla · toca el círculo para interrumpir".
   - Controles según la ADR oficial de Quito ("forma que cambia"): `mobile/src/features/sol/voice-controls.tsx`.

## Movimiento

- **Al presionar**: escala 0.97 en 120 ms, con ease-out `cubic-bezier(.23,1,.32,1)`.
- **Mensajes nuevos**: aparecen con un fundido de 220 ms y un desplazamiento hacia arriba de 8 px.
- **Orbe**: respira de 1 a 1.045, en 5,2 s si está tranquilo, 3,6 s si está atento y 1,4 s si está urgente. Con movimiento reducido, queda quieto.

## Qué no hacer

- Colores fuera de esta tabla.
- El azul y el lima de "Mi espacio".
- Degradados en los botones.
- Rótulos en mayúscula.
- Emojis decorativos.
- Fondos blancos.
