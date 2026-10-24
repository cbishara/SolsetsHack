# Agente de SOL

Clasificación de guardia y chat con memoria por usuario. Usa Codex CLI con la sesión del operador y guarda el estado del piloto en un JSON local. Solo datos sintéticos. Esta entrega publica el módulo probado; la conexión con el servidor compartido sigue pendiente de contrato y adaptación.

## Arrancar

Requiere Node 24 o superior. Desde la raíz del repo:

```sh
cd agent
npm ci
npm run check
PORT=4181 npm start
```

El modo predeterminado usa reglas y no requiere claves. En el chat devuelve una respuesta fija identificada como `rules`; no extrae memoria. El chat web está en http://localhost:4181/ y la consola auxiliar de clasificación en http://localhost:4181/tools.

Para usar el Codex instalado en este módulo, comprobar su sesión y elegir el motor:

```sh
npx --no-install codex login status
AGENT_ENGINE=codex PORT=4181 npm start
```

El adaptador ejecuta `codex exec --output-schema` sin herramientas ni configuración personal; el CLI mantiene el login y las llamadas. No copiar credenciales a la app ni al repo. El chat usa `CHAT_MODEL` si está definido; si no, hereda `CODEX_MODEL`. Sin ninguno, la CLI elige el predeterminado.

## Conversar desde la web local

Abrir **http://localhost:4181** cuando el agente corre en ese puerto. La entrada muestra una conversación conectada al piloto, con historial, escritura fija abajo, Enter para enviar y Shift+Enter para otra línea. «Lo que dejamos listo» permite consultar el pendiente y la memoria sin abandonar el hilo.

El borrador y el identificador de un envío pendiente se conservan al recargar esa pestaña. Un fallo de red o del motor muestra un reintento explícito con el mismo UUID; no genera una respuesta ficticia ni repite automáticamente la inferencia. La contraseña del piloto, si se exige, permanece solo en memoria del navegador.

Las herramientas de clasificación, feedback y semana simulada se conservan en **http://localhost:4181/tools**. Ambas páginas están disponibles solo en modo de desarrollo. La web utiliza las mismas rutas `/api/disconnect` del chat y la misma conversación local; no reemplaza ni modifica `mobile/`.

### Cierre del chat web · 23 de octubre

