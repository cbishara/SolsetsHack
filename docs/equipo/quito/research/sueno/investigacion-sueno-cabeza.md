# Investigación: la cabeza y el teléfono en la noche de Rodrigo

Fecha: 2026-10-23. Carril: activación cognitiva antes de dormir, teléfono y notificaciones, descargar la cabeza, sensación de control y respaldo, instrumentos para medir en la app, postergar la hora de dormir.
Archivo hermano con el detalle de la guardia (Sprajcer, Ziebertz, Bamberg, Hall, inercia del sueño): `investigacion-sueno-guardia.md`. Aquí no repito esos números; los cito solo cuando los leí yo.

## Veredicto

1. La variable con mejor respaldo es la activación cognitiva antes de dormir. Un meta-análisis de 55 estudios la asocia a peor calidad de sueño (r = -0,28). Un estudio prospectivo de 2.892 personas muestra que la intrusión de pensamientos explica el 69% del efecto del estrés sobre el insomnio que aparece en un año.
2. En adultos, el teléfono daña el sueño más por lo que exige que por la luz. Lo que exige: estar disponible, despertar y revisar. El estrés por estar accesible predijo trastornos del sueño a un año (PR 1,5 a 1,7). La evidencia de luz azul en adultos es débil: el panel de consenso de la National Sleep Foundation 2024 no logró acuerdo para adultos, y el Night Shift del iPhone no cambió nada en 167 jóvenes.
3. Descargar la cabeza tiene un experimento de laboratorio sólido: escribir 5 minutos una lista de pendientes acortó en 9 minutos el tiempo para dormirse (Scullin 2018). Pero las versiones online de "postergar la preocupación" no mejoraron el sueño en dos RCT (n = 361 y n = 186).
4. No encontré ningún estudio que pruebe que delegar la vigilancia en un respaldo baje la hipervigilancia nocturna. Lo que sí está probado es la cara opuesta: la sola instrucción de estar atento empeora el sueño aunque nunca suene nada. Además, agrupar notificaciones sube la sensación de control, y apagarlas del todo sube la ansiedad y el miedo a perderse algo.
5. Para medir en la app sirven cinco cosas: el ISI (7 ítems, con versión en español validada), la pregunta única de calidad de sueño de 0 a 10, el diario de sueño de consenso, la subescala cognitiva del PSAS (8 ítems) y la escala de postergación de la hora de dormir (9 ítems).
6. Postergar la hora de dormir tiene respaldo correlacional moderado, en un meta-análisis con calidad GRADE baja. Los ensayos que limitan el teléfono son chicos y dan efectos pequeños. Por ejemplo, 3 semanas con 2 horas diarias de teléfono como máximo bajaron el ISI en 2,6 puntos. "Revenge bedtime procrastination" casi no tiene literatura revisada por pares.

## Cómo se verificó y qué no pude leer

Los abstracts los saqué de la API REST de Europe PMC, que usa la misma fuente MEDLINE que PubMed. El texto completo lo leí por Europe PMC fullTextXML, NCBI BioC o PMC a través de r.jina.ai, cuando el artículo era de acceso abierto. Para los papers que no están en PubMed usé Semantic Scholar y OpenAlex.

No pude leer, y lo digo con esas palabras:
1. Nicassio et al. 1985, el paper original del PSAS. PubMed no tiene abstract y el texto es de pago. Lo describo solo a partir de estudios posteriores que lo citan.
2. Carney y Waters 2006 y Wuyts et al. 2012 (Biological Psychology): leí solo el abstract, que no trae magnitudes.
3. Fitz et al. 2019, Graham et al. 2021, Dekker et al. 2024 y Hughes y Burke 2018: leí solo el abstract.
4. Lanaj, Johnson y Barnes 2014 (uso del teléfono de noche y agotamiento al día siguiente): no encontré ni el abstract. No lo uso.
5. El origen del término "revenge bedtime procrastination" en redes sociales chinas: no encontré fuente académica que lo documente. No lo afirmo.

Tipos de estudio: LAB = experimento de laboratorio. RCT = ensayo aleatorizado. OBS-T = observacional transversal (una sola medición). OBS-P = observacional prospectivo (sigue a las personas en el tiempo). DIARIO = medición diaria repetida. RS/MA = revisión sistemática o meta-análisis. CONS = consenso de expertos.

## 1. Activación cognitiva antes de dormir y preocupación

Nombre en inglés: cognitive pre-sleep arousal. Relacionadas: worry (preocupación por lo que viene), rumination (darle vueltas a lo que pasó) y perseverative cognition (el paraguas que junta ambas).
Qué es: la cabeza sigue funcionando al acostarse. Aparecen pensamientos que no se pueden parar, se repasa el día y se anticipa el siguiente. Es distinta de la activación somática, que es la del cuerpo: corazón acelerado y tensión.

### 1.1 El modelo que lo ordena
Harvey AG. A cognitive model of insomnia. Behaviour Research and Therapy 2002;40(8):869-893. Tipo: modelo teórico con revisión.
Lo que dice el abstract: la preocupación excesiva dispara activación del cuerpo y malestar. Esa ansiedad activa la "atención selectiva y el monitoreo de señales de amenaza internas y externas". Las "conductas de seguridad" contraproducentes, como controlar los pensamientos, alimentan el ciclo.
Link: https://pubmed.ncbi.nlm.nih.gov/12186352/
Por qué importa: el monitoreo de amenazas es exactamente lo que hace Rodrigo con el teléfono de guardia.

