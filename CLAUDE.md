# DTF. — Memoria del proyecto

Web estática de pre-lanzamiento (lista de espera) de DTF, app de citas 18+
para España. Sin build, sin dependencias: se publica la raíz del repo tal
cual. Rama de trabajo: `claude/mejor-codigo-efd24j`.

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

Añadido en sesión 2026-07-26 (rama `claude/design-missing-pages-7xro3k`),
verificado en Chromium headless (estados, validación, sin scroll
horizontal en móvil, cero errores de consola):

- Páginas de cuenta: `/entrar/` (enlace mágico), `/panel/` (estado en la
  lista, preferencias de ciudad y avisos, descarga/borrado de datos),
  `/confirmar/` (doble opt-in: ok/caducado) y `/baja/` (confirmación
  explícita antes de borrar). Todas `noindex`, fuera del sitemap y sin
  enlazar desde la landing hasta que exista el backend.
- `assets/app.css` — estilos compartidos de esas páginas (tokens
  duplicados; radios/checkboxes cuadrados del sistema, rejilla `.facts`).
- Contratos de API comentados en el `<script>` de cada página
  (`/api/session/link`, `/api/me`, `/api/waitlist/confirm`,
  `/api/waitlist/unsubscribe`) y hooks `window.DTF.*` para revisar los
  estados sin servidor (`setSession`, `setState`, `showSent`).
- Decisión de arquitectura para la app (documentada en ARQUITECTURA.md):
  el vídeo de perfil va en plataforma gestionada (Stream/api.video/Mux)
  con subida directa firmada desde el cliente y revisión de contenido
  previa a publicar. Nunca en servidor propio ni público sin moderar.

Añadido en la misma sesión 2026-07-26: **backend del waitlist completo**
en `server/` (decisiones del usuario: VPS clouding.io; Brevo como email,
recomendación aceptada). Un proceso Node sin dependencias npm
(node:http + node:sqlite + fetch, requiere Node ≥ 22.13) que sirve los
estáticos con lista blanca y toda la API: alta con doble opt-in, baja
con borrado real, enlace mágico + sesión con cookie, panel
(GET/PATCH /api/me, export RGPD), `GET /api/window` (la landing ya lo
consume) y `server/cli.js` (stats, abrir/cerrar ventana, aviso masivo).
Modo log sin `BREVO_API_KEY` (emails a `server/data/outbox.log`).
Verificado con 32 checks de API y un E2E completo en Chromium contra el
servidor real (alta → confirmar → entrar → panel → preferencias →
ventana por CLI → baja), cero errores de consola. En `/privacidad/` ya
están declarados Brevo y Clouding como encargados.

## Siguiente trabajo (en este orden, según ARQUITECTURA.md)

1. **Rellenar los `[PENDIENTE]` legales** que quedan (responsable, NIF,
   domicilio, email de privacidad, plazo de conservación) y pasar por
   asesoría. No lanzar el waitlist sin esto.
2. **Desplegar en clouding.io** siguiendo `server/README.md` (Node 22 +
   systemd + Caddy) y crear la cuenta de Brevo (verificar dominio,
   `BREVO_API_KEY`). Al desplegar, añadir «Entrar» (`/entrar/`) al menú
   de la landing — hasta entonces las páginas de cuenta siguen sin
   enlazar.
3. Migración a Astro por componentes (estructura ya definida en
   ARQUITECTURA.md) — solo cuando el proyecto lo pida; el HTML actual es
   producción.
4. Foto editorial (`<picture>` AVIF+WebP, siempre `grayscale(1)`).

## Reglas del sistema de diseño (no negociables)

- Cero `border-radius`; una sola regla: `2px solid var(--ink)`.
- Todo alineado a la izquierda; fotografía siempre en B/N.
- Texto rojo sobre fondo claro: `--accent-press` (#ae1800), que pasa AA;
  `--accent` (#ec3013) no pasa en texto pequeño.
- El foco `:focus-visible` nunca se elimina.
- Única sombra permitida: la de la tarjeta de notificación.
- Los tokens viven en `:root` de `index.html`; `assets/legal.css` y
  `assets/app.css` los duplican — si cambias uno, cambia los tres.

## Convenciones de trabajo

- Commits en español, mensaje explicando el porqué.
- Verificar en navegador antes de subir: servir con
  `python3 -m http.server` y usar el Chromium de
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Playwright:
  `executablePath` a esa ruta, no descargar navegadores).
- Objetivo Lighthouse 100/100/100/100; si baja de 95 en performance,
  sobra una librería.
