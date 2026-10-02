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

// El modulo va inline dentro del index.html y el bundle lleva sus propios
// `data-reveal` (el querySelectorAll y el closest del scope). Sobre el HTML crudo
// el conteo de scopes sale inflado en uno y `[data-reveal]` / `data-reveal-scope`
// matchean igual que un atributo sin valor. Scripts, estilos y comentarios no son
// atributos, asi que salen antes de medir: un `<` dentro de un `<style>` o un
// comentario con `data-reveal="item"` desincronizaria el recorrido del anidamiento
// o inflaria el conteo de declarados.
const markup = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');

// Recorta un tag largo por el medio, no por el final: el rol (`data-reveal="lead"`)
// vive al cierre del atributo y recortarlo por el final lo escondia. Se usa en los
// mensajes que corren sobre el build, donde no hay nombre de componente que citar.
const etiquetar = (t) => (t.length > 110 ? `${t.slice(0, 60)}...${t.slice(-46)}` : t);

// Un atributo que solo *empieza* por `data-reveal` no es un reveal. El
// vocabulario son los dos roles y el scope —`data-reveal="lead"`,
// `data-reveal="item"`, `data-reveal-scope`— y nada mas, asi que un
// `data-reveal-group` que alguien agregue mañana no puede disparar un guard que
// culpa a un item. La frontera va en el nombre del atributo: `data-reveal` sin
// guion ni letra pegada ni atras ni adelante, lo que deja pasar el `=` del rol y
// el cierre del tag, y descarta todo lo que hale de `data-reveal-`.
//
// El `data-reveal` pelado SI cuenta como reveal, y es deliberado: es lo que
// escribe quien se olvida del rol, o sea el estado que este guard existe para
// cazar. Es el mismo defecto latente que ya habia corregido el guard de pelados
// del build con `(?![-\w=])`, pero en la polaridad contraria —alla solo interesan
// los sin valor, asi que el `=` los excluye—. Los dos tienen que mirar el nombre
// completo del atributo y no un prefijo; por eso viven en un helper y no
// repetidos.
const RE_REVELO = /(?<![\w-])data-reveal(?![\w-])/;
const esRevelo = (tag) => RE_REVELO.test(tag);

// Los comentarios se borran de todo el CSS antes de mirar una regla, y se borran
// reemplazandolos por espacios en vez de por nada: el indice de cada caracter tiene
// que seguir siendo el mismo, porque `reglaDe` devuelve offsets que el assert de
// orden compara entre reglas y `cuerpoDe` recibe el `desde` que le paso otro helper.
//
// No es una formalidad. Este stylesheet carga comentarios en espanol que explican
// cada por que, y varios nombran las mismas propiedades que los asserts miran
// —`transform`, `clip-path`, `opacity`—, asi que un `/* el clip abre aca */` dentro
// del keyframe del h1 hacia fallar el assert de clip sobre un archivo correcto: el
// comentario no es codigo. `reglaDe` ya lo hacia en el selector; `cuerpoDe` es el
// que se habia quedado fuera, y es el que le reparte los cuerpos a los asserts.
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));

// El cuerpo de la primera regla de PRIMER NIVEL cuyo selector ES `selector`, con
// el indice donde arranca el selector, o `null` si no existe. El `indice` esta
// porque hay una comparacion que no se puede hacer con el cuerpo: el orden de dos
// reglas.
//
// El locator tiene que comparar el selector entero y no un prefijo. Con
// `indexOf('.glock-hero-title')` un `.glock-hero-title span` de arriba roba el
// recorte y todos los asserts del h1 pasan mirando un bloque que no es el suyo;
// con `.glock-hero-rise` pasa lo mismo con un `-alt`. Es el defecto que
// `RE_REVELO` ya corrigio en el otro extremo de la cadena —un prefijo tomado por
// el nombre entero— asi que aca la frontera va en el final del selector: se
// separan las partes de la lista y se comparan completas.
//
// Y tiene que ser de primer nivel, por el mismo motivo un escalon mas arriba: un
// `@media (max-width: 640px) { .glock-hero-title { … } }` de arriba es un override
// responsive, no la entrada del h1, y tomarlo como si lo fuera haria que todos los
// asserts del hero leyeran el breakpoint equivocado —casi siempre el equivocado—.
// Es el Minor 3 del retarget por prefijo, con un `@media` en vez de un decoy, y un
// breakpoint es una edicion mucho mas probable que un decoy. El recorrido lleva la
// profundidad de llaves a mano: cuando aparece una `{` en nivel 0, el selector es
// todo lo que hubo desde la ultima llave cerrada.
function reglaDe(css, selector) {
  const texto = sinComentarios(css);
  let desde = 0;
  let nivel = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '}') { nivel -= 1; desde = i + 1; continue; }
    if (texto[i] !== '{') continue;
    const partes = texto.slice(desde, i).split(',').map((p) => p.trim());
    if (nivel === 0 && partes.includes(selector)) {
      return { desde, llave: i, nivel, cuerpo: cuerpoDe(css, i) };
    }
    nivel += 1;
    desde = i + 1;
  }
  return null;
}

// Un solo recorrido de tags en todo el archivo, porque la parte dificil —los
// void que no se apilan, los de cierre implicito que se cierran antes de apilar
// y el corte por nombre que deja sana una pila desincronizada en vez de inventar
// un anidamiento— no puede tener dos versiones: la mas debil siempre es la que
// nadie revisa. El `<br />` del h1 y el `<span>` del `.map` del marquee entran por
// la regla de cierre explicito, asi que ninguno de los dos desincroniza.
//
// El regex se clona en cada llamada porque lleva `g` y `lastIndex` es estado: dos
// recorridos que compartieran la instancia empezarían el segundo en donde termino
// el primero y perderian tags en silencio.
const SIN_CIERRE = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
const CIERRE_IMPLICITO = new Set([
  'dd', 'dt', 'li', 'option', 'p', 'rp', 'rt', 'td', 'th', 'thead', 'tbody', 'tfoot', 'tr',
]);
const RE_TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

function recorrerTags(src, alAbrir) {
  const re = new RegExp(RE_TAG.source, 'g');
  const pila = [];
  let m;
  while ((m = re.exec(src))) {
    const nombre = m[2].toLowerCase();
    if (m[1] === '/') {
      const i = pila.findLastIndex((e) => e.nombre === nombre);
      if (i >= 0) pila.length = i;
      continue;
    }
    if (m[4] === '/' || SIN_CIERRE.has(nombre)) continue;
    if (CIERRE_IMPLICITO.has(nombre)) {
      const i = pila.findLastIndex((e) => e.nombre === nombre);
      if (i >= 0) pila.length = i;
    }
    alAbrir({ tag: m[0], nombre, atributos: m[3] || '' }, pila);
    pila.push({ nombre, tag: m[0], atributos: m[3] || '' });
  }
  return pila;
}

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

/**
 * El cuerpo de la regla que arranca en `desde`, contando llaves en vez de cortar
 * en el primer `}`. Un `@keyframes` abre un bloque por cada paso, asi que el
 * corte corto dejaria verificado `from` y sin mirar `to`: justo donde se
 * colaria un `opacity: 0` que nadie ve. Lo mismo pasa con un `@media` que
 * envuelve reglas: hay que bajar hasta su llave de cierre, no hasta la de la
 * primera regla que contiene.
 *
 * Los comentarios se borran antes de contar y antes de devolver: una llave de
 * cierre escrita dentro de un comentario para explicar el corte no puede cerrar
 * la regla antes de tiempo. Los indices no se mueven porque el enmascarado
 * conserva la longitud —ver `sinComentarios`—, asi que el `desde` que recibe el
 * helper es el mismo indice del texto que el recorrido de llaves usa.
 */
