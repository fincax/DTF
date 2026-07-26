/* Campos de formulario del sistema: cuadrados, 2px, cero radius.
   Las opciones son cuadraditos rojos, como en la web. */

import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { c, f, RULE } from './tokens';

export function Campo({ etiqueta, ayuda, ...resto }: {
  etiqueta: string;
  ayuda?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
  maxLength?: number;
}) {
  const { multiline, ...props } = resto;
  return (
    <View style={s.campo}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      {ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
      <TextInput
        style={[s.input, multiline && s.area]}
        placeholderTextColor={c.meta}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

export function Opciones({ etiqueta, ayuda, opciones, valor, onElige }: {
  etiqueta: string;
  ayuda?: string;
  opciones: { valor: string; titulo: string; pista?: string }[];
  valor?: string | null;
  onElige: (v: string) => void;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      {ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
      {opciones.map((o) => {
        const activa = valor === o.valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onElige(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            style={s.opcion}
          >
            <View style={s.caja}>{activa ? <View style={s.marca} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={s.opcionTitulo}>{o.titulo}</Text>
              {o.pista ? <Text style={s.opcionPista}>{o.pista}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  campo: { marginTop: 26 },
  etiqueta: { fontFamily: f.semi, fontSize: 14, color: c.ink },
  ayuda: { fontFamily: f.regular, fontSize: 13.5, color: c.ink3, marginTop: 4 },
  input: {
    marginTop: 8,
    minHeight: 54,
    borderWidth: RULE,
    borderColor: c.ink,
    backgroundColor: c.bg,
    paddingHorizontal: 16,
    fontFamily: f.regular,
    fontSize: 16,
    color: c.ink,
  },
  area: { minHeight: 104, paddingTop: 14, textAlignVertical: 'top' },
  opcion: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 14, borderTopWidth: 2, borderTopColor: c.borderSoft },
  caja: { width: 22, height: 22, borderWidth: RULE, borderColor: c.ink, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  marca: { width: 10, height: 10, backgroundColor: c.accent },
  opcionTitulo: { fontFamily: f.semi, fontSize: 16, color: c.ink },
  opcionPista: { fontFamily: f.regular, fontSize: 13.5, color: c.ink3, marginTop: 2 },
});
