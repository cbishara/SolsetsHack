# La app usa el sistema visual "Mi espacio" de Amaru, con modo noche

Estado: oficial
Fecha: 2026-10-23
Decidió: Bishara (dueño de `mobile/` desde el trueque de carriles), siguiendo la dirección que eligió Amaru
Carril: bishara

## Contexto

Había dos direcciones para la app:

1. **Ocaso**, de Quito (`docs/equipo/quito/diseno/`): fondo oscuro pizarra, un solo naranja y el sol sobre el horizonte. Las 6 pantallas del tablero (`docs/equipo/quito/tablero/pantallas/`) están dibujadas en esta dirección.
2. **Mi espacio**, de Amaru (`mobile/`, PR #13, y su prototipo web): fondo blanco, azul `#2E59E5`, azul profundo, amarillo lima `#E4F51A`, la flecha ↗ como firma y titulares grandes. Amaru la eligió y descartó Ocaso como portada (`docs/equipo/amaru/TRASPASO_BISHARA.md`, sección 3).

## Decisión

1. La app usa el sistema visual **Mi espacio** de Amaru.
2. Tiene un **modo noche** con la misma marca: fondo azul profundo casi negro, brillo bajo, la flecha apenas visible y el lima reservado para una sola acción por pantalla.
3. El modo noche se activa de dos maneras: **solo, a la hora que la persona programó** (o según su turno), o **a mano**.
4. Ocaso deja de ser la dirección visual. Las pantallas del tablero de Quito siguen valiendo como referencia de **contenido y flujo**, no de estética.

## Por qué

1. Mi espacio tiene identidad propia; Ocaso se parecía a cualquier app de sueño.
2. Un fondo blanco con azul saturado a las 3 de la mañana encandila, y la luz de la pantalla de noche es parte del problema de sueño que atacamos. El modo noche resuelve eso sin cambiar de marca.

## Lo que cuesta

1. Las maquetas Ocaso del tablero quedan desalineadas con la app. Hay que avisarle a Quito para que no se tomen como diseño vigente.
2. Hay que diseñar la versión nocturna de cada pantalla que se usa de noche: guardia, cierre, alerta y descarga.

## Cambios