### 1.2 La escala: Pre-Sleep Arousal Scale (PSAS)
Nicassio PM, Mendlowitz DR, Fussell JJ, Petras L. The phenomenology of the pre-sleep state: the development of the pre-sleep arousal scale. Behaviour Research and Therapy 1985;23(3):263-271.
Link: https://pubmed.ncbi.nlm.nih.gov/4004706/
No leí el original. Según Türkarslan, Canel Çınarbaş y Nicassio 2024 (Sleep Biol Rhythms, PMC10899935, con Nicassio como coautor), la escala tiene 16 ítems, 8 cognitivos y 8 somáticos. Cada ítem se responde de 1 ("nada") a 5 ("extremadamente"). El rango de 8 a 40 por subescala es cálculo mío.
Psicometría en población general: Jansson-Fröjmark M, Norell-Clarke A. J Psychosom Res 2012;72(2):103-110. n = 1.890 adultos suecos. La estructura original no ajustó bien. La subescala cognitiva tuvo α = 0,88. Los autores piden reconceptualizarla. https://pubmed.ncbi.nlm.nih.gov/22281450/
Puntos de corte: Puzino K et al. Behav Sleep Med 2020;18(6):705-718. n = 248 pacientes con insomnio crónico. El mejor corte de la subescala cognitiva para detectar reactividad del sueño fue 24,5 (AUC 0,82), pero los autores proponen 20 como corte clínico práctico. El corte somático es 14 (AUC 0,87 para ansiedad clínica). https://pubmed.ncbi.nlm.nih.gov/31545084/
En español: busqué en Europe PMC y no encontré una validación del PSAS en español. Sí hay versiones portuguesa, turca, coreana, árabe y francesa.

### 1.3 Datos, del más fuerte al más débil
1. Clancy F, Prestwich A, Caperon L, Tsipa A, O'Connor DB. Health Psychology Review 2020;14(4):427-448. RS/MA de 55 estudios en población no clínica. Preocupación y rumiación contra calidad de sueño: r = -0,28. Contra sueño total: r = -0,15. Contra latencia de sueño (lo que se demora en dormirse): r = -0,16. Separadas, la rumiación da r = -0,33 con la calidad y la preocupación r = -0,23. El efecto es más fuerte con autorreporte que con actigrafía. https://pubmed.ncbi.nlm.nih.gov/31910749/
   Fuerza: buena por ser meta-análisis, pero los efectos son chicos a medianos y casi todos correlacionales.
2. Pillai V, Roth T, Mullins HM, Drake CL. Sleep 2014;37(7):1199-1208. OBS-P. n = 2.892 buenos durmientes sin historia de insomnio, seguidos 1 año. El 9,1% desarrolló insomnio. Cada estresor adicional subió el riesgo: OR 1,19 (IC 95% 1,13 a 1,26). La intrusión cognitiva, medida con la subescala de 8 ítems del Impact of Events Scale, explicó el 69% del efecto total del estrés sobre el insomnio (IC del efecto indirecto 0,08 a 0,12). https://pubmed.ncbi.nlm.nih.gov/25061248/ (texto completo PMC4098805)
   Fuerza: el mejor dato del carril para afirmar que la cabeza precede al insomnio, porque es prospectivo y grande.
3. Kalmbach DA, Buysse DJ, Cheng P, Roth T, Yang A, Drake CL. Sleep Medicine 2020;71:151-160. LAB con polisomnografía en 2 noches y test de latencias múltiples. n = 52 (18 con insomnio, 34 sanos). La activación cognitiva nocturna alta se asoció a más latencia, menos eficiencia y menos sueño total medidos objetivamente, en ambas noches. El diagnóstico de insomnio y la activación somática no se asociaron. https://pubmed.ncbi.nlm.nih.gov/32247571/
4. Åkerstedt T, Kecklund G, Axelsson J. Biological Psychology 2007;76(3):170-173. Polisomnografía en casa. n = 33, de los cuales se analizaron 16. En las noches con más estrés o preocupación al acostarse, la eficiencia bajó a 81,0% (contra 85,2%), la vigilia subió a 22,6% (contra 15,6%) y la llegada al sueño profundo tardó 33,9 min (contra 18,3). https://pubmed.ncbi.nlm.nih.gov/17884278/
   Fuerza: muestra chica.
5. Åkerstedt T et al. Sleep Medicine 2012;13(6):674-679. DIARIO de 42 días. n = 50. El estrés y las preocupaciones al acostarse fueron los principales predictores de la calidad de sueño de esa noche. El abstract no trae coeficientes. https://pubmed.ncbi.nlm.nih.gov/22621983/
6. Kecklund G, Åkerstedt T. Biological Psychology 2004;66(2):169-176. n = 37, edad promedio 37 años. La aprensión por el día laboral siguiente se asoció a menos sueño de ondas lentas, más ansiedad al acostarse y peor sueño percibido. https://pubmed.ncbi.nlm.nih.gov/15041138/
7. Harvey AG. Br J Clin Psychol 2000;39(3):275-286. Entrevista a 30 insomnes y 30 buenos durmientes. Los insomnes pensaban más en preocupaciones, problemas y ruidos del entorno, y menos en "nada en particular". https://pubmed.ncbi.nlm.nih.gov/11033749/
8. Wuyts J et al. Int J Psychophysiol 2012;83(1):8-15. LAB. n = 15. Media hora de tareas cognitivas antes de acostarse alargó la latencia objetiva. Leí solo el abstract. https://pubmed.ncbi.nlm.nih.gov/21963535/

### 1.4 Lectura para Rodrigo
Su guardia le pone a la cabeza un tema abierto todas las noches: "puede pasar algo". Eso es intrusión cognitiva por diseño. La palanca no es "relájate". Es cerrar el tema antes de dormir: dejar escrito qué queda pendiente y quién lo cubre.

## 2. El teléfono de noche y las notificaciones

Hay que separar tres mecanismos porque la evidencia es muy distinta para cada uno:
1. La luz de la pantalla (melatonina, reloj biológico).
2. El contenido y el enganche (activación cognitiva).
3. Los despertares y la disponibilidad: el teléfono que suena, vibra o que uno revisa por si acaso.
A Rodrigo le pesa el tercero.

### 2.1 Evidencia buena o razonable
1. Thomée S, Härenstam A, Hagberg M. BMC Public Health 2011;11:66. OBS-P a 1 año. n = 4.156 suecos de 20 a 24 años. Entre 45% y 46% reportó que el celular lo despertaba "solo ocasionalmente".
   Prospectivamente, el estrés por estar accesible predijo trastornos del sueño: PR 1,7 (IC 1,06 a 2,71) en hombres y 1,5 (1,10 a 2,14) en mujeres. Que el celular lo despertara de noche dio PR 1,4 (0,90 a 2,31) y 1,2 (0,87 a 1,68), sin significancia. https://pubmed.ncbi.nlm.nih.gov/21281471/ (texto completo PMC3042390)
   Lectura: lo que predijo peor sueño a un año fue la presión de estar disponible, más que los despertares mismos.
