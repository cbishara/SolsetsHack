import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { loadModel, validateLayout, boardDir, root, imageTypes } from './model.mjs';
import { build, atomicWrite } from './build.mjs';
import { flowSvg } from './diagram.mjs';

export async function startServer({ port = Number(process.env.TABLERO_PORT || 4175), open = false } = {}) {
  let cached;
  function refresh() {
    const fresh = loadModel();
    if (fresh.revision !== cached?.revision) { build(fresh); cached = fresh; }
    return { ...cached, flowDiagrams: Object.fromEntries(cached.flows.map(f => [f.id, flowSvg(f)])) };
  }
  refresh();
  let address;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    if (![ `127.0.0.1:${address?.port}`, `localhost:${address?.port}` ].includes(req.headers.host)) return json(403, { error: 'Este tablero solo acepta acceso local.' });
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === 'GET' && url.pathname === '/api/state') return json(200, refresh());
      if (req.method === 'POST' && url.pathname === '/api/layout') {
        if (![`http://127.0.0.1:${address.port}`, `http://localhost:${address.port}`].includes(req.headers.origin) || !req.headers['content-type']?.startsWith('application/json')) return json(403, { error: 'Guarda el orden desde el panel local.' });
        const parts = []; let size = 0;
        for await (const part of req) { size += part.length; if (size > 262144) return json(413, { error: 'La disposición es demasiado grande.' }); parts.push(part); }
        let body; try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { return json(400, { error: 'Disposición no válida.' }); }
        const model = loadModel();
        if (body.revision !== model.revision) return json(409, { error: 'Las fichas o el orden cambiaron mientras organizabas. Recarga antes de guardar sobre la versión nueva.' });
        try { validateLayout(body.layout, [...model.features, ...model.flows]); } catch (e) { return json(400, { error: e.message }); }
        atomicWrite(join(boardDir, 'disposicion.json'), JSON.stringify(body.layout, null, 2) + '\n');
        return json(200, refresh());
      }
      if (req.method === 'GET' && ['/', '/index.html', '/tablero.excalidraw', '/README.md', '/PROTOCOLO.md'].includes(url.pathname)) {
        if (['/', '/index.html', '/tablero.excalidraw'].includes(url.pathname)) refresh();
        const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.excalidraw') ? 'application/json' : 'text/plain';
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(readFileSync(join(boardDir, file)));
      }
      if (req.method === 'GET' && url.pathname === '/source') {
        const model = loadModel(), records = [...model.features, ...model.flows, ...model.changes, ...model.screens, ...model.references];
        const allowed = new Set(records.flatMap(r => [r.source, r.design?.source, ...(r.evidence || []).map(e => e.path)]).filter(Boolean));
        const path = url.searchParams.get('path');
        if (!allowed.has(path)) return json(404, { error: 'Fuente no registrada en el tablero.' });
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(readFileSync(resolve(root, path)));
      }
      if (req.method === 'GET' && url.pathname.startsWith('/docs/equipo/')) {
        // Solo imágenes que alguna ficha registra: pantallas diseñadas, capturas construidas y referentes.
        const model = loadModel(), path = decodeURIComponent(url.pathname.slice(1));
        const images = new Set([...model.screens.flatMap(s => [s.design?.image, s.built?.image]), ...model.references.map(r => r.image)].filter(Boolean));
        if (!images.has(path)) return json(404, { error: 'Imagen no registrada en el tablero.' });
        const ext = Object.keys(imageTypes).find(e => path.toLowerCase().endsWith(e));
        res.writeHead(200, { 'Content-Type': imageTypes[ext] }); return res.end(readFileSync(resolve(root, path)));
      }
      return json(404, { error: 'Ruta no encontrada.' });
    } catch (e) { return json(500, { error: `No se pudo reunir el tablero: ${e.message}` }); }
  });
  const listen = candidate => new Promise((done, reject) => { server.once('error', reject); server.listen(candidate, '127.0.0.1', () => { server.removeListener('error', reject); done(); }); });
  try { await listen(port); } catch (e) { if (e.code !== 'EADDRINUSE' || port === 0) throw e; await listen(0); }
  address = server.address(); const url = `http://127.0.0.1:${address.port}`;
  if (open && process.platform === 'darwin') execFile('open', [url], error => { if (error) console.log('Abre este enlace en tu navegador: ' + url); });
  return { server, url };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { url } = await startServer({ open: !process.argv.includes('--no-open') });
  console.log(`\nTablero del equipo: ${url}\nLee las fichas de esta copia del repo. Guarda el orden en disposicion.json.\nCtrl+C para detenerlo.\n`);
}
