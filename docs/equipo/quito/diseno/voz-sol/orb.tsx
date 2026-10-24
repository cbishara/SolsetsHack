// Adapted from ElevenLabs UI Orb, MIT, copyright 2025 Eleven Labs Inc.
// Source commit 3a28ebab197f8cfa599934f52db12ad1396e54f4. See THIRD-PARTY-NOTICES.md.
// SOL adaptations: local texture, controlled pause, deterministic capture, bounded rendering,
// layout-size measuring for the animated character rig.
"use client"

import { useEffect, useMemo, useRef } from "react"
import { createNoiseTexture } from "./perlin-texture"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import fragmentShader from "./orb.frag"

export type AgentState = null | "thinking" | "listening" | "talking"

type OrbProps = {
  colors?: [string, string]
  colorsRef?: React.RefObject<[string, string]>
  resizeDebounce?: number
  seed?: number
  agentState?: AgentState
  volumeMode?: "auto" | "manual"
  manualInput?: number
  manualOutput?: number
  inputVolumeRef?: React.RefObject<number>
  outputVolumeRef?: React.RefObject<number>
  getInputVolume?: () => number
  getOutputVolume?: () => number
  className?: string
  paused?: boolean
  capture?: boolean
}

export function Orb({
  colors = ["#CADCFC", "#A0B9D1"],
  colorsRef,
  resizeDebounce = 100,
  seed,
  agentState = null,
  volumeMode = "auto",
  manualInput,
  manualOutput,
  inputVolumeRef,
  outputVolumeRef,
  getInputVolume,
  getOutputVolume,
  className,
  paused = false,
  capture = false,
}: OrbProps) {
  return (
    <div className={className ?? "relative h-full w-full"}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={paused || capture ? "demand" : "always"}
        // Layout size, so the character's tilt and squash never resize the drawing buffer.
        resize={{ debounce: resizeDebounce, offsetSize: true }}
        gl={{
          alpha: true,
          antialias: true,
          premultipliedAlpha: true,
        }}
      >
        <Scene
          paused={paused}
          capture={capture}
          colors={colors}
          colorsRef={colorsRef}
          seed={seed}
          agentState={agentState}
          volumeMode={volumeMode}
          manualInput={manualInput}
          manualOutput={manualOutput}
          inputVolumeRef={inputVolumeRef}
          outputVolumeRef={outputVolumeRef}
          getInputVolume={getInputVolume}
          getOutputVolume={getOutputVolume}
        />
      </Canvas>
    </div>
  )
}

