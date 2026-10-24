# Soltra en el teléfono

> Diseño y evolución móvil transferidos a Bishara por instrucción expresa de Amaru. [Traspaso completo](../docs/equipo/amaru/TRASPASO_BISHARA.md). Esta rama conserva la base que entregaron los agentes locales de Amaru.

App Expo / React Native / TypeScript del carril de Amaru. SDK **58**, según la versión que Amaru confirmó en su iPhone. Solo datos ficticios. La arquitectura oficial `server/` + `agent/` se coordina con Bishara y Quito; esta app no modifica sus archivos.

## Abrir con Expo Go

```sh
cd mobile
npm ci
npm start
```

Mac y iPhone en la misma Wi-Fi. Escanear el QR con la cámara del iPhone y abrir Expo Go. Si Expo Go pide iniciar sesión, usar la misma cuenta Expo en el CLI y el teléfono. El SDK de Expo Go debe coincidir con 58. La app arranca sin claves con ejemplos locales.

Dirección vigente: **negro siempre, inspirada en Opal** (ADR `2026-10-24-soltra-negro-inspirado-en-opal`). Interfaz monocroma, botones blancos, color solo para Sol y para los estados tranquilo y urgente. Tokens en `src/theme/tokens.ts`; Sol (el avatar) en `src/components/sol-orb.tsx`. Mi espacio de Amaru (blanco, azul y lima) quedó reemplazado.

Recorrido: **Mi espacio** → **Hablemos** → escribir un pendiente ficticio → revisar el primer paso en **Pendientes** → guardar una preferencia en **Memoria** → volver al chat. Cerrar/reabrir conserva la información local y el borrador. El piloto muestra un pendiente actual; no afirmar que existe una lista de tareas sincronizada.

`npm run web` ofrece una vista de diseño. No demuestra permisos de iOS, bloqueo de apps ni funcionamiento en un iPhone físico.

Para revisar a 320, 390 y 430 puntos:

```sh
npm run preview:mobile
python3 -m http.server 4176 --bind 127.0.0.1 --directory dist
# Abrir http://localhost:4176/phone-preview.html
```

El marco de revisión es un archivo de `dist/` generado por `scripts/preview-mobile.mjs`; no se incluye en la UI nativa. Si el puerto ya está ocupado por una preview anterior, no hace falta abrir otro servidor.

## Conectar el chat al piloto existente

En **Ajustes**, introducir el origen HTTPS de un backend de **testing** que tenga el flujo `/api/disconnect` y la contraseña de la demo. El usuario Basic es `solsets`. La contraseña se guarda con SecureStore en el teléfono, nunca en `EXPO_PUBLIC_*`, Git ni el bundle. En vista web se conserva solo en memoria.

Adaptador temporal, acordado con la sesión local de Hermes:

- `GET /api/disconnect`: usa solo `sessions[id="demo:web"]`; no muestra conversaciones de otros remitentes.
- `POST /api/disconnect/messages`: `{text, requestId: UUID}`. El reintento manual conserva el UUID incluso después de reiniciar la app. No hay reenvíos automáticos.
- `assistant.inference.engine="unavailable"` se muestra como modelo no disponible, aunque HTTP sea 200.
- No se invoca `/api/disconnect/verify`: esa prueba consume inferencias y pertenece al operador.

