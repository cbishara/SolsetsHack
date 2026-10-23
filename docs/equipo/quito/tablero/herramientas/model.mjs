import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const boardDir = resolve(root, 'docs/equipo/quito/tablero');
export const moments = [
  { id: 'preparar', label: 'Preparar la noche' },
  { id: 'descansar', label: 'Durante el descanso' },
  { id: 'urgencia', label: 'Atender una urgencia' },
  { id: 'manana', label: 'Al despertar' },
];
export const productStates = ['propuesta', 'acordada', 'descartada', 'retirada'];
export const buildStates = ['sin-verificar', 'por-hacer', 'en-curso', 'implementada', 'bloqueada'];
export const availabilityStates = ['sin-verificar', 'solo-propuesta', 'rama', 'main', 'desplegada'];
export const labels = { 'sin-verificar': 'Sin verificar', 'por-hacer': 'Por hacer', 'en-curso': 'En curso', implementada: 'Implementada', bloqueada: 'Bloqueada', propuesta: 'Propuesta', acordada: 'Acordada', descartada: 'Descartada', retirada: 'Retirada', 'solo-propuesta': 'Solo propuesta', rama: 'Rama de trabajo', main: 'Integrada en main', desplegada: 'Desplegada' };
export const hash = value => createHash('sha256').update(value).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
export const referenceGroups = [
  { id: 'bloqueo-foco', label: 'Bloqueo y foco' },
  { id: 'sueno-regulacion', label: 'Sueño y regulación' },
  { id: 'reflexion-planificacion', label: 'Reflexión y planificación' },
  { id: 'guardia-profesional', label: 'Guardia profesional' },
  { id: 'controles-nativos', label: 'Controles del teléfono' },
];
export const imageTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
// Una imagen del tablero tiene que vivir dentro de docs/equipo y ser un formato conocido: así el servidor puede entregarla sin abrir el resto del repo.
export const imageOk = path => typeof path === 'string' && path.startsWith('docs/equipo/') && !path.split('/').includes('..') && Object.keys(imageTypes).some(ext => path.toLowerCase().endsWith(ext)) && existsSync(resolve(root, path));

// Las capturas de la app construida las deja el carril de quien la programa en docs/equipo/<persona>/tablero/capturas/<id-de-pantalla>.png.
// Nadie edita la ficha de diseño ajena: el tablero las encuentra por nombre.
const localStamp = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export function attachCaptures(records, base = resolve(root, 'docs/equipo')) {
  for (const screen of records.filter(r => r.type === 'screen')) {
    for (const person of readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()) {
      const path = join(base, person, 'tablero', 'capturas', `${screen.id}.png`);
      if (!existsSync(path)) continue;
      screen.built = { image: relative(root, path).split('\\').join('/'), maintainer: person, capturedAt: localStamp(statSync(path).mtime) };
      break;
    }
  }
}

export function loadModel() {
  const records = [];
  const base = resolve(root, 'docs/equipo');
  const kinds = { features: 'feature', flujos: 'flow', cambios: 'change', pantallas: 'screen', referentes: 'reference' };
  for (const person of readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    for (const [folder, type] of Object.entries(kinds)) {
      const dir = join(base, person.name, 'tablero', folder);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
        const path = join(dir, file);
        let value;
        try { value = readJson(path); } catch (e) { throw new Error(`${relative(root, path)}: JSON inválido (${e.message}).`); }
        records.push({ ...value, type: value.type || type, source: relative(root, path).split('\\').join('/'), maintainer: person.name });
        if (value.type && value.type !== type) throw new Error(`${file}: el tipo no corresponde a la carpeta ${folder}.`);
      }
    }
  }
  attachCaptures(records, base);
  validateRecords(records);
  const layoutPath = join(boardDir, 'disposicion.json');
  const layout = existsSync(layoutPath) ? readJson(layoutPath) : { version: 1, cards: {} };
  validateLayout(layout, records);
  const data = { version: 1, moments, labels, referenceGroups, features: records.filter(r => r.type === 'feature'), flows: records.filter(r => r.type === 'flow'), changes: records.filter(r => r.type === 'change'), screens: records.filter(r => r.type === 'screen'), references: records.filter(r => r.type === 'reference'), layout };
  data.revision = hash(JSON.stringify(data));
  return data;
}

