# Demo: dejarlo encaminado para desconectar

## Preparación

Abrir `/desconectar`. Usar exclusivamente ejemplos ficticios. La prueba web funciona sin claves; para WhatsApp completar [SETUP.md](../SETUP.md#4-kapso--demo-de-desconexión), habilitar respuestas y escribir primero al número de prueba desde un remitente permitido.

Si no hay número conectado, presentar claramente el recorrido local y la conexión pendiente. No decir que se envió un mensaje real.

## Recorrido de tres minutos

1. **Problema:** «Rodrigo sale de su turno, pero los pendientes siguen en su cabeza. Queremos ayudarlo a dejar uno encaminado para desconectar».
2. **Contexto mínimo:** escribir «Terminé mi turno y sigo pensando en el registro de la VPN». SOL conserva la frase y pregunta qué lo frena. Elegir **1**.
3. **Ayuda:** mostrar la propuesta y el texto preparado. Sigue siendo un pendiente abierto; no se creó un ticket ni se confirmó el relevo.
4. **Adaptación:** escribir **MÁS PEQUEÑO**. La propuesta pasa de cinco a dos minutos y aparece la preferencia confirmada.
5. **Continuidad:** escribir **NUEVO**, después «Tengo que preparar el informe del próximo turno», y elegir **1**. SOL empieza directamente con dos minutos. Recargar el panel y comprobar que continúa el mismo asunto.
6. **Corrección:** escribir **CAMBIAR**, elegir **2** y mostrar cómo cambia la ayuda sin perder el pendiente. Escribir **ME AYUDÓ** para registrar la valoración.
7. **Salida:** pedir **RESUMEN**. Mostrar qué quedó preparado y qué sigue pendiente. El usuario puede cerrar sin perder el contexto.

En WhatsApp, realizar los mismos pasos desde el teléfono. Seleccionar esa conversación en el panel: debe aparecer en modo lectura con su mismo contexto. «Aceptada por API» no demuestra entrega; comprobar la respuesta visible en el teléfono.

## Verificaciones operativas

- En modo sombra se guardan propuestas sin enviar. Al activarlo después, escribir un nuevo mensaje; no se reenvían las anteriores.
- Pausar: el mensaje entrante queda en cola. Reanudar: se procesa si corresponde; un timestamp antiguo no habilita respuesta libre fuera de la ventana conservadora.
- Repetir un webhook: una sola respuesta y un solo cambio de contexto.
- **BORRAR**: desaparecen contexto, preferencias e historial en SOL; permanecen los mensajes en WhatsApp y los identificadores técnicos de deduplicación.
- Si el resultado del envío es incierto, revisar Kapso. La demo no reintenta automáticamente para evitar duplicar mensajes.

## Qué afirmar

«Probamos si un pendiente, una pregunta y una corrección bastan para dar ayuda más adecuada. El motor de esta demo es guiado; la conversación y la preferencia persisten. La app nativa y la monitorización son pasos posteriores».

El prototipo anterior sigue disponible en `/app` y `/demo` para comparar. Los mensajes entrantes de WhatsApp de esta rama se dirigen al nuevo flujo de desconexión.
