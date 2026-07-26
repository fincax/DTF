# DTF. — App (esqueleto)

Expo (React Native + TypeScript, expo-router), según lo fijado en
`../PRODUCTO.md` §5. Sistema de diseño portado de la web: cero radius,
reglas de 2px, Archivo empaquetada (sin peticiones a terceros), rojos
AA (`../CLAUDE.md`).

## Qué hay

- `src/app/puerta.tsx` — puerta de edad (gesto UX; la verificación real
  llega en el onboarding, PRODUCTO.md §3).
- `src/app/(tabs)/` — Ventana (estados cerrado/abierto con cuenta
  atrás), Perfil (huecos de vídeo 30 s, «qué buscas», identidad) y
  Ajustes (filas RGPD y normas).
- `src/ventana.tsx` — estado de la ventana desde el servidor real:
  consume `GET /api/window`, el mismo contrato que la landing. Sondeo
  cada 60 s; sin red, cerrado (fail-closed).
- `src/ui/` — tokens y componentes del sistema.

## Probar

```bash
cd app && npm install

# contra el servidor del waitlist en local:
node ../server/server.js &
node ../server/cli.js window open 2026-08-01T23:58:00+02:00
EXPO_PUBLIC_API_URL=http://127.0.0.1:8787 npx expo start
```

Sin `EXPO_PUBLIC_API_URL` apunta a `https://dtf.app`. En un dispositivo
físico, usa la IP de tu máquina en vez de 127.0.0.1.

## Pendiente (en orden, según PRODUCTO.md)

1. Backend de la app (Node + Postgres + WebSockets) y su contrato.
2. Onboarding real: verificación de edad → identidad → qué buscas → vídeo.
3. Deck de la ventana, match, chat y plan.
4. Push (APNs/FCM): el aviso único por ventana.
5. Iconos y splash definitivos (cuadrado rojo como el favicon de la web).
