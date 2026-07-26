/* Estado de la ventana: la fuente de verdad es el servidor
   (GET /api/app/window). El cliente solo pinta; si no hay respuesta,
   el estado seguro es «cerrado». */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';

type Estado = { open: boolean; closesAt: string | null };
type Ctx = { ventana: Estado; segundosRestantes: number | null; recarga: () => void };

const VentanaCtx = createContext<Ctx>({
  ventana: { open: false, closesAt: null }, segundosRestantes: null, recarga: () => {},
});

export function VentanaProvider({ children }: { children: React.ReactNode }) {
  const [ventana, setVentana] = useState<Estado>({ open: false, closesAt: null });
  const [segundosRestantes, setSegundos] = useState<number | null>(null);
  const cierre = useRef<number | null>(null);
  const [tic, setTic] = useState(0);

  useEffect(() => {
    let vivo = true;
    async function consulta() {
      try {
        const { status, datos } = await api<Estado>('/window');
        if (!vivo || status !== 200 || !datos) return;
        cierre.current = datos.open && datos.closesAt ? new Date(datos.closesAt).getTime() : null;
        setVentana(datos);
      } catch {
        /* sin red: se queda como está (cerrado al arrancar) */
      }
    }
    consulta();
    const sondeo = setInterval(consulta, 60_000);
    return () => { vivo = false; clearInterval(sondeo); };
  }, [tic]);

  useEffect(() => {
    const reloj = setInterval(() => {
      if (cierre.current == null) { setSegundos(null); return; }
      const s = Math.max(0, Math.round((cierre.current - Date.now()) / 1000));
      setSegundos(s);
      if (s === 0) {
        cierre.current = null;
        setVentana({ open: false, closesAt: null });
      }
    }, 1000);
    return () => clearInterval(reloj);
  }, []);

  return (
    <VentanaCtx.Provider value={{ ventana, segundosRestantes, recarga: () => setTic((t) => t + 1) }}>
      {children}
    </VentanaCtx.Provider>
  );
}

export const useVentana = () => useContext(VentanaCtx);

export function formatoCuenta(s: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
