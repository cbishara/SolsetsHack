import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import net from "node:net";
import { createPilotClient } from "../src/api";

// Runs only a synthetic local server with an isolated file store and no provider keys.
async function main() {
  const source = process.env.SOL_PILOT_DIR;
  if (!source)
    throw new Error(
      "Set SOL_PILOT_DIR to the checkout containing the disconnect pilot.",
    );
  const directory = await mkdtemp(join(tmpdir(), "sol-mobile-pilot-"));
  const socket = net.createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = (socket.address() as net.AddressInfo).port;
  await new Promise<void>((done) => socket.close(() => done()));
  const url = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  async function stop() {
    if (child && child.exitCode === null) {
      const ended = once(child, "exit");
      child.kill();
      await ended;
    }
    child = undefined;
  }
  async function start() {
    const running = spawn(
      process.execPath,
      [join(resolve(source!), "backend/server.mjs")],
      {
        cwd: resolve(source!),
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "test",
          PORT: String(port),
          APP_URL: url,
          DATA_DIR: directory,
          DOTENV_CONFIG_PATH: join(directory, "absent.env"),
          SOL_ENGINE: "demo",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child = running;
    let logs = "";
    running.stdout!.on("data", (chunk) => {
      logs += chunk.toString();
    });
    running.stderr!.on("data", () => {});
    for (let attempt = 0; attempt < 100; attempt++) {
      if (running.exitCode !== null)
        throw new Error("The isolated backend could not start.");
      if (logs.includes("almacenamiento")) {
        const response = await fetch(url + "/api/health").catch(() => null);
        if (response?.ok) return;
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error("The isolated backend did not become ready.");
  }
  try {
    await start();
    const client = createPilotClient({ url, password: "" });
    assert.equal((await client.load()).sessions.length, 0);
    const turn = {
      text: "Preparar un informe ficticio",
      requestId: randomUUID(),
      url,
    };
    const first = await client.send(turn);
    const duplicate = await client.send(turn);
    assert.deepEqual(duplicate.messages, first.messages);
    await client.send({ text: "1", requestId: randomUUID(), url });
    await client.send({ text: "MÁS PEQUEÑO", requestId: randomUUID(), url });
    const before = (await client.load()).sessions[0];
    assert.equal(before.preference?.minutes, 2);
    await stop();
    await start();
    const after = (await client.load()).sessions[0];
    assert.equal(after.concern, before.concern);
    assert.equal(after.preference?.minutes, 2);
    assert.deepEqual(after.messages, before.messages);
    console.log(
      "PASS: mobile adapter → real local HTTP API → isolated persistent file store → backend restart; duplicate request is not repeated. No PostgreSQL, Hermes inference or WhatsApp delivery was tested.",
    );
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
