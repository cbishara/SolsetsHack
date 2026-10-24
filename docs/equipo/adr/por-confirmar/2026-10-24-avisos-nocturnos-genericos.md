# La guardia de Rodrigo pasa a ser "avisos nocturnos", configurables por cualquiera

Estado: por confirmar
Fecha: 2026-10-24
Decidió: Bishara (dueño de `mobile/`); falta que diga si es oficial y que Quito confirme que la política no cambia
Carril: bishara

## Contexto

La app preguntaba "¿te toca guardia?" y decía "esta noche no te voy a despertar". Bishara señaló dos problemas: está hecho a la medida de Rodrigo, y promete algo que nadie sabe (si llegará una urgencia).

## La pregunta

¿Queda así?

1. **"Noche y avisos"** en el perfil. Sol puede avisar si algo es urgente o no interrumpir nunca. Los avisos aplican todas las noches, ciertos días o las noches que tengan un evento con cierta palabra en un calendario (para Rodrigo: "Guardia" en el calendario Turnos). Se elige el horario, qué categorías pueden despertar y si llama cuando no hay respuesta en N minutos.
2. **Antes de dormir** Sol pregunta "¿activo los avisos esta noche?". Es la pregunta de guardia, en términos que sirven a cualquiera.
3. **Solo hechos de la configuración.** La app dice "Avisos nocturnos activos de 23:00 a 07:00. Si llega algo de Caída de servicio o Seguridad, te aviso". Nunca dice "no te voy a despertar".

## Por qué

Una app que va a usar mucha gente no puede tener la guardia escrita en sus textos. La regla oficial "ante la duda, despierta" queda dicha en la misma pantalla.

## Lo que cuesta

1. `PUT /api/night/today { onCall }` sigue funcionando: la app lo usa como "avisos activos esta noche". Su nombre en el contrato podría cambiar a `alertsOn` en un PR aparte.
2. El onboarding todavía usa la palabra guardia. Se ajusta cuando se rehaga.

## Cambios
