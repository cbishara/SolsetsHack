// Mapa de pantallas: une apps de ejemplo → pantallas → funcionalidades → flujos.
// Se concatena después de panel.js, así que usa sus utilidades ($, escapeHtml, data, label, featureLinks, sourceLink, bindLinks).
const mapCss = `
.mapintro { display: flex; justify-content: space-between; gap: 32px; align-items: end; margin: 4px 0 28px; }
.mapintro p { margin: 0; color: var(--muted); max-width: 760px; }
.mapintro label { font-size: 12px; color: var(--muted); display: flex; gap: 8px; align-items: center; }
.mapintro input { accent-color: var(--blue); flex: none; }
.mapintro .toggles { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.mapgrid { position: relative; display: grid; grid-template-columns: minmax(180px, 1fr) minmax(290px, 1.3fr) minmax(200px, 1fr) minmax(180px, .9fr); gap: 48px; align-items: start; }
.mapedges { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.mapedges path { fill: none; stroke: var(--line); stroke-width: 1.5; transition: opacity .15s; }
.mapcol { position: relative; min-width: 0; display: flex; flex-direction: column; gap: 10px; z-index: 1; }
.mapcol h3 { font-size: 13px; font-weight: 600; color: var(--ink); margin: 0 0 6px; }
.mapcol h4 { font-size: 12px; color: var(--muted); margin: 16px 0 4px; font-weight: 600; }
.mnode { display: flex; gap: 12px; align-items: center; text-align: left; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); padding: 12px; color: var(--ink); width: 100%; }
.mnode:hover { background: var(--hover); border-color: var(--control-border); }
.mnode > span { min-width: 0; }
.mnode b { display: block; font-size: 13px; line-height: 1.4; font-weight: 600; overflow-wrap: anywhere; }
.mnode small { display: block; font-size: 12px; color: var(--muted); line-height: 1.45; margin-top: 4px; }
.mref { padding: 8px 10px; gap: 10px; }
.mref img { width: 24px; height: 42px; object-fit: cover; object-position: top; border-radius: 4px; flex: none; background: var(--surface); }
.mref .noimg { width: 24px; height: 42px; border-radius: 4px; flex: none; background: var(--surface); }
.mref b { font-size: 13px; }
.mref.unused { background: var(--surface); }
.mscreen { padding: 12px; }
.mscreen .phones { display: flex; gap: 6px; flex: none; }
.mscreen .phones img, .mscreen .phones i { width: 60px; height: 128px; border-radius: 6px; object-fit: cover; object-position: top; background: var(--surface); display: block; }
.mscreen .phones i { background: var(--paper); border: 1px dashed var(--control-border); }
.mfeat, .mflow { min-height: 72px; }
/* Keep every label legible while the active chain gets the only accent. */
.mapgrid.focus .mnode.on { border-color: var(--blue); background: var(--selected); }
.mapgrid.focus .mapedges path { opacity: .25; }
.mapgrid.focus .mapedges path.on { opacity: 1; stroke: var(--blue); stroke-width: 2; }
.legend { display: flex; flex-wrap: wrap; gap: 12px 24px; font-size: 12px; color: var(--muted); margin-top: 28px; }
.legend span { display: inline-flex; align-items: center; gap: 8px; }
.legend i { width: 18px; height: 2px; display: inline-block; background: var(--line); flex: none; }
.phonepair { display: flex; gap: 24px; flex-wrap: wrap; margin: 24px 0; }
.phonepair figure { margin: 0; width: 240px; max-width: 100%; }
.phonepair img { width: 100%; display: block; border-radius: 6px; background: var(--surface); }
.phonepair .pending { width: 100%; min-height: 505px; border: 1px dashed var(--control-border); border-radius: 6px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 28px; color: var(--muted); background: var(--surface); font-size: 13px; }
.phonepair figcaption { font-size: 12px; color: var(--muted); margin-top: 10px; }
.refhero { display: flex; gap: 24px; align-items: flex-start; }
.refhero img { width: 150px; max-width: 100%; border-radius: 6px; flex: none; }
.refhero > div { min-width: 0; }
.screenthumbs { display: flex; gap: 12px; flex-wrap: wrap; }
.screenthumbs button { border: 1px solid var(--rule); background: var(--paper); border-radius: 5px; padding: 6px; font-size: 12px; color: var(--body); width: 100px; }
.screenthumbs button:hover { background: var(--hover); border-color: var(--control-border); }
.screenthumbs img { width: 86px; border-radius: 4px; display: block; margin-bottom: 6px; }
.mapgrid.noapps { grid-template-columns: minmax(290px, .8fr) minmax(240px, 1fr) minmax(220px, 1fr); }
.mapedges .hit { fill: none; stroke: var(--clear); stroke-width: 14; pointer-events: stroke; cursor: help; opacity: 1; }
@media (max-width: 1100px) {
  .mapgrid, .mapgrid.noapps { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; }
  .mapedges { display: none; }
}
@media (max-width: 650px) {
  .mapintro { flex-direction: column; align-items: stretch; gap: 16px; }
  .mapintro .toggles { align-items: flex-start; }
  .mapgrid, .mapgrid.noapps { grid-template-columns: minmax(0, 1fr); }
  .refhero { flex-direction: column; }
}
`;
document.head.insertAdjacentHTML('beforeend', '<style>' + mapCss + '</style>');

