# DTF. — Por dónde empezar a desarrollar

## Qué tienes ya

`index.html` es la landing completa, fiel al handoff y lista para desplegar hoy:
sistema de tokens en CSS custom properties, 12 secciones, puerta de edad,
franja de estado con cuenta atrás, lista de espera y responsive.
Sin dependencias, sin build. Súbelo a Netlify/Vercel/Cloudflare Pages y funciona.

Dos decisiones que conviene que revises:

1. **Orden de secciones.** El `README.md` del handoff numera los stats antes de
   "La Ventana", pero el HTML de referencia (`DTF Web v2.dc.html`, marcado como
   *la página a implementar*) los pone después. He seguido el HTML. Si querías el
   orden del README, mueve el `<section>` de `.stats` justo antes de `#ventana`.
2. **Menú móvil.** El handoff solo especifica desktop 1200px. He añadido un
   toggle con el icono `menu` de la lista de assets, respetando el sistema
   (borde 2px, cero radius, links alineados a la izquierda).

## Stack recomendado: Astro

Para una landing de pre-registro, Astro es la elección correcta:

- HTML estático por defecto, **cero JS** salvo el que tú declares → LCP muy bajo,
  que es lo que importa cuando toda la conversión es un email.
- Componentes `.astro` con la misma sintaxis HTML que ya tienes → migración casi
  copiar-pegar, sin reescribir a JSX.
- API routes en el mismo repo para el waitlist y el estado de la ventana.
- Si más adelante quieres React para el panel de moderación, Astro lo admite
  como island sin cambiar de framework.

Alternativa razonable: **Next.js** si el equipo ya vive en React o si la web
pública va a compartir código con el back-office. Evita ambos si esto no va a
crecer: el HTML que tienes ya es producción.

```bash
npm create astro@latest dtf-web -- --template minimal --typescript
cd dtf-web && npx astro add tailwind   # opcional, ver más abajo
```

## Estructura propuesta

```
src/
  styles/tokens.css        ← :root con los tokens (copiar del bloque 1)
  styles/base.css          ← reset, tipografía, .btn, .container, focus
  layouts/Base.astro       ← <head>, fuentes, meta, script anti-flash de la puerta
  components/
    AgeGate.astro          ← puerta 18+ (client:load, es lo único crítico)
    StatusBar.astro        ← franja abierto/cerrado + cuenta atrás
    Header.astro
    Hero.astro
    Steps.astro            ← rejilla numerada 01/02/03 (reutilizada 2 veces)
    NotificationSpec.astro
    Stats.astro
    Credits.astro
    Aesthetic.astro
    HouseRules.astro
    Faq.astro
    Waitlist.astro
    Footer.astro
  content/                 ← todo el copy en .json o .md, fuera del markup
  pages/
    index.astro
    privacidad.astro
    condiciones.astro
    api/waitlist.ts
    api/window.ts
```

Dos componentes se repiten con datos distintos (`Steps` en "La Ventana" y en
"Cómo funciona"; `Credits` en la rejilla 3×2). Pásales un array de props y saca
el copy a `content/` desde el primer día: cambiar un titular no debería ser un
commit en un componente.

**Sobre Tailwind:** aquí no aporta. El sistema es muy cerrado (cero radius,
una sola regla de 2px, cuatro colores de tinta) y ya está expresado en tokens.
Tailwind te haría repetir `border-2 border-[#201e1d]` por todo el markup. Si el
equipo lo prefiere, mapea los tokens en `theme.extend` y desactiva el resto de
la escala para que nadie meta un `rounded-lg`.

## Lo que falta para producción

**Backend (bloqueante)**
- `POST /api/waitlist` → validación server-side, rate limit por IP, doble
  opt-in por email, almacenamiento (Resend/Loops/Brevo o tu propia tabla).
  Guarda solo email + timestamp + consentimiento; nada más.
- `GET /api/window` → `{ open, closesAt }`. La landing ya consume ese contrato:
  `window.DTF.setWindow(true, '2026-07-26T23:58:00+02:00')`. Fija la fuente de
  verdad en el servidor: la cuenta atrás del cliente solo pinta.

**Legal (España, y no es opcional en un 18+)**
- La puerta de edad con `localStorage` es un gesto de UX, **no** verificación.
  El handoff ya prevé verificación documental en la app; en la web basta con
  que el copy no prometa más de lo que hace.
