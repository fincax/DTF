# DTF. — Memoria del proyecto

Web estática de pre-lanzamiento (lista de espera) de DTF, app de citas 18+
para España. Sin build, sin dependencias: se publica la raíz del repo tal
cual. Rama de trabajo: `claude/donde-lo-dejamos-nt5ab7`.

## Estado (sesión 2026-07-28)

- `assets/tokens.css` — tokens y `@font-face` compartidos. `legal.css` y
  `perfiles.css` los consumen; ya no se duplican por hoja.
- `/perfiles/` — página de diseño del perfil de usuario de la app:
  anatomía anotada, tarjeta de lista, seis estados, tabla de campos y
  qué datos se guardan. Interna: `noindex`, fuera de `sitemap.xml` y sin
  enlace desde la navegación. Verificada en Chromium a 390/768/1024/1440
  sin desbordes ni errores de consola.

## Estado (sesión 2026-07-25)

Hecho y verificado en Chromium headless (puerta de edad, cuenta atrás,
validación y éxito del waitlist, menú móvil, cero errores de consola):

- `index.html` — landing del handoff + mejoras: fuente autoalojada,
  favicon, `tabindex="-1"` en el éxito del waitlist, enlace a privacidad
  desde la puerta de edad, `og:url`.
- Archivo variable autoalojada en `/fonts` (subconjunto latino, ejes
  wght 400–900 y wdth 62–125%, OFL incluida). No volver a Google Fonts.
- `favicon.svg` — cuadrado rojo + "DTF" en trazados reales de Archivo
  800/125% (generado con fontTools desde el woff2 del repo).
- `/privacidad/` y `/condiciones/` — estructura RGPD/LOPDGDD completa;
  los datos del responsable son huecos `[PENDIENTE]` marcados en rojo
  (clase `.pending` en `assets/legal.css`): si se ven, no se lanza.
- `404.html`, `robots.txt`, `sitemap.xml`, `README.md`.

## Siguiente trabajo (en este orden, según ARQUITECTURA.md)

1. **Backend del waitlist** (bloqueante): `POST /api/waitlist` con
   validación server-side, rate limit por IP, doble opt-in y
   almacenamiento de solo email + timestamp + consentimiento.
   Proveedor recomendado: **Brevo** — es europeo, así que no hay
   transferencia internacional que declarar en `/privacidad/`, y trae
   doble opt-in y bajas de serie. Falta decidir dónde corre el endpoint
   (Netlify Functions / Vercel / Cloudflare Workers): el repo es
   estático puro y hoy no tiene servidor.
2. **Rellenar los `[PENDIENTE]` legales** con datos reales de la empresa
   y pasar por asesoría. No lanzar el waitlist sin esto.
3. **`GET /api/window`** → `{ open, closesAt }`. La landing ya consume el
   contrato vía `window.DTF.setWindow(open, closesAt)`; el servidor es la
   fuente de verdad, el cliente solo pinta.
4. Migración a Astro por componentes (estructura ya definida en
   ARQUITECTURA.md) — solo cuando el proyecto lo pida; el HTML actual es
   producción.
5. Foto editorial (`<picture>` AVIF+WebP, siempre `grayscale(1)`).
6. Decidir `--meta` (ver README): no pasa AA y la usa la landing en texto
   real. Bloquea el 100 de accesibilidad en Lighthouse.

## Diseño de producto

`/perfiles/` fija el perfil de usuario de la app. Decisiones que ya no
hay que volver a discutir: el vídeo de 30 s manda, «lo que busco» y «lo
que no» son campos obligatorios de 140 caracteres en texto libre, la
acción principal es proponer un plan (no un corazón, no deslizar),
bloquear y reportar están en pantalla y no en un menú, y el perfil
caduca con la ventana. Antes de construirlo hay que resolver quién
verifica la edad, dónde se aloja el vídeo y con qué base jurídica se
tratan los datos de orientación — categoría especial del art. 9 RGPD,
que exige consentimiento explícito aparte del alta.

## Reglas del sistema de diseño (no negociables)

- Cero `border-radius`; una sola regla: `2px solid var(--ink)`.
- Todo alineado a la izquierda; fotografía siempre en B/N.
- Texto rojo sobre fondo claro: `--accent-press` (#ae1800), que pasa AA;
  `--accent` (#ec3013) no pasa en texto pequeño.
- El foco `:focus-visible` nunca se elimina.
- Única sombra permitida: la de la tarjeta de notificación.
- Los tokens viven en dos sitios y solo dos: en línea en el `:root` de
  `index.html` (página crítica, sin peticiones extra) y en
  `assets/tokens.css` para todo lo demás. Si cambias uno, cambia los dos.

## Convenciones de trabajo

- Commits en español, mensaje explicando el porqué.
- Verificar en navegador antes de subir: servir con
  `python3 -m http.server` y usar el Chromium de
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Playwright:
  `executablePath` a esa ruta, no descargar navegadores).
- Objetivo Lighthouse 100/100/100/100; si baja de 95 en performance,
  sobra una librería.
