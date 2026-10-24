import * as THREE from "three"

// Deterministic, tileable texture generated in memory. No remote image request.
export function createNoiseTexture() {
  const size = 128
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = (x / size) * Math.PI * 2
      const b = (y / size) * Math.PI * 2
      const value =
        0.5 +
        0.17 * Math.sin(a * 2 + 1.2 * Math.sin(b * 3)) +
        0.12 * Math.cos(b * 2 - 1.5 * Math.cos(a * 3)) +
        0.08 * Math.sin(a * 5 + b * 4) +
        0.04 * Math.cos(a * 9 - b * 7)
      const index = (y * size + x) * 4
      const shade = Math.round(Math.max(0, Math.min(1, value)) * 255)
      pixels[index] = shade
      pixels[index + 1] = shade
      pixels[index + 2] = shade
      pixels[index + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}
