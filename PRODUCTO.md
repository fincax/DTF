# DTF. — Producto: el MVP de la app

Qué se construye en la v1, cómo funciona la ventana exactamente, y las
decisiones que hay que tomar antes de escribir una línea de la app.
Complementa a `ARQUITECTURA.md` (infraestructura) y hereda las promesas
ya publicadas en la landing: son contrato, no inspiración.

**Promesas publicadas que obligan**: verificación documental sin
almacenar el documento · una sola notificación por ventana · matches que
caducan al cierre · plan concreto con cada match · revisión humana de
reportes · 0 fotos explícitas en perfiles públicos · fuera de la app
solo se ve «DTF.» · gratis durante la beta · consentimiento retirable.

---

## 0. La restricción madre: las tiendas

Todo lo demás se diseña dentro de este perímetro. Una app de citas 18+
es legal en App Store y Google Play; una app «para sexo» no. La
diferencia la deciden revisores humanos mirando tres cosas:

1. **La ficha de la tienda**: nombre «DTF.», descripción de app de
   citas para adultos, capturas sin una sola insinuación explícita.
   «Donde Todos Follan» no aparece NUNCA en ficha, capturas ni notas de
   versión — solo dentro de la app, como ya promete la landing.
2. **La moderación demostrable** (Apple 1.2, UGC): filtrado previo a
   publicar, reportar, bloquear y expulsar tienen que existir en la v1
   y poder enseñarse en la revisión. No son features: son el permiso de
   existir.
3. **Clasificación**: 17+ en Apple, 18+ (IARC) en Google, y nuestra
   propia puerta de verificación además de la de la tienda.

Regla de oro para todo el copy interno de la app: picante en el tono,
nunca en la imagen. El contenido explícito está prohibido también
dentro (norma de la casa nº 0 para el equipo).

**Plan B si una tienda rechaza**: PWA instalable con push web (iOS lo
soporta desde 16.4 para apps añadidas a la pantalla de inicio). Se
pierde calidad de push y fricción de instalación — es paracaídas, no
plan. Mitigación principal: llegar a la revisión con la moderación
impecable y la ficha aséptica.

## 1. La ventana (mecánica exacta)

La ventana es EL producto. Especificación v1:

- **Ámbito**: una sola ventana nacional (Madrid + Barcelona a la vez).
  Más densidad percibida, un solo calendario que gestionar. Por-ciudad
  solo si los datos lo piden.
- **Frecuencia**: irregular a propósito, media de 1–2 por semana, con
  huecos de hasta 10 días. La decide una persona (CLI, como el
  waitlist), no un cron: el patrón inexistente es la marca.
- **Horario**: abre entre las 18:00 y las 21:00, cierra siempre a las
  23:58 del mismo día (el «cierra a las 23:58» ya está en el espécimen
  de notificación de la landing). Duración resultante: 3–6 horas.
- **El aviso**: una única push por ventana en el momento de abrir.
  Texto fijo: «Acaba de abrir. Cierra a las 23:58 y no vuelve hasta que
  vuelva.» En la pantalla del móvil solo se ve «DTF.». Sin recordatorios
  de «queda una hora», sin re-engagement. La escasez no se mendiga.
- **Durante la ventana**: se ve gente (filtros v1: ciudad, edad, qué
  busca, orientación), se hace match, se chatea y se propone plan.
- **Al cierre**: mueren los matches sin plan aceptado y todos los
  chats. **Excepción única**: match con plan aceptado sobrevive hasta
  24 h después de la hora del plan (hay que poder decirse «llego tarde»
  o «en la barra del fondo»). Después muere también.
- **Entre ventanas**: la app abre en estado «cerrado» (como la
  landing): puedes editar perfil, regrabar tu vídeo (pasa otra vez por
  revisión), tocar ajustes y poco más. Nada de mirar perfiles: la
  curiosidad se paga presentándose.
- **Cold start de densidad**: la primera ventana se lanza cuando haya
  masa crítica confirmada del waitlist (umbral orientativo: 2.000
  confirmados entre Madrid y Barcelona). Entrada por orden de lista —
  el «puesto #» del panel ya lo promete.

## 2. Recorte v1: dentro / fuera

**Dentro (sin esto no hay producto):**

