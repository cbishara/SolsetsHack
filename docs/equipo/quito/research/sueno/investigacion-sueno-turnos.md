# Investigación: turnos rotativos y sueño corto crónico (caso Rodrigo)

Carril: turnos rotativos y deuda de sueño crónica. El efecto de la guardia en sí (dormir peor por estar disponible, inercia del sueño) está en `investigacion-sueno-guardia.md`, en esta misma carpeta. Aquí no se repite.

Fecha: 2026-10-23. Lo hizo el agente deep-research para la hackatón Señales.

## Veredicto en cuatro frases

1. A Rodrigo no lo mantiene despierto una sola cosa: se le suman tres. Duerme poco desde hace 14 meses, su horario cambia cada semana, y el aviso puede llegar en cualquier momento.
2. La evidencia más dura es la de laboratorio sobre sueño restringido. Con 6 h o menos durante 14 días, el rendimiento cae al nivel de hasta 2 noches sin dormir, y la persona no lo nota (Van Dongen 2003).
3. Sobre los turnos hay mucha encuesta y poca intervención controlada. Lo que se repite en las revisiones es esto: rotar hacia adelante, rotar rápido, dejar 11 h o más entre turnos y que el trabajador pueda elegir sus turnos.
4. De Chile hay pocos datos. Lo único primario que encontré es la ENS 2016-2017: 11,1% de los mayores de 15 años dice haber tenido "mucho o demasiado" problema de sueño en el último mes.

## Advertencia de coherencia antes de usar esto

INCOHERENCIA: el caso dice "turnos rotativos semanales, guardia por WhatsApp". Eso se puede leer de dos formas, y la evidencia que sirve es distinta en cada una.

1. Lectura A: Rodrigo trabaja de día y una semana de cada tantas queda de guardia nocturna desde su casa. En ese caso la literatura que más aplica es la de guardia (on-call) y la de sueño restringido. Los estudios de turnos nocturnos aplican solo en parte, porque no trabaja de noche en un lugar fijo.
2. Lectura B: Rodrigo rota cada semana entre turno de mañana, tarde y noche, y además hace guardia. Ahí aplica todo lo de este documento, incluido el Trastorno del sueño por trabajo en turnos.

Recomendación: fijar en el guion del pitch cuál de las dos es. Si es la A, conviene hablar de "guardia rotativa semanal", no de "turnos rotativos", para que el jurado no espere un caso de turno de noche.

## Cómo se verificó

1. Los abstracts los leí con la API REST de Europe PMC, que devuelve el texto del abstract de PubMed sin cookies. Abajo, cada estudio lleva su link de PubMed.
2. Leí el texto completo de Pallesen 2021 (Europe PMC), Reynolds 2021 (Europe PMC), Watson 2015 (PMC, vía r.jina.ai), Wickwire 2017 (PMC, vía r.jina.ai) y Schneider y Harknett 2019 (PMC, vía r.jina.ai). De este último leí solo la primera mitad del texto.
3. Los datos de Chile los saqué de la planilla oficial de indicadores de la ENS 2016-2017 (xlsx de epi.minsal.cl), del PDF de segundos resultados de la ENS, de un informe SUSESO 2015 en PDF y del texto de la Ley 21.220 en la BCN (leychile.cl).
4. No pude leer el texto completo de Van Dongen 2003, Drake 2004, Torsvall 1988 ni Sprajcer 2018: Oxford y Taylor & Francis piden suscripción. Los cito solo por su abstract.
5. El manual ICSD-3 de la AASM es pagado y no lo leí. Los criterios del Trastorno del sueño por trabajo en turnos los tomé de dos papers que los reproducen (Pallesen 2021 y Reynolds 2021). Ambos coinciden.

Tipos de evidencia, como van marcados abajo:
1. [LAB]: estudio de laboratorio controlado. Causal, pero con pocas personas y en condiciones artificiales.
2. [OBS]: observacional, encuesta o cohorte. Muestra asociación, no causa.
3. [RS]: revisión sistemática o metaanálisis.
4. [CONSENSO]: declaración de un panel de expertos.
5. [NARRATIVA]: revisión narrativa, sin método sistemático.
6. EVIDENCIA DÉBIL: muestra muy chica, sin grupo control o autorreporte sin validar.

