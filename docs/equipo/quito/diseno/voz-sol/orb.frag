// SOL's fluid surface, rendered by the adapted ElevenLabs UI Orb.
uniform float uTime;
uniform float uAnimation;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uInputVolume;
uniform float uOutputVolume;
uniform float uOpacity;
uniform sampler2D uPerlinTexture;
varying vec2 vUv;

float field(vec2 p) {
  return texture2D(uPerlinTexture, p).r;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float radius = length(uv);
  float amplitude = max(uInputVolume, uOutputVolume);
  float t = uTime * 0.035 + uAnimation * 0.1;
  vec2 surface = uv * 0.34;

  // Two slowly evolving flow fields bend the bands instead of rotating spokes.
  vec2 warp = vec2(
    field(surface + vec2(t, -t * 0.7)),
    field(surface.yx + vec2(0.47 - t * 0.6, 0.13 + t))
  ) - 0.5;
  vec2 p = uv + warp * (0.65 + amplitude * 0.32);
  float curl = field(p * 0.22 + warp * 0.3 + vec2(0.2, t)) - 0.5;
  float phase = (p.y * 0.92 + p.x * 0.48) * 7.0 + curl * 5.5 - t * 5.0;
  float ribbon = 0.5 + 0.5 * sin(phase);
  float fineRibbon = 0.5 + 0.5 * sin(phase * 1.9 + curl * 3.5);
  float mixValue = clamp(0.17 + ribbon * 0.59 + fineRibbon * 0.12, 0.0, 1.0);
  vec3 color = mix(uColor1, uColor2, mixValue);

  // Subtle threads make small changes in the voice visible.
  float thread = pow(max(0.0, sin(phase * 2.6 + curl * 1.5)), 18.0);
  color += vec3(0.11, 0.18, 0.26) * thread * (0.25 + amplitude * 0.45);

  float z = sqrt(max(0.0, 1.0 - radius * radius));
  vec3 normal = normalize(vec3(uv, z));
  vec3 light = normalize(vec3(-0.55, 0.8, 1.4));
  float diffuse = max(0.0, dot(normal, light));
  color *= 0.36 + diffuse * 0.77;
  float shine = pow(max(0.0, dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0))), 24.0);
  color += vec3(0.28, 0.37, 0.48) * shine;
  float rim = pow(1.0 - z, 3.7);
  color += vec3(0.07, 0.12, 0.19) * rim;
  float contour = radius + (field(uv * 0.18 + vec2(t, 0.3)) - 0.42) * amplitude * 0.035;
  float alpha = (1.0 - smoothstep(0.985, 1.0, contour)) * uOpacity;
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
