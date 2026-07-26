/* La pantalla principal. Cerrada casi siempre — y esa es la gracia.
   Abierta: el deck de quien está dentro ahora mismo. */

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api';
import { useSesion } from '../../sesion';
import { Boton, Cuerpo, Kicker, Lead, Logo, MetaLabel, Titulo } from '../../ui/componentes';
import { c, f, GUTTER, RULE } from '../../ui/tokens';
import { formatoCuenta, useVentana } from '../../ventana';

type Ficha = {
  id: number; nombre: string; anio_nac: number; ciudad: string;
  identidad: string; orientacion: string; busco: string; video_id: string;
};

function Franja() {
  const { ventana, segundosRestantes } = useVentana();
  return ventana.open ? (
    <View style={[s.franja, { backgroundColor: c.accentBtn }]}>
      <View style={[s.punto, { backgroundColor: c.bg }]} />
      <Text style={s.franjaTexto}>
        ABIERTO — CIERRA EN {segundosRestantes != null ? formatoCuenta(segundosRestantes) : '—'}
      </Text>
    </View>
  ) : (
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
      <Lead>
        Sin horario, sin patrón, sin avisar. Cuando abra te llegará una
        notificación — una sola. Hasta entonces, no hay nada que mirar.
      </Lead>
      <View style={s.tarjeta}>
        <MetaLabel>Mientras tanto</MetaLabel>
        <Cuerpo style={{ marginTop: 8 }}>
          Ten el perfil a punto. Cuando suene el aviso no habrá tiempo de arreglarse.
        </Cuerpo>
      </View>
      <View style={s.pieMarca}>
        <Logo tam={56} />
        <Text style={s.lema}>ABIERTO CUANDO TOCA</Text>
      </View>
    </View>
  );
}

function Ficha({ p, onLike, onPass, ocupado }: {
  p: Ficha; onLike: () => void; onPass: () => void; ocupado: boolean;
}) {
  const edad = new Date().getFullYear() - p.anio_nac;
  return (
    <View style={s.ficha}>
      {/* El vídeo se reproduce desde la plataforma con URL firmada.
          Hasta integrar el reproductor, el hueco lo dice claro. */}
      <View style={s.video}>
        <MetaLabel>Vídeo · 30 s</MetaLabel>
      </View>
      <View style={{ padding: 18 }}>
        <Text style={s.fichaNombre}>{p.nombre}, {edad}</Text>
        <Text style={s.fichaMeta}>
          {p.ciudad[0].toUpperCase() + p.ciudad.slice(1)} · {p.identidad} · {p.orientacion}
        </Text>
        <Text style={s.fichaBusco}>«{p.busco}»</Text>
        <View style={{ marginTop: 18, gap: 10 }}>
          <Boton tipo="primario" onPress={ocupado ? undefined : onLike}>Me interesa</Boton>
          <Boton tipo="secundario" onPress={ocupado ? undefined : onPass}>Paso</Boton>
        </View>
      </View>
    </View>
  );
}

