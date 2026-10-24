# La app tiene cuatro pestañas (Inicio, Bandeja, Tareas, Agenda) y el perfil se abre desde la foto, arriba a la derecha

Estado: por confirmar
Fecha: 2026-10-24
Decidió: Bishara eligió esta opción la noche del 23; falta que diga si es oficial
Carril: bishara

## Contexto

La pestaña "Tú" juntaba memoria, reglas, sueño, conexiones y ajustes, y Bishara notó que no es donde la gente los busca. Además faltaba un lugar para ver todo lo que llega con su categoría.

## La pregunta

¿Queda así la navegación?

1. **Inicio**: estado de Sol, lo de hoy, la agenda, la bandeja por categoría y la noche.
2. **Bandeja**: todo lo que llegó por WhatsApp, correo y calendario, con lo que entendió Sol, su categoría, lo que hizo y el mensaje original.
3. **Tareas**: listas inteligentes al estilo Recordatorios (Hoy, Programadas, Importantes, Todas).
4. **Agenda**: día, semana y mes, con calendarios de colores.
5. **Sol**: el botón flotante, al lado de las pestañas. Tocarlo abre el chat y mantenerlo presionado dicta.
6. **Perfil y ajustes**: desde la foto arriba a la derecha, en cada pestaña.

## Por qué

En iOS, el perfil arriba a la derecha es donde la gente espera la cuenta y los ajustes. La Bandeja hace visible el trabajo de Sol, y eso da confianza.

## Lo que cuesta

Las rutas `/tu/*` pasan a `/perfil/*`. Quien enlace pantallas desde `server/` o desde notificaciones tiene que usar las rutas nuevas.

## Cambios