---

## 1. Shift Work Disorder (Trastorno del sueño por trabajo en turnos)

### 1.1 Definición clínica (ICSD-3, AASM 2014)

Qué es, en simple: insomnio o somnolencia excesiva, con menos horas de sueño, causados por un horario de trabajo que cae encima de las horas normales de dormir.

Criterios ICSD-3, según los reproducen Pallesen 2021 y Reynolds 2021 (no leí el manual):
1. Queja de insomnio y/o somnolencia excesiva, acompañada de una reducción del tiempo total de sueño, asociada a un horario de trabajo recurrente que se superpone con el horario habitual de sueño.
2. Síntomas presentes por al menos 3 meses, asociados al horario de turnos.
3. Registro de sueño o actigrafía por al menos 14 días, que incluya días de trabajo y días libres, mostrando un patrón de sueño y vigilia alterado.
4. No se explica mejor por otro trastorno del sueño, médico, neurológico o mental, ni por medicamentos o sustancias.

Reynolds 2021 agrega que, según el texto del ICSD-3, el sueño suele acortarse entre 1 y 4 horas.

Cambio respecto de ICSD-2 (Pallesen 2021, texto completo): el ICSD-3 endureció tres cosas. Exige reducción del tiempo total de sueño, sube la duración mínima de 1 mes a 3 meses, y sube el registro de 7 a 14 días con días libres incluidos.

INCOHERENCIA entre fuentes: Wickwire et al. 2017 (Chest, PMID 28012806) presenta como "ICSD-3" unos criterios con "≥ 1 mes" y "≥ 7 días". Esos plazos son los del ICSD-2 según Pallesen y Reynolds. Si alguien cita a Wickwire para la definición, va a citar plazos viejos.

Para Rodrigo: lleva 14 meses, muy por encima de los 3 meses. Pero sin diario de sueño de 14 días nadie le puede poner el diagnóstico. Y si su caso es la lectura A (guardia desde casa, no turno de noche), encaja en el borde del criterio 1.

### 1.2 Prevalencia

1. [RS] Pallesen S, Bjorvatn B, Waage S, Harris A, Sagoe D. 2021. Frontiers in Psychology. Metaanálisis de 29 estudios, n = 22.014 trabajadores en total. Prevalencia combinada: 26,5% (IC95% 21,0 a 32,8). La heterogeneidad es altísima (I² = 98,5%), con un intervalo de predicción de 6% a 67%. Con criterios ICSD-3 la prevalencia sale más baja que con ICSD-2. https://pubmed.ncbi.nlm.nih.gov/33833721/
2. [OBS] Vanttola P, Puttonen S, Karhula K, Oksanen T, Härmä M. 2020. Journal of Sleep Research. Personal hospitalario de Finlandia, con horas trabajadas sacadas del registro de nómina y no de la memoria del trabajador: n = 1.813 sin noches, 2.917 con noches y 84 de noche permanente. Con ICSD-3, la prevalencia es de 2,6% a 9,5% en quienes rotan con noches y de 6,0% en noche permanente. Con ICSD-2 sube a 5,6% a 33,5%. Los autores proponen como corte razonable 3 o más días con síntomas al mes, lo que da 3% a 6%. https://pubmed.ncbi.nlm.nih.gov/31410909/
3. [OBS] Reynolds AC, Ferguson SA, Appleton SL y otros. 2021. Nature and Science of Sleep. Encuesta nacional australiana online de 2019, n = 964 trabajadores, de los cuales 448 tenían horario no estándar. "Probable" trastorno: 10,5% en general, 12,7% en quienes rotan turnos y 9,6% en quienes entran muy temprano. Quienes lo tenían reportaron 1,7 veces más errores en el trabajo atribuidos al sueño. https://pubmed.ncbi.nlm.nih.gov/34104021/
4. [OBS] Drake CL, Roehrs T, Richardson G, Walsh JK, Roth T. 2004. Sleep. Muestra poblacional de Detroit por llamadas aleatorias, n = 2.570: 360 en turnos rotativos, 174 de noche y 2.036 de día. El abstract concluye que la prevalencia es de "aproximadamente 10%" de quienes trabajan de noche o rotan. Quienes cumplían criterio tenían más úlceras (OR 4,18; IC95% 2,00 a 8,72), más accidentes por sueño, más ausentismo, más depresión y faltaban más a actividades familiares y sociales. https://pubmed.ncbi.nlm.nih.gov/15683134/
   Aviso: las cifras de 32% en trabajadores de noche y 26% en rotativos que circulan citadas a Drake vienen del texto completo, y no pude leerlo. Wickwire 2017 las cita como rangos de 14,1% a 32% y de 8,1% a 26%. No las usaría en el pitch.

