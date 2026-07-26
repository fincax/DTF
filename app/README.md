# DTF. — App (esqueleto)

Expo (React Native + TypeScript, expo-router), según lo fijado en
`../PRODUCTO.md` §5. Sistema de diseño portado de la web: cero radius,
reglas de 2px, Archivo empaquetada (sin peticiones a terceros), rojos
AA (`../CLAUDE.md`).

## Qué hay

Todo consume el backend real (`../server-app/`, contrato en
`../server-app/CONTRATO.md`). No hay mocks.

- `src/app/puerta.tsx` — puerta de edad (gesto UX; la verificación de
  verdad es el paso 1 del onboarding).
- `src/app/entrar.tsx` — acceso por enlace mágico. Mientras el enlace
  profundo (`dtf://entrar?token=`) no esté firmado en las tiendas, hay
  un campo para pegar el token: es la única forma de probar el circuito
  en el simulador.
- `src/app/onboarding.tsx` — los cinco pasos, **en el orden que dice el
  servidor** (`falta[]` de `GET /me`): edad → datos → identidad →
  qué buscas → vídeo. La app no decide por su cuenta si un perfil está
  listo, así no hay dos verdades.
- `src/app/(tabs)/` — Ventana (cerrado/abierto con cuenta atrás y deck
  con like/pass), Perfil (datos y estado real del vídeo) y Ajustes
  (pausar, export, borrado, normas).
- `src/api.ts` y `src/sesion.tsx` — cliente con sesión Bearer guardada
  en el dispositivo y estado de la cuenta.
- `src/ventana.tsx` — estado de la ventana (sondeo 60 s + cuenta atrás;
  sin red, cerrado: fail-closed).
- `src/ui/` — tokens, componentes y campos del sistema.

## Probar

```bash
cd app && npm install

# backend de la app en otra terminal (ver ../server-app/README.md)
node ../server-app/server.js
node ../server-app/cli.js ventana abrir 2026-08-01T23:58:00+02:00

EXPO_PUBLIC_APP_API_URL=http://127.0.0.1:8788 npx expo start
```

El enlace de acceso aparece en `../server-app/data/outbox.log` mientras
no haya `BREVO_API_KEY`. En un dispositivo físico, usa la IP de tu
máquina en vez de 127.0.0.1.

## Pendiente (en orden, según PRODUCTO.md)

1. Grabación real del vídeo (cámara en vivo, sin galería) y subida a la
   URL firmada que ya devuelve el backend; hoy el botón pide la URL pero
   no graba.
2. Reproductor del vídeo en el deck (URL firmada de la plataforma).
3. Matches, plan y chat en pantalla — el backend ya los sirve
   (WebSocket incluido).
4. Push (APNs/FCM): el aviso único por ventana.
5. Enlace profundo firmado para el acceso, y quitar el campo de token.
