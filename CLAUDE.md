# SolsetsHack: caso Rodrigo (Hackatón Señales, Makana)

Hackatón presencial, 23 y 24 de octubre de 2026. Equipo: Amaru Paillan (diseño, chatbot, dashboard), Cristóbal Gonzalez "Quito" (backend, integraciones, lidera lo técnico), Cristóbal Bishara (Python).
Entrega el sábado 24: solución funcionando + este repo con README de una página (problema, elección, qué se excluyó) + pitch de 5 min. Confirmar hora (13:00 o 15:00); se planifica para las 13:00.

## Reglas que no se rompen
- Solo datos sintéticos. Nada de mensajes, correos ni tickets reales de nadie.
- Todo el código se escribe en el evento. Nada de código, prompts o configuraciones hechos antes (tampoco la carpeta `research/`).

## La solución en una frase
Un agente que hace la guardia de noche por Rodrigo (soporte TI, turnos rotativos, guardia por WhatsApp): revisa lo que entra, lo despierta solo si algo es urgente o nuevo (vibración en el reloj, vía notificación de WhatsApp reflejada) y deja el resto para el parte de la mañana. Las primeras semanas trabaja en modo sombra (no silencia nada, solo muestra qué habría hecho) hasta que Rodrigo confía. Ante la duda, despierta.

## Núcleo técnico
- Clasificación con Claude: DESPERTAR / PARTE / RUIDO + motivo de una línea + `es_nuevo` + `confianza`.
- La política va en código, no en el prompt: `es_nuevo` o `confianza < 0.7` → DESPERTAR; duplicado de un incidente ya despertado en 30 min → no re-despertar; modo sombra nunca silencia.
- Feedback de un toque ("Bien" / "Debió despertarme" / "No debió despertarme") que se guarda y se usa como ejemplo en la siguiente clasificación; puede convertirse en regla.
- Fuentes: WhatsApp entrante a un número de demo (no el de Solsets) + consola web de respaldo + semana simulada. La API oficial no lee grupos existentes: la fuente real queda simulada.
- Ventana de 24 h de WhatsApp: Rodrigo escribe primero antes de la demo.

## Documentos de contexto (leer solo la sección que haga falta)
- Plan de construcción, alcance, datos, mensajes, escenario de prueba y horario: `/Users/bisos/Desktop/experimental/hackathon-sueno/PLAN-HACKATON.md`
- El porqué de cada decisión y las preguntas del jurado: `/Users/bisos/Desktop/experimental/hackathon-sueno/PROPUESTA-EQUIPO.md`

## Convenciones
- Comunicación en español; código e identificadores en inglés.
- Commits chicos y frecuentes; no hacer push ni commits sin que el usuario lo pida.
