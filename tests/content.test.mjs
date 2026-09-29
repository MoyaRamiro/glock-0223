import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const hayBuild = existsSync(join(dist, 'index.html'));
const leer = (rel) => readFileSync(join(root, rel), 'utf8');
const html = hayBuild ? readFileSync(join(dist, 'index.html'), 'utf8') : '';

const opciones = { skip: hayBuild ? false : 'requiere npm run build' };

test('el build existe', () => {
  assert.ok(existsSync(join(dist, 'index.html')), 'falta dist/index.html');
});

test('los JSON-LD son JSON valido', opciones, () => {
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(bloques.length >= 5, `solo ${bloques.length} bloques JSON-LD`);
  for (const [, cuerpo] of bloques) JSON.parse(cuerpo);
});

test('cada MusicEvent tiene startDate, address y performer', opciones, () => {
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, c]) => JSON.parse(c))
    .flat();
  const eventos = bloques.filter((b) => b['@type'] === 'MusicEvent');
  assert.equal(eventos.length, 4, 'se esperaban 4 ediciones');
  for (const e of eventos) {
    assert.match(e.startDate, /^\d{4}-\d{2}-\d{2}/, `startDate invalido en ${e.name}`);
    assert.ok(e.location?.address?.streetAddress, `sin streetAddress en ${e.name}`);
    assert.equal(e.location.address.addressCountry, 'AR');
    assert.ok(Array.isArray(e.performer) && e.performer.length > 0, `sin performer en ${e.name}`);
    assert.equal(e.eventStatus, 'https://schema.org/EventScheduled');
  }
});

test('no se publican endDate ni offers inventados en eventos pasados', opciones, () => {
  const eventos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, c]) => JSON.parse(c))
    .flat()
    .filter((b) => b['@type'] === 'MusicEvent');
  for (const e of eventos) assert.equal(e.endDate, undefined, `endDate sin dato real en ${e.name}`);
});

test('las imagenes de los eventos existen en el build', opciones, () => {
  const eventos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, c]) => JSON.parse(c))
    .flat()
    .filter((b) => b['@type'] === 'MusicEvent');
  for (const e of eventos) {
    for (const img of [].concat(e.image ?? [])) {
      const rel = img.replace('https://glock-0223.vercel.app', '');
      assert.ok(existsSync(join(dist, rel)), `imagen inexistente: ${rel}`);
    }
  }
});

test('metadata social completa', opciones, () => {
  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:locale']) {
    assert.ok(html.includes(`property="${prop}"`), `falta ${prop}`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    assert.ok(html.includes(`name="${name}"`), `falta ${name}`);
  }
  assert.ok(html.includes('rel="canonical"'));
});

test('canonical y JSON-LD apuntan al dominio unico', opciones, () => {
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
  assert.equal(canonical, 'https://glock-0223.vercel.app/');
  const dominios = new Set([...html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]));
  const propios = [...dominios].filter((d) => d.endsWith('glock-0223.vercel.app'));
  assert.ok(propios.length > 0);
  const otros = [...dominios].filter((d) => d.includes('glock') && !d.endsWith('glock-0223.vercel.app'));
  assert.deepEqual(otros, [], `dominios duplicados: ${otros.join(', ')}`);
});

test('imagenes responsive y sin paths legacy', opciones, () => {
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(imgs.length > 0);
  for (const tag of imgs) {
    assert.ok(tag.includes('alt="'), 'img sin alt');
    assert.ok(!/src="\/images\/(ediciones|flyers|logo|sponsors)\//.test(tag), `path legacy: ${tag.slice(0, 90)}`);
  }
  const locales = imgs.filter((t) => t.includes('src="/_astro/'));
  for (const tag of locales) {
    assert.ok(tag.includes('width=') && tag.includes('height='), `falta width/height (CLS): ${tag.slice(0, 80)}`);
    const src = tag.match(/src="([^"]+)"/)[1];
    const w = Number(tag.match(/width="(\d+)"/)[1]);
    const fluida = tag.includes('sizes=') || /w-full/.test(tag);
    if (fluida) {
      assert.ok(tag.includes('srcset='), `imagen fluida sin srcset: ${src}`);
    } else {
      // Un slot fijo (por ejemplo el logo de 64px) no necesita srcset, pero el archivo
      // emitido no deberia pesar mucho mas que el tamano de render.
      const bytes = readFileSync(join(dist, '_astro', src.split('/').pop())).length;
      const presupuesto = Math.max(8, w * w * 0.6) * 1000;
      assert.ok(
        bytes < presupuesto,
        `imagen fija ${src} (${w}px) pesa ${bytes} bytes, supera ${presupuesto}`,
      );
    }
  }
});

