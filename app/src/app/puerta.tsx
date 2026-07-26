/* Puerta de edad: primera pantalla, roja, sin escapatoria ambigua.
   Es un gesto de UX — la verificación de edad de verdad (PRODUCTO.md
   §3) llega en el onboarding, antes de la primera ventana. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Logo } from '../ui/componentes';
import { c, f, GUTTER } from '../ui/tokens';

export default function Puerta() {
  async function aceptar() {
    try { await AsyncStorage.setItem('dtf-gate-ok', '1'); } catch {}
    router.replace('/(tabs)/ventana');
  }

  return (
    <SafeAreaView style={s.pantalla}>
      <Logo tam={32} claro />
      <View style={s.centro}>
        <Text style={s.titulo}>Aquí dentro todos son mayores.</Text>
        <Text style={s.sub}>¿Tú también?</Text>
      </View>
      <View style={s.acciones}>
        <Boton tipo="tinta" grande onPress={aceptar}>Sí, tengo 18 o más</Boton>
        <Boton tipo="fantasma" grande onPress={() => Linking.openURL('https://www.google.com')}>
          No — sácame de aquí
        </Boton>
        <Text style={s.legal}>
          Al entrar aceptas las normas de la casa y la política de privacidad.
          Sin pantallazos: la discreción es mutua.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.accent, padding: GUTTER, paddingTop: 28 },
  centro: { flex: 1, justifyContent: 'center', gap: 14 },
  titulo: { fontFamily: f.extra, fontSize: 42, lineHeight: 44, letterSpacing: -0.5, color: c.bg },
  sub: { fontFamily: f.semi, fontSize: 24, color: c.ink },
  acciones: { gap: 12 },
  /* Texto pequeño sobre el rojo: solo el negro puro pasa AA */
  legal: { fontFamily: f.regular, fontSize: 12.5, lineHeight: 19, color: '#000', marginTop: 6 },
});
