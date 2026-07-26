/* Perfil: lo que se ve de ti cuando la ventana abre. Datos reales del
   servidor; el estado del vídeo manda (sin aprobar, no se te ve). */

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSesion } from '../../sesion';
import { Boton, Cuerpo, Kicker, Logo, MetaLabel, Titulo } from '../../ui/componentes';
import { c, f, GUTTER, RULE } from '../../ui/tokens';

const ESTADO_VIDEO: Record<string, { titulo: string; texto: string }> = {
  subiendo: { titulo: 'Sin grabar', texto: 'Cámara en vivo, sin galería. 30 segundos.' },
  pendiente: { titulo: 'En revisión', texto: 'Lo está mirando una persona. Hasta que pase, no se te ve en la ventana.' },
  aprobado: { titulo: 'Aprobado', texto: 'Publicado. Esto es lo que ve quien te encuentra.' },
  rechazado: { titulo: 'Rechazado', texto: 'No cumple las normas de la casa. Graba otro cuando quieras.' },
};

export default function PantallaPerfil() {
  const { yo } = useSesion();
  const p = yo?.perfil;
  const estado = ESTADO_VIDEO[yo?.video?.estado ?? 'subiendo'];
  const edad = p?.anio_nac ? new Date().getFullYear() - p.anio_nac : null;

  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.cabecera}><Logo /></View>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Kicker rojo>Tu perfil</Kicker>
        <Titulo style={{ marginTop: 12 }}>Lo que se ve cuando abre.</Titulo>

        <View style={s.bloque}>
          <MetaLabel>Tu vídeo · 30 segundos</MetaLabel>
          <View style={[s.video, yo?.video?.estado === 'aprobado' && { borderStyle: 'solid' }]}>
            <Text style={s.videoTitulo}>{estado.titulo}</Text>
            <Text style={s.videoTexto}>{yo?.video?.motivo || estado.texto}</Text>
          </View>
          <View style={{ marginTop: 14 }}>
            <Boton tipo={yo?.video?.estado === 'aprobado' ? 'secundario' : 'primario'}
              onPress={() => router.push('/onboarding')}>
              {yo?.video?.estado === 'aprobado' ? 'Grabar otro' : 'Grabar mi vídeo'}
            </Boton>
          </View>
        </View>

        <View style={s.bloque}>
          <MetaLabel>Qué buscas</MetaLabel>
          <Text style={s.busco}>{p?.busco ? `«${p.busco}»` : 'Todavía no lo has dicho.'}</Text>
        </View>

        <View style={s.bloque}>
          <MetaLabel>Tus datos</MetaLabel>
          <Text style={s.dato}>{p?.nombre || '—'}{edad ? `, ${edad}` : ''}</Text>
          <Cuerpo style={{ marginTop: 4 }}>
            {[p?.ciudad, p?.identidad, p?.orientacion].filter(Boolean).join(' · ') || '—'}
          </Cuerpo>
          <Cuerpo style={{ marginTop: 10 }}>
            {yo?.edadVerificada ? 'Edad verificada.' : 'Edad sin verificar.'}
          </Cuerpo>
          <View style={{ marginTop: 14 }}>
            <Boton tipo="secundario" onPress={() => router.push('/onboarding')}>Cambiar mis datos</Boton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  cabecera: { paddingHorizontal: GUTTER, paddingVertical: 14, borderBottomWidth: RULE, borderBottomColor: c.ink },
  cuerpo: { padding: GUTTER, paddingTop: 32, paddingBottom: 48 },
  bloque: { marginTop: 32, borderTopWidth: RULE, borderTopColor: c.ink, paddingTop: 18 },
  video: {
    marginTop: 12, aspectRatio: 9 / 12, maxHeight: 240,
    borderWidth: RULE, borderColor: c.ink, borderStyle: 'dashed',
    backgroundColor: c.surface, justifyContent: 'flex-end', padding: 16,
  },
  videoTitulo: { fontFamily: f.extra, fontSize: 20, color: c.ink },
  videoTexto: { fontFamily: f.regular, fontSize: 13.5, lineHeight: 20, color: c.ink3, marginTop: 4 },
  busco: { fontFamily: f.semi, fontSize: 17, lineHeight: 25, color: c.ink, marginTop: 10 },
  dato: { fontFamily: f.extra, fontSize: 22, color: c.ink, marginTop: 10 },
});
