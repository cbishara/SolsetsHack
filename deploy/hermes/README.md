# Hermes en Railway

Servicio privado, fuente GitHub `cbishara/SolsetsHack`, raíz `/deploy/hermes`. La infraestructura se declara junto al backend y PostgreSQL en `.railway/railway.ts`. La imagen oficial está fijada por digest; el único cambio es arrancar `gateway run` en lugar de la CLI interactiva.

Montar un volumen en `/opt/data`. Variables: `API_SERVER_ENABLED=true`, `API_SERVER_HOST=0.0.0.0`, `API_SERVER_PORT=8642`, `API_SERVER_KEY`, `HERMES_DASHBOARD=0`. No publicar dominio público. El backend usa `http://hermes.railway.internal:8642/v1` y una referencia a `${{hermes.API_SERVER_KEY}}`.

Antes de procesar mensajes reales, configurar un proveedor/modelo autorizado y desactivar las herramientas del perfil `api_server`. El backend comprueba `/v1/toolsets` y rechaza perfiles con herramientas activas. El arranque de infraestructura no significa que el modelo tenga credenciales.
