import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadModel, boardDir, validateLayout } from './model.mjs';
import { excalidraw, flowSvg } from './diagram.mjs';

export function atomicWrite(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value); renameSync(temporary, path);
}
export function renderArtifacts(model = loadModel()) {
  const board = excalidraw(model);
  const template = readFileSync(join(boardDir, 'herramientas/panel.html'), 'utf8');
  const data = { ...model, flowDiagrams: Object.fromEntries(model.flows.map(f => [f.id, flowSvg(f)])) };
  const script = readFileSync(join(boardDir, 'herramientas/panel.js'), 'utf8') + '\n' + readFileSync(join(boardDir, 'herramientas/mapa.js'), 'utf8');
  const html = template.replace('__MODEL__', () => JSON.stringify(data).replace(/</g, '\\u003c')).replace('__SCRIPT__', () => script);
  return { 'index.html': html, 'tablero.excalidraw': JSON.stringify(board, null, 2) + '\n' };
}
export function build(model = loadModel()) {
  for (const [name, value] of Object.entries(renderArtifacts(model))) atomicWrite(join(boardDir, name), value);
  return model;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let data = loadModel();
  const importIndex = process.argv.indexOf('--import-layout');
  if (importIndex >= 0) {
    if (!process.argv[importIndex + 1]) throw new Error('Indica la ruta al JSON de disposición exportado.');
    const layout = JSON.parse(readFileSync(resolve(process.argv[importIndex + 1]), 'utf8'));
    validateLayout(layout, [...data.features, ...data.flows]);
    atomicWrite(join(boardDir, 'disposicion.json'), JSON.stringify(layout, null, 2) + '\n'); data = loadModel();
  }
  if (!process.argv.includes('--check')) build(data);
  else for (const [name, expected] of Object.entries(renderArtifacts(data))) if (!existsSync(join(boardDir, name)) || readFileSync(join(boardDir, name), 'utf8') !== expected) throw new Error(`${name} está desactualizado. Ejecuta npm run tablero:build. No edites las vistas generadas a mano.`);
  console.log(`${process.argv.includes('--check') ? 'Validado' : 'Generado'}: ${data.features.length} funcionalidades, ${data.flows.length} flujos, ${data.changes.length} cambios, ${data.screens.length} pantallas, ${data.references.length} apps de ejemplo.`);
}