// panel.js dibuja todo apenas carga, antes de que corra este archivo: lo que usa renderMap va como function (se eleva) y no como const.
function assetUrl(path) { return '../../../../' + path.split('/').map(encodeURIComponent).join('/'); }
function screenById(id) { return (data.screens || []).find(s => s.id === id); }
function referenceById(id) { return (data.references || []).find(r => r.id === id); }
function groupLabel(id) { return (data.referenceGroups || []).find(g => g.id === id)?.label || id; }
function momentIndex(id) { return data.moments.findIndex(m => m.id === id); }
// Las apps de ejemplo son opcionales: el mapa parte mostrando solo pantallas, funcionalidades y flujos.
var mapShowApps = false, mapShowUnused = false;

function mapNodes() {
  const featureOrder = data.moments.flatMap(m => sortedFeatures(m.id)).map(f => f.id), firstFeature = ids => Math.min(...ids.map(id => featureOrder.indexOf(id)));
  const screens = [...(data.screens || [])].sort((a, b) => momentIndex(a.moment) - momentIndex(b.moment) || firstFeature(a.featureIds) - firstFeature(b.featureIds));
  const screenIndex = id => screens.findIndex(s => s.id === id);
  const usedBy = ref => screens.filter(s => s.inspiredBy.some(i => i.refId === ref.id));
  const refs = [...(data.references || [])].map(r => ({ ...r, screensUsing: usedBy(r) }));
  const firstUse = r => Math.min(...r.screensUsing.map(s => screenIndex(s.id)));
  const used = refs.filter(r => r.screensUsing.length).sort((a, b) => firstUse(a) - firstUse(b) || a.title.localeCompare(b.title));
  const unused = refs.filter(r => !r.screensUsing.length).sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
  const linkedFeatures = new Set(screens.flatMap(s => s.featureIds));
  const features = data.moments.flatMap(m => sortedFeatures(m.id)).sort((a, b) => (linkedFeatures.has(b.id) - linkedFeatures.has(a.id)));
  const featuresOf = flow => [...new Set([...flow.featureIds, ...data.features.filter(x => x.flowIds.includes(flow.id)).map(x => x.id)])];
  const flows = sortedFlows().sort((a, b) => Math.min(...featuresOf(a).map(id => features.findIndex(f => f.id === id))) - Math.min(...featuresOf(b).map(id => features.findIndex(f => f.id === id))));
  const edges = [];
  for (const s of screens) {
    if (mapShowApps) for (const i of s.inspiredBy) edges.push({ from: i.refId, to: s.id, kind: 'e-ref', why: i.why });
    for (const f of s.featureIds) edges.push({ from: s.id, to: f, kind: 'e-screen' });
  }
  for (const flow of flows) for (const f of featuresOf(flow)) edges.push({ from: f, to: flow.id, kind: 'e-feat' });
  return { screens, used, unused, features, flows, edges };
}

