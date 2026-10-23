# Referentes de wellness para Solsets

Consulta: 23 de octubre de 2026. Primera ronda exploratoria, abierta a revisión con Quito. El panel se amplió después con [doce apps adicionales](./ampliacion.md): ahora reúne 20 referentes y 6 soluciones adyacentes.

## Abrir el mapa

- [Mapa editable de Excalidraw](./mapa-wellness.excalidraw): descargar o arrastrar a [excalidraw.com](https://excalidraw.com). Las imágenes están incluidas; no dependen de `.context/`.
- [Tablero para explorar en el navegador](./tablero.html): abrir localmente; permite navegar por secciones, acercar y arrastrar.
- [Fuentes de las imágenes](./fuentes-visuales.json): URLs originales, ficha de la app y fecha de consulta.

El mapa conserva la primera ronda y añade una sexta sección con doce apps más. Incluye cuatro hipótesis, tres direcciones visuales, notas del equipo y un [paisaje de seis soluciones existentes](./soluciones.md). El panel incorpora logos e iconos oficiales, filtros y anotaciones locales que se pueden exportar.

## Qué estamos buscando

Rodrigo necesita soltar la vigilancia del teléfono sin perder una urgencia de soporte TI. Para analizar referentes separamos cuatro necesidades: salir del ruido, bajar revoluciones, responder a lo importante y entender qué ocurrió durante el descanso.

Las apps resuelven problemas diferentes. Los bloqueos digitales, la relajación y una alarma pueden inspirar partes del recorrido; su combinación en Solsets necesita validación propia.

## Comparación

Las funciones se describen según las fuentes oficiales. La lectura estética y la selección de factores son nuestro análisis, basado en las imágenes públicas consultadas.

| App | Mecanismo documentado | Estética observada en las referencias | Factor a explorar en Solsets | Límite de la adaptación |
| --- | --- | --- | --- | --- |
| [Opal](https://www.opal.so/) | Bloqueo de apps, reglas de foco, temporizador e hitos. | Interfaz oscura; indicadores circulares grandes; brillo azul; fuerte jerarquía del tiempo. | Reglas fáciles de entender y estado de protección visible. | Bloquear el canal completo de WhatsApp puede impedir la guardia. |
| [unrespiro](https://apps.apple.com/es/app/unrespiro-bloqueo-apps-y-foco/id6742792786) | Pausas con frase y temporizador, bloqueos manuales y rutinas horarias. | Carbón, tarjetas compactas, acentos verdes/rojos y gráficos de uso. | Pausa voluntaria y decisión consciente al cerrar el día. | No introducir fricción en el acceso a un incidente urgente. |
| [Alarmy](https://alar.my/en) | Misiones para apagar alarmas, comprobación de despertar y funciones de sueño. | Promoción cian/amarilla; interfaz oscura y números grandes; acciones concretas. | Confirmación explícita de que Rodrigo recibió y atendió una alerta. | Resolver misiones no es adecuado para responder una emergencia de soporte. |
| [RISE](https://www.risescience.com/) | Estimaciones de deuda de sueño y energía; hábitos y recordatorios. | Negro/morado, curvas y eje horario; una métrica ocupa el centro. | Parte temporal de la noche y próximos hitos comprensibles. | Solsets todavía no mide el sueño ni puede calcular esa deuda. |
| [Calm](https://www.calm.com/) | Relatos para dormir, meditación, sonido y respiración. | Paisajes, azules e imágenes amplias; biblioteca de contenido. | Sensación de refugio y entrada sencilla al descanso. | Un catálogo amplio también puede aumentar la carga de elección. |
| [Headspace](https://www.headspace.com/) | Meditaciones, recursos para dormir y ejercicios/programas por necesidad. | Ilustración simple, amarillo/naranja; tonos oscuros en contenido de sueño. | Explicaciones cercanas y prácticas breves ligadas al momento. | Evitar sumar cursos o tareas a alguien ya sobrecargado. |
| [Endel](https://endel.io/) | Sonido adaptativo, selección automática y experiencia en varios dispositivos. | Player negro y geometría de líneas; las piezas promocionales son más saturadas. | Una acción principal y acompañamiento con poca interacción. | El sonido debe ser opcional y conservar la percepción de alertas. |
| [Finch](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748) | Mascota, objetivos pequeños, chequeos de ánimo, diario y respiración. | Personajes, ilustración, verdes y cielo azul; checklist y recompensas. | Feedback amable y breve; reconocer avances sin penalizar el descanso. | El tono lúdico y la mascota requieren validación con Rodrigo. |

## Cuatro hipótesis que vale la pena discutir

Son propuestas de adaptación, no requisitos aprobados ni funcionalidades ya implementadas.

### 1. Un estado principal que transmita confianza

**Referentes:** Opal, Calm y Endel.

Una pantalla de descanso podría mostrar si la guardia está activa, el agente está en pausa o algo requiere revisión. Dar acceso al horario y a las reglas, con los detalles bajo demanda.

**Prueba:** después de cinco segundos, ¿Rodrigo puede explicar qué está activo y cuándo lo interrumpirían? El aspecto tranquilo por sí solo no demuestra comprensión ni confiabilidad.

### 2. Un cierre del día corto y opcional

**Referentes:** unrespiro y Headspace.

Confirmar horario, excepciones y pendientes antes de soltar el teléfono; ofrecer una pausa breve que se pueda omitir. El propósito sería reducir la vigilancia mental, no abrir otra rutina obligatoria.

**Prueba:** observar si el cierre facilita dejar el teléfono y qué parte se vuelve innecesaria con el uso. Una urgencia debe conservar su recorrido directo.

### 3. Escalar hasta obtener una respuesta verificable

**Referentes:** el principio de comprobación de Alarmy, y los flujos operativos de PagerDuty e incident.io revisados en [soluciones existentes](./soluciones.md).

Explorar una alerta con incidente, motivo y confirmación «Lo vi», además de una política explícita cuando no hay respuesta. Distinguir aceptado por API, entregado y confirmado.

**Prueba:** usar los dispositivos reales y verificar que el canal interrumpe cuando corresponde. Hoy el backend registra aceptación o fallo del envío; no existe este circuito completo de confirmación y reintento.

### 4. Una mañana que dé contexto sin juicio

**Referentes:** RISE y Finch.

Partir del resumen de tareas existente: qué se resolvió, qué espera aprobación y qué fue urgente. Explorar un chequeo breve y opcional de cómo descansó, manteniendo separados el autorreporte y los registros del sistema.

**Prueba:** comprobar si Rodrigo entiende lo ocurrido sin revisar el hilo completo. No convertir tareas resueltas en horas de sueño ganadas ni inventar una puntuación fisiológica.

## Tres direcciones estéticas abiertas

| Dirección | Qué combinar | Qué revisar con Rodrigo |
| --- | --- | --- |
| Refugio nocturno | Aire, oscuridad y contraste medido de Opal/Calm/Endel. | Legibilidad, percepción de protección y diferenciación de una urgencia. |
| Compañía cálida | Lenguaje e ilustración de Headspace/Finch. | Si el tono le da confianza o se siente infantil/paternalista. |
| Claridad funcional | Estados, horarios y acciones visibles de unrespiro/RISE/Alarmy. | Qué información realmente necesita y cuándo se vuelve saturación. |

Se pueden combinar componentes; estas direcciones sirven para comparar sensaciones antes de elegir una identidad visual.

## Punto de partida del repo

El panel ya tiene horario, permisos, pausa, modo sombra, tareas y parte de la mañana: [interfaz](../../../web/src/main.jsx). La [política](../../../classifier/policy.mjs) escala novedades y baja confianza, y respeta la pausa. El [procesador](../../../backend/processor.mjs) registra efectos y suprime alertas duplicadas tras un envío aceptado o simulado.

El horario guardado es una preferencia, no un filtro temporal que active o desactive la clasificación. Las propuestas anteriores no se han añadido al producto.

## Método, evidencia y límites

- Se consultaron sitios oficiales y descripciones del desarrollador en App Store. Para unrespiro se utilizó su ficha oficial porque el sitio no pudo recuperarse con Firecrawl. Finch se complementó con su descripción en App Store.
- Las referencias de apps proceden de las fichas de App Store: dos por app, 40 tras la ampliación. Son material promocional del desarrollador que incluye fragmentos de interfaz, no capturas tomadas durante una prueba de uso. Se conservaron sus proporciones y contenido. El panel añade dos imágenes públicas de documentación/producto para PagerDuty y one sec, y 26 iconos oficiales. Las demás soluciones se presentan con su icono y análisis de la fuente.
- Las observaciones distinguen la campaña de adquisición de la interfaz cuando difieren, especialmente en Alarmy y Endel. La apariencia puede variar por versión, plataforma y región.
- No se instalaron las apps, completaron onboardings ni probaron pagos, bloqueo del sistema, audio, notificaciones, accesibilidad o desempeño. Tampoco se revisó la evidencia de eficacia de las marcas; sus afirmaciones no se trasladan a Solsets.
- Esta selección es exploratoria, no un ranking exhaustivo ni una recomendación de compra. Las hipótesis deben contrastarse con el caso y la experiencia de Rodrigo.
- Imágenes y marcas pertenecen a sus respectivos titulares; se incluyen como referencia comparativa, no como recursos para incorporar a la aplicación.

## Siguiente conversación

Revisar una dirección visual a la vez y mover notas a **Conservar**, **Adaptar**, **Descartar** o **Por probar**. Empezar por la sensación que Solsets debería transmitir durante el descanso.
