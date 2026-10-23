# El agente clasifica con Claude directo o a través de Hermes

Estado: por confirmar
Fecha: 2026-10-23
Decidió: la decide Quito; afecta el deploy de Amaru
Carril: quito

## Contexto

El prototipo clasificaba a través de Hermes, un servicio aparte en Railway. Según `deploy/hermes/README.md`, todavía necesitaba que le configuraran un modelo y que le apagaran las herramientas.

## La pregunta

1. Claude directo con la API de Anthropic. Un servicio menos que desplegar.
2. Hermes, como en el prototipo. Hay que terminar de configurarlo.

Conviene decidirlo temprano, porque cambia qué hay que desplegar.

## Cambios
