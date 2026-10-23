# Brief de la app SOL

Lo que Bishara definió el 2026-10-23 para la app. Es el brief de diseño: qué tiene que tener y cómo se tiene que sentir. Las decisiones abiertas están al final.

## La idea en una frase

Un agente que está atento todo el día y toda la noche a tu correo, tu WhatsApp y tus otras conexiones. De día funciona como una secretaria que ordena tareas y calendario. De noche cuida tu descanso: te despierta solo si algo es urgente, o te deja todo ordenado, según lo que necesites.

## Dos modos, una misma app

1. **De día, modo secretaria.** Recibe correos y mensajes, saca las tareas, les pone fecha, ordena el calendario y te muestra lo importante. Lo urgente también aparece, pero el foco es el orden.
2. **De noche, modo noche.** Depende de la persona:
   - **Guardia** (Rodrigo): el agente vigila, te despierta solo si es urgente y deja el resto para el resumen de la mañana.
   - **Todo ordenado**: no despierta a nadie. Te deja un resumen nocturno de lo pendiente, lo abierto y cómo se aborda mañana o en la semana, y con eso te desconectas tranquilo.

## Lo que tiene que tener

1. **Vista inicial:** las tareas importantes a la vista, un calendario con lo que viene (incluye los turnos de guardia de Rodrigo y sirve para cualquier persona) y un botón abajo a la derecha para abrir el chat con el agente.
2. **Resumen matutino:** en la app y probablemente también por WhatsApp.
3. **Resumen nocturno o antes de la guardia:** lo pendiente, lo abierto y cómo se aborda.
4. **Descarga en cualquier momento:** un audio o un texto ("tengo que hacer tal y tal cosa"), por WhatsApp o en la app. El agente lo anota como tarea, le pone fecha y lo suma a lo que ya recibió de las integraciones. En la noche ayuda a desconectarse.
5. **Onboarding:** obtiene contexto de la persona (su vida, sus necesidades, sus objetivos), conecta las fuentes y la ayuda a entender y adoptar la app. Tiene que ser sin fricción.
6. **Entrenamiento y aprendizaje (clave):**
   - El agente lee los correos y WhatsApp de los últimos meses.
   - Entiende qué llega y qué es urgente.
   - Propone reglas y categorías, y la persona las confirma.
   - Después hay un período piloto en que la persona participa para que el agente quede robusto y pueda confiar en él.
   - La app tiene que mostrar que todo está integrado, mapeado y funcionando. Si el agente no entiende algo, pregunta.
   - Tiene su propia vista o menú, además del onboarding.
7. **Memoria:** una vista de lo que el agente sabe de la persona.
8. **Hábitos y sueño:** un registro sin que la persona tenga que llenar nada.

## Principios

1. **Cero carga extra.** Nadie tiene que acordarse de llenar tareas ni de registrar hábitos. Lo que pide esfuerzo diario se abandona.
2. **Se adapta a cada persona.** Rodrigo es el caso de la demo, pero los objetivos cambian: dormir más, no despertarse tanto, tener todo ordenado.
3. **Confianza visible.** La app muestra qué está conectado, qué revisó y por qué decidió algo.
4. **Diseño mobile de primer nivel.** Sistema visual de Amaru ("Mi espacio": blanco, azul #2E59E5, lima #E4F51A, flecha ↗) con modo noche.
5. **Inspirarse en las mejores apps** de productividad, tareas y asistentes, adaptadas al caso.

## Quién hace qué

- **Bishara:** diseño y app (`mobile/`), y los mensajes que llegan por WhatsApp como diseño.
- **Quito:** el agente: clasificación, memoria, aprendizaje, chat.
- **Amaru:** `server/`: fuentes (WhatsApp, correo, calendario), API, push y llamada.

## Decisiones

1. Sistema visual: Mi espacio de Amaru con modo noche. Oficial, ver `adr/oficiales/2026-10-23-sistema-visual-mi-espacio-con-modo-noche.md`.
2. Modo noche: se activa solo a la hora que la persona programa, o a mano.
3. Referencias: el tablero de Quito (`docs/equipo/quito/tablero/referentes/`, 33 apps).

## Abiertas

1. Navegación: 3 o 4 pestañas, y si el botón de chat y la sección "Sol" son lo mismo.
2. Si las vistas se construyen en paralelo.
