'use strict';
let data = JSON.parse(document.getElementById('model').textContent);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const http = ['http:', 'https:'].includes(location.protocol), storageKey = 'solsets-product-board-layout-v1';
let activeTab = 'features', activeFlow = data.flows[0]?.id, activeFeature = null, dirty = false, revision = data.revision;
let layout = structuredClone(data.layout);
if (!http) { try { const saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (saved?.version === 1 && saved.cards) layout = saved; } catch {} }
const label = state => data.labels[state] || state;
const feature = id => data.features.find(f => f.id === id);
const list = values => values.length ? '<ul>' + values.map(v => '<li>' + escapeHtml(v) + '</li>').join('') + '</ul>' : '<p>Sin elementos registrados.</p>';
const sourceUrl = path => http ? '/source?path=' + encodeURIComponent(path) : '../../../../' + path.split('/').map(encodeURIComponent).join('/');
const sourceLink = (path, title) => '<a class="evidence" href="' + escapeHtml(sourceUrl(path)) + '" target="_blank" rel="noreferrer">' + escapeHtml(title) + ' ↗</a>';
function fail(message) { $('#error').textContent = message; $('#error').classList.remove('hidden'); }
function markDirty() { dirty = true; $('#save').disabled = false; $('#status').textContent = 'Orden cambiado. Guarda para conservarlo; las reglas y estados siguen iguales.'; }
function sortedFeatures(moment) {
  return data.features.filter(f => (layout.cards[f.id]?.moment || f.moment) === moment).sort((a, b) => (layout.cards[a.id]?.order ?? 9999) - (layout.cards[b.id]?.order ?? 9999) || a.title.localeCompare(b.title));
}
function moveFeature(id, moment, before) {
  const all = sortedFeatures(moment).filter(f => f.id !== id), index = before ? all.findIndex(f => f.id === before) : all.length;
  all.splice(index < 0 ? all.length : index, 0, feature(id));
  all.forEach((f, i) => { layout.cards[f.id] = { moment, order: i }; });
  markDirty(); renderBoard();
}
function featureLinks(ids) {
  return ids.map(id => '<button class="textbutton" data-feature="' + escapeHtml(id) + '">' + escapeHtml(feature(id)?.title || id) + ' ↗</button>').join('<br>');
}
function bindLinks() { $$('[data-feature]').forEach(b => b.onclick = () => openFeature(b.dataset.feature)); $$('[data-flow]').forEach(b => b.onclick = () => { activeFlow = b.dataset.flow; $('#detail').close(); switchTab('flows'); }); }
function renderBoard() {
  const q = $('#search').value.toLowerCase().trim(), owner = $('#owner').value;
  $('#board').innerHTML = data.moments.map(m => {
    const cards = sortedFeatures(m.id).filter(f => (!owner || f.owner === owner || (f.collaborators || []).some(c => c.includes(owner))) && (!q || JSON.stringify(f).toLowerCase().includes(q)));
    return '<section class="column" data-moment="' + m.id + '"><div class="colhead"><h2>' + escapeHtml(m.label) + '</h2><span class="count">' + cards.length + '</span></div>' + (cards.length ? cards.map(f => '<article class="card" draggable="true" data-card="' + f.id + '"><div class="dragline"><span aria-hidden="true">⠿</span><span class="owner">' + escapeHtml(f.owner) + '</span></div><h3><button class="titlebutton" data-feature="' + f.id + '">' + escapeHtml(f.title) + '</button></h3><p>' + escapeHtml(f.summary) + '</p><span class="pill agreed">' + escapeHtml(label(f.productStatus)) + '</span><span class="pill pending">Construcción: ' + escapeHtml(label(f.buildStatus)) + '</span><div class="meta">Disponible: ' + escapeHtml(label(f.availability)) + '</div><div class="foot"><span class="meta">' + f.flowIds.length + ' flujo' + (f.flowIds.length === 1 ? '' : 's') + '</span><button class="textbutton" data-feature="' + f.id + '">Leer / mover ↗</button></div></article>').join('') : '<div class="empty">' + (q || owner ? 'No hay coincidencias en esta columna.' : 'Todavía no hay funcionalidades en este momento. Puedes ordenar aquí las que correspondan.') + '</div>') + '</section>';
  }).join('');
  $$('[data-card]').forEach(card => card.ondragstart = e => { e.dataTransfer.setData('text/plain', card.dataset.card); e.dataTransfer.effectAllowed = 'move'; });
  $$('[data-moment]').forEach(column => {
    column.ondragover = e => { e.preventDefault(); column.classList.add('dragover'); };
    column.ondragleave = e => { if (!column.contains(e.relatedTarget)) column.classList.remove('dragover'); };
    column.ondrop = e => { e.preventDefault(); column.classList.remove('dragover'); const id = e.dataTransfer.getData('text/plain'); if (!feature(id)) return; const card = e.target.closest('[data-card]'); moveFeature(id, column.dataset.moment, card?.dataset.card !== id ? card?.dataset.card : null); };
  });
  bindLinks();
}
function openFeature(id) {
  const f = feature(id); if (!f) return; activeFeature = id;
  $('#detailtitle').textContent = f.title;
  const section = (title, body, classes = '') => '<section class="detailsection ' + classes + '"><h3>' + title + '</h3>' + body + '</section>';
  const checks = f.verification.length ? f.verification.map(v => '<p><strong>' + escapeHtml(v.date + ' · ' + v.environment) + '</strong><br>' + escapeHtml(v.result) + '<br>' + escapeHtml(v.evidence) + '</p>').join('') : '<p class="noteworthy">Sin comprobaciones registradas. El acuerdo de producto no acredita que ya esté implementado.</p>';
  $('#detailbody').innerHTML = '<p>' + escapeHtml(f.summary) + '</p><div><span class="pill agreed">' + escapeHtml(label(f.productStatus)) + '</span><span class="pill pending">Construcción: ' + escapeHtml(label(f.buildStatus)) + '</span><span class="pill">Disponible: ' + escapeHtml(label(f.availability)) + '</span></div><p class="meta">Responsable funcional: ' + escapeHtml(f.owner) + ' · Mantiene esta ficha: ' + escapeHtml(f.maintainer) + ' · ' + escapeHtml(f.updatedAt) + '</p><div class="detailgrid">' + section('Qué necesita Rodrigo', '<p>' + escapeHtml(f.need) + '</p>', 'wide') + section('Qué hace Rodrigo', list(f.userActions)) + section('Qué hace Solsets', list(f.systemActions)) + section('Un ejemplo ficticio', '<div class="example"><p>' + escapeHtml(f.example) + '</p></div>', 'wide') + section('Reglas', list(f.rules)) + section('Límites', list(f.limits)) + section('Cómo sabemos si funciona', list(f.acceptance)) + section('Qué se verificó', checks) + section('Preguntas abiertas', '<div class="questions">' + list(f.questions) + '</div>', 'wide') + section('Recorridos relacionados', f.flowIds.map(fid => '<button class="textbutton" data-flow="' + fid + '">' + escapeHtml(data.flows.find(flow => flow.id === fid).title) + ' ↗</button>').join('<br>')) + section('Colaboradores', list(f.collaborators || [])) + section('Con qué se conecta', featureLinks(f.relatedFeatureIds) || '<p>Sin otras relaciones registradas.</p>') + section('Respaldo y fuente', f.evidence.map(e => sourceLink(e.path, e.label + (e.line ? ' · línea de referencia ' + e.line : ''))).join('') + sourceLink(f.source, 'Ficha versionada · ' + f.id)) + section('Cambios relacionados', data.changes.filter(c => c.featureIds.includes(f.id)).map(c => '<p><strong>' + escapeHtml(c.title) + '</strong><br>' + escapeHtml(c.after) + '</p>').join('') || '<p>Sin cambios registrados.</p>', 'wide') + '</div><div class="move"><strong>Orden visual</strong><p class="meta">Mover la tarjeta no modifica sus reglas, permisos ni estado.</p><label for="moveMoment">Ubicar en </label><select id="moveMoment">' + data.moments.map(m => '<option value="' + m.id + '" ' + ((layout.cards[f.id]?.moment || f.moment) === m.id ? 'selected' : '') + '>' + escapeHtml(m.label) + '</option>').join('') + '</select><div class="buttons"><button class="btn" id="movefirst">Mover al principio</button><button class="btn" id="movelast">Mover al final</button></div></div>';
  if (typeof featureScreensHtml === 'function') $('#detailbody .detailgrid').insertAdjacentHTML('afterbegin', featureScreensHtml(f.id));
  bindLinks(); $('#movefirst').onclick = () => { const moment = $('#moveMoment').value; moveFeature(id, moment, sortedFeatures(moment).find(x => x.id !== id)?.id); $('#detail').close(); }; $('#movelast').onclick = () => { moveFeature(id, $('#moveMoment').value); $('#detail').close(); };
  if (!$('#detail').open) $('#detail').showModal(); else $('#detail').scrollTop = 0;
}
function sortedFlows() { const order = layout.flows || []; return [...data.flows].sort((a, b) => (order.includes(a.id) ? order.indexOf(a.id) : 9999) - (order.includes(b.id) ? order.indexOf(b.id) : 9999) || a.title.localeCompare(b.title)); }
function moveFlow(offset) { const ids = sortedFlows().map(f => f.id), index = ids.indexOf(activeFlow), next = index + offset; if (next < 0 || next >= ids.length) return; [ids[index], ids[next]] = [ids[next], ids[index]]; layout.flows = ids; markDirty(); renderFlows(); }
function renderFlows() {
  const flows = sortedFlows(); if (!flows.some(f => f.id === activeFlow)) activeFlow = flows[0]?.id;
  $('#flowlist').innerHTML = flows.map(f => '<button class="flowchoice ' + (activeFlow === f.id ? 'active' : '') + '" data-pickflow="' + f.id + '">' + escapeHtml(f.title) + '<small>' + escapeHtml(f.owner) + ' · ' + escapeHtml(label(f.buildStatus)) + '</small></button>').join('');
  $$('[data-pickflow]').forEach(b => b.onclick = () => { activeFlow = b.dataset.pickflow; renderFlows(); });
  const f = flows.find(f => f.id === activeFlow); if (!f) { $('#flowdetail').innerHTML = '<p>Sin flujos registrados.</p>'; return; }
  $('#flowdetail').innerHTML = '<h2>' + escapeHtml(f.title) + '</h2><p>' + escapeHtml(f.summary) + '</p><span class="pill agreed">' + escapeHtml(label(f.productStatus)) + '</span><span class="pill pending">Construcción: ' + escapeHtml(label(f.buildStatus)) + '</span><div class="buttons"><button class="btn" id="flowup">↑ Subir recorrido</button><button class="btn" id="flowdown">↓ Bajar recorrido</button></div><p><strong>Empieza:</strong> ' + escapeHtml(f.trigger) + '<br><strong>Resultado:</strong> ' + escapeHtml(f.outcome) + '</p><div class="diagram">' + data.flowDiagrams[f.id] + '</div><div class="flowsteps">' + f.steps.map(s => '<div class="step ' + (s.kind === 'pending' ? 'pending' : '') + '"><small>' + escapeHtml(s.actor) + (s.kind === 'decision' ? ' · Decisión' : s.kind === 'pending' ? ' · Por acordar' : '') + '</small><b>' + escapeHtml(s.title) + '</b><p>' + escapeHtml(s.detail) + '</p>' + (s.featureId ? '<button class="textbutton" data-feature="' + s.featureId + '">Abrir funcionalidad ↗</button>' : '') + '</div>').join('') + '</div><div class="example"><strong>Ejemplo ficticio</strong><p>' + escapeHtml(f.example) + '</p></div><div class="questions"><strong>Preguntas abiertas</strong>' + list(f.questions) + '</div><h3>Qué se verificó</h3>' + (f.verification.length ? f.verification.map(v => '<p>' + escapeHtml(v.result + ' · ' + v.evidence) + '</p>').join('') : '<p class="hint">No hay pruebas de este recorrido registradas. Es la representación de un acuerdo de producto.</p>') + f.evidence.map(e => sourceLink(e.path, e.label)).join('') + sourceLink(f.source, 'Ficha del flujo · ' + f.id);
  $('#flowup').disabled = flows[0].id === f.id; $('#flowdown').disabled = flows.at(-1).id === f.id; $('#flowup').onclick = () => moveFlow(-1); $('#flowdown').onclick = () => moveFlow(1); bindLinks();
}
function renderChanges() {
  $('#changelist').innerHTML = [...data.changes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)).map(c => '<article class="change"><span class="meta">' + escapeHtml(c.updatedAt + ' · ' + c.owner + ' · ' + c.availability) + '</span><h2>' + escapeHtml(c.title) + '</h2><p><strong>Antes:</strong> ' + escapeHtml(c.before) + '</p><p><strong>Ahora:</strong> ' + escapeHtml(c.after) + '</p><p><strong>Por qué:</strong> ' + escapeHtml(c.reason) + '</p><p><strong>Qué se comprobó:</strong> ' + escapeHtml(c.checked) + '</p>' + featureLinks(c.featureIds) + sourceLink(c.source, 'Entrada versionada') + '</article>').join('') || '<p>Sin cambios registrados.</p>'; bindLinks();
}
function switchTab(tab) { activeTab = tab; $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false')); ['features', 'flows', 'map', 'changes', 'guide'].forEach(t => $('#' + t).classList.toggle('hidden', t !== tab)); if (tab === 'flows') renderFlows(); if (tab === 'map' && typeof renderMap === 'function') renderMap(); }
function render() {
  $('#featurecount').textContent = '(' + data.features.length + ')'; $('#flowcount').textContent = '(' + data.flows.length + ')'; $('#changecount').textContent = '(' + data.changes.length + ')'; $('#revision').textContent = 'Revisión ' + data.revision.slice(0, 8);
  const selected = $('#owner').value; $('#owner').innerHTML = '<option value="">Todo el equipo</option>' + [...new Set(data.features.map(f => f.owner))].sort().map(o => '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>').join(''); $('#owner').value = selected;
  renderBoard(); renderFlows(); renderChanges(); if (typeof renderMap === 'function') renderMap();
}
$('#save').onclick = async () => {
  if (!http) { localStorage.setItem(storageKey, JSON.stringify(layout)); dirty = false; $('#save').disabled = true; $('#status').textContent = 'Orden guardado solo en este navegador. Exporta el orden o usa npm run tablero para guardarlo en el repo.'; return; }
  try {
    const response = await fetch('/api/layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, layout }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error);
    data = body; revision = data.revision; layout = structuredClone(data.layout); dirty = false; $('#save').disabled = true; $('#error').classList.add('hidden'); $('#status').textContent = 'Orden guardado en el repo. El panel y Excalidraw están actualizados.'; render();
  } catch (e) { fail(e.message + ' Tu orden sigue en pantalla; expórtalo antes de recargar si quieres conservarlo.'); }
};
$('#exportlayout').onclick = () => { const blob = new Blob([JSON.stringify(layout, null, 2) + '\n'], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'solsets-disposicion.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('#close').onclick = () => $('#detail').close(); $('#detail').onclick = e => { const r = e.target.getBoundingClientRect(); if (e.target === $('#detail') && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) $('#detail').close(); };
$('#search').oninput = renderBoard; $('#owner').onchange = renderBoard; $$('[data-tab]').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
render(); $('#sync').textContent = http ? 'Actualización automática desde las fichas de esta copia del repo' : 'Copia sin servidor · abre npm run tablero para actualizar y guardar en el repo';
if (http) setInterval(async () => {
  if (dirty || $('#detail').open) return;
  try { const response = await fetch('/api/state', { cache: 'no-store' }); const fresh = await response.json(); if (!response.ok) throw new Error(fresh.error); if (fresh.revision !== revision) { data = fresh; revision = fresh.revision; layout = structuredClone(fresh.layout); render(); $('#status').textContent = 'Se actualizaron las fichas desde esta copia del repo.'; } $('#error').classList.add('hidden'); }
  catch (e) { fail('No se pudo actualizar; sigue visible la última versión. ' + e.message); }
}, 4000);
