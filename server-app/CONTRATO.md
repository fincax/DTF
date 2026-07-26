# DTF. — Contrato de la API de la app

Base: `/api/app`. Todo JSON. La sesión viaja en cabecera
`Authorization: Bearer <token>` (la app no usa cookies). Las reglas de
producto que hay detrás están en `../PRODUCTO.md`.

Códigos que significan algo concreto en esta API:

| Código | Qué quiere decir |
| --- | --- |
| 401 | No hay sesión (o la cuenta está expulsada o borrada) |
| 403 | Hay sesión pero no permiso (moderación, edad no verificada) |
| **409** | **La ventana está cerrada**, o el match ya no admite acciones |
| **412** | Perfil incompleto: la respuesta trae `falta[]` con los pasos |
| 429 | Rate limit |

## Acceso

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `POST /auth/link` | `{ email }` | `204` siempre (no revela si existe la cuenta). Envía enlace, caduca en 15 min |
| `POST /auth/session` | `{ token }` | `{ session }` · `410` si caducó |
| `POST /auth/logout` | — | `204` |

## Onboarding y perfil

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /me` | — | `{ email, rol, pausado, edadVerificada, perfil, video, listo, falta[] }` |
| `POST /me/age` | `{ metodo: 'facial'\|'documento', proveedor, resultado }` | `204` · `403 { siguiente: 'documento' }` si el facial no da margen |
| `PATCH /me/profile` | `{ nombre, anioNac, ciudad, identidad, orientacion, busco }` | `204` · `400` si <18 o ciudad fuera de la beta |
| `POST /me/video` | — | `{ videoId, externalId, subidaUrl, maxSegundos: 30 }` |
| `POST /me/pause` | `{ pausado }` | `204` |
| `GET /me/export` | — | Todos tus datos (RGPD) |
| `DELETE /me` | — | `204`. Borra la cuenta **y purga el vídeo en la plataforma** |

`falta[]` puede contener: `verificacion_edad`, `datos_basicos`,
`identidad`, `busco`, `video_aprobado`. La app pinta el onboarding a
partir de esa lista: mientras no esté vacía, no se entra a la ventana.

**El vídeo nunca pasa por este servidor**: `subidaUrl` es una URL
firmada de la plataforma gestionada y el móvil sube directo a ella
(ARQUITECTURA.md). Al terminar, la plataforma llama al webhook.

## Ventana y deck

| Método y ruta | Respuesta |
| --- | --- |
| `GET /window` | `{ open, closesAt }` — público, sin sesión |
| `GET /deck` | `{ closesAt, gente[] }` · `409` cerrado · `412` perfil incompleto |
| `POST /deck/:userId/like` | `{ match: { id } \| null }` |
| `POST /deck/:userId/pass` | `{ match: null }` |

`gente[]` trae `id, nombre, anio_nac, ciudad, identidad, orientacion,
busco, video_id`. **Nunca el email.** Excluye a quien ya viste en esta
ventana, a los bloqueados en cualquier dirección, a los pausados y a
quien no tenga vídeo aprobado.

## Matches, plan y mensajes

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /matches` | — | `{ matches[] }` con `escribible` y `caducaAlCierre` |
| `POST /matches/:id/plan` | `{ sitio, at }` | `204` · `400` si la hora ya pasó |
| `POST /matches/:id/plan/aceptar` | — | `204` · `409` si lo propusiste tú |
| `GET /matches/:id/messages` | — | `{ mensajes[] }` |

**Chat en vivo**: `WS /ws?token=<session>`.
Enviar `{ tipo:'mensaje', matchId, texto }`; se recibe el mismo objeto
con `id`, `from` y `at` (también el emisor, para confirmar). Errores
llegan como `{ tipo:'error', error }`. Solo texto: en la v1 no hay
fotos en el chat (PRODUCTO.md §2).

**Muerte de los matches** (PRODUCTO.md §1): al cerrar la ventana mueren
los matches sin plan aceptado y **sus mensajes se borran**. Con plan
aceptado sobreviven hasta 24 h después de la hora del plan. El barrido
corre cada minuto en el servidor, así que no depende de que nadie mire.

## Seguridad

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `POST /report` | `{ usuarioId, matchId?, categoria, detalle? }` | `204` |
| `POST /block` | `{ usuarioId }` | `204` — bloquear **mata el match** |

`categoria`: `insistir` · `explicito` · `suplantacion` · `otro`.

## Moderación (rol `mod`)

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /mod/videos` | — | Cola de pendientes, primero los de score alto |
| `POST /mod/videos/:id` | `{ decision: 'aprobado'\|'rechazado', motivo? }` | `204` · `409` si ya estaba revisado |
| `GET /mod/reports` | — | Reportes abiertos |
| `POST /mod/reports/:id` | `{ resolucion, expulsar? }` | `204`. Expulsar cierra sus sesiones |

## Webhook de la plataforma de vídeo

`POST /hooks/video` con cabecera `X-DTF-Secret`.
Cuerpo `{ externalId, autoScore }`:

- `autoScore >= AUTO_RECHAZO` (0.9 por defecto) → **rechazo automático**,
  sin gastar tiempo humano.
- Por debajo → estado `pendiente`: **siempre** pasa por revisión humana
  antes de publicarse. Esa promesa está en la landing y es nuestro mejor
  argumento en la revisión de las tiendas.
