# DTF. — Memoria del proyecto

DTF es una app de citas 18+ para España cuya mecánica es **la ventana**:
solo abre unas horas, sin horario ni patrón, y lo que no se aprovecha
caduca. El repo tiene cuatro piezas, todas en la rama de trabajo
`claude/design-missing-pages-7xro3k`:

| Pieza | Qué es | Estado |
| --- | --- | --- |
| Raíz (`index.html`, `/privacidad/`…) | Web de pre-lanzamiento y páginas de cuenta. HTML a mano, sin build | Lista para desplegar |
| `server/` | Backend del waitlist. Node **sin dependencias npm** (node:http + node:sqlite + fetch, Node ≥ 22.13) | Completo y verificado |
| `server-app/` | Backend de la app. Node + Postgres + WebSockets (`pg`, `ws`) | Completo y verificado |
| `app/` | App móvil. Expo SDK 57 + TS + expo-router | Onboarding y deck funcionando |

Documentos que mandan: **PRODUCTO.md** (qué se construye y por qué),
**ARQUITECTURA.md** (web e infraestructura), `server-app/CONTRATO.md`
(API de la app), y los README de `server/`, `server-app/` y `app/`.

## Lo que hay hecho (a 2026-07-26)

**Web.** Landing del handoff, `/privacidad/` y `/condiciones/` con
estructura RGPD (los datos del responsable siguen como `[PENDIENTE]` en
rojo: si se ven, no se lanza), `404.html`, SEO básico, Archivo variable
autoalojada en `/fonts` (nunca volver a Google Fonts) y `favicon.svg`
con la marca en trazados reales. Páginas de cuenta `/entrar/`,
`/panel/`, `/confirmar/` y `/baja/`: `noindex`, fuera del sitemap y **sin
enlazar desde la landing hasta desplegar**. Lighthouse **100/100/100/100**
verificado contra el servidor real.

**Waitlist (`server/`).** Sirve los estáticos con lista blanca y toda la
API: alta con doble opt-in, baja con borrado real, enlace mágico +
sesión con cookie, panel (`GET/PATCH /api/me`, export RGPD),
`GET /api/window` (la landing lo consume al cargar) y `cli.js` (stats,
abrir/cerrar ventana, aviso masivo). Sin `BREVO_API_KEY` arranca en modo
log (`server/data/outbox.log`). 32 checks de API + E2E completo en
Chromium. Decisiones del usuario: **VPS en clouding.io** y **Brevo**
(ambos ya declarados como encargados en `/privacidad/`).

**Backend de la app (`server-app/`).** Acceso por enlace mágico con
sesión Bearer, onboarding completo, webhook de la plataforma de vídeo
con filtro automático, ventana/deck/like/match, plan con aceptación,
chat por WebSocket, barrido de cierre, reportes, bloqueo, expulsión y
RGPD. 47 checks de punta a punta contra Postgres real.

**App (`app/`).** Puerta de edad (fail-closed), acceso por enlace
mágico, onboarding de 5 pasos **en el orden que dicta `falta[]` del
servidor**, deck real con like/pass, Perfil y Ajustes con datos reales.
Iconos generados desde `favicon.svg`. Verificado en Chromium contra
Postgres + backend reales, `tsc` limpio.

## Reglas que no se negocian

**Producto** (de PRODUCTO.md; si el código y el documento discrepan,
gana el documento y se arregla el código):

- Al cerrar la ventana mueren los matches **sin plan aceptado** y se
  borran sus mensajes; con plan aceptado viven 24 h tras la hora del plan.
- Ningún vídeo se publica sin **revisión humana**. El filtro automático
  solo puede rechazar, nunca aprobar. Sin vídeo aprobado, el perfil no
  aparece en la ventana — sin excepciones.
- De la verificación de edad se guarda **solo el resultado**: ni
  documento ni biometría entran en nuestra base.
- Un solo aviso por ventana. Nada de recordatorios ni re-engagement.
- Fuera de la app solo se ve «DTF.»; el nombre largo jamás en fichas de
  tienda, capturas ni notas de versión.
- Borrar es borrar: la cuenta se elimina y el vídeo se purga también en
  la plataforma.

**Diseño:**

- Cero `border-radius`; una sola regla: `2px solid var(--ink)`.
- Todo alineado a la izquierda; fotografía siempre en B/N.
- Texto rojo sobre fondo claro: `--accent-press` (#ae1800), que pasa AA;
  `--accent` (#ec3013) no pasa en texto pequeño.
- Texto blanco sobre rojo: solo sobre `--accent-btn` (#dd2b0f — botones
  primarios, franja «abierto», icono de notificación). Sobre `--accent`
  el texto pequeño va en negro puro, o en grande (≥19px/700 o ≥24px).
- El gris `--meta` es #6b6767: no volver a aclararlo, era la mayor fuente
  de fallos AA.
- El foco `:focus-visible` nunca se elimina.
- Única sombra permitida: la de la tarjeta de notificación.
- Los tokens viven en **cuatro** sitios: `:root` de `index.html`,
  `assets/legal.css`, `assets/app.css` y `app/src/ui/tokens.ts`. Si
  cambias uno, cambia los cuatro.

## Siguiente trabajo

**Bloqueante y del responsable** (nada de esto lo puedo hacer yo):

1. Rellenar los `[PENDIENTE]` legales (responsable, NIF, domicilio,
   email de privacidad, plazo de conservación) y pasar por asesoría.
2. Desplegar en clouding.io (`server/README.md`) y crear la cuenta de
   Brevo (`server/README.md` §Alta en Brevo: dominio, DNS, clave). Al
   desplegar, añadir «Entrar» al menú de la landing.
3. Las decisiones abiertas de PRODUCTO.md §8: umbral de confirmados para
   la primera ventana, presupuesto y proveedor de verificación de edad,
   quién modera, fecha de beta.

**Código, en este orden** (detalle en `app/README.md`):

1. Grabación real del vídeo (cámara en vivo, sin galería) y subida a la
   URL firmada que el backend ya devuelve.
2. Reproductor del vídeo en el deck.
3. Pantallas de matches, plan y chat — el backend ya los sirve.
4. Push (APNs/FCM): el aviso único de apertura.
5. Enlace profundo firmado para el acceso (quitar el campo de token).
6. Backoffice web de moderación sobre `/api/app/mod/*`.
7. Foto editorial de la landing (`<picture>` AVIF+WebP, `grayscale(1)`).

## Convenciones de trabajo

- Commits en español, mensaje explicando **el porqué**.
- **Verificar en navegador antes de subir.** Chromium de Playwright en
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (`executablePath`
  a esa ruta; nunca descargar navegadores). Playwright está global en
  `/opt/node22/lib/node_modules/playwright`.
- Web: servir con `python3 -m http.server` o con `server/server.js`.
  App: `npx expo export --platform web` y servir `dist/` con fallback
  `.html` (el servidor estático simple no resuelve las rutas de
  expo-router).
- Postgres para probar `server-app/`: el clúster no arranca como root;
  `initdb`/`pg_ctl` con otro usuario y `DATABASE_URL` por socket.
- Objetivo Lighthouse 100/100/100/100; si baja de 95 en performance,
  sobra una librería.
- Los `data/` de ambos servidores y `node_modules` están en
  `.gitignore`. Los emails en modo log salen en `*/data/outbox.log`.
