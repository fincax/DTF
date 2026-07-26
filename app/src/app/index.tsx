/* Arranque: la puerta de edad decide. Como en la web, fail-closed:
   sin marca guardada, a la puerta. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Arranque() {
  const [pasada, setPasada] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('dtf-gate-ok')
      .then((v) => setPasada(v === '1'))
      .catch(() => setPasada(false));
  }, []);

  if (pasada === null) return null;
  return <Redirect href={pasada ? '/(tabs)/ventana' : '/puerta'} />;
}
