/* Ajustes: las promesas de las normas y del RGPD, en filas.
   Lo que se puede cumplir ya, se cumple contra el servidor. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api';
import { useSesion } from '../../sesion';
import { Kicker, Logo, Titulo } from '../../ui/componentes';
import { c, f, GUTTER, RULE } from '../../ui/tokens';

function Fila({ titulo, detalle, rojo, onPress }: {
  titulo: string; detalle?: string; rojo?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [s.fila, pressed && { backgroundColor: c.hoverNeutral }]}>
      <Text style={[s.filaTitulo, rojo && { color: c.accentPress }]}>{titulo}</Text>
      {detalle ? <Text style={s.filaDetalle}>{detalle}</Text> : null}
    </Pressable>
  );
}

export default function PantallaAjustes() {
  const { yo, refresca, sal } = useSesion();

  async function pausa() {
    const nuevo = !yo?.pausado;
    await api('/me/pause', { metodo: 'POST', cuerpo: { pausado: nuevo } });
    await refresca();
    Alert.alert(nuevo ? 'En pausa.' : 'De vuelta.',
      nuevo ? 'No apareces en la ventana hasta que vuelvas.' : 'Vuelves a aparecer en la próxima ventana.');
  }

  function borra() {
    Alert.alert('¿Seguro?', 'Se borra tu cuenta, tu vídeo y tus matches. De verdad: no guardamos copia.', [
      { text: 'No, me quedo', style: 'cancel' },
      {
        text: 'Sí, borradlo todo', style: 'destructive',
        onPress: async () => {
          await api('/me', { metodo: 'DELETE' });
          await sal();
          router.replace('/');
        },
      },
    ]);
  }

  async function cierraSesion() {
    await sal();
    router.replace('/');
  }

  async function reiniciaPuerta() {
    try { await AsyncStorage.removeItem('dtf-gate-ok'); } catch {}
    router.replace('/puerta');
  }

  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.cabecera}><Logo /></View>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Kicker rojo>Ajustes</Kicker>
        <Titulo style={{ marginTop: 12 }}>Poca cosa, a propósito.</Titulo>
        <Text style={s.email}>{yo?.email}</Text>

        <View style={{ marginTop: 24 }}>
          <Fila titulo="Normas de la casa" detalle="Cinco. Ninguna negociable."
            onPress={() => Alert.alert('Normas de la casa',
              '01 Solo sí es sí.\n02 Un no no se negocia.\n03 Nada sin permiso.\n04 Sin pantallazos.\n05 Bloquea sin dar explicaciones.\n\nUn equipo humano revisa cada reporte.')} />
          <Fila titulo="Notificaciones" detalle="Una por ventana. No hay más que configurar."
            onPress={() => Alert.alert('Una y basta', 'Solo enviamos el aviso de apertura. Ni rachas, ni «alguien ha visto tu perfil».')} />
          <Fila titulo={yo?.pausado ? 'Reactivar mi cuenta' : 'Pausar mi cuenta'}
            detalle={yo?.pausado ? 'Ahora mismo no apareces en la ventana.' : 'Desapareces de la ventana hasta que vuelvas.'}
            onPress={pausa} />
          <Fila titulo="Descargar mis datos" detalle="Todo lo que hay, que es poco."
            onPress={async () => {
              const { datos } = await api('/me/export');
              Alert.alert('Tus datos', JSON.stringify(datos, null, 1).slice(0, 700));
            }} />
          <Fila titulo="Cerrar sesión" onPress={cierraSesion} />
          <Fila titulo="Borrar mi cuenta" detalle="De verdad: vídeo incluido, sin copia." rojo onPress={borra} />
          <Fila titulo="Volver a la puerta de edad" detalle="Solo desarrollo." onPress={reiniciaPuerta} />
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
  email: { fontFamily: f.regular, fontSize: 14, color: c.meta, marginTop: 12 },
  fila: { borderTopWidth: RULE, borderTopColor: c.ink, paddingVertical: 16 },
  filaTitulo: { fontFamily: f.semi, fontSize: 17, color: c.ink },
  filaDetalle: { fontFamily: f.regular, fontSize: 13.5, color: c.ink3, marginTop: 3 },
  pie: { fontFamily: f.regular, fontSize: 13, color: c.meta, marginTop: 36 },
});
