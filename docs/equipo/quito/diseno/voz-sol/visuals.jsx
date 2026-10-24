import React from "react"
import { createRoot } from "react-dom/client"
import { animate } from "motion"
import { Orb } from "./orb"
import icons from "sol:icons"

const media = window.matchMedia("(prefers-reduced-motion: reduce)")
const capture = new URLSearchParams(location.search).get("capture") === "1"

function installIcons() {
  for (const [name, markup] of Object.entries(icons)) {
    const symbol = document.getElementById("i-" + name)
    if (!symbol) continue
    symbol.setAttribute("viewBox", "0 0 256 256")
    symbol.setAttribute("fill", "currentColor")
    symbol.setAttribute("stroke", "none")
    symbol.innerHTML = markup
  }
  document.documentElement.dataset.icons = "phosphor-light"
}

class OrbBridge {
  constructor(host, owner) {
    this.host = host
    this.owner = owner
    this.input = 0
    this.output = 0
    this.colors = { current: ["#4f78ee", "#bbdbff"] }
    this.getInput = () => this.input
    this.getOutput = () => this.output
    this.root = createRoot(host)
    this.key = ""
    this.animation = null
    this.state = ""
    this.disposed = false
    this.onVisibility = () => this.sync(true)
    this.onMotion = () => this.sync(true)
    document.addEventListener("visibilitychange", this.onVisibility)
    media.addEventListener("change", this.onMotion)
    this.observer = new MutationObserver(() => this.sync())
    this.observer.observe(owner.el, {
      attributes: true,
      attributeFilter: ["data-theme", "data-state"],
    })
    this.sync()
  }

  sync(force = false) {
    if (this.disposed) return
    const owner = this.owner
    const state = owner.state || "listening"
    const muted = state === "muted" || state === "error"
    if (muted) this.input = this.output = 0
    const dark = owner.el.dataset.theme !== "day"
    const paused = muted || owner.closed || document.hidden || media.matches
    const key = [state, dark, paused, capture].join("/")
    document.documentElement.classList.toggle("dark", dark)
    this.colors.current = muted
      ? ["#263c65", "#839bc6"]
      : dark
        ? ["#3d68e4", "#b5d8ff"]
        : ["#2e59e5", "#9cc9ff"]
    if (key === this.key && !force) return
    this.key = key
    this.host.dataset.renderer = "elevenlabs-orb"
    this.host.dataset.motion = paused || capture ? "paused" : "fluid"
    this.root.render(
      <Orb
        className="orb-webgl"
        colors={this.colors.current}
        colorsRef={this.colors}
        seed={27}
        volumeMode="manual"
        getInputVolume={this.getInput}
        getOutputVolume={this.getOutput}
        agentState={
          state === "speaking"
            ? "talking"
            : state === "thinking"
              ? "thinking"
              : "listening"
        }
        paused={paused}
        capture={capture}
      />
    )
    if (this.state !== state && !capture && !media.matches && !owner.closed) {
      this.animation?.stop()
      this.animation = animate(
        owner.$(".voice-state"),
        { opacity: [0.45, 1], y: [5, 0] },
        { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
      )
    }
    this.state = state
  }

  frame(level) {
    if (this.disposed) return
    const state = this.owner.state
    const muted = state === "muted" || state === "error"
    this.input = !muted && state !== "speaking" && state !== "thinking" ? level : 0
    this.output = !muted && state === "speaking" ? level : 0
    this.owner.el.style.setProperty("--voice-level", muted ? 0 : level.toFixed(3))
    this.sync()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.observer.disconnect()
    media.removeEventListener("change", this.onMotion)
    document.removeEventListener("visibilitychange", this.onVisibility)
    this.animation?.stop()
    this.root.unmount()
  }
}

window.SolVoiceVisuals = {
  name: "ElevenLabs UI Orb / Three.js + Motion + Phosphor",
  mount(host, owner) {
    try {
      // Probe on a separate canvas, so the 2D fallback remains available.
      const probe = document.createElement("canvas")
      const gl = probe.getContext("webgl2")
      if (!gl) return null
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      return new OrbBridge(host, owner)
    } catch {
      return null
    }
  },
}
installIcons()
