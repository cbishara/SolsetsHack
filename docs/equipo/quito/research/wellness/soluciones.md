# Soluciones existentes alrededor del caso Rodrigo

Consulta: 23 de octubre de 2026. Complemento del [benchmark visual](./benchmark.md) y del [tablero](./tablero.html).

Este paisaje separa controles del teléfono, operación de guardias y herramientas de sueño/hábitos. Las fuentes revisadas acreditan capacidades parciales. No se probó una configuración completa ni se concluye que ninguna solución del mercado pueda cubrir el caso completo.

| Solución | Qué existe, según su documentación | Qué implica para Solsets — análisis |
| --- | --- | --- |
| [iOS Focus](https://support.apple.com/guide/iphone/allow-or-silence-notifications-for-a-focus-iph21d43af5b/ios) | Filtros por personas y apps, excepciones y llamadas repetidas. La documentación también describe priorización de interrupciones con Apple Intelligence en equipos compatibles. | Conviene conocer y probar esas funciones antes de construir otra capa de filtrado. No atribuir a una web la capacidad de controlar el silencio del iPhone; WhatsApp, contactos, idioma y reloj requieren validación concreta. |
| [Android: Modos y No molestar](https://support.google.com/android/answer/9069335?hl=en) | Horarios de descanso y filtros de personas, conversaciones, apps, alarmas y otras interrupciones. Las opciones dependen del fabricante y la versión. | Puede cubrir parte del problema de notificaciones. Hay que separar la configuración del dispositivo de la lógica que clasifica mensajes y genera el parte. |
| [PagerDuty](https://docs.pagerduty.com/incident-management/schedules/escalation-policies-and-schedules) | Calendarios on-call, servicios y políticas que escalan al siguiente responsable si no hay respuesta. | Referente operativo para responsabilidad, confirmación y respaldo. Requiere configurar fuentes y servicios; el flujo documentado no equivale a leer y gestionar todo el WhatsApp personal. |
| [incident.io](https://docs.incident.io/on-call/escalations) | Conecta fuentes, rutas, calendarios y escalamiento; permite confirmar, posponer, cancelar o reasignar. | Enseña a hacer visible quién recibe una alerta y cómo avanza. Es una solución de operación de incidentes; la documentación revisada no presenta el acompañamiento cotidiano de Rodrigo. |
| [Sleep Cycle](https://sleepcycle.com/the-app/smart-alarm) | Seguimiento del sueño y alarma en una ventana elegida, junto con reportes y recursos para dormir. | Permite distinguir despertar programado de urgencia de guardia. Aquí se constata su oferta, sin verificar precisión ni beneficios clínicos. |
| [one sec](https://one-sec.app/) | Pausas e intervenciones antes de abrir apps, bloqueo programado y límites para cortar el scroll. | Refuerza la familia de unrespiro/Opal. El mecanismo sirve para distracciones elegidas; aplicarlo a urgencias de soporte podría ser contraproducente. |

## Qué factores destacan

- **Controles nativos:** excepciones visibles y comprobadas en el dispositivo.
- **Guardia profesional:** responsabilidad explícita, confirmación y siguiente paso cuando alguien no responde.
- **Bienestar digital:** intervenir sobre el hábito en el momento preciso, con control del usuario.
- **Sueño:** separar registros reales, estimaciones y autorreportes; diferenciar descanso de alerta urgente.

Una hipótesis para explorar es combinar una experiencia de descanso comprensible con una operación de guardia verificable. Falta confirmar si esa combinación responde a una necesidad que Rodrigo no resuelve ya con sus herramientas.

## Preguntas de validación posteriores

1. ¿Qué teléfono y reloj utiliza Rodrigo y qué filtros nativos tiene disponibles?
2. ¿Su organización ya usa un sistema on-call y quién responde si él no confirma?
3. ¿Qué mensajes requieren intervención y cuáles podrían convertirse en tareas para después?
4. ¿Qué evidencia necesita para confiar y dejar de revisar el teléfono?

Son preguntas para próximas conversaciones, no respuestas asumidas ni requisitos adicionales para este benchmark.

## Recursos visuales

El panel usa iconos oficiales de App Store para las apps, el icono del sitio oficial de Apple/Android/PagerDuty/incident.io para esas soluciones y capturas públicas de las fuentes. Esos iconos de sitio representan al proveedor; no se presentan como un logotipo específico de la función Focus o Modos. La procedencia está en [fuentes-visuales.json](./fuentes-visuales.json).

No se contrataron servicios, conectaron cuentas ni modificaron controles del teléfono o integraciones del proyecto.
