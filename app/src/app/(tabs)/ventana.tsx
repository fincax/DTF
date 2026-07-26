/* La pantalla principal: el estado de la ventana. Cerrado casi
   siempre — y esa es la gracia. Los dos estados están maquetados;
   el deck de gente (v1) ocupará el hueco marcado cuando exista
   el backend de la app. */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton, Cuerpo, Kicker, Lead, Logo, MetaLabel, Titulo } from '../../ui/componentes';
import { c, f, GUTTER, RULE } from '../../ui/tokens';
import { formatoCuenta, useVentana } from '../../ventana';

function Franja() {
  const { ventana, segundosRestantes } = useVentana();
  if (ventana.open) {
    return (
      <View style={[s.franja, { backgroundColor: c.accentBtn }]}>
        <View style={[s.punto, { backgroundColor: c.bg }]} />
        <Text style={s.franjaTexto}>
          ABIERTO — CIERRA EN {segundosRestantes != null ? formatoCuenta(segundosRestantes) : '—'}
        </Text>
      </View>
    );
  }
  return (
    <View style={[s.franja, { backgroundColor: c.ink }]}>
      <View style={[s.punto, { backgroundColor: c.accentDark }]} />
      <Text style={s.franjaTexto}>CERRADO — LA PRÓXIMA VENTANA NO SE ANUNCIA</Text>
    </View>
  );
}

function Cerrado() {
  return (
    <View style={s.cuerpo}>
      <Kicker rojo>La ventana</Kicker>
      <Titulo style={{ marginTop: 12 }}>Ahora mismo está cerrado. Por eso funciona.</Titulo>
      <Lead style={{ marginTop: 16 }}>
        Sin horario, sin patrón, sin avisar. Cuando abra, te llegará una
        notificación — una sola. Hasta entonces, no hay nada que mirar.
      </Lead>

      <View style={s.tarjeta}>
        <MetaLabel>Mientras tanto</MetaLabel>
        <Cuerpo style={{ marginTop: 8 }}>
          Ten el perfil listo: el vídeo aprobado y lo que buscas dicho con
          palabras. Cuando suene el aviso no habrá tiempo de arreglarse.
        </Cuerpo>
      </View>

      <View style={s.pieMarca}>
        <Logo tam={56} />
        <Text style={s.lema}>ABIERTO CUANDO TOCA</Text>
      </View>
    </View>
  );
}

function Abierto() {
  return (
    <View style={s.cuerpo}>
      <Kicker rojo>La ventana</Kicker>
      <Titulo style={{ marginTop: 12 }}>Está abierto. Ahora o a la próxima.</Titulo>
      <Lead style={{ marginTop: 16 }}>
        Todo el mundo está dentro a la vez. Lo que no se aproveche antes
        del cierre, caduca.
      </Lead>

      {/* Hueco del deck v1: tarjetas de vídeo con filtros
          (ciudad, edad, qué buscas). Contrato pendiente del
          backend de la app. */}
      <View style={[s.tarjeta, s.hueco]}>
        <MetaLabel>Aquí va la gente</MetaLabel>
        <Cuerpo style={{ marginTop: 8 }}>
          Deck de perfiles en vídeo (30 s), filtros de ciudad, edad y qué
          buscas. Llega con el backend de la app — este esqueleto ya sabe
          cuándo está abierta la ventana de verdad.
        </Cuerpo>
      </View>

      <View style={{ marginTop: 24 }}>
        <Boton tipo="secundario" onPress={() => {}}>Ver quién está — próximamente</Boton>
      </View>
    </View>
  );
}

export default function PantallaVentana() {
  const { ventana } = useVentana();
  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.cabecera}>
        <Logo />
      </View>
      <Franja />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {ventana.open ? <Abierto /> : <Cerrado />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  cabecera: {
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
    borderBottomWidth: RULE,
    borderBottomColor: c.ink,
  },
  franja: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 11 },
  punto: { width: 10, height: 10 },
  franjaTexto: { fontFamily: f.semi, fontSize: 12.5, letterSpacing: 1.6, color: '#fff' },
  cuerpo: { flex: 1, padding: GUTTER, paddingTop: 32 },
  tarjeta: {
    marginTop: 28,
    borderWidth: RULE,
    borderColor: c.ink,
    backgroundColor: c.surfaceAlt,
    padding: 18,
  },
  hueco: { borderStyle: 'dashed', backgroundColor: c.surface },
  pieMarca: { flex: 1, justifyContent: 'flex-end', paddingTop: 40, paddingBottom: 12 },
  lema: { fontFamily: f.semi, fontSize: 13, letterSpacing: 4, color: c.ink3, marginTop: 10 },
});