Lectura honesta: el número depende muchísimo de cómo se mida. Lo defendible es esto: "entre 1 de cada 10 y 1 de cada 4 trabajadores en turnos, según el criterio usado".

### 1.3 Se revierte si cambia el horario

[OBS] Waage S, Pallesen S, Moen BE y otros. 2021. Chronobiology International. Seguimiento a 2 años de enfermeras noruegas, n = 1.076, con criterios ICSD-3. Dejar el trabajo nocturno fue el predictor más fuerte para recuperarse del trastorno (OR 10,91; IC95% 6,11 a 19,46). Pasar de día a noche fue el más fuerte para desarrollarlo (OR 4,75; IC95% 2,39 a 9,47). Reducir en más de 10 al año las noches o los retornos rápidos también se asoció a recuperarse. https://pubmed.ncbi.nlm.nih.gov/33736559/

Para el producto: es la mejor prueba de que el problema es el horario, no la persona. Bajar cuántas noches interrumpidas tiene Rodrigo mueve la aguja.

---

## 2. Circadian misalignment (Desalineación circadiana) y cómo rota el turno

### 2.1 Qué es

En simple: el reloj interno dice "duerme" y el trabajo dice "despierta". Cuando la persona duerme y come a deshoras respecto de ese reloj, duerme peor y el metabolismo se descompensa.

1. [LAB] Scheer FA, Hilton MF, Mantzoros CS, Shea SA. 2009. PNAS. n = 10 adultos, 10 días en laboratorio con "días" de 28 horas para desfasar el sueño unas 12 h. Con el desfase, la eficiencia del sueño cayó 20% (P < 0,002), la glucosa subió 6% pese a 22% más de insulina, y el ritmo diario del cortisol se invirtió por completo. 3 de 8 participantes tuvieron respuestas de glucosa de rango prediabético. https://pubmed.ncbi.nlm.nih.gov/19255424/
   EVIDENCIA DÉBIL en tamaño (n = 10), pero es causal.

### 2.2 El cuerpo casi nunca se adapta, ni siquiera con noche fija

[RS] Folkard S. 2008. Chronobiology International. Revisión de 6 estudios que miden el ritmo de melatonina en trabajadores de noche permanente. Menos de 3% logra adaptación completa y menos de 1 de cada 4 se adapta lo suficiente como para sacarle algún beneficio. https://pubmed.ncbi.nlm.nih.gov/18533325/

Lo que implica para Rodrigo: si con noche fija casi nadie se adapta, con un horario que cambia cada semana no hay adaptación posible. Cada cambio de semana es como un pequeño jet lag.

### 2.3 Importa la dirección de la rotación

Hacia adelante (forward o clockwise) significa mañana, luego tarde, luego noche. Hacia atrás (backward o counterclockwise) es al revés.

