import { mkdir, writeFile } from 'node:fs/promises';

// A review frame around the exported app, never part of the native product UI.
const directory = new URL('../dist/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('phone-preview.html', directory), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SOL · Vista móvil</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef1f7;color:#151b2e;font:15px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}header{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:800px;margin:auto;padding:16px 20px}strong{display:block;font-size:18px}small{color:#62677a}nav{display:flex;gap:4px}button{min-height:44px;min-width:52px;border:1px solid #cad1de;border-radius:10px;background:white;color:#2e59e5;cursor:pointer;font:inherit}button[aria-pressed=true]{background:#2e59e5;color:white;border-color:#2e59e5}button:focus-visible{outline:3px solid #0b1d58;outline-offset:3px}main{padding:8px 12px 28px}iframe{display:block;width:390px;max-width:100%;height:calc(100dvh - 130px);max-height:844px;min-height:480px;margin:auto;border:1px solid #d5dbe7;border-radius:24px;background:white;box-shadow:0 16px 52px #172c5e16}p{text-align:center;color:#62677a;font-size:12px;margin:18px 0 0}@media(max-width:500px){header{flex-wrap:wrap}iframe{border-radius:0;height:calc(100dvh - 150px)}main{padding:0}p{padding:0 12px}}
</style></head><body><header><div><strong>SOL · Mi espacio</strong><small>Vista móvil de la app Expo</small></div><nav aria-label="Ancho de revisión"><button type="button" data-width="320" aria-pressed="false">320</button><button type="button" data-width="390" aria-pressed="true">390</button><button type="button" data-width="430" aria-pressed="false">430</button></nav></header><main><iframe title="SOL móvil" src="/"></iframe><p>Vista web para revisar el diseño. Los permisos y el teclado de iOS se prueban en el iPhone.</p></main><script>
const frame=document.querySelector('iframe');
document.querySelectorAll('button[data-width]').forEach(button=>button.addEventListener('click',()=>{frame.style.width=button.dataset.width+'px';document.querySelectorAll('button[data-width]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));}));
</script></body></html>`);
console.log('Vista móvil creada: dist/phone-preview.html (320 / 390 / 430 pt).');