Esta conversación es **compartida por el equipo**, no una cuenta individual. Tampoco vincula el teléfono de WhatsApp a la sesión móvil. El contrato oficial de identidad, historial, memoria y pendientes está solicitado en [#7](https://github.com/cbishara/SolsetsHack/issues/7). El comportamiento del mismo chatbot para app y WhatsApp se encargó a Quito en [#14](https://github.com/cbishara/SolsetsHack/issues/14); su cuenta Codex se coordina en [#8](https://github.com/cbishara/SolsetsHack/issues/8). Ningún indicador de configuración demuestra por sí solo una inferencia real.

Actualización de Quito en #8/#14: propone agente propio con Codex CLI/SDK y su cuenta, sin Hermes por ahora. Amaru confirmó expresamente esa dirección: seguir con Quito y su cuenta Codex; Hermes puede venir después. La app no se conectó automáticamente a ese motor: necesita un contrato y endpoint propios, aún pendientes. El PR #16 reporta un intercambio de carriles; esta revisión móvil ya en curso se entrega en #13 para continuar desde ella.

Los fixtures de guardia de `src/proposed-fixtures.ts` quedan como referencia del borrador de Quito, fuera del recorrido principal Mi espacio. Bishara propuso TypeScript/Express, Bearer de testing y un servicio Railway aparte. Todavía requieren contrato y adaptador propios; el cliente Basic del piloto no los implementa automáticamente.

Para un backend local de prueba sin contraseña se permite HTTP en desarrollo, usando la IP privada del Mac (no `localhost` en el iPhone). No se permite enviar contraseñas por HTTP. El QR de Expo publica el frontend, no el backend. Una vista web necesita que el servidor autorice su origen/CORS; esta app no relaja las reglas del backend.

La rama `main` de partida no contiene el piloto `/api/disconnect`. Para probarlo se necesita el checkout de `codex/sol-desconexion-whatsapp` con el trabajo de SOL/Hermes de la otra sesión, o un despliegue de testing equivalente. Una URL de producción no sustituye ese paso.

## Screen Time: experimento separado

Expo Go no incluye este módulo nativo. En ese entorno la app explica que el bloqueo no está disponible, sin simular éxito.

El perfil `screen-time` habilita `react-native-device-activity` 0.6.1, su plugin Expo y tres extensiones: `ActivityMonitorExtension`, `ShieldAction` y `ShieldConfiguration`. Cada target y la app llevan Family Controls y el App Group. El plugin es experimental y su compatibilidad final debe verificarse compilando y probando el dispositivo.

El código ofrece:

1. Autorización individual de Screen Time y selector nativo de apps/categorías/dominos.
2. Pausas de 15, 30 o 60 minutos mediante ManagedSettings y DeviceActivity, con desbloqueo programado en la extensión, no con un temporizador JavaScript.
3. Finalización manual y recuperación al reabrir si la sesión expiró.
4. Observación local de una hora, sin bloqueo, con umbral de 15 minutos. No intenta reconstruir todo el uso del teléfono.

La selección, tokens y eventos permanecen en el dispositivo. No se envían a la API ni al LLM. No hay aumento automático de restricciones, lectura de redes sociales ni retos físicos. El usuario elige cada sesión; la adaptación del chat se basa en contexto declarado.

### Preparar la build propia

Primero confirmar cuenta Apple Developer del equipo, Team ID y un bundle ID disponible. Amaru indicó que no sabe si existe esa membresía. No se ha creado ni contratado ninguna cuenta.

```sh
# Variables no secretas de firma/configuración; usar los valores reales del equipo.
export SOL_APPLE_TEAM_ID=YOUR_TEAM_ID
export SOL_BUNDLE_ID=com.yourteam.sol.demo
npm run prebuild:screen-time
```

La generación local usa `--no-install`: no compila Swift ni instala CocoaPods. Para compilar localmente hace falta Xcode completo y seleccionar su toolchain. En la máquina revisada estaba seleccionado `/Library/Developer/CommandLineTools`.

Alternativa de compilación en EAS, después de iniciar sesión y vincular **el proyecto del equipo**:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
# Configurar SOL_APPLE_TEAM_ID y SOL_BUNDLE_ID también en el entorno EAS.
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile screen-time
SOL_SCREEN_TIME=1 npm run start:native
```

El operador debe completar firma, registro del iPhone y Developer Mode. Para distribución/TestFlight se debe solicitar la aprobación Family Controls de Apple para la app y cada extensión. La existencia de código o un prebuild correcto no demuestra aprobación ni funcionamiento.

Prueba física pendiente: elegir una app de ocio → iniciar pausa → comprobar su pantalla bloqueada → cerrar Soltra → comprobar que continúa → esperar el fin y comprobar desbloqueo → probar finalización manual y revocar permiso. Mantener disponibles Soltra y los canales de guardia. Android puede ejecutar la interfaz y el chat; no tiene bloqueo de apps implementado.

## Verificación reproducible

```sh
npm run typecheck
npm test
npm run export:check
npm run prebuild:screen-time
# Verificación local del adaptador contra un checkout del piloto, sin credenciales:
SOL_PILOT_DIR=/ruta/al/checkout-del-piloto npm run verify:pilot
```

La última prueba crea un backend temporal con almacenamiento de archivos y `SOL_ENGINE=demo`, comprueba deduplicación y continuidad después de reiniciar y limpia sus datos. No se conecta a PostgreSQL, Hermes ni WhatsApp. La verificación de BD desplegada queda pendiente del entorno de testing de Bishara.

Dependencias: se fijó `uuid` 11.1.1 para corregir el aviso transitivo sin romper CommonJS. El tooling de Expo y del plugin sigue reportando avisos de auditoría en `node-forge` y `@xmldom/xmldom`; no se aplicó `npm audit fix --force`, que proponía retroceder Expo a un SDK incompatible. El override de xmldom 0.9 se descartó porque rompía el parser de plist. Resolver esos avisos con versiones compatibles antes de distribuir.

## Referencias

- [Expo: development builds](https://docs.expo.dev/develop/development-builds/introduction/).
- [Expo: configuración de módulos nativos](https://docs.expo.dev/workflow/customizing/).
- [Apple: Family Controls](https://developer.apple.com/documentation/xcode/configuring-family-controls).
- [Apple: restricciones de DeviceActivityReport](https://developer.apple.com/documentation/deviceactivity/deviceactivityreport).
- [Plugin nativo y limitaciones conocidas](https://github.com/kingstinct/react-native-device-activity).
- [Coordinación y estado](../docs/equipo/amaru/MOBILE.md).
