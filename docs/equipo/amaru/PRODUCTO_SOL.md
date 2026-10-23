# SOL: menos trabajo para dejar algo encaminado

Documento de producto · 23 de octubre de 2026. Basado en el handoff de personalización y en la inspección del repositorio. Las metas y la expansión comercial son hipótesis por validar.

## La propuesta

**Cuéntale un pendiente a SOL. Recibe algo preparado, decide lo imprescindible y retoma después sin empezar de cero.**

El producto debe ahorrarle a la persona el trabajo de diseñar, configurar, operar y mantener su propio sistema. Claude, Codex y otros asistentes pueden servir para construir soluciones: la comparación relevante es cuánto esfuerzo exige conseguir un resultado confiable durante varias semanas.

El valor de SOL se vuelve concreto cuando Rodrigo termina con un registro preparado y un próximo paso claro; un profesor ve qué curso necesita atención; un coach sabe qué alumno espera una revisión. Una interfaz sencilla ayuda, pero la ventaja comercial necesita procesos específicos, integraciones mantenidas y recuperación ante errores.

La salida también debe ser fácil: copiar o exportar resultados, corregir contexto y desconectar fuentes. La preferencia por SOL debería venir del trabajo que evita.

## Una entrada, tres decisiones como objetivo

1. **Contarlo:** «Terminé el turno y me falta registrar la incidencia de acceso». No pedir profesión, todas las cuentas ni un perfil completo.
2. **Revisar algo útil:** mostrar un borrador editable con hechos aportados, incógnitas y siguiente paso. Preguntar únicamente por un dato que cambie ese resultado.
3. **Conservar o actuar:** guardar sin conexión. Si la persona quiere una operación externa, mostrar destino y contenido, pedir el permiso pertinente y comprobar el resultado.

Al volver, abrir el asunto activo: «Tienes un borrador listo y un dato por confirmar». Evitar otra bienvenida que obligue a reconstruir el contexto. El objetivo de dos minutos y unas tres intervenciones viene del handoff; todavía no es una métrica obtenida.

## Un núcleo común y procesos por contexto

El núcleo comparte personas o recursos, obligaciones, fechas, borradores, dependencias, permisos y evidencia. Cada proceso específico aporta los campos, las preguntas, la vista y el criterio de terminado. Seleccionar un ejemplo de profesión ayuda a empezar; no debería encasillar a la persona ni convertirse en una entrevista obligatoria.

| Contexto | Primera ayuda sin conectar | Proceso recurrente que justificaría volver | Conexión siguiente, cuando aporte valor |
| --- | --- | --- | --- |
| Rodrigo, guardias | Borrador del registro y pendiente explícito | Cierre de turno: registros, incidencias abiertas y relevo confirmado | Sistema de tickets real de Rodrigo; fuente autorizada de turnos |
| Profesor de matemáticas | Plan de una clase o lista de pendientes de un curso | Vista por curso: próxima clase, evaluaciones, materiales y revisión pendiente | Calendario o plataforma de cursos realmente utilizada |
| Coach de gimnasio | Ficha de seguimiento o agenda de una revisión | Vista por alumno: siguiente sesión, seguimiento pendiente y cambios confirmados | Calendario y sistema de gestión que ya use |
| Vida personal | Próximo paso de una preocupación concreta | Coordinación y pendientes con responsables y fechas confirmados | Una fuente concreta de calendario o correo |

Las vistas de cursos y alumnos requieren entidades persistentes y relaciones. Cambiar el saludo o generar un texto distinto no equivale a administrar un curso o una cartera de alumnos. En la demostración, estos contextos prueban la adaptación del primer resultado; su operación completa sigue siendo expansión de producto.

Un proceso reutilizable debería declarar: cuándo aplica, qué resultado prepara, campos imprescindibles, pregunta siguiente, capacidades necesarias, criterio de resolución, permisos, errores y forma de retomar. Así se pueden componer nuevos casos sin construir una aplicación distinta para cada cliente.

## Qué aporta la base actual

Inventario del código previo a este rediseño; existencia de un adaptador no implica que esté configurado ni verificado con una cuenta real.

