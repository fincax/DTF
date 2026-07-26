/* Sesión y estado de la cuenta: quién eres y qué te falta.
   La lista `falta` que devuelve el servidor es la que manda: la app
   no decide por su cuenta si un perfil está listo. */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, cargarSesion, guardarSesion, haySesion, type Yo } from './api';

type Ctx = {
  yo: Yo | null;
  cargando: boolean;
  conSesion: boolean;
  refresca: () => Promise<Yo | null>;
  entra: (session: string) => Promise<void>;
  sal: () => Promise<void>;
};

const SesionCtx = createContext<Ctx>({
  yo: null, cargando: true, conSesion: false,
  refresca: async () => null, entra: async () => {}, sal: async () => {},
});

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [yo, setYo] = useState<Yo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [conSesion, setConSesion] = useState(false);

  const refresca = useCallback(async () => {
    if (!haySesion()) { setYo(null); setConSesion(false); return null; }
    const { status, datos } = await api<Yo>('/me');
    if (status === 401) {          // sesión caducada o cuenta borrada
      await guardarSesion(null);
      setYo(null); setConSesion(false);
      return null;
    }
    setYo(datos); setConSesion(true);
    return datos;
  }, []);

  useEffect(() => {
    (async () => {
      await cargarSesion();
      await refresca().catch(() => {});
      setCargando(false);
    })();
  }, [refresca]);

  const entra = useCallback(async (session: string) => {
    await guardarSesion(session);
    await refresca();
  }, [refresca]);

  const sal = useCallback(async () => {
    await api('/auth/logout', { metodo: 'POST' }).catch(() => {});
    await guardarSesion(null);
    setYo(null); setConSesion(false);
  }, []);

  return (
    <SesionCtx.Provider value={{ yo, cargando, conSesion, refresca, entra, sal }}>
      {children}
    </SesionCtx.Provider>
  );
}

export const useSesion = () => useContext(SesionCtx);
