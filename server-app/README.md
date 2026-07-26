# DTF. — Backend de la app

Node + Postgres + WebSockets, como fija `../PRODUCTO.md` §5. Es un
servicio aparte del waitlist (`../server/`, que sigue funcionando solo y
sin dependencias): la app tiene picos de escritura concurrentes por
diseño —todo el mundo entra a la vez— y eso pide Postgres.

Contrato completo de la API en [`CONTRATO.md`](CONTRATO.md).

## Qué implementa

- **Acceso** por enlace mágico → sesión Bearer de 90 días.
- **Onboarding** con los cuatro pasos de PRODUCTO.md §2: verificación de
  edad (solo el resultado, nunca biometría ni documento), datos básicos,
  identidad/orientación, «qué buscas» y vídeo de 30 s.
- **Vídeo**: URL de subida directa firmada (el fichero nunca toca este
  servidor), webhook de la plataforma, filtro automático y **cola de
  revisión humana siempre antes de publicar**.
- **Ventana**: `GET /window`, deck filtrado, like/pass y match.
- **Plan y chat**: propuesta con sitio y hora, aceptación y mensajes por
  WebSocket, solo mientras el match esté vivo.
- **Muerte por cierre**: barrido cada minuto que mata los matches sin
  plan aceptado y borra sus mensajes; con plan, 24 h de prórroga.
- **Seguridad**: reportar, bloquear (mata el match) y expulsar.
- **RGPD**: export y borrado real, incluido el vídeo en la plataforma.

## Probar en local

```bash
npm install
createdb dtf_app                      # o DATABASE_URL a tu Postgres
node server.js                        # migra el esquema al arrancar
node cli.js ventana abrir 2026-08-01T23:58:00+02:00
```

Sin `BREVO_API_KEY` los emails van a `data/outbox.log` (mismo modo log
que el waitlist), así se prueba el acceso sin enviar nada.

## Variables de entorno

```
PORT=8788
DATABASE_URL=postgres://usuario:clave@localhost/dtf_app
APP_URL=dtf://                  # esquema de la app para los enlaces de acceso
VIDEO_HOOK_SECRET=…             # cabecera X-DTF-Secret del webhook
VIDEO_UPLOAD_BASE=…             # base de subida de la plataforma
VIDEO_API_URL=…                 # para purgar el vídeo al borrar la cuenta
VIDEO_API_KEY=…
AUTO_RECHAZO=0.9                # score del filtro por encima del cual se rechaza solo
RATE_LINK=5                     # enlaces de acceso por IP y 10 min
BREVO_API_KEY=…                 # sin ella, modo log
```

## Administración

```bash
node cli.js ventana abrir <ISO8601>   # abre (no deja dos a la vez)
node cli.js ventana cerrar            # cierra y barre los matches sin plan
node cli.js ventana estado
node cli.js mod <email>               # da rol de moderación
node cli.js cola                      # pendientes de vídeo y reportes
node cli.js stats                     # incluye % de matches con plan aceptado
```

`stats` da la métrica que decide la v2 (PRODUCTO.md §6.3): si la
escasez produce decisión o no.

## Desplegar

Mismo VPS que el waitlist, con Postgres al lado:

```bash
sudo apt-get install -y postgresql
sudo -u postgres createuser dtf --pwprompt && sudo -u postgres createdb -O dtf dtf_app
# servicio systemd igual que ../server/README.md, con DATABASE_URL en /etc/dtf-app.env
```

El esquema se aplica solo al arrancar (`schema.sql` es idempotente).
Copia de seguridad diaria: `pg_dump dtf_app | gzip > …`.

**Antes de la primera ventana con usuarios reales**: elegir plataforma
de vídeo y proveedor de verificación de edad en firme, y comprobar la
entrega de push en iOS y Android — el aviso es el momento del producto.

## Pendiente

- Push (APNs/FCM): el aviso único de apertura de ventana.
- Backoffice web de moderación sobre estos endpoints (`/mod/*`).
- Llamada real a la plataforma de vídeo (hoy es un stub configurable).