2. Rod NH, Dissing AS, Clark A, Gerds TA, Lund R. PLoS One 2018;13(10):e0204811. Observacional con registro objetivo del teléfono: más de 250.000 acciones durante 4 semanas. n = 815 adultos jóvenes daneses. El 12% tuvo actividad en mitad de la noche (3 a 5 h después de acostarse). El 41% interrumpió el sueño con el teléfono al menos un día de semana. Los que lo hacían seguido dormían 48 min menos según su propio reporte. No hubo diferencias en síntomas de salud mental. https://pubmed.ncbi.nlm.nih.gov/30325929/
3. Gradisar M et al. J Clin Sleep Med 2013;9(12):1291-1299. Encuesta Sleep in America 2011. n = 1.508 personas de 13 a 64 años. El 10% contó que el celular lo despertaba al menos algunas noches por semana; en adolescentes fue 18% y en jóvenes de 19 a 29 años, 20%.
   Los dispositivos interactivos usados en la hora previa a dormir se asociaron a más dificultad para dormirse (β = 9,4) y a sueño no reparador. Para el sueño no reparador el paper da β = 6,1 en los resultados y 6,4 en el abstract. https://pubmed.ncbi.nlm.nih.gov/24340291/ (OBS-T)
4. Exelmans L, Van den Bulck J. Soc Sci Med 2016;148:93-101. OBS-T. n = 844 adultos flamencos de 18 a 94 años. 6 de cada 10 llevan el celular a la pieza. Recibir o mandar mensajes y llamadas después de apagar la luz predijo peor PSQI: más latencia, menos eficiencia, más interrupciones y peor funcionamiento al día siguiente. https://pubmed.ncbi.nlm.nih.gov/26688552/
5. Brautsch LA et al. Sleep Med Rev 2023;68:101742. RS de 42 estudios observacionales de calidad moderada o alta, en personas de 16 a 25 años. El uso de medios digitales se asoció a menos horas de sueño y peor calidad. El uso nocturno del celular se asoció a acostarse tarde y a cansancio diurno. No permite hablar de causalidad. https://pubmed.ncbi.nlm.nih.gov/36638702/
6. Tang NK, Schmidt DA, Harvey AG. J Behav Ther Exp Psychiatry 2007;38(1):40-55. Dos experimentos con actigrafía.
   En el experimento 1 participaron 30 buenos y 30 malos durmientes. A los que se les pidió mirar el reloj mientras trataban de dormir se preocuparon más y se demoraron más en dormirse.
   En el experimento 2 participaron 38 personas con insomnio primario. Mirar un reloj, comparado con mirar una pantalla de dígitos sin hora, provocó más preocupación, más latencia y más sobrestimación del tiempo que tardaron en dormirse. https://pubmed.ncbi.nlm.nih.gov/16793001/
   Analogía mía, no del paper: revisar el teléfono "para ver si pasó algo" se parece a mirar el reloj. Es monitoreo que alimenta la preocupación.

### 2.2 Evidencia débil o que no se sostiene en adultos
1. Luz azul, lo más citado y lo menos aplicable. Chang AM et al. PNAS 2015;112(4):1232-1237. LAB. n = 12. Leyeron 4 h en un iPad al brillo máximo durante 5 noches seguidas, comparado con un libro impreso.
   La latencia fue 25,65 contra 15,75 min, casi 10 min más. La melatonina bajó 55%. El reloj circadiano se atrasó más de 1,5 h. https://pubmed.ncbi.nlm.nih.gov/25535358/
   El efecto es real, pero la dosis es extrema y la muestra mínima.
2. Duraccio KM et al. Sleep Health 2021;7(4):478-484. RCT. n = 167 personas de 18 a 24 años, durante 7 noches, con actigrafía. Se comparó iPhone con Night Shift, iPhone sin Night Shift y sin teléfono. En la muestra total no hubo diferencias. https://pubmed.ncbi.nlm.nih.gov/33867308/
3. Combertaldi SL et al. Sleep Medicine 2021;87:191-202. LAB. n = 32. Treinta minutos de redes sociales antes de dormir, con la luz azul controlada, no subieron la activación ni empeoraron el sueño objetivo ni el subjetivo; solo hubo menos etapa N2. La relajación muscular progresiva, en cambio, acortó la latencia y mejoró la eficiencia. https://pubmed.ncbi.nlm.nih.gov/34627122/
4. Hartstein LE et al. Sleep Health 2024;10(4):373-384. CONS de la National Sleep Foundation: 16 expertos con método Delphi, que revisaron 35 estudios experimentales. Hubo consenso en que las pantallas dañan el sueño en niños y adolescentes. En adultos no hubo consenso ni para el uso general, ni para el contenido, ni para la luz. Sí hubo consenso en que las estrategias conductuales pueden reducir el daño. Las notificaciones aparecen solo como mecanismo hipotético en la introducción. https://pubmed.ncbi.nlm.nih.gov/38806392/
5. Bourke M et al. JAMA Pediatrics 2026;180(5):500-509. MA de 25 estudios (n = 4.562, de 3 a 25 años) que miden el efecto día a día dentro de la misma persona. Más pantalla en un día se asoció a acostarse algo más tarde (r = 0,079). No se asoció al sueño total, la latencia, la eficiencia, la vigilia nocturna ni la calidad. La pantalla usada después de acostarse sí se asoció más a peor calidad (r = -0,092) que la de durante el día. https://pubmed.ncbi.nlm.nih.gov/41770550/

### 2.3 Lectura para Rodrigo
El argumento de "la pantalla azul" no sirve para el pitch: el jurado puede saber que es débil en adultos. El argumento fuerte es otro: estar disponible y revisar por si acaso. Eso es lo que el agente puede tocar.

## 3. Descargar la cabeza antes de dormir

