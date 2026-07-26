/* Ajustes: las promesas RGPD y de las normas, como filas del sistema.
   Todo son huecos honestos hasta que exista el backend de la app. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Kicker, Logo, Titulo } from '../../ui/componentes';
import { c, f, GUTTER, RULE } from '../../ui/tokens';

const v1 = () => Alert.alert('Todavía no', 'Esto llega con el backend de la app (v1).');

function Fila({ titulo, detalle, rojo, onPress }: {
  titulo: string; detalle?: string; rojo?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.fila, pressed && { backgroundColor: c.hoverNeutral }]}
    >
      <Text style={[s.filaTitulo, rojo && { color: c.accentPress }]}>{titulo}</Text>
      {detalle ? <Text style={s.filaDetalle}>{detalle}</Text> : null}
    </Pressable>
  );
}

export default function PantallaAjustes() {
  async function reiniciarPuerta() {
    /* Útil en desarrollo: vuelve a mostrar la puerta de edad. */
    try { await AsyncStorage.removeItem('dtf-gate-ok'); } catch {}
    router.replace('/puerta');
  }

  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.cabecera}><Logo /></View>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Kicker rojo>Ajustes</Kicker>
        <Titulo style={{ marginTop: 12 }}>Poca cosa, a propósito.</Titulo>

        <View style={{ marginTop: 28 }}>
          <Fila titulo="Normas de la casa" detalle="Cinco. Ninguna negociable." onPress={v1} />
          <Fila titulo="Notificaciones" detalle="Una por ventana. No hay más que configurar." onPress={v1} />
          <Fila titulo="Pausar mi cuenta" detalle="Desapareces de la ventana hasta que vuelvas." onPress={v1} />
          <Fila titulo="Descargar mis datos" detalle="Todo lo que hay, que es poco." onPress={v1} />
          <Fila titulo="Borrar mi cuenta" detalle="De verdad: vídeo incluido, sin copia." rojo onPress={v1} />
          <Fila titulo="Volver a la puerta de edad" detalle="Solo desarrollo." onPress={reiniciarPuerta} />
        </View>

        <Text style={s.pie}>DTF. beta — Solo mayores de 18 años.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  cabecera: { paddingHorizontal: GUTTER, paddingVertical: 14, borderBottomWidth: RULE, borderBottomColor: c.ink },
  cuerpo: { padding: GUTTER, paddingTop: 32, paddingBottom: 48 },
  fila: { borderTopWidth: RULE, borderTopColor: c.ink, paddingVertical: 16 },
  filaTitulo: { fontFamily: f.semi, fontSize: 17, color: c.ink },
  filaDetalle: { fontFamily: f.regular, fontSize: 13.5, color: c.ink3, marginTop: 3 },
  pie: { fontFamily: f.regular, fontSize: 13, color: c.meta, marginTop: 36 },
});
