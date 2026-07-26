/* Onboarding guiado por el servidor: el orden lo marca `falta[]` de
   GET /me (server-app/CONTRATO.md). La app no decide por su cuenta si
   un perfil está listo — así no hay dos verdades. */

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import { useSesion } from '../sesion';
import { Campo, Opciones } from '../ui/campos';
import { Boton, Cuerpo, Kicker, Lead, MetaLabel, Titulo } from '../ui/componentes';
import { c, f, GUTTER, RULE } from '../ui/tokens';

const ORDEN = ['verificacion_edad', 'datos_basicos', 'identidad', 'busco', 'video_aprobado'];

const IDENTIDADES = [
  { valor: 'mujer', titulo: 'Mujer' },
  { valor: 'hombre', titulo: 'Hombre' },
  { valor: 'no binaria', titulo: 'No binaria' },
  { valor: 'otra', titulo: 'Otra', pista: 'Lo escribes tú en el perfil.' },
];
const ORIENTACIONES = [
  { valor: 'hetero', titulo: 'Hetero' }, { valor: 'gay', titulo: 'Gay' },
  { valor: 'lesbiana', titulo: 'Lesbiana' }, { valor: 'bi', titulo: 'Bi' },
  { valor: 'pan', titulo: 'Pan' }, { valor: 'otra', titulo: 'Otra' },
];
const CIUDADES = [
  { valor: 'madrid', titulo: 'Madrid', pista: 'En la primera ventana.' },
  { valor: 'barcelona', titulo: 'Barcelona', pista: 'En la primera ventana.' },
  { valor: 'otra', titulo: 'Otra', pista: 'Te avisamos cuando lleguemos.' },
];

