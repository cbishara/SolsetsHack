# Usar Luna max y Fast en el chat local del piloto

Estado: por confirmar; activación del piloto autorizada por Quito
Fecha: 2026-10-23
Carril: Quito (`agent/`)

## Contexto y autorización

Quito pidió «prueba con luna max» y «fast» al revisar la demora del chat web. Después de recibir la comparación y las comprobaciones de memoria, indicó «me encanto manda a deploy».

Esto autoriza activar `gpt-6-luna`, razonamiento `max` y Fast solicitado en el piloto que corre en el Mac, en localhost:4181. No se ha clasificado como decisión oficial del producto; queda registrada aquí para conservar el contexto sin atribuirle ese estado.

## Construcción y alcance

El chat permite fijar `CHAT_MODEL`, `CHAT_REASONING_EFFORT` y `CHAT_FAST` por separado de la clasificación de guardia. Fast se solicita mediante `service_tier="priority"` y `features.fast_mode=true`. La sesión de Codex permanece en el Mac. La actualización conserva el archivo de estado y el usuario del chat.

El despliegue se realiza sobre la copia de ejecución previamente comprobada de `f659ca0`, con la nueva conversación web y esta configuración. El trabajo paralelo de integración y voz sigue en sus archivos de desarrollo.

## Evidencia y límites

Tres repeticiones de la misma entrada sintética dieron una mediana de 12,7 segundos con Luna max y Fast solicitado, frente a 8,5 segundos con Sol low. Luna pasó ocho comprobaciones de memoria, corrección, persistencia, reintento y borrado. La CLI confirmó modelo y razonamiento. La salida observada no acredita el nivel de servicio efectivamente servido por el proveedor: Fast es una configuración solicitada.

Los resultados y las comprobaciones de activación se registran en la [entrada del tablero](../../quito/tablero/cambios/cambio-quito-20261023-desplegar-luna.json). La selección no se presenta como una mejora de latencia ni acredita integración con móvil, WhatsApp o Railway.

Referencia: [configuración oficial de Fast](https://learn.chatgpt.com/docs/agent-configuration/speed).
