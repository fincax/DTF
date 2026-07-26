/* Piezas base del sistema: tipografía y botones. Cero radius,
   todo alineado a la izquierda, estados de pulsado con los mismos
   colores que la web. */

import { Pressable, StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';
import { c, f, RULE } from './tokens';

export function Kicker({ children, rojo, sobreRojo }: {
  children: string; rojo?: boolean; sobreRojo?: boolean;
}) {
  return (
    <Text style={[s.kicker, rojo && { color: c.accentPress }, sobreRojo && { color: '#000' }]}>
      {children.toUpperCase()}
    </Text>
  );
}

export function Titulo({ children, claro, style }: {
  children: string; claro?: boolean; style?: TextStyle;
}) {
  return <Text style={[s.titulo, claro && { color: c.bg }, style]}>{children}</Text>;
}

export function Lead({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.lead, style]}>{children}</Text>;
}

export function Cuerpo({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.cuerpo, style]}>{children}</Text>;
}

export function MetaLabel({ children }: { children: string }) {
  return <Text style={s.metaLabel}>{children.toUpperCase()}</Text>;
}

export function Logo({ tam = 26, claro }: { tam?: number; claro?: boolean }) {
  return (
    <Text style={[s.logo, { fontSize: tam, color: claro ? c.bg : c.ink }]}>
      DTF<Text style={{ color: claro ? c.ink : c.accent }}>.</Text>
    </Text>
  );
}

type TipoBoton = 'primario' | 'secundario' | 'tinta' | 'fantasma';

export function Boton({ tipo = 'primario', children, onPress, grande }: {
  tipo?: TipoBoton; children: string; onPress?: () => void; grande?: boolean;
}) {
  const caja: Record<TipoBoton, [ViewStyle, ViewStyle]> = {
    primario: [{ backgroundColor: c.accentBtn, borderColor: c.accentBtn },
               { backgroundColor: c.accentPress, borderColor: c.accentPress }],
    secundario: [{ backgroundColor: 'transparent', borderColor: c.ink },
                 { backgroundColor: c.borderSoft, borderColor: c.ink }],
    tinta: [{ backgroundColor: c.ink, borderColor: c.ink },
            { backgroundColor: c.hoverInk, borderColor: c.hoverInk }],
    fantasma: [{ backgroundColor: 'transparent', borderColor: c.bg },
               { backgroundColor: 'rgba(243,242,242,.22)', borderColor: c.bg }],
  };
  const texto: Record<TipoBoton, TextStyle> = {
    primario: { color: '#fff' },
    secundario: { color: c.ink },
    tinta: { color: c.bg },
    /* Texto grande sobre el rojo: con 3:1 pasa AA (como en la web) */
    fantasma: { color: c.bg, fontSize: 19, fontFamily: f.bold },
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.boton, caja[tipo][pressed ? 1 : 0], grande && { height: 58 }]}
    >
      <Text style={[s.botonTexto, texto[tipo]]}>{children}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  kicker: { fontFamily: f.semi, fontSize: 12, letterSpacing: 3.6, color: c.meta },
  titulo: { fontFamily: f.extra, fontSize: 34, lineHeight: 36, letterSpacing: -0.5, color: c.ink },
  lead: { fontFamily: f.regular, fontSize: 17, lineHeight: 26, color: c.ink2 },
  cuerpo: { fontFamily: f.regular, fontSize: 15, lineHeight: 23, color: c.ink3 },
  metaLabel: { fontFamily: f.semi, fontSize: 11, letterSpacing: 1.5, color: c.meta },
  logo: { fontFamily: f.extra, letterSpacing: -0.5 },
  boton: {
    minHeight: 52,
    borderWidth: RULE,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  botonTexto: { fontFamily: f.semi, fontSize: 16 },
});
