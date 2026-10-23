import { orderedFeatures, moments, labels } from './model.mjs';
export const C = { title: '#1e40af', subtitle: '#3b82f6', text: '#374151', muted: '#64748b', line: '#1e3a5f', background: '#ffffff', start: '#fed7aa', startLine: '#c2410c', success: '#a7f3d0', successLine: '#047857', decision: '#fef3c7', decisionLine: '#b45309', pending: '#dbeafe' };
export const xml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function wrap(value, max = 38) {
  return String(value).split('\n').flatMap(p => {
    const lines = []; let line = '';
    for (const word of p.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; }
      else line = (line + ' ' + word).trim();
    }
    lines.push(line); return lines;
  });
}
export function geometry(flow) {
  return flow.steps.map((s, i) => ({ ...s, x: Number.isFinite(s.x) ? s.x : i * 430, y: Number.isFinite(s.y) ? s.y : 80, width: s.kind === 'decision' ? 350 : 320, height: s.kind === 'decision' ? 220 : 170 }));
}
function palette(kind) {
  return kind === 'decision' ? [C.decision, C.decisionLine] : kind === 'pending' ? [C.pending, C.title] : kind === 'start' ? [C.start, C.startLine] : kind === 'end' ? [C.success, C.successLine] : [C.background, C.line];
}
function edgePoints(a, b) {
  if (b.x > a.x + a.width) return [[a.x + a.width, a.y + a.height / 2], [b.x, b.y + b.height / 2]];
  if (b.y > a.y + a.height) return [[a.x + a.width / 2, a.y + a.height], [b.x + b.width / 2, b.y]];
  return [[a.x, a.y + a.height / 2], [b.x + b.width, b.y + b.height / 2]];
}
export function flowSvg(flow) {
  const nodes = geometry(flow), width = Math.max(...nodes.map(s => s.x + s.width)) + 60, height = Math.max(...nodes.map(s => s.y + s.height)) + 60;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 -25 ${width + 25} ${height + 25}" width="${width}" height="${height}" role="img" aria-label="${xml(flow.title)}"><defs><marker id="arrow-${xml(flow.id)}" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="${C.muted}"/></marker></defs>`;
  for (const e of flow.connections) {
    const [a, b] = edgePoints(nodes.find(s => s.id === e.from), nodes.find(s => s.id === e.to));
    const vertical = a[0] === b[0], x = (a[0] + b[0]) / 2 + (vertical ? 12 : 0), y = (a[1] + b[1]) / 2 - 22;
    svg += `<path d="M${a.join(' ')} L${b.join(' ')}" fill="none" stroke="${C.muted}" stroke-width="2" marker-end="url(#arrow-${xml(flow.id)})"/><text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="14" text-anchor="${vertical ? 'start' : 'middle'}" fill="${C.text}">${wrap(e.label, 12).map((l, i) => `<tspan x="${x}" dy="${i ? 18 : 0}">${xml(l)}</tspan>`).join('')}</text>`;
  }
  for (const s of nodes) {
    const [fill, stroke] = palette(s.kind), cx = s.x + s.width / 2, cy = s.y + s.height / 2, title = wrap(s.title, s.kind === 'decision' ? 21 : 25), top = cy - title.length * 13;
    const shape = s.kind === 'decision' ? `<polygon points="${cx},${s.y} ${s.x + s.width},${cy} ${cx},${s.y + s.height} ${s.x},${cy}"/>` : ['start', 'end'].includes(s.kind) ? `<ellipse cx="${cx}" cy="${cy}" rx="${s.width / 2}" ry="${s.height / 2}"/>` : `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="12"/>`;
    svg += `<g fill="${fill}" stroke="${stroke}" stroke-width="1.5">${shape}</g><text x="${cx}" y="${top}" font-family="system-ui,sans-serif" font-size="21" font-weight="600" text-anchor="middle" fill="${C.text}">${title.map((l, i) => `<tspan x="${cx}" dy="${i ? 27 : 0}">${xml(l)}</tspan>`).join('')}</text><text x="${cx}" y="${cy + title.length * 14 + 22}" font-family="system-ui,sans-serif" font-size="14" text-anchor="middle" fill="${C.muted}">${xml(s.actor)}</text>`;
  }
  return svg + '</svg>';
}