function Abierto() {
  const [gente, setGente] = useState<Ficha[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carga = useCallback(async () => {
    setError(null);
    const { status, datos } = await api<{ gente: Ficha[] }>('/deck');
    if (status === 200 && datos) setGente(datos.gente);
    else if (status === 409) setGente([]);
    else setError('No hemos podido cargar la ventana.');
  }, []);

  useEffect(() => { carga().catch(() => setError('Sin conexión.')); }, [carga]);

  async function decide(p: Ficha, gusta: boolean) {
    setOcupado(true);
    try {
      const { datos } = await api<{ match: { id: number } | null }>(
        `/deck/${p.id}/${gusta ? 'like' : 'pass'}`, { metodo: 'POST' }
      );
      setGente((g) => (g || []).filter((x) => x.id !== p.id));
      if (datos?.match) {
        Alert.alert('Match.', `Con ${p.nombre}. Proponed un plan antes del cierre o se pierde.`);
      }
    } finally {
      setOcupado(false);
    }
  }

  const actual = gente?.[0];

  return (
    <View style={s.cuerpo}>
      <Kicker rojo>La ventana</Kicker>
      <Titulo style={{ marginTop: 12 }}>Está abierto. Ahora o a la próxima.</Titulo>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {actual ? (
        <Ficha p={actual} ocupado={ocupado}
          onLike={() => decide(actual, true)} onPass={() => decide(actual, false)} />
      ) : gente ? (
        <View style={s.tarjeta}>
          <MetaLabel>Se acabó por ahora</MetaLabel>
          <Cuerpo style={{ marginTop: 8 }}>
            Ya has visto a quien está dentro. Si entra alguien más, aparecerá aquí
            — la ventana sigue abierta.
          </Cuerpo>
          <View style={{ marginTop: 16 }}>
            <Boton tipo="secundario" onPress={carga}>Volver a mirar</Boton>
          </View>
        </View>
      ) : (
        <Lead>Cargando quién está…</Lead>
      )}
    </View>
  );
}

function FaltaPerfil() {
  return (
    <View style={s.cuerpo}>
      <Kicker rojo>Casi</Kicker>
      <Titulo style={{ marginTop: 12 }}>Tu perfil no está listo.</Titulo>
      <Lead>
        Sin vídeo aprobado y sin decir qué buscas, no entras a la ventana:
        aquí nadie mira desde la barrera.
      </Lead>
      <View style={{ marginTop: 24 }}>
        <Boton tipo="primario" grande onPress={() => router.push('/onboarding')}>
          Terminar mi perfil
        </Boton>
      </View>
    </View>
  );
}

export default function PantallaVentana() {
  const { ventana, recarga } = useVentana();
  const { yo, refresca } = useSesion();
  const [refrescando, setRefrescando] = useState(false);

  const alTirar = async () => {
    setRefrescando(true);
    recarga();
    await refresca().catch(() => {});
    setRefrescando(false);
  };

  return (
    <SafeAreaView style={s.pantalla} edges={['top']}>
      <View style={s.cabecera}><Logo /></View>
      <Franja />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={alTirar} tintColor={c.ink} />}
      >
        {!ventana.open ? <Cerrado /> : yo && !yo.listo ? <FaltaPerfil /> : <Abierto />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  cabecera: { paddingHorizontal: GUTTER, paddingVertical: 14, borderBottomWidth: RULE, borderBottomColor: c.ink },
  franja: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 11 },
  punto: { width: 10, height: 10 },
  franjaTexto: { fontFamily: f.semi, fontSize: 12.5, letterSpacing: 1.6, color: '#fff' },
  cuerpo: { flex: 1, padding: GUTTER, paddingTop: 32 },
  tarjeta: { marginTop: 28, borderWidth: RULE, borderColor: c.ink, backgroundColor: c.surfaceAlt, padding: 18 },
  ficha: { marginTop: 24, borderWidth: RULE, borderColor: c.ink, backgroundColor: c.surfaceAlt },
  video: {
    height: 220, backgroundColor: c.surface,
    borderBottomWidth: RULE, borderBottomColor: c.ink,
    alignItems: 'flex-start', justifyContent: 'flex-end', padding: 14,
  },
  fichaNombre: { fontFamily: f.extra, fontSize: 26, color: c.ink },
  fichaMeta: { fontFamily: f.regular, fontSize: 13.5, color: c.ink3, marginTop: 4 },
  fichaBusco: { fontFamily: f.semi, fontSize: 16, lineHeight: 23, color: c.ink, marginTop: 12 },
  pieMarca: { flex: 1, justifyContent: 'flex-end', paddingTop: 40, paddingBottom: 12 },
  lema: { fontFamily: f.semi, fontSize: 13, letterSpacing: 4, color: c.ink3, marginTop: 10 },
  error: { fontFamily: f.semi, fontSize: 13.5, color: c.accentPress, marginTop: 16 },
});
