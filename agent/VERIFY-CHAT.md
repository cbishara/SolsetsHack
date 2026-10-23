# Verificar el chat con Codex real

Prueba reproducible del piloto HTTP actual. Usa tres mensajes ficticios, su propio archivo temporal, puertos locales asignados por el sistema y dos procesos de servidor sucesivos. No modifica el estado ni detiene el agente del piloto abierto por Quito.

Desde `agent/`, con Node 24 y las dependencias instaladas:

```sh
node scripts/verify-chat.ts --codex --report ../.context/agent-chat-verification.json
```

`--codex` autoriza explícitamente las tres llamadas al motor. Sin esa opción, el comando imprime ayuda y termina sin inferir. Utiliza la versión de Codex instalada en `agent/node_modules`, con su sesión local; `CODEX_BIN` y `CODEX_MODEL` permiten usar la misma configuración elegida para el piloto. No necesita claves de API ni conexiones con el servidor compartido.

El recorrido comprueba:

1. Una respuesta identificada como Codex, horario ficticio a las 18:00, memoria con cita literal y primer paso de dos minutos.
2. Corrección del horario a las 19:00 sobre la misma clave, sin el dato anterior activo.
3. Reintento con el mismo UUID: devuelve el mismo turno y no ejecuta otra inferencia.
4. Cierre del proceso y arranque de otro: recupera el historial y la memoria desde el archivo.
5. Una nueva respuesta de Codex recupera las 19:00 y la preferencia de dos minutos.
6. El almacén de otro usuario no contiene esos recuerdos. Esto verifica separación de memoria; no acredita autorización multiusuario del piloto, cuyo Bearer es de operador.

El informe JSON incluye los mensajes sintéticos, sesiones, tiempos, número de llamadas observadas y comprobaciones aprobadas. Sale con código 1 si falla una comprobación o el motor. No reintenta automáticamente la inferencia. Se borra el archivo temporal del servicio al terminar; el informe permanece en la ruta indicada, fuera de Git.

La salida depende del modelo: una respuesta JSON válida puede fallar si omite guardar el horario o cambia mal la clave al corregirlo. Ese fallo cuenta como un problema del recorrido, no como una prueba aprobada. Los tiempos corresponden solo a estas llamadas locales. No mide precisión general ni verifica la app en un teléfono, Postgres, la cola del trabajador, WhatsApp, push o llamada.
