# SOL · Desconectar, a tu manera

El día termina, pero los pendientes siguen ocupando la cabeza. SOL ayuda a dejar uno encaminado para poder desconectar: recoge el contexto mínimo, prepara un siguiente paso y ajusta su ayuda cuando la persona lo corrige.

**Objetivo de esta rama:** una demo funcional web adaptable al móvil y conectable a un número de WhatsApp de prueba. La entrega demuestra continuidad y adaptación explícita; la app nativa completa es una evolución futura. Usar únicamente mensajes ficticios.

## Probar ahora

```sh
npm ci
npm run dev
```

Abrir **http://localhost:5173/desconectar**. Escribir un pendiente → elegir qué lo dificulta → pedir **MÁS PEQUEÑO** → empezar otro con **NUEVO**. La siguiente propuesta conserva la preferencia por dos minutos. **RESUMEN** permite retomar; **BORRAR** elimina contexto, preferencias e historial de esa conversación en SOL.

El motor de esta demo es guiado y determinista: no requiere claves ni un modelo. El contexto vive en el backend y persiste en PostgreSQL, Supabase o `.data/`, según la configuración existente. La prueba web usa una conversación compartida del equipo; no envía mensajes. Cada remitente permitido de WhatsApp tiene su propio contexto, visible en el panel autenticado. Esto todavía no es un producto multiusuario.

## Conectar WhatsApp

Seguir [SETUP.md](./SETUP.md#4-kapso--demo-de-desconexión). Configurar Kapso, registrar el webhook firmado y permitir los números de prueba. Desde `/desconectar`, desplegar «Conexión y controles del equipo» y habilitar respuestas. Escribir primero desde el teléfono al número del bot.

Recorrido: **WhatsApp → webhook verificado → cola persistida → conversación contextual → respuesta al mismo remitente → panel web**. Modo sombra prepara sin enviar; pausa conserva los mensajes en cola. Se evita repetir respuestas ante webhooks duplicados. Los envíos inciertos quedan visibles sin reintento automático.

**Estado de validación:** pruebas locales y SDK de Kapso con transporte HTTP simulado. Falta conectar el número y comprobar recepción real en un teléfono. «Aceptada por API» no significa entregada ni leída.

## Qué queda fuera

Monitorización de otras apps, lectura de grupos o mensajes personales, bloqueos del sistema, retos físicos, avisos programados, diagnóstico de procrastinación y mejoras de sueño demostradas. No se confirma que una obligación terminó por haber preparado un siguiente paso.

La landing sigue en `/`; `/app` conserva el panel anterior y sus escenarios de guardia; `/demo` conserva la experiencia local anterior. En esta rama, los mensajes entrantes de WhatsApp usan el nuevo flujo de desconexión. Gmail y los escenarios anteriores mantienen su motor independiente.

## Verificar y presentar

```sh
npm test
npm run build
npm start
```

[Guion de demo](./docs/DEMO.md) · [Problema, solución y alcance](./docs/PRODUCTO_SOL.md) · [Configuración](./SETUP.md)

Rama: `codex/sol-desconexion-whatsapp`. El commit `a631dc9` conserva el estado completo anterior al experimento. El push de esta rama no implica despliegue ni merge en producción.
