import { build } from "esbuild"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const directory = dirname(fileURLToPath(import.meta.url))
const destination = resolve(directory, "../../../../..", ".context/voz-sol")
const iconWeight = "light"
const iconNames = {
  mic: "microphone",
  "mic-off": "microphone-slash",
  text: "chat-teardrop-text",
  close: "x",
  down: "caret-down",
  wave: "waveform",
  home: "house",
  list: "list-checks",
  pause: "pause",
  replay: "arrow-counter-clockwise",
}
const icons = {}
for (const [id, name] of Object.entries(iconNames)) {
  const asset = await readFile(
    resolve(directory, "node_modules/@phosphor-icons/core/assets/" + iconWeight + "/" + name + "-" + iconWeight + ".svg"),
    "utf8"
  )
  icons[id] = asset
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .replaceAll('fill="#000000"', 'fill="currentColor"')
}
const result = await build({
  absWorkingDir: directory,
  entryPoints: ["visuals.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["safari17", "chrome120"],
  jsx: "automatic",
  loader: { ".frag": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
  write: false,
  plugins: [{
    name: "local-phosphor-icons",
    setup(builder) {
      builder.onResolve({ filter: /^sol:icons$/ }, () => ({ path: "icons", namespace: "sol" }))
      builder.onLoad({ filter: /.*/, namespace: "sol" }, () => ({
        contents: JSON.stringify(icons),
        loader: "json",
      }))
    },
  }],
})
let html = await readFile(resolve(directory, "index.html"), "utf8")
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script")
const notices = (await readFile(resolve(directory, "THIRD-PARTY-NOTICES.md"), "utf8")).replaceAll("*/", "* /")
html = html.replace("<!-- SOL_VOICE_VISUALS -->", () => "<script>/*!\n" + notices + "\n*/\n" + script + "</script>")
const bundleSize = result.outputFiles[0].contents.byteLength
await mkdir(destination, { recursive: true })
try {
  const audio = await readFile(resolve(destination, "miguel-sample.mp3"))
  html = html.replace(
    "<!-- SOL_VOICE_AUDIO -->",
    '<script>window.solVoiceSample="data:audio/mpeg;base64,' + audio.toString("base64") + '";</script>'
  )
} catch { /* The design still works without the optional local sample. */ }
await writeFile(resolve(destination, "index.html"), html)
await writeFile(resolve(destination, "bundle-meta.json"), JSON.stringify({
  builtAt: new Date().toISOString(),
  renderer: "ElevenLabs UI Orb / React Three Fiber / Three.js",
  icons: "Phosphor " + iconWeight,
  transitions: "Motion",
  visualBundleBytes: bundleSize,
  scope: "Local web prototype, no mobile dependencies changed",
}, null, 2))
console.log(JSON.stringify({ destination, visualBundleBytes: bundleSize, icons: Object.keys(icons).length }))
