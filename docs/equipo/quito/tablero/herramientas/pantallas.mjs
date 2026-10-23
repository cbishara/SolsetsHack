import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadModel, root } from './model.mjs';
import { build } from './build.mjs';

// Saca una foto de cada pantalla de la app corriendo en el navegador (Expo web) con tamaño de iPhone.
// Cada carril declara sus rutas en docs/equipo/<persona>/tablero/capturas/rutas.json: { "pant-quito-alerta": "/alerta" }.
// Las fotos quedan en esa misma carpeta como <id-de-pantalla>.png y el tablero las pone al lado de la maqueta.
const run = promisify(execFile);
const chromeCandidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);

export function findChrome() {
  const found = chromeCandidates.find(existsSync);
  if (!found) throw new Error('No encontré Chrome. Instálalo o indica su ruta con CHROME_PATH=/ruta/al/chrome.');
  return found;
}

export async function capture({ baseUrl, route, file, chrome = findChrome(), width = 390, height = 844 }) {
  const url = new URL(route, baseUrl).href;
  await run(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${width},${height}`, '--virtual-time-budget=6000', `--user-data-dir=${join(root, '.data', 'tablero-chrome')}`, `--screenshot=${file}`, url], { timeout: 60000 });
  if (!existsSync(file)) throw new Error(`Chrome no dejó la captura de ${url}.`);
  return file;
}

export function routeFiles(base = resolve(root, 'docs/equipo')) {
  return readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => join(base, e.name, 'tablero', 'capturas', 'rutas.json')).filter(existsSync);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const urlIndex = process.argv.indexOf('--url');
  const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : process.env.EXPO_WEB_URL || 'http://localhost:8081';
  const screens = new Set(loadModel().screens.map(s => s.id)), files = routeFiles();
  if (!files.length) { console.log('Nadie declaró rutas todavía. Crea docs/equipo/<persona>/tablero/capturas/rutas.json con { "<id-de-pantalla>": "/ruta" }.'); process.exit(0); }
  const chrome = findChrome(); let done = 0;
  for (const routesPath of files) {
    const routes = JSON.parse(readFileSync(routesPath, 'utf8')), dir = resolve(routesPath, '..');
    mkdirSync(dir, { recursive: true });
    for (const [id, route] of Object.entries(routes)) {
      if (!screens.has(id)) { console.log(`Salto ${id}: no existe esa pantalla en el tablero (${relative(root, routesPath)}).`); continue; }
      const file = join(dir, `${id}.png`);
      try { await capture({ baseUrl, route, file, chrome }); done++; console.log(`Capturada ${id} desde ${new URL(route, baseUrl).href}`); }
      catch (e) { console.log(`No pude capturar ${id}: ${e.message}. ¿Está corriendo la app en ${baseUrl}? (npx expo start --web)`); }
    }
  }
  build();
  console.log(`${done} captura${done === 1 ? ' nueva' : 's nuevas'}. Tablero regenerado.`);
}
