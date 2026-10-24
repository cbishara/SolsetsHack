# La app se llama Soltra; Sol es su agente

Estado: oficial
Fecha: 2026-10-24
Propuso: Bishara
Confirmaron: los tres (Bishara, Quito y Amaru), 2026-10-24
Carril: todos

## Contexto

La app se llamaba "SOL", igual que su agente. En mayúsculas se leía como sigla y competía con el agente al nombrarlos. El logo de la app decía "solsets", que es otra marca.

## Decisión

1. La app se llama **Soltra**. El agente dentro de ella sigue siendo **Sol**.
2. Se escribe "Soltra", con mayúscula inicial. Nunca "SOL" en mayúsculas.
3. **No se renombran los identificadores técnicos**: `com.solsets.sol.demo`, el scheme `sol-demo`, el slug `sol-mobile-demo`, las variables `SOL_*`, la clave de almacenamiento `sol:app:v2` y nombres de carpetas o paquetes. Cambiarlos rompe la app instalada, los builds y las notificaciones push, y en la demo no se nota.
4. Cada uno actualiza los textos visibles y los documentos de su carril. Lo que quede con "SOL" en un lugar técnico o histórico se deja.

## Por qué

1. Separa el producto (Soltra) del personaje (Sol), que ahora tiene avatar propio.
2. Cambiar solo lo visible no arriesga nada a horas de la entrega.

## Lo que cuesta

1. Quedan restos de "SOL" en código, prototipos y documentos viejos. Se aceptan.
2. Quito y Amaru tienen que revisar los textos de `agent/` y `server/` que lleguen a la app o al pitch.

## Hecho en `mobile/` (Bishara)

Nombre visible "Soltra" en `app.json` y `app.config.ts`, logo "Soltra", marco de la vista previa web y `mobile/README.md`. Nota en `README.md` y `CLAUDE.md` de la raíz.
