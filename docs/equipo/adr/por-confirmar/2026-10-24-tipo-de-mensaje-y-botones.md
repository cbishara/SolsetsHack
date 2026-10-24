# El agente dice qué tipo de mensaje es, y la app saca los botones de un catálogo fijo

Estado: por confirmar (Quito: "casi oficial, es la idea")
Fecha: 2026-10-24
Propuso: Quito
Carril: quito, con dependencia de bishara (`mobile/`) y amaru (`server/`, contrato)

## Idea

Cada mensaje de Soltra que pide una respuesta termina en acciones. El agente devuelve un campo `kind` con el tipo de mensaje: alerta de noche, parte de la mañana, pendientes anotados, primer paso, pregunta de Soltra o evaluar la decisión. La app no deduce el tipo: con `kind` elige la tarjeta y los botones de un catálogo fijo. Diseño propuesto en `docs/equipo/quito/propuestas/botones-solicitud/` (issue #69).

## Por qué

Que la app deduzca el tipo no cambia el contrato, pero falla cuando la respuesta es ambigua. Con `kind` el agente decide y la app solo dibuja.

## Costo

Cambia el contrato compartido: va en un PR chico aparte, avisando a Bishara y Amaru antes de tocarlo.

## Falta para que sea oficial

El acuerdo de Bishara y Amaru sobre el nombre del campo, los valores y el catálogo de botones.
