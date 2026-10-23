# Solsets Sistem

Rodrigo trabaja en soporte TI con turnos rotativos y lleva catorce meses durmiendo cinco o seis horas. El teléfono mezcla guardia, pendientes y vida personal. Solsets reúne las tareas, propone respuestas y escala los incidentes críticos, nuevos o inciertos para proteger una ventana de descanso. La meta es una hora más de sueño; **la demo no mide ni demuestra esa mejora todavía**.

## Mostrar el avance

```sh
npm ci
npm run dev
```

Abrir **http://localhost:5173**. No hacen falta claves. En «Probar una noche», recorrer VPN → compras → turno → caída crítica. Revisar motivos, aprobar una tarea simulada, dar feedback y cambiar permisos en «Mi agente». El modo sombra viene activado. Todas las situaciones son ficticias y las simulaciones nunca llaman a servicios externos. El estado se guarda en `.data/`.

## Implementado

- Panel React adaptable: tareas, descanso, conexiones, permisos, pausa, modo sombra y parte de la mañana.
- API Node/Express, persistencia PostgreSQL en Railway, Supabase o local, cola persistida de WhatsApp y deduplicación por mensaje.
- Política en código: nuevo o confianza < 0,7 → escalar; mismo incidente alertado en 30 minutos → no repetir; pausa impide nuevas acciones. Feedback disponible como contexto para Hermes.
- Adaptadores: Hermes HTTP, webhook firmado y envío Kapso, OAuth Google con PKCE y tokens cifrados, lectura manual de Gmail y borradores, eventos Calendar con recordatorio.
- Docker/Railway y dos migraciones SQL listas para ejecutar. La tabla vectorial y la función de búsqueda están preparadas; aún no hay ingestión ni recuperación vectorial en el agente.

## Activar servicios reales con datos ficticios

Seguir [SETUP.md](./SETUP.md). Ejecutar en orden [001](./supabase/migrations/202610230001_workspace.sql) y [002](./supabase/migrations/202610230002_knowledge_search.sql) en Supabase. Configurar las variables de [.env.example](./.env.example) en Railway. El servidor exige contraseña del panel al activar integraciones reales. Usuario: `solsets`.

Para **PostgreSQL de Railway**, usar `DATABASE_URL=${{Postgres.DATABASE_URL}}` en el servicio backend y dejar vacías las variables Supabase. Al iniciar, el backend aplica la migración idempotente [Railway SQL](./backend/migrations/001_railway.sql) dentro del esquema `solsets`. No se necesita ejecutar los scripts específicos de Supabase. El panel se publica en [Railway](https://backend-production-088f1.up.railway.app); el acceso se obtiene de `DASHBOARD_PASSWORD` en las variables del servicio.

## Alcance de esta entrega

Una cuenta ficticia, una réplica del backend. Supabase reemplaza Airtable para centralizar tareas y contexto. Las claves y la cuenta OAuth aún deben configurarse para verificar un recorrido real. La lectura de Gmail se inicia desde Conexiones y solo procesa correos no leídos con `[SOLSETS-DEMO]` en el asunto. No hay lectura automática de grupos existentes, pagos, cierre real de tickets, interpretación completa de turnos por WhatsApp ni alarma de reloj confirmada. Los turnos entrantes se guardan como tareas para revisión. No se silencian notificaciones del sistema. Hermes se configura como clasificador; las acciones pasan por permisos del backend. No se realizó fine-tuning.

## Verificar

```sh
npm test
npm run build
npm start
```

En producción el panel y la API se sirven juntos en el puerto `PORT` (3001 por defecto). La configuración Docker de Hermes necesita validarse en una máquina con Docker; este entorno no lo tiene instalado. Pruebas de integración externas y SQL pendientes de credenciales. Ver [guion de demo](./docs/DEMO.md).
