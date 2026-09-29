import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/images/og-glock.jpg');

const W = 1200;
const H = 630;
const BONE = '#F5F1E8';
const MAGENTA = '#C400FF';
const VIOLET = '#4B0055';
const BG = '#0A0A0A';

const LOGO_BOX = { top: 205, left: 862, size: 220 };

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${VIOLET}"/>
      <stop offset="1" stop-color="${BG}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${MAGENTA}"/>
  <g transform="translate(96 168)">
    <text x="0" y="0" font-family="Arial Black, Arial, sans-serif" font-size="128" font-weight="900" fill="${BONE}" letter-spacing="-4">GLOCK</text>
    <text x="4" y="76" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="${MAGENTA}" letter-spacing="12">SHOWS &amp; CYPHER</text>
    <rect x="4" y="112" width="330" height="6" fill="${BONE}" opacity="0.85"/>
    <text x="4" y="176" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="${BONE}" opacity="0.92">Trap, Rap y Hip-Hop</text>
    <text x="4" y="222" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="${BONE}" opacity="0.92">Mar del Plata, Argentina</text>
  </g>
</svg>`);

const logo = await sharp(resolve(root, 'src/assets/logo/logo-circulo.png'))
  .resize(LOGO_BOX.size, LOGO_BOX.size, { fit: 'contain' })
  .png()
  .toBuffer();

const base = await sharp(svg).png().toBuffer();
const final = await sharp(base)
  .composite([{ input: logo, top: LOGO_BOX.top, left: LOGO_BOX.left }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toBuffer();

await mkdir(dirname(out), { recursive: true });
await sharp(final).toFile(out);

const meta = await sharp(out).metadata();
console.log(`OG: ${meta.width}x${meta.height} ${(final.length / 1024).toFixed(0)}KB -> public/images/og-glock.jpg`);

const region = { left: LOGO_BOX.left, top: LOGO_BOX.top, width: LOGO_BOX.size, height: LOGO_BOX.size };
const [a, b] = await Promise.all([
  sharp(base).extract(region).raw().toBuffer(),
  sharp(final).extract(region).raw().toBuffer(),
]);
let changed = 0;
for (let i = 0; i < a.length; i += 1) if (Math.abs(a[i] - b[i]) > 8) changed += 1;

const { data: band } = await sharp(out)
  .extract({ left: 96, top: 140, width: 700, height: 260 })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });
let bone = 0;
for (let i = 0; i < band.length; i += 1) if (band[i] > 200) bone += 1;

const barra = await sharp(out).extract({ left: 7, top: 315, width: 1, height: 1 }).raw().toBuffer();

console.log(`logo presente: ${changed > 2000 ? 'SI' : 'NO'} (${changed} px cambiaron en su caja)`);
console.log(`texto renderizado: ${bone > 3000 ? 'SI' : 'NO'} (${bone} px claros)`);
console.log(`barra magenta: ${barra[0] === 196 && barra[1] === 0 && barra[2] === 255 ? 'OK' : `RGB ${barra[0]},${barra[1]},${barra[2]}`}`);

if (changed <= 2000 || bone <= 3000) {
  console.error('OG incompleta. Revisar fuentes disponibles para el SVG o el logo.');
  process.exit(1);
}
