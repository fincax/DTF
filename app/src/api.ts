/* Cliente de la API de la app (server-app/CONTRATO.md).
   La sesión es un Bearer que se guarda en el dispositivo. */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL =
  process.env.EXPO_PUBLIC_APP_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? 'https://dtf.app';

const CLAVE = 'dtf-sesion';
let sesion: string | null = null;

export async function cargarSesion() {
  try { sesion = await AsyncStorage.getItem(CLAVE); } catch { sesion = null; }
  return sesion;
}

export async function guardarSesion(token: string | null) {
  sesion = token;
  try {
    if (token) await AsyncStorage.setItem(CLAVE, token);
    else await AsyncStorage.removeItem(CLAVE);
  } catch {}
}

export const haySesion = () => !!sesion;

type Opciones = { metodo?: string; cuerpo?: unknown };

export async function api<T = any>(ruta: string, { metodo = 'GET', cuerpo }: Opciones = {}):
  Promise<{ status: number; datos: T | null }> {
  const r = await fetch(`${API_URL}/api/app${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(sesion ? { authorization: `Bearer ${sesion}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const txt = await r.text();
  return { status: r.status, datos: txt ? (JSON.parse(txt) as T) : null };
}

/* Lo que la app necesita saber de ti para decidir qué pantalla toca. */
export type Yo = {
  email: string;
  rol: string;
  pausado: boolean;
  edadVerificada: boolean;
  perfil: null | {
    nombre?: string; anio_nac?: number; ciudad?: string;
    identidad?: string; orientacion?: string; busco?: string;
  };
  video: null | { id: number; estado: string; motivo: string | null };
  listo: boolean;
  falta: string[];
};
