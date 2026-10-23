# Cerrar cada funcionalidad terminada con commit, push, PR y merge

Estado: oficial
Fecha: 2026-10-23
Decidió: Quito, confirmado expresamente como oficial el 2026-10-23
Carril: los tres

## Contexto

El equipo necesita disponer de las funcionalidades completas en `main` para que las otras personas puedan integrarlas y probarlas. Dejar una entrega lista solo en una rama o un computador retrasa ese trabajo.

## Decisión

1. Al terminar una funcionalidad y verificarla, su responsable hace commit selectivo, push, PR y merge a `main`, con las pruebas y el build que correspondan en verde. Se integra cada funcionalidad completa sin acumular varias en una rama.
2. Los agentes deben proponerle siempre a Quito ese cierre completo cuando terminen una funcionalidad. La propuesta debe decir qué está listo y qué se verificó.
3. Cuando Quito ya autorice commit, push y merge para una entrega, el agente completa esos pasos y entrega los enlaces sin volver a pedir la misma autorización. Para entregas futuras, proponer el cierre no equivale a tener autorización anticipada para ejecutarlo.
4. El cierre informa por separado qué quedó en el commit, qué se subió, el PR y su merge efectivo. El trabajo pendiente de otras personas queda fuera del commit.

Se conserva el trabajo por carriles, con ramas cortas y PR a `main`. No hace falta esperar una o dos horas si una funcionalidad ya está terminada y verificada.

## Por qué

Quito pidió: «necesito que siempre me lo propongas» y que Bishara y Amaru «vayan haciendo merge cada vez que terminan un feature bueno». Al clasificar este acuerdo, respondió «Oficial».

## Lo que cuesta

Cada funcionalidad necesita un cierre verificable y un PR acotado. Si una prueba, un build o una dependencia impiden integrar, se informa el bloqueo y el trabajo sigue pendiente de merge.

## Cambios

- 2026-10-23: acuerdo registrado e incorporado a las instrucciones de agentes y las guías del equipo. Quito pidió comunicarlo a Bishara y Amaru mediante el canal de tareas.
