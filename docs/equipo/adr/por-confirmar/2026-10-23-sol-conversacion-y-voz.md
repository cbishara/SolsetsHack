# SOL entiende, puede proponer y conversa por voz con ElevenLabs

Estado: por confirmar en su categoría de ADR; implementación solicitada por Quito
Fecha: 2026-10-23
Decidió: Quito pidió el PRD/spec, entender y poder proponer, voz de entrada y salida, y conectar ElevenLabs. Falta preguntar si el registro es oficial o una idea por confirmar; los contratos compartidos requieren acuerdo de los tres.
Carril: quito, con dependencias de mobile/ (Bishara) y server/ (Amaru)

## Contexto

Quito quiere concentrarse en configurar el agente, sus casos y cómo usarlo. El prompt actual orientaba cada conversación hacia un primer paso para mañana. En la app el acceso al servidor exige copiar una URL; voz no está implementada.

## Pedido y pregunta pendiente

Quito dijo «quiero que solo entienda pero que también pueda proponer», eligió «hablar con SOL y escuchar también su respuesta» y pidió «para eso conectemos ElevenLabs».

Se prepara el [PRD/spec](../../quito/specs/2026-10-23-sol-conversacion-y-voz.md), el criterio conversacional y un adaptador STT/TTS para el agente propio. La autorización de ese trabajo está en el pedido de Quito; este registro no convierte por sí solo los cambios en acuerdo oficial entre carriles.

¿Esto es oficial o es una idea por confirmar? Quito eligió después Miguel G; la credencial quedó autorizada y STT/TTS fueron comprobados con una frase ficticia. Quedan pendientes transporte móvil y acuerdo de integración con sus dueños. El adaptador por turnos no acredita una llamada continua con interrupciones.

## Por qué

SOL necesita entender antes de proponer y permitir que la persona se exprese hablando. ElevenLabs cubre transcripción y síntesis; Codex y la memoria existentes siguen siendo el cerebro del agente propio.

## Lo que cuesta

- ElevenLabs usa la credencial local autorizada y la voz Miguel G elegida por Quito; hubo una prueba real con consumo del proveedor. No se promete un costo ni una latencia general a partir de esa muestra.
- Capturar y reproducir audio pertenece a mobile/. Secretos, acceso y transporte compartido se coordinan con server/.
- La latencia del modelo y la voz se suman; no se promete respuesta instantánea ni mejora clínica.

## Cambios

2026-10-23: registro inicial del pedido, con su categoría pendiente.

2026-10-23: Quito pidió diseñar y revisar aquí una conversación manos libres con círculo reactivo, interrupción por voz y micrófono silenciable, inspirada en patrones familiares como ChatGPT. Se prepara una [maqueta](../../quito/diseno/voz-sol/README.md) con Mi espacio y modo noche. Es un alcance solicitado; la dirección visual, la categoría del ADR y la integración entre carriles siguen pendientes. El adaptador STT/TTS existente no acredita el nuevo recorrido.
