import test from "node:test";
import assert from "node:assert/strict";
import { createPilotClient, restorePending, validateConnection } from "../src/api";

test("credentials require HTTPS, URLs cannot include embedded credentials or paths", () => {
  assert.equal(
    validateConnection({
      url: " https://testing.example.com/ ",
      password: "demo",
    }).url,
    "https://testing.example.com",
  );
  assert.throws(
    () =>
      validateConnection(
        { url: "http://192.168.1.10:4187", password: "secret" },
        true,
      ),
    /HTTPS/,
  );
  assert.throws(
    () =>
      validateConnection({
        url: "https://name:secret@example.com",
        password: "",
      }),
    /credenciales/,
  );
  assert.throws(
    () => validateConnection({ url: "https://example.com/api", password: "" }),
    /origen/,
  );
  assert.throws(
    () =>
      validateConnection(
        { url: "http://public.example.com", password: "" },
        true,
      ),
    /HTTPS/,
  );
  assert.equal(
    validateConnection({ url: "http://192.168.1.10:4187", password: "" }, true)
      .url,
    "http://192.168.1.10:4187",
  );
});
test("pilot reads only demo:web and never exposes another WhatsApp context", async () => {
  const client = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async () =>
      Response.json({
        sessions: [
          { id: "wa:someone", messages: [{ text: "private" }] },
          { id: "demo:web", messages: [] },
        ],
      }),
  );
  assert.deepEqual((await client.load()).sessions, [
    { id: "demo:web", messages: [] },
  ]);
});
test("network uncertainty has no automatic resend and retry uses the same request ID", async () => {
  const calls: unknown[] = [];
  const client = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async (_url, options) => {
      calls.push(JSON.parse(String(options?.body)));
      if (calls.length === 1) throw new Error("connection lost");
      return Response.json({
        duplicate: true,
        session: { id: "demo:web", messages: [] },
      });
    },
  );
  const turn = {
    text: "Pendiente ficticio",
    requestId: "1234",
    url: "https://testing.example.com",
  };
  await assert.rejects(client.send(turn), /connection lost/);
  assert.equal(calls.length, 1);
  await client.send(turn);
  assert.deepEqual(calls[0], calls[1]);
  await assert.rejects(
    client.send({ ...turn, url: "https://elsewhere.example.com" }),
    /otra conexión/,
  );
});
test("auth and incompatible responses do not silently turn into a local simulation", async () => {
  const auth = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async () => new Response("", { status: 401 }),
  );
  await assert.rejects(auth.load(), /acceso del equipo/);
  const invalid = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async () =>
      Response.json({
        sessions: [
          { id: "demo:web", messages: [{ id: "x", role: "assistant" }] },
        ],
      }),
  );
  await assert.rejects(invalid.load(), /conversación de prueba/);
});

test("invalid memory and plans cannot replace usable conversation content", async () => {
  const malformed = [
    { memory: [{ key: "routine", value: { nested: "not text" } }] },
    { memory: {} },
    { plan: { title: "Plan", nextStep: 12 } },
    { preference: { minutes: "two" } },
    { messages: [null] },
  ];
  for (const fields of malformed) {
    const client = createPilotClient(
      { url: "https://testing.example.com", password: "" },
      async () => Response.json({ sessions: [{ id: "demo:web", messages: [], ...fields }] }),
    );
    await assert.rejects(client.load(), /conversación de prueba/);
  }
});

test("an acknowledged Hermes failure remains a visible failed turn with previous memory", async () => {
  const session = {
    id: "demo:web",
    messages: [{ id: "reply", role: "assistant", text: "El modelo no está disponible.", inference: { engine: "unavailable", model: null, error: "not configured" } }],
    memory: [{ key: "routine", value: "Termino a las 19:00", evidence: "Termino a las 19:00" }],
    plan: null,
  };
  const client = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async () => Response.json({ session }),
  );
  const value = await client.send({ text: "Un pendiente ficticio", url: "https://testing.example.com", requestId: "3234e9b8-c660-4a67-8076-ad730c5393b7" });
  assert.deepEqual(value, session);
  assert.equal(value.messages[0].inference?.engine, "unavailable");
});

test("pending request recovery preserves the original id and fails closed on corruption", () => {
  const pending = { text: "Borrador ficticio", requestId: "3234e9b8-c660-4a67-8076-ad730c5393b7", url: "https://testing.example.com" };
  assert.deepEqual(restorePending(JSON.stringify(pending)), pending);
  assert.equal(restorePending(null), null);
  assert.throws(() => restorePending("{"), /No se ha reenviado ni borrado/);
  assert.throws(() => restorePending(JSON.stringify({ ...pending, requestId: undefined })), /No se ha reenviado ni borrado/);
  assert.throws(() => restorePending(JSON.stringify({ ...pending, text: "" })), /No se ha reenviado ni borrado/);
});

test("metadata cannot report a truthy string as configured or render non-text model values", async () => {
  const malformed = [
    { agent: null },
    { agent: { engine: "hermes", configured: "false", model: "model" } },
    { agent: { engine: {}, configured: true } },
    { agent: { engine: "hermes", configured: true, model: {} } },
    { connection: null },
    { connection: { chatUrl: {} } },
    { connection: { chatUrl: "javascript:alert(1)" } },
    { connection: { chatUrl: "https://wa.me.invalid.example/12345678" } },
  ];
  for (const fields of malformed) {
    const client = createPilotClient(
      { url: "https://testing.example.com", password: "" },
      async () => Response.json({ sessions: [], ...fields }),
    );
    await assert.rejects(client.load(), /incompatible|inválido/);
  }
});

test("known metadata is retained and unrelated server fields are not copied to the client", async () => {
  const agent = { engine: "hermes", configured: false, model: null };
  const connection = { chatUrl: "https://wa.me/56912345678?text=Hola%20SOL" };
  const client = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async () => Response.json({ sessions: [], agent: { ...agent, missing: [] }, connection, unknown: { nested: true } }),
  );
  assert.deepEqual(await client.load(), { sessions: [], agent, connection });
  const absentLink = createPilotClient(
    { url: "https://testing.example.com", password: "" },
    async () => Response.json({ sessions: [], agent, connection: { chatUrl: null } }),
  );
  assert.equal((await absentLink.load()).connection?.chatUrl, null);
});
