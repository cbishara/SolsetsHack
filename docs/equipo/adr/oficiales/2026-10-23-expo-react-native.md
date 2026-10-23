# La app se hace con Expo (React Native) en TypeScript, en `mobile/`

Estado: oficial
Fecha: 2026-10-23
Decidió: Quito
Carril: amaru

## Contexto

La función central de la app es despertar a Rodrigo. La otra opción era una PWA, que ganaba solo porque reusaba `web/`.

## Decisión

Una app nativa con Expo (React Native), en TypeScript, en la carpeta nueva `mobile/`. Código e identificadores en inglés, textos de la app en español.

## Por qué

Una app nativa da más control sobre la alerta. En Android, los canales de notificación permiten sonido propio y saltarse el No molestar, si Rodrigo da el permiso. En iPhone, el push de una PWA solo llega con la app instalada en la pantalla de inicio y lo silencia el modo concentración ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Como partimos de cero, reusar `web/` ya no pesa.

## Lo que cuesta

Hay que resolverlo temprano.

1. Android: desde el SDK 53 el push remoto no funciona en Expo Go. Hace falta un build de desarrollo propio con credenciales de Firebase ([docs de Expo](https://docs.expo.dev/versions/latest/sdk/notifications)).
2. iPhone: para recibir push en un iPhone real hace falta la cuenta pagada de Apple Developer. La cuenta gratis no permite push ([foro de Apple](https://developer.apple.com/forums/thread/768748)).
3. Ni Expo ni la PWA garantizan pasar el modo concentración del iPhone. Por eso la alerta tiene un segundo canal, la llamada telefónica (ver `2026-10-23-cinco-funcionalidades.md`, funcionalidad 2).

## Cambios
