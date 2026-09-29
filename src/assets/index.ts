import type { ImageMetadata } from 'astro';

import glock1 from './ediciones/glock-1.webp';
import glock2 from './ediciones/glock-2.webp';
import glock3 from './ediciones/glock-3.webp';
import glock4 from './ediciones/glock-4.webp';
import songwars from './flyers/songwars-vol1.jpg';
import logoCirculo from './logo/logo-circulo.png';
import fasSpot from './sponsors/fas-spot.png';
import palacios from './sponsors/palacios-ttt.png';
import realPilcha from './sponsors/real-pilcha.png';
import squadra from './sponsors/squadra-vincente.png';
import vela from './sponsors/vela-barberia.png';

import { IMAGE_PATHS, type ImagePath } from './keys.ts';

export const images = {
  '/images/ediciones/glock-1.webp': glock1,
  '/images/ediciones/glock-2.webp': glock2,
  '/images/ediciones/glock-3.webp': glock3,
  '/images/ediciones/glock-4.webp': glock4,
  '/images/flyers/songwars-vol1.jpg': songwars,
  '/images/logo/logo-circulo.png': logoCirculo,
  '/images/sponsors/fas-spot.png': fasSpot,
  '/images/sponsors/palacios-ttt.png': palacios,
  '/images/sponsors/real-pilcha.png': realPilcha,
  '/images/sponsors/squadra-vincente.png': squadra,
  '/images/sponsors/vela-barberia.png': vela,
} satisfies Record<ImagePath, ImageMetadata>;

for (const ruta of IMAGE_PATHS) {
  if (!(ruta in images)) {
    throw new Error(`[assets] "${ruta}" esta en keys.ts pero no se importa en src/assets/index.ts.`);
  }
}

export function getImage(path: string | undefined): ImageMetadata | undefined {
  if (!path) return undefined;
  return (images as Record<string, ImageMetadata>)[path];
}

export function requireImage(path: string | undefined, context: string): ImageMetadata {
  const found = getImage(path);
  if (!found) {
    throw new Error(
      `[assets] "${context}" apunta a "${path}" pero no esta importado en src/assets/index.ts. ` +
        `Agregalo o corregi la ruta en src/content/glock.json.`,
    );
  }
  return found;
}

export { IMAGE_PATHS, esImagenConocida } from './keys';
export const ogImage: ImageMetadata = glock4;
export const logoImage: ImageMetadata = logoCirculo;