export default function Onboarding() {
  const { yo, refresca } = useSesion();
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const paso = ORDEN.find((p) => yo?.falta?.includes(p));

  useEffect(() => {
    if (yo && yo.listo) router.replace('/(tabs)/ventana');
  }, [yo]);

  if (!yo) return null;

  const pon = (k: string, v: string) => setForm((f2) => ({ ...f2, [k]: v }));

  /* Nada de mandar pasos a medias: el servidor los rechazaría en
     silencio (COALESCE deja el hueco) y el usuario se quedaría
     dando vueltas en el mismo paso sin saber por qué. */
  function falla(faltan: [boolean, string][]) {
    const primero = faltan.find(([mal]) => mal);
    if (primero) { setError(primero[1]); return true; }
    return false;
  }

  async function manda(ruta: string, cuerpo: unknown, metodo = 'PATCH') {
    setError(null);
    setOcupado(true);
    try {
      const { status, datos } = await api<{ error?: string; siguiente?: string }>(ruta, { metodo, cuerpo });
      if (status >= 400) {
        setError(datos?.error === 'no verificado'
          ? 'No hemos podido confirmar que eres mayor de edad. Prueba con el documento.'
          : datos?.error ?? 'No ha salido. Inténtalo otra vez.');
        return false;
      }
      await refresca();
      return true;
    } catch {
      setError('Sin conexión con el servidor.');
      return false;
    } finally {
      setOcupado(false);
    }
  }

  /* En producción, cada botón abre el SDK del proveedor y el resultado
     llega firmado; aquí se simula para poder recorrer el flujo entero.
     Lo que nunca cambia: al servidor solo va el RESULTADO. */
  const verifica = (metodo: 'facial' | 'documento') =>
    manda('/me/age', { metodo, proveedor: metodo === 'facial' ? 'Yoti' : 'iDenfy', resultado: 'mayor' }, 'POST');

  async function pideVideo() {
    const ok = await manda('/me/video', {}, 'POST');
    if (ok) await refresca();
  }

  const pasos: Record<string, React.ReactNode> = {
    verificacion_edad: (
      <>
        <Kicker rojo>Paso 1 de 5</Kicker>
        <Titulo style={{ marginTop: 12 }}>Primero, que eres mayor.</Titulo>
        <Lead>
          Una vez y para siempre. Empezamos por un selfie: si no queda claro,
          pedimos documento. No guardamos ni tu cara ni tu documento —
          solo el resultado.
        </Lead>
        <View style={{ marginTop: 28, gap: 12 }}>
          <Boton tipo="primario" grande onPress={ocupado ? undefined : () => verifica('facial')}>
            Verificar con un selfie
          </Boton>
          <Boton tipo="secundario" onPress={ocupado ? undefined : () => verifica('documento')}>
            Prefiero usar mi documento
          </Boton>
        </View>
      </>
    ),

    datos_basicos: (
      <>
        <Kicker rojo>Paso 2 de 5</Kicker>
        <Titulo style={{ marginTop: 12 }}>Lo básico.</Titulo>
        <Campo etiqueta="Cómo te llamas" value={form.nombre} onChangeText={(t) => pon('nombre', t)}
          placeholder="Tu nombre" maxLength={40} />
        <Campo etiqueta="Año de nacimiento" ayuda="Solo se muestra tu edad, no la fecha."
          value={form.anio} onChangeText={(t) => pon('anio', t.replace(/\D/g, ''))}
          placeholder="1994" keyboardType="number-pad" maxLength={4} />
        <Opciones etiqueta="Dónde estás" opciones={CIUDADES} valor={form.ciudad}
          onElige={(v) => pon('ciudad', v)} />
        <View style={{ marginTop: 26 }}>
          <Boton tipo="tinta" grande onPress={ocupado ? undefined : () => {
            if (falla([
              [!form.nombre?.trim(), 'Falta tu nombre.'],
              [!/^\d{4}$/.test(form.anio || ''), 'Escribe tu año de nacimiento con cuatro cifras.'],
              [new Date().getFullYear() - Number(form.anio) < 18, 'Esto es solo para mayores de 18.'],
              [!form.ciudad, 'Elige dónde estás.'],
            ])) return;
            manda('/me/profile', { nombre: form.nombre, anioNac: Number(form.anio), ciudad: form.ciudad });
          }}>Seguir</Boton>
        </View>
      </>
    ),

    identidad: (
      <>
        <Kicker rojo>Paso 3 de 5</Kicker>
        <Titulo style={{ marginTop: 12 }}>Tú decides quién eres.</Titulo>
        <Opciones etiqueta="Te identificas como" opciones={IDENTIDADES} valor={form.identidad}
          onElige={(v) => pon('identidad', v)} />
        <Opciones etiqueta="Orientación" opciones={ORIENTACIONES} valor={form.orientacion}
          onElige={(v) => pon('orientacion', v)} />
        <View style={{ marginTop: 26 }}>
          <Boton tipo="tinta" grande onPress={ocupado ? undefined : () => {
            if (falla([
              [!form.identidad, 'Elige cómo te identificas.'],
              [!form.orientacion, 'Elige tu orientación.'],
            ])) return;
            manda('/me/profile', { identidad: form.identidad, orientacion: form.orientacion });
          }}>Seguir</Boton>
        </View>
      </>
    ),

    busco: (
      <>
        <Kicker rojo>Paso 4 de 5</Kicker>
        <Titulo style={{ marginTop: 12 }}>Dilo con palabras.</Titulo>
        <Lead>
          Sin acertijos ni indirectas: qué buscas, ahora. Es lo primero que
          lee quien te ve, y ahorra semanas a todo el mundo.
        </Lead>
        <Campo etiqueta="Qué buscas" value={form.busco} onChangeText={(t) => pon('busco', t)}
          placeholder="Algo esta noche, sin rodeos. O una copa y ya veremos." multiline maxLength={280} />
        <View style={{ marginTop: 26 }}>
          <Boton tipo="tinta" grande onPress={ocupado ? undefined : () => {
            if (falla([[(form.busco || '').trim().length < 10, 'Dilo un poco mejor: con dos palabras no se entiende nada.']])) return;
            manda('/me/profile', { busco: form.busco.trim() });
          }}>Seguir</Boton>
        </View>
      </>
    ),

    video_aprobado: (
      <>
        <Kicker rojo>Paso 5 de 5</Kicker>
        <Titulo style={{ marginTop: 12 }}>Treinta segundos de ti.</Titulo>
        <Lead>
          Cámara en vivo, sin galería: lo que ves es lo que hay. Antes de
          publicarse lo revisa una persona — por eso aquí nadie se lleva
          sorpresas.
        </Lead>

        {yo.video?.estado === 'subiendo' ? (
          <View style={s.aviso}>
            <MetaLabel>Subiendo</MetaLabel>
            <Text style={s.avisoTexto}>
              Tu vídeo va directo a nuestra plataforma de vídeo. En cuanto
              termine de subir entra en la cola de revisión.
            </Text>
          </View>
        ) : yo.video?.estado === 'pendiente' ? (
          <View style={s.aviso}>
            <MetaLabel>En revisión</MetaLabel>
            <Text style={s.avisoTexto}>
              Tu vídeo está en la cola. Te avisamos en cuanto pase — normalmente
              en unas horas. Sin vídeo aprobado no entras en la ventana.
            </Text>
          </View>
        ) : yo.video?.estado === 'rechazado' ? (
          <View style={s.aviso}>
            <MetaLabel>Rechazado</MetaLabel>
            <Text style={s.avisoTexto}>{yo.video.motivo || 'No cumple las normas de la casa.'}</Text>
            <Cuerpo style={{ marginTop: 8, color: c.borderSoft }}>Puedes grabar otro cuando quieras.</Cuerpo>
          </View>
        ) : null}

        <View style={{ marginTop: 26 }}>
          <Boton tipo="primario" grande onPress={ocupado ? undefined : pideVideo}>
            {yo.video?.estado === 'pendiente' ? 'Grabar otro' : 'Grabar mi vídeo'}
          </Boton>
        </View>
      </>
    ),
  };

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo} keyboardShouldPersistTaps="handled">
        <View style={s.progreso}>
          {ORDEN.map((p) => (
            <View key={p} style={[s.tramo, !yo.falta.includes(p) && { backgroundColor: c.accent }]} />
          ))}
        </View>
        {paso ? pasos[paso] : null}
        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  cuerpo: { padding: GUTTER, paddingBottom: 56 },
  progreso: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  tramo: { flex: 1, height: 6, borderWidth: 2, borderColor: c.ink, backgroundColor: c.bg },
  aviso: { marginTop: 26, borderWidth: RULE, borderColor: c.ink, backgroundColor: c.ink, padding: 18 },
  avisoTexto: { fontFamily: f.semi, fontSize: 15, lineHeight: 22, color: c.bg, marginTop: 6 },
  error: { fontFamily: f.semi, fontSize: 13.5, color: c.accentPress, marginTop: 16 },
});
