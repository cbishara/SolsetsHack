# El onboarding lee el historial y después corre 5 noches en modo sombra, con check o X

Estado: por confirmar
Fecha: 2026-10-23
Decidió: la deciden los tres (toca el perfil y la política de Quito, la pantalla de Bishara y la conexión de Amaru, desde el trueque de carriles)
Carril: los tres

## Contexto

La idea de Quito es esta. El agente se conecta a WhatsApp y al correo, saca un perfil preciso de Rodrigo y le pregunta con check o X si cada cosa era urgente. Lo urgente lo despierta y lo demás queda en un checklist para el día siguiente. Cuando el perfil está afinado, Rodrigo silencia WhatsApp y el correo, y el agente queda vigilando por él.

El tope es que 2Chat no lee el pasado. Lo dice en sus páginas de webhooks y de lectura de mensajes: "Only those messages sent/received after you made the connection to 2Chat will be returned" (developers.2chat.co/docs/API/WhatsApp/Web/messages/get-group-messages, revisado el 2026-10-23). Por eso el pasado entra por otra vía.

## La pregunta

Se propone un onboarding en dos partes.

Primera parte, la lectura completa:

1. Rodrigo exporta el chat del grupo de guardia con la opción "Exportar chat" de WhatsApp y sube el archivo a la app. Puede subir más de un chat. Lo ideal sería leer todos sus chats, pero WhatsApp exporta de a uno.
2. El agente lee también el correo de las últimas semanas, con la conexión de Gmail que ya tiene el repo.
3. En el historial se ve a qué mensajes contestó Rodrigo de madrugada y en cuánto rato. Eso sirve como pista de qué considera urgente.
4. Con eso, el agente le propone sus primeras reglas ("te despierto si se cae una VPN de sucursal") y Rodrigo marca check o X en cada una. Así parte con buen criterio desde el primer día.

Segunda parte, las primeras noches en modo sombra. Desde la primera noche, 2Chat lee en vivo:

1. Cada noche el agente lee lo que entra y clasifica, pero no silencia nada. Rodrigo sigue recibiendo todo.
2. En la mañana, el parte muestra lo que el agente habría hecho con cada mensaje: "esto te habría despertado" o "esto quedaba para hoy". Rodrigo marca check si acertó o X si se equivocó.
3. Cada marca se guarda y entra como ejemplo en la siguiente clasificación. El backend ya lo hace: manda los últimos 5 feedback al modelo (`backend/agent.mjs:14`). Ese historial de marcas es el perfil.
4. Después de 5 noches seguidas sin ninguna X de "debió despertarme", la app le propone graduarse. Lo que manda no es el porcentaje de aciertos, sino que el agente no deje pasar nada urgente. Una X de ese tipo devuelve la cuenta a cero. Graduarse es silenciar WhatsApp y el correo y dejar pasar solo la alerta del agente. Es la funcionalidad 4 de `oficiales/2026-10-23-cinco-funcionalidades.md`, y depende de que la funcionalidad 2, la alerta imposible de perder, ya funcione.

Un ejemplo con datos inventados. El martes en la noche el agente corre en modo sombra y Rodrigo recibe todo igual. El miércoles en la mañana ve esto:

```
Parte de la mañana · anoche llegaron 3 mensajes

02:14  "Se cayó la VPN de la sucursal Talcahuano"
       Te habría despertado                 [✓] [✗]

03:40  "Mañana alguien ve la impresora del 2° piso?"
       Quedaba para hoy                     [✓] [✗]

04:05  "Falló el respaldo nocturno, job 4412"
       Quedaba para hoy                     [✓] [✗]
```

Marca ✓ en los dos primeros y ✗ en el respaldo, porque es fin de mes y eso sí era urgente. Al tocar ✗ aparece una ventana opcional que se puede saltar:

```
Entonces esto debió despertarte.
Por qué? (opcional)

[Es fin de mes]  [Es un sistema crítico]  [Otro motivo]

                                          [Saltar]
```

Si elige un motivo, la X se vuelve una regla con nombre: "respaldo fallido a fin de mes, despertar". Esa regla aparece en el contrato de la noche (funcionalidad 1), así Rodrigo sabe antes de dormir qué lo va a despertar. Si salta la ventana, la X igual cuenta como ejemplo. Si la ✗ es sobre algo que lo habría despertado, la ventana dice "Entonces esto podía esperar".

En la demo, la semana simulada hace de onboarding. El jurado ve a Rodrigo marcar unos 10 mensajes y al agente cambiar su decisión en el siguiente. El número 10 es ilustrativo y está por definir.

Queda abierto cuánto se le pide a Rodrigo:

1. Opción A, recomendada: solo check o X sobre lo que decidió el agente. Son dos botones. Equivale a "Bien / Debió despertarme / No debió despertarme" del README del carril de la app (hoy `docs/equipo/bishara/README.md`), porque la dirección del error se deduce de lo que el agente había decidido. Cuesta casi nada, porque el feedback ya existe en el backend.
2. Opción B: además de las reglas que salen del historial, un cuestionario corto el primer día con horario de guardia, quiénes escriben y qué sistemas son críticos. Cuesta una pantalla más y más rato con el celular antes de dormir, que la investigación marca como parte del problema.

## Por qué

1. El perfil sale de decisiones del propio Rodrigo y no de un prompt. Eso es lo que un Claude con un prompt no puede copiar.
2. El modo sombra ya era la rampa de confianza. El onboarding no agrega una etapa nueva: le pone nombre y una meta, que es graduarse.
3. Silenciar sin una regla visible puede subir la ansiedad. En laboratorio, el miedo a no enterarse de la alerta le quitó sueño a la gente (Sprajcer 2018, Biological Psychology, n=24; detalle en `docs/equipo/quito/research/sueno/investigacion-sueno-guardia.md`). Por eso se silencia recién al graduarse, con la alerta imposible de perder ya andando.

## Lo que cuesta

1. Las primeras noches no dan calma, porque Rodrigo sigue recibiendo todo. La calma llega al graduarse.
2. Si Rodrigo no marca en la mañana, el perfil no aprende. Marcar tiene que tomar menos de un minuto.
3. Depende de por dónde entre WhatsApp (`por-confirmar/2026-10-23-whatsapp-api-oficial-o-2chat.md`). La API oficial no lee grupos, y con 2Chat el número arriesga un bloqueo.
4. Exportar el chat es un paso manual y va de a un chat. Guías de terceros hablan de hasta 40.000 mensajes sin fotos, pero no está confirmado en la ayuda oficial de WhatsApp. En la demo, el chat exportado es un archivo inventado por el equipo.
5. Que la rapidez de respuesta de madrugada indique urgencia es una hipótesis, no un dato medido.
6. No es lo mismo que `por-confirmar/2026-10-23-bloqueo-de-apps.md`. Ese bloquea redes sociales. Este silencia las fuentes de la guardia porque el agente las vigila.

## Cambios