1. Onboarding: verificación de edad (§3) → identidad y orientación
   (opciones amplias desde el día 1, herencia de Feeld ya prometida) →
   «qué buscas» EN PALABRAS (campo obligatorio, elegido de una lista +
   texto libre moderado) → vídeo de perfil 30 s (§4).
2. La ventana completa (§1) con matching mutuo simple: like/pass, match
   al coincidir. Sin algoritmo listo: orden por cercanía + reciente.
3. Plan al match: al hacer match, la app pide al primero que hable una
   propuesta concreta (sitio público sugerido, día, hora). Aceptar es un
   toque. Sin plan aceptado, el match muere al cierre — ya prometido.
4. Chat de texto dentro de la ventana. Sin fotos en el chat en v1: se
   elimina de golpe el 90 % del problema de moderación y de pantallazos.
   (Sí: es una decisión dura. Es reversible en v2; un escándalo no.)
5. Seguridad: reportar (anónimo, con categorías), bloquear sin
   explicaciones, expulsión por normas. Back-office de moderación (§4).
6. Ajustes: pausar cuenta, borrar cuenta (purga total, incluido el
   vídeo en la plataforma), exportar datos, retirar consentimientos.

**Fuera (v2+, con datos en la mano):**

- Algoritmo de afinidad que aprende (Iris) — v1 no tiene datos.
- Entrada con criterio / curation (Lox Club) — la beta entra por orden.
- Perfiles en pareja y modo incógnito (Feeld) — complejidad de estados.
- Cita-actividad (Field) — el plan v1 ya cubre el 80 %.
- Fotos además del vídeo, fotos en chat, notas de voz.
- Pagos. **La beta es gratis** (promesa publicada) y eso además
  esquiva el billing de las tiendas y su 30 % en el lanzamiento. La
  monetización se decide con retención real delante, no antes.

## 3. Verificación de edad

Promesa publicada: «Verificación documental al crear la cuenta, una
sola vez. El documento no se almacena; solo el resultado.»

- **Flujo v1**: estimación facial de edad primero (barata, sin
  documento); si el resultado no da un margen claro sobre 18 (umbral
  ≥23 aparentes), verificación documental como segundo paso. Es el
  patrón estándar de coste: la mayoría pasa por el camino barato y
  nadie menor pasa por ninguno.
- **Proveedores a cotizar** (UE/DPA, por este orden): Yoti (estimación
  facial, ~0,10–0,30 € por check), Veriff, Onfido, iDenfy (documental,
  ~0,70–1,50 € por verificación). Criterios: precio por verificación,
  SDK móvil decente, residencia de datos UE, y que el contrato permita
  nuestro modelo «resultado sí, documento no».
- **Qué guardamos**: `verificado: true/false`, método, fecha y
  proveedor. Nada más. El tratamiento biométrico (art. 9 RGPD) es del
  proveedor con consentimiento explícito en su pantalla; en nuestra
  base no entra biometría jamás.
- **Coste estimado**: con mezcla 80/20 facial/documental, ~0,3–0,5 €
  por usuario verificado. 10.000 usuarios ≈ 3.000–5.000 €. Es de los
  gastos serios del lanzamiento: presupuestarlo ya.
- **Radar regulatorio**: la cartera europea de identidad (eIDAS 2) traerá
  verificación de edad estándar en ~2027; España (AEPD) empuja en la
  misma dirección. Diseñar el paso de verificación como módulo
  intercambiable para enchufarla cuando exista.

## 4. Vídeo de perfil y moderación

La decisión de infraestructura ya está tomada (ARQUITECTURA.md):
plataforma gestionada (Cloudflare Stream / api.video / Mux), subida
directa firmada, 30 s / 720p máximo, reproducción con URL firmada.
Aquí, el pipeline de contenido:

```
grabar (solo cámara en vivo, sin galería)      ← menos catfish, menos porno reciclado
  → subida directa a la plataforma (estado: pendiente)
  → webhook «vídeo listo»
  → filtro automático sobre fotogramas (nudity/violence score)
       · score alto  → rechazo automático con motivo
       · score medio → cola humana con prioridad
       · score bajo  → cola humana normal
  → revisión humana SIEMPRE antes de publicar (la promesa es «gente
    de verdad», y en revisión de tiendas es nuestro mejor argumento)
  → publicado | rechazado con motivo concreto y regrabación
```