1. Scullin MK, Krueger ML, Ballard HK, Pruett N, Bliwise DL. J Exp Psychol Gen 2018;147(1):139-146. LAB con polisomnografía, una sola noche. n = 57 sanos de 18 a 30 años. Escribieron 5 minutos con papel y lápiz, unos una lista de pendientes para los próximos días y otros una lista de lo ya hecho.
   Latencia: 15,82 min con la lista de pendientes contra 25,09 min con la de lo hecho (d = 0,63, p = 0,02). Mientras más ítems tenía la lista de pendientes, más rápido se dormían (r = -0,39). https://pubmed.ncbi.nlm.nih.gov/29058942/ (texto completo PMC5758411)
   Limitación mía: no hubo un grupo que no escribiera. No se puede saber si la lista de pendientes ayuda o si la lista de lo hecho perjudica. Fueron sanos y una noche.
2. Carney CE, Waters WF. Behav Sleep Med 2006;4(1):13-28. n = 33 universitarios con insomnio. Durante 5 noches, el grupo "constructive worry" escribía sus preocupaciones con una posible solución o próximo paso. Bajó su activación cognitiva antes de dormir, comparado con su línea base y con el grupo que solo escribía las preocupaciones. https://pubmed.ncbi.nlm.nih.gov/16390282/
   Leí solo el abstract: no tengo los tamaños del efecto.
3. Jansson-Fröjmark M, Lind M, Sunnhed R. Br J Clin Psychol 2012;51(2):142-157. RCT de factibilidad. n = 22 con insomnio primario. Sumar constructive worry a la terapia conductual bajó más el ISI (d controlado 1,10 a 1,68) y la preocupación (0,76 a 1,64). Respondieron 80% a 100% contra 18% a 27%. Nadie remitió y no hubo diferencias en el sueño total. https://pubmed.ncbi.nlm.nih.gov/22574800/
   Evidencia débil: n = 22.
4. McGowan SK, Behar E. Behav Modif 2013;37(1):90-112. RCT. n = 53 personas con mucha preocupación. Durante 2 semanas tuvieron un "tiempo para preocuparse" de 30 min al día, en hora y lugar fijos, comparado con otra instrucción. Mejoró la preocupación, la ansiedad y el insomnio. https://pubmed.ncbi.nlm.nih.gov/22977265/
5. Versluis A, Verkuil B, Brosschot JF. Br J Health Psychol 2016;21(2):318-335. RCT online. Se inscribieron 996 y completaron 361. Postergar la preocupación a 30 min al comienzo de la noche, durante 6 días, no se diferenció de solo registrarla. Los autores dicen que la versión en papel sí funcionaba y que pasarla tal cual a internet no. https://pubmed.ncbi.nlm.nih.gov/26511764/
6. McCarrick D, Prestwich A, Ferguson E, O'Connor DB. Psychology & Health 2025. RCT online de 4 brazos, durante 14 días. n = 186. Postergar la preocupación con un plan "si pasa esto, hago esto otro" redujo cerca de 15 min diarios de preocupación frente a postergar solo. Pero ningún brazo mejoró la latencia, los despertares ni la calidad del sueño frente a los controles. https://pubmed.ncbi.nlm.nih.gov/41347618/
7. Wood AM et al. J Psychosom Res 2009;66(1):43-48. OBS-T. n = 401. La gratitud se asoció a mejor sueño, y la relación pasó por pensamientos más positivos y menos negativos antes de dormir. https://pubmed.ncbi.nlm.nih.gov/19073292/
   Es correlacional.
8. Relajación muscular progresiva: ver Combertaldi 2021 en la sección 2.2. Acortó la latencia y mejoró la eficiencia en laboratorio (n = 32).

### 3.1 Lectura para Rodrigo
El mejor dato es una lista de pendientes específica, escrita en papel, en 5 minutos (laboratorio, una noche). El "constructive worry" calza perfecto con la guardia: anotar el problema y el próximo paso, por ejemplo "si el servidor X cae, el agente me despierta". Pero ojo: dos RCT online de postergar la preocupación no movieron el sueño. El formato importa.

## 4. Sensación de control y confianza en un respaldo

Respuesta corta a la pregunta: no encontré ningún estudio que pruebe que saber que "algo vigila por ti" baja la hipervigilancia nocturna. Lo que hay son tres cosas: evidencia de la cara opuesta (estar atento cuesta aunque no pase nada), evidencia de control percibido, y evidencia de cómo agrupar notificaciones. La conexión con el agente es inferencia mía.

### 4.1 Estar atento cuesta, aunque no pase nada
1. Wuyts J et al. Biol Psychol 2012;91(3):383-388. LAB. n = 16 durmientes sanos. Se les pidió reaccionar a un sonido que nunca se presentó. El resultado: más latencia objetiva, más vigilia durante la noche, menos eficiencia, más actividad beta (cerebro más despierto) en el sueño profundo y peor calidad percibida. https://pubmed.ncbi.nlm.nih.gov/23000568/
   Leí solo el abstract, sin números.
2. Combertaldi SL, Wick AZ, Rasch B. Clocks & Sleep 2022;4(4):561-576. LAB, piloto. n = 26. Con la instrucción "estás de guardia, reacciona a los sonidos", la eficiencia del sueño bajó a 89,84% contra 92,50% en la noche neutral (F = 5,42, p = 0,029, η² = 0,18). Pasó igual sonaran o no los sonidos. Hubo una tendencia a menos sueño profundo. Replica a Wuyts. https://pubmed.ncbi.nlm.nih.gov/36278537/ (texto completo PMC9589975)
3. Torsvall L, Åkerstedt T. Sleep 1988;11(1):35-38. n = 5 ingenieros de barco. En las noches de guardia durmieron menos, con menos sueño profundo y REM y con el pulso más alto. Muchos efectos aparecieron antes de cualquier alarma. https://pubmed.ncbi.nlm.nih.gov/3363267/
   Débil por n = 5, pero es el clásico.