export function validateRecords(records) {
  const errors = [], ids = new Set();
  const demand = (ok, msg) => { if (!ok) errors.push(msg); };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const strings = value => Array.isArray(value) && value.every(text);
  for (const r of records) {
    const name = r.source;
    demand(text(r.id) && /^(feat|flujo|cambio|pant|ref)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id), `${name}: ID debe empezar por feat-, flujo-, cambio-, pant- o ref- y usar minúsculas.`);
    demand(!ids.has(r.id), `${name}: ID duplicado ${r.id}.`); ids.add(r.id);
    for (const field of ['title', 'owner', 'summary', 'updatedAt']) demand(text(r[field]), `${name}: falta ${field}.`);
    demand(/^\d{4}-\d{2}-\d{2}$/.test(r.updatedAt || ''), `${name}: updatedAt debe ser AAAA-MM-DD.`);
    if (r.type === 'feature' || r.type === 'flow') {
      demand(productStates.includes(r.productStatus), `${name}: productStatus inválido.`);
      demand(buildStates.includes(r.buildStatus), `${name}: buildStatus inválido.`);
      demand(availabilityStates.includes(r.availability), `${name}: availability inválida.`);
      demand(Array.isArray(r.verification), `${name}: verification debe ser una lista (vacía si no se probó).`);
      for (const v of r.verification || []) demand(text(v.date) && text(v.environment) && text(v.result) && text(v.evidence), `${name}: verificación incompleta.`);
      demand(Array.isArray(r.evidence) && r.evidence.length > 0, `${name}: debe citar una decisión, código u otra evidencia.`);
      for (const e of r.evidence || []) {
        demand(text(e.label) && text(e.path), `${name}: evidencia incompleta.`);
        if (e.path) demand(!e.path.startsWith('/') && !e.path.split('/').includes('..') && existsSync(resolve(root, e.path)), `${name}: evidencia local inexistente o fuera del repo: ${e.path}.`);
      }
    }
    if (r.type === 'feature') {
      demand(r.id?.startsWith('feat-'), `${name}: prefijo de funcionalidad incorrecto.`);
      demand(moments.some(m => m.id === r.moment), `${name}: moment inválido.`);
      for (const f of ['need', 'example']) demand(text(r[f]), `${name}: falta ${f}.`);
      for (const f of ['userActions', 'systemActions', 'rules', 'limits', 'acceptance', 'questions', 'flowIds', 'relatedFeatureIds']) demand(strings(r[f]), `${name}: ${f} debe ser una lista de textos.`);
    } else if (r.type === 'flow') {
      demand(r.id?.startsWith('flujo-'), `${name}: prefijo de flujo incorrecto.`);
      for (const f of ['trigger', 'outcome', 'example']) demand(text(r[f]), `${name}: falta ${f}.`);
      demand(Array.isArray(r.steps) && r.steps.length >= 2, `${name}: faltan pasos.`);
      demand(Array.isArray(r.connections) && r.connections.length > 0, `${name}: faltan conexiones.`);
      demand(strings(r.featureIds) && strings(r.questions), `${name}: featureIds/questions deben ser listas.`);
      const stepIds = new Set();
      for (const s of r.steps || []) {
        demand(text(s.id) && !stepIds.has(s.id), `${name}: paso sin ID o duplicado.`); stepIds.add(s.id);
        demand(text(s.title) && text(s.actor) && text(s.detail), `${name}: paso incompleto.`);
        demand(['start', 'action', 'decision', 'end', 'pending'].includes(s.kind), `${name}: tipo de paso inválido.`);
      }
      for (const c of r.connections || []) demand(stepIds.has(c.from) && stepIds.has(c.to) && text(c.label), `${name}: conexión inválida o sin explicación.`);
      for (const s of r.steps || []) if (s.kind === 'decision') demand((r.connections || []).filter(c => c.from === s.id).length >= 2, `${name}: la decisión ${s.id} necesita sus salidas.`);
    } else if (r.type === 'change') {
      demand(r.id?.startsWith('cambio-'), `${name}: prefijo de cambio incorrecto.`);
      for (const f of ['before', 'after', 'reason', 'checked', 'availability']) demand(text(r[f]), `${name}: falta ${f}.`);
      demand(strings(r.featureIds) && strings(r.flowIds), `${name}: featureIds/flowIds deben ser listas.`);
    } else if (r.type === 'screen') {
      demand(r.id?.startsWith('pant-'), `${name}: prefijo de pantalla incorrecto.`);
      demand(moments.some(m => m.id === r.moment), `${name}: moment inválido.`);
      demand(productStates.includes(r.designStatus), `${name}: designStatus inválido.`);
      demand(buildStates.includes(r.buildStatus), `${name}: buildStatus inválido.`);
      demand(strings(r.featureIds) && r.featureIds.length > 0, `${name}: una pantalla debe enlazar al menos una funcionalidad.`);
      demand(strings(r.notes || []), `${name}: notes debe ser una lista de textos.`);
      demand(Array.isArray(r.inspiredBy) && r.inspiredBy.every(i => text(i?.refId) && text(i?.why)), `${name}: inspiredBy debe listar { refId, why }: cada app de ejemplo con el porqué.`);
      demand(Array.isArray(r.flowSteps) && r.flowSteps.every(s => text(s?.flowId) && text(s?.stepId)), `${name}: flowSteps debe listar { flowId, stepId }.`);
      demand(text(r.design?.image) && text(r.design?.label) && imageOk(r.design?.image), `${name}: falta la imagen del diseño o no existe en el repo.`);
      if (r.built) demand(imageOk(r.built.image), `${name}: la captura construida no existe en el repo.`);
    } else if (r.type === 'reference') {
      demand(r.id?.startsWith('ref-'), `${name}: prefijo de referente incorrecto.`);
      demand(referenceGroups.some(g => g.id === r.group), `${name}: group inválido.`);
      for (const f of ['takeaway', 'limit', 'url']) demand(text(r[f]), `${name}: falta ${f}.`);
      if (r.image) demand(imageOk(r.image), `${name}: imagen inexistente o fuera del repo: ${r.image}.`);
      demand(Array.isArray(r.evidence) && r.evidence.length > 0 && r.evidence.every(e => text(e.label) && text(e.path) && existsSync(resolve(root, e.path))), `${name}: debe citar el documento de donde sale el análisis.`);
    } else demand(false, `${name}: tipo desconocido.`);
  }
  for (const r of records) {
    const refs = [...r.featureIds || [], ...r.relatedFeatureIds || [], ...r.flowIds || []];
    for (const id of refs) demand(ids.has(id), `${r.source}: referencia inexistente ${id}.`);
    if (r.type === 'screen') for (const i of r.inspiredBy || []) demand(records.some(x => x.type === 'reference' && x.id === i.refId), `${r.source}: app de ejemplo inexistente ${i.refId}.`);
    if (r.type === 'screen') for (const s of r.flowSteps || []) {
      const flow = records.find(f => f.type === 'flow' && f.id === s.flowId);
      demand(flow && flow.steps.some(step => step.id === s.stepId), `${r.source}: paso de flujo inexistente ${s.flowId}/${s.stepId}.`);
    }
    if (r.type === 'flow') for (const s of r.steps || []) if (s.featureId) demand(records.some(f => f.type === 'feature' && f.id === s.featureId), `${r.source}: funcionalidad desconocida en paso ${s.id}.`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
}

export function validateLayout(layout, records) {
  if (!layout || layout.version !== 1 || !layout.cards || typeof layout.cards !== 'object' || Array.isArray(layout.cards)) throw new Error('Disposición inválida: se requiere version: 1 y cards.');
  for (const [id, card] of Object.entries(layout.cards)) {
    if (!/^feat-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !card || !moments.some(m => m.id === card.moment) || !Number.isFinite(card.order) || Math.abs(card.order) > 100000) throw new Error(`Posición inválida para ${id}.`);
  }
  if (layout.flows !== undefined && (!Array.isArray(layout.flows) || new Set(layout.flows).size !== layout.flows.length || !layout.flows.every(id => typeof id === 'string' && /^flujo-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))) throw new Error('El orden de flujos debe contener IDs de flujo únicos.');
}

export function orderedFeatures(model, moment) {
  return model.features.filter(f => (model.layout.cards[f.id]?.moment || f.moment) === moment)
    .sort((a, b) => (model.layout.cards[a.id]?.order ?? 9999) - (model.layout.cards[b.id]?.order ?? 9999) || a.title.localeCompare(b.title));
}