function cuerpoDe(css, desde) {
  const texto = sinComentarios(css);
  const abierto = texto.indexOf('{', desde);
  let prof = 0;
  for (let i = abierto; i < texto.length; i++) {
    if (texto[i] === '{') prof++;
    else if (texto[i] === '}' && --prof === 0) return texto.slice(abierto + 1, i);
  }
  return '';
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
  //
  // Se lee `markup` y no `html` porque este assert es de orden sobre contenido
  // visible: `html` trae el `<head>` con el modulo inline, y un solo `[data-reveal]`
  // mencionado ahi haria que el `indexOf` encontrara "el primer reveal" en el
  // script y el fallo le echaria la culpa al h1, que esta perfecto. `markup` ya
  // viene sin scripts, estilos ni comentarios (ver el helper del encabezado).
  const h1 = /<h1[^>]*>/.exec(markup);
  assert.ok(h1, 'no hay h1');
  assert.ok(!esRevelo(h1[0]), 'el h1 (LCP) tiene data-reveal');
  // El limite del nombre, no un prefijo: un atributo futuro como
  // data-reveal-algo no es un reveal, y haria fallar este assert por nada.
  const primerRevelo = markup.search(RE_REVELO);
  assert.ok(markup.indexOf('<h1') < primerRevelo, 'el h1 deberia ir antes del primer reveal');
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

test('lead e item arrancan ocultos solo con el gate .js-reveal', opciones, () => {
  // El wipe de lead y el rise de item son los dos estados iniciales del
  // reveal. Si uno se declara sin el gate, un fallo de red deja esa parte de
  // la pagina en blanco para siempre.
  const css = leer('src/styles/global.css');
  const ocultos = [...css.matchAll(/([^{}]*\[data-reveal[^\]]*\][^{}]*)\{([^}]*)\}/g)]
    .filter(([, , cuerpo]) => /opacity:\s*0(?![.\d])|clip-path:\s*inset\(0 100%/.test(cuerpo))
    .map(([, sel]) => sel.trim());
  assert.ok(ocultos.length >= 2, `se esperaban al menos 2 estados iniciales, hay ${ocultos.length}`);
  for (const sel of ocultos) {
    assert.ok(sel.includes('.js-reveal'), `este estado inicial oculta sin el gate: ${sel}`);
  }
});

test('el rise de los items usa solo propiedades que no mueven la pagina', opciones, () => {
  const css = leer('src/styles/global.css');
  const i = css.indexOf('.js-reveal [data-reveal="item"]');
  assert.ok(i > 0, 'no existe la regla de estado inicial del item');
  // Del selector hasta el proximo @media: cubre el rise, el hover de
  // misalign, los botones y el flyer. Todos tienen que seguir limpios.
  const bloque = css.slice(i, css.indexOf('@media', i));
  assert.match(bloque, /opacity:\s*0(?![.\d])/, 'el item no arranca con opacity 0');
  assert.match(bloque, /transform:\s*translateY/, 'el item no arranca con translateY');
  assert.match(bloque, /--reveal-delay/, 'el item no lee el retardo que escribe motion.ts');
  for (const prop of ['height', 'top', 'bottom', 'left', 'margin', 'padding', 'width']) {
    assert.ok(!new RegExp(`\\b${prop}\\s*:`).test(bloque), `el rise declara ${prop}, que genera layout shift`);
  }
});

test('el item neutraliza el clip del lead', opciones, () => {
  // `.js-reveal [data-reveal]` tambien matchea a los items: si el item no
  // anula el clip-path, arranca con el wipe y nunca se abre del todo.
  const css = leer('src/styles/global.css');
  const i = css.indexOf('.js-reveal [data-reveal="item"]');
  const bloque = css.slice(i, css.indexOf('@media', i));
  assert.match(bloque, /clip-path:\s*none/, 'el item hereda el clip del lead y queda incompleto');
});

