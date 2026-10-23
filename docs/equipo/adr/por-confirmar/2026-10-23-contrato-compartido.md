# El contrato entre la app, el servidor y el agente

Estado: por confirmar
Fecha: 2026-10-23
Decidió: los tres
Carril: los tres

## Contexto

Cada carril construye por su lado: Amaru la app (`mobile/`), Bishara el servidor (`server/`) y Quito el agente (`agent/`). Si no fijan antes la forma de los datos que se pasan, cada uno inventa la suya y choca al unir.

## La pregunta

Este es el borrador para discutir. Los nombres van en inglés porque son código. Las fechas van en ISO 8601 con zona horaria.

### Lo que entra (lo arma `server/`)

```ts
type IncomingMessage = {
  id: string;
  source: 'whatsapp' | 'email' | 'simulated';
  sender: string;        // nombre visible, siempre ficticio
  group?: string;        // grupo de WhatsApp, si viene de uno
  text: string;
  receivedAt: string;
};
```

### Lo que devuelve el agente (`agent/`)

```ts
type Classification = {
  messageId: string;
  decision: 'wake' | 'report' | 'noise';   // DESPERTAR / PARTE / RUIDO
  reason: string;        // una línea; se le muestra a Rodrigo
  isNew: boolean;
  confidence: number;    // de 0 a 1
  incidentKey: string;   // igual para todos los mensajes del mismo incidente; sirve para no despertar dos veces en 30 minutos
};

// La política, en código, decide sobre la clasificación.
type Verdict = Classification & {
  wouldWake: boolean;    // en modo sombra solo se muestra; en modo real dispara la alerta
  why: 'urgent' | 'new' | 'low_confidence' | 'duplicate' | 'off_duty' | 'not_urgent';
};
```

### Lo que usa la app (`mobile/` le pide a `server/`)

```ts
type Night = { date: string; onCall: boolean | null; suggestedOnCall: boolean | null; confirmedAt?: string };
type Alert = { id: string; messageId: string; status: 'sent' | 'seen' | 'calling' | 'answered' | 'unanswered'; createdAt: string; seenAt?: string };
type Feedback = { messageId: string; value: 'right' | 'should_have_woken' | 'should_not_have_woken' };
type Worry = { id: string; text: string; createdAt: string };
type MorningReport = { date: string; woke: Verdict[]; pending: Verdict[]; worries: Worry[] };
type Metrics = { nights: number; wakes: number; rated: number; agreement: number; readyForActive: boolean };
type Settings = { mode: 'shadow' | 'active' };
```

1. `GET /api/night/today` → `Night`. `PUT /api/night/today` con `{ onCall }` → `Night`. Contrato de la noche y calendario de turnos.
2. `GET /api/feed?since=` → `Verdict[]`, con el mensaje incluido. Lo que el agente habría hecho.
3. `POST /api/alerts/:id/seen` → `Alert`. El "Lo vi".
4. `POST /api/messages/:id/feedback` con `Feedback` → `{ ok: true }`.
5. `POST /api/worries` con `{ text }` → `Worry`. La descarga de pendientes.
6. `GET /api/report?date=` → `MorningReport`.
7. `GET /api/metrics` → `Metrics`.
8. `GET /api/settings` y `PUT /api/settings` → `Settings`.
9. `POST /api/chat` con `{ text }` → `{ reply: string }`.

Los errores responden `{ error: string }` con un código HTTP 4xx o 5xx.

### Entre `server/` y `agent/`

`classify(message, context) → Classification`, `decide(classification, context) → Verdict` y `chat(text, context) → string`. El `context` lleva la noche actual, los últimos veredictos, los ejemplos de feedback y las reglas aprendidas. Si `server/` y `agent/` van en el mismo lenguaje, son funciones. Si no, son endpoints HTTP con el mismo JSON.

## Por qué

Con el contrato fijo, cada carril puede avanzar con datos falsos que respetan esta forma, sin esperar a los otros.

## Lo que cuesta

1. Hay que decidir en qué lenguaje va `server/`. Si va en TypeScript, como la app, los tipos se escriben una sola vez en `shared/contract.ts` y el compilador avisa cuando alguien rompe el contrato.
2. Expo Go no recibe push desde el SDK 53 ([FAQ de Expo](https://docs.expo.dev/push-notifications/faq/)). Si la demo es en iPhone con Expo Go, la alerta llega por llamada, y `Alert.status` parte en `calling` en vez de `sent`.

## Cambios
