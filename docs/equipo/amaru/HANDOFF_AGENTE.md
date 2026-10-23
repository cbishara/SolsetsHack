# Handoff para los agentes de Quito y Bishara

> **Traspaso confirmado por Amaru:** Bishara y su agente dirigen ahora el diseño y la evolución móvil. Los agentes locales de Amaru cierran esta línea. [Mandato, trabajo entregado, ideas y criterios de aceptación](TRASPASO_BISHARA.md). El reparto descrito como historial de esta sesión no sustituye esta nueva instrucción.

23 de octubre de 2026. Pedido de Amaru: [#14](https://github.com/cbishara/SolsetsHack/issues/14). Cuenta de Quito: [#8](https://github.com/cbishara/SolsetsHack/issues/8). Contrato del servidor: [#7](https://github.com/cbishara/SolsetsHack/issues/7).

## Actualización recibida al cerrar

El agente de Quito respondió en #8/#14: Quito propone por ahora agente propio en `agent/` con Codex CLI/SDK y su sesión, sin Hermes; reportó tres clasificaciones en su Mac. Amaru confirmó expresamente seguir con el agente de Quito y su cuenta Codex; Hermes puede venir después. El resto de este documento describe el piloto Hermes como **referencia**, no como requisito del motor de la entrega nueva. Sigue faltando verificar chat y memoria desde la app. El PR #16 reporta el intercambio mobile→Bishara y server→Amaru; se coordina la entrega móvil ya realizada en #13 antes de continuar otros cambios.

## El resultado esperado

SOL conversa con el usuario para sacar un pendiente de su cabeza y dejar un siguiente paso realizable. Recupera preferencias, horarios y rutinas declaradas para no volver a preguntar lo mismo. Si la persona está cansada, reduce el esfuerzo. La app y WhatsApp deben acceder al mismo asistente, con el mismo contexto cuando los accesos estén vinculados. Primero responder/aprender; recordatorios después.

La memoria es contexto persistido que se vuelve a entregar al modelo. No llamarla entrenamiento de pesos ni afirmar que demuestra mejoras clínicas. No diagnosticar ni prometer sueño; no fingir que un borrador se envió, que se agendó algo o que un pendiente quedó resuelto.

Amaru entregó la reconstrucción de `mobile/` y ahora Bishara la continúa con [Mi espacio](DISENO_MOBILE.md), blanco/azul/lima. No se pide diseño a Quito. Las funciones de guardia/alertas tienen su propio contrato y no deben confundirse con este chat directo con el usuario.

## Contrato temporal que hoy entiende el móvil

Es referencia del piloto, **no el contrato oficial pendiente de `server/`**. Existe localmente en el checkout de Amaru del prototipo; no afirmar que ya está desplegado en Railway.

```text
GET  /api/disconnect
POST /api/disconnect/messages  { text, requestId: UUID }
Authorization: Basic solsets:<contraseña de testing>
```

El cliente filtra la lectura para `demo:web`. El servidor piloto todavía devuelve sesiones de testing al operador; eso no es una API multiusuario apta para entregar a usuarios finales. En el contrato nuevo, el servidor debe devolver solo recursos autorizados para la identidad autenticada. La propuesta Bearer de Bishara exige un adaptador explícito, no cambiar únicamente el header del piloto.

Forma relevante para la UI:

```ts
type Session = {
  id: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    inference?: { engine: string; model?: string | null; error?: string };
  }[];
  concern?: string;
  memory?: { key: string; value: string; evidence?: string }[];
  plan?: { title: string; nextStep: string; prepared?: string; minutes?: number } | null;
};
```

El `GET` entrega `{ sessions, agent?, connection? }`; el `POST`, `{ session }`. `engine: unavailable` es un fallo visible aunque la respuesta HTTP sea 200. Un HTTP exitoso no demuestra inferencia real. Configurado tampoco significa que se haya completado una respuesta de Hermes.

El piloto mantiene un pendiente actual (`concern`/`plan`), no un gestor de tareas sincronizadas. El contrato oficial debe decidir cómo crear, leer, modificar y cerrar varios pendientes, con identificadores estables. No fabricar esas rutas desde la UI.

## Lo aprovechable del trabajo local

- Un adaptador Hermes pide provider `openai-codex` y modelo explícito; comprueba ambos en la respuesta y registra el uso reportado. No cambia de proveedor/cuenta al fallar.
- JSON de salida validado: respuesta, preocupación actual, obstáculo, plan opcional y cambios de memoria. Cada memoria nueva/corregida requiere una cita del mensaje actual y una clave estable. Se conservan hasta veinte recuerdos; se pasan doce mensajes recientes. Quito debe evaluar si ese contexto basta.
- Controles del piloto: `MEMORIA` lee; `NUEVO` cambia el pendiente conservando preferencias; `BORRAR` elimina contexto, memoria e historial de esa conversación del backend. **BORRAR no borra mensajes del teléfono, WhatsApp ni registros del proveedor**. Los contadores e identificadores técnicos de deduplicación permanecen sin contenido.
- El intento de inferencia se reserva antes de llamar. Hay límites diarios y deduplicación; un webhook duplicado o un proceso reiniciado no debe repetir inferencia automáticamente. El uso desconocido se señala, no se convierte en cero.
- Una caída deja error visible y conserva el contexto previo. Herramientas y memoria global de Hermes están deshabilitadas para no mezclar usuarios ni ejecutar acciones no autorizadas.
- El móvil conserva el UUID de un envío incierto; reintenta manualmente con el mismo ID. Credenciales móviles en SecureStore; preview web solo en memoria. No llama al verificador de consumo del operador.

El código del piloto está en el checkout local `cbishara/codex/sol-desconexion-whatsapp` de Amaru, pendiente de una entrega separada si se acuerda reutilizarlo. Este documento expone el contrato y las decisiones útiles para que `agent/`/`server/` no dependan de archivos locales inaccesibles. El propietario del agente decide su implementación oficial.

## Lo que sigue faltando

| Dueño | Entrega / evidencia |
| --- | --- |
| Quito | Preparar el agente propio con Codex de su cuenta, modelo permitido, presupuesto e interfaz de testing. Motor confirmado por Amaru; nunca pegar tokens en GitHub ni usar la cuenta de Amaru. |
| Quito | Respuesta real, reporte de provider/model/usage y comprobación de que el titular es Quito. `HERMES_ACCOUNT_OWNER` solo declara un nombre. |
| Quito | Evals de respuesta útil, cansancio, memoria declarada/corregida/borrada, aislamiento y fallos. |
| Amaru + Quito, con Bishara como consumidor móvil | Contrato versionado de chat, historial, memoria, pendientes e idempotencia. |
| Amaru / server | Testing HTTPS con persistencia y acceso por canal privado; recuperación tras reiniciar el servicio. |
| Amaru / server | Identidad canónica y vinculación verificada app↔WhatsApp; verificar webhooks, autorización y deduplicación. |
| Bishara + equipo | Recorrido con el backend real en teléfono y, después de integrar el canal, el mismo caso desde WhatsApp. |

## Prueba común de aceptación

Con datos ficticios: «Termino a las 18:00 y tengo una compra pendiente». SOL propone un primer paso. Luego «Corrijo: termino a las 19:00; prefiero pasos de dos minutos». Cerrar/reabrir recupera la versión corregida. Otro usuario no recibe ese recuerdo. Repetir un UUID no crea otro mensaje ni otra inferencia. Tras vincular WhatsApp, preguntar allí por el siguiente paso y recuperar el mismo contexto. Borrar desde un canal y comprobar el alcance acordado en ambos.

Registrar por separado los resultados de interfaz, API con fixtures, inferencia real y WhatsApp. Las pruebas locales existentes del piloto y del móvil no sustituyen esas dos últimas verificaciones.
