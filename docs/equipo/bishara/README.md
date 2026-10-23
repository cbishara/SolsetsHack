# Cristóbal Bishara · backend e integraciones

Funcionalidad: que el mensaje llegue y la alerta salga. Incluye las conexiones (WhatsApp, correo y calendario de turnos), el envío de la alerta que despierta a Rodrigo (push a la app Expo y llamada telefónica de respaldo), la API que usa la app y el deploy en Railway.

Archivos del carril: `server/` y el deploy. Se parte de cero; `backend/`, `supabase/` y `deploy/` del prototipo quedan como referencia.

Listo cuando (propuesta): en Railway, un WhatsApp al número de demo entra, queda guardado en la base, y una caída de producción le vuelve a Rodrigo como alerta en el celular.
