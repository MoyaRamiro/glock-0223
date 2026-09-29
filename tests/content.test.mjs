import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

test('endDate y offers solo se publican si el contenido los declara', opciones, () => {
  // La guarda original prohibia endDate/offers. Ahora hay dato real, asi que la
  // regla es la inversa: si el JSON no lo declara, el JSON-LD tampoco lo inventa.
  const datos = JSON.parse(leer('src/content/glock.json'));
  const eventos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, c]) => JSON.parse(c))
    .flat()
    .filter((b) => b['@type'] === 'MusicEvent');
  assert.ok(eventos.length > 0, 'no se emitieron eventos');
  for (const e of eventos) {
    const n = Number(/#(\d+)/.exec(e.name)?.[1]);
    const src = datos.ediciones.find((x) => x.n === n);
    assert.ok(src, `evento sin edicion de origen: ${e.name}`);
    assert.equal(Boolean(e.endDate), Boolean(src.horaFin), `endDate en #${n} no coincide con horaFin`);
    const declaraPrecio = typeof src.precio === 'number' || src.entradaGratis === true;
    assert.equal(Boolean(e.offers), declaraPrecio, `offers en #${n} no coincide con el precio declarado`);
    if (e.offers) {
      assert.ok(e.offers.url?.startsWith('https://'), `offer sin url en #${n}`);
      assert.ok(Number(e.offers.price) >= 0, `precio negativo en #${n}`);
    }
    if (e.endDate) assert.ok(e.endDate > e.startDate, `endDate <= startDate en #${n}`);
  }
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

test('todo show que cruza la medianoche declara endDate al dia siguiente', opciones, () => {
  // 19:00 -> 00:00 es lo esperable en un boliche. Si el endDate saliera con la
  // misma fecha, Google recibiria un endDate anterior al startDate.
  const datos = JSON.parse(leer('src/content/glock.json'));
  const cruzan = datos.ediciones.filter((e) => e.hora && e.horaFin && e.horaFin <= e.hora);
  assert.ok(cruzan.length > 0, 'se esperaba al menos un show que cruce la medianoche');
  const bloques = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .flatMap((j) => (Array.isArray(j) ? j : [j]))
    .flatMap((j) => (j['@graph'] ? j['@graph'] : [j]));
  for (const e of datos.ediciones.filter((x) => x.hora && x.horaFin)) {
    const ev = bloques.find((b) => b['@type'] === 'MusicEvent' && b.name?.includes(`#${e.n}`));
    assert.ok(ev, `no hay MusicEvent para la edicion ${e.n}`);
    assert.ok(ev.startDate?.endsWith(`T${e.hora}:00-03:00`), `startDate raro en #${e.n}: ${ev.startDate}`);
    assert.ok(ev.endDate, `falta endDate en #${e.n}`);
    if (e.horaFin <= e.hora) {
      assert.notEqual(
        ev.endDate.slice(0, 10),
        ev.startDate.slice(0, 10),
        `#${e.n} termina a la medianoche: endDate deberia caer al dia siguiente`,
      );
      assert.ok(ev.endDate > ev.startDate, `#${e.n}: endDate ${ev.endDate} no es posterior a startDate ${ev.startDate}`);
    } else {
      assert.equal(ev.endDate.slice(0, 10), ev.startDate.slice(0, 10), `#${e.n}: endDate deberia ser el mismo dia`);
    }
  }
});

test('el precio viaja al JSON-LD como entero plano, sin signo ni separador', opciones, () => {
  const datos = JSON.parse(leer('src/content/glock.json'));
  const conPrecio = datos.ediciones.filter((e) => typeof e.precio === 'number');
  assert.ok(conPrecio.length > 0, 'se esperaba al menos una edicion con precio');
  const bloques = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .flatMap((j) => (Array.isArray(j) ? j : [j]))
    .flatMap((j) => (j['@graph'] ? j['@graph'] : [j]));
    for (const e of conPrecio) {
      const ev = bloques.find((b) => b['@type'] === 'MusicEvent' && b.name?.includes(`#${e.n}`));
      assert.ok(ev?.offers, `falta offers en #${e.n}`);
      assert.equal(ev.offers['@type'], 'Offer');
      assert.equal(ev.offers.priceCurrency, 'ARS');
      // schema.org acepta Number o Text para price. Lo que no tolera es un
      // precio formateado ("$10.000", "10.000,00"): los parsers lo toman por
      // texto y pierden el monto. Se verifica la forma, no el tipo JS.
      const p = String(ev.offers.price);
      assert.match(p, /^\d+$/, `#${e.n}: precio "${p}" no es un entero plano`);
      assert.equal(Number(p), e.precio, `#${e.n}: precio ${p} != ${e.precio}`);
    }
  });

test('la hora y el precio de cada edicion se ven en la pagina, no solo en el JSON-LD', opciones, () => {
  // Dato que solo vive en los metadatos no le sirve a nadie: el visitante llega
  // por la hora y el precio.
  const datos = JSON.parse(leer('src/content/glock.json'));
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  const conPrecio = datos.ediciones.filter((e) => typeof e.precio === 'number' || e.entradaGratis === true);
  assert.ok(conPrecio.length > 0, 'se esperaba al menos una edicion con precio');
  for (const e of datos.ediciones.filter((x) => x.hora)) {
    assert.ok(
      visible.includes(`${parseInt(e.hora, 10)}hs`),
      `la hora de la edicion ${e.n} no aparece en el texto visible`,
    );
  }
  for (const e of conPrecio) {
    const esperado = e.entradaGratis ? 'Entrada gratis' : `$${e.precio.toLocaleString('es-AR')}`;
    assert.ok(visible.includes(esperado), `el precio "${esperado}" de la edicion ${e.n} no aparece en la pagina`);
  }
});

test('la proxima no muestra lugar, fecha ni ciudad que el dato no declare', opciones, () => {
  // Estuvo "Mar del Plata" hardcodeado en el componente. Nadie lo confirmo:
  // publicar una ciudad inventada es peor que publicar "proximamente".
  const datos = JSON.parse(leer('src/content/glock.json'));
  const p = datos.proxima;
  const i = html.indexOf('id="proxima"');
  assert.notEqual(i, -1, 'no se encontro la seccion de la proxima');
  const seccion = html.slice(i, html.indexOf('</section>', i));
  const texto = seccion
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  if (!p.lugar) {
    assert.ok(
      !/Mar del Plata/i.test(texto),
      'la seccion de la proxima muestra una ciudad que el dato no declara',
    );
  }
  if (!p.fecha) {
    assert.ok(!/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(texto), 'la proxima muestra una fecha sin declarar');
  }
  assert.match(texto, /Fecha a anunciar|proximamente/i, 'la proxima deberia aclarar que aun no hay fecha');
});

test('cada VideoObject publica lo que Google exige para rich results de video', opciones, () => {
  // Google pide name, description, thumbnailUrl y uploadDate; duration es
  // recomendado. Sin uploadDate el VideoObject queda descartado para video.
  const datos = JSON.parse(leer('src/content/glock.json'));
  const publicadas = datos.sessions.filter((s) => s.estado === 'publicada');
  assert.ok(publicadas.length > 0, 'se esperaba al menos una session publicada');
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .flatMap((j) => (Array.isArray(j) ? j : [j]))
    .flatMap((j) => (j['@graph'] ? j['@graph'] : [j]));
  for (const s of publicadas) {
    const v = bloques.find((b) => b['@type'] === 'VideoObject' && b.name?.includes(`#${s.n}`));
    assert.ok(v, `falta el VideoObject de la session #${s.n}`);
    for (const campo of ['name', 'description', 'thumbnailUrl', 'uploadDate', 'duration', 'embedUrl']) {
      assert.ok(v[campo], `VideoObject #${s.n} sin ${campo}`);
    }
    assert.match(v.uploadDate, /^\d{4}-\d{2}-\d{2}T/, `#${s.n}: uploadDate no es ISO`);
    assert.equal(v.uploadDate.slice(0, 10), s.subido, `#${s.n}: uploadDate no coincide con el dato`);
    assert.match(v.duration, /^PT/, `#${s.n}: duration no es ISO 8601`);
  }
});

test('el schema exige los datos de video de una session publicada', async () => {
  const { default: data } = await import('../src/data.ts').catch(() => ({ default: null }));
  if (data) return;
  // El modulo real se valida en el build; aca se comprueba el contrato del
  // schema con el fixture minimo: una session publicada sin `subido` no vale.
  const texto = leer('src/content/schema.ts');
  assert.match(texto, /path: \['subido'\]/, 'el schema deberia exigir `subido` en una session publicada');
  assert.match(texto, /path: \['duracion'\]/, 'el schema deberia exigir `duracion` en una session publicada');
});

test('el aforo declarado nunca es menor que la asistencia real', () => {
  // El primer intento daba un aforo de 100 para la #1, que tiene 120
  // asistentes. Un JSON-LD que se contradice solo no le sirve a Google ni a
  // nadie, asi que el dato no se publica hasta que cierre.
  const datos = JSON.parse(leer('src/content/glock.json'));
  for (const e of datos.ediciones) {
    if (typeof e.capacidad !== 'number') continue;
    assert.ok(
      e.asistentes <= e.capacidad,
      `edicion #${e.n}: ${e.asistentes} asistentes no entran en un aforo de ${e.capacidad}`,
    );
  }
});

test('el aforo viaja al JSON-LD como QuantitativeValue y solo si se declara', opciones, () => {
  const datos = JSON.parse(leer('src/content/glock.json'));
  const conAforo = datos.ediciones.filter((e) => typeof e.capacidad === 'number');
  assert.ok(conAforo.length > 0, 'se esperaba al menos una edicion con aforo');
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .flatMap((j) => (Array.isArray(j) ? j : [j]))
    .flatMap((j) => (j['@graph'] ? j['@graph'] : [j]));
  for (const e of datos.ediciones) {
    const ev = bloques.find((b) => b['@type'] === 'MusicEvent' && b.name?.includes(`#${e.n}`));
    assert.ok(ev, `falta el MusicEvent de la edicion #${e.n}`);
    if (typeof e.capacidad !== 'number') {
      assert.equal(ev.maximumAttendeeCapacity, undefined, `#${e.n} publica un aforo que el contenido no declara`);
      continue;
    }
    assert.deepEqual(
      ev.maximumAttendeeCapacity,
      { '@type': 'QuantitativeValue', value: e.capacidad },
      `#${e.n}: maximumAttendeeCapacity no coincide con el dato`,
    );
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
  delete roto.ediciones[0].hora;
  roto.ediciones[0].horaFin = '23:00';
  assert.throws(() => glockSchema.parse(roto), /horaFin requiere hora/);
});

test('el schema acepta un show que cruza la medianoche', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const r = glockSchema.safeParse(raw);
  assert.ok(r.success, '19:00 -> 00:00 deberia ser valido');
  for (const e of r.data.ediciones) {
    assert.equal(e.hora, '19:00');
    assert.equal(e.horaFin, '00:00');
  }
});

test('un evento ya ocurrido no se anuncia con entradas disponibles', opciones, () => {
  // Las cuatro ediciones ya pasaron, asi que ninguna puede seguir InStock. El
  // precio se conserva porque es un dato real del evento, pero la disponibilidad
  // tiene que decir SoldOut o le estamos mintiendo a Google con "comprar entradas".
  const eventos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, c]) => JSON.parse(c))
    .flat()
    .filter((b) => b['@type'] === 'MusicEvent');
  const ahora = Date.now();
  let revisados = 0;
  for (const e of eventos) {
    if (!e.offers) continue;
    const fin = new Date(e.endDate ?? e.startDate).getTime();
    if (fin < ahora) {
      revisados++;
      assert.equal(
        e.offers.availability,
        'https://schema.org/SoldOut',
        `${e.name} ya ocurrio pero se anuncia como disponible`,
      );
    }
  }
  assert.ok(revisados > 0, 'ningun evento pasado para verificar');
});

