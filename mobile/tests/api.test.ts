import test from "node:test";
import assert from "node:assert/strict";
import { createPilotClient, validateConnection } from "../src/api";

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
