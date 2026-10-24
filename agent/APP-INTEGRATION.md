# Capacidades del agente para la app — pedido #41

Entrega del carril de Quito. Implementa clasificación con agrupación de incidentes, descarga de texto/transcripción a tareas y propuestas de entrenamiento con las formas `Task`, `Rule` y `AgentQuestion` de `mobile/src/data/types.ts`. El chat con memoria ya existe en el puente v0/v1.

Son **funciones y rutas internas candidatas**, listas para probar en `agent/`. No cambian el contrato de las colas v0/v1 ni conectan por sí solas las rutas `/api/*` de `server/`. El acoplamiento y la persistencia remota corresponden a Amaru (#40); el cliente Expo, a Bishara. La aceptación de #41 contra la app completa sigue pendiente de esa conexión.

## Probar desde main

```sh
cd agent
npm ci
npm run check
# Ocho casos ficticios, ocho inferencias reales con la sesión Codex del operador:
CODEX_BIN="$PWD/node_modules/.bin/codex" node scripts/verify-app.ts
```

El verificador levanta un receptor HTTP de `agent/` en un puerto libre de loopback, usa un almacén temporal en memoria y lo cierra al terminar. Comprueba caída del portal, reformulación sin segundo despertar, sucursales distintas, tres tareas con fechas, negación/acción terminada, regla pendiente y pregunta, inyección en historial sin feedback, y chat con memoria del propietario. `SOL_APP_PROOF_PATH` permite guardar un informe local sin entradas ni respuestas de conversaciones. No toca el piloto activo.

Verificación del 23 de octubre: **100 pruebas automatizadas y TypeScript aprobados; ocho casos HTTP con ocho inferencias reales aprobados en el ensayo final**. Hubo un ensayo intermedio que usó respaldo de reglas en el segundo aviso, mientras también fallaba el acceso a GitHub; no se cuenta como aceptación Codex ni demuestra por sí solo la causa del fallo. Tras recuperar conectividad, el ensayo completo pasó. Esto verifica los casos, no disponibilidad continua del proveedor. El verificador permite hasta 60 segundos por inferencia; el proceso normal conserva `CODEX_TIMEOUT_MS` (25 segundos por defecto) para clasificación y la configuración de chat para descarga/entrenamiento. Si vence su límite, la clasificación usa el respaldo conservador y no promete agrupar reformulaciones.

Para probar las rutas manualmente, arrancar el módulo con `AGENT_ENGINE=codex` y un `AGENT_TOKEN` privado. `POST /v1/app/classify`, `/v1/app/dump` y `/v1/app/training` usan el mismo Bearer interno de `/v1/*`. Sin Codex, clasificación conserva respaldo conservador; descarga y entrenamiento con historial responden **503 `engine_unavailable`**, sin atribuir inferencia real a una respuesta fija. Un historial vacío de entrenamiento devuelve listas vacías con `engine: rules` sin inferir. Entradas inválidas → 400; sin Bearer configurado → solo uso local; Bearer ausente/incorrecto cuando se exige → 401.

Estas rutas son para el operador/backend, no para exponerlas a Expo: el token concede acceso interno y los campos `userId`/`ownerVerified` no autentican a un usuario. En producción el backend debe resolverlos desde su sesión verificada, limitar el contexto al dueño y volver a comprobar sus permisos antes de aplicar resultados. Esta ampliación acepta exclusivamente `synthetic:true`; los datos reales autorizados conservan el recorrido v1 existente.

## Clasificar y no despertar dos veces

Importar `createAppClassifier` de `src/app-classifier.ts` con `{store, runner, model?}`, o llamar `/v1/app/classify`:

```json
{
  "userId": "rodrigo-fixture",
  "requestId": "12345678-1234-4234-8234-123456789abc",
  "ownerVerified": true,
  "synthetic": true,
  "message": {
    "id": "portal-1", "externalId": "fixture-1", "source": "simulated",
    "sender": "Compañero ficticio", "group": "Guardia demo",
    "text": "Se cayó el portal de clientes",
    "receivedAt": "2026-10-23T23:00:00-03:00"
  },
  "recent": []
}
```

Devuelve `ClassifyResult` existente: `decision: wake|report|noise`, `reason` de una línea, `isNew`, `confidence`, `messageId`, `incidentKey`, `engine`, `model`, `fallbackReason` y `kind: classify`. La memoria y el feedback cargados del almacén local se filtran por ese usuario; el backend puede suministrar su implementación de `AgentStore` al importar la función.

Para el segundo aviso, enviar hasta 30 incidentes distintos con `{userId,incidentKey,text,group?,receivedAt}` en `recent`, conservando la clave devuelta en el primero. El servidor debe agrupar su snapshot por clave. Solo se consideran candidatos del mismo chat, no futuros, con menos de 30 minutos de antigüedad. Codex puede elegir una clave de esa lista; el código exige coincidencia declarada de al menos 0.9. Duda, otro servicio o sucursal → clave nueva. Una clave inventada invalida la inferencia y activa respaldo conservador. En respaldo solo un texto normalizado idéntico reutiliza clave. Es una ayuda semántica evaluada con ejemplos, no una garantía de exactitud universal.

**Después**, el servidor ejecuta una vez `decideForServer` (`src/integration/server-policy.ts`) con su estado vigente de guardia, modo y veredictos. `recent` de clasificación es un snapshot para agrupar; `context.recent` de política conserva la hora en que cada incidente habría despertado. No sustituir el segundo por el primero ni reiniciar el plazo por cada duplicado. `wouldWake` en modo sombra es una simulación: el servidor impide los efectos reales. La función de clasificación no dispara avisos ni guarda decisiones.

Esta ruta admite `source: simulated` para la aceptación sintética. El puente existente conserva los controles de origen/dirección de WhatsApp. No se añadió este snapshot al contrato compartido de la cola; acordar esa ampliación en PR separado antes de usar agrupación semántica allí.

## Descargar pendientes

`createAppCapabilities({runner, model?}).dump(input)` o `/v1/app/dump`:

```json
{
  "userId": "rodrigo-fixture",
  "requestId": "12345678-1234-4234-8234-123456789abc",
  "ownerVerified": true, "synthetic": true,
  "text": "Mañana tengo que llamar al dentista, comprar pan y el viernes pagar la luz",
  "source": "you",
  "now": "2026-10-23T20:00:00-03:00",
  "timeZone": "America/Santiago"
}
```

Salida: `{reply,tasks,questions,engine,model}`. Cada tarea tiene `id,title,source,sourceLabel,due,important:false,done:false,createdAt`. `source` admite `you` o `voice`: **voice recibe texto ya transcrito**, no audio. La captura y transcripción pertenecen al flujo de voz; este módulo no las implementa.

El ejemplo produce llamar al dentista y comprar pan el sábado 24, y pagar la luz el viernes 30. Conserva el criterio de la referencia local: un día de semana igual al actual se interpreta como la próxima semana. Los cálculos se hacen en código con fecha local y zona IANA, incluyendo cambios de horario y meses; `due.at` representa el mediodía local como ancla de calendario, **no una hora de recordatorio**. Si el usuario cambia de zona, el consumidor debe conservar la zona original o adaptar la presentación de la fecha.

Cada acción y expresión de fecha exige una cita literal de la entrada. Sin fecha → `someday`; una expresión no soportada → tarea sin fecha y pregunta, sin inventar un día. Se reconocen hoy, esta tarde/noche, mañana, pasado mañana, esta semana, días de la semana y fechas YYYY-MM-DD. Máximo 8.000 caracteres y 20 tareas. Un sentimiento, acción terminada o negada no debe convertirse en tarea; hay evaluación real para esos casos. La cita literal por sí sola no demuestra que un título sea semánticamente correcto: las tareas quedan para revisión.

## Proponer reglas y preguntas

`createAppCapabilities(...).training(input)` o `/v1/app/training` recibe los cuatro campos comunes y `history` con hasta 40 elementos:

```json
{
  "id": "printer-fixture", "userId": "rodrigo-fixture",
  "text": "Mañana revisar la impresora",
  "decision": "wake", "feedback": "should_not_have_woken"
}
```

`decision`: wake/report/noise. `feedback` es opcional; acepta right/should_have_woken/should_not_have_woken. Todos deben pertenecer al usuario del pedido. Las propuestas solo pueden citar elementos con feedback; los mensajes sin evaluar pueden motivar preguntas. El contenido de un tercero nunca cuenta como instrucción ni aprendizaje autorizado.

Salida: `{rules,questions,categories,engine,model}`. Reglas: `{id,text,kind,origin:"feedback",confirmed:false,examples}`. Preguntas: `{id,kind:"question",text,context,options,effects,actions}`, sin `answer` (detalle en la sección siguiente). Máximo 8 reglas y 3 preguntas; cada pregunta tiene de 2 a 4 opciones. No se escribe memoria ni se activa una regla. Se valida que las referencias existan y que su criterio corregido sea coherente: `should_have_woken` exige wake, `should_not_have_woken` exige wait; right conserva wake→wake, report→wait, noise→ignore. Un «no debió despertarme» nunca basta para proponer ignorar el aviso. Las reglas de tipo task requieren otro contexto explícito y no se proponen desde este feedback de guardia. Ante contradicción, el modelo debe preguntar.

## Categorías, titular y contexto (contrato app v2, #61)

Propuesta por confirmar: `docs/equipo/adr/por-confirmar/2026-10-24-categorias-deciden-que-hace-sol.md` y `docs/equipo/bishara/CONTRATO_APP_V2.md`, puntos 2, 3 y 7.

**Clasificar.** `/v1/app/classify` acepta `categories` opcional, hasta 30, con `{id,name,description,action,wakeAtNight}`. `action` es `alert|task|calendar|digest|ignore`. También acepta la forma completa de la app (`status`, `origin`, `color`, `icon`, `createdAt`), pero solo las `active` (o sin `status`) llegan al modelo. Al modelo van id, nombre y descripción como datos de la persona, nunca como instrucciones; `action` y `wakeAtNight` no van al prompt porque la política es código. La respuesta agrega `categoryId` (uno de la lista, o `null`), `summary` (titular de una línea, máximo 120 caracteres) y `context` (hasta 3 líneas: contexto y qué hacer). Un `categoryId` inventado o de una categoría sugerida queda en `null` sin descartar la clasificación. Con respaldo de reglas: `categoryId` es `null`, `summary` es el texto del mensaje recortado y `context` dice que se usó el respaldo. Sin `categories`, todo sigue igual salvo esos tres campos. El tipo es `AppClassifyResult`; los campos son opcionales en `ClassifyResult` porque las colas v0/v1 todavía no los mandan.

**Política.** `decideForServer` acepta `context.category = {wakeAtNight, action}`, la categoría que el servidor resolvió con el `categoryId` desde su propia lista. Si `wakeAtNight` es true, un `report` o `noise` pasa a despertar con `why: "category"`. "Avisos activos" es `night.onCall`: con `false` no despierta (`off_duty`); sin respuesta (`null`) despierta, como hoy. Las reglas oficiales siguen: nuevo o confianza < 0.7 despierta, un duplicado de hace menos de 30 minutos no re-despierta (también si lo pidió la categoría) y el modo sombra no silencia nada. **Decisión conservadora:** una categoría solo puede agregar un despertar, nunca quitarlo. `wakeAtNight:false` o `action:"ignore"` no bajan un `wake` del modelo, ni siquiera con confianza alta y no nuevo. El ADR no dice que una categoría pueda silenciar, y "ante la duda, despierta". Si el equipo quiere que las categorías bajen despertares, se decide en el ADR y se cambia aquí con su prueba.

**Proponer categorías.** `/v1/app/training` acepta `categories` existentes (cualquier estado) y devuelve `categories`: hasta 3 propuestas `{id,name,description,action,wakeAtNight,origin:"sol",status:"suggested"}`. Cada una exige al menos 2 mensajes del historial como evidencia. Nunca vienen activas. Una propuesta con el mismo nombre que una existente o que otra propuesta se descarta. El `id` es estable por usuario y nombre (`sol-…`).

**Preguntas.** En descarga y entrenamiento, cada `AgentQuestion` trae `kind:"question"` (tipo de mensaje del ADR por confirmar de botones), `effects[i]` (una línea: qué hará Sol con la opción i) y `actions[i]` (`alert|task|calendar|digest|ignore|none`, el mismo catálogo de las categorías más `none`). El código exige el mismo largo que `options` y acciones del catálogo; si no, la inferencia entera falla con `engine_unavailable`. Las preguntas de fecha de la descarga traen `actions: ["task","task","task"]`.

Pruebas: `src/app-categories.test.ts` y `src/integration/server-policy.test.ts`, con runner falso. `scripts/verify-app.ts` ya pide categoría, titular y contexto, pero no se ha corrido con Codex real tras este cambio.

## WhatsApp del número de demo

`/v1/app/classify` acepta `source: whatsapp` solo si el servicio arranca con `AGENT_APP_ALLOW_WHATSAPP=true`. Es para el número de demo del equipo, donde se escriben solo mensajes inventados, y sigue exigiendo `synthetic: true`. El correo y cualquier otro origen se rechazan. Decidido por Quito el 2026-10-24 para probar la demo desde WhatsApp.

## Persistencia y reintentos

Las funciones son puras respecto del almacenamiento: preparan resultados sin crear tareas, cambiar memoria ni enviar mensajes. IDs derivados del usuario, requestId y contenido evitan colisiones entre usuarios. Esto **no es una caché de inferencia**: repetir HTTP puede gastar otra llamada y variar el texto del modelo. El servidor debe reservar la operación con UUID, persistir y devolver su resultado aceptado, aplicar altas atómicamente y no reintentar inferencias inciertas. El trabajador v0/v1 conserva sus garantías previas; esta entrega no añade estos tipos de trabajo a su cola.

## Chat existente y pendiente de integración

Para la app multiusuario, usar `processOwnerChat` o el procesador/trabajador v1 documentado en [INTEGRATION-V1.md](INTEGRATION-V1.md). Su respuesta es un delta con `reply.text` y memoria; el adaptador de la API pública convierte a `{reply: string}` si sigue ofreciendo ese contrato. No vincular una app multiusuario a la conversación compartida `demo:web` del piloto.

La aceptación local verifica los cuatro bloques de inteligencia de #41 con Codex. Falta que `server/` acuerde y conecte la ampliación, persista las tareas/propuestas y que Bishara pruebe el recorrido Expo. Ni el verificador ni estas rutas acreditan deploy Railway, OTP, un teléfono físico, push o llamadas.