1. [RS] Driscoll TR, Grunstein RR, Rogers NL. 2007. Sleep Medicine Reviews. La evidencia no alcanza para conclusiones definitivas, pero apoya rotar hacia adelante en vez de hacia atrás, al menos en turnos de 8 horas. https://pubmed.ncbi.nlm.nih.gov/17418596/
2. [OBS] van Amelsvoort LG, Jansen NW, Swaen GM, van den Brandt PA, Kant I. 2004. Scandinavian Journal of Work, Environment & Health. Cohorte de Maastricht: 95 trabajadores rotando hacia adelante y 681 hacia atrás, seguidos 32 meses. Rotar hacia atrás se asoció a más necesidad de recuperación (RR 2,88; IC95% 1,06 a 7,81) y peor salud general (RR 3,21; IC95% 1,32 a 7,83). Rotar hacia adelante se asoció a mejor calidad de sueño y menos conflicto trabajo-familia. https://pubmed.ncbi.nlm.nih.gov/15143742/
3. [OBS] Shiffer D, Minonzio M, Dipaola F y otros. 2018. International Journal of Environmental Research and Public Health. 100 enfermeras italianas: 50 rotando hacia adelante y 50 hacia atrás. Las primeras durmieron 7,40 ± 2,24 h por ciclo y las segundas 6,09 ± 1,73 h (p < 0,001). Despertares nocturnos: 40% contra 80%. Interferencia con la vida familiar: 20% contra 70%. https://pubmed.ncbi.nlm.nih.gov/30231514/
   EVIDENCIA DÉBIL: transversal, cuestionario ad hoc, y los dos grupos además tenían distinta cantidad de días libres.
4. Contrapeso (Wickwire 2017, texto completo): reconoce que la evidencia sobre la dirección "ha sido mixta".

### 2.4 Importa la velocidad de la rotación

Rotación lenta es cambiar cada semana o más. Rotación rápida es cambiar cada 1 a 3 días. Rodrigo, con cambio semanal, está en la rotación lenta.

1. [RS] Bambra CL, Whitehead MM, Sowden AJ, Akers J, Petticrew MP. 2008. American Journal of Preventive Medicine. 26 estudios experimentales y cuasiexperimentales de rediseño de turnos. Tres intervenciones mejoraron la salud y el equilibrio trabajo-vida: pasar de rotación lenta a rápida, pasar de rotación hacia atrás a hacia adelante, y dejar que el trabajador elija sus turnos (self-scheduling). Casi sin costo para la organización. https://pubmed.ncbi.nlm.nih.gov/18407011/
2. [NARRATIVA] Sallinen M, Kecklund G. 2010. Scandinavian Journal of Work, Environment & Health. En los estudios controlados, pasar de turnos lentos hacia atrás a turnos rápidos hacia adelante mejora el estado de alerta y, en parte, el sueño. Sin importar el sistema, los turnos de noche y de madrugada y los retornos rápidos se asocian a dormir menos. https://pubmed.ncbi.nlm.nih.gov/20119631/

Para el producto: la empresa de Rodrigo decide el sentido y la velocidad de la rotación, no el agente. Pero el agente sí puede registrar qué semanas son las peores y entregar ese dato para conversar el calendario.

### 2.5 Quick returns (Retornos rápidos: 11 horas o menos entre dos turnos)

1. [RS] Vedaa Ø, Harris A, Bjorvatn B y otros. 2016. Ergonomics. 22 estudios. Los retornos rápidos dañan lo inmediato: sueño, somnolencia y fatiga. Sobre la salud crónica la evidencia no es concluyente. https://pubmed.ncbi.nlm.nih.gov/26072668/
2. [CONSENSO] Garde AH, Begtrup L, Bjorvatn B y otros. 2020. Scandinavian Journal of Work, Environment & Health. 15 investigadores de turnos recomiendan: 3 noches seguidas como máximo, 11 horas o más entre turnos y turnos nocturnos de 9 horas o menos. https://pubmed.ncbi.nlm.nih.gov/32895725/

Para el producto: una noche en que el agente despierta a Rodrigo a las 3:00 y él entra a las 8:30 funciona como un retorno rápido. La regla de "11 horas protegidas" es el número que el agente puede defender.

### 2.6 Salud a largo plazo

[RS de revisiones] Kecklund G, Axelsson J. 2016. BMJ. Se basa en 38 metaanálisis y 24 revisiones sistemáticas. Asocia el trabajo en turnos con diabetes tipo 2 (RR de 1,09 a 1,40), enfermedad coronaria (RR 1,23), accidente cerebrovascular (RR 1,05) y cáncer (RR de 1,01 a 1,32). Los autores advierten que los estudios originales son mixtos y que las consecuencias se parecen mucho a las del sueño insuficiente. https://pubmed.ncbi.nlm.nih.gov/27803010/

