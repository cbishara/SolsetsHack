# El onboarding son las primeras noches en modo sombra, con check o X

Estado: por confirmar
Fecha: 2026-10-23
Decidió: la deciden los tres (toca el perfil y la política de Quito, la pantalla de Amaru y la conexión de Bishara)
Carril: los tres

## Contexto

La idea de Quito es esta. El agente se conecta a WhatsApp y al correo, saca un perfil preciso de Rodrigo y le pregunta con check o X si cada cosa era urgente. Lo urgente lo despierta y lo demás queda en un checklist para el día siguiente. Cuando el perfil está afinado, Rodrigo silencia WhatsApp y el correo, y el agente queda vigilando por él.

El tope es que no hay historial que leer. 2Chat dice en su documentación: "2Chat can only see messages arriving after the time you connected your number" (developers.2chat.co/docs/API/WhatsApp/Web/webhooks/subscribe, revisado el 2026-10-23). El onboarding no puede partir leyendo el pasado de Rodrigo.

## La pregunta

Se propone que el onboarding sean las primeras noches en modo sombra:

1. Cada noche el agente lee lo que entra y clasifica, pero no silencia nada. Rodrigo sigue recibiendo todo.
2. En la mañana, el parte muestra lo que el agente habría hecho con cada mensaje: "esto te habría despertado" o "esto quedaba para hoy". Rodrigo marca check si acertó o X si se equivocó.
3. Cada marca se guarda y entra como ejemplo en la siguiente clasificación. El backend ya lo hace: manda los últimos 5 feedback al modelo (`backend/agent.mjs:14`). Ese historial de marcas es el perfil.
4. Cuando acierta lo suficiente, la app le propone graduarse: silenciar WhatsApp y el correo y dejar pasar solo la alerta del agente. Es la funcionalidad 4 de `oficiales/2026-10-23-cinco-funcionalidades.md`, y depende de que la funcionalidad 2, la alerta imposible de perder, ya funcione.

En la demo, la semana simulada hace de onboarding. El jurado ve a Rodrigo marcar unos 10 mensajes y al agente cambiar su decisión en el siguiente. El número 10 es ilustrativo y está por definir.

Queda abierto cuánto se le pide a Rodrigo:

1. Opción A, recomendada: solo check o X sobre lo que decidió el agente. Son dos botones. Equivale a "Bien / Debió despertarme / No debió despertarme" del README de Amaru, porque la dirección del error se deduce de lo que el agente había decidido. Cuesta casi nada, porque el feedback ya existe en el backend.
2. Opción B: además, un cuestionario corto el primer día con horario de guardia, quiénes escriben y qué sistemas son críticos. Cuesta una pantalla más y más rato con el celular antes de dormir, que la investigación marca como parte del problema.

## Por qué

1. El perfil sale de decisiones del propio Rodrigo y no de un prompt. Eso es lo que un Claude con un prompt no puede copiar.
2. El modo sombra ya era la rampa de confianza. El onboarding no agrega una etapa nueva: le pone nombre y una meta, que es graduarse.
3. Silenciar sin una regla visible puede subir la ansiedad. En laboratorio, el miedo a no enterarse de la alerta le quitó sueño a la gente (Sprajcer 2018, Biological Psychology, n=24; detalle en `docs/equipo/quito/research/sueno/investigacion-sueno-guardia.md`). Por eso se silencia recién al graduarse, con la alerta imposible de perder ya andando.

## Lo que cuesta

1. Las primeras noches no dan calma, porque Rodrigo sigue recibiendo todo. La calma llega al graduarse.
2. Si Rodrigo no marca en la mañana, el perfil no aprende. Marcar tiene que tomar menos de un minuto.
3. Depende de por dónde entre WhatsApp (`por-confirmar/2026-10-23-whatsapp-api-oficial-o-2chat.md`). La API oficial no lee grupos, y con 2Chat el número arriesga un bloqueo.
4. No es lo mismo que `por-confirmar/2026-10-23-bloqueo-de-apps.md`. Ese bloquea redes sociales. Este silencia las fuentes de la guardia porque el agente las vigila.

## Cambios