test('el escalonado tiene paso 60 y tope 420', opciones, () => {
  // Sin tope, una grilla de 12 items tarda 660 ms en terminar de entrar y se
  // lee como lentitud. Con tope, los ultimos comparten el retardo maximo.
  const src = leer('src/scripts/motion.ts');
  assert.match(src, /PASO_MS\s*=\s*60\b/, 'el paso de escalonado no es 60 ms');
  assert.match(src, /TOPE_MS\s*=\s*420\b/, 'el tope de retardo no es 420 ms');
  assert.match(src, /Math\.min\([\s\S]{0,80}?PASO_MS[\s\S]{0,80}?TOPE_MS/, 'el retardo no se satura con TOPE_MS');
});

test('lead entra sin retardo y los items con retardo', opciones, () => {
  // El titulo es lo primero que tiene que aparecer en cada seccion. Si el
  // lead pasara por el calculo de retardo, entraria tarde y el efecto se
  // invierte: el texto de apoyo aparecia antes que el titular.
  const src = leer('src/scripts/motion.ts');
  assert.match(src, /PASO_MS\s*=\s*60\b/, 'no hay constantes de escalonado');
  assert.match(src, /Math\.min\(/, 'el retardo no se calcula');
  const salto = /dataset\.reveal === ['"]lead['"][\s\S]{0,160}?continue;/.exec(src);
  assert.ok(salto, 'el bucle de escalonado no salta a los leads con continue');
  assert.ok(
    /lead[\s\S]{0,160}?continue;[\s\S]{0,400}?--reveal-delay/.test(src),
    'el retardo se escribe despues del continue, asi que el lead tambien lo lleva',
  );
});

test('el observer cubre los reveals sueltos, no solo los scopes', opciones, () => {
  // El fallo mas caro posible en este sitio: un [data-reveal] fuera de todo
  // scope se queda invisible para siempre porque nadie lo observa.
  const src = leer('src/scripts/motion.ts');
  // `closest` sigue en el modulo, pero para ubicar cada item dentro de su scope y
  // sacarle el indice. Lo que no puede volver a aparecer es un reveal excluido
  // del grupo observado: eso lo vigila el test del contrato de observacion.
  assert.match(src, /closest\(\s*['"]\[data-reveal-scope\]['"]\s*\)/, 'el modulo dejo de ubicar cada item en su scope');
  assert.match(src, /getBoundingClientRect/, 'se perdio la red de seguridad propia');
});

test('el retardo que escribe el modulo lleva sus unidades', opciones, () => {
  // Un numero sin unidad invalida la declaracion `transition-delay` entera y el
  // escalonado desaparece sin ruido: ni el CSS ni el navegador se quejan. Por
  // eso no alcanza con que el modulo nombre `--reveal-delay`, hay que mirar que
  // lo que se interpola termine en `ms`.
  const src = leer('src/scripts/motion.ts');
  // El valor se lee hasta el `);` de la llamada, no hasta el primer parentesis:
  // el retardo escalonado es `Math.min(...)` y cortarlo ahi lo truncaria.
  const escrituras = [...src.matchAll(/setProperty\(\s*['"]--reveal-delay['"]\s*,\s*([\s\S]*?)\);/g)];
  // Toda escritura tiene que ser visible para el patron de arriba. Comparar
  // contra el total en vez de contra un numero fijo evita codificar una suposicion
  // sobre cuantas llamadas hay: si alguien extrae un helper o escribe el retardo
  // de otra forma, el conteo lo delata en vez de dejarlo pasar en silencio.
  const totales = (src.match(/setProperty\(\s*['"]--reveal-delay['"]/g) ?? []).length;
  assert.ok(totales > 0, 'el modulo no escribe ningun retardo');
  assert.equal(
    escrituras.length,
    totales,
    `solo ${escrituras.length} de ${totales} escrituras de --reveal-delay se pueden verificar: alguna se escapa del patron y podria ir sin unidad`,
  );
  for (const [, valor] of escrituras) {
    assert.match(
      valor.trim(),
      /ms['"`]?$/,
      `el retardo "${valor.trim()}" no lleva unidad: transition-delay quedaria invalido y el escalonado no se veria`,
    );
  }

  // El retardo tambien se arma mucho antes de escribirse, al calcular el indice
  // de cada item. Si ese numero saliera sin unidad, el `setProperty` lo escribiria
  // igual y el chequeo de arriba no lo veria nunca: el retardo ya llego sin `ms`.
  // Por eso se mira tambien el punto donde se calcula, no solo donde se escribe.
  const calculos = [...src.matchAll(/`[^`]*\$\{[^}]*(?:PASO_MS|TOPE_MS)[^}]*\}[^`]*`/g)];
  assert.ok(calculos.length > 0, 'no se encuentra el calculo del retardo por indice');
  for (const [valor] of calculos) {
    assert.match(valor, /ms`$/, `"${valor}" calcula el retardo sin unidad: llegaria sin ms al elemento`);
  }
});

test('el modulo cancela el failsafe del head, no solo lo declara', opciones, () => {
  // `_glockFailSafe` ya aparece en la firma de tipo de `doc`, asi que buscar el
  // nombre no prueba nada: el modulo puede no cancelar y el guard seguir verde.
  // Lo que tiene que existir es la llamada. Si falta, a los 2s el script
  // sincrono saca `.js-reveal` y deshace el reveal en el medio.
  const src = leer('src/scripts/motion.ts');
  assert.match(
    src,
    /clearTimeout\([^)]*_glockFailSafe[^)]*\)/,
    'el modulo no cancela el failsafe con clearTimeout: a los 2s se deshace el reveal',
  );
});

test('el reveal suelto se muestra: la rama sin scope tambien pone .is-in', opciones, () => {
  // Un `[data-reveal]` fuera de todo scope entra con el retardo por default. Si
  // esa rama no lo muestra, el elemento se queda con `opacity: 0` y el clip
  // cerrado para siempre: invisible sin error, justo lo que el gate entero
  // existe para evitar.
  //
  // La rama se ancla en el literal `0ms`, que es como se la reconoce, y no en el
  // nombre de la funcion que la contiene: ese nombre es un helper privado y no
  // uno de los contratos del plan, asi que un rename inocuo no debe romper esto.
  const src = leer('src/scripts/motion.ts');
  const i = src.indexOf("'0ms'");
  assert.ok(i > 0, 'no se encontro la rama que escribe el retardo por default');
  // Se busca la llave que realmente enclosea al literal, hacia atras y con
  // profundidad: un simple `lastIndexOf('{')` caeria en la llave de un bloque ya
  // cerrado (el `if` del lead) y el recorte saldria vacio.
  let ini = i;
  let prof = 0;
  for (let j = i; j >= 0; j--) {
    if (src[j] === '}') prof++;
    else if (src[j] === '{') {
      if (prof === 0) {
        ini = j;
        break;
      }
      prof--;
    }
  }
  let fin = src.length;
  prof = 0;
  for (let j = ini; j < src.length; j++) {
    if (src[j] === '{') prof++;
    else if (src[j] === '}' && --prof === 0) {
      fin = j;
      break;
    }
  }
  // Se mira lo que viene DESPUES del literal: el `mostrar` del lead queda antes,
  // asi que no puede hacer de testigo de una rama que dejo de revelar.
  const despues = src.slice(i, fin);
  assert.match(
    despues,
    /mostrar\([^)]*\)|classList\.add\(\s*['"]is-in['"]\s*\)/,
    'la rama del reveal suelto no muestra el elemento: quedaria invisible para siempre',
  );
});

test('el observer observa cada [data-reveal] y nunca a los scopes', opciones, () => {
  // El grupo observado tiene que ser exactamente todos los `[data-reveal]`.
  // Filtrarlo con un `closest` es como un reveal (hermano de su scope, montado
  // despues del init) queda oculto para siempre: el CSS lo esconde, el modulo
  // no lo observa y el failsafe ya fue cancelado, asi que no queda red que lo
  // delate. Ademas, observar el scope entero revelaria sus items de abajo
  // fuera de pantalla y el escalonado no se veria.
  //
  // LIMITACION CONOCIDA: esto sigue siendo un grep sobre la forma del codigo, no
  // una prueba de comportamiento. Un observer por elemento y uno por scope son los
  // dos TypeScript valido, asi que no se verifica que en ejecucion se observe cada
  // reveal. Tampoco ve una exclusion escondida tras otro selector de scopes o tras
  // un helper que reescriba la coleccion en caliente. Cerrar eso exigiria ejecutar
  // el modulo contra un DOM simulado, harness que todavia no existe en este repo.
  const src = leer('src/scripts/motion.ts');
  const decl = /const\s+(\w+)\s*=\s*document\.querySelectorAll<HTMLElement>\(\s*['"]\[data-reveal\]\s*['"]\s*\)/.exec(src);
  assert.ok(decl, 'no se encuentra la coleccion de reveals que alimenta al observer');
  // `reveals` es la coleccion publica que este test ya usa para anclar el recorte,
  // no un helper privado: capturarla y citarla no acopla el test a un nombre.
  const coleccion = decl[1];
  const observe = /[\w$]+\.observe\(/.exec(src);
  assert.ok(observe && observe.index > decl.index, 'la coleccion de reveals no es la que se observa');
  // El recorte arranca en el COMIENZO de la sentencia, no en el `.observe(`, e
  // incluye el `for` que la envuelve. Sin el `for` el guard no veria un filtro
  // aplicado al armar la lista, que es la mitad de los casos: ese `.filter` vive
  // en su propia sentencia y nunca entra en un recorte arrancado en el `observe`.
  const ini = Math.max(
    src.lastIndexOf(';', observe.index),
    src.lastIndexOf('{', observe.index),
    src.lastIndexOf('}', observe.index),
  ) + 1;
  const hasta = src.indexOf(';', observe.index);
  const sentencia = src.slice(ini, hasta + 1);
  // Se itera la coleccion declarada, sin derivados. `of sueltos` observa una
  // lista ya filtrada y deja reveals fuera del grupo; `of reveals.filter(...)` o
  // `of reveals.slice(...)` los dejan fuera igual, asi que el `)` tiene que
  // pegarse al nombre.
  assert.match(
    sentencia,
    new RegExp(`for\\s*\\(\\s*const\\s+\\w+\\s+of\\s+${coleccion}\\s*\\)`),
    `el observer no itera la coleccion de reveals (${coleccion}): se observan elementos derivados y cualquier reveal excluido queda oculto para siempre`,
  );
  // Y cada elemento se pasa tal cual, sin re-derivarlo en el argumento: un
  // `observe(el.closest(...) ?? el)` vuelve a dejar fuera al reveal con scope.
  assert.match(
    sentencia,
    /\.observe\(\s*\w+\s*\)/,
    'el observer no recibe el reveal tal cual: derivarlo en el argumento deja elementos fuera del grupo y para siempre ocultos',
  );
  // Y ningun grupo se construye sobre scopes: el scope no es unidad de observacion.
  assert.ok(
    !/querySelectorAll[^;]*\(\s*['"]\[data-reveal-scope\]/.test(src),
    'el grupo observado se construye sobre scopes: un scope alto se revelaria entero fuera de pantalla',
  );
});

test('el lead no consume indice en la pasada de escalonado', opciones, () => {
  // El indice de cada item sale de un contador por scope. Si el lead no se salta
  // en ESA pasada, se queda con el indice 0 y empuja un lugar a todos los items
  // de su scope: 0/60/120 pasa a ser 60/120/180. No es un cambio invisible, son
  // +60ms para cada item de esa seccion, y ningun otro guard lo mira: el de
  // unidades solo ve el sufijo `ms` y el de escalonado ya paso por el retardo.
  const src = leer('src/scripts/motion.ts');
  // Se ancla en el `closest` porque es parte del contrato (el item se ubica en su
  // scope) y no en el nombre de una variable. El bloque que lo envuelve es el
  // cuerpo del `for` de la pasada de indices, y el guard del lead esta antes.
  // Del ultimo `closest` hacia atras, y no del primero: si otra parte del modulo
  // buscara tambien el scope, el guard tiene que anclar en la pasada de indices y
  // no en esa otra, o miraria un bloque que no es el del escalonado.
  //
  // LIMITACION CONOCIDA: se mira la comparacion y el `continue`, no que el `lead`
  // sea el unico tipo sin retardo. Si alguien reescribiera el salto con una
  // bandera o un `Map` de indices, el guard no lo veria: sigue siendo un grep.
  const i = src.lastIndexOf("closest('[data-reveal-scope]')");
  assert.ok(i > 0, 'no se encuentra la pasada que ubica cada item en su scope');
  let ini = i;
  let prof = 0;
  for (let j = i; j >= 0; j--) {
    if (src[j] === '}') prof++;
    else if (src[j] === '{') {
      if (prof === 0) {
        ini = j;
        break;
      }
      prof--;
    }
  }
  // Solo la parte anterior al `closest`: el guard tiene que estar antes de que el
  // item se ubique, porque despues ya se le asigno un indice.
  assert.match(
    src.slice(ini, i),
    /(?<![!=])===\s*['"]lead['"]\s*\)[^;{]*continue\b/,
    'la pasada de indices no saltea el lead: el lead toma el indice 0 y todos los items de su scope arrancan 60ms tarde',
  );
});

test('ningun reveal queda fuera de un scope', opciones, () => {
  // EdicionCard aporta reveals pero no scope: su <article> se renderiza
  // dentro del scope de Ediciones. Ese es el unico parcial permitido.
  const parciales = new Set(['EdicionCard']);
  const archivos = [
    'Artistas', 'Contacto', 'EdicionCard', 'Ediciones', 'Faq', 'Manifiesto',
    'Proxima', 'SerParte', 'Sessions', 'SongWars', 'Sponsors',
  ];
  for (const nombre of archivos) {
    const src = leer(`src/components/${nombre}.astro`);
    const reveals = (src.match(/data-reveal="(?:lead|item)"/g) || []).length;
    if (reveals === 0) continue;
    if (parciales.has(nombre)) continue;
    assert.match(src, /data-reveal-scope/, `${nombre}.astro tiene ${reveals} reveals y ningun scope`);
  }
  assert.deepEqual([...parciales], ['EdicionCard'], 'cambio el set de parciales: revisa quien quedo huerfano');
});

test('cada componente mantiene su densidad de reveals', opciones, () => {
  // La densidad es el entregable de esta task y hasta ahora solo tenia cobertura
  // aditiva: un reveal de mas lo agarra el guard de anidamiento, pero uno de
  // menos no lo veia nadie. Sacar el `<article>` item de SongWars, o cambiar el
  // `<ul>` entero de Artistas por reveals por `<li>`, dejaba la suite verde. La
  // tabla convierte cada fila en una decision explicita: componente -> [scope,
  // lead, item].
  //
  // Se mide sobre el fuente y no sobre el build: los conteos son por archivo, y
  // el `.map` de EdicionCard rinde cuatro veces en el build y una en fuente.
  //
  // EdicionCard tiene 0 scope y 1 item: es el parcial sancionado (su article se
  // renderiza dentro del scope de Ediciones) y la tabla lo hace visible en vez de
  // taparlo con un `continue`. Faq tiene 0 items a proposito: sus items son del
  // plan del FAQ. La tarea que los agregue tiene que venir a subir este numero, y
  // esa friccion es el punto: un cambio de densidad se firma, no se cuela.
  const esperado = {
    Manifiesto: [1, 1, 1],
    Ediciones: [1, 1, 1],
    EdicionCard: [0, 0, 1],
    Artistas: [1, 1, 2],
    Sessions: [1, 1, 2],
    SongWars: [1, 1, 2],
    Sponsors: [1, 1, 1],
    Proxima: [1, 1, 2],
    SerParte: [1, 1, 2],
    Contacto: [1, 1, 1],
    Faq: [1, 1, 0],
  };
  const desvios = [];
  for (const [nombre, [scope, lead, item]] of Object.entries(esperado)) {
    const src = leer(`src/components/${nombre}.astro`);
    const contar = (re) => (src.match(re) || []).length;
    const real = [
      contar(/data-reveal-scope/g),
      contar(/data-reveal="lead"/g),
      contar(/data-reveal="item"/g),
    ];
    if (real[0] !== scope || real[1] !== lead || real[2] !== item) {
      desvios.push(
        `${nombre}.astro: esperado scope=${scope} lead=${lead} item=${item}, real scope=${real[0]} lead=${real[1]} item=${real[2]}`,
      );
    }
  }
  assert.deepEqual(desvios, [], `cambio la densidad de reveals:\n  ${desvios.join('\n  ')}`);
});

test('los wrappers que agrupan items no son items', opciones, () => {
  // Un reveal dentro de otro reveal compone dos transforms: el hijo se mueve
  // dos veces y la coreografia se ve rota. Estos wrappers existen para agrupar
  // items, asi que si se convierten en item, todo lo que contienen anima doble.
  // Cada fila trae su motivo porque no todos los wrappers estan en la misma
  // situacion, y el motivo se imprime en el mensaje de fallo: tiene que decir por
  // que ese wrapper no puede ser item, no en que tarea quedo escrito.
  //
  // `Ediciones` y `SerParte` envuelven contenido que ya se revela solo, item por
  // item. El hero no: esta arriba del fold y anima en la carga con su propio
  // vocabulario —`glock-hero-rise` y `data-hero-step`, que no son reveals—, asi
  // que sus hijos no son items y no hay ningun item que composition. Si alguien
  // le pone `data-reveal` al wrapper, este test tiene que caer: el contenido ya
  // esta en pantalla al cargar, y un reveal de scroll lo esconderia para
  // volverlo a mostrar. El rojo de ahi es la senal, no ruido.
  //
  // El patron ancla el nombre del tag (`<div ...`) y no solo la clase. Con
  // `<[^>]*class="mt-4"[^>]*>` el match cae en el primer tag que contiene ESE
  // string exacto: hoy da en el `<div>` solo porque el `<p>` de Ediciones:7 dice
  // `class="mt-4 max-w-2xl"`, donde la comilla no cierra despues de mt-4. Si
  // alguien colapsa ese `<p>` a `class="mt-4"`, el guard retargetea al `<p>`:
  // hoy ese `<p>` lleva reveal, asi que falla un cambio legitimo culpando al `<p>`
  // en vez del wrapper; y si no lo llevara, el retarget pasaria en silencio sin
  // haber mirado el `<div>` real. Anclar el tag evita las dos cosas.
  //
  // Y dentro del atributo `class` se busca la clase distintiva, no el atributo
  // entero. Con el atributo entero, anteponerle una clase al wrapper —le pasa a
  // cualquiera que lo anime, que es justo lo que este test existe para cazar—
  // lo dejaba sin match, y el diagnostico decia que el wrapper no existia. El
  // wrapper seguia ahi, con una clase mas: el assert era correcto y el mensaje
  // mentia. Anclar en el token separa los dos fallos, que piden arreglos
  // distintos.
  //
  // El token tiene que ser una clase entera: se exige que este al principio del
  // atributo o precedida por un espacio, y seguida de un espacio o de la comilla
  // de cierre. Asi un `md:mt-4` de Tailwind no cuenta como el `mt-4` pelado.
  const wrappers = [
    ['Ediciones', 'div', 'mt-4', 'dentro va un `EdicionCard` por edicion y cada uno se revela solo'],
    ['SerParte', 'div', 'mt-8', 'dentro van las filas mapeadas, cada una con su propio `data-reveal="item"`'],
    ['Hero', 'div', 'mt-10', 'el hero esta arriba del fold y anima en la carga con `glock-hero-rise` / `data-hero-step`; un reveal de scroll lo esconderia y lo volveria a mostrar'],
  ];
  for (const [nombre, tag, clase, motivo] of wrappers) {
    const src = leer(`src/components/${nombre}.astro`);
    const escapada = clase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const encontrado = new RegExp(`<${tag}[^>]*class="(?:[^"]*\\s)?${escapada}(?:\\s|")[^>]*>`).exec(src);
    assert.ok(
      encontrado,
      `${nombre}.astro no tiene ningun <${tag}> con la clase "${clase}": revisa que el plan siga vigente, o que el wrapper haya cambiado de clase`,
    );
    assert.ok(
      !esRevelo(encontrado[0]),
      `${nombre}.astro: el wrapper <${etiquetar(encontrado[0])}> no debe ser item porque ${motivo}`,
    );
  }
});

test('el build trae los reveals con jerarquia', opciones, () => {
  // `markup` ya viene sin scripts, estilos ni comentarios (ver el helper del
  // encabezado). Los conteos son pisos con margen: 10 scopes y 10 leads reales
  // contra 9, y 20 items en el build contra el piso de 15. Los pisos solos no ven
  // una seccion que pierde su reveal, por eso esta la tabla por componente abajo.
  const scopes = (markup.match(/data-reveal-scope/g) || []).length;
  const leads = (markup.match(/data-reveal="lead"/g) || []).length;
  const items = (markup.match(/data-reveal="item"/g) || []).length;
  assert.ok(scopes >= 9, `se esperaban al menos 9 scopes, hay ${scopes}`);
  assert.ok(leads >= 9, `se esperaban al menos 9 leads, hay ${leads}`);
  assert.ok(items >= 15, `se esperaban al menos 15 items, hay ${items}`);
  // `(?![-\w=])` y no el `(?!\s*=)` del plan: despues de `data-reveal` puede
  // venir un `=` (el rol) o un `-` (`data-reveal-scope`), y los dos son reveal
  // legitimo. Lo pelado es lo que no sigue de ninguno: `data-reveal>` o
  // `data-reveal data-misalign`. El mensaje cita el fragmento alrededor del match
  // porque sobre un build de 20 KB un "quedo un pelado" obliga a grepear a mano.
  const pelado = /data-reveal(?![-\w=])/.exec(markup);
  assert.ok(
    !pelado,
    `quedo un data-reveal pelado (debe ser lead o item): ${pelado ? etiquetar(markup.slice(Math.max(0, pelado.index - 45), pelado.index + 55).replace(/\s+/g, ' ')) : ''}`,
  );
});

test('el rol de cada reveal esta acotado a lead o item', opciones, () => {
  // El assert de los pelados rechaza `data-reveal` sin valor, pero no acota el
  // valor: un typo como `data-reveal="items"` pasaba las cuatro guardas y
  // regresionaba en silencio y en tres frentes. global.css:167 matchea por
  // presencia (`[data-reveal]`), asi que el elemento sigue oculto, pero
  // global.css:174 (`[data-reveal="item"]`) ya no lo matchea y le da el wipe del
  // lead en vez del rise. La regla generica `.is-in` de global.css:170 no declara
  // transition-delay, asi que el `--reveal-delay` que motion.ts:83 escribe se
  // ignora y el elemento pierde su lugar en el escalonado. Y motion.ts:56
  // (`=== 'lead'` else item) igual le asigna indice, asi que consume un paso y
  // empuja a todos los items siguientes de su scope: un typo deforma la cascada
  // entera. Los conteos del test de arriba no lo ven (`items >= 15` sigue
  // pasando), el pelado no lo ve (hay un `=`) y el anidamiento tampoco (los dos
  // contadores bajan juntos y siguen balanceando).
  //
  // Es a proposito que esto sea exacto y no un superconjunto: agregar un tercer
  // rol es una decision de diseno y tiene que romper este test y hacerse a
  // conciencia, no colarse como un string mas.
  const roles = new Set([...markup.matchAll(/data-reveal="([^"]*)"/g)].map((m) => m[1]));
  assert.deepEqual(
    [...roles].sort(),
    ['item', 'lead'],
    `data-reveal con un rol fuera de lead|item: ${[...roles].join(', ')}`,
  );
});

test('ningun reveal anida otro reveal', opciones, () => {
  // Un reveal dentro de otro reveal compone dos transforms: el hijo se mueve dos
  // veces y la coreografia se ve rota. Esta es la regla que gobierna el markup,
  // asi que va un guard general y no otra lista de wrappers: el test de al lado
  // es una whitelist de tres clases concretas y ademas mira `Hero`, que todavia
  // no tiene ningun reveal. Los dos se solapan a proposito y no se tocan.
  //
  // Se recorre el markup y no el fuente porque "ser descendiente de" no se
  // expresa en texto: el `.map` de EdicionCard y el de SerParte deciden cuantos
  // reveals hay y donde caen, y solo el DOM ya renderizado lo dice. `markup` ya
  // viene sin scripts, estilos ni comentarios (ver el helper del encabezado).
  // La pila la maneja `recorrerTags`, el unico recorrido de tags del archivo.
  //
  // El scope no es un reveal: el observer no lo observa, solo le saca el
  // indice. Por eso la marca exige el rol y `data-reveal-scope` no matchea: todo
  // item es hijo de un scope y eso es lo correcto, no un anidamiento.
  const anidados = [];
  let revelaciones = 0;
  const sinCerrar = recorrerTags(markup, (e, pila) => {
    if (!/\sdata-reveal="(?:lead|item)"/.test(e.atributos)) return;
    revelaciones += 1;
    const ancestro = pila.findLast((a) => /\sdata-reveal="(?:lead|item)"/.test(a.atributos));
    if (ancestro) anidados.push(`${etiquetar(e.tag)} dentro de ${etiquetar(ancestro.tag)}`);
  });
  // Que el recorrido haya consumido el archivo entero es una invariante del
  // recorrido, no una consecuencia de que hoy no haya nada sin cerrar: si un void
  // dejara de apilarse —o un tag de menos matcheara— la pila queda con gente
  // colgando al final y todo lo de arriba pasa mirando un arbol incompleto sin
  // quejarse. El helper devuelve la pila final justamente para que eso sea un
  // assert y no un argumento.
  assert.deepEqual(
    sinCerrar,
    [],
    `el recorrido termino con ${sinCerrar.length} tag(s) sin cerrar: ${sinCerrar.map((t) => t.nombre).join(', ')}. Un void que se apila o un tag que deja de matchear deja la pila colgando y el anidamiento de mas abajo se mide sobre un arbol incompleto`,
  );
  // Anti-vacuitud: el recorrido tiene que haber visto tantos reveals como el
  // markup declara. Si el regex de tags dejara de matchear algo, la pila queda
  // vacia y el deepEqual de abajo pasa sin haber mirado nada: un guard que
  // pasa porque no encuentra nada es peor que no tener guard.
  const declarados = (markup.match(/data-reveal="(?:lead|item)"/g) || []).length;
  assert.equal(
    revelaciones,
    declarados,
    `el recorrido vio ${revelaciones} reveals y el markup declara ${declarados}: el regex de tags dejo de matchear`,
  );
  assert.deepEqual(
    anidados,
    [],
    `un reveal anida otro reveal:\n  ${anidados.join('\n  ')}`,
  );
});

test('la coreografia del hero no esconde el h1', () => {
  // El h1 es el LCP y la invariante no es "su regla de clase no tiene
  // `opacity: 0`": es que este pintado en el primer frame. El estado inicial de
  // una animacion vive adentro del keyframe, asi que el keyframe es lo que hay
  // que mirar. Un `opacity: 0` agregado ahi no toca la clase, no rompe ninguna
  // otra guarda y aun asi corre el LCP.
  //
  // Este test no lleva `opciones` a proposito: lee `src/` y no el build, asi que
  // `opciones` lo saltaria sin motivo en un checkout sin `dist/`. Los tres tests
  // del hero que le siguen hacen lo mismo.
  const css = leer('src/styles/global.css');

  // El locator compara el selector entero, asi que un `.glock-hero-title span`
  // agregado arriba no le roba el recorte a la regla de clase: sin eso, el
  // assert leeria ese bloque y daria verde mirando el elemento equivocado.
  const titulo = reglaDe(css, '.glock-hero-title');
  assert.ok(titulo, 'no existe la entrada del h1');
  assert.ok(
    !/opacity:\s*0(?![.\d])/.test(titulo.cuerpo),
    'el h1 arranca en opacity 0 en la regla de clase: rompe el LCP',
  );
  // El clip se mira en el keyframe, que es donde puede escribirse de verdad; aca
  // queda por si alguien pone el estado inicial en la clase, que es el error
  // clasico de corregir la regla equivocada. No es la guarda que importa: la de
  // abajo. Esta no puede quemarse sola —nadie escribe un clip en una regla que
  // solo declara `animation:`— y por eso no se lee como la que carga el peso.
  assert.ok(
    !/clip-path/.test(titulo.cuerpo),
    'la regla de clase del h1 declara clip-path: el estado inicial tiene que estar en el keyframe, no aca',
  );
  // El `transform` no se exige en la clase: alla no va. La clase solo declara
  // que corre el keyframe, y el keyframe es quien decide de que propiedad se
  // mueve el h1. Exigirlo en la clase daria verde a un h1 que no se mueve. Lo que
  // si tiene que quedar enganchado es el nombre, para que cambiar uno sin cambiar
  // el otro no deje la regla apuntando a un keyframe que no existe.
  assert.match(
    titulo.cuerpo,
    /animation:\s*glock-hero-title-in\b/,
    'el h1 no corre el keyframe glock-hero-title-in: la regla queda sin efecto y el h1 no hace su entrada',
  );

  const k = css.indexOf('@keyframes glock-hero-title-in');
  assert.ok(k > 0, 'no existe el keyframe de entrada del h1');
  const cuerpo = cuerpoDe(css, k);
  // El `transform` se exige con los dos puntos: `/transform/` lo satisfacia un
  // `transform-origin` que no anima nada, y el assert pasaria con el h1 quieto.
  assert.match(
    cuerpo,
    /transform\s*:/,
    'glock-hero-title-in no anima transform: el h1 tiene que entrar moviendose',
  );
  assert.ok(
    !/opacity:\s*0(?![.\d])/.test(cuerpo),
    'glock-hero-title-in arranca en opacity 0: el navegador espera a pintar el h1 y el timestamp de LCP se corre',
  );
  // El clip va aca y no en la regla de clase. El keyframe es la unica parte del
  // CSS donde el estado inicial se escribe de verdad, y la iteracion siguiente
  // del plan abre el clip: escrito en el `from`, el h1 arranca recortado, el
  // navegador no lo cuenta como pintado hasta que el clip se abre y el LCP se
  // corre. La regla de clase no puede tener ese problema, porque no declara
  // estado inicial. Por eso el assert de arriba vive, y por eso este pesa.
  //
  // La invariante es "ningun clip-path en el keyframe", no "ningun clip-path en el
  // from": abrir el clip es justamente la proxima iteracion del plan, asi que este
  // assert la va a dar en rojo a proposito. No se relaja para acomodar ese edit:
  // el edit futuro tiene que enmendar el test a mano, y por el motivo que lo hace
  // necesario —es el unico punto donde el estado inicial del LCP se escribe de
  // verdad— y no porque el assert moleste.
  assert.ok(
    !/clip-path/.test(cuerpo),
    'glock-hero-title-in arranca con el clip cerrado: el h1 no se pinta hasta que el clip se abre, el navegador espera y el timestamp de LCP se corre',
  );

  const rise = reglaDe(css, '.glock-hero-rise');
  assert.ok(rise, 'no existe la entrada de los elementos de apoyo');
  assert.match(rise.cuerpo, /animation/, 'los elementos de apoyo no animan');

  // El fill mode `both` no es cosmetico: los pasos 2, 3 y 4 del rise arrancan
  // 80/160/240 ms tarde, y sin fill el elemento se ve en su estado natural
  // durante el retardo —opaco y sin transform— y recien al vencer el retardo se
  // va a `from`: un flash a invisible en tres de los cinco elementos del hero.
  //
  // Se exigen las dos reglas en un mismo loop, no solo la del rise, para que no
  // quede una que se pueda perder por despacho. Cada fila trae lo que rompe en SU
  // caso, porque no es el mismo: el h1 arranca en delay 0, asi que ahi el `both`
  // no cambia nada hoy y el costo de perderlo es que el dia que su entrada levou
  // un retardo nadie lo note. El rise, en cambio, esta roto ya.
  //
  // Se lee el cuerpo de cada regla con `reglaDe`, asi que ni un comentario ni la
  // regla vecina pueden dar el verde: el marquee de `global.css:112-117` tampoco
  // lleva `both` —no debe— pero vive en otra regla y queda fuera del recorte. El
  // `[^;}]*` evita que el `both` se tome de otra declaracion de la misma regla, y
  // el nombre del keyframe va en el mismo patron para que un verde no pueda venir
  // de una declaracion que anima otra cosa. La forma larga
  // (`animation-fill-mode`) no se acepta: el shorthand ya queda fijado por el
  // assert de `animation:` de mas arriba.
  for (const [selector, animacion, consecuencia] of [
    [
      '.glock-hero-title',
      'glock-hero-title-in',
      'hoy arranca en delay 0 y no se ve, pero el dia que su entrada lleve retardo va a aparecer ya en su sitio y recien ahi saltar al inicio, sin avisar',
    ],
    [
      '.glock-hero-rise',
      'glock-hero-rise',
      'los pasos 2, 3 y 4 se ven en su estado final durante los 80/160/240 ms de retardo y despues entran en from con un flash a opacity 0',
    ],
  ]) {
    const cuerpo = reglaDe(css, selector);
    assert.ok(cuerpo, `${selector} no tiene regla de clase`);
    assert.match(
      cuerpo.cuerpo,
      new RegExp(`animation\\s*:[^;}]*\\b${animacion}\\b[^;}]*\\bboth\\b`),
      `${selector} no declara "${animacion}" con el fill mode "both": sin el, ${consecuencia}`,
    );

    // La duracion tampoco es cosmetica. `animation: glock-hero-title-in 0s
    // var(--ease-glock) both` pasa los dos asserts de arriba —nombre correcto,
    // fill correcto— y deja el h1 en su estado final desde el primer frame: la
    // entrada desaparece sin que ningun selector ni el nombre del keyframe se
    // muevan. En el shorthand de `animation` el primer `<time>` es la duracion
    // por especificacion; el segundo seria el retardo. Se mide el primero.
    const declaracion = /animation\s*:([^;}]*)/.exec(cuerpo.cuerpo)[1];
    const tiempos = [...declaracion.matchAll(/(?<![\w.-])(\d*\.?\d+)(m?s)\b/gi)].map(
      ([, n, u]) => Number(n) * (u.toLowerCase() === 'ms' ? 1 : 1000),
    );
    assert.ok(
      tiempos.length > 0,
      `${selector} no declara duracion en su animation: sin ella la entrada no corre`,
    );
    assert.ok(
      tiempos[0] > 0,
      `${selector} declara duracion 0 en su animation: el elemento arranca en su estado final y la entrada no se ve`,
    );
  }
});

test('los pasos del hero no se pisan entre si', () => {
  // El CTA (linea 14) vive dentro del grid (linea 11). Si el grid tambien
  // animara, el CTA compondria dos transform y entraria corrido. El conteo de
  // lineas con rise es el candado de densidad —no queremos cinco—; que ademas
  // sean hojas lo dice el recorrido de mas abajo, que es otra propiedad.
  const src = leer('src/components/Hero.astro');
  const lineas = src.split(/\r?\n/);
  const atributos = [...src.matchAll(/data-hero-step="(\d)"/g)];
  const pasos = atributos.map(([, n]) => Number(n));
  const conPaso = lineas.filter((l) => /data-hero-step="\d"/.test(l));
  assert.equal(
    conPaso.length,
    4,
    `se esperaban 4 lineas con data-hero-step, hay ${conPaso.length} (pasos: ${pasos.join(', ') || 'ninguno'})`,
  );
  // El conteo por atributo va aparte del conteo por linea: dos pasos en la misma
  // linea dan 4 lineas y 5 atributos, y el primer assert no lo veria.
  assert.equal(
    atributos.length,
    4,
    `se esperaban 4 atributos data-hero-step, hay ${atributos.length} en ${conPaso.length} lineas: dos pasos en la misma linea se pisan entre si`,
  );
  assert.deepEqual(
    [...new Set(pasos)].sort((a, b) => a - b),
    [1, 2, 3, 4],
    `los pasos del hero son ${pasos.join(', ') || 'ninguno'}; se esperaban 1,2,3,4 correlativos`,
  );

  const titulo = lineas.filter((l) => l.includes('glock-hero-title'));
  const rise = lineas.filter((l) => l.includes('glock-hero-rise'));
  assert.equal(titulo.length, 1, `glock-hero-title deberia estar en una sola linea, hay ${titulo.length}`);
  assert.equal(
    rise.length,
    4,
    `glock-hero-rise deberia estar en 4 lineas, una por paso, hay ${rise.length}: un rise de mas es un rise anidado y compone dos transform`,
  );
  const doble = lineas.filter((l) => l.includes('glock-hero-title') && l.includes('glock-hero-rise'));
  assert.deepEqual(
    doble,
    [],
    'una misma linea lleva glock-hero-title y glock-hero-rise: son dos animaciones en un elemento y componen transform',
  );
  assert.ok(
    !titulo[0].includes('data-hero-step'),
    'el h1 lleva data-hero-step: su animacion arranca en 0 y el unico retardo posible seria el de la propia animacion',
  );

  // El conteo no distingue un rise agregado de un rise movido: los tres casos de
  // abajo dejan 4 lineas con rise y 4 con paso, asi que el bloque de arriba los
  // deja verdes. Por eso la ascendencia se mide con el recorrido de `recorrerTags`
  // —el mismo que usa el guard de anidamiento sobre el build, con los mismos
  // void y cierres implicitos, para que el `<br />` del h1 y el `<span>` del
  // `.map` del marquee no desincronicen la pila—:
  //
  //   - subir el rise del CTA (14) al `<div class="md:col-span-7">` (12), que es
  //     su ancestro: el rise ancestro le corre `from { opacity: 0 }` al CTA 80 ms
  //     tarde y el CTA queda invisible durante su propio retardo. Ojo que el `<p>`
  //     de (13) es hermano del CTA, no ancestro: poner el rise ahi no compone
  //     nada, solo baja el conteo de rises a tres;
  //   - subir el rise del CTA al `<div>` de la grilla (7), que es el padre directo
  //     del h1: no tiene `data-hero-step`, asi que delay 0, y su `from { opacity:
  //     0 }` mete al elemento LCP dentro de un subarbol invisible en el primer
  //     frame;
  //   - subirlo al `<section id="top">` (5): todo lo animado queda debajo.
  //
  // La comprobacion va en las dos direcciones porque el hazard no es simetrico. Un
  // rise dentro de un rise compone dos transform; un rise dentro del h1 no compone
  // transform —el ancestro y el descendiente no se multiplican sin 3D—, pero mete
  // al elemento LCP dentro de un `from { opacity: 0 }`, y ese es el mismo LCP que
  // el otro test dice que entra pintado. Medir solo "rise dentro de rise" deja
  // exactamente ese caso en verde: `Hero.astro:7` tiene un solo rise, el `<p>` de (9),
  // asi que mover ese rise al div conserva las 4 lineas con rise, los 4 pasos, los
  // conteos del recorrido y los tres guards, y aun asi el h1 no se pinta en el
  // primer frame. Por eso el titulo tambien pregunta por un rise ancestors, y por
  // eso el mensaje nombra el mecanismo que aplica a lo que se encontro en vez de
  // repetir siempre "componian dos transforms".
  const RE_RISE = /(?<![\w-])glock-hero-rise(?![\w-])/;
  const RE_TITLE = /(?<![\w-])glock-hero-title(?![\w-])/;
  const ascendidos = [];
  let risesVistos = 0;
  let titulosVistos = 0;
  const sinCerrar = recorrerTags(
    src,
    (e, pila) => {
      if (RE_RISE.test(e.atributos)) risesVistos += 1;
      if (RE_TITLE.test(e.atributos)) titulosVistos += 1;
      const esRise = RE_RISE.test(e.atributos);
      const esTitulo = RE_TITLE.test(e.atributos);
      if (!esRise && !esTitulo) return;
      const ancestro = pila.findLast((a) => RE_RISE.test(a.atributos) || RE_TITLE.test(a.atributos));
      if (!ancestro) return;
      // El mecanismo depende de quien quedo adentro, y el mensaje lo dice: dos
      // transform solo se componen cuando los dos elementos se mueven, y el h1 no
      // se mueve cuando lo envuelve un rise, lo que hace es taparlo.
      const mecanismo = esTitulo
        ? 'el rise le corre al h1 su from { opacity: 0 } y el elemento LCP queda sin pintar en el primer frame'
        : 'el rise ancestro y el rise hijo componen dos transform en el mismo elemento';
      ascendidos.push(
        `${mecanismo}:\n      ${etiquetar(e.tag)} dentro de ${etiquetar(ancestro.tag)}`,
      );
    },
  );
  // Anti-vacuitud: el recorrido tiene que haber visto lo mismo que el conteo por
  // linea y tiene que haber consumido el archivo entero. Si el regex de tags dejara
  // de matchear algo, o un void se apilara, la pila queda con gente colgando y el
  // deepEqual de abajo pasa sin haber mirado nada.
  assert.deepEqual(
    sinCerrar,
    [],
    `el recorrido termino con ${sinCerrar.length} tag(s) sin cerrar: ${sinCerrar.map((t) => t.nombre).join(', ')}. Un void que se apila deja la pila colgando y la ascendencia de abajo se mide sobre un arbol incompleto`,
  );
  assert.equal(risesVistos, rise.length, `el recorrido vio ${risesVistos} rises y el conteo por linea ve ${rise.length}`);
  assert.equal(titulosVistos, 1, `el recorrido vio ${titulosVistos} titulos y deberia ver 1`);
  assert.deepEqual(
    ascendidos,
    [],
    `un elemento animado envuelve a otro que tambien anima:\n  ${ascendidos.join('\n  ')}`,
  );

  // Los pasos viven en el markup y los retardos en el CSS. Renumerar uno solo
  // deja al elemento apuntando a un `[data-hero-step='N']` que no existe: no
  // matchea ninguna regla, no recibe retardo y entra con el primero, asi que la
  // ultima pieza aterriza con la primera y el escalonado deja de leerse. Por eso
  // el recorrido de retardos tambien se arma sobre el texto sin comentarios: un
  // retardo escrito dentro de un bloque commented no retrasa a nadie.
  const css = leer('src/styles/global.css');
  const retardos = [...sinComentarios(css).matchAll(/\[data-hero-step='(\d)'\]\s*\{\s*animation-delay:\s*([\d.]+m?s)\s*;/g)]
    .map(([, n, d]) => ({ paso: Number(n), texto: d, ms: Number.parseFloat(d) * (d.endsWith('ms') ? 1 : 1000) }))
    .sort((a, b) => a.paso - b.paso);
  assert.deepEqual(
    retardos.map((r) => r.paso),
    [...new Set(pasos)].sort((a, b) => a - b),
    `el CSS retrasa los pasos ${retardos.map((r) => r.paso).join(', ') || 'ninguno'} y el markup declara ${pasos.join(', ')}: el que no matchea cae en el retardo por defecto y entra con el primero`,
  );
  // Cada pieza entra detras de la anterior, asi que los retardos son distintos y
  // crecen con el numero. El paso 1 arranca en 0 a proposito —entra junto al h1,
  // que tampoco espera—, asi que "ninguno en cero" no puede ser para todos; lo
  // que no puede ser es que el ultimo quede en cero, que es justo lo que pasa
  // cuando el numero se renumera y el markup queda apuntando al aire.
  assert.equal(
    new Set(retardos.map((r) => r.ms)).size,
    retardos.length,
    `dos pasos comparten retardo: ${retardos.map((r) => `${r.paso}=${r.texto}`).join(', ')}`,
  );
  for (let i = 1; i < retardos.length; i++) {
    assert.ok(
      retardos[i].ms > retardos[i - 1].ms,
      `el retardo no crece con el paso: ${retardos[i - 1].paso}=${retardos[i - 1].texto} y ${retardos[i].paso}=${retardos[i].texto}`,
    );
  }
  assert.ok(
    retardos.at(-1).ms > 0,
    `el ultimo paso arranca en 0: el escalonado no se ve y la ultima pieza entra con la primera`,
  );

  // El orden de estas reglas es load-bearing, y es lo unico del stylesheet donde
  // lo es. `.glock-hero-rise` y `[data-hero-step='N']` tienen la misma
  // especificidad —una clase y un selector de atributo, (0,1,0)— asi que gana la
  // que aparece despues, y el shorthand `animation` de la clase reinicia
  // `animation-delay` a 0s como parte de su reset. Con las reglas de retardo
  // arriba, el rise las pisa, los cuatro pasos entran juntos, no hay error de
  // sintaxis y ninguna otra guarda del archivo lo nota.
  //
  // Y tienen que estar al primer nivel, no dentro de un at-rule. Comparar offsets
  // solo no alcanza: `[data-hero-step='2']` metido en el bloque de
  // `prefers-reduced-motion` sigue despues de `.glock-hero-rise`, asi que el
  // assert de orden lo daba por bueno, pero ese retardo solo aplica a quien pidio
  // menos movimiento —donde ademas `animation: none !important` ya apaga todo— y
  // para el resto el paso entra en 0s. Es el caso invertido de Minor D: no se
  // trata de que el locator tome la regla equivocada, sino de que una regla
  // metida donde no aplica pase por estar en el lugar correcto del archivo.
  // `reglaDe` solo devuelve reglas de primer nivel, asi que una metida en un
  // `@media` no aparece y el assert la echa.
  const riseCss = reglaDe(css, '.glock-hero-rise');
  assert.ok(riseCss, 'no existe la entrada de los elementos de apoyo');
  for (const r of retardos) {
    const regla = reglaDe(css, `[data-hero-step='${r.paso}']`);
    assert.ok(
      regla,
      `no existe la regla de retardo del paso ${r.paso} de primer nivel: si esta dentro de un @media el retardo solo aplica bajo esa condicion y el paso entra en 0s en el resto`,
    );
    assert.ok(
      regla.llave > riseCss.llave,
      `[data-hero-step='${r.paso}'] esta antes de .glock-hero-rise y la pierde: el shorthand animation de la clase tiene la misma especificidad y reinicia el retardo a 0s, asi que los cuatro pasos entran juntos`,
    );
  }
});

test('la coreografia del hero respeta reduced-motion', () => {
  const css = leer('src/styles/global.css');
  const i = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(i > 0, 'falta el bloque prefers-reduced-motion');
  const bloque = cuerpoDe(css, i);
  // Esta assert ya estaba cubierta antes de la coreografia: la regla general
  // `*, *::before, *::after { animation: none !important }` es la que apaga el
  // rise del hero. No es cobertura nueva, es un candado sobre esa regla: si
  // alguien la relaja por ser demasiado amplia, el hero vuelve a animarse para
  // quien pidio menos movimiento y ninguna otra guarda lo ve.
  assert.match(
    bloque,
    /animation:\s*none\s*!important/,
    'reduced-motion no mata las animaciones: el hero se animaria igual para quien pidio menos movimiento',
  );
  assert.match(
    bloque,
    /\.js-reveal\s*\[data-reveal="item"\]\s*\{[^}]*opacity:\s*1/,
    'reduced-motion no fuerza opacity 1 en los items: el estado final pasa a depender de que el JS entregue .is-in',
  );
  assert.match(
    bloque,
    /\.js-reveal\s*\[data-reveal="item"\]\s*\{[^}]*transform:\s*none\s*!important/,
    'reduced-motion no anula el translateY de los items: quedan corridos en el sitio final',
  );
});
