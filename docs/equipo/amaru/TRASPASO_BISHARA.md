# Traspaso de SOL móvil a Bishara

23 de octubre de 2026. **Nueva instrucción expresa de Amaru:** Bishara dirige desde ahora el diseño y la evolución de la app; su agente recibe el trabajo, las decisiones y las ideas para llevar SOL más allá de un asistente genérico. Este documento reemplaza el reparto de diseño descrito anteriormente en los documentos de esta sesión. La base publicada es el [PR #13](https://github.com/cbishara/SolsetsHack/pull/13), rama `amaru/mobile-expo`, commit `897dd75d6867b9c61a0f8409406ebdf0c4085649`.

## 1. Mandato y reparto

- **Bishara y su agente:** dirección de diseño, UX, pantallas, componentes, navegación y cliente móvil; convertir estas ideas en un recorrido coherente, implementarlo y demostrarlo. Puede mejorar esta base y proponer cambios de jerarquía, composición y microinteracciones. No necesita copiar cada pantalla literalmente.
- **Quito y su agente:** cerebro, memoria, comportamiento y evaluaciones del asistente. Motor confirmado por Amaru: **agente propio con la cuenta Codex de Quito; Hermes puede venir después**. Pedido [#14](https://github.com/cbishara/SolsetsHack/issues/14), antecedente [#8](https://github.com/cbishara/SolsetsHack/issues/8).
- **Amaru / responsable de `server/`:** contrato, autenticación, persistencia, fuentes, WhatsApp y testing, conforme al traspaso descrito en [#16](https://github.com/cbishara/SolsetsHack/pull/16) y [#17](https://github.com/cbishara/SolsetsHack/issues/17). Base del servidor en [#15](https://github.com/cbishara/SolsetsHack/pull/15). El agente de Bishara coordina dependencias en [#7](https://github.com/cbishara/SolsetsHack/issues/7); no tiene que inventar un backend en la UI.

Los agentes locales de Amaru cierran la línea de diseño con esta entrega. El PR queda disponible para revisión e integración, sin merge ni deploy automático. Quito conserva su carril: delegar a Bishara la experiencia completa no traslada a Bishara las credenciales ni el motor de Quito.

## 2. Qué producto queremos

**SOL ayuda a sacar un pendiente de la cabeza, dejar un siguiente paso posible y poder parar sin perder el contexto.** El objetivo del usuario es simplificar su vida, reducir carga mental y facilitar el descanso. Esto guía el producto; no es una afirmación de eficacia clínica ni una promesa de curar ansiedad o sueño.

El caso Rodrigo —soporte TI, turnos y guardia— da profundidad a los problemas de cansancio, incertidumbre y pendientes. Mi espacio es la puerta de entrada elegida para esta revisión. Si se incorporan funciones de guardia, deben mostrar cobertura y límites reales; no afirmar «puedes dormir, yo vigilo» mientras fuentes, política y alertas no estén verificadas.

La diferencia debe estar en el resultado de cada interacción, no en añadir una pantalla de chat con otro nombre:

| Situación | Resultado que queremos de SOL | Señal para evaluar el diseño |
| --- | --- | --- |
| «Tengo demasiadas cosas en la cabeza» | Ayudar a elegir una, ordenar lo demás y preparar un primer paso | El usuario sale con menos decisiones abiertas, no con otra lista enorme |
| «Hoy estoy agotado» | Reducir el esfuerzo según lo que la persona declaró | Propuesta viable de dos minutos o permiso para dejarlo preparado; sin sermón ni culpa |
| «¿Y si mañana lo olvido?» | Guardar contexto y mostrar qué quedó y cómo retomarlo | Recuperación comprobable al volver, sin prometer recordatorio si no existe |
| «Ya te dije mi horario» | Usar el dato declarado y corregido, sin volver a preguntar | Memoria visible con origen; el horario viejo deja de influir |
| «Esto no me sirvió» | Ajustar la siguiente propuesta a ese feedback | Cambio observable y explicable, no solo un “gracias por contármelo” |
| Continúa por WhatsApp | Recuperar el mismo contexto de la cuenta vinculada | El canal cambia, el usuario no vuelve a contar toda su historia |

## 3. Decisiones confirmadas que hay que conservar

1. **Referencia visual elegida por Amaru:** Mi espacio `/demo?caso=personal` de `codex/sol-desconexion-whatsapp` (`ace9bf11`). Blanco, azul `#2e59e5`, amarillo lima `#e4f51a`, asistente, pendientes y memoria. Amaru rechazó la interpretación Ocaso/nocturna como portada de esta revisión. Bishara puede elevar el acabado manteniendo esta dirección como punto de partida.
2. **Responder y aprender primero; recordatorios después.** Las propuestas útiles pueden aparecer al conversar o abrir la app. No activar avisos salientes ni temporizadores ficticios como si ya estuvieran integrados.
3. Aprender **preferencias, horarios y rutinas declarados**; memoria recuperable y corregible. No inferir perfiles psicológicos ni hábitos desde datos inexistentes. Aprender aquí significa persistir contexto, no reentrenar pesos.
4. El **mismo chatbot en app y WhatsApp**, con comportamiento y memoria comunes tras vincular la identidad de forma verificada. La presentación puede adaptarse al canal.
5. Inferencia real desde la **cuenta Codex de Quito**, nunca sustituirla silenciosamente por la cuenta local de Amaru. Hermes deja de ser requisito inmediato.
6. No responder a terceros haciéndose pasar por el usuario. Una propuesta o borrador no equivale a una acción ejecutada.
7. Solo datos ficticios durante testing/checkpoint. Mostrar errores y estados reales, incluso cuando sea menos vistoso que simular éxito.

## 4. Ideas de evolución para que tenga personalidad y utilidad propias

Estas son **propuestas para que Bishara priorice y diseñe**, no capacidades ya implementadas ni decisiones oficiales de los tres.

### Un recorrido de cierre mental

Convertir «descargar → ordenar → elegir un paso → dejar preparado → retomar» en el hilo conductor. El chat recoge texto libre; una vista estructurada hace visible el resultado. Puede haber un resumen final «Esto quedó encaminado / esto espera / esto necesita una decisión», usando datos reales. Evitar que la conversación crezca sin que nada tenga un lugar.

### Una acción pequeña que de verdad ayude

La respuesta debe producir algo útil para ese pendiente: un texto que revisar, una lista corta de lo que falta, una decisión concreta o un borrador listo para copiar. Ejemplo: ante una compra, ayudar a hacer una lista mínima con lo ya declarado, no responder siempre «dedica dos minutos a pensar en un primer paso». La respuesta genérica de la demo local actual es solo un fixture que Quito debe reemplazar.

### Cerrar por hoy sin culpa

Explorar una acción explícita «Lo dejo por hoy» que conserve contexto y prepare la vuelta. El criterio de progreso sería lo encaminado o aclarado, no una racha de productividad ni un porcentaje ficticio. Evitar notificaciones insistentes, recompensas arbitrarias y mensajes que conviertan descansar en otra obligación.

### Ritmo personal visible y editable

Permitir declarar/corregir horarios y rutinas cuando ayuden a resolver lo actual. Mostrar de manera sencilla «Te propongo esto porque dijiste…». Preguntar lo mínimo: si falta contexto, a lo sumo una pregunta útil. No empezar con un onboarding largo para justificar personalización vacía.

### Memoria bajo control

Diseñar la memoria como una parte comprensible del producto: qué recuerda, de dónde salió, qué cambió y cómo corregirlo/olvidarlo. Separar hechos/preferencias de pendientes y de hipótesis. La eliminación debe confirmar el alcance real: borrar en SOL no borra mensajes de WhatsApp ni registros del proveedor.

### Un lenguaje visual común entre dos canales

App: espacio para ver pendientes, revisar borradores, corregir contexto y entender el estado. WhatsApp: intercambio breve, texto claro, un paso por vez. No necesitan verse idénticos; sí deben sentirse como la misma conversación. El servidor resuelve identidad: nunca unir personas por nombre o por un teléfono escrito en el chat.

### Integraciones y guardia como capacidades comprobadas

Una conexión debe mostrar qué puede hacer y si está disponible. Guardar, programar, enviar y vigilar son estados distintos. Si más adelante se incorporan alertas de guardia, modo sombra y baja confianza deben seguir la política acordada con Quito; un indicador verde de UI no demuestra cobertura. Screen Time queda como experimento secundario hasta una prueba física.

## 5. Lo entregado, archivo por archivo

| Archivo | Para qué sirve |
| --- | --- |
| `mobile/App.tsx` | Cuatro destinos —Mi espacio, SOL, Pendientes, Memoria—, sheet de Ajustes, coordinación de acciones y confirmaciones |
| `mobile/src/ui.tsx` | Tokens comunes, botones, tipografía, estados, semántica y áreas táctiles de 48 pt |
| `mobile/src/workspace-screens.tsx` | Portada, pendiente/plan actual y memoria visible |
| `mobile/src/chat-screen.tsx` | Historial FlatList, compositor, respuesta/errores y reintento pendiente |
| `mobile/src/useSol.ts` | Hidratación, recuperación, borrador, carga remota, protección frente a respuestas antiguas y envío |
| `mobile/src/api.ts` | Adaptador temporal validado, autenticación del piloto y UUID/idempotencia |
| `mobile/src/storage.ts` | Persistencia local, acceso seguro en teléfono y acceso solo en memoria en preview web |
| `mobile/src/model.ts` | Tipos y respuestas locales de ejemplo; **no es el agente inteligente** |
| `mobile/scripts/preview-mobile.mjs` | Marco de revisión web a 320/390/430 puntos, generado en dist |
| `mobile/src/FocusCard.tsx`, `NativeFocus.tsx` | Experimento Screen Time separado; sin validación física |

Se corrigieron carreras de carga que pisaban respuestas nuevas, reintentos que podían caer en demo local y pérdida de borradores por atajos. El texto se borra del compositor solo al confirmar el envío de ese mismo contenido; no cuando termina otro comando. Un error de hidratación permite reintentar lectura sin borrar los datos.

## 6. Qué está probado y qué falta

**Probado localmente:** TypeScript, 12 tests, exportación JS para iOS/Android/web; adaptador contra HTTP con almacenamiento aislado y reinicio; Safari a 320/390/430; navegación, chat, pendiente, memoria, sheet de ajustes, validación de URL, borrador tras recarga y conservación frente a atajos. El manifiesto Expo Go se reinició y verificó como SDK58/modo claro.

**Todavía no probado/integrado:** chat real con el agente propio de Quito; memoria en el backend oficial; identidad individual; continuidad app–WhatsApp; sincronización de varios pendientes; prueba física de teclado/Dynamic Type/VoiceOver; Screen Time real; push/llamadas y despliegue de testing. Las tres clasificaciones en el Mac de Quito que su agente reportó no prueban chat conectado a la app.

El adaptador actual usa `GET /api/disconnect` y `POST /api/disconnect/messages` con Basic y `requestId`, y filtra `demo:web`: una conversación compartida de testing. La propuesta de `server/` usa Bearer y rutas distintas. Se necesita un contrato/adaptador nuevo, no cambiar el nombre del motor ni afirmar integración por pasar fixtures. El piloto tiene un pendiente actual; no inventar una lista remota de tareas.

El piloto Hermes del checkout original de Amaru sigue local, sin publicar su código como implementación oficial. Su contrato y decisiones útiles están resumidos en HANDOFF_AGENTE.md. No asumir que las rutas del piloto existen en main o en Railway.

## 7. Cómo continuar sin perder trabajo

1. Revisar/traer el PR #13 en la rama de Bishara, conservando contexto, tests y estados de fallo. No reconstruir de memoria ni editar un checkout de otro agente en paralelo.
2. Dibujar el recorrido completo desde la referencia Mi espacio y decidir qué mejorar primero. Separar decisiones confirmadas de las propuestas de la sección 4.
3. Cerrar con Quito y el responsable de server el contrato de chat, historial, memoria, borrado, pendientes, identidad e idempotencia (#14/#7). Credenciales por canal privado, no por repo ni bundle móvil.
4. Conectar y verificar una conversación real con la cuenta de Quito; después probar corrección y recuperación tras reinicio. Solo entonces presentar el modo conectado como operativo.
5. Añadir el recorrido de cierre/retoma y la personalización que el contrato realmente soporte. Mantener el estado local claramente identificado mientras una parte siga sin servicio.
6. Revisar en iPhone y publicar capturas, recorrido y resultados comprobados. Preparar un checkpoint que muestre qué funciona y qué está pendiente.

Comandos desde `mobile/`: `npm ci`, `npm run typecheck`, `npm test`, `npm run export:check`; `npm run preview:mobile` genera el marco web y `npm start` abre Expo Go. Guía completa y experimento nativo en [mobile/README.md](../../../mobile/README.md). Las previews de Amaru son locales; no son un despliegue accesible desde la máquina de Bishara.

## 8. Las diez skills y la documentación de referencia

Instaladas en la máquina de Amaru: `expo-native-ui`, `expo-ui`, `expo-router`, `expo-animation`, `expo-design-system`, `expo-data-fetching`, `vercel-react-native-skills`, `mobile-ios-design`, `typography`, `accessibility`. No asumir que están instaladas en la máquina de Bishara. Las fuentes, commits y hashes reproducibles están en [skills-mobile-manifest.json](skills-mobile-manifest.json), y el detalle en [SKILLS_MOBILE.md](SKILLS_MOBILE.md).

Expo Router fue evaluado, pero la app conserva navegación por estado; no hay NativeTabs/Stack/deep links implementados. No se migró a SwiftUI. Expo UI sí se usa para el sheet. Accesibilidad/typography están aplicadas en código, pero VoiceOver/Dynamic Type extremo requieren verificación real.

- [Diseño elegido y flujos](DISENO_MOBILE.md).
- [Estado y evidencia](MOBILE.md).
- [Handoff del agente y contrato temporal](HANDOFF_AGENTE.md).
- [Documentación de Quito](../quito/README.md), investigaciones y ADR del equipo. Los documentos anteriores de Ocaso no sustituyen la referencia que eligió Amaru.

## 9. Prueba de que SOL dejó de ser genérico

Usar un caso ficticio: «Termino a las 18:00, estoy cansado y tengo compras pendientes». El asistente propone algo concreto y pequeño basado en lo dicho. El usuario corrige: «Ahora termino a las 19:00 y prefiero pasos de dos minutos». La memoria cambia, la próxima propuesta se adapta y al cerrar/reabrir se recupera. Una acción rápida no borra otro borrador. Otro usuario no ve esos recuerdos. Tras vincular WhatsApp, se continúa allí sin repetir la historia. Ante caída, el mensaje y el contexto se conservan y el estado se explica.

La entrega debe enseñar ese recorrido con inferencia real y evidencia de persistencia, no solo colores nuevos o respuestas prefabricadas. No medimos éxito por tiempo dentro de la app: el diseño debería permitir resolver lo necesario y salir.
