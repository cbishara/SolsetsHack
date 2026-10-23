# Cinco funcionalidades, cada una con su dueño

Estado: oficial
Fecha: 2026-10-23
Decidió: los tres (acordadas)
Carril: los tres

## Contexto

Con el producto definido había que repartir el trabajo sin que dos personas toquen el mismo archivo.

## Decisión

1. **Contrato de la noche.** Antes de dormir, la app pregunta una sola cosa: "Te toca guardia esta noche?", con sí o no. Si es sí, muestra qué lo va a despertar y por qué canal. Pantalla: Bishara. Regla en la política: Quito. Queda abierta una pregunta, en `por-confirmar/2026-10-23-caida-grave-sin-guardia.md`.
2. **Alerta imposible de perder.** El push trae un botón "Lo vi". Si no lo toca en 3 minutos, el sistema lo llama por teléfono, y repite la llamada. En iPhone, con "Permitir llamadas repetidas" activo, la segunda llamada de la misma persona en 3 minutos pasa el modo de concentración (según fuentes de terceros, no de Apple). Push, llamada y temporizador: Amaru. Botón: Bishara. Cuándo se escala: Quito.
3. **Calendario de turnos.** Amaru conecta el calendario de turnos y el agente lo lee para saber qué noche le toca a Rodrigo. Así la pregunta de la funcionalidad 1 llega con la respuesta sugerida y él solo confirma. Conexión: Amaru. Interpretación: Quito.
4. **Métricas y graduación del modo sombra.** Cuántas veces acertó el agente según el feedback de Rodrigo, y después de unas noches la propuesta de pasar a modo real. Bishara.
5. **Descarga de pendientes.** Antes de dormir, Rodrigo anota en 5 minutos lo que le preocupa y eso aparece en el parte de la mañana. Se hace dentro del chat con el agente. Quito, con la pantalla del chat de Bishara.

Datos sintéticos también aquí: el calendario de turnos y el WhatsApp de la demo son de prueba, con un número nuevo y grupos creados por el equipo con mensajes inventados.

Las funcionalidades 1 y 5 tienen que tomar menos de un minuto y hacerse antes de acostarse.

## Por qué

El porqué de cada funcionalidad no quedó escrito aparte. El límite de un minuto viene de un riesgo para el pitch: la investigación (`docs/equipo/quito/research/sueno/investigacion-sueno-cabeza.md`) dice que usar el celular en la cama es parte del problema, y las funcionalidades 1 y 5 se usan en el celular antes de dormir.

## Lo que cuesta

La 2 depende de credenciales que hay que conseguir temprano (ver `2026-10-23-expo-react-native.md`). La 1, la 2 y la 3 cruzan carriles: hay que acordar el contrato entre los tres antes de construir.

## Cambios

- 2026-10-23: dueños actualizados por el trueque de carriles (`2026-10-23-trueque-bishara-amaru.md`). Antes: pantallas y métricas de Amaru; push, llamada, temporizador y calendario de Bishara.
