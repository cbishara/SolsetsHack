# Idea: una sola puerta de entrada para que la guardia reciba avisos de cualquier herramienta

Estado: idea, no decidida. Responsable: Cristóbal Bishara. Levantada por Quito el 2026-10-23.

## Veredicto

No existe un conector único que lea todo el ecosistema de trabajo de una empresa. Lo que sí es casi universal: Jira, Grafana, Zendesk y las herramientas de monitoreo mandan solas un aviso HTTP (webhook) cuando pasa algo, y muchas ya saben hablarle a PagerDuty.

## La propuesta

Abrir en el backend una sola puerta, por ejemplo `POST /api/ingest/:source`, que entienda tres formatos:

1. Uno genérico propio.
2. El Events API v2 de PagerDuty. En PagerDuty, `payload.summary`, `payload.source` y `payload.severity` son obligatorios y la integración se identifica con `routing_key` (https://docs.pagerduty.com/developer/events-api-v2-overview). En Alertmanager la URL de PagerDuty se puede cambiar (`url` en `pagerduty_config`, por defecto `https://events.pagerduty.com/v2/enqueue`, https://prometheus.io/docs/alerting/latest/configuration/), así que un equipo que ya alerta a PagerDuty podría alertarnos sin tocar nada más.
3. El webhook de Grafana. Cada alerta trae un `fingerprint` que se repite cuando las etiquetas son las mismas, y Grafana puede firmar con HMAC-SHA256 en el header `X-Grafana-Alerting-Signature` (https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/).

## Qué ya existe en el repo (verificado contra origin/main el 2026-10-23)

1. Verificación de firma HMAC de Kapso, reutilizable: `backend/server.mjs:25`.
2. `processMessage` ya acepta `incidentKey`: `backend/processor.mjs:16`. Ahí entra el `dedup_key` de PagerDuty o el `fingerprint` de Grafana.
3. La regla de no volver a despertar en 30 minutos usa esa misma llave: `backend/processor.mjs:17`.
4. Hoy `/api/messages` solo acepta `whatsapp` y `gmail`: `backend/server.mjs:77`.

Esfuerzo calculado: 2 a 3 horas (estimación, no medida).

## Qué no cubre

1. Slack sí manda un POST por cada evento, pero solo a una app creada e instalada en el espacio de la empresa con OAuth (https://docs.slack.dev/apis/events-api/). No es configurar un webhook: necesita permiso de un administrador. Teams va por el mismo camino (no verificado). Los grupos de WhatsApp existentes no se leen con la API oficial. Nada de eso entra por esta puerta sin trabajo extra.
2. MCP le sirve al agente para leer el ticket completo antes de decidir, pero no avisa cuando llega algo nuevo.
3. Para la demo, solo alertas sintéticas: por ejemplo un curl con un webhook de Grafana inventado y marcado como simulado.

## Para el pitch

"Solsets no reemplaza a PagerDuty, se pone detrás de él." Siguiente paso: conectores gestionados (Composio o Pipedream) para Slack y Jira, sin escribir una integración por herramienta.

## Relación con el producto

`docs/PRODUCTO_SOL.md` dice que no hay un adaptador real de tickets y pone "conectar la fuente que elimina más trabajo" como paso 3 de la secuencia después de la demo.
