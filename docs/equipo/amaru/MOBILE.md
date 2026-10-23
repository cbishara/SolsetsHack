# SOL móvil: estado del trabajo

23 de octubre de 2026. Rama `amaru/mobile-expo`, [PR #13](https://github.com/cbishara/SolsetsHack/pull/13). Documento del carril de Amaru; no modifica los ADR oficiales del equipo.

## La dirección vigente

Amaru rechazó la interpretación nocturna Ocaso y confirmó **Mi espacio `/demo`** de `codex/sol-desconexion-whatsapp`: blanco, azul, amarillo lima, asistente, pendientes y memoria. La referencia de esa rama está comprobada en `ace9bf11dc80937df75eedbd816ae50597eb53cd`.

La portada anterior «Mi noche», sus métricas ficticias y los votos de guardia dejan de dirigir esta revisión. Su historial permanece en los commits previos. La nueva UI reutiliza almacenamiento y conexión, pero reconstruye las pantallas. Diseño y flujos: [DISENO_MOBILE.md](DISENO_MOBILE.md).

## Reparto ejecutado en esta sesión

| Trabajo | Responsable | Resultado |
| --- | --- | --- |
| Referencia y coordinación | Agente principal local de Amaru | Referencia confirmada; documentación publicada; issues #14/#7 actualizados |
| Pantallas y componentes | Sesión local de Amaru «Crea rama demo WhatsApp» | Reconstrucción de Mi espacio, chat, pendiente y memoria |
| Cliente y almacenamiento | Subagente local `mobile_client` | Borrador persistente, recuperación de lectura, protección ante respuestas viejas, validación y reintentos |
| Diez skills y revisión | Subagente local `ios_skills` | Exactamente diez instaladas de fuentes fijadas; checklist y revisión de aplicación |
| Cerebro, memoria, evals, cuenta | Quito, solicitado en #14/#8 | Pedido recibido por su agente; propone Codex propio sin Hermes por ahora; chat integrado pendiente |
| API, identidad, WhatsApp, testing | Bishara, coordinación en #7 | Base TS/Express en PR #15; propone traspaso a Amaru en PR #16; contrato de chat/URL pendientes |

El agente de Quito respondió en #14 y #8. Confirmó recepción y explicó que Quito propone por ahora un agente propio con Codex CLI/SDK y la sesión de su plan; reporta tres clasificaciones ficticias en su Mac. No hay una respuesta de chat integrada a la app verificada. Amaru había pedido Hermes: se le señaló esa diferencia, sin cambiar el adaptador móvil por cuenta propia. No se delegó diseño a Quito.

Durante esta sesión apareció el PR #16, que reporta un acuerdo de intercambio de carriles: mobile pasa a Bishara y server a Amaru. Se avisó que esta reconstrucción, ya solicitada directamente por Amaru y en curso, se cierra en #13 como entrega revisable para continuar desde ella. No se modificaron server ni las ramas de Bishara. El PR #15 contiene una base del servidor, no un chat real ya integrado.

## Lo que el cliente hace

- Se conecta al adaptador de chat del piloto cuando se proporciona testing y acceso. Conserva contexto devuelto por el servidor; sin conexión, muestra ejemplos locales identificados.
- Guarda el borrador con debounce y al pasar a segundo plano. Un envío incierto conserva su UUID y no se reenvía automáticamente.
- Ignora cargas atrasadas que podrían sobrescribir una respuesta nueva. Un envío remoto pendiente no cae en el simulador al perder credenciales en la preview web.
- Valida mensajes, plan, memoria y metadata. Una respuesta incompatible no reemplaza datos útiles ni muestra una conexión falsa.
- Distingue hidratación local y carga remota. Si falla leer almacenamiento, permite reintentar sin borrar los datos.
- Conserva la contraseña en SecureStore en teléfono y solo en memoria en web. El móvil no ejecuta el verificador de inferencias del operador.

El contrato temporal sigue siendo `GET /api/disconnect` y `POST /api/disconnect/messages`, conversación compartida `demo:web`. Tiene un pendiente actual, no una colección remota de tareas. El contrato nuevo requiere identidad individual, historial, memoria, pendientes e idempotencia. [Handoff completo para Quito/Bishara](HANDOFF_AGENTE.md).

## Evidencia y límites

| Comprobación | Resultado |
| --- | --- |
| Cliente TypeScript y pruebas | TypeScript y 12 pruebas aprobados tras validación y recuperación de datos |
| Adaptador HTTP con almacenamiento aislado | Escritura, UUID, deduplicación y recuperación tras reiniciar aprobados con `SOL_ENGINE=demo` |
| Interfaz nueva | Exportación iOS/Android/web aprobada; Safari a 320/390/430, navegación, chat, memoria, ajustes, error de URL y borrador tras recarga comprobados |
| IA con la cuenta de Quito | Quito propone Codex propio sin Hermes; sin respuesta de chat real verificada en esta app ni contrato de integración cerrado |
| Continuidad app–WhatsApp | Objetivo acordado con Amaru, sin vinculación implementada/verificada |
| Prueba física iPhone | Pendiente; la preview web no demuestra teclado/VoiceOver/permisos nativos |
| Screen Time | Experimento secundario heredado, requiere build propia y prueba física; no parte del recorrido central |

Las pruebas con fixtures no demuestran que Hermes esté funcionando. `configured=true` tampoco demuestra una respuesta real ni la identidad del titular de la cuenta. No se usaron credenciales de Amaru para sustituir las de Quito. La selección final de motor no cambia este requisito.

## Diez skills

Fuentes, commits y checklist en [SKILLS_MOBILE.md](SKILLS_MOBILE.md) y [manifest](skills-mobile-manifest.json). Instaladas globalmente en la máquina local; otros agentes deben instalar sus copias si las necesitan. Sus instrucciones se leen manualmente en esta sesión y se descubrirán automáticamente en la siguiente.

Se aplica la marca solicitada por Amaru y las APIs reales de Expo SDK 58 por encima de ejemplos de otros stacks. Las skills de SwiftUI aportan principios de jerarquía, tipografía y accesibilidad: la app continúa en React Native. Evaluar una recomendación no implica que se haya instalado su biblioteca en el producto; la matriz final debe distinguir aplicación, adaptación y trabajo pendiente.

## Para el checkpoint

Abrir Mi espacio → Hablemos → pendiente ficticio → siguiente paso → preferencia de dos minutos → Memoria → volver y comprobar borrador/contexto. Mostrar el estado de conexión tal como sea. Si sigue local, explicarlo; cuando llegue testing de Quito/Bishara, repetir el mismo flujo con una respuesta real y registrar la evidencia aparte.

Cómo abrir y revisar tamaños: [mobile/README.md](../../../mobile/README.md). No hacer merge a main ni presentar producción como entorno de testing: main se despliega.

## Cierre de verificación local

12 pruebas, exportación completa y TypeScript posterior a exportar aprobados. Se excluyeron dist/ios/android generados del chequeo TS para que el compilador no analice el bundle minificado. La prueba HTTP aislada con reinicio ya pasó tras los cambios del cliente. Revisión visual: el sheet de ajustes abre, desplaza y cierra; una URL incompatible muestra error; el borrador sobrevive navegación/recarga; enviar lo limpia; un atajo del chat conserva otro borrador sin enviarlo. Los controles de inferencia fallida y UUID tienen pruebas automatizadas. No se probó una inferencia pagada, WhatsApp ni iPhone físico.