4. Bamberg E, Dettmers J, Funck H, Krähe B, Vahle-Hinz T. Appl Psychol Health Well Being 2012;4(3):299-320. DIARIO. n = 31 empleados de una organización de servicios de TI, el perfil más parecido a Rodrigo. En los días de guardia hubo más irritación y peor ánimo, y menos actividades sociales. No hubo diferencia entre quienes fueron llamados y quienes no. El cortisol no cambió. https://pubmed.ncbi.nlm.nih.gov/23081765/
5. Dettmers J, Vahle-Hinz T, Bamberg E, Friedrich N, Keller M. J Occup Health Psychol 2016;21(1):105-118. DIARIO. n = 132 personas de 13 organizaciones; 51 dieron muestras de cortisol. En los días con disponibilidad exigida empeoró el ánimo al despertar y cambió la respuesta de cortisol al despertar. Lo que explicó el peor ánimo fue la pérdida de control sobre las actividades fuera del trabajo. https://pubmed.ncbi.nlm.nih.gov/26236956/
6. Ziebertz CM et al. J Sleep Res 2017;26(6):809-815. Experimento de campo. n = 96 estudiantes, con una noche simulada de guardia sin llamada. El sueño subjetivo empeoró (latencia, despertares, vigilia, calidad, recuperación), pero la actigrafía no mostró diferencias. El efecto fue mayor en quienes vivían la guardia como estresante. https://pubmed.ncbi.nlm.nih.gov/28349565/
7. Tamaki M, Bang JW, Watanabe T, Sasaki Y. Current Biology 2016;26(9):1190-1194. LAB con neuroimagen y polisomnografía. En la primera noche en un lugar nuevo, un hemisferio duerme menos profundo y "vigila": detecta estímulos raros y despierta más rápido. Eso desaparece en las noches siguientes. El abstract no da el n. https://pubmed.ncbi.nlm.nih.gov/27112296/
   Sirve como mecanismo: el cerebro vigila cuando no siente el entorno como seguro.

### 4.2 Control percibido y respaldo
1. Adachi M et al. J Hosp Med 2013;8(4):184-190. OBS-P. n = 118 hospitalizados de 50 años o más. Los que tenían control percibido sobre su sueño (escala Sleep Self-Efficacy) sobre la mediana durmieron 55 min más por actigrafía (IC 14 a 97). Controlando el ruido medido, fueron 50 min más. Además tuvieron 51% menos quejas por ruido (OR 0,49). https://pubmed.ncbi.nlm.nih.gov/23504939/
   Es observacional y en otra población.
2. Fitz N, Kushlev K, Jagannathan R, Lewis T, Paliwal D, Ariely D. Computers in Human Behavior 2019. RCT de campo. n = 237. Se compararon notificaciones normales, agrupadas 3 veces al día y ninguna.
   El grupo con notificaciones agrupadas se sintió más atento, productivo, de mejor ánimo y con más control sobre su teléfono, y tuvo menos estrés. El grupo sin notificaciones sacó pocos beneficios y tuvo más ansiedad y más miedo a perderse algo (FoMO). https://doi.org/10.1016/j.chb.2019.07.016
   Leí solo el abstract, por Semantic Scholar. Fue de día y no midió sueño.
3. Dekker CA, Baumgartner SE, Sumter SR, Ohme J. Media Psychology 2024. RCT preregistrado. n = 205. Una semana sin notificaciones no cambió el uso del teléfono, el control percibido ni la vigilancia del teléfono, y subió el miedo a perderse algo. https://doi.org/10.1080/15213269.2024.2334025
   Leí solo el abstract, por OpenAlex.
4. Barber LK, Santuzzi AM. J Occup Health Psychol 2015;20(2):172-189. Crearon la escala de workplace telepressure: la urgencia de responder rápido los mensajes del trabajo. Esa urgencia predijo peor calidad de sueño, burnout y ausentismo más allá de otras demandas laborales. https://pubmed.ncbi.nlm.nih.gov/25365629/
5. Barber LK, Jenkins JS. Stress Health 2014;30(3):259-264. n = 315 empleados. Usar en casa la tecnología del trabajo empeoró el sueño a través de la falta de desconexión, pero solo en quienes no ponían límites a ese uso. https://pubmed.ncbi.nlm.nih.gov/24123651/
6. Wendsche J, Lohmann-Haislah A. Front Psychol 2017;7:2072. MA de 91 muestras (N = 38.124). La desconexión psicológica del trabajo y el sueño se asocian con r = 0,30 (18 muestras, N = 12.028). En estudios de diario la asociación baja a r = 0,17. https://pubmed.ncbi.nlm.nih.gov/28133454/ (texto completo PMC5233687)
7. Karabinski T et al. J Occup Health Psychol 2021;26(3):224-242. MA de 30 estudios (N = 3.725). Las intervenciones para desconectarse del trabajo mejoraron la desconexión con d = 0,36. https://pubmed.ncbi.nlm.nih.gov/34096763/

### 4.3 Lectura para Rodrigo
La evidencia tiene dos caras y las dos le sirven al producto:
1. Apagar todo no da calma: sube el miedo a perderse algo (Fitz 2019, Dekker 2024). Agrupar sí da control (Fitz 2019). El parte de la mañana es exactamente eso: notificaciones agrupadas con una garantía.
2. El agente no elimina la guardia. Mientras el reloj pueda vibrar, Rodrigo sigue con la instrucción "estás de guardia", que por sí sola cuesta unos 2,7 puntos de eficiencia en laboratorio (Combertaldi 2022). Lo que el agente puede cambiar es el contenido de esa instrucción: pasar de "atiende todo y revisa por si acaso" a "atiende solo la vibración". Es una hipótesis mía, no un resultado. El archivo hermano trae el dato de Sprajcer 2018: con una alarma imposible de no escuchar, el sueño no cayó. Es lo más parecido que encontré.

## 5. Instrumentos cortos para medir en la app

1. Insomnia Severity Index (ISI), 7 ítems. Morin CM, Belleville G, Bélanger L, Ivers H. Sleep 2011;34(5):601-608. n = 959 de la comunidad, 183 pacientes y 62 controles. α entre 0,90 y 0,91. El corte de 10 detecta insomnio en la comunidad (sensibilidad 86,1%, especificidad 87,7%). Una baja de 8,4 puntos corresponde a mejora moderada según un evaluador independiente. https://pubmed.ncbi.nlm.nih.gov/21532953/
   Versión en español: Fernandez-Mendoza J et al. Sleep Medicine 2012 (doi 10.1016/j.sleep.2011.06.019). n = 500 adultos, α = 0,82, tres factores. https://pubmed.ncbi.nlm.nih.gov/22172961/
   No encontré una validación chilena específica (búsqueda rápida en Europe PMC).
