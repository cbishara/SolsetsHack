# Acceso compartido entre iPhone y web

Solicitud #37, implementada en el candidato PR #36. La vinculación inicial crea una identidad verificada; el login posterior crea otra sesión de esa misma identidad. No conecta una segunda cuenta ni fusiona el usuario anónimo del dispositivo.

## Para Bishara: contrato exacto

Prefijo `/api/v1`. El cliente nativo guarda el bearer en SecureStore. La web usa el mismo origen HTTPS de API, `credentials: 'include'`, JSON y cabecera `X-Sol-CSRF: 1` en toda mutación. El servidor exige también `Origin` coincidente y rechaza orígenes externos. Nunca guardar tokens web en localStorage: la cookie `__Host-sol_session` es HttpOnly, Secure y SameSite=Strict.

| Ruta | Entrada | Resultado |
| --- | --- | --- |
| POST `/sessions` | `{transport?: 'native'|'web'}` | 201: nueva identidad para primera vinculación. Nativo recibe `{token,userId,sessionId,expiresAt}`; web recibe solo IDs/caducidad y cookie. No usar este endpoint para recuperar una cuenta. |
| POST `/auth/whatsapp/request` | `{phone,transport?: 'native'|'web'}` | 202 `{status:'accepted',challengeId,expiresAt}`. Nativo recibe también `loginToken`; web lo conserva en cookie HttpOnly temporal. |
| POST `/auth/whatsapp/verify` | `{challengeId,code,transport?,loginToken?}` | Nativo pasa el `loginToken` de su solicitud y recibe bearer/IDs/caducidad. Web no envía `loginToken` en JSON: usa cookie y recibe solo IDs/caducidad. |
| GET `/me` | Sesión | Mismo `userId` en dispositivos que verificaron la misma identidad. |
| POST `/auth/logout` | `{allDevices?:boolean}` | `{ok:true}`. Predeterminado: solo dispositivo actual. `true`: invalida todas las sesiones y logins pendientes de esa identidad. |

Teléfono en formato internacional con o sin `+`, sin espacios. Solo localiza una identidad previamente verificada. El destino del código se obtiene de la cuenta canónica guardada; no se envía a un número arbitrario ni se concede propiedad por escribirlo.

El 202 es genérico para cuenta desconocida, enfriamiento, cuota agotada o entrega no confirmada: mostrar «Si ya vinculaste esta cuenta, recibirás un código». No afirmar que WhatsApp lo entregó. El código tiene seis dígitos, vence en cinco minutos y permite cinco intentos. Envíos: 60 segundos entre intentos y cinco al día, compartidos con vinculación. Reenviar es una acción explícita; una respuesta incierta del proveedor no se repite automáticamente.

La verificación fallida devuelve `invalid_or_expired_code`. Los límites de solicitudes pueden devolver 429. Sesión inválida/caducada/revocada devuelve 401; origen o transporte de navegador inválido 403. Si WhatsApp no entrega el código, no hay bypass ni otro usuario provisional que recupere datos de esa cuenta.

## Separación y continuidad

Login y vinculación usan desafíos y hashes de propósito distintos. El desafío de login está ligado a un secreto del cliente iniciador y a la versión del vínculo. El código de otra sesión, identidad o propósito no sirve. Logout global usa una generación de sesiones, evitando depender de un listado incompleto de dispositivos.

Los datos de conversación se guardan por usuario, no por sesión. El chat sintético también conserva su conversación inicial al consultar desde otro dispositivo. Esta prueba no acredita todavía el chat real de Quito ni la continuidad real por WhatsApp: eso depende de #24/#30.

## Evidencia y límites

89 pruebas server y TypeScript aprobados tras incorporar esta entrega y el aislamiento del piloto; 13 pruebas nuevas ejercitan login, expiración, intentos, replay, rollback, sesiones A/B, cookies y CSRF. Proveedor simulado, cero OTP reales. Backend listo para integración del cliente; recorrido físico iPhone/web y entrega real del código pendientes.

Fuentes de verdad: `server/src/multiuser/identity.ts`, `request-auth.ts`, `routes.ts`, `server/test/multiuser-login.test.ts` y `multiuser-login-http.test.ts`. La recuperación cuando se pierde/cambia el número y el borrado completo quedan fuera de esta entrega.
