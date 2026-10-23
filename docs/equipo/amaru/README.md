# Amaru Paillan · backend e integraciones

Funcionalidad: que el mensaje llegue y la alerta salga. Incluye las conexiones (WhatsApp, correo y calendario de turnos), el envío de la alerta que despierta a Rodrigo (push a la app Expo y llamada telefónica de respaldo), la API que usa la app y el deploy en Railway.

Archivos del carril: `server/` y el deploy. `backend/`, `supabase/` y `deploy/` del prototipo quedan como referencia.

Tomó este carril el 2026-10-23, en el trueque con Bishara (`adr/oficiales/2026-10-23-trueque-bishara-amaru.md`). Antes llevaba `mobile/`.

Listo cuando (propuesta): en Railway, un WhatsApp al número de demo entra, queda guardado en la base, y una caída de producción le vuelve a Rodrigo como alerta en el celular.

## Punto de partida

La base de `server/` ya existe (PR #15): API del contrato v0, WhatsApp por 2Chat, correo por IMAP, Postgres o memoria, y la interfaz para el agente de Quito. Lo pendiente y cómo conectar 2Chat están en `server/README.md`.

## En esta carpeta

1. `DEMO.md`: el guion del recorrido de 3 minutos del prototipo. Antes estaba en `docs/DEMO.md`.
2. `PRODUCTO_SOL.md`: el documento de producto del prototipo SOL. Antes estaba en `docs/PRODUCTO_SOL.md`.

3. [DISENO_MOBILE.md](DISENO_MOBILE.md): dirección vigente pedida por Amaru, Mi espacio `/demo`, pantallas y handoff app/WhatsApp.
4. [MOBILE.md](MOBILE.md): estado y evidencia de implementación móvil.
5. [SKILLS_MOBILE.md](SKILLS_MOBILE.md): las diez skills instaladas, fuentes y criterios de aplicación.
6. [HANDOFF_AGENTE.md](HANDOFF_AGENTE.md): resumen de contrato, memoria, pruebas y pendientes del asistente para Quito y el responsable de server.
7. [TRASPASO_BISHARA.md](TRASPASO_BISHARA.md): mandato vigente para que Bishara lidere diseño y app, con resumen completo e ideas de evolución de SOL.
