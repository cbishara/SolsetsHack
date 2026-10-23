# Prueba real de Railway con el Codex de Quito

2026-10-23. Servidor candidato `sol-multiuser-demo`, primero `cba8980`, después `67ec1c7`. Trabajador del Mac de Quito: `8f939ee`, API v0. Token exclusivo leído por Quito desde variables privadas Railway; credenciales Codex nunca salieron de su Mac.

| Prueba | Resultado |
| --- | --- |
| A: escenario `two_minute_steps` | Respuesta engine:codex aceptada en16,7s; memoria de pasos de dos minutos. |
| A: `correct_routine` | Respuesta engine:codex aceptada en12,4s; misma conversación, memoria corregida a cinco minutos. |
| B: `two_minute_steps` | Respuesta engine:codex aceptada en21,3s; otra conversación y memoria de dos minutos. A conserva cinco. |
| Repetir UUID de cada turno | Devuelve el mismo trabajo, sin otra inferencia. |
| Desplegar67ec1c7 | Sesiones, conversación y memoria A/B conservadas. |
| B: `new_concern` | Comando determinista engine:command, correcto; no contado como inferencia. |
| Sesión web real | Crear201, consultar/me200, origen ajeno403, logout200, sesión revocada401; no bearer en JSON. |

Son **tres inferencias reales con entradas ficticias**. La comprobación de acuse perdido fue otra prueba local con el código exacto del trabajador y runner inyectado; no se atribuye a esta red real. No se enviaron OTP ni respuestas WhatsApp, ni se usaron conversaciones personales para esta prueba.

Evidencia compartida en [#24](https://github.com/cbishara/SolsetsHack/issues/24#issuecomment-6377022311). Los registros completos de las sesiones de prueba se mantienen en `.data/` privada, excluida del repo. Cerrar v1 y su recorrido personal sigue en #30/#21; esto no acredita todavía la integración física de iPhone.
