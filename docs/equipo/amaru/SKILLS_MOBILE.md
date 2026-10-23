# SOL: diez skills de diseño móvil iOS instaladas

Fecha: 2026-10-23. Destino local: `~/.codex/skills`. No se modificó el repositorio de producto. Las skills se descubrirán automáticamente en el próximo turno; sus archivos ya pueden leerse y aplicarse ahora.

Se seleccionaron por relación directa con Expo/React Native, mantenimiento verificable y cobertura complementaria. “Mejores” es una selección razonada para SOL, no un ranking universal.

## Revisión y procedencia

Se leyeron las diez `SKILL.md` antes de instalar. Se usó únicamente el instalador oficial `skill-installer` con `--ref` de 40 caracteres y `--method download`. Cada `SKILL.md` instalada coincide byte por byte con la fuente revisada. Se conservaron los recursos propios de cada skill. No se reemplazó ninguna skill; `solsets-imagenes` permanece. No se ejecutó ningún script descargado ni se enviaron reportes a Expo. El único script de las skills seleccionadas es `expo-ui/scripts/list-components.js`: fue leído; inspecciona tipos locales, sin networking ni escrituras. El scan de instrucciones no detectó solicitudes de exfiltración ni comandos destructivos; sí hay envíos opcionales de feedback en Expo, fuera del alcance autorizado.