| Capacidad | Evidencia en el repositorio | Límite relevante |
| --- | --- | --- |
| Tareas, configuración y persistencia | `backend/store.mjs`, `backend/postgres.mjs` | Un espacio de demostración compartido; no es un producto multiusuario |
| Clasificación de mensajes | `backend/agent.mjs`, `classifier/policy.mjs` | Escenarios sintéticos por reglas; Hermes requiere configuración y actúa como clasificador |
| WhatsApp | Webhook firmado, cola y adaptador Kapso | No demuestra acceso a cualquier grupo existente; entrega final y elegibilidad deben verificarse |
| Gmail | OAuth, consulta manual de correos con `[SOLSETS-DEMO]`, creación de borradores | No es lectura universal ni envío automático de correos |
| Calendar | Creación de eventos con recordatorio | No hay sincronización general de turnos ni recepción garantizada en un reloj |
| Permisos y pausa | Política del backend y configuración | No sustituyen autorización por versión para nuevas operaciones externas |
| Feedback | Correcciones de clasificación conservadas para Hermes | No equivale a una memoria personal completa con alcance, caducidad y borrado de derivados |
| Tickets, cursos, alumnos | Ejemplos y propuesta de producto | No hay un adaptador real de tickets ni conectores de gestión educativa o deportiva |

La nueva experiencia puede preparar, editar y conservar borradores de demo en este navegador sin depender de las integraciones. Debe decir dónde se guardan y mantener ese almacenamiento separado de credenciales o información sensible real. Los servicios existentes continúan siendo una capa distinta.

## Alcance del rediseño entregado

La landing lleva a `/demo`, una experiencia pública de preparación local. Permite elegir un caso ilustrativo o escribir un pendiente; SOL organiza el texto con plantillas guiadas, muestra el resultado editable y conserva borradores por contexto en este navegador. Los ejemplos de cursos y alumnos agrupan los detalles aportados sin inventar personas, cursos ni horarios. Se puede copiar un borrador, pausarlo, retomarlo y corregir dos preferencias: extensión de la respuesta y momento propuesto de revisión. Este último no programa un aviso.

El dashboard distingue preparados, decisiones, espera y actividad. Los registros heredados del backend no se cuentan como obligaciones resueltas. La demo local no consulta ni modifica integraciones. `/app` conserva el acceso protegido al espacio operativo de Rodrigo; el enlace a ese espacio realiza una navegación real para que se aplique la autenticación. La landing, la demo y los recursos compilados son públicos; la API y OAuth siguen protegidos cuando se configura la contraseña del panel.

Esto demuestra la entrada y continuidad de la ayuda, no todo el alcance P0 del handoff original. Sigue pendiente el circuito nuevo de autorización por versión, ejecución mediante adaptador, comprobante y recuperación de un resultado incierto. La memoria implementada no es todavía un registro general de hechos con vigencia y dependencias. Tampoco hay gestión completa de cursos o alumnos, agente conversacional general en este flujo, sincronización entre dispositivos ni automatización recurrente de estos borradores. La infraestructura previa de guardia se conserva como experiencia operativa separada.

## Estados que merecen confianza

Separar el pendiente humano de la acción digital:

- **Preparado:** hay un borrador utilizable. Todavía no se registró fuera de SOL.
- **Necesita tu decisión:** falta una respuesta concreta o una autorización.
- **En espera:** existe una dependencia identificada o un resultado todavía incierto.
- **Acción confirmada:** el servicio devolvió evidencia de la operación específica.
- **Obligación resuelta:** se cumplió su criterio de resolución, con evidencia pertinente.

«Ticket creado» no significa «incidencia solucionada». «Respuesta enviada» no significa «acceso restablecido». Una ejecución simulada debe seguir identificada como simulada después de recargar.

El backend anterior usa `resolved` para algunas respuestas aceptadas y efectos simulados, y el panel anterior agrupaba borradores con resueltas. El nuevo panel debe interpretar esos registros como acciones del escenario y mostrar su evidencia; no convertirlos en una afirmación de que la obligación humana terminó. Una evolución posterior del backend debe separar ambas máquinas de estados.

La memoria necesita un origen y un alcance. «Hoy salgo a las 08:00» modifica ese turno, no toda la semana. Una corrección material invalida las aprobaciones dependientes. Una preferencia de formato nunca amplía permisos. Un resumen de cierre indica también qué fuentes no se consultaron y qué relevo no está confirmado.

## Landing y dashboard