- Aviso de privacidad y condiciones reales antes de captar un solo email
  (RGPD + LOPDGDD): base jurídica, responsable, plazo de conservación,
  derechos ARCO. El enlace del footer ya apunta a `/privacidad`.
- Banner de cookies **solo si** añades analítica no exenta. Si usas Plausible o
  Umami self-hosted, te ahorras el banner entero — y encaja con la promesa de
  discreción de la marca.
- Ten a mano las políticas de contenido adulto de App Store y Google Play antes
  de invertir en la app: son la restricción más dura del proyecto y conviene
  leerlas antes que después.

**Assets**
- Foto editorial: sigue pendiente en el diseño. Sirve AVIF + WebP con
  `<picture>`, `width`/`height` explícitos y `loading="lazy"`, siempre con
  `filter: grayscale(1)`.
- Favicon y app icon: cuadrado rojo `#ec3013` con "DTF" en Archivo 800 /
  stretch 125% alineado abajo-izquierda (misma construcción que el icono de la
  notificación, ya en el CSS como `.notice__icon`).
- Autoaloja la fuente Archivo variable (`@font-face` + `font-display:swap`) en
  vez de tirar de Google Fonts: quita una petición a terceros y una cesión de
  IPs que tendrías que declarar.

**Calidad**
- Lighthouse: el objetivo realista aquí es 100/100/100/100. Si baja de 95 en
  performance, es que alguien ha metido una librería que no hacía falta.
- Contraste: `#ec3013` sobre `#f3f2f2` no pasa AA en texto pequeño — por eso el
  sistema usa `#ae1800` para texto rojo. Respétalo en cualquier componente nuevo.
- Prueba la puerta de edad con teclado y lector de pantalla: es lo primero que
  ve todo el mundo y ya lleva focus trap.

## Vídeo de perfil (decisión tomada — para la app, no para esta web)

El perfil en vídeo de 30 segundos **no se guarda en servidor propio**.
Decisión: **plataforma de vídeo gestionada con subida directa desde el
cliente y revisión de contenido previa a publicar**.

- **Plataforma gestionada** (Cloudflare Stream por coste y simplicidad;
  api.video si se prima residencia UE de serie; Mux si hacen falta
  analíticas finas). Ellos transcodifican, sirven HLS adaptativo con su
  CDN y generan miniaturas. Nuestro backend guarda solo el ID del vídeo
  junto al perfil: el fichero nunca pasa por nuestros servidores.
- **Subida directa desde el cliente** con URL de subida firmada que
  emite el backend. Límite duro en el cliente: 30 s y 720p, para que
  subir sea rápido y barato.
- **Revisión antes de publicar** (obligada por las políticas de
  contenido adulto de App Store/Google Play y por la promesa de la
  marca: 0 contenido explícito, revisión humana). Flujo: subida →
  estado «pendiente» (webhook de la plataforma) → filtro automático +
  revisión humana → visible. Un vídeo nunca es público sin pasar por la
  cola.
- **Reproducción solo con URLs firmadas y caducables**; nunca enlaces
  públicos de CDN. La grabación de pantalla no la para la técnica: para
  eso está la norma de la casa.
- **RGPD**: el vídeo es dato personal. Borrar la cuenta debe purgar el
  vídeo también en la plataforma (llamada API explícita, no basta con
  borrar el ID), y la plataforma entra como encargado del tratamiento
  en la política de privacidad, igual que el proveedor de email.
  Revisar DPA y residencia de datos antes de firmar.

Coste de referencia: a 30 s por perfil, 10.000 perfiles ≈ 5.000 minutos
almacenados ≈ 25 $/mes en Cloudflare Stream; el visionado se factura por
minuto servido.

## Orden de trabajo sugerido

1. Repo + deploy del `index.html` tal cual, con dominio y HTTPS. Ya captas nada.
2. `POST /api/waitlist` real + doble opt-in. Ahora sí captas.
3. Privacidad y condiciones. (2 y 3 pueden ir a la vez; no lances 2 sin 3.)
4. Migración a Astro por componentes, copy a `content/`.
5. Foto editorial, iconos, fuente autoalojada.
6. `GET /api/window` y el mecanismo real de la ventana.