test('hay un skip link que apunta al main (WCAG 2.4.1)', opciones, () => {
  const enlace = /<a[^>]+href="#contenido"[^>]*class="[^"]*skip-link[^"]*"[^>]*>([^<]+)<\/a>/i.exec(html);
  assert.ok(enlace, 'falta el skip link a #contenido');
  assert.ok(enlace[1].trim().length > 0, 'el skip link no tiene texto');
  assert.ok(
    /<main[^>]+id="contenido"/i.test(html),
    'el skip link apunta a #contenido pero el main no tiene ese id',
  );
});

test('el texto real del sitio pasa contraste AA (WCAG 1.4.3)', opciones, () => {
  // Los colores se leen del HTML construido, no de una lista escrita a mano.
  // Una version anterior hacia la cuenta sobre hex dentro del propio test, asi
  // que era una tautologia: ningun cambio real del sitio la podia romper.
  const srgb = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const ratio = (a, b) => {
    const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const PAGINA_BG = hex('#0A0A0A');
  const BLANCO = [255, 255, 255];
  const alpha = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

  // `.skip-link` y `.btn-glock` definen su color y su fondo en el CSS, no con
  // clases utilitarias, asi que hay que leerlos de ahi. Si se asumiera el
  // fondo de la pagina, el skip link (negro sobre magenta) mediria 1.00 y el
  // boton (hueso sobre negro) mediria una combinacion que no existe.
  const cssDir = join(dist, '_astro');
  const css = readdirSync(cssDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(cssDir, f), 'utf8'))
    .join('\n');
  const desdeCss = (clase) => {
    const regla = new RegExp(`\\.${clase}\\s*\\{([^}]*)\\}`).exec(css);
    if (!regla) return null;
    const color = /(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i.exec(regla[1]);
    const bg = /(?:^|;)\s*background:\s*(#[0-9a-f]{6})/i.exec(regla[1]);
    return { fg: color ? hex(color[1]) : null, bg: bg ? hex(bg[1]) : null };
  };

  // Un par solo cuenta si el MISMO elemento lleva color de texto y de fondo.
  // Si solo lleva texto, el fondo real es el de la pagina; si solo lleva
  // fondo, el texto real es el que hereda del body. Nunca inventamos anidamiento.
  const pares = new Map();
  // Ojo con el destructuring: el match es [full, tag, attrs], asi que el
  // atributo es el TERCER elemento.
  for (const [, , attrs] of html.matchAll(/<(\w+)([^>]*)>/g)) {
    const hexText = /text-\[#([0-9a-f]{6})\]/i.exec(attrs);
    const whiteA = /text-white\/(\d{1,3})\b/.exec(attrs);
    const black = /\btext-black\b/.test(attrs);
    const btn = /\bbtn-glock\b/.test(attrs);
    const skip = /\bskip-link\b/.test(attrs);
    const hexBg = /bg-\[#([0-9a-f]{6})\]/i.exec(attrs);
    if (!hexText && !whiteA && !black && !btn && !skip) continue;

    let fg = null;
    let txt = '';
    let bg = hexBg ? hex(`#${hexBg[1]}`) : PAGINA_BG;
    if (hexText) { fg = hex(`#${hexText[1]}`); txt = `text-[#${hexText[1]}]`; }
    else if (whiteA) { const a = +whiteA[1] / 100; fg = alpha(BLANCO, PAGINA_BG, a); txt = `text-white/${whiteA[1]}`; }
    else if (black) { fg = hex('#0A0A0A'); txt = 'text-black'; }
    else if (skip || btn) {
      const real = desdeCss(skip ? 'skip-link' : 'btn-glock');
      if (!real || !real.fg) continue;
      fg = real.fg;
      txt = skip ? '.skip-link' : '.btn-glock';
      if (real.bg) bg = real.bg;
    }

    const k = `${txt} sobre ${hexBg ? `bg-[#${hexBg[1]}]` : skip ? 'fondo de .skip-link' : btn ? 'fondo de .btn-glock' : 'fondo de pagina'}`;
    if (!pares.has(k)) pares.set(k, { fg, bg, r: ratio(fg, bg) });
  }

  assert.ok(pares.size >= 6, `solo ${pares.size} pares de color detectados`);
  const fallas = [...pares].filter(([, v]) => v.r < 4.5).map(([k, v]) => `${k}: ${v.r.toFixed(2)}`);
  assert.deepEqual(fallas, [], 'contraste insuficiente');
});

test('el foco visible y reduced-motion estan declarados', opciones, () => {
  const cssDir = join(dist, '_astro');
  const css = readdirSync(cssDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(cssDir, f), 'utf8'))
    .join('\n');
  assert.ok(css.length > 0, 'no se encontro CSS compilado');
  assert.ok(/:focus-visible/.test(css), 'falta :focus-visible');
  assert.ok(/prefers-reduced-motion/.test(css), 'falta prefers-reduced-motion');

  // El anillo de foco no se puede anular. La version anterior buscaba
  // `outline:none;` con punto y coma, pero el CSS minificado deja
  // `outline:none}` y la guarda no detectaba nada.
  const sinNuestro = css.replaceAll(/main:focus\{outline:none\}/g, '');
  const anulados = [...sinNuestro.matchAll(/([^{}]*)\{([^}]*outline:\s*(?:none|0)\s*[;}])[^}]*\}/g)]
    .map((m) => m[1].trim())
    .filter((sel) => sel && !/^main:focus$/.test(sel));
  assert.deepEqual(anulados, [], `outline anulado en: ${anulados.join(', ')}`);
  assert.ok(
    /:focus-visible\s*\{[^}]*outline:\s*(?!none|0\b)[^;}]+[;}]/.test(sinNuestro),
    ':focus-visible no declara un outline visible',
  );
});

