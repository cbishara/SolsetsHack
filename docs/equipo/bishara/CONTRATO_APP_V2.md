# Lo que la app necesita del server (contrato app v2, propuesta)

Estado: **propuesta de Bishara, por acordar** con Amaru (server) y Quito (agente). No cambia el contrato v0 ni el v1: lo amplía con rutas nuevas. Se discute en la tarea que abre este PR.

Las formas son las de `mobile/src/data/types.ts`. Hoy la app ya funciona sola con esas formas y las guarda en el teléfono. Cada ruta que exista en `server/` reemplaza a la versión local sin cambiar las pantallas.

## Qué usa la app hoy (v0, ya en main)

| Ruta | Para qué |
|---|---|
| `GET /api/feed` | Lo que clasificó el server. Cada veredicto se muestra en la Bandeja con su texto original (`mobile/src/api/map.ts`). |
| `GET/PUT /api/night/today` | "¿Activo los avisos esta noche?" (`onCall` = avisos activos). |
| `POST /api/messages/:id/feedback` | "¿Lo manejé bien?" en cada mensaje. |
| `GET/PUT /api/settings` | Modo prueba o real. |
| `GET /api/sources`, `GET /api/metrics` | Estado de las fuentes y del piloto. |
| `POST /api/chat` | Chat con Sol. Hoy responde 503 y la app contesta lo que sabe responder sola. |
| `POST /api/worries` | La descarga de pendientes. |

## Lo que falta, en orden de impacto para la demo

### 1. El agente detrás del server (Amaru + Quito)
`server/` usa `stubAgent`, que despierta por cualquier cosa nueva. Hay que conectar `createAppClassifier` de Quito (`agent/APP-INTEGRATION.md`). Sin esto, el modo "Servidor en vivo" de la app muestra puras alertas.

### 2. Categoría en cada veredicto (Quito + Amaru)
Agregar a cada veredicto del feed estos campos opcionales:

```json
{ "categoryId": "c-incident", "summary": "VPN de la sucursal Ñuñoa caída", "context": "12 personas sin acceso desde las 03:05…", "confidence": 0.98 }
```

- `summary`: una línea, el titular que se ve en la Bandeja.
- `context`: dos o tres líneas con el contexto y qué hacer.
- Con `confidence < 0.7`, o sin una categoría que calce, la app lo muestra en "Por confirmar".

Mientras no exista, la app infiere la categoría comparando palabras y pide confirmación.

### 3. Categorías por usuario (Amaru; Quito las usa al clasificar)

```
GET    /api/categories                → Category[]
POST   /api/categories                → Category        (la persona crea una)
PATCH  /api/categories/:id            → Category        (acción, despertar, descripción, aceptar una sugerida)
DELETE /api/categories/:id
```

- `Category = { id, name, color, icon, description, action: 'alert'|'task'|'calendar'|'digest'|'ignore', wakeAtNight, origin: 'sol'|'you', status: 'active'|'suggested', createdAt }`.
- El agente recibe las categorías activas con su `description` y las correcciones como ejemplos. Además propone categorías con `status: 'suggested'`.
- **Política en código**: despierta si la categoría tiene `wakeAtNight` y la noche tiene avisos activos, más las reglas oficiales que ya existen (es nuevo, baja confianza o duplicado).

### 4. Corregir un mensaje (Amaru)

```
PATCH /api/messages/:id   { "categoryId": "c-shifts" }    → guarda la corrección como ejemplo para el agente
```

### 5. Tareas (Amaru)

```
GET    /api/tasks              → Task[]
POST   /api/tasks              → Task
PATCH  /api/tasks/:id          → Task
DELETE /api/tasks/:id
```

- `Task = { id, title, notes?, categoryId?, itemId?, source, sourceLabel, date?, time?, reminder, repeat, priority, flagged, why?, subtasks?, done, doneAt?, createdAt }`.
- `date` va como `YYYY-MM-DD` y `time` como `HH:MM`, ambos en hora local.
- `itemId` enlaza la tarea al mensaje original. Lo que el agente deja como tarea se crea en el server con `itemId` y `why`.

### 6. Descarga y transcripción (Amaru expone; Quito ya tiene la inteligencia)

```
POST /api/dump         { "text": "...", "source": "you"|"voice" }  → { reply, tasks, questions }
POST /api/transcribe   multipart, campo "audio" (m4a en iPhone, webm en web)  → { "text": "..." }
```

- `dump` es `createAppCapabilities(...).dump` de `agent/`.
- La app ya graba el audio de verdad (`expo-audio`) y lo manda a `/api/transcribe`. Mientras responda 404 o 503, la app lo dice y deja la nota de voz guardada.

### 7. Preguntas de Sol (Quito genera, Amaru guarda)

```
GET  /api/questions                    → AgentQuestion[]
POST /api/questions/:id/answer { "index": 0 }
```

- `AgentQuestion = { id, text, context?, options[], effects?[], actions?[], itemId?, categoryId? }`.
- `effects[i]` dice en una línea qué hará Sol con cada respuesta; la app lo muestra antes de confirmar.
- `actions[i]` es lo que se aplica: `alert`, `task`, `calendar`, `digest`, `ignore` o `none`.

### 8. Noche y resúmenes (Amaru)

```
GET/PUT /api/night-alerts   → NightAlerts   (mode, when, days, calendarId, keyword, from, to, call, callAfterMin, askBefore)
GET/PUT /api/summaries      → SummarySettings (morning y evening: on, at, channels: ['app','whatsapp'])
```

- El server envía el resumen por WhatsApp a la hora elegida.
- La persona puede responder al resumen ahí mismo. Esa respuesta entra como descarga (`/api/dump`).

### 9. Agenda (Amaru, cuando haya calendario conectado)

```
GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD → CalendarEvent[]
POST / PATCH / DELETE /api/events/:id
```

## Qué no cambia

- La app habla solo con `server/`, nunca directo con `agent/` (#30).
- Solo datos sintéticos.
- En modo prueba no se silencia nada.
