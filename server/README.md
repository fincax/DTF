# DTF. — Servidor del waitlist

Un solo proceso Node **sin dependencias** (HTTP, SQLite y fetch vienen con
Node ≥ 22.13): sirve la web estática y la API del waitlist con doble
opt-in, baja de un clic, sesión por enlace mágico y estado de la ventana.

## Qué expone

| Ruta | Qué hace |
| --- | --- |
| `GET  /api/window` | `{ open, closesAt }` — la landing lo consume al cargar |
| `POST /api/waitlist` | Alta: valida, guarda sin confirmar y envía el doble opt-in. 204 siempre (no revela quién está) |
| `POST /api/waitlist/confirm` | Cierra el doble opt-in (`{ token }`). 410 si caducó |
| `POST /api/waitlist/unsubscribe` | Borra de verdad (token de email o sesión del panel) |
| `POST /api/session/link` | Envía el enlace mágico de acceso (caduca en 15 min) |
| `GET  /api/session/start?token=` | Aterrizaje del enlace: crea la cookie y redirige a `/panel/` |
| `GET/PATCH /api/me` | Datos y preferencias del panel |
| `GET  /api/me/export` | Portabilidad RGPD (descarga JSON) |
| `POST /api/session/close` | Cierra sesión |

Todo lo demás se sirve como estático desde la raíz del repo, con lista
blanca: `/server`, `/.git` y los `.md` no se sirven nunca.

Detalles de diseño: rate limit por IP en memoria, tokens SHA-256 en base
(la BD robada no sirve para suplantar enlaces), cookies `HttpOnly` +
`SameSite=Lax` (+`Secure` con HTTPS), comprobación de `Origin` en los
POST, y en los logs ni IPs, ni emails, ni querys (los tokens viajan ahí).

## Variables de entorno

```
PORT=8787                  # puerto local (detrás del proxy)
HOST=127.0.0.1             # no exponer Node directamente
BASE_URL=https://dtf.app   # se usa en los enlaces de los emails
DATA_DIR=/var/lib/dtf      # dónde vive dtf.db (fuera del repo)
TRUST_PROXY=1              # leer la IP de X-Forwarded-For (proxy delante)
BREVO_API_KEY=xkeysib-…    # sin ella: modo log (data/outbox.log)
EMAIL_FROM="DTF. <aviso@dtf.app>"
```

Sin `BREVO_API_KEY` no se envía nada: los emails se escriben en
`DATA_DIR/outbox.log`, lo que permite probar el flujo entero en local.

## Probar en local

```bash
node server/server.js
# abre http://127.0.0.1:8787 — apúntate y mira server/data/outbox.log:
# ahí están los enlaces de confirmación, acceso y baja.
node server/cli.js window open 2026-08-01T23:58:00+02:00   # franja "abierto"
```

## Administración (CLI)

```bash
node server/cli.js stats                # total, confirmados, por ciudad
node server/cli.js window show
node server/cli.js window open <ISO8601> [--avisar]   # abre y (opcional) avisa a todos
node server/cli.js window close
node server/cli.js avisar               # reenvía el aviso de ventana abierta
```

## Desplegar en clouding.io

Servidor Ubuntu 24.04 pequeño (el flujo es email, no vídeo: con 1 vCPU /
1 GB sobra). Pasos:

```bash
# 1. Node 22 LTS (>= 22.13, trae node:sqlite)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs caddy

# 2. Código y datos
sudo git clone <repo> /opt/dtf
sudo mkdir -p /var/lib/dtf && sudo chown www-data: /var/lib/dtf

# 3. Servicio systemd — /etc/systemd/system/dtf.service
```

```ini
[Unit]
Description=DTF. waitlist
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/dtf/server
EnvironmentFile=/etc/dtf.env
ExecStart=/usr/bin/node --no-warnings server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# 4. Secretos en /etc/dtf.env (BASE_URL, DATA_DIR, BREVO_API_KEY…)
sudo chmod 600 /etc/dtf.env
sudo systemctl enable --now dtf

# 5. TLS con Caddy — /etc/caddy/Caddyfile (certificado automático):
#      dtf.app {
#        reverse_proxy 127.0.0.1:8787
#      }
sudo systemctl reload caddy
```

**Copia de seguridad**: la lista entera es un fichero. Un cron diario
basta:

```bash
sqlite3 /var/lib/dtf/dtf.db ".backup /var/backups/dtf-$(date +%F).db"
```

**Actualizar**: `git pull` en `/opt/dtf` y `systemctl restart dtf`.