---

## 3. Chronic sleep restriction (Restricción crónica de sueño) y sleep debt (deuda de sueño)

### 3.1 Cuánto hay que dormir

[CONSENSO] Watson NF, Badr MS, Belenky G y otros (panel AASM y SRS). 2015. Sleep y Journal of Clinical Sleep Medicine. Texto leído en PMC, citas textuales:
1. "Adults should sleep 7 or more hours per night on a regular basis to promote optimal health."
2. Dormir menos de 7 horas de forma regular se asocia a "weight gain and obesity, diabetes, hypertension, heart disease and stroke, depression, and increased risk of death."
3. La recomendación vale para adultos de 18 a 60 años. Rodrigo, con 41, está dentro.
https://pubmed.ncbi.nlm.nih.gov/26039963/ y https://pubmed.ncbi.nlm.nih.gov/25979105/

Rodrigo duerme entre 5 y 6 h: le faltan de 1 a 2 horas por noche respecto del mínimo recomendado.

### 3.2 Qué le pasa al cerebro con 6 horas sostenidas

1. [LAB] Van Dongen HP, Maislin G, Mullington JM, Dinges DF. 2003. Sleep. n = 48 adultos sanos de 21 a 38 años, asignados al azar a 4, 6 u 8 h en cama durante 14 días seguidos, más un grupo de 3 noches sin dormir. Restringir a 6 h o menos produjo déficits cognitivos acumulativos "equivalentes a hasta 2 noches de privación total de sueño". La somnolencia que los sujetos reportaban subió al inicio y luego casi no siguió subiendo: no distinguía 6 h de 4 h. Los autores concluyen que los sujetos "no se daban cuenta" de su deterioro. Los lapsos de atención crecieron casi en línea recta con las horas de vigilia acumuladas por sobre 15,84 h al día. https://pubmed.ncbi.nlm.nih.gov/12683469/
   Solo leí el abstract. No pude verificar cuántas personas había en cada grupo ni la equivalencia exacta del grupo de 6 h por separado.
2. [LAB] Belenky G, Wesensten NJ, Thorne DR y otros. 2003. Journal of Sleep Research. n = 66: 3 h (n = 18), 5 h (n = 16), 7 h (n = 16) o 9 h (n = 16) en cama durante 7 días, y después 3 días de recuperación con 8 h. Con 5 y 7 h, la velocidad de reacción bajó y se estabilizó en un nivel más bajo. Después de 3 noches de 8 h no se recuperó. https://pubmed.ncbi.nlm.nih.gov/12603781/

Para el producto: es el dato más fuerte para el pitch. Rodrigo cree que "se acostumbró" a dormir 5 a 6 h, y el laboratorio muestra que eso es justamente lo que se siente cuando el rendimiento sigue cayendo. Por eso el agente tiene que mostrarle números, no preguntarle cómo se siente.

### 3.3 Recuperar no es tan simple

1. [LAB] Banks S, Van Dongen HP, Maislin G, Dinges DF. 2010. Sleep. n = 159 adultos de 22 a 45 años. Tras 5 noches a 4 h, recibieron una sola noche de recuperación de 0 a 10 h. Con 10 h en cama (8,96 h dormidas) la recuperación de la atención, la somnolencia y la fatiga seguía incompleta. https://pubmed.ncbi.nlm.nih.gov/20815182/
2. [LAB] Depner CM, Melanson EL, Eckel RH y otros. 2019. Current Biology. Control (n = 8, 9 h), restricción sin fin de semana (n = 14, 5 h) y restricción con fin de semana libre (n = 14). El fin de semana durmieron solo 1,1 h más que al inicio. Al volver a la restricción, la sensibilidad a la insulina cayó entre 9% y 27%. Conclusión: dormir más el fin de semana no previene el daño metabólico. https://pubmed.ncbi.nlm.nih.gov/30827911/

Para el producto: "el sábado lo recupero" no funciona. Lo que sirve es proteger noches completas de forma regular.

### 3.4 Mortalidad