2. Sleep Quality Scale (SQS), una sola pregunta. Snyder E, Cai B, DeMuro C, Morrison MF, Ball W. J Clin Sleep Med 2018;14(11):1849-1857. Evalúa la calidad global del sueño de los últimos 7 días con un número entero de 0 a 10. Las anclas son: 0 terrible, 1 a 3 mala, 4 a 6 regular, 7 a 9 buena, 10 excelente.
   Se validó en 70 pacientes con insomnio y 651 con depresión. Test-retest de 0,62 a 0,74. Correlación de -0,76 con el cuestionario matinal de insomnio. https://pubmed.ncbi.nlm.nih.gov/30373688/
   La redacción exacta está en una figura que no pude leer. Si la app la pregunta cada mañana sobre la noche anterior, ya no es el instrumento validado: es una adaptación.
3. Consensus Sleep Diary. Carney CE et al. Sleep 2012;35(2):287-302. Es el diario estándar acordado por expertos, con una versión núcleo y otra ampliada. Las instrucciones están a nivel de sexto básico y el diario a nivel de tercero. Los propios autores lo llaman "documento vivo que todavía necesita ser probado y validado". https://pubmed.ncbi.nlm.nih.gov/22294820/
   Hay psicometría posterior (Maich, Lachowski, Carney 2018, Behav Sleep Med) que no leí.
4. PSAS cognitiva, 8 ítems: ver la sección 1.2. Tiene cortes publicados (20 o 24,5), pero no está validada en español.
5. Sleep Condition Indicator (SCI) y su versión de 2 ítems, SCI-02. Espie CA et al. BMJ Open 2014;4(3):e004183. n = 30.941. La versión de 8 ítems tiene α de 0,86 o más. La de 2 ítems pregunta cuántas noches por semana hay problema de sueño y cuánto molesta, y correlaciona r = 0,90 con la escala completa. https://pubmed.ncbi.nlm.nih.gov/24643168/
6. Bedtime Procrastination Scale, 9 ítems, de 1 (nunca) a 5 (siempre), α = 0,92. Un ítem de ejemplo: "Me acuesto más tarde de lo que tenía planeado". Ver la sección 6.

Propuesta mía de batería mínima para la demo, sin sobrecargar a Rodrigo:
1. Cada mañana, una pregunta de 0 a 10 sobre cómo durmió (adaptación de la SQS) y otra sobre cuántas veces revisó el teléfono (ítem propio, no validado).
2. Cada semana, el ISI y la PSAS cognitiva.
3. Opcional, los ítems núcleo del diario de consenso: hora de acostarse, latencia, despertares y hora de levantarse.

## 6. Postergar la hora de dormir por el teléfono o las redes

Nombre en inglés: bedtime procrastination. Su variante popular es "revenge bedtime procrastination".
Qué es: no acostarse a la hora que uno mismo se propuso, sin que nada externo lo impida (definición de Kroese 2014).

### 6.1 Evidencia
1. Kroese FM, De Ridder DT, Evers C, Adriaanse MA. Frontiers in Psychology 2014;5:611. OBS-T. n = 177, edad promedio 37,9 años. Crearon la Bedtime Procrastination Scale (9 ítems, α = 0,92).
   La postergación se asoció al sueño insuficiente con r = 0,61 (β final 0,56; ΔR² 0,23), a las horas de sueño con r = -0,49 y a la fatiga diurna con r = 0,46. Los participantes reportaron una postergación moderada (promedio 2,8 de 5). https://pubmed.ncbi.nlm.nih.gov/24994989/ (texto completo PMC4062817)
2. Kroese FM et al. J Health Psychol 2016;21(5):853-862. Muestra representativa holandesa de 2.431 personas. Una gran proporción se acuesta más tarde de lo que quiere. La postergación explica la relación entre baja autorregulación y sueño insuficiente. https://pubmed.ncbi.nlm.nih.gov/24997168/
3. Hill VM, Rebar AL, Ferguson SA, Shriane AE, Vincent GE. Sleep Med Rev 2022;66:101697. RS/MA de 43 estudios, con calidad GRADE baja. La postergación se asoció a menos horas de sueño (-0,31), peor calidad (-0,35) y más fatiga (+0,32). También a menos autocontrol (-0,39) y a ser vespertino (+0,43). Faltan estudios causales. https://pubmed.ncbi.nlm.nih.gov/36375334/
4. Exelmans L, Van den Bulck J. J Clin Sleep Med 2017;13(8):1001-1008. OBS-T. n = 423 de 18 a 25 años. Ver series en maratón, y no la TV normal, se asoció a peor calidad de sueño, fatiga e insomnio. Esa relación pasaba por completo por la activación cognitiva antes de dormir, medida con el PSAS. https://pubmed.ncbi.nlm.nih.gov/28728618/
   Este estudio une la variable 6 con la variable 1.
5. Revenge bedtime procrastination. En MEDLINE solo un artículo tiene el término en el título: Barrow et al. Military Medicine 2026;191(5-6):e1161-e1167. OBS-T con 393 militares. A más sobrecarga de roles, más postergación, y ambas predijeron peor funcionamiento. Usaron la escala general, no una específica de "revenge". https://pubmed.ncbi.nlm.nih.gov/41206086/
   En Europe PMC hay 8 registros que mencionan el término. No encontré una escala validada específica para la variante "revenge".
   Lo más cercano es la Reasons for Bedtime Procrastination Scale: Oliveira A et al. Psicothema 2024 (doi 10.70478/psicothema.2025.37.10), con 653 adultos portugueses. Tiene dos factores: postergación deliberada o sin darse cuenta (α 0,85) y demora estratégica (α 0,72). https://pubmed.ncbi.nlm.nih.gov/39840778/
   Evidencia débil: es una etiqueta popular con casi nada de datos propios.