function renderMap() {
  if (!$('#mapview')) return;
  const { screens, used, unused, features, flows } = mapNodes();
  $('#mapcount').textContent = '(' + screens.length + ')';
  const refNode = r => '<button class="mnode mref' + (r.screensUsing.length ? '' : ' unused') + '" data-node="' + r.id + '" data-ref="' + r.id + '">' + (r.image ? '<img src="' + escapeHtml(assetUrl(r.image)) + '" alt="" loading="lazy">' : '<span class="noimg"></span>') + '<span><b>' + escapeHtml(r.title) + '</b><small>' + escapeHtml(groupLabel(r.group)) + '</small></span></button>';
  const screenNode = s => '<button class="mnode mscreen" data-node="' + s.id + '" data-screen="' + s.id + '"><span class="phones"><img src="' + escapeHtml(assetUrl(s.design.image)) + '" alt="Maqueta de ' + escapeHtml(s.title) + '">' + (s.built ? '<img src="' + escapeHtml(assetUrl(s.built.image)) + '" alt="Captura de la app">' : '<i title="Por construir"></i>') + '</span><span><b>' + escapeHtml(s.title) + '</b><small>' + escapeHtml(data.moments[momentIndex(s.moment)]?.label || s.moment) + '</small><small>' + (s.built ? 'Construida, captura del ' + escapeHtml(s.built.capturedAt) : 'Solo maqueta, por construir') + '</small></span></button>';
  const featNode = f => '<button class="mnode mfeat" data-node="' + f.id + '" data-feature="' + f.id + '"><span><b>' + escapeHtml(f.title) + '</b><small>' + escapeHtml(f.owner) + ', ' + escapeHtml(label(f.buildStatus).toLowerCase()) + '</small></span></button>';
  const flowNode = f => '<button class="mnode mflow" data-node="' + f.id + '" data-flow="' + f.id + '"><span><b>' + escapeHtml(f.title) + '</b><small>' + f.steps.length + ' pasos</small></span></button>';
  $('#mapview').innerHTML = '<div class="mapintro"><p>Cada pantalla del celular, con las funcionalidades que cumple y los flujos donde aparece. Pasa el cursor por un nodo para ver su cadena; ábrelo para ver el detalle.</p><div class="toggles"><label><input type="checkbox" id="mapapps"' + (mapShowApps ? ' checked' : '') + '> Ver las apps de ejemplo que inspiran cada pantalla (' + used.length + ')</label>' + (mapShowApps && unused.length ? '<label><input type="checkbox" id="mapunused"' + (mapShowUnused ? ' checked' : '') + '> Incluir las ' + unused.length + ' que no inspiran ninguna</label>' : '') + '</div></div>'
    + '<div class="mapgrid' + (mapShowApps ? '' : ' noapps') + '" id="mapgrid"><svg class="mapedges" id="mapedges"></svg>'
    + (mapShowApps ? '<div class="mapcol"><h3>Apps de ejemplo (' + used.length + ')</h3>' + used.map(refNode).join('') + (unused.length && mapShowUnused ? '<h4>No inspiran ninguna pantalla (' + unused.length + ')</h4>' + unused.map(refNode).join('') : '') + '</div>' : '')
    + '<div class="mapcol"><h3>Pantallas (' + screens.length + ')</h3>' + screens.map(screenNode).join('') + '</div>'
    + '<div class="mapcol"><h3>Funcionalidades (' + features.length + ')</h3>' + features.map(featNode).join('') + '</div>'
    + '<div class="mapcol"><h3>Flujos (' + flows.length + ')</h3>' + flows.map(flowNode).join('') + '</div></div>'
    + '<div class="legend">' + (mapShowApps ? '<span><i></i>inspira (pasa el cursor por la línea para ver por qué)</span>' : '') + '<span><i></i>cumple la funcionalidad</span><span><i></i>aparece en el flujo</span></div>';
  $('#mapapps').onchange = e => { mapShowApps = e.target.checked; renderMap(); };
  if ($('#mapunused')) $('#mapunused').onchange = e => { mapShowUnused = e.target.checked; renderMap(); };
  bindLinks();
  $$('#mapgrid img').forEach(img => img.addEventListener('load', drawMapEdges, { once: true }));
  $$('#mapgrid .mnode').forEach(n => { n.onmouseenter = n.onfocus = () => focusChain(n.dataset.node); n.onmouseleave = n.onblur = () => focusChain(null); });
  drawMapEdges();
}