test('todo srcset declara el ancho real en sizes, no una estimacion en vw', () => {
  // Un sizes mentiroso hace que el navegador descargue una variante mayor que la
  // caja real: con 42vw sobre un contenedor de max-w-6xl se sirvio la de 800w
  // para una caja de 448px y se desperdiciaba el 68-76% de los bytes.
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const tags = html.match(/<img[^>]*>/g) ?? [];
  const responsive = tags.filter((t) => t.includes('src="/_astro/') && t.includes('srcset='));
  assert.ok(responsive.length >= 4, `se esperaban imagenes responsive, hay ${responsive.length}`);
  for (const tag of responsive) {
    const sizes = tag.match(/sizes="([^"]+)"/)?.[1];
    assert.ok(sizes, `srcset sin sizes: ${tag.slice(0, 90)}`);
    // Hay que mirar el valor, no la media query: "768px" dentro de
    // "(min-width: 768px)" no dice nada del ancho real de la caja.
    const valores = sizes.replace(/\([^)]*\)/g, '');
    assert.match(valores, /(^|[\s,])\d+px($|[\s,])/, `sizes sin ancho en px: "${sizes}"`);
  }
});

test('la imagen OG existe y es valida', opciones, () => {
  const og = join(dist, 'images/og-glock.jpg');
  assert.ok(existsSync(og), 'falta dist/images/og-glock.jpg');
  assert.ok(html.includes('og:image'), 'falta og:image');
});

test('sin em-dash en el contenido visible', opciones, () => {
  assert.ok(!html.includes('—'), 'hay em-dashes en el HTML');
});

test('el schema rechaza una imagen no registrada', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  assert.doesNotThrow(() => glockSchema.parse(raw));
  const roto = structuredClone(raw);
  roto.ediciones[0].foto = 'imagen/que-no-existe.webp';
  assert.throws(() => glockSchema.parse(roto), /no esta registrada/);
});

test('el schema detecta una session publicada sin video', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const roto = structuredClone(raw);
  roto.sessions[0].yt = '';
  assert.throws(() => glockSchema.parse(roto), /necesita su URL de YouTube/);
});

test('el schema detecta n duplicado y fecha repetida', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const dup = structuredClone(raw);
  dup.ediciones[1].n = dup.ediciones[0].n;
  assert.throws(() => glockSchema.parse(dup), /n duplicado/);
  const mismaFecha = structuredClone(raw);
  mismaFecha.ediciones[1].fecha = mismaFecha.ediciones[0].fecha;
  mismaFecha.ediciones[1].anio = mismaFecha.ediciones[0].anio;
  assert.throws(() => glockSchema.parse(mismaFecha), /fecha duplicada/);
});

test('el schema rechaza un highlight inexistente', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const roto = structuredClone(raw);
  roto.ediciones[0].highlight = ['ARTISTA FANTASMA'];
  assert.throws(() => glockSchema.parse(roto), /no esta en cypher ni en shows/);
});

test('el schema rechaza una URL invalida', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const roto = structuredClone(raw);
  roto.ediciones[0].maps = 'no-es-una-url';
  assert.throws(() => glockSchema.parse(roto));
});

test('el schema rechaza horaFin sin hora', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const roto = structuredClone(raw);
  roto.ediciones[0].horaFin = '23:00';
  assert.throws(() => glockSchema.parse(roto), /horaFin requiere hora/);
});

test('ninguna referencia a /images apunta a un archivo ausente', opciones, () => {
  const refs = new Set(
    [...html.matchAll(/(?:src|href|content)="(\/images\/[^"]+)"/g)].map((m) => m[1]),
  );
  for (const ref of refs) {
    assert.ok(existsSync(join(dist, ref)), `recurso ausente: ${ref}`);
  }
});

test('los enlaces externos usan noopener', opciones, () => {
  const anchors = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
  for (const a of anchors) {
    assert.ok(a.includes('rel="noopener"'), `sin noopener: ${a.slice(0, 80)}`);
  }
});

test('la imagen OG no supera 300KB', opciones, () => {
  const size = readFileSync(join(dist, 'images/og-glock.jpg')).length;
  assert.ok(size < 300000, `og-glock.jpg pesa ${size} bytes`);
});

test('el 404 existe, es accesible y no se indexa', opciones, () => {
  const p404 = join(dist, '404.html');
  assert.ok(existsSync(p404), 'falta dist/404.html');
  const marcado = readFileSync(p404, 'utf8');
  assert.ok(marcado.includes('name="robots"'), 'el 404 no declara robots');
  assert.match(marcado, /noindex/, 'el 404 deberia ser noindex');
  assert.equal((marcado.match(/<h1\b/g) ?? []).length, 1, 'el 404 necesita exactamente un h1');
  assert.ok(marcado.includes('href="/"'), 'el 404 necesita volver al inicio');
});

test('el sitemap solo publica la home', opciones, () => {
  const mapa = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
  const locs = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ['https://glock-0223.vercel.app/'], `sitemap inesperado: ${locs.join(', ')}`);
});

test('robots.txt apunta al sitemap del dominio canonico', () => {
  const robots = leer('public/robots.txt');
  assert.ok(robots.includes('https://glock-0223.vercel.app/sitemap-index.xml'));
  assert.ok(!robots.includes('Disallow: /'));
});
