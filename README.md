# DTF. — Web de pre-lanzamiento

Landing estática de la lista de espera de DTF. Sin dependencias, sin build:
se despliega tal cual en Netlify, Vercel o Cloudflare Pages.

## Estructura

```
index.html               Landing completa (tokens CSS, 12 secciones, puerta
                         de edad, franja de estado, waitlist). Autocontenida.
privacidad/index.html    Política de privacidad (RGPD/LOPDGDD)
condiciones/index.html   Condiciones de uso
perfiles/index.html      Diseño del perfil de usuario de la app (interna,
                         noindex, no enlazada desde la navegación)
404.html                 Página de error a juego
assets/tokens.css        Tokens y @font-face compartidos (todo menos la landing)
assets/legal.css         Estilos de las páginas legales
assets/perfiles.css      Estilos de la página de diseño de perfiles
fonts/                   Archivo variable autoalojada (OFL, subconjunto latino)
favicon.svg              Cuadrado rojo + "DTF" en trazados de Archivo 800/125%
robots.txt, sitemap.xml  SEO básico
ARQUITECTURA.md          Plan de desarrollo y decisiones tomadas
```

## Desplegar

Cualquier hosting estático sirve. No hay paso de build: publica la raíz del
repo. Los tres grandes (Netlify, Vercel, Cloudflare Pages) resuelven
`/privacidad` → `privacidad/index.html` y usan `404.html` automáticamente.

## Antes de lanzar (bloqueante)

1. **Textos legales**: los huecos `[PENDIENTE: …]` de `/privacidad/` y
   `/condiciones/` están marcados en rojo a propósito — si se ven, no está
   listo. Rellenar responsable, NIF, domicilio, email de privacidad, plazo
   de conservación y proveedor de email, y pasarlo por asesoría legal.
2. **Backend del waitlist**: el formulario hace `POST /api/waitlist` con
   `{ email }`. Falta el endpoint real: validación server-side, rate limit,
   doble opt-in y almacenamiento (solo email + timestamp + consentimiento).
3. **Estado de la ventana**: la franja superior se controla con
   `window.DTF.setWindow(open, closesAt)`. En producción debe alimentarse de
   `GET /api/window` → `{ open, closesAt }`; la cuenta atrás del cliente
   solo pinta.

El detalle de todo esto (y el plan de migración a Astro cuando haga falta)
está en [`ARQUITECTURA.md`](ARQUITECTURA.md).

## Reglas del sistema de diseño

- Cero `border-radius`, una sola regla de `2px solid var(--ink)`.
- Todo alineado a la izquierda; fotografía siempre `grayscale(1)`.
- Texto rojo sobre claro: usar `--accent-press` (`#ae1800`), que pasa AA;
  `--accent` (`#ec3013`) no pasa en texto pequeño.
- Tipografía Archivo variable autoalojada — no añadir Google Fonts.
- El foco de teclado (`:focus-visible`) nunca se elimina.
- Los tokens viven en dos sitios y solo dos: en línea en `index.html` (que es
  la página crítica y no debe pagar una petición extra) y en
  `assets/tokens.css` para todas las demás. Si cambias uno, cambia los dos.

### Pendiente de decidir: `--meta`

`--meta` (`#9b9797`) sobre `--bg` da **2.59:1** y no pasa AA en texto pequeño.
La landing lo usa en `.kicker`, `.meta-label`, `.notice__time` y
`.footer__legal`, que son texto real, no decoración. `--ink-3` (`#605d5d`) da
5.83:1 y es casi indistinguible a simple vista.

`assets/perfiles.css` ya usa `--ink-3` en las etiquetas pequeñas. La landing
sigue con `--meta` porque cambiarla es una decisión de diseño, no un arreglo:
o se sube el tono de `--meta`, o se cambian esos cuatro usos. Mientras no se
decida, el objetivo de Lighthouse 100 en accesibilidad no es alcanzable.
