# Soltra

La app se llama **Soltra**. **Sol** es el agente que vive dentro de ella y hace la guardia por ti. Los identificadores técnicos (`com.solsets.sol.demo`, el scheme `sol-demo`, las variables `SOL_*`) siguen igual a propósito: cambiarlos rompería builds y notificaciones.

## Tablero del equipo

```sh
npm run tablero
```

Abre en el navegador el **mapa de funcionalidades, flujos y cambios**, con fichas detalladas y tarjetas que puedes ordenar. Solo necesita Node 22 o superior, sin instalar dependencias. Acceso habitual: **http://127.0.0.1:4175** mientras el comando esté corriendo.

[Guía para personas y agentes](./docs/equipo/quito/tablero/README.md) · [Panel sin servidor](./docs/equipo/quito/tablero/index.html) (descargar/abrir localmente) · [Mapa Excalidraw](./docs/equipo/quito/tablero/tablero.excalidraw). Cada copia muestra las ramas que tenga integradas; no sincroniza otros computadores en tiempo real.

Rodrigo trabaja en soporte TI con turnos rotativos y lleva catorce meses durmiendo cinco o seis horas. El teléfono mezcla guardia, pendientes y vida personal. Solsets reúne las tareas, propone respuestas y escala los incidentes críticos, nuevos o inciertos para proteger una ventana de descanso. La meta es una hora más de sueño; **la demo no mide ni demuestra esa mejora todavía**.

## Mostrar el avance

```sh
npm ci
npm run dev
```

Abrir **http://localhost:5173** para la landing. «Empieza con SOL» lleva a `/demo`: una primera ayuda sin cuenta ni conexiones, con ejemplos de Rodrigo, profesor, coach y vida personal. Los borradores y preferencias de esta demostración se conservan por contexto en el navegador. Son plantillas guiadas, no un agente conversacional general.

En **http://localhost:5173/app**, el espacio de Rodrigo conserva la API existente: «Mis pendientes» → «Una guardia con SOL» permite recorrer VPN, compras, turno y caída crítica; «Tus reglas» gestiona modo sombra, pausa y permisos. Las simulaciones no llaman a servicios externos. El estado operativo se guarda en `.data/` o en la base configurada. Con `DASHBOARD_PASSWORD`, `/app`, API y OAuth quedan protegidos; la landing y `/demo` permanecen públicos.

## Implementado

- Landing y dashboard React con identidad compartida: degradados azules, flechas reactivas, amarillo ácido y diseño adaptable.
- SOL guiado: borrador editable, pregunta contextual, copia, pausa y reentrada; preferencias corregibles y aislamiento por caso. Recuperación en memoria si falla el almacenamiento local.
- Panel operativo: pendientes por estado, horario, conexiones, permisos, pausa, modo sombra y resumen. Una acción simulada no se cuenta como obligación resuelta.
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

En producción el panel y la API se sirven juntos en el puerto `PORT` (3001 por defecto). La configuración Docker de Hermes necesita validarse en una máquina con Docker; este entorno no lo tiene instalado. Pruebas de integración externas y SQL pendientes de credenciales. Ver [guion de demo](./docs/equipo/amaru/DEMO.md).

La estrategia y las diferencias entre la demostración y el alcance futuro están en [PRODUCTO_SOL.md](./docs/equipo/amaru/PRODUCTO_SOL.md).
