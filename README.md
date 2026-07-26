# DTF. — Web de pre-lanzamiento

Web de la lista de espera de DTF. Sin dependencias ni build: HTML estático
más un servidor Node autocontenido (`server/`) que sirve la web y la API
del waitlist. Se despliega en un VPS (clouding.io) — ver
[`server/README.md`](server/README.md).

## Estructura

```
index.html               Landing completa (tokens CSS, 12 secciones, puerta
                         de edad, franja de estado, waitlist). Autocontenida.
privacidad/index.html    Política de privacidad (RGPD/LOPDGDD)
condiciones/index.html   Condiciones de uso
entrar/index.html        Acceso sin contraseña (enlace mágico por email)
panel/index.html         Panel del usuario en lista de espera (estado,
                         preferencias, descarga y borrado de datos)
confirmar/index.html     Aterrizaje del doble opt-in (ok / caducado)
baja/index.html          Baja de la lista (confirmación explícita)
404.html                 Página de error a juego
assets/legal.css         Estilos compartidos de las páginas legales
assets/app.css           Estilos compartidos de las páginas de cuenta
server/                  Backend del waitlist: API + estáticos + CLI de
                         administración. Cero dependencias npm (Node ≥
                         22.13: node:sqlite, fetch). Ver server/README.md
fonts/                   Archivo variable autoalojada (OFL, subconjunto latino)
favicon.svg              Cuadrado rojo + "DTF" en trazados de Archivo 800/125%
robots.txt, sitemap.xml  SEO básico
ARQUITECTURA.md          Plan de desarrollo y decisiones tomadas
```

## Desplegar

En un VPS de clouding.io: Node 22 + systemd + Caddy (TLS automático).
Pasos completos, variables de entorno, CLI de administración y copia de
seguridad en [`server/README.md`](server/README.md). Para probar en local:

```bash
node server/server.js   # http://127.0.0.1:8787 — sin BREVO_API_KEY los
                        # emails van a server/data/outbox.log
```

El backend cubre alta con doble opt-in real, baja de un clic, estado de
la ventana (`GET /api/window`, que la landing ya consume) y la sesión por
enlace mágico de las páginas de cuenta. Todo verificado de punta a punta
en navegador contra el servidor real.

## Antes de lanzar (bloqueante)

1. **Textos legales**: los huecos `[PENDIENTE: …]` de `/privacidad/` y
   `/condiciones/` están marcados en rojo a propósito — si se ven, no está
   listo. Quedan el responsable (razón social, NIF, domicilio, email de
   privacidad) y el plazo de conservación; los encargados (Brevo, Clouding)
   ya están declarados. Pasarlo por asesoría legal.
2. **Cuenta de Brevo**: crear la cuenta, verificar el dominio remitente y
   poner `BREVO_API_KEY` en el entorno del servidor. Sin la clave el
   servidor arranca en modo log y no envía nada.
3. **Enlazar las páginas de cuenta**: `/entrar/` no se enlaza desde la
   landing todavía; al desplegar con backend, añadir «Entrar» al menú.

El detalle de todo esto (y el plan de migración a Astro cuando haga falta)
está en [`ARQUITECTURA.md`](ARQUITECTURA.md).

## Reglas del sistema de diseño

- Cero `border-radius`, una sola regla de `2px solid var(--ink)`.
- Todo alineado a la izquierda; fotografía siempre `grayscale(1)`.
- Texto rojo sobre claro: usar `--accent-press` (`#ae1800`), que pasa AA;
  `--accent` (`#ec3013`) no pasa en texto pequeño.
- Tipografía Archivo variable autoalojada — no añadir Google Fonts.
- El foco de teclado (`:focus-visible`) nunca se elimina.