function drawMapEdges() {
  const grid = $('#mapgrid'); if (!grid || !grid.offsetParent) return;
  const box = grid.getBoundingClientRect(), { edges } = mapNodes();
  const rect = id => grid.querySelector('[data-node="' + id + '"]')?.getBoundingClientRect();
  $('#mapedges').innerHTML = edges.map(e => {
    const a = rect(e.from), b = rect(e.to); if (!a || !b) return '';
    const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top, dx = (x2 - x1) / 2;
    const d = 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
    return '<path class="' + e.kind + '" data-from="' + e.from + '" data-to="' + e.to + '" d="' + d + '"/>' + (e.why ? '<path class="hit" d="' + d + '"><title>' + escapeHtml(referenceById(e.from)?.title + ': ' + e.why) + '</title></path>' : '');
  }).join('');
}

// La cadena de un nodo: todo lo que lo alimenta hacia la izquierda y todo lo que alimenta él hacia la derecha.
// Una app de ejemplo solo ilumina las pantallas que inspira: inspira el diseño, no decide funcionalidades ni flujos.
function focusChain(id) {
  const grid = $('#mapgrid'); if (!grid) return;
  grid.classList.toggle('focus', Boolean(id)); $$('#mapgrid .on').forEach(n => n.classList.remove('on')); if (!id) return;
  const { edges } = mapNodes(), seen = new Set([id]), lit = new Set();
  const appOnly = id.startsWith('ref-');
  for (const dir of ['from', 'to']) {
    const other = dir === 'from' ? 'to' : 'from', queue = [id];
    while (queue.length) { const cur = queue.shift(); for (const e of edges) if (e[dir] === cur) { lit.add(e); if (!seen.has(e[other])) { seen.add(e[other]); if (!appOnly) queue.push(e[other]); } } }
  }
  seen.forEach(n => grid.querySelector('[data-node="' + n + '"]')?.classList.add('on'));
  $$('#mapedges path').forEach(p => { if ([...lit].some(e => e.from === p.dataset.from && e.to === p.dataset.to)) p.classList.add('on'); });
}

function openDialog(title, body) {
  $('#detailtitle').textContent = title; $('#detailbody').innerHTML = body; bindLinks();
  if (!$('#detail').open) $('#detail').showModal(); else $('#detail').scrollTop = 0;
}
function mapSection(title, body, classes = '') { return '<section class="detailsection ' + classes + '"><h3>' + title + '</h3>' + body + '</section>'; }
function screenThumbs(screens) { return screens.length ? '<div class="screenthumbs">' + screens.map(s => '<button data-screen="' + s.id + '"><img src="' + escapeHtml(assetUrl(s.design.image)) + '" alt="">' + escapeHtml(s.title) + '</button>').join('') + '</div>' : '<p>Todavía no inspira ninguna pantalla.</p>'; }

function openScreen(id) {
  const s = screenById(id); if (!s) return;
  const steps = s.flowSteps.map(fs => { const flow = data.flows.find(f => f.id === fs.flowId), step = flow?.steps.find(x => x.id === fs.stepId); return flow && step ? '<li><button class="textbutton" data-flow="' + flow.id + '">' + escapeHtml(flow.title) + '</button>: ' + escapeHtml(step.title) + '</li>' : ''; }).join('');
  const refs = s.inspiredBy.map(i => ({ r: referenceById(i.refId), why: i.why })).filter(x => x.r).map(x => '<li><button class="textbutton" data-ref="' + x.r.id + '">' + escapeHtml(x.r.title) + '</button>: ' + escapeHtml(x.why) + '</li>').join('');
  const built = s.built
    ? '<figure><img src="' + escapeHtml(assetUrl(s.built.image)) + '" alt="Captura de la app construida"><figcaption>Construida: captura del ' + escapeHtml(s.built.capturedAt) + ', carril ' + escapeHtml(s.built.maintainer) + '</figcaption></figure>'
    : '<figure><div class="pending"><span>Todavía no hay captura de la app.<br><br>Cuando esté construida, <code>npm run tablero:pantallas</code> la trae aquí sola.</span></div><figcaption>Construida: pendiente</figcaption></figure>';
  openDialog(s.title, '<p>' + escapeHtml(s.summary) + '</p><div><span class="pill agreed">Diseño: ' + escapeHtml(label(s.designStatus)) + '</span><span class="pill pending">Construcción: ' + escapeHtml(label(s.buildStatus)) + '</span></div><p class="meta">Pantalla de la app: ' + escapeHtml(s.owner) + '. Diseño: ' + escapeHtml(s.designer || s.maintainer) + '. Actualizada ' + escapeHtml(s.updatedAt) + '.</p>'
    + '<div class="phonepair"><figure><img src="' + escapeHtml(assetUrl(s.design.image)) + '" alt="Maqueta"><figcaption>Diseño: ' + escapeHtml(s.design.label) + ', ' + escapeHtml(s.design.date) + '</figcaption></figure>' + built + '</div>'
    + '<div class="detailgrid">' + mapSection('Funcionalidades que cumple', featureLinks(s.featureIds)) + mapSection('Pasos de los flujos', steps ? '<ul>' + steps + '</ul>' : '<p>Sin pasos enlazados.</p>')
    + mapSection('Apps de ejemplo que la inspiran', refs ? '<ul>' + refs + '</ul>' : '<p>Sin referentes registrados.</p>', 'wide') + mapSection('Notas', list(s.notes || []), 'wide')
    + mapSection('Fuente', sourceLink(s.source, 'Ficha versionada, ' + s.id) + (s.design.source ? sourceLink(s.design.source, 'Maqueta en HTML') : ''), 'wide') + '</div>');
}

