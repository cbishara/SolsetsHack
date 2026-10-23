import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadModel, validateRecords, validateLayout, orderedFeatures, attachCaptures } from './model.mjs';
import { excalidraw, flowSvg } from './diagram.mjs';
import { renderArtifacts } from './build.mjs';

const model = loadModel();
const records = () => structuredClone([...model.features, ...model.flows, ...model.changes]);
test('a broken relationship cannot silently disappear from the human map', () => {
  const r = records(); r.find(x => x.type === 'feature').flowIds.push('flujo-inexistente');
  assert.throws(() => validateRecords(r), /referencia inexistente/);
});
test('a decision must document its alternatives', () => {
  const r = records(), f = r.find(x => x.type === 'flow' && x.steps.some(s => s.kind === 'decision')), step = f.steps.find(s => s.kind === 'decision');
  f.connections = f.connections.filter(c => c.from !== step.id);
  assert.throws(() => validateRecords(r), /necesita sus salidas/);
});
test('duplicate IDs and unsupported factual states are rejected', () => {
  const r = records(); r.push(structuredClone(r[0])); r[0].availability = 'todo-listo';
  assert.throws(() => validateRecords(r), /ID duplicado/);
  assert.throws(() => validateRecords(r), /availability inválida/);
});
test('human organization changes the map without changing what a feature does or claims', () => {
  const next = structuredClone(model), f = next.features[0], before = JSON.stringify(f);
  const dest = next.moments.find(m => m.id !== f.moment).id;
  next.layout.cards[f.id] = { moment: dest, order: -1 };
  validateLayout(next.layout, [...next.features, ...next.flows]);
  assert.equal(orderedFeatures(next, dest)[0].id, f.id);
  assert.equal(JSON.stringify(f), before);
  const element = excalidraw(next).elements.find(e => e.id === f.id + '-box');
  assert.equal(element.x, 60 + next.moments.findIndex(m => m.id === dest) * 690);
  assert.equal(element.y, 375);
});
test('regeneration is deterministic and keeps a chosen order of flows', () => {
  const next = structuredClone(model); next.layout.flows = next.flows.map(f => f.id).reverse();
  const copy = JSON.stringify(next.layout), a = renderArtifacts(next), b = renderArtifacts(next);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(next.layout), copy);
  const diagram = JSON.parse(a['tablero.excalidraw']);
  const headings = next.layout.flows.map(id => diagram.elements.find(e => e.id === id + '-title'));
  assert.ok(headings.every((h, i) => i === 0 || h.y > headings[i - 1].y));
});
test('written human content is not interpreted as markup or inline script', () => {
  const next = structuredClone(model); next.flows[0].title = '<script>alert(1)</script>';
  assert.ok(flowSvg(next.flows[0]).includes('&lt;script&gt;'));
  next.features[0].summary = '</script><script>alert(1)</script>';
  const html = renderArtifacts(next)['index.html'];
  assert.ok(!html.includes('</script><script>alert(1)</script>'));
});

const everything = () => structuredClone([...model.features, ...model.flows, ...model.changes, ...model.screens, ...model.references]);
test('a screen cannot point to a flow step that does not exist', () => {
  const r = everything(); r.find(x => x.type === 'screen').flowSteps.push({ flowId: 'flujo-quito-preparar-noche', stepId: 'paso-inventado' });
  assert.throws(() => validateRecords(r), /paso de flujo inexistente/);
});
test('a screen without its design image, or linked to an unknown app, is rejected', () => {
  const r = everything(), s = r.find(x => x.type === 'screen');
  s.design.image = 'docs/equipo/quito/tablero/pantallas/img/no-existe.png'; s.inspiredBy.push({ refId: 'ref-inventada', why: 'Sin respaldo.' });
  assert.throws(() => validateRecords(r), /imagen del diseño/);
  assert.throws(() => validateRecords(r), /app de ejemplo inexistente ref-inventada/);
});
test('an example app needs a valid group and its source document', () => {
  const r = everything(), ref = r.find(x => x.type === 'reference');
  ref.group = 'otra-cosa'; ref.evidence = [];
  assert.throws(() => validateRecords(r), /group inválido/);
  assert.throws(() => validateRecords(r), /documento de donde sale/);
});
test('a capture left in another lane attaches to the screen without editing its design file', () => {
  const base = mkdtempSync(join(tmpdir(), 'tablero-')), screen = structuredClone(model.screens[0]);
  delete screen.built; const before = JSON.stringify(screen.design);
  mkdirSync(join(base, 'amaru', 'tablero', 'capturas'), { recursive: true });
  writeFileSync(join(base, 'amaru', 'tablero', 'capturas', screen.id + '.png'), 'png');
  attachCaptures([screen], base);
  assert.equal(screen.built.maintainer, 'amaru');
  assert.ok(screen.built.image.endsWith('amaru/tablero/capturas/' + screen.id + '.png'));
  assert.equal(JSON.stringify(screen.design), before);
});
test('the generated panel carries the screen map and escapes written content', () => {
  const next = structuredClone(model); next.screens[0].title = '</script><script>alert(2)</script>';
  const html = renderArtifacts(next)['index.html'];
  assert.ok(html.includes('function renderMap'));
  assert.ok(!html.includes('</script><script>alert(2)</script>'));
});
test('an example app linked to a screen must say why', () => {
  const r = everything(); r.find(x => x.type === 'screen').inspiredBy.push({ refId: 'ref-opal', why: '' });
  assert.throws(() => validateRecords(r), /cada app de ejemplo con el porqué/);
});
