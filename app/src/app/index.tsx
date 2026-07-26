/* Arranque: quién decide la pantalla, en orden.
   1. puerta de edad (fail-closed, como en la web)
   2. sesión
   3. onboarding mientras el servidor diga que falta algo
   4. la ventana */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSesion } from '../sesion';

export default function Arranque() {
  const [puertaOk, setPuertaOk] = useState<boolean | null>(null);
  const { yo, cargando, conSesion } = useSesion();

  useEffect(() => {
    AsyncStorage.getItem('dtf-gate-ok')
      .then((v) => setPuertaOk(v === '1'))
      .catch(() => setPuertaOk(false));
  }, []);

  if (puertaOk === null || cargando) return null;
  if (!puertaOk) return <Redirect href="/puerta" />;
  if (!conSesion) return <Redirect href="/entrar" />;
  if (yo && !yo.listo) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/ventana" />;
}
