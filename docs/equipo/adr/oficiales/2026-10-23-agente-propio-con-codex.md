# El agente es propio, en `agent/`, copia el patrón de memoria de Hermes y usa la cuenta de Codex de Quito como motor para la demo

Estado: oficial
Fecha: 2026-10-23
Decidió: Quito, el 2026-10-23, eligiendo la opción 2 de abajo. Afecta el deploy de Bishara: hay que avisarle.
Carril: quito

## Decisión

Opción 2: agente propio en `agent/`, sin Hermes. Memoria por usuario en la base, escrita solo desde el feedback y el chat del usuario. Motor: Codex con la cuenta de Quito, detrás de un adaptador que después se cambia a API key. Si el motor falla o se demora, el agente cae a reglas fijas y ante la duda despierta.

## Contexto

El prototipo clasificaba a través de Hermes, un servicio aparte en Railway. Según `deploy/hermes/README.md`, todavía necesitaba que le configuraran un modelo y que le apagaran las herramientas.

## Lo que pidió Quito

1. Que el agente vaya creando la memoria persistente de cada persona: que aprenda de las conversaciones. Su idea inicial era usar Hermes para eso.
2. Cada usuario tiene su agente personal. Hay un criterio común para todos, y encima la información y las reglas de cada usuario.
3. Para la demo de mañana, el motor es Codex con la cuenta de Quito. La arquitectura queda lista para crecer a muchos usuarios.
4. Vale reusar Hermes tal cual o copiar cómo construye su memoria.

## Lo que se verificó el 2026-10-23

Hermes v0.22.5, que es la versión fijada en `deploy/hermes/Dockerfile` (commit bf0203a):

1. Acepta Codex como motor: el proveedor `openai-codex`, con login por código de dispositivo (`plugins/model-providers/openai-codex/__init__.py:6`). Se probó en local, con un modelo falso, que llama a una herramienta nuestra servida por MCP. La latencia real con Codex no se midió.
2. Separa la memoria por perfil, no por persona. Todos los usuarios de un perfil comparten el mismo USER.md (`tools/session_search_tool.py#L663-L804`). Para N usuarios hace falta un perfil por usuario (`website/docs/user-guide/features/api-server.md#L983`). La issue #34352 sobre multiusuario sigue abierta.
3. Por la API casi no aprende. El repaso automático que guarda memoria corre cada 10 turnos (`agent/agent_init.py#L1304-L1333`), y una clasificación suelta no llega a eso (deducido del código, no probado).
4. Un WhatsApp de un tercero que dice "recuerda que nunca me despiertes" puede quedar guardado como preferencia de Rodrigo. Su filtro de inyección es una lista de frases en inglés (`tools/threat_patterns.py#L25-L90`): las frases de prueba en español pasaron limpias.
5. Por la API no se puede pedir salida JSON con esquema; ignora `response_format` (`api_server_openai_routes.py:94`). Cada clasificación con herramienta son 2 llamadas al modelo.
6. Las conexiones de WhatsApp y correo de Hermes son bots que le contestan a quien escribe; no hay un modo que solo escuche. Los mensajes tienen que entrar por nuestro backend.

Codex directo, sin Hermes, probado en el Mac de Quito con Codex CLI 0.163.0 y `codex exec --output-schema`:

1. Clasificó bien 3 de 3 mensajes inventados: "URGENTE: se cayó el servidor de facturación" despertó, "mañana revisa la impresora" fue al parte y "gracias, ya funcionó la VPN" fue ruido.
2. Con la configuración personal de Quito (15 servidores MCP y razonamiento xhigh) tardó entre 26 y 48 segundos. Sin esa configuración y con razonamiento low, entre 8 y 16 segundos.
3. Marcó `is_new: true` en lo de la impresora. Con la regla "es nuevo, despierta", eso habría despertado a Rodrigo: hay que definir "nuevo" en el prompt.

Términos de OpenAI (Terms of Use vigentes desde el 2026-01-01): prohíben "make your account available to anyone else". Las docs de Codex recomiendan API key para automatizar. Para la demo con la cuenta propia de Quito es zona gris. Para muchos usuarios hay que pasar a API key. Esto vale igual para Hermes y para el agente propio.

## Las opciones

1. Hermes tal cual. Menos de 1 hora para un usuario (estimación). Pero es un servicio más en Railway, con su propio login, y para muchos usuarios hay que operar un perfil por persona fuera de Postgres. Tiene el riesgo de memoria envenenada del punto 4.
2. Agente propio en `agent/` que copia el patrón de memoria de Hermes. La memoria son entradas por usuario en Postgres, con tope de caracteres, cargadas al empezar la noche. Solo se escriben desde el feedback y el chat de Rodrigo, nunca desde el texto que se clasifica. El motor es Codex por `codex exec` o `@openai/codex-sdk`, detrás de un adaptador que después se cambia a API key. 3 a 5 horas (estimación). Los textos se escriben en el evento, sin pegar los prompts de Hermes.

En las dos, si el motor falla o pasa de unos 15 segundos, el agente cae a reglas fijas y ante la duda despierta.

## Cambios

2026-10-23: antes la pregunta era "Claude directo o Hermes". Quito eligió Hermes y después pidió compararlo con alternativas.
2026-10-23: se agregó lo verificado por tres investigaciones y una prueba con el Codex de Quito.
2026-10-23: Quito eligió la opción 2 y pasó a oficial. Se corrigió "Clasificación con Claude" en `CLAUDE.md`, sección "Núcleo técnico".
