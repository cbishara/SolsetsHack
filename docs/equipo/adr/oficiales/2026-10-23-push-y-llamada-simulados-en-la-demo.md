# En la demo, el push y la llamada se muestran simulados; el esfuerzo va a conectar el servidor con el agente

Estado: reemplazada parcialmente por [2026-10-24-llamada-real-para-despertar.md](2026-10-24-llamada-real-para-despertar.md); la llamada real pasa a ser objetivo de la entrega. Se conserva el push simulado y la cadena real servidor-agente-app.
Fecha: 2026-10-23
Decidió: los tres (lo propuso Quito y lo confirmó con Amaru y Bishara)
Carril: los tres

## Contexto

La auditoría del 23 de octubre a las 21:00 (`docs/equipo/quito/auditoria-2026-10-23.md`) encontró que el push y la llamada a los 3 minutos no existen en ninguna capa. `expo-notifications` no está instalado en `mobile/`, el notificador de `server/src/guard.ts:15-19` solo escribe un log y no hay proveedor de llamadas. Además el push no funciona en Expo Go desde el SDK 53 y pide un build propio. Al mismo tiempo, el servidor clasifica con un clasificador falso (`server/src/index.ts:14`) en vez de llamar al agente.

## Decisión

1. En la demo del sábado, el push y la llamada de respaldo se muestran simulados dentro de la app: la pantalla de alerta, la cuenta de 3 minutos y la llamada. En el pitch se dice en voz alta que esa parte es simulada.
2. El esfuerzo de esta noche va a la cadena real: WhatsApp entra al servidor, el servidor llama al agente, la política decide y la app muestra el resultado.
3. Lo simulado tiene que reaccionar a una alerta real del servidor, no a datos de ejemplo. Si el agente decide DESPERTAR, la pantalla de alerta se abre con ese mensaje.

## Por qué

Conectar servidor y agente es lo que prueba que el producto funciona: sin eso, lo que se ve en la app no pasa por el agente ni por su política. El push real exige un build propio de Expo y un proveedor de llamadas, dos dependencias externas que no se alcanzan a probar bien antes de las 13:00 del sábado.

## Lo que cuesta

1. El jurado no ve un teléfono sonando de verdad. Hay que contarlo con honestidad para que no parezca que se esconde.
2. La ficha `feat-bishara-alerta-respaldo` sigue sin construir. Si sobra tiempo después de conectar la cadena, el push real es lo siguiente.
3. El README de una página tiene que listar el push y la llamada en "qué se excluyó".

## Cambios

- 2026-10-24: Quito confirmó como oficial priorizar la llamada real para despertar al iPhone. La nueva decisión reemplaza la simulación de llamada como aceptación; el texto anterior queda como historia del acuerdo del 23 de octubre. Push real sigue excluido y se conserva el plazo de 3 minutos sin confirmación. Esto no acredita implementación ni prueba física.
