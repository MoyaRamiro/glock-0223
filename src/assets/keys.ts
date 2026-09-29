/**
 * Rutas de imagenes conocidas por el contenido. Vive aparte de `index.ts` a proposito:
 * este modulo no importa binarios, asi que el schema Zod puede validarlo desde Node
 * (tests, scripts) sin depender del pipeline de assets de Vite.
 */
export const IMAGE_PATHS = [
  '/images/ediciones/glock-1.webp',
  '/images/ediciones/glock-2.webp',
  '/images/ediciones/glock-3.webp',
  '/images/ediciones/glock-4.webp',
  '/images/flyers/songwars-vol1.jpg',
  '/images/logo/logo-circulo.png',
  '/images/sponsors/fas-spot.png',
  '/images/sponsors/palacios-ttt.png',
  '/images/sponsors/real-pilcha.png',
  '/images/sponsors/squadra-vincente.png',
  '/images/sponsors/vela-barberia.png',
] as const;

export type ImagePath = (typeof IMAGE_PATHS)[number];

export const imageKeySet: ReadonlySet<string> = new Set(IMAGE_PATHS);

export const esImagenConocida = (path: string): boolean => imageKeySet.has(path);
