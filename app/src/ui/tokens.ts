/* Tokens del sistema "Modernist", portados de la web (index.html).
   Mismas reglas: cero border-radius, reglas de 2px, todo alineado a
   la izquierda. Si cambias un color aquí, cámbialo también en la web. */

export const c = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  surfaceAlt: '#f8f4f4',

  ink: '#201e1d',
  ink2: '#444141',
  ink3: '#605d5d',
  meta: '#6b6767',        // AA sobre los fondos claros

  accent: '#ec3013',      // superficies/decoración; texto pequeño encima: negro
  accentBtn: '#dd2b0f',   // fondo de botón: pasa AA con texto blanco
  accentPress: '#ae1800', // pulsado; también texto rojo AA sobre claro
  accentDark: '#ff563c',  // acento sobre fondo oscuro
  detailDark: '#ff9783',

  borderSoft: '#d7d3d3',
  hoverNeutral: '#eae7e7',
  hoverInk: '#2d2b2b',
} as const;

/* Archivo empaquetada en la app (sin peticiones a terceros).
   TODO: el wordmark usa stretch 125%; cuando toque, añadir la
   instancia Expanded como fichero propio. */
export const f = {
  regular: 'Archivo_400Regular',
  semi: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extra: 'Archivo_800ExtraBold',
} as const;

export const RULE = 2;      // la única regla: 2px sólidos de tinta
export const GUTTER = 20;