test('el schema rechaza horaFin identico a hora', async () => {
  const { glockSchema } = await import('../src/content/schema.ts');
  const raw = JSON.parse(leer('src/content/glock.json'));
  const roto = structuredClone(raw);
  roto.ediciones[0].horaFin = roto.ediciones[0].hora;
  assert.throws(() => glockSchema.parse(roto), /horaFin debe ser distinta de hora/);
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

/* ------------------------------------------------------------------ *
 * Motion
 *
 * Estos guards existen porque el motion se puede romper de tres formas
 * silenciosas: dejando el contenido invisible, metiendo layout shift, o
 * quemando el presupuesto de performance. Ninguna de las tres falla en el
 * build, asi que hay que probarlas a proposito.
 * ------------------------------------------------------------------ */

/** Los scripts que Astro inlina en el HTML. Los JSON-LD no cuentan: no se ejecutan. */
function jsEjecutado(markup) {
  let bytes = 0;
  const modulos = [];
  const clasicos = [];
  for (const m of markup.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/ld\+json/.test(m[1])) continue;
    const cuerpo = m[2].trim();
    bytes += cuerpo.length;
    // El modulo va diferido; el clasico corre sincrono en el head. Importa
    // la distincion: la red de seguridad tiene que vivir en el clasico,
    // porque es el unico que corre si el modulo no llega a cargar.
    if (/type="module"/.test(m[1])) modulos.push(cuerpo);
    else clasicos.push(cuerpo);
  }
  return { bytes, codigo: [...modulos, ...clasicos].join('\n'), modulos: modulos.join('\n'), clasicos: clasicos.join('\n') };
}

test('el presupuesto de JS sigue siendo trivial', opciones, () => {
  const { bytes } = jsEjecutado(html);
  // 2.5 KB hoy. El techo esta para que un modulo de scroll o una libreria
  // de animacion no entren sin que alguien lo note en el PR.
  assert.ok(bytes < 4096, `el JS inlinado crecio a ${bytes} B, sobre el presupuesto de 4096 B`);
});

test('sin JS el contenido nunca queda oculto', opciones, () => {
  // Si el estado inicial viviera en el CSS sin el gate `.js-reveal`, un fallo
  // de red o un error de sintaxis dejaria los titulos en blanco para siempre.
  // El `<html>` estatico no debe traer la clase: la agrega el script.
  const htmlTag = /<html[^>]*>/.exec(html);
  assert.ok(htmlTag, 'no hay etiqueta <html>');
  assert.ok(!htmlTag[0].includes('js-reveal'), '<html> trae js-reveal en el HTML estatico: el contenido quedaria oculto sin JS');

  const css = leer('src/styles/global.css');
  const ocultos = [...css.matchAll(/([^{}]*\[data-reveal\][^{}]*)\{([^}]*)\}/g)]
    .filter(([, sel]) => !sel.includes('.js-reveal'))
    .map(([, sel]) => sel.trim());
  assert.deepEqual(ocultos, [], `estos selectores ocultan sin el gate .js-reveal: ${ocultos.join(' | ')}`);
});