| # | Skill (nombre del frontmatter) | Capa | Fuente fija | Ruta local |
|---|---|---|---|---|
| 1 | `expo-native-ui` | Estructura visual y comportamiento nativos | [expo/skills@d5caf7fdf8b4](https://github.com/expo/skills/tree/d5caf7fdf8b4854351f05841a7e315ac87ad7d24/plugins/expo/skills/expo-native-ui) | `~/.codex/skills/expo-native-ui/SKILL.md` |
| 2 | `expo-ui` | Controles del sistema | [expo/skills@d5caf7fdf8b4](https://github.com/expo/skills/tree/d5caf7fdf8b4854351f05841a7e315ac87ad7d24/plugins/expo/skills/expo-ui) | `~/.codex/skills/expo-ui/SKILL.md` |
| 3 | `expo-router` | Arquitectura de navegación | [expo/skills@d5caf7fdf8b4](https://github.com/expo/skills/tree/d5caf7fdf8b4854351f05841a7e315ac87ad7d24/plugins/expo/skills/expo-router) | `~/.codex/skills/expo-router/SKILL.md` |
| 4 | `expo-animation` | Respuesta táctil y movimiento | [expo/skills@d5caf7fdf8b4](https://github.com/expo/skills/tree/d5caf7fdf8b4854351f05841a7e315ac87ad7d24/plugins/expo/skills/expo-animation) | `~/.codex/skills/expo-animation/SKILL.md` |
| 5 | `expo-design-system` | Una fuente visual compartida | [expo/skills@d5caf7fdf8b4](https://github.com/expo/skills/tree/d5caf7fdf8b4854351f05841a7e315ac87ad7d24/plugins/expo/skills/expo-design-system) | `~/.codex/skills/expo-design-system/SKILL.md` |
| 6 | `expo-data-fetching` | Estados reales de la experiencia | [expo/skills@d5caf7fdf8b4](https://github.com/expo/skills/tree/d5caf7fdf8b4854351f05841a7e315ac87ad7d24/plugins/expo/skills/expo-data-fetching) | `~/.codex/skills/expo-data-fetching/SKILL.md` |
| 7 | `vercel-react-native-skills` | Calidad y rendimiento RN | [vercel-labs/agent-skills@063bee94c3f4](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-native-skills) | `~/.codex/skills/react-native-skills/SKILL.md` |
| 8 | `mobile-ios-design` | Jerarquía y patrones HIG | [wshobson/agents@0874a27b17a2](https://github.com/wshobson/agents/tree/0874a27b17a22e2b7c2e2bcd725768e0803cad06/plugins/ui-design/skills/mobile-ios-design) | `~/.codex/skills/mobile-ios-design/SKILL.md` |
| 9 | `typography` | Jerarquía tipográfica y Dynamic Type | [rshankras/claude-code-apple-skills@9ffb83138209](https://github.com/rshankras/claude-code-apple-skills/tree/9ffb83138209057875698dd11c1720c657c47a92/skills/design/typography) | `~/.codex/skills/typography/SKILL.md` |
| 10 | `accessibility` | Semántica y operación con VoiceOver | [AccessibilityTools/iOSAccessibilitySkill@388bfb67061c](https://github.com/AccessibilityTools/iOSAccessibilitySkill/tree/388bfb67061cdb67ee108829109ea68d5115c230/plugins/ios-accessibility/skills/accessibility) | `~/.codex/skills/accessibility/SKILL.md` |

## Aplicación verificable: checklist para implementadores

Cada skill tiene un propósito distinto. La implementación debe aportar evidencia en archivo/componente o prueba; instalarla por sí solo no demuestra aplicación.

### 1. expo-native-ui — Estructura visual y comportamiento nativos

- [ ] Aplicar: Una sola superficie de scroll por pantalla; `contentInsetAdjustmentBehavior="automatic"`, contenido dentro de safe areas y controles accesibles con teclado abierto. SF Symbols reales en iOS; blanco como superficie. Datos importantes copiables; métricas con `fontVariant: ["tabular-nums"]`.
- [ ] Comprobar: Pantallas a 320/390/430 pt, texto largo y teclado: CTA visible y regreso funcional.

### 2. expo-ui — Controles del sistema

- [ ] Aplicar: Aplicar `@expo/ui` a selección de duración, switches y ajustes si el componente existe en el SDK instalado; envolver cada árbol en `Host`. Elegir `List`/`ListItem` para ajustes cortos y `BottomSheet` para selección contextual. Leer los `.d.ts` locales antes de programar props; no ejecutar scripts descargados.
- [ ] Comprobar: Elegir duración/cambiar ajuste modifica el estado visible. Cerrar sheet por botón o gesto deja un estado coherente.

### 3. expo-router — Arquitectura de navegación

- [ ] Aplicar: Usar Expo Router con native Stack, encabezados, gesto de volver y rutas de detalle; NativeTabs para destinos pares cuando corresponda. La configuración contextual puede usar `presentation: "formSheet"`. Las pestañas no son pasos y no deben deslizar lateralmente.
- [ ] Comprobar: Entrar al detalle, volver, cambiar pestaña y cerrar modal conserva contexto. Hay ruta `/` y nombres accesibles.

### 4. expo-animation — Respuesta táctil y movimiento

- [ ] Aplicar: Feedback de botón en press-in; acción en press-out. Escala sutil de 0.97 entre 100–150ms solo cuando aporta feedback; filas completas cambian fondo. Haptic una vez al iniciar/completar acción. Usar Reanimated transform/opacity; Reduce Motion conserva cambio de estado sin desplazamiento/zoom decorativo.
- [ ] Comprobar: Probar activar/revertir/interrumpir. No anunciar verificación de fluidez o haptics sin equipo real y build release.

### 5. expo-design-system — Una fuente visual compartida

- [ ] Aplicar: Extender el tema existente. Tokens: primary #2e59e5, accent #e4f51a, surface #ffffff; espaciado de 4 pt, radios continuos, 2–3 niveles tipográficos y variantes de botón. Componentes reutilizados con estados pressed/disabled/loading y accessibilityState. Evitar envolver toda fila en una tarjeta sombreada.
- [ ] Comprobar: Los mismos roles comparten colores, espaciados y radios. Buscar literales fuera del tema; comparar capturas después del cambio.

### 6. expo-data-fetching — Estados reales de la experiencia

- [ ] Aplicar: Aplicar loading/error/empty/content a carga e hidratación. No mostrar “Sin sesiones” antes de leer persistencia. Conservar contenido al refrescar y borradores ante error; botón ocupado evita envío doble; reintento visible. Si no hay backend, no inventarlo: aplicar a estado/persistencia local.
- [ ] Comprobar: Simular carga inicial, colección vacía y guardado fallido seguido de retry; conservar el trabajo del usuario.

### 7. vercel-react-native-skills — Calidad y rendimiento RN

- [ ] Aplicar: Usar FlatList/FlashList para historial creciente, IDs estables e ítems ligeros; evitar ScrollView anidado. Preferir Pressable a TouchableOpacity; no guardar scroll en React state; separar componentes de pantalla del tema. Expo específico decide APIs vigentes y controles.
- [ ] Comprobar: Historial largo sigue desplazándose y seleccionando bien; no re-render por frame; selección refleja estado real, sin duplicados.

### 8. mobile-ios-design — Jerarquía y patrones HIG

- [ ] Aplicar: Contenido antes que decoración, una tarea dominante por pantalla, títulos y botones breves, grupos de filas y disclosures claros. Usar sheets para elegir/editar y navegación jerárquica para detalle. Traducir principios a Expo RN: nunca migrar la app a SwiftUI por esta skill.
- [ ] Comprobar: Una persona entiende qué hacer, qué cambió y cómo volver. El CTA principal queda en alcance cómodo y no compite con múltiples acentos.

### 9. typography — Jerarquía tipográfica y Dynamic Type

- [ ] Aplicar: Usar familia de sistema en iOS; jerarquía basada en pocos roles semánticos, cuerpo 17 pt, secondary 15 pt, caption 12–13 pt, título 22/34 según contexto. No desactivar allowFontScaling. Evitar alto fijo en texto, dejar wrap y apilar filas cuando aumenta fontScale. Números tabulares.
- [ ] Comprobar: Revisar tamaño normal, XXL y accesibilidad grande: etiquetas y CTA no se cortan, cifras permanecen alineadas.

### 10. accessibility — Semántica y operación con VoiceOver

- [ ] Aplicar: Asignar accessibilityRole/Label/Value/State a los controles; marcar títulos como header; quitar íconos decorativos del árbol; no incluir “botón” dentro del label. Controles ≥44×44 pt. Agrupar resúmenes sin ocultar acciones, ofrecer alternativa a gestos, mantener foco del modal y anunciar cambios importantes.
- [ ] Comprobar: Recorrer flujo con VoiceOver: orden lógico, duración/estado se oyen, cambios se anuncian, todos los gestos tienen alternativa; no dar verificado si no se ejecutó.

## Marca SOL y contraste

Azul `#2e59e5` para acción/selección; blanco `#ffffff` como superficie; lima `#e4f51a` como acento de progreso o éxito. Valores calculados con luminancia sRGB WCAG:

| Par | Contraste | Uso |
|---|---|---|
| Azul / blanco | 5.71:1 | Texto azul sobre blanco o blanco sobre CTA azul |
| Azul / lima | 4.73:1 | Admisible para texto normal; usar con moderación |
| Tinta `#151b2e` / lima | 14.15:1 | Preferido para texto sobre acento lima |
| Lima / blanco | 1.21:1 | No usar para texto ni como único borde/indicador de control |
| Secundario `#62677a` / blanco | 5.61:1 | Texto secundario legible |

El lima no debe indicar estado por sí solo: acompañar con texto/icono. La vista clara pedida por el usuario prevalece sobre ejemplos de dark mode en las skills. No añadir Liquid Glass, gradientes ni movimiento solo porque una referencia los menciona.

## Resolución de diferencias entre fuentes

- El brief del usuario y las APIs reales del SDK 58 prevalecen sobre snippets. Confirmar `package.json`, exports y `.d.ts` instalados.
- Expo UI manda para controles nativos del SDK; Vercel se aplica a listas crecientes y rendimiento. No añadir FlashList para una lista fija de tres ajustes solo para cumplir un consejo general.
- Para press feedback simple se sigue Expo animation; no convertir cada botón en un gesto complejo por la regla general de Vercel.
- HIG, accesibilidad y tipografía aportan principios. Sus ejemplos SwiftUI/UIKit no autorizan abandonar Expo.
- `@expo/ui` es React/Expo, no una migración de aplicación a SwiftUI. Si una API del snapshot no existe en el paquete instalado, documentar el fallback RN accesible.
- No seguir instrucciones de envío de feedback ni instalar tooling adicional desde las skills.
- No afirmar validación en iPhone, VoiceOver, haptics o build release si solo se inspeccionó código o simulador.

## Commits completos

- `expo/skills`: `d5caf7fdf8b4854351f05841a7e315ac87ad7d24`
- `vercel-labs/agent-skills`: `063bee94c3f4df8453406c830b0a7df0f2860278`
- `wshobson/agents`: `0874a27b17a22e2b7c2e2bcd725768e0803cad06`
- `rshankras/claude-code-apple-skills`: `9ffb83138209057875698dd11c1720c657c47a92`
- `AccessibilityTools/iOSAccessibilitySkill`: `388bfb67061cdb67ee108829109ea68d5115c230`

Manifest de fuentes y hashes: [skills-mobile-manifest.json](skills-mobile-manifest.json). La aplicación comprobada se actualiza en MOBILE.md; las casillas de arriba son criterios, no resultados ya verificados.