[RS] Cappuccio FP, D'Elia L, Strazzullo P, Miller MA. 2010. Sleep. 16 estudios prospectivos con 27 cohortes, n = 1.382.999 personas y 112.566 muertes, con seguimiento de 4 a 25 años. Dormir poco se asoció a 12% más riesgo de morir (RR 1,12; IC95% 1,06 a 1,18). Dormir mucho también (RR 1,30). La duración del sueño fue autorreportada. https://pubmed.ncbi.nlm.nih.gov/20469800/

---

## 4. Schedule unpredictability (Imprevisibilidad del horario)

1. [OBS] Schneider D, Harknett K. 2019. American Sociological Review. Shift Project: n = 27.792 trabajadores por hora del retail y la comida rápida de 80 grandes empresas de EE.UU., reclutados por Facebook (muestra no probabilística, ponderada). Texto completo leído en PMC, primera mitad:
   1. 74% reportó calidad de sueño regular o mala.
   2. Trabajar turnos de guardia (on-call), que les cancelen turnos o tener cierre y apertura seguidos se asocia cada uno a unos 10 puntos porcentuales menos de "buen sueño".
   3. Con menos de 1 semana de aviso del horario, unos 5 puntos menos que con 2 semanas o más.
   4. Con pocas exposiciones a horarios inestables, 35% duerme bien. Con 5 o más, 15%.
   5. La inestabilidad del horario pesa mucho más que el salario. El 82% del efecto sobre el sueño pasa por el conflicto trabajo-familia.
   https://pubmed.ncbi.nlm.nih.gov/33311716/
   Es asociación, no causa. Los propios autores lo dicen.

Para el producto: a Rodrigo no solo le duele que lo despierten, también le duele no saber si lo van a despertar. El parte de la mañana con "esta noche no pasó nada urgente" y la previsibilidad de qué cosas sí lo despiertan atacan justo esto. La parte de anticipación nocturna está desarrollada en `investigacion-sueno-guardia.md` (Sprajcer 2018).

## 5. Workplace telepressure (Telepresión) y límites digitales

1. [OBS] Barber LK, Santuzzi AM. 2015. Journal of Occupational Health Psychology. Definen la telepresión como "la preocupación y el impulso de responder rápido a los mensajes de trabajo". Validan una escala. La telepresión predijo peor calidad de sueño, burnout y ausentismo, por encima de las demandas del trabajo. https://pubmed.ncbi.nlm.nih.gov/25365629/
   El abstract no trae el n ni el tamaño del efecto.
2. [OBS] Barber LK, Jenkins JS. 2014. Stress and Health. n = 315 empleados. Usar tecnología de trabajo en la casa empeora la cantidad, calidad y regularidad del sueño porque impide desconectarse mentalmente. El efecto aparece solo en quienes no tienen límites claros para esa tecnología. https://pubmed.ncbi.nlm.nih.gov/24123651/
   EVIDENCIA DÉBIL: transversal y autorreportado.

Para el producto: el agente funciona como un límite digital puesto desde afuera. Rodrigo puede soltar el WhatsApp porque alguien más filtra por él. Esto se conecta con el modo sombra: hasta que confíe, el límite no existe.

---

## 6. Chile

### 6.1 Población general (ENS 2016-2017, MINSAL)

Fuente primaria: planilla oficial de indicadores ("sábana de datos", versión del 16-11-2020), pestaña "Sueño". https://epi.minsal.cl/wp-content/uploads/2020/11/Sabana-de-datos-ENS-2016-2017-oficial-16112020.xlsx

1. Indicador "Problemas de sueño último mes", población de 15 años o más, n muestral = 6.198:
   1. Ninguno: 56,7%.
   2. Poco o moderado: 32,2%.
   3. Mucho o demasiado: 11,1% (n = 598; coeficiente de variación 7%). En hombres, 7,9%. En el grupo de 25 a 44 años, 11,0%.
   El texto exacto de la pregunta no está en la planilla y no lo verifiqué.