- Proveedor del filtro automático a cotizar: Hive, Sightengine o AWS
  Rekognition (~1–3 €/1.000 imágenes analizadas; 3 fotogramas por
  vídeo). El humano es el caro: presupuestar horas de moderación desde
  el día 1 (fundadores al principio, con SLA interno < 4 h en horario
  razonable — un perfil no visible no puede esperar días).
- **Perfil sin vídeo aprobado = perfil invisible en la ventana.** Sin
  excepciones, también para el equipo.
- **Reportes**: cola aparte con SLA 24 h. Estrategia de strikes:
  contenido explícito o insistir tras un no → fuera a la primera (las
  normas ya lo prometen); el resto, un aviso y a la segunda fuera.
  Al reportar una conversación, el reportante adjunta la conversación:
  la discreción («lo que pasa en DTF se queda en DTF») cede ante la
  seguridad, y así se explica en las condiciones.
- **Pantallazos**: en Android se bloquean (FLAG_SECURE); en iOS no se
  puede bloquear, solo detectar y avisar («aquí no se hace»). La norma
  hace el resto. No prometer bloqueo total: prometer consecuencias.

## 5. Stack de la app

- **Móvil: React Native + Expo.** Un código para las dos tiendas, el
  equipo ya vive en JS, cámara/vídeo maduros (vision-camera), push vía
  APNs/FCM y actualizaciones OTA para retocar copy/moderación sin pasar
  por revisión de tienda cada vez. Flutter sería igual de válido; se
  elige RN por continuidad de lenguaje con el backend. Nativo puro x2:
  no con este tamaño de equipo.
- **Backend: Node** (continuidad con el waitlist), pero la app ya
  justifica dependencias: **Postgres** en vez de SQLite (la ventana es
  un pico de escrituras concurrentes por diseño), **WebSockets** para
  el chat en vivo, y colas simples en Postgres para moderación y
  webhooks. El servidor del waitlist se queda como está: hace su
  trabajo.
- **Push**: APNs + FCM directos (o Expo Push como atajo v1). El aviso
  de ventana es EL momento del producto: probar entrega real en
  ambas plataformas antes de la primera ventana con usuarios.
- **Backoffice de moderación**: web interna (puede ser HTML servido
  por el propio backend, como la landing: sin framework hasta que
  duela). Colas de vídeo y reportes, botones grandes, log de auditoría.

## 6. Métricas de la beta (las que deciden v2)

1. % de avisados que abren la app durante la ventana (salud del aviso).
2. % de activos en ventana que hacen ≥1 match (densidad/matching).
3. % de matches con plan aceptado antes del cierre (LA métrica: mide
   si la escasez produce decisión, que es la tesis del producto).
4. Reportes por 1.000 usuarios activos y tiempo de resolución
   (salud/seguridad — si sube, lo demás no importa).
5. Retención ventana a ventana (¿vuelven al siguiente aviso?).

## 7. Riesgos, por orden de miedo

1. **Rechazo de tienda** → ficha aséptica, moderación demostrable,
   rating 17+/18+, plan B PWA (§0).
2. **Densidad insuficiente** (la ventana abre y no hay nadie) → umbral
   de lanzamiento, una sola ventana nacional, ciudades cerradas hasta
   tener masa (§1).
3. **Incidente de seguridad/contenido** → moderación previa, sin fotos
   en chat v1, strikes duros, SLA de reportes (§4).
4. **Coste de verificación** mata el CAC → mezcla facial/documental y
   verificar solo al entrar a la primera ventana, no al descargar (§3).
5. **La mecánica no convierte** (matches sin plan) → la métrica 3
   decide: si tras 6–8 ventanas el plan aceptado no despega, se toca la
   mecánica del plan, no la de la ventana.

## 8. Decisiones abiertas (del responsable, no técnicas)

- [ ] Umbral de confirmados para la primera ventana (propuesta: 2.000).
- [ ] Presupuesto de verificación de edad y proveedor (pedir 3 cotizaciones).
- [ ] Quién modera al principio y en qué horario (fundadores + SLA).
- [ ] Fecha objetivo de beta (condiciona todo el calendario anterior).
- [ ] Asesoría legal también para condiciones de la app (no solo web):
      consentimiento, cesión de conversaciones reportadas, expulsiones.
