import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { classify } from './agent.mjs';

test('Hermes classification checks tool isolation and validates structured response', async () => {
 let enableTools = false, finishReason = 'stop', chatCalls = 0;
 const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/v1/toolsets') return res.end(JSON.stringify([{ enabled: enableTools, tools: ['terminal'] }]));
  chatCalls++;
  res.end(JSON.stringify({ choices: [{ finish_reason: finishReason, message: { content: JSON.stringify({ decision: 'PARTE', reason: 'Consulta habitual.', isNew: false, confidence: .95, reply: 'Revisa el portal de autoservicio.', action: 'reply' }) } }] }));
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const oldUrl = process.env.HERMES_BASE_URL, oldKey = process.env.HERMES_API_KEY;
 process.env.HERMES_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`; process.env.HERMES_API_KEY = 'test-only';
 try {
  const result = await classify('Consulta ficticia de VPN', { feedback: [] }, false);
  assert.equal(result.engine, 'hermes'); assert.equal(result.decision, 'PARTE'); assert.equal(chatCalls, 1);
  enableTools = true; await assert.rejects(() => classify('Mensaje ficticio', { feedback: [] }, false), /Desactiva/); assert.equal(chatCalls, 1);
  enableTools = false; finishReason = 'length'; await assert.rejects(() => classify('Mensaje ficticio', { feedback: [] }, false), /no completó/);
 } finally { if (oldUrl === undefined) delete process.env.HERMES_BASE_URL; else process.env.HERMES_BASE_URL = oldUrl; if (oldKey === undefined) delete process.env.HERMES_API_KEY; else process.env.HERMES_API_KEY = oldKey; await new Promise(r => server.close(r)); }
});