2. Uso de medicamentos para dormir una o más veces por semana: 8,1% total, 4,6% en hombres y 11,4% en mujeres (este último corregido por MINSAL el 24-01-2019).
3. Biobío (región de Concepción): 7,6% "mucho o demasiado" (n = 57; coeficiente de variación 19%, bajo el límite de 30% que la propia ENS pone para que la cifra sea confiable), 42,7% "poco o moderado" y 49,7% "ninguno". Ojo: en 2016-2017 la región del Biobío todavía incluía a Ñuble. Con n = 57 la usaría solo como contexto, no como titular.
4. Insomnio diagnosticado por un médico (autorreporte): 5,6% (IC95% 4,6% a 6,8%). Fuente: PDF "2º Resultados ENS", lámina "Autoreporte de enfermedades". https://epi.minsal.cl/wp-content/uploads/2019/01/2º-Resultados-ENS_DEPTO.EPIDEMIOLOGIA.MINSAL.14.01.2019.pdf
5. Duración: Portalier Dublé N y otros (2026, BMC Oral Health) analizan n = 5.009 de la ENS 2016-2017. De ellos, 1.711 reportan dormir menos de 7 h, o sea 34,2%. Ojo: esa cifra está SIN ponderar y la muestra tiene 63% de mujeres. No es una prevalencia nacional. Además, 34,7% dice despertar cansado al menos 3 días a la semana. https://pubmed.ncbi.nlm.nih.gov/42365294/

No verificado: la cifra de "63,2% con algún trastorno del sueño" de la ENS 2009-2010 circula en prensa (CNN Chile, Meganoticias), pero no encontré el informe original. No usarla.

### 6.2 Trabajadores en turnos en Chile

1. [OBS] Jiménez RE. 2015. Informe final SUSESO, "Caracterización de la salud laboral, común y riesgo de accidentes laborales de los trabajadores que cubren turnos urgencia en Chile". Trabajadores de urgencias de la Región Metropolitana: 42,3% (213 de 503; IC95% 38,0% a 46,8%) dice padecer trastornos del sueño que relaciona con su trabajo. 71% trabaja de noche al menos una vez por semana. https://www-cloud.suseso.cl/619/articles-672272_archivo_01.pdf
   EVIDENCIA DÉBIL: personal de salud y no de TI, pregunta autorreportada sin instrumento validado.
2. No encontré una cifra nacional primaria de cuántos trabajadores chilenos hacen turnos rotativos o nocturnos. La ENETS 2009-2010 (MINSAL, Dirección del Trabajo e ISL) existe, pero no logré abrir sus tablas. Una revisión de 2019 de la UdeC cita "39,9% de empresas con tres turnos" sin que yo pudiera ver su fuente. No usarlas.
3. Marco legal: Ley 21.220 (2020), artículo 152 quáter J del Código del Trabajo. Para trabajadores a distancia que distribuyen libremente su horario, o excluidos de la jornada, "El tiempo de desconexión deberá ser de, al menos, doce horas continuas en un periodo de veinticuatro horas". Texto leído en la BCN. https://www.bcn.cl/leychile/navegar?idNorma=1143741
   Solo aplica a ese tipo de contrato. No dice nada de las guardias presenciales ni de las guardias de llamada. Sirve como referencia de que en Chile ya existe la idea de "12 horas protegidas", no como obligación para el caso de Rodrigo.

---

## 7. Qué intervenciones mueven la aguja

Ordenadas de mejor a peor respaldo para el caso de Rodrigo.