### 6.2 Limitar apps o redes de noche: mejora el sueño? Tamaños de efecto
1. Pieh C et al. BMC Medicine 2025;23:107. RCT. n = 111 universitarios sanos que usaban el teléfono 276 min al día en promedio. Limitaron la pantalla del teléfono a 2 h diarias o menos durante 3 semanas. El ISI mejoró 2,59 puntos frente al control (IC 0,66 a 4,51), con un efecto pequeño (η² = 0,048). Apenas terminó la intervención, el uso volvió a subir. https://pubmed.ncbi.nlm.nih.gov/39985031/
   Contraste: 2,6 puntos de ISI está muy por debajo de los 8,4 que Morin 2011 asocia a una mejora moderada.
2. He JW, Tu ZH, Xiao L, Su T, Tang YX. PLoS One 2020;15(2):e0228756. RCT piloto. n = 38 universitarios, probablemente en China, con mal sueño y más de 30 min de teléfono en la cama. Durante 4 semanas dejaron el teléfono 30 min antes de dormir. Resultados, intervención contra control:
   La latencia pasó de 30,98 a 18,38 min, contra 29,32 a 26,54.
   La PSAS cognitiva pasó de 23,32 a 16,37, contra 24,21 a 22,05.
   El PSQI pasó de 10,05 a 5,63, contra 9,63 a 8,58.
   https://pubmed.ncbi.nlm.nih.gov/32040492/ (texto completo PMC7010281)
   Evidencia débil: todo es autorreporte, no calcularon el tamaño de muestra y los participantes ya creían que el teléfono les dañaba el sueño.
3. Hill VM et al. Sleep Medicine 2025;129:306-315. RCT piloto. n = 55 personas recién insertas en el trabajo, con el programa online REST-O. Todos los grupos, incluido el control activo, redujeron 23,4 min de pantalla antes de dormir y sumaron 12,7 min de sueño. El abstract no muestra ventaja del brazo activo. https://pubmed.ncbi.nlm.nih.gov/40081281/
4. Graham S et al. Cyberpsychol Behav Soc Netw 2021;24(6):421-425. n = 132. Limitar Facebook, Instagram y Snapchat durante una semana dio una mejora pequeña en bienestar, en parte a través de la calidad del sueño. https://pubmed.ncbi.nlm.nih.gov/33395534/
   Leí solo el abstract, que no trae tamaños.
5. Grüning DJ, Riedel F, Lorenz-Spreen P. PNAS 2023;120(8):e2213114120. Estudio de campo. n = 280 durante 6 semanas con la app "one sec", que pone fricción antes de abrir las apps elegidas. Las aperturas bajaron 57%. No midió sueño. https://pubmed.ncbi.nlm.nih.gov/36795756/
6. Zimmermann L, Sobolev M. Cyberpsychol Behav Soc Netw 2023;26(1):42-49. n = 112. Poner el teléfono en escala de grises redujo la pantalla de inmediato; fijar límites de tiempo la redujo menos y más lento. No hubo efecto en bienestar ni en rendimiento académico, y no midió sueño. https://pubmed.ncbi.nlm.nih.gov/36577008/
7. Hughes N, Burke J. Computers in Human Behavior 2018. Una semana sin teléfono en la pieza dio mejoras "relativamente pequeñas" en bienestar. No midió sueño. Leí solo el abstract, por OpenAlex. https://doi.org/10.1016/j.chb.2018.03.047
8. Martin KB, Bednarz JM, Aromataris EC. J Sleep Res 2021;30(3):e13130. MA de 11 estudios con 4.656 niños de 2 a 13 años. Hubo 33 min menos de pantalla al día y 11 min más de sueño. Son niños: no se puede extrapolar a Rodrigo. https://pubmed.ncbi.nlm.nih.gov/32567219/
9. No encontré estudios publicados de Opal ni de Screen Time de Apple con resultados de sueño.

### 6.3 Lectura para Rodrigo
Rodrigo no puede bloquear el teléfono: es su herramienta de guardia. Ese es el bloqueo que tiene hoy. Si el agente asume la vigilancia, recién ahí se vuelve posible un "modo guardia" que deja pasar solo la alerta del agente y bloquea lo demás. Los efectos esperables son chicos, del orden de 2 a 3 puntos de ISI o de 10 a 20 min de latencia, según los RCT de arriba. Prometer más no tiene respaldo.

## 7. Chequeo de coherencia con el producto

INCOHERENCIA: el modo sombra "nunca silencia". Durante esas semanas Rodrigo sigue recibiendo todo, o sea, la misma instrucción de vigilar todo (Wuyts 2012, Combertaldi 2022). La calma no llega el primer día y el pitch no debería prometerla así. Lo que sí puede hacer el modo sombra es construir la confianza que después permite soltar: por ejemplo, mostrar en el parte "anoche te habría ahorrado 4 despertares, y estos 2 sí te los habría dado" (cifras ilustrativas).

INCOHERENCIA: si la "pequeña calma antes de dormir" se arma como un ritual dentro del teléfono y en la cama, choca con las variables 2 y 6, porque el teléfono en la cama es parte del problema. Además, dos RCT online de postergar la preocupación no mejoraron el sueño (Versluis 2016, McCarrick 2025), y el dato bueno de Scullin era con papel. Conviene que el ritual sea de 5 minutos o menos, que cierre con un solo mensaje y que no abra nada con scroll infinito.

INCOHERENCIA: un "no molestar" total, sin una garantía visible, puede subir la ansiedad y el miedo a perderse algo (Fitz 2019, Dekker 2024). El valor no está en silenciar. Está en agrupar con una regla explícita: "si pasa X, te despierto". Esto es coherente con DESPERTAR / PARTE / RUIDO y con "ante la duda, despierta".

Coherente: la política "ante la duda, despierta" y el umbral de confianza en 0,7 bajan la probabilidad percibida de perderse algo. Según los datos de Sprajcer que trae el archivo hermano, eso reduce el costo de la guardia. No lo elimina.

