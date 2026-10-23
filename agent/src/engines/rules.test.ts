import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyByRules } from './rules.ts';

const decide = (text: string) => classifyByRules(text).decision;

test('Quito case 1: an explicit "urgente" wakes', () => {
  assert.equal(decide('URGENTE: se cayó el servidor de facturación, ningún cliente puede pagar'), 'DESPERTAR');
});

test('Quito case 2: a banal request for tomorrow goes to the morning report', () => {
  assert.equal(decide('oye necesito que mañana me revises la impresora del segundo piso'), 'PARTE');
});

test('a thank-you is noise', () => {
  assert.equal(decide('gracias Rodrigo, ya funcionó la VPN 👍'), 'RUIDO');
  assert.equal(decide('👍'), 'RUIDO');
});

test('"no es urgente" does not wake just because it contains the word', () => {
  assert.equal(decide('no es urgente, lo vemos cuando puedas'), 'PARTE');
});

test('an outage wakes even after a thank-you', () => {
  assert.equal(decide('gracias, pero se cayó de nuevo'), 'DESPERTAR');
});

test('accented verbs at the end of a word still match', () => {
  assert.equal(decide('se cayó la vpn'), 'DESPERTAR');
});

test('when in doubt, wake: unknown messages wake with low confidence and as new', () => {
  const r = classifyByRules('Rodrigo, el sistema de turnos muestra algo raro en la sucursal 4');
  assert.equal(r.decision, 'DESPERTAR');
  assert.equal(r.is_new, true);
  assert.ok(r.confidence < 0.7);
});