El chat web y la configuración independiente de Luna/Fast están integrados en `main` mediante el [PR #42](https://github.com/cbishara/SolsetsHack/pull/42), merge `717148e`. La entrega preparada sobre main aprobó TypeScript y 66 pruebas; la copia local de ejecución aprobó 49 pruebas. Son versiones distintas: esos números no representan una evaluación nueva de los cambios que llegaron después. El tablero pasó build/check y el recorrido en Chrome con Codex real y datos sintéticos pasó diez comprobaciones de memoria, corrección, recarga, cambio de pendiente y borrado. La conversación y su archivo se conservaron al activar Luna.

El piloto de este Mac está disponible en **http://localhost:4181** con `CHAT_MODEL=gpt-6-luna`, `CHAT_REASONING_EFFORT=max` y `CHAT_FAST=true`. Al revisar el cierre a las 21:08 del 23 de octubre (Santiago), el proceso no respondía; se arrancó de nuevo la misma copia aprobada y `/health` volvió a responder, sin cambios en el archivo de estado. Es una ejecución local que depende del proceso y del Mac. El código en main permite esta configuración; arrancar sin esas variables mantiene los valores predeterminados del módulo.

La copia activa parte de `f659ca0` con los archivos del chat web y la configuración de Luna publicados en #42; no se actualiza automáticamente con cada merge. Los trabajos posteriores de contrato y agente multiusuario tienen sus propias entregas (#44 y #45). Este cierre no verifica su recorrido completo con app, servidor y WhatsApp. Queda pendiente esa comprobación compartida y revisar con Bishara lo que espera la app en [#41](https://github.com/cbishara/SolsetsHack/issues/41).

Detalle humano, evidencia y límites en el [registro de cierre](../docs/equipo/quito/tablero/cambios/cambio-quito-20261023-cierre-chat-web.json), la [funcionalidad](../docs/equipo/quito/tablero/features/feat-quito-descarga.json) y el [flujo](../docs/equipo/quito/tablero/flujos/flujo-quito-recuperar-pendientes.json). La selección de Luna conserva su estado de [decisión por confirmar](../docs/equipo/adr/por-confirmar/2026-10-23-chat-luna-max-fast.md); su prueba y activación fueron autorizadas.

## Luna max y Fast en el piloto

El piloto web del Mac usa Luna con razonamiento `max` y solicita Fast con configuración explícita del chat:

```sh
AGENT_ENGINE=codex CHAT_MODEL=gpt-6-luna CHAT_REASONING_EFFORT=max CHAT_FAST=true PORT=4181 npm start
```

Conservar `AGENT_DATA_FILE` y `CHAT_USER_ID` del proceso anterior al actualizarlo mantiene la conversación. `CHAT_MODEL` tiene prioridad sobre `CODEX_MODEL` solo para el chat; la clasificación conserva su configuración. `CHAT_REASONING_EFFORT` admite `none`, `minimal`, `low`, `medium`, `high`, `xhigh` o `max` (predeterminado `low`); el modelo elegido debe soportar el nivel. `CHAT_FAST` admite `true`/`1` y `false`/`0`; solicita `service_tier="priority"` y activa `features.fast_mode`. Un valor inválido impide arrancar para evitar un despliegue con otra configuración por error. Cada arranque informa el modelo, el esfuerzo y si Fast fue solicitado. La respuesta identifica el modelo seleccionado en `inference.model`; el nivel de servicio efectivo del proveedor no se acredita con ese campo.

La comparación sintética del 23 de octubre dio una mediana de 12,7 s para Luna `max` con Fast solicitado y 8,5 s para Sol `low` (tres repeticiones de la misma entrada por configuración). Luna aprobó ocho comprobaciones de memoria, corrección, reintento y borrado. Quito pidió activar esta combinación después de revisar el resultado; no se presenta como una mejora de velocidad. [Configuración oficial de Fast](https://learn.chatgpt.com/docs/agent-configuration/speed).

## Probar con el chat de main

En otra terminal, desde `mobile/`, instalar dependencias y ejecutar la app según [su guía](../mobile/README.md). Para la vista web:

```sh
npm ci
npm run web -- --port 8081
```

Abrir http://localhost:8081. En Ajustes, conectar http://localhost:4181 sin contraseña y entrar a SOL. Es la interfaz del equipo publicada en `main`; este módulo no incluye otro diseño móvil.

Ejemplo sintético: «Termino mi turno a las 18:00 y prefiero primeros pasos de dos minutos. Mañana debo revisar la impresora». Después: «Corrijo: termino a las 19:00». Revisar Memoria y preguntar otra vez por el horario. El caso queda aislado en una conversación compartida de testing, no en cuentas individuales.

Para un teléfono en la misma red, el operador puede arrancar con `HOST=0.0.0.0`, usar la IP privada del Mac como URL de la API y abrir la app según la guía móvil. El teléfono físico sigue pendiente de verificación.

## Servicio compartido en Railway

El equipo puede usar el chat con Codex sin levantar nada en su equipo. El servicio `agent` del proyecto `solsets-hack` corre esta carpeta con su [Dockerfile](./Dockerfile) y responde en https://agent-production-f80a.up.railway.app. Se probó con la app de antes de la base Expo Router (PR #32), que se conectaba en Ajustes con esa URL y la contraseña de testing; la contraseña se pide a Quito por un canal privado. La app actual habla solo con `server/` (`mobile/src/api/server.ts`), y su `/api/chat` responde 503 hasta que `server/` llame al agente (`server/src/app.ts`).

La sesión de Codex del servidor es aparte de la del Mac de Quito: se creó con `codex login --device-auth`, como recomienda la documentación de Codex para máquinas sin navegador. Entra por la variable `CODEX_AUTH_JSON_B64` y [scripts/start.sh](./scripts/start.sh) la copia al disco `/data` la primera vez. Codex renueva el token en ese archivo, así que el disco manda sobre la variable; si se carga una sesión nueva en la variable, el arranque la reemplaza. El estado del piloto también vive en `/data`.

Una sola réplica: el almacenamiento es un archivo y el chat ordena las peticiones dentro de un proceso. La conversación `demo:web` es compartida por todo el equipo. Para desplegar cambios de `agent/`, desde esta carpeta: `railway up --service agent`.

## API del piloto

- `GET /api/disconnect` entrega `{ sessions: [session] }`.
- `POST /api/disconnect/messages` recibe `{ text, requestId: UUID }` y entrega `{ session }`.
- La conversación de testing es `demo:web`, asociada a `CHAT_USER_ID` (`rodrigo-demo` por defecto). No vincula WhatsApp ni implementa identidad multiusuario.
- `session` contiene mensajes, un pendiente actual, un primer paso y memoria visible. No es una lista sincronizada de tareas ni un parte automático.
- El reintento conserva el UUID. Los últimos 500 identificadores se recuerdan y las peticiones se ordenan por sesión dentro de un proceso; la garantía no cubre varias instancias ni identificadores más antiguos.
- Las respuestas reales llevan `inference.engine="codex"`. Un fallo visible usa `unavailable` y conserva el mensaje para reintentar. El HTTP 200 por sí solo no acredita inferencia real.
- `MEMORIA` consulta el contexto; `NUEVO` cambia el pendiente conservando preferencias; `BORRAR` limpia conversación y aprendizaje del chat, conservando onboarding y feedback. No borra mensajes del teléfono ni de WhatsApp.

La memoria nueva requiere una cita literal del mensaje actual. Las claves permiten corregir recuerdos; la clasificación carga solo los del mismo usuario. El contexto utiliza 12 mensajes recientes y hasta 2000 caracteres de memoria; la sesión conserva 60 mensajes. No se envía metadata `agent.engine`, que el cliente actual limita a los nombres del piloto anterior; las respuestas sí identifican Codex.

## Clasificación y política

`POST /v1/classify` recibe `{ message, context: { shadow: true } }`. Mensaje de ejemplo:

```json
{
  "message": {
    "id": "rodrigo-demo:simulated:aviso-1",
    "user_id": "rodrigo-demo",
    "source": "simulated",
    "text": "URGENTE: se cayó el servidor de facturación",
    "received_at": "2026-10-23T23:00:00-03:00",
    "incident_key": "facturacion-demo"
  },
  "context": { "shadow": true }
}
```

El [contrato local](./src/contract.ts) devuelve `DESPERTAR/PARTE/RUIDO`, motivo, confianza, novedad, motor y política aplicada. Situación nueva o confianza inferior a 0.7 fuerzan DESPERTAR. El mismo incidente que ya habría despertado en menos de 30 minutos evita repetir. Si Codex falla, hay respaldo de reglas.

`wake` expresa lo que habría que hacer; en modo sombra también puede ser `true`. El consumidor debe respetar `shadow` antes de producir cualquier efecto. El módulo no envía push ni llamadas y todavía no recibe el estado completo de guardia del servidor.

También existen `POST /v1/feedback`, `POST /v1/memory` y `GET /v1/users/:id/{memory,decisions}`. Son rutas internas para el operador: la autorización por recurso y la identidad canónica del backend siguen pendientes. Los IDs de mensajes deben ser estables y estar separados por usuario desde el ingreso.

## Configuración y almacenamiento

| Variable | Uso |
| --- | --- |
| `AGENT_ENGINE` | `rules` por defecto; `codex` activa el motor real. |
| `PORT`, `HOST` | 4180 y 127.0.0.1 por defecto en desarrollo. |
| `AGENT_DATA_FILE` | Archivo local; por defecto `agent/.data/state.json`. Usar una instancia por archivo. |
| `CHAT_USER_ID` | Usuario de la conversación de testing. No cambiarlo sobre una sesión existente. |
| `CODEX_BIN`, `CODEX_MODEL` | Binario y modelo opcionales para el adaptador. |
| `CHAT_MODEL`, `CHAT_REASONING_EFFORT`, `CHAT_FAST` | Modelo del chat, esfuerzo (low por defecto) y solicitud de Fast (false por defecto). |
| `CODEX_TIMEOUT_MS`, `CHAT_TIMEOUT_MS` | Límites de clasificación y chat: 25000 y 60000 ms. |
| `CHAT_CORS_ORIGIN` | Origen permitido para la vista web. En desarrollo el valor predeterminado es `*`. |
| `AGENT_TOKEN`, `CHAT_PASSWORD` | Bearer de operador para `/v1/*` y Basic `solsets` para el chat. Con `NODE_ENV=production` se exigen 24 y 16 caracteres como mínimo. No es autenticación de usuarios finales. |

Los archivos `.data/`, dependencias y credenciales se excluyen de Git. `AgentStore` permite otro almacenamiento, pero esta entrega no implementa Postgres ni una cola compartida. La política y los nombres del agente necesitan adaptación al contrato de `server/`; no basta con cambiar una URL.

## Verificación

```sh
npm run check
node scripts/verify-chat.ts --codex --report ../.context/agent-chat-verification.json
```

`check` ejecuta TypeScript, 66 pruebas y la semana sintética con reglas: 2/2 casos confirmados y coincidencia con 22/39 propuestos. No mide precisión de Codex ni convierte los casos propuestos en criterio aprobado.

La [aceptación con Codex real](./VERIFY-CHAT.md) pasó seis comprobaciones con tres llamadas y dos procesos de servidor: horario declarado, corrección a las 19:00, reintento sin otra inferencia, recuperación tras reiniciar, recuerdo del horario y preferencia, y memoria separada para otro usuario. El informe de cada ejecución queda local; el comando permite repetirla.

Pendientes: conexión con `server/`, identidad app–WhatsApp, base remota, dispositivo físico y canales de alerta. El trabajador saliente y las funciones de voz que se desarrollan en paralelo se entregan por separado.

La conversación web pasó nueve comprobaciones de interfaz con transporte simulado y diez comprobaciones de recorrido con Codex real y datos aislados: corrección del horario, recarga, NUEVO, BORRAR y separación de memoria. El piloto de localhost:4181 conserva su conversación después de activar Luna max y Fast solicitado. Esto no verifica móvil, WhatsApp ni Railway. Los informes de esta sesión permanecen locales en `.context/`; no se publican datos de conversaciones.