1. Bajar las noches interrumpidas. Waage 2021: reducir en más de 10 al año las noches de trabajo y los retornos rápidos se asoció a recuperarse del trastorno. Dejar el trabajo nocturno dio un OR de 10,91 para recuperarse. [OBS, cohorte n = 1.076]
2. Ventana de descanso protegida de 11 horas o más. Garde 2020 [CONSENSO] y Vedaa 2016 [RS, 22 estudios]. El agente puede ser quien cuide esa ventana.
3. Previsibilidad. Schneider y Harknett 2019 [OBS, n = 27.792]: aviso de 2 semanas o más y no tener guardias "por si acaso" se asocian a mejor sueño. Bambra 2008 [RS]: el self-scheduling mejora salud y equilibrio trabajo-vida.
4. Rotación rápida y hacia adelante. Bambra 2008 [RS] y van Amelsvoort 2004 [OBS]. Lo decide la empresa, no el agente.
5. Siesta programada. Evidencia mixta.
   1. [RS] Martin-Gill C, Barger LK, Moore CG y otros. 2018. Prehospital Emergency Care. 13 estudios experimentales. La siesta en el turno bajó la somnolencia al final del turno (diferencia de medias estandarizada 0,40; IC95% 0,09 a 0,72), pero no cambió de forma significativa el tiempo de reacción (0,12; IC95% −0,13 a 0,36). https://pubmed.ncbi.nlm.nih.gov/29324083/
   2. [RS] Ruggiero JS, Redeker NS. 2014. Biological Research for Nursing. 13 estudios, la mayoría chicos. La siesta nocturna bajó la somnolencia, con inercia breve al despertar. Ninguno midió seguridad. https://pubmed.ncbi.nlm.nih.gov/23411360/
   3. [RS] Slanger TE y otros. 2016. Cochrane. 17 ensayos con 556 participantes (luz brillante, siestas, ejercicio, educación). Calidad de evidencia baja a muy baja: "no es posible determinar" si estas intervenciones mejoran la somnolencia o el sueño. https://pubmed.ncbi.nlm.nih.gov/27549931/
   Lectura: la siesta ayuda a la somnolencia del momento, no a la deuda acumulada. En Rodrigo, con guardia desde la casa, encaja más como siesta antes de la guardia que dentro de ella. Wickwire 2017 (texto completo) sugiere 30 a 60 minutos antes del turno. Es una revisión narrativa.
6. Lo que NO sirve como estrategia: recuperar el fin de semana (Depner 2019, Banks 2010) y confiar en cómo se siente uno (Van Dongen 2003).

---

## 8. Palancas de producto (mi lectura, no de los papers)

1. Noches completas sin interrupción como métrica principal. Es lo que mueve la recuperación (Waage 2021) y lo que la restricción crónica le quita a Rodrigo (Van Dongen 2003).
2. Ventana protegida de 11 h después de cada despertar real. Si el agente lo despertó a las 3:00, el parte de la mañana puede recordar "hoy te tocan 11 h libres desde las 3:00" (Garde 2020, Vedaa 2016).
3. Cero incertidumbre sobre qué lo despierta. Reglas visibles y estables bajan la imprevisibilidad (Schneider y Harknett 2019) y la anticipación (Sprajcer 2018, en el otro archivo).
4. Datos, no sensaciones. Un contador semanal de horas de sueño perdidas por guardia, porque Rodrigo no va a sentir su propio deterioro (Van Dongen 2003).
5. Informe para la jefatura: qué semanas y qué rotaciones le costaron más noches. Insumo para pedir rotación hacia adelante o más rápida (Bambra 2008).
6. Modo sombra coherente con la telepresión: hasta que Rodrigo confíe, el límite digital no existe. La transición del modo sombra al modo activo es donde se gana el sueño (Barber y Jenkins 2014, mi inferencia).

## 9. Lo que no pude verificar, en una lista

1. Texto completo de Van Dongen 2003: n por grupo y equivalencia exacta del grupo de 6 h.
2. Texto completo de Drake 2004: los porcentajes de 32% y 26%.
3. Manual ICSD-3 e ICSD-3-TR (2023) de la AASM: los criterios vienen de dos papers que los reproducen. No sé si la revisión de 2023 cambió algo del trastorno por turnos.
4. Cifra de 63,2% de la ENS 2009-2010.
5. Cifra nacional de trabajadores en turnos en Chile (ENETS 2009-2010).
6. Duración de sueño ponderada en la ENS 2016-2017. Solo tengo la cifra sin ponderar de Portalier 2026.
7. No hay estudios de turnos ni de guardia en el perfil exacto de Rodrigo: soporte TI de 41 años, guardia por WhatsApp y 14 meses de restricción. Todo lo de arriba es extrapolación desde enfermeras, personal de urgencias, trabajadores de retail y voluntarios jóvenes de laboratorio.
