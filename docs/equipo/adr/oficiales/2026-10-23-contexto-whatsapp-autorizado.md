# Contexto real de WhatsApp con selección explícita

Estado: oficial.
Decidió: Quito, confirmado expresamente como oficial en esta sesión.
Fecha: 2026-10-23.
Carriles: Quito/agente, Amaru/servidor y Bishara/app.

## Autorización recibida

Quito autorizó expresamente en la conversación procesar nombres y tipos de sus chats reales, y mensajes únicamente de los chats que seleccione. A la pregunta que citaba la regla de AGENTS.md «Solo datos sintéticos», respondió: «Sí, con esa selección explícita».

Quito ratificó esta autorización como decisión «Oficial». Reemplaza la restricción general de datos sintéticos únicamente para el recorrido descrito aquí. No convierte contenido real en datos sintéticos ni autoriza a publicar conversaciones.

## Alcance

- Las sugerencias iniciales usan solo metadatos; no leen muestras de chats no seleccionados.
- El servidor verifica dueño, vinculación y selección vigente antes de dar contexto y antes de aceptar resultados. Recomendar y seleccionar son operaciones distintas.
- Los mensajes de terceros sirven de evidencia; no modifican preferencias personales ni ordenan envíos. La memoria personal procede del propietario.
- v0 continúa exclusivamente sintético. El candidato v1 declara honestamente synthetic:false y necesita activación explícita para procesarlo.
- Pruebas, evaluaciones y artefactos públicos continúan usando datos ficticios. No se autorizó por este acuerdo ningún envío de mensajes ni un despliegue adicional.

## Construcción y disponibilidad

Contrato candidato y separación de memoria/evidencia en agent/INTEGRATION-V1.md y agent/src/integration/. Coordinación en #30. Que exista la autorización no acredita conexión del servidor, disponibilidad en móvil ni funcionamiento real de WhatsApp.
