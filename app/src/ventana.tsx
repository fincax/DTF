/* Estado de la ventana: la fuente de verdad es el servidor
   (GET /api/window, el mismo contrato que consume la landing).
   El cliente solo pinta; si el servidor no responde, el estado
   seguro es «cerrado». */

import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://dtf.app';

type Estado = { open: boolean; closesAt: string | null };
type Ctx = { ventana: Estado; segundosRestantes: number | null };

const VentanaCtx = createContext<Ctx>({ ventana: { open: false, closesAt: null }, segundosRestantes: null });

export function VentanaProvider({ children }: { children: React.ReactNode }) {
  const [ventana, setVentana] = useState<Estado>({ open: false, closesAt: null });
  const [segundosRestantes, setSegundos] = useState<number | null>(null);
  const cierre = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;
    async function consulta() {
      try {
        const r = await fetch(`${API_URL}/api/window`);
        if (!r.ok) throw new Error(String(r.status));
        const v = (await r.json()) as Estado;
        if (!vivo) return;
        cierre.current = v.open && v.closesAt ? new Date(v.closesAt).getTime() : null;
        setVentana(v);
      } catch {
        /* sin red o sin servidor: se queda como está (cerrado al arrancar) */
      }
    }
    consulta();
    const sondeo = setInterval(consulta, 60_000);
    return () => { vivo = false; clearInterval(sondeo); };
  }, []);

  useEffect(() => {
    const tic = setInterval(() => {
      if (cierre.current == null) { setSegundos(null); return; }
      const s = Math.max(0, Math.round((cierre.current - Date.now()) / 1000));
      setSegundos(s);
      if (s === 0) {
        cierre.current = null;
        setVentana({ open: false, closesAt: null });
      }
    }, 1000);
    return () => clearInterval(tic);
  }, []);

  return (
    <VentanaCtx.Provider value={{ ventana, segundosRestantes }}>
      {children}
    </VentanaCtx.Provider>
  );
}

export const useVentana = () => useContext(VentanaCtx);

export function formatoCuenta(s: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
