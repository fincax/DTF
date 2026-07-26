/* Acceso: enlace mágico al email. Sin contraseñas, como en la web.
   En desarrollo se puede pegar el token del outbox: hasta que el enlace
   profundo (dtf://entrar?token=) esté firmado en las tiendas, es la
   única forma de probar el circuito en el simulador. */

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
import { useSesion } from '../sesion';
import { Boton, Kicker, Lead, Logo, Titulo } from '../ui/componentes';
import { Campo } from '../ui/campos';
import { c, f, GUTTER, RULE } from '../ui/tokens';

export default function Entrar() {
  const { entra } = useSesion();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [esperando, setEsperando] = useState(false);

  async function pideEnlace() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Ese email no cuela. Revísalo.');
      return;
    }
    setEsperando(true);
    try {
      const { status } = await api('/auth/link', { metodo: 'POST', cuerpo: { email: email.trim() } });
      if (status !== 204) throw new Error();
      setEnviado(true);
    } catch {
      setError('No hemos podido enviarlo. Inténtalo otra vez en un minuto.');
    } finally {
      setEsperando(false);
    }
  }

  async function canjea() {
    setError(null);
    setEsperando(true);
    try {
      const { status, datos } = await api<{ session: string }>('/auth/session', {
        metodo: 'POST', cuerpo: { token: token.trim() },
      });
      if (status !== 200 || !datos) throw new Error();
      await entra(datos.session);
      router.replace('/');
    } catch {
      setError('Ese enlace ya no vale. Pide otro.');
    } finally {
      setEsperando(false);
    }
  }

  return (
    <SafeAreaView style={s.pantalla}>
      <ScrollView contentContainerStyle={s.cuerpo} keyboardShouldPersistTaps="handled">
        <Logo tam={30} />
        <View style={{ marginTop: 40 }}>
          <Kicker rojo>Acceso</Kicker>
          <Titulo style={{ marginTop: 12 }}>Sin contraseñas. Como debe ser.</Titulo>
          <Lead>Te mandamos un enlace de un solo uso. Caduca en 15 minutos — aquí caduca todo.</Lead>
        </View>

        {!enviado ? (
          <>
            <Campo
              etiqueta="Tu email"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ marginTop: 24 }}>
              <Boton tipo="primario" grande onPress={esperando ? undefined : pideEnlace}>
                {esperando ? 'Un momento…' : 'Mándame el enlace'}
              </Boton>
            </View>
          </>
        ) : (
          <>
            <View style={s.aviso}>
              <Text style={s.avisoTexto}>
                Enviado. Revisa tu bandeja — y el spam, que a veces se pone tímido.
              </Text>
            </View>
            <Campo
              etiqueta="Código del enlace"
              ayuda="Solo en desarrollo: pega aquí el token del enlace que te ha llegado."
              value={token}
              onChangeText={setToken}
              placeholder="a1b2c3…"
              autoCapitalize="none"
            />
            <View style={{ marginTop: 24, gap: 12 }}>
              <Boton tipo="tinta" grande onPress={esperando ? undefined : canjea}>
                {esperando ? 'Entrando…' : 'Entrar'}
              </Boton>
              <Boton tipo="secundario" onPress={() => { setEnviado(false); setToken(''); }}>
                Usar otro email
              </Boton>
            </View>
          </>
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  cuerpo: { padding: GUTTER, paddingBottom: 48 },
  aviso: {
    marginTop: 28, borderWidth: RULE, borderColor: c.ink,
    backgroundColor: c.ink, padding: 18,
  },
  avisoTexto: { fontFamily: f.semi, fontSize: 15.5, lineHeight: 22, color: c.bg },
  error: { fontFamily: f.semi, fontSize: 13.5, color: c.accentPress, marginTop: 14 },
});
