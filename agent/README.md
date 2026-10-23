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

El modo predeterminado usa reglas y no requiere claves. En el chat devuelve una respuesta fija identificada como `rules`; no extrae memoria. La consola auxiliar de clasificación está en http://localhost:4181/.

Para usar el Codex instalado en este módulo, comprobar su sesión y elegir el motor:

```sh
npx --no-install codex login status
AGENT_ENGINE=codex PORT=4181 npm start
```

El adaptador ejecuta `codex exec --output-schema` sin herramientas ni configuración personal; el CLI mantiene el login y las llamadas. No copiar credenciales a la app ni al repo. No se declara un modelo concreto si `CODEX_MODEL` no está fijado.

## Probar con el chat de main

En otra terminal, desde `mobile/`, instalar dependencias y ejecutar la app según [su guía](../mobile/README.md). Para la vista web:

```sh
npm ci
npm run web -- --port 8081
```

Abrir http://localhost:8081. En Ajustes, conectar http://localhost:4181 sin contraseña y entrar a SOL. Es la interfaz del equipo publicada en `main`; este módulo no incluye otro diseño móvil.

Ejemplo sintético: «Termino mi turno a las 18:00 y prefiero primeros pasos de dos minutos. Mañana debo revisar la impresora». Después: «Corrijo: termino a las 19:00». Revisar Memoria y preguntar otra vez por el horario. El caso queda aislado en una conversación compartida de testing, no en cuentas individuales.

Para un teléfono en la misma red, el operador puede arrancar con `HOST=0.0.0.0`, usar la IP privada del Mac como URL de la API y abrir la app según la guía móvil. El teléfono físico sigue pendiente de verificación.

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
| `CODEX_TIMEOUT_MS`, `CHAT_TIMEOUT_MS` | Límites de clasificación y chat: 25000 y 60000 ms. |
| `CHAT_CORS_ORIGIN` | Origen permitido para la vista web. En desarrollo el valor predeterminado es `*`. |
| `AGENT_TOKEN`, `CHAT_PASSWORD` | Bearer de operador para `/v1/*` y Basic `solsets` para el chat. Con `NODE_ENV=production` se exigen 24 y 16 caracteres como mínimo. No es autenticación de usuarios finales. |

Los archivos `.data/`, dependencias y credenciales se excluyen de Git. `AgentStore` permite otro almacenamiento, pero esta entrega no implementa Postgres ni una cola compartida. La política y los nombres del agente necesitan adaptación al contrato de `server/`; no basta con cambiar una URL.

## Verificación

```sh
npm run check
node scripts/verify-chat.ts --codex --report ../.context/agent-chat-verification.json
```

`check` ejecuta TypeScript, 47 pruebas y la semana sintética con reglas: 2/2 casos confirmados y coincidencia con 22/39 propuestos. No mide precisión de Codex ni convierte los casos propuestos en criterio aprobado.

La [aceptación con Codex real](./VERIFY-CHAT.md) pasó seis comprobaciones con tres llamadas y dos procesos de servidor: horario declarado, corrección a las 19:00, reintento sin otra inferencia, recuperación tras reiniciar, recuerdo del horario y preferencia, y memoria separada para otro usuario. El informe de cada ejecución queda local; el comando permite repetirla.

Pendientes: servidor compartido, identidad app–WhatsApp, base remota, dispositivo físico y canales de alerta. El trabajador saliente y las funciones de voz que se desarrollan en paralelo se entregan por separado.
