/* Perfil: los tres bloques del onboarding v1 como huecos honestos.
   Regla dura de PRODUCTO.md: sin vídeo aprobado, el perfil no se
   muestra en la ventana. */

import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Cuerpo, Kicker, Logo, MetaLabel, Titulo } from '../../ui/componentes';
import { c, f, GUTTER, RULE } from '../../ui/tokens';

const v1 = () => Alert.alert('Todavía no', 'Esto llega con el backend de la app (v1).');

export default function PantallaPerfil() {
  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.cabecera}><Logo /></View>
      <ScrollView contentContainerStyle={s.cuerpo}>
        <Kicker rojo>Tu perfil</Kicker>
        <Titulo style={{ marginTop: 12 }}>Lo que se ve cuando abre.</Titulo>

        <View style={s.bloque}>
          <MetaLabel>Tu vídeo · 30 segundos</MetaLabel>
          <View style={s.videoHueco}>
            <Text style={s.videoTexto}>
              Sin grabar.{'\n'}Solo cámara en vivo, sin galería.
            </Text>
          </View>
          <Cuerpo style={{ marginTop: 10 }}>
            Pasa por revisión (automática y humana) antes de publicarse.
            Sin vídeo aprobado, tu perfil no se muestra en la ventana.
          </Cuerpo>
          <View style={{ marginTop: 14 }}>
            <Boton tipo="primario" onPress={v1}>Grabar mi vídeo</Boton>
          </View>
        </View>

        <View style={s.bloque}>
          <MetaLabel>Qué buscas</MetaLabel>
          <Cuerpo style={{ marginTop: 8 }}>
            Con palabras, sin acertijos. Campo obligatorio: lista de
            opciones más texto libre (moderado).
          </Cuerpo>
          <View style={{ marginTop: 14 }}>
            <Boton tipo="secundario" onPress={v1}>Decirlo claro</Boton>
          </View>
        </View>

        <View style={s.bloque}>
          <MetaLabel>Identidad y orientación</MetaLabel>
          <Cuerpo style={{ marginTop: 8 }}>
            Opciones de sobra desde el primer día. Tú decides quién eres
            y quién te ve.
          </Cuerpo>
          <View style={{ marginTop: 14 }}>
            <Boton tipo="secundario" onPress={v1}>Elegir</Boton>
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
  videoHueco: {
    marginTop: 12,
    aspectRatio: 9 / 12,
    maxHeight: 260,
    borderWidth: RULE,
    borderColor: c.ink,
    borderStyle: 'dashed',
    backgroundColor: c.surface,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 14,
  },
  videoTexto: { fontFamily: f.semi, fontSize: 13, lineHeight: 19, color: c.meta },
});