Coherente: usar el feedback "Debió despertarme / No debió despertarme" como ejemplos sube el control percibido. Es la misma dirección que Adachi 2013 y Dettmers 2016, aunque esos estudios son observacionales y de otro contexto.

## 8. Fuentes leídas (abstract o texto completo, por PubMed / Europe PMC salvo indicación)

Harvey 2002 https://pubmed.ncbi.nlm.nih.gov/12186352/
Nicassio 1985 (no leído) https://pubmed.ncbi.nlm.nih.gov/4004706/
Jansson-Fröjmark y Norell-Clarke 2012 https://pubmed.ncbi.nlm.nih.gov/22281450/
Puzino 2020 https://pubmed.ncbi.nlm.nih.gov/31545084/
Clancy 2020 https://pubmed.ncbi.nlm.nih.gov/31910749/
Pillai 2014 https://pubmed.ncbi.nlm.nih.gov/25061248/
Kalmbach 2020 https://pubmed.ncbi.nlm.nih.gov/32247571/
Åkerstedt 2007 https://pubmed.ncbi.nlm.nih.gov/17884278/
Åkerstedt 2012 https://pubmed.ncbi.nlm.nih.gov/22621983/
Kecklund y Åkerstedt 2004 https://pubmed.ncbi.nlm.nih.gov/15041138/
Harvey 2000 https://pubmed.ncbi.nlm.nih.gov/11033749/
Wuyts 2012 IJP https://pubmed.ncbi.nlm.nih.gov/21963535/
Thomée 2011 https://pubmed.ncbi.nlm.nih.gov/21281471/
Rod 2018 https://pubmed.ncbi.nlm.nih.gov/30325929/
Gradisar 2013 https://pubmed.ncbi.nlm.nih.gov/24340291/
Exelmans 2016 https://pubmed.ncbi.nlm.nih.gov/26688552/
Brautsch 2023 https://pubmed.ncbi.nlm.nih.gov/36638702/
Tang 2007 https://pubmed.ncbi.nlm.nih.gov/16793001/
Chang 2015 https://pubmed.ncbi.nlm.nih.gov/25535358/
Duraccio 2021 https://pubmed.ncbi.nlm.nih.gov/33867308/
Combertaldi 2021 https://pubmed.ncbi.nlm.nih.gov/34627122/
Hartstein 2024 https://pubmed.ncbi.nlm.nih.gov/38806392/
Bourke 2026 https://pubmed.ncbi.nlm.nih.gov/41770550/
Scullin 2018 https://pubmed.ncbi.nlm.nih.gov/29058942/
Carney y Waters 2006 https://pubmed.ncbi.nlm.nih.gov/16390282/
Jansson-Fröjmark 2012 https://pubmed.ncbi.nlm.nih.gov/22574800/
McGowan y Behar 2013 https://pubmed.ncbi.nlm.nih.gov/22977265/
Versluis 2016 https://pubmed.ncbi.nlm.nih.gov/26511764/
McCarrick 2025 https://pubmed.ncbi.nlm.nih.gov/41347618/
Wood 2009 https://pubmed.ncbi.nlm.nih.gov/19073292/
Wuyts 2012 Biol Psychol https://pubmed.ncbi.nlm.nih.gov/23000568/
Combertaldi 2022 https://pubmed.ncbi.nlm.nih.gov/36278537/
Torsvall y Åkerstedt 1988 https://pubmed.ncbi.nlm.nih.gov/3363267/
Bamberg 2012 https://pubmed.ncbi.nlm.nih.gov/23081765/
Dettmers 2016 https://pubmed.ncbi.nlm.nih.gov/26236956/
Ziebertz 2017 https://pubmed.ncbi.nlm.nih.gov/28349565/
Tamaki 2016 https://pubmed.ncbi.nlm.nih.gov/27112296/
Adachi 2013 https://pubmed.ncbi.nlm.nih.gov/23504939/
Fitz 2019 (abstract por Semantic Scholar) https://doi.org/10.1016/j.chb.2019.07.016
Dekker 2024 (abstract por OpenAlex) https://doi.org/10.1080/15213269.2024.2334025
Barber y Santuzzi 2015 https://pubmed.ncbi.nlm.nih.gov/25365629/
Barber y Jenkins 2014 https://pubmed.ncbi.nlm.nih.gov/24123651/
Wendsche y Lohmann-Haislah 2017 https://pubmed.ncbi.nlm.nih.gov/28133454/
Karabinski 2021 https://pubmed.ncbi.nlm.nih.gov/34096763/
Morin 2011 https://pubmed.ncbi.nlm.nih.gov/21532953/
Fernandez-Mendoza 2012 https://pubmed.ncbi.nlm.nih.gov/22172961/
Snyder 2018 https://pubmed.ncbi.nlm.nih.gov/30373688/
Carney 2012 https://pubmed.ncbi.nlm.nih.gov/22294820/
Espie 2014 https://pubmed.ncbi.nlm.nih.gov/24643168/
Kroese 2014 https://pubmed.ncbi.nlm.nih.gov/24994989/
Kroese 2016 https://pubmed.ncbi.nlm.nih.gov/24997168/
Hill 2022 https://pubmed.ncbi.nlm.nih.gov/36375334/
Exelmans 2017 https://pubmed.ncbi.nlm.nih.gov/28728618/
Barrow 2026 https://pubmed.ncbi.nlm.nih.gov/41206086/
Oliveira 2024 https://pubmed.ncbi.nlm.nih.gov/39840778/
Pieh 2025 https://pubmed.ncbi.nlm.nih.gov/39985031/
He 2020 https://pubmed.ncbi.nlm.nih.gov/32040492/
Hill 2025 https://pubmed.ncbi.nlm.nih.gov/40081281/
Graham 2021 https://pubmed.ncbi.nlm.nih.gov/33395534/
Grüning 2023 https://pubmed.ncbi.nlm.nih.gov/36795756/
Zimmermann y Sobolev 2023 https://pubmed.ncbi.nlm.nih.gov/36577008/
Hughes y Burke 2018 (abstract por OpenAlex) https://doi.org/10.1016/j.chb.2018.03.047
Martin 2021 https://pubmed.ncbi.nlm.nih.gov/32567219/