export function excalidraw(model) {
  const elements = []; let seed = 200000;
  const base = (id, type, x, y, width, height, extra = {}) => ({ id, type, x, y, width, height, angle: 0, strokeColor: C.line, backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: ++seed, version: 1, versionNonce: seed + 1000000, isDeleted: false, boundElements: null, updated: 1, link: null, locked: false, ...extra });
  const text = (id, x, y, value, size = 22, color = C.text, extra = {}) => { const lines = String(value).split('\n'); elements.push(base(id, 'text', x, y, Math.max(...lines.map(l => l.length)) * size * .62, lines.length * size * 1.25, { text: value, originalText: value, fontSize: size, fontFamily: 3, textAlign: 'left', verticalAlign: 'top', containerId: null, lineHeight: 1.25, autoResize: true, strokeColor: color, ...extra })); };
  const box = (id, type, x, y, width, height, fill, stroke, group) => elements.push(base(id, type, x, y, width, height, { backgroundColor: fill, strokeColor: stroke, roundness: type === 'rectangle' ? { type: 3 } : null, groupIds: group ? [group] : [] }));
  const arrow = (id, from, to, group) => elements.push(base(id, 'arrow', from[0], from[1], Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), { points: [[0, 0], [to[0] - from[0], to[1] - from[1]]], startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: 'arrow', groupIds: group ? [group] : [], strokeColor: C.muted }));
  text('board-title', 60, 40, 'Solsets · Funcionalidades y recorridos', 42, C.title);
  text('board-context', 60, 120, 'Documentación de esta rama · Texto completo y evidencia en el panel\nLas tarjetas iniciales son acuerdos de producto; implementación y disponibilidad sin verificar.', 22, C.muted);
  text('board-order', 60, 205, 'El orden se guarda desde el panel. Mover una tarjeta no cambia sus reglas ni su estado.', 20, C.muted);
  let bottom = 380;
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i], x = 60 + i * 690; text('moment-' + m.id, x, 300, m.label, 27, C.title);
    const cards = orderedFeatures(model, m.id);
    for (let j = 0; j < cards.length; j++) {
      const f = cards[j], y = 375 + j * 400, group = 'group-' + f.id;
      box(f.id + '-box', 'rectangle', x, y, 620, 340, C.background, C.line, group);
      text(f.id + '-name', x + 24, y + 24, wrap(f.title, 33).join('\n'), 26, C.title, { groupIds: [group] });
      text(f.id + '-summary', x + 24, y + 128, wrap(f.summary, 43).join('\n'), 20, C.text, { groupIds: [group] });
      text(f.id + '-state', x + 24, y + 238, `${f.owner} · ${labels[f.productStatus]}\nConstrucción: ${labels[f.buildStatus]}\nDisponible: ${labels[f.availability]}`, 18, C.muted, { groupIds: [group] });
      bottom = Math.max(bottom, y + 400);
    }
    if (!cards.length) text('moment-empty-' + m.id, x, 400, 'Sin tarjetas todavía.', 21, C.muted);
  }
  let y = bottom + 100;
  text('flows-title', 60, y, 'Flujos · decisiones, salidas y preguntas abiertas', 32, C.title); y += 100;
  const ordered = orderFlows(model);
  for (const flow of ordered) {
    const group = 'group-' + flow.id, nodes = geometry(flow), ox = 60, oy = y + 170;
    text(flow.id + '-title', 60, y, flow.title, 30, C.title, { groupIds: [group] });
    text(flow.id + '-summary', 60, y + 55, wrap(flow.summary, 115).join('\n'), 20, C.text, { groupIds: [group] });
    text(flow.id + '-state', 60, y + 115, `${flow.owner} · ${labels[flow.productStatus]} · Construcción: ${labels[flow.buildStatus]}`, 18, C.muted, { groupIds: [group] });
    for (let i = 0; i < flow.connections.length; i++) {
      const c = flow.connections[i], [a, b] = edgePoints(nodes.find(n => n.id === c.from), nodes.find(n => n.id === c.to));
      arrow(flow.id + '-edge-' + i, [a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], group);
      const vertical = a[0] === b[0], lines = wrap(c.label, 12), width = Math.max(...lines.map(l => l.length)) * 14 * .62;
      text(flow.id + '-edge-label-' + i, ox + (a[0] + b[0]) / 2 + (vertical ? 12 : -width / 2), oy + (a[1] + b[1]) / 2 - 24, lines.join('\n'), 14, C.text, { groupIds: [group] });
    }
    for (const s of nodes) {
      const [fill, stroke] = palette(s.kind), x = ox + s.x, sy = oy + s.y, lines = wrap(s.title, s.kind === 'decision' ? 21 : 25), size = 19, width = Math.max(...lines.map(l => l.length)) * size * .62;
      box(flow.id + '-' + s.id, s.kind === 'decision' ? 'diamond' : ['start', 'end'].includes(s.kind) ? 'ellipse' : 'rectangle', x, sy, s.width, s.height, fill, stroke, group);
      text(flow.id + '-' + s.id + '-name', x + (s.width - width) / 2, sy + s.height / 2 - lines.length * 13, lines.join('\n'), size, C.text, { groupIds: [group], textAlign: 'center' });
      const actorWidth = s.actor.length * 13 * .62;
      text(flow.id + '-' + s.id + '-actor', x + (s.width - actorWidth) / 2, sy + s.height / 2 + lines.length * 12 + 20, s.actor, 13, C.muted, { groupIds: [group] });
    }
    y = oy + Math.max(...nodes.map(n => n.y + n.height)) + 170;
    if (flow.questions.length) { text(flow.id + '-questions', 60, y, 'Por acordar: ' + wrap(flow.questions.join(' '), 135).join('\n'), 19, C.decisionLine, { groupIds: [group] }); y += wrap(flow.questions.join(' '), 135).length * 25 + 100; }
  }
  text('board-footer', 60, y + 30, 'Generado desde fichas versionadas. Los detalles, cambios y evidencia se leen en index.html.\nEdiciones manuales en este .excalidraw son una copia: para conservar el orden compartido, usar el panel.', 19, C.muted);
  return { type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements, appState: { viewBackgroundColor: C.background, gridSize: null, exportBackground: true }, files: {} };
}

export function orderFlows(model) {
  const order = model.layout.flows || [];
  return [...model.flows].sort((a, b) => (order.includes(a.id) ? order.indexOf(a.id) : 9999) - (order.includes(b.id) ? order.indexOf(b.id) : 9999) || a.title.localeCompare(b.title));
}
