# La demo debe poder despertar con una llamada real al iPhone

Estado: oficial
Fecha: 2026-10-24
Decidió: Quito, confirmado expresamente como «oficial» en la conversación
Carril: los tres; coordinación con Amaru y Bishara pendiente

## Contexto

La auditoría de ramas y del recorrido funcional encontró componentes probados por separado, sin acreditar WhatsApp → agente real → app → confirmación. El acuerdo del 23 de octubre permitía simular push y llamada. Quito confirmó que mantiene como base la demo completa y quiere que el aviso pueda despertar al usuario con el teléfono bloqueado, idealmente mediante llamada; una alarma tipo Alarmy es la alternativa que pidió explorar.

Quito indicó que el teléfono de prueba es un iPhone con iOS 27. Es información declarada en la conversación, no una comprobación física del dispositivo.

## Decisión

1. La llamada real para despertar pasa a ser parte del objetivo de esta entrega. Se reemplaza la exclusión de llamada real del [ADR anterior](2026-10-23-push-y-llamada-simulados-en-la-demo.md); su exclusión de push real se mantiene. Una pantalla que dice «Te estoy llamando» no satisface esta decisión.
2. Se conserva la cadena real: WhatsApp de demo → servidor → agente → política → resultado y alerta persistidos → app. La llamada debe nacer de esa alerta y no de un botón manual escondido en el guion.
3. Se conserva el plazo acordado: si el usuario no confirma «Lo vi» en 3 minutos, el servidor inicia la llamada. No se decide aquí llamar inmediatamente ni se fijan nuevos intervalos o máximos de repetición.
4. La app ofrece el recorrido de descanso y guía la configuración necesaria del iPhone para permitir el contacto de llamada durante Descanso y, cuando corresponda, su excepción de emergencia. No afirma haber cambiado por sí sola Concentración, silencio o permisos que el usuario debe configurar.
5. La vía prioritaria es la llamada telefónica real. AlarmKit queda como alternativa por validar: iOS 27 cumple su mínimo iOS 26, pero una alarma programada localmente no acredita activación remota por un incidente. No sustituye automáticamente la llamada comprometida.
6. La aceptación exige un urgente ficticio con Soltra en segundo plano y el iPhone bloqueado, con Descanso y la configuración de sonido que se pretenda soportar. Hay que comprobar que la llamada llega y suena físicamente. La aceptación HTTP del proveedor no demuestra sonido ni que una persona despertó.
7. Amaru mantiene telefonía, temporizador, persistencia y cancelación en `server/`; Bishara mantiene descanso, guía de permisos y confirmación en `mobile/`; Quito mantiene clasificación y política en `agent/`. El cambio de contrato común se acuerda entre los tres antes de implementarse.

## Por qué

Quito priorizó que el teléfono pueda despertarlo. La llamada evita depender de que la pantalla de Soltra siga abierta. La guía oficial de Apple permite configurar llamadas de contactos y excepción de emergencia durante silencio o Concentración. AlarmKit ofrece alarmas que atraviesan esos modos con autorización, pero la entrega de notificaciones en segundo plano puede retrasarse; no basta con instalar el framework para prometer una alarma remota fiable.

- [Apple: llamadas permitidas y excepción de emergencia](https://support.apple.com/guide/iphone/allow-or-silence-notifications-for-a-focus-iph21d43af5b/ios).
- [Apple: AlarmKit, mínimo de sistema y autorización](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit).
- [Apple: límites de entrega en segundo plano](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app).

## Lo que cuesta

- Aumenta el alcance respecto de la demo con llamada simulada. Proveedor, número, credenciales, costo y disponibilidad quedan por resolver con Amaru; esta decisión no contrata servicios ni autoriza envíos de prueba a cualquier destinatario.
- Hay que conservar `alertId`, plazo y estado de confirmación en el servidor, evitar llamadas duplicadas y comprobar cancelación antes de llamar. El máximo e intervalo de repetición siguen pendientes de concretar.
- La preparación del iPhone y el ensayo físico forman parte de la entrega. Sin cobertura, teléfono apagado u otras condiciones no probadas, no se promete despertar garantizado.
- Modo sombra conserva sus reglas: no silencia ni ejecuta la llamada real; muestra qué habría hecho. La excepción ante caída grave sin guardia sigue en su ADR por confirmar.
- Solo se usan mensajes ficticios para las pruebas y se llama únicamente al teléfono expresamente autorizado para el ensayo.

## Construcción, disponibilidad y verificación

Esta entrega registra la decisión y actualiza el tablero de Quito. No implementa ni despliega telefonía, alarma nativa o modo descanso, no fija un proveedor y no acredita una llamada ni sonido en dispositivo. El reparto está documentado; su implementación y prueba requieren coordinación con Amaru y Bishara. La publicación de un pedido no acredita que lo hayan aprobado o leído.

## Cambios