function Scene({
  colors,
  colorsRef,
  paused,
  capture,
  seed,
  agentState,
  volumeMode,
  manualInput,
  manualOutput,
  inputVolumeRef,
  outputVolumeRef,
  getInputVolume,
  getOutputVolume,
}: {
  colors: [string, string]
  paused: boolean
  capture: boolean
  colorsRef?: React.RefObject<[string, string]>
  seed?: number
  agentState: AgentState
  volumeMode: "auto" | "manual"
  manualInput?: number
  manualOutput?: number
  inputVolumeRef?: React.RefObject<number>
  outputVolumeRef?: React.RefObject<number>
  getInputVolume?: () => number
  getOutputVolume?: () => number
}) {
  const { gl } = useThree()
  const circleRef =
    useRef<THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>>(null)
  const initialColorsRef = useRef<[string, string]>(colors)
  const targetColor1Ref = useRef(new THREE.Color(colors[0]))
  const targetColor2Ref = useRef(new THREE.Color(colors[1]))
  const animSpeedRef = useRef(0.1)
  const perlinNoiseTexture = useMemo(() => createNoiseTexture(), [])
  useEffect(() => () => perlinNoiseTexture.dispose(), [perlinNoiseTexture])

  const agentRef = useRef<AgentState>(agentState)
  const modeRef = useRef<"auto" | "manual">(volumeMode)
  const manualInRef = useRef<number>(manualInput ?? 0)
  const manualOutRef = useRef<number>(manualOutput ?? 0)
  const curInRef = useRef(0)
  const curOutRef = useRef(0)

  useEffect(() => {
    agentRef.current = agentState
  }, [agentState])

  useEffect(() => {
    modeRef.current = volumeMode
  }, [volumeMode])

  useEffect(() => {
    manualInRef.current = clamp01(
      manualInput ?? inputVolumeRef?.current ?? getInputVolume?.() ?? 0
    )
  }, [manualInput, inputVolumeRef, getInputVolume])

  useEffect(() => {
    manualOutRef.current = clamp01(
      manualOutput ?? outputVolumeRef?.current ?? getOutputVolume?.() ?? 0
    )
  }, [manualOutput, outputVolumeRef, getOutputVolume])

  const random = useMemo(
    () => splitmix32(seed ?? Math.floor(Math.random() * 2 ** 32)),
    [seed]
  )
  const offsets = useMemo(
    () =>
      new Float32Array(Array.from({ length: 7 }, () => random() * Math.PI * 2)),
    [random]
  )

  useEffect(() => {
    targetColor1Ref.current = new THREE.Color(colors[0])
    targetColor2Ref.current = new THREE.Color(colors[1])
  }, [colors])

  useEffect(() => {
    const apply = () => {
      if (!circleRef.current) return
      const isDark = document.documentElement.classList.contains("dark")
      circleRef.current.material.uniforms.uInverted.value = isDark ? 1 : 0
    }

    apply()

    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  useFrame((_, delta: number) => {
    const mat = circleRef.current?.material
    if (!mat) return
    const live = colorsRef?.current
    if (live) {
      if (live[0]) targetColor1Ref.current.set(live[0])
      if (live[1]) targetColor2Ref.current.set(live[1])
    }
    const u = mat.uniforms
    u.uTime.value = paused || capture ? 5.4 : u.uTime.value + delta * 0.5

    if (paused || capture) u.uOpacity.value = 1
    if (u.uOpacity.value < 1) {
      u.uOpacity.value = Math.min(1, u.uOpacity.value + delta * 2)
    }

    let targetIn = 0
    let targetOut = 0.3
    if (modeRef.current === "manual") {
      targetIn = clamp01(
        manualInput ?? inputVolumeRef?.current ?? getInputVolume?.() ?? 0
      )
      targetOut = clamp01(
        manualOutput ?? outputVolumeRef?.current ?? getOutputVolume?.() ?? 0
      )
    } else {
      const t = u.uTime.value * 2
      if (agentRef.current === null) {
        targetIn = 0
        targetOut = 0.3
      } else if (agentRef.current === "listening") {
        targetIn = clamp01(0.55 + Math.sin(t * 3.2) * 0.35)
        targetOut = 0.45
      } else if (agentRef.current === "talking") {
        targetIn = clamp01(0.65 + Math.sin(t * 4.8) * 0.22)
        targetOut = clamp01(0.75 + Math.sin(t * 3.6) * 0.22)
      } else {
        const base = 0.38 + 0.07 * Math.sin(t * 0.7)
        const wander = 0.05 * Math.sin(t * 2.1) * Math.sin(t * 0.37 + 1.2)
        targetIn = clamp01(base + wander)
        targetOut = clamp01(0.48 + 0.12 * Math.sin(t * 1.05 + 0.6))
      }
    }

    const smoothing = paused || capture ? 1 : 1 - Math.exp(-delta * 14)
    curInRef.current += (targetIn - curInRef.current) * smoothing
    curOutRef.current += (targetOut - curOutRef.current) * smoothing

    const voiceLevel = Math.max(curInRef.current, curOutRef.current)
    const targetSpeed = 0.12 + (1 - Math.pow(voiceLevel - 1, 2)) * 0.9
    animSpeedRef.current += (targetSpeed - animSpeedRef.current) * 0.12

    u.uAnimation.value = paused || capture ? 0.7 : u.uAnimation.value + delta * animSpeedRef.current
    u.uInputVolume.value = curInRef.current
    u.uOutputVolume.value = curOutRef.current
    u.uColor1.value.lerp(targetColor1Ref.current, paused || capture ? 1 : 0.08)
    u.uColor2.value.lerp(targetColor2Ref.current, paused || capture ? 1 : 0.08)
  })

  useEffect(() => {
    const canvas = gl.domElement
    let restoreTimer: ReturnType<typeof setTimeout> | undefined
    const onContextLost = (event: Event) => {
      event.preventDefault()
      restoreTimer = setTimeout(() => {
        gl.forceContextRestore()
      }, 1)
    }
    canvas.addEventListener("webglcontextlost", onContextLost, false)
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer)
      canvas.removeEventListener("webglcontextlost", onContextLost, false)
    }
  }, [gl])

  const uniforms = useMemo(() => {
    perlinNoiseTexture.wrapS = THREE.RepeatWrapping
    perlinNoiseTexture.wrapT = THREE.RepeatWrapping
    const isDark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
    return {
      uColor1: new THREE.Uniform(new THREE.Color(initialColorsRef.current[0])),
      uColor2: new THREE.Uniform(new THREE.Color(initialColorsRef.current[1])),
      uOffsets: { value: offsets },
      uPerlinTexture: new THREE.Uniform(perlinNoiseTexture),
      uTime: new THREE.Uniform(0),
      uAnimation: new THREE.Uniform(0.1),
      uInverted: new THREE.Uniform(isDark ? 1 : 0),
      uInputVolume: new THREE.Uniform(0),
      uOutputVolume: new THREE.Uniform(0),
      uOpacity: new THREE.Uniform(0),
    }
  }, [perlinNoiseTexture, offsets])

  return (
    <mesh ref={circleRef} onAfterRender={(renderer) => {
      renderer.domElement.dataset.orbReady = "true"
      renderer.domElement.dataset.renderMode = paused || capture ? "paused" : "fluid"
    }}>
      <circleGeometry args={[3.5, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        transparent={true}
      />
    </mesh>
  )
}

function splitmix32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t = t ^ (t >>> 15)
    t = Math.imul(t, 0x735a2d97)
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
const vertexShader = /* glsl */ `
uniform float uTime;
uniform sampler2D uPerlinTexture;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