La landing debe prometer el resultado que la demostración efectivamente permite probar: empezar con un pendiente, obtener ayuda concreta y conservar contexto. Los ejemplos de Rodrigo, profesor y coach son casos ilustrativos, no clientes o testimonios. No mostrar ahorro de tiempo, número de usuarios o mejoras del sueño como resultados medidos.

La referencia visual se traduce en azul profundo que se degrada a blanco, flechas repetidas que responden al cursor, amarillo ácido para la acción principal, títulos grandes, espacio generoso y listas con líneas finas. Los retratos de flechas y sus detalles al pasar el cursor pueden explicar cómo cambia el resultado por contexto. El efecto debe tener alternativa por foco o toque y respetar movimiento reducido.

El dashboard continúa ese lenguaje y reduce las decisiones: una entrada a SOL, el siguiente pendiente y una lista breve por estado. Conexiones y permisos aparecen accesibles, pero la persona no necesita configurarlos todos para recibir valor. La complejidad técnica de modelos, agentes y servidores pertenece a la administración del producto.

## Criterios para verificar la experiencia

Estos son criterios de aceptación, no un registro de pruebas ya aprobadas.

| Recorrido | Resultado comprobable |
| --- | --- |
| Entrar desde la landing | El CTA abre el espacio adecuado y conserva el ejemplo o texto introducido |
| Primera ayuda | Se obtiene un borrador editable sin cuentas conectadas ni perfil largo |
| «No sé por dónde empezar» | Ofrece una entrada pequeña y útil; no inicia una encuesta |
| Incidencia sin estado conocido | Permite «No lo sé» y conserva la incertidumbre |
| Corregir el borrador | Los cambios sobreviven al guardado y a la recarga |
| Guardar dos veces | No aparecen dos copias por un doble clic accidental |
| Pausar y volver | Recupera el asunto y su paso actual sin repetir preguntas respondidas |
| Cambiar de contexto | Cambian ejemplos y campos pertinentes sin mezclar borradores entre personas ilustrativas |
| Corregir o borrar memoria | Cambia el comportamiento posterior; no reaparece desde un resumen viejo |
| Rechazar conexión | Se conserva el borrador y se puede terminar por ahora |
| Fuente no disponible | Explica el límite, conserva la entrada y ofrece continuar localmente |
| Resultado y contador | Borradores, ejecuciones simuladas y obligaciones resueltas no se cuentan como lo mismo |
| Móvil y teclado | Se completa el recorrido sin desbordes, trampas de foco ni controles dependientes solo de hover |
| Servicios existentes | Se mantienen rutas, estados, permisos y manejo de error de la API |

Para operaciones externas futuras añadir pruebas de autorización por versión, doble envío, resultado incierto, reconexión y aislamiento entre usuarios. No presentar estos contratos como implementados por un cambio visual.

## Secuencia recomendada después de la demo

1. **Cerrar el caso Rodrigo:** identificar su sistema real de tickets y un proceso de fin de turno. Implementar ese circuito con evidencia y probarlo durante varias jornadas.
2. **Convertir el resultado en continuidad:** asuntos abiertos, próximos pasos y memoria corregible. Ofrecer una rutina recurrente cuando Rodrigo vea el beneficio y la autorice.
3. **Conectar la fuente que elimina más trabajo:** priorizar por pasos ahorrados y fiabilidad, no por el tamaño del catálogo.
4. **Añadir una segunda vertical:** elegir profesor o coach según acceso a usuarios y uso repetido. Reutilizar el núcleo y construir las entidades de cursos o alumnos que hagan falta.
5. **Preparar operación comercial:** identidad y aislamiento por usuario, políticas de retención, observabilidad de fallos, soporte y costes por resultado.

## Cómo saber si ganamos por facilidad

Comparar el mismo trabajo con SOL y con un asistente general bien configurado. Medir la primera vez y varias repeticiones: tiempo activo, cantidad de decisiones, preguntas repetidas, correcciones, acciones con resultado comprobado, recuperación ante fallos y soporte manual del equipo.

La prueba decisiva es que una persona vuelva porque le cuesta menos conseguir y mantener su resultado. Un piloto pagado con alcance concreto permite contrastar ese beneficio con el coste de modelos, infraestructura, integraciones y soporte. El interés por una landing o una demostración no prueba disposición a pagar.

El beneficio buscado es liberar carga operativa y facilitar la desconexión. Cualquier mejora del sueño requiere evaluación aparte; no debe usarse como promesa clínica ni justificar ocultar alertas o asumir cobertura.
