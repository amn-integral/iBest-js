import * as THREE from 'three';

export type Colors = {
  background: number;
  grid: number;
  axes: {
    x: number;
    y: number;
    z: number;
  };
  cubicle: number;
  opening: number;
  wireframe: number;
  ok: number;
  warn: number;
  err: number;
  surface: number;
  surfaceAlt: number;
  outline: number;
  text: number;
};

/** Low-level palette (hex numbers) */
export const palette = {
  // Neutrals
  white: 0xffffff,
  black: 0x000000,
  gray100: 0xf3f4f6,
  gray200: 0xe5e7eb,
  gray300: 0xd1d5db,
  gray500: 0x6b7280,
  gray700: 0x374151,
  gray900: 0x111827,

  // Brand-y hues (tweak as you like)
  blue500: 0x3b82f6,
  blue700: 0x1d4ed8,
  green500: 0x22c55e,
  red500: 0xef4444,
  amber500: 0xf59e0b,
  violet500: 0x8b5cf6,
  cyan500: 0x06b6d4,

  // Extended
  red: 0xff3b30,
};

export type Pallete = typeof palette;

/** Semantic theme (use these names in your app) */
export const colors = {
  // scene
  background: 0xf5f5f7,
  grid: 0xcccccc,
  axes: {
    x: 0xff3b30, // red-ish
    y: 0x34c759, // green-ish
    z: 0x007aff, // blue-ish
  },

  // objects
  cubicle: 0x8080b3,   // your default cubicle tint
  opening: palette.white,
  wireframe: palette.gray500,

  // feedback/status
  ok: palette.green500,
  warn: palette.amber500,
  err: palette.red500,

  // neutrals / surfaces
  surface: palette.gray100,
  surfaceAlt: palette.gray200,
  outline: palette.gray300,
  text: palette.gray900,
};

export type ColorName =
  | keyof typeof palette
  | keyof typeof colors
  | `${keyof typeof colors}.${keyof typeof colors.axes}`;

/** Resolve a name/hex/string to THREE.Color */
export function toColor(c: ColorName | number | string): THREE.Color {
  if (typeof c === 'number') return new THREE.Color(c);

  // support "axes.x" style path
  if (typeof c === 'string') {
    if (c.startsWith('axes.')) {
      const key = c.split('.')[1] as keyof typeof colors.axes;
      return new THREE.Color(colors.axes[key]);
    }
    // fallback: try as css string
    return new THREE.Color(c);
  }

  if (c in colors) return new THREE.Color((colors as Colors)[c]);
  if (c in palette) return new THREE.Color((palette as Pallete)[c]);

  // fallback: default to white if nothing matches
  return new THREE.Color(0xffffff);
}

/** Lighten/darken by factor in [-1, 1] (HSL lightness) */
export function adjust(c: THREE.Color | number | string, factor: number): THREE.Color {
  const col = c instanceof THREE.Color ? c.clone() : toColor(c);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  hsl.l = THREE.MathUtils.clamp(hsl.l + factor, 0, 1);
  col.setHSL(hsl.h, hsl.s, hsl.l);
  return col;
}

/** Convenience: MeshStandardMaterial */
export function stdMaterial(
  c: ColorName | number | string,
  opts: {
    opacity?: number;
    transparent?: boolean;
    metalness?: number;
    roughness?: number;
    side?: THREE.Side;
    wireframe?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  const {
    opacity = 1,
    transparent = opacity < 1,
    metalness = 0.1,
    roughness = 0.8,
    side = THREE.DoubleSide,
    wireframe = false,
  } = opts;

  return new THREE.MeshStandardMaterial({
    color: toColor(c),
    opacity,
    transparent,
    metalness,
    roughness,
    side,
    wireframe,
  });
}

/** Convenience: LineBasicMaterial (for grid/edges) */
export function lineMaterial(
  c: ColorName | number | string,
  opts: { linewidth?: number; transparent?: boolean; opacity?: number } = {}
): THREE.LineBasicMaterial {
  const { linewidth = 1, transparent = false, opacity = 1 } = opts;
  return new THREE.LineBasicMaterial({
    color: toColor(c),
    linewidth,
    transparent,
    opacity,
  });
}