test('prefers-reduced-motion no deja el wipe a medias', opciones, () => {
  // La trampa: el reveal depende de una transition para pasar de oculto a
  // visible, y el bloque de reduced-motion mata las transitions. Sin
  // neutralizar el clip-path a mano, el contenido desaparece justamente
  // para quien pidio menos movimiento.
  const css = leer('src/styles/global.css');
  const i = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(i > 0, 'falta el bloque prefers-reduced-motion');
  const bloque = css.slice(i);
  assert.match(
    bloque,
    /\.js-reveal\s*\[data-reveal\]\s*\{[^}]*clip-path:\s*none\s*!important/,
    'reduced-motion no anula el clip-path del reveal: el contenido quedaria oculto',
  );
});

test('el motion solo toca propiedades que no mueven la pagina', opciones, () => {
  // Cualquier propiedad de layout (height, top, margin, width...) genera CLS.
  // El repo no tiene .gitattributes, asi que un checkout fresco en Windows trae
  // CRLF y el literal de abajo, que lleva \n duro, no matchearia. Normalizamos
  // al leer para que el test dependa del contenido y no de como quedo el
  // checkout.
  const css = leer('src/styles/global.css').replace(/\r\n/g, '\n');
  const inicio = css.indexOf('/* ------------------------------------------------------------------ *\n * MOTION');
  assert.ok(inicio > 0, 'no se encuentra el bloque MOTION');
  const bloque = css.slice(inicio, css.indexOf('@media (prefers-reduced-motion: reduce)', inicio));
  for (const prop of ['height:', 'min-height:', 'width:', 'top:', 'bottom:', 'left:', 'margin', 'padding']) {
    const culpable = new RegExp(`^[^/*]*\\b${prop.replace(':', '')}`, 'm');
    assert.ok(!culpable.test(bloque), `el bloque MOTION declara "${prop}", que puede generar layout shift`);
  }
});

