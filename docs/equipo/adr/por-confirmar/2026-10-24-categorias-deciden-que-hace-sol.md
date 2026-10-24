# Cada cosa que llega cae en una categoría de la persona, y la categoría decide qué hace Sol

Estado: por confirmar
Fecha: 2026-10-24
Decidió: idea de Bishara conversada con Quito. La deciden Quito (agente) y Amaru (server) junto con Bishara, porque toca el contrato compartido
Carril: los tres

## Contexto

Hasta ahora el agente decide DESPERTAR, PARTE o RUIDO por mensaje. Eso sirve para la guardia de Rodrigo, pero no para alguien sin guardia ni para el resto del día. Bishara propuso categorizar como en el correo y dejar que la persona decida qué hacer con cada categoría.

## La pregunta

¿Se adopta este modelo?

1. **Categorías propias.** Cada categoría tiene un nombre, un color, un ícono y una descripción en palabras simples de cómo reconocerla. Ejemplo: "Caída de servicio: un sistema que usan clientes o sucursales deja de funcionar".
2. **Qué hace Sol** con lo de cada categoría: avisar al tiro, crear una tarea, agendar, dejarlo en el resumen o silenciarlo.
3. **De noche**: cada categoría dice si puede despertar a la persona.
4. **Propuestas de Sol.** Sol propone categorías nuevas cuando ve un patrón. Ejemplo: "Respaldos", porque llegaron 5 avisos este mes. No cambia nada hasta que la persona acepta.
5. **Por confirmar.** Lo dudoso se muestra con la categoría sugerida y se confirma con un toque. Corregir una categoría entrena a Sol.
6. **Política en código.** La regla de despertar se vuelve "la categoría puede despertar y la noche tiene avisos activos". Se mantienen las reglas ya oficiales: es nuevo o tiene baja confianza → despertar; un duplicado no vuelve a despertar; en modo sombra no se silencia nada.

## Por qué

1. Sirve a cualquier persona, no solo a quien hace guardias.
2. Lo que la persona configura se entiende sin leer reglas.
3. La corrección de un toque es el ejemplo que el agente ya sabe usar.

## Lo que cuesta

1. Hay que ampliar el contrato. `classify` tendría que devolver además `categoryId` y `confidence`, y el server tendría que guardar las categorías por usuario. Detalle en `docs/equipo/bishara/CONTRATO_APP_V2.md`.
2. Mientras eso no exista, la app infiere la categoría de lo que manda el server comparando palabras (`mobile/src/api/map.ts`). Es un respaldo que pide confirmación, no clasificación de verdad.

## Cambios