function openReference(id) {
  const r = referenceById(id); if (!r) return;
  const using = (data.screens || []).filter(s => s.inspiredBy.some(i => i.refId === r.id));
  openDialog(r.title, '<div class="refhero">' + (r.image ? '<img src="' + escapeHtml(assetUrl(r.image)) + '" alt="Captura promocional de ' + escapeHtml(r.title) + '">' : '') + '<div><p>' + escapeHtml(r.summary) + '</p><span class="pill">' + escapeHtml(groupLabel(r.group)) + '</span>'
    + (r.aesthetic ? '<p class="meta">Estética observada: ' + escapeHtml(r.aesthetic) + '</p>' : '') + '<p><a class="evidence" href="' + escapeHtml(r.url) + '" target="_blank" rel="noreferrer">Sitio oficial ↗</a>' + (r.appStore ? '<a class="evidence" href="' + escapeHtml(r.appStore) + '" target="_blank" rel="noreferrer">App Store ↗</a>' : '') + '</p></div></div>'
    + '<div class="detailgrid">' + mapSection('Qué tomamos para Solsets', '<div class="example"><p>' + escapeHtml(r.takeaway) + '</p></div>') + mapSection('Ojo con', '<div class="questions"><p>' + escapeHtml(r.limit) + '</p></div>')
    + mapSection('Pantallas que inspira', screenThumbs(using), 'wide')
    + mapSection('Fuente', r.evidence.map(e => sourceLink(e.path, e.label)).join('') + sourceLink(r.source, 'Ficha versionada, ' + r.id) + (r.imageSource ? '<a class="evidence" href="' + escapeHtml(r.imageSource) + '" target="_blank" rel="noreferrer">Origen de la imagen ↗</a>' : ''), 'wide') + '</div>');
}

// Sección de pantallas dentro de la ficha de una funcionalidad.
function featureScreensHtml(featureId) {
  const screens = (data.screens || []).filter(s => s.featureIds.includes(featureId));
  return mapSection('Cómo se ve en el celular', screenThumbs(screens), 'wide');
}

document.addEventListener('click', e => {
  const screen = e.target.closest('[data-screen]'), ref = e.target.closest('[data-ref]');
  if (screen) openScreen(screen.dataset.screen); else if (ref) openReference(ref.dataset.ref);
});
window.addEventListener('resize', drawMapEdges);

// Enlaces directos para compartir una vista: #mapa abre el mapa, #mapa-apps lo abre con las apps de ejemplo y #pantalla=<id> abre esa pantalla.
function openFromHash() {
  const screen = location.hash.match(/^#pantalla=([a-z0-9-]+)$/);
  if (location.hash === '#mapa-apps') mapShowApps = true;
  if (location.hash === '#mapa' || location.hash === '#mapa-apps' || screen) switchTab('map');
  if (screen) openScreen(screen[1]);
}
openFromHash();
window.addEventListener('hashchange', openFromHash);