test('el elemento LCP no se anima', opciones, () => {
  // El h1 es el LCP. Animar su clip-path mueve el timestamp de LCP y puede
  // romper el presupuesto de 2500 ms. Los reveals arrancan despues.
  const h1 = /<h1[^>]*>/.exec(html);
  assert.ok(h1, 'no hay h1');
  assert.ok(!h1[0].includes('data-reveal'), 'el h1 (LCP) tiene data-reveal');
  assert.ok(html.indexOf('<h1') < html.indexOf('data-reveal'), 'el h1 deberia ir antes del primer reveal');
});

test('el reveal tiene red de seguridad si el modulo no carga', opciones, () => {
  const { codigo, clasicos, modulos } = jsEjecutado(html);
  assert.match(codigo, /js-reveal/, 'el script que agrega .js-reveal no esta en el build');
  assert.match(modulos, /IntersectionObserver/, 'el reveal por scroll deberia usar IntersectionObserver');
  // Tiene que estar en el script sincrono del head, no en el modulo: el
  // modulo es lo que puede no cargar. Ademas el nombre aparece tambien en el
  // modulo (que lo cancela), asi que buscarlo en el conjunto no verifica nada.
  assert.match(
    clasicos,
    /setTimeout\([\s\S]{0,140}?classList\.remove\(\s*['"]js-reveal['"]\s*\)/,
    'sin failsafe en el script sincrono, un modulo roto deja el contenido oculto para siempre',
  );
  assert.match(clasicos, /classList\.add\(\s*['"]js-reveal['"]\s*\)/, 'el script sincrono es el que habilita el gate .js-reveal');
});
