# Motion Core: reveal con jerarquia y escalonado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el wipe unico que hoy se repite 9 veces por un vocabulario de reveal con jerarquia (lead wipe, item rise) y escalonado, y cubrir con animacion las zonas hoy quietas del scroll, incluida la coreografia de carga del hero.

**Architecture:** `src/scripts/motion.ts` mantiene un solo `IntersectionObserver` que observa `[data-reveal-scope]` y tambien los `[data-reveal]` sueltos, y escribe `--reveal-delay` en cada hijo cuando el scope entra en pantalla. Todo el movimiento vive en el bloque MOTION de `src/styles/global.css`, que es el unico lugar donde se declaran duraciones y easing.

**Tech Stack:** Astro 5, TypeScript estricto, Tailwind v4, `node:test`. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-29-motion-system-design.md`

Este es el plan 1 de 3. El parallax (`animation-timeline: view()`) y el acordeon del FAQ van en planes separados porque no dependen de este y cada uno tiene un riesgo propio.

## Global Constraints

- Solo se animan `transform`, `clip-path` y `opacity`. Nunca `height`, `min-height`, `width`, `top`, `bottom`, `left`, `margin` ni `padding`: el guard existente `el motion solo toca propiedades que no mueven la pagina` falla si alguna aparece dentro del bloque MOTION.
- Cero listeners de scroll. Cero dependencias nuevas.
- Presupuesto de JS inlinado bajo 4096 B. Hoy son 2560 B.
- Todo estado oculto va gateado con `.js-reveal` en `<html>`, que agrega un script sincrono del `<head>` con failsafe de 2 s. La clase **nunca** aparece en el HTML estatico.
- Easing unico para todo reveal: `cubic-bezier(0.22, 0.7, 0.2, 1)`, declarado una vez como `--ease-glock` en `:root`.
- Paso de escalonado 60 ms, tope 420 ms, como constantes en `motion.ts`.
- El h1 nunca arranca en `opacity: 0` ni con el clip cerrado: es el elemento LCP y arrancarlo invisible mueve el timestamp de LCP.
- **Nunca anidar dos elementos con reveal.** Un reveal dentro de otro reveal compone dos transforms y rompe la coreografia. Si un wrapper ya es `item`, sus hijos no llevan atributo.
- Paleta y layout intocables. Solo se agregan atributos de datos y reglas de motion.
- Tests: `test(nombre, opciones, () => {})` planos, sin `describe`. Helpers: `leer(rel)`, `html` (contenido de `dist/index.html`), `opciones`, `jsEjecutado(markup)`.
- Comandos: `node --test "tests/**/*.test.mjs"` para iterar, `npm run ci` para el ciclo completo, `npx astro preview --port 4321` para mirar.

## File Structure

- `src/styles/global.css` — bloque MOTION. `--ease-glock` en `:root` (linea 3), rise de los items en el bloque MOTION, coreografia del hero antes del bloque de reduced-motion.
- `src/scripts/motion.ts` — reescrito. Un observer, constantes de escalonado, calculo de `--reveal-delay`.
- `src/components/*.astro` — solo se agregan `data-reveal-scope`, `data-reveal="lead"` y `data-reveal="item"`. Sin cambios de estructura ni de clases.
- `tests/content.test.mjs` — guards nuevos al final del archivo.

---

### Task 1: Vocabulario de reveal en CSS

**Files:**
- Modify: `src/styles/global.css` (`:root` linea 3 y bloque MOTION lineas 157-165)
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: nada. Es la base sobre la que trabaja la Task 2.
- Produces: `--ease-glock` en `:root`; los estados `.js-reveal [data-reveal="item"]` y su `.is-in`; los items leen `--reveal-delay` con default `0ms`.

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `tests/content.test.mjs`:

```js
test('lead e item arrancan ocultos solo con el gate .js-reveal', opciones, () => {
  // El wipe de lead y el rise de item son los dos estados iniciales del
  // reveal. Si uno se declara sin el gate, un fallo de red deja esa parte de
  // la pagina en blanco para siempre.
  const css = leer('src/styles/global.css');
  const ocultos = [...css.matchAll(/([^{}]*\[data-reveal[^\]]*\][^{}]*)\{([^}]*)\}/g)]
    .filter(([, , cuerpo]) => /opacity:\s*0|clip-path:\s*inset\(0 100%/.test(cuerpo))
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
  assert.match(bloque, /opacity:\s*0/, 'el item no arranca con opacity 0');
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
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `node --test "tests/**/*.test.mjs"`
Expected: FAIL en `el rise de los items usa solo propiedades que no mueven la pagina` con `no existe la regla de estado inicial del item`, y en `el item neutraliza el clip del lead`. El primer test tambien falla: hoy hay un solo estado inicial.

- [ ] **Step 3: Declarar el easing unico**

En `src/styles/global.css`, dentro de `:root`, despues de `--glock-ink`:

```css
  /* Un solo easing para todo el reveal. Si el wipe y el rise usaran curvas
     distintas, el escalonado se leeria como dos animaciones pegadas. */
  --ease-glock: cubic-bezier(0.22, 0.7, 0.2, 1);
```

- [ ] **Step 4: Reemplazar el wipe por el vocabulario completo**

En `src/styles/global.css`, reemplazar las lineas 157-165 (desde `/* 1. Wipe de entrada.` hasta el cierre de `.js-reveal [data-reveal].is-in`) por:

```css
/* 1. Reveal de entrada. La transition vive en `.is-in` para que solo corra
      cuando el observer agrega la clase, no en cada repintado.

      lead = wipe con clip-path. item = rise con translateY + opacity. Mismo
      easing, misma duracion, misma direccion: es un solo lenguaje con roles,
      no dos efectos distintos. El retardo de los items lo escribe motion.ts
      en --reveal-delay; lead nunca lo lleva. */
.js-reveal [data-reveal] {
  clip-path: inset(0 100% 0 0);
}
.js-reveal [data-reveal].is-in {
  clip-path: inset(0 0 0 0);
  transition: clip-path 0.5s var(--ease-glock);
}
.js-reveal [data-reveal="item"] {
  clip-path: none;
  opacity: 0;
  transform: translateY(10px);
}
.js-reveal [data-reveal="item"].is-in {
  clip-path: none;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s var(--ease-glock), transform 0.5s var(--ease-glock);
  transition-delay: var(--reveal-delay, 0ms);
}
```

El `clip-path: none` explicito en el item no es decorativo: la regla de arriba tambien lo matchea, tiene la misma especificidad y aparece antes, asi que sin el reset el item arranca con el wipe y se queda con un hueco al final del recorrido.

- [ ] **Step 5: Correr los tests y ver que pasan**

Run: `node --test "tests/**/*.test.mjs"`
Expected: PASS en los tres tests nuevos. Los 43 previos siguen en verde, en particular `sin JS el contenido nunca queda oculto`.

- [ ] **Step 6: Commitear**

```bash
git add src/styles/global.css tests/content.test.mjs
git commit -m "feat: reveal con roles, lead wipe e item rise"
```

---

### Task 2: El observer calcula el escalonado

**Files:**
- Modify: `src/scripts/motion.ts` (reescritura completa)
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: `data-reveal-scope`, `data-reveal="lead"`, `data-reveal="item"`, la clase `.is-in` y `--reveal-delay` de la Task 1.
- Produces: `PASO_MS = 60`, `TOPE_MS = 420`; escribe `--reveal-delay` en cada item y `.is-in` en cada reveal del scope activado. Mantiene la cancelacion de `_glockFailSafe` y la red de seguridad por `getBoundingClientRect` que ya tenia.

- [ ] **Step 1: Escribir el test que falla**

```js
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
  assert.match(src, /closest\(\s*['"]\[data-reveal-scope\]['"]\s*\)/, 'no separa los reveals sueltos');
  assert.match(src, /--reveal-delay/, 'no escribe el retardo que el CSS lee');
  assert.match(src, /getBoundingClientRect/, 'se perdio la red de seguridad propia');
  assert.match(src, /_glockFailSafe/, 'se perdio la cancelacion del failsafe');
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test "tests/**/*.test.mjs"`
Expected: FAIL en los tres. `motion.ts` no tiene `PASO_MS`, no escribe `--reveal-delay` y no observa reveals sueltos.

- [ ] **Step 3: Reescribir motion.ts**

```ts
/**
 * Reveal por scroll, con jerarquia y escalonado.
 *
 * El estado inicial (oculto) lo aporta el CSS, pero solo cuando <html> tiene
 * `.js-reveal`, clase que agrega de forma sincrona el script inline del <head>.
 * Ese script ademas programa un failsafe de 2s que saca la clase si este modulo
 * no llegara a ejecutarse: por eso el texto no queda escondido para siempre
 * aunque el bundle falle o tarde en cargar.
 *
 * Solo se animan `clip-path`, `transform` y `opacity`, que no disparan
 * layout. No hay alturas, ni `top`, ni `margin`.
 */

/** Separacion entre items. */
const PASO_MS = 60;
/** Tope del retardo: despues de esto los items entran juntos. */
const TOPE_MS = 420;

/**
 * El script inline del <head> programa un timer que saca `.js-reveal` de
 * <html> si este modulo no llegara a correr. Acá lo cancelamos porque ya
 * estamos en marcha: si no, a los 2s nos desharía el reveal en el medio.
 */
const doc = document.documentElement as HTMLElement & { _glockFailSafe?: number };
if (doc._glockFailSafe !== undefined) {
  clearTimeout(doc._glockFailSafe);
  delete doc._glockFailSafe;
}

/** Saca el estado inicial a mano. El observer no los revela. */
const mostrar = (el: Element) => el.classList.add('is-in');

/** Activa un reveal suelto: sin escalonado, entra ya. */
const activarUno = (el: HTMLElement) => {
  el.style.setProperty('--reveal-delay', '0ms');
  mostrar(el);
};

/**
 * Activa un scope: el lead entra sin retardo y los items detrás, escalonados.
 * Todos reciben `.is-in` en el mismo instante; el escalonado real lo hace el
 * `transition-delay` del CSS leyendo `--reveal-delay`.
 */
const activarScope = (raiz: HTMLElement) => {
  let posicion = 0;
  for (const el of raiz.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (el.dataset.reveal === 'lead') {
      mostrar(el);
      continue;
    }
    posicion += 1;
    el.style.setProperty('--reveal-delay', `${Math.min(posicion * PASO_MS, TOPE_MS)}ms`);
    mostrar(el);
  }
};

if ('IntersectionObserver' in window) {
  // Un solo observer para los dos casos. Los reveals sueltos tambien se
  // observan: si solo miráramos los scopes, uno fuera de todo scope no
  // tendria quien lo revelara y quedaria invisible para siempre.
  const sueltos = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
    (el) => !el.closest('[data-reveal-scope]'),
  );
  const targets: Element[] = [
    ...document.querySelectorAll('[data-reveal-scope]'),
    ...sueltos,
  ];

  const observer = new IntersectionObserver(
    (entradas, self) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const el = entrada.target as HTMLElement;
        if (el.matches('[data-reveal-scope]')) activarScope(el);
        else activarUno(el);
        // Una vez activado no queda observing: el observer no acumula trabajo
        // sobre elementos que ya terminaron su animacion.
        self.unobserve(entrada.target);
      }
    },
    // Un poco antes de que el elemento entre a pantalla, para que la animacion
    // empiece mientras todavia se ve el approaching y no despues.
    { rootMargin: '0px 0px -12% 0px', threshold: 0 },
  );

  for (const objetivo of targets) observer.observe(objetivo);

  // Red de seguridad propia: lo que esta en pantalla o arriba se muestra ya.
  // Sin esto, si el observer nunca dispara, el contenido visible queda oculto.
  for (const objetivo of targets) {
    if (objetivo.getBoundingClientRect().top >= window.innerHeight) continue;
    if (objetivo.matches('[data-reveal-scope]')) activarScope(objetivo as HTMLElement);
    else activarUno(objetivo as HTMLElement);
    observer.unobserve(objetivo);
  }
} else {
  // Sin IntersectionObserver no hay reveal, pero tampoco contenido escondido.
  for (const el of document.querySelectorAll('[data-reveal]')) mostrar(el);
}
```

- [ ] **Step 4: Correr los tests**

Run: `node --test "tests/**/*.test.mjs"`
Expected: PASS en los tres nuevos. Los guards de budget y de red de seguridad tambien leen este modulo, asi que un verde aqui importa doble.

- [ ] **Step 5: Correr el ciclo completo**

Run: `npm run ci`
Expected: todo verde. Si el presupuesto de 4096 B revienta, medir con `jsEjecutado` en vez de estimar: los comentarios no cuentan, pero el bloque nuevo si.

- [ ] **Step 6: Commitear**

```bash
git add src/scripts/motion.ts tests/content.test.mjs
git commit -m "feat: escalonado con paso 60 y tope 420, y reveals sueltos cubiertos"
```

---

### Task 3: Densidad, atributos en el markup

**Files:**
- Modify: `src/components/Manifiesto.astro`, `Ediciones.astro`, `EdicionCard.astro`, `Artistas.astro`, `Sessions.astro`, `SongWars.astro`, `Sponsors.astro`, `Proxima.astro`, `SerParte.astro`, `Contacto.astro`, `Faq.astro`
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: el vocabulario de la Task 1 y el observer de la Task 2.
- Produces: 9 scopes y ~30 reveals en el build. `Hero.astro` queda fuera: su coreografia es de carga, no de scroll. `Faq.astro` queda con scope + lead solamente; sus items se agregan en el plan del FAQ, que reescribe ese componente.

- [ ] **Step 1: Escribir el test que falla**

```js
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

test('los wrappers que agrupan items no son items', opciones, () => {
  // Un reveal dentro de otro reveal compone dos transforms: el hijo se mueve
  // dos veces y la coreografia se ve rota. Estos wrappers existen para agrupar
  // items, asi que si se convierten en item, todo lo que contienen anima doble.
  // Se chequean por clase exacta: el nombre del wrapper es lo unico estable
  // de cada componente, y exigir la comilla de cierre evita matchear al hermano.
  const wrappers = [
    ['Ediciones', 'class="mt-4"'],
    ['SerParte', 'class="mt-8 border-b border-white/15"'],
    ['Hero', 'class="mt-10 grid gap-8 md:grid-cols-12"'],
  ];
  for (const [nombre, clase] of wrappers) {
    const src = leer(`src/components/${nombre}.astro`);
    const escapada = clase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const encontrado = new RegExp(`<[^>]*${escapada}[^>]*>`).exec(src);
    assert.ok(encontrado, `${nombre}.astro no tiene el wrapper ${clase}: revisa que el plan siga vigente`);
    assert.ok(
      !encontrado[0].includes('data-reveal'),
      `${nombre}.astro: el wrapper ${clase} no debe ser item, sus hijos ya lo son`,
    );
  }
});

test('el build trae los reveals con jerarquia', opciones, () => {
  const scopes = (html.match(/data-reveal-scope/g) || []).length;
  const leads = (html.match(/data-reveal="lead"/g) || []).length;
  const items = (html.match(/data-reveal="item"/g) || []).length;
  assert.ok(scopes >= 9, `se esperaban al menos 9 scopes, hay ${scopes}`);
  assert.ok(leads >= 9, `se esperaban al menos 9 leads, hay ${leads}`);
  assert.ok(items >= 15, `se esperaban al menos 15 items, hay ${items}`);
  assert.ok(!/data-reveal(?!\s*=)/.test(html), 'quedo un data-reveal pelado: debe ser lead o item');
});
```

El ultimo assert es el que mas trabajo hace: los nueve `data-reveal` pelados que hoy existen en los `.astro` se van todos en esta task, y si uno se olvida el wipe seguiria funcionando pero sin rol, que es exactamente el estado que este plan viene a eliminar.

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test "tests/**/*.test.mjs"`
Expected: FAIL en `el build trae los reveals con jerarquia` con `se esperaban al menos 9 scopes, hay 0`, y en `quedo un data-reveal pelado`.

- [ ] **Step 3: Marcar cada seccion**

Un atributo por elemento, sin tocar ninguna clase. Todos los `data-reveal` pelados pasan a `data-reveal="lead"`.

`Manifiesto.astro` — linea 3 y 5 y 6:
```astro
<section class="border-b border-white/10" data-reveal-scope>
  <div class="mx-auto max-w-6xl px-4 py-14 md:py-20">
    <p class="font-display uppercase" style="font-size: clamp(1.75rem, 5vw, 3.25rem); line-height: 1.05;" data-reveal="lead">Ronda cypher. ...</p>
    <p class="mt-6 max-w-2xl text-white/70" data-reveal="item">GLOCK nace en ...</p>
```

`Ediciones.astro` — linea 5, 6 y 7:
```astro
<section id="ediciones" class="mx-auto max-w-6xl px-4 py-14 md:py-20" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Cuatro<br />ediciones</h2>
  <p class="mt-4 max-w-2xl text-white/70" data-reveal="item">De la fecha inaugural ...</p>
```
El `<div class="mt-4">` de la linea 8 **no** lleva reveal: es el wrapper de las cards, que ya son items. Marcarlo seria el anidamiento que el test anterior prohibe.

`EdicionCard.astro` — linea 29:
```astro
<article class="grid gap-6 border-t border-white/15 py-10 md:grid-cols-12 md:gap-8 md:py-14" data-reveal="item">
```
Una sola edicion del componente cubre las cuatro cards: cada una entra con su propio retardo dentro del scope de Ediciones.

`Artistas.astro` — linea 5, 7, 8 y 22:
```astro
<section id="artistas" class="border-y border-white/10 bg-[#120312]" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Pasaron<br />por Glock</h2>
  <ul class="mt-8 flex flex-wrap gap-x-2 gap-y-8 md:gap-x-3" data-reveal="item">
```
El `<ul>` entero es un item, no cada `<li>`: son doce nombres y escalonarlos uno por uno se lee como ruido, no como jerarquia. El tope de 420 ms los aplastaria igual.

`Sessions.astro` — linea 12, 13, 14, 25 y 30:
```astro
<section id="sessions" class="mx-auto max-w-6xl px-4 py-14 md:py-20" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Cypher session</h2>
  <div class="mt-8" data-yt-feature data-reveal="item">
```
El `<p class="mt-3">` de la linea 25 y el `<ul class="mt-6">` de la linea 30 llevan `data-reveal="item"`. El bloque de YouTube entra primero: es lo que la gente viene a ver.

`SongWars.astro` — linea 7, 9, 10 y 12:
```astro
<section id="songwars" class="bg-[#4B0055]" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Song-wars</h2>
  <p class="mt-4 max-w-2xl text-lg" data-reveal="item">Competencia virtual: ...</p>
  <article class="mt-10 grid gap-8 md:grid-cols-12" data-reveal="item">
```
El `<article>` es un solo item, no sus columnas: es una unidad visual y encima contiene el `.map` de sesiones.

`Sponsors.astro` — linea 7, 8 y 9:
```astro
<section id="sponsors" class="mx-auto max-w-6xl px-4 py-14 md:py-20" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Apoyan<br />la escena</h2>
  <ul class="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4" data-reveal="item">
```

`Proxima.astro` — linea 4, 6, 7 y 12:
```astro
<section id="proxima" class="border-y-4 border-[#C400FF]" data-reveal-scope>
  <h2 class="font-display uppercase leading-none" style="font-size: clamp(3.5rem, 12vw, 8rem);" data-reveal="lead" data-misalign>Glock #{data.proxima.n}</h2>
  <p class="mt-2 font-display text-2xl uppercase tracking-wide text-white/70 md:text-3xl" data-reveal="item">Proxima edicion: N ...</p>
  <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" data-reveal="item">
```
El contenedor de los CTA de la linea 12 es item y sus botones no. Un unico escalonado de dos items: el h2 es tan grande que mas cascade no se veria.

`SerParte.astro` — linea 9, 10, 11, 13 y 19:
```astro
<section id="ser-parte" class="mx-auto max-w-6xl px-4 py-14 md:py-20" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Ser parte<br />de Glock</h2>
  <div class="mt-8 border-b border-white/15">
```
Cada `<a class="row-link">` de la linea 13 lleva `data-reveal="item"`, y el `<p class="mt-6">` de la linea 19 tambien. Ojo: esta seccion tiene **un solo** row-link, asi que son 2 items y el escalonado queda casi plano. El wrapper de la linea 11 **no** lleva reveal, por el mismo anidamiento que en Ediciones.

`Contacto.astro`, que vive fuera de `<main>` — linea 4, 6 y 7:
```astro
<footer id="contacto" class="border-t border-white/10" data-reveal-scope>
  <p class="font-display uppercase leading-none" style="font-size: clamp(3rem, 11vw, 7rem);" data-reveal="lead">Glock 0223</p>
  <div class="mt-6 grid gap-6 md:grid-cols-2" data-reveal="item">
```
El grid es un item y sus dos columnas no. Que quede fuera de `<main>` no importa: el scope se observa por atributo, no por jerarquia de `<main>`.

`Faq.astro` — linea 4 y 5:
```astro
<section id="faq" class="mx-auto max-w-6xl px-4 py-14 md:py-20" data-reveal-scope>
  <h2 class="font-display h-display uppercase" data-reveal="lead" data-misalign>Preguntas<br />frecuentes</h2>
```
Solo scope y lead. Los items se agregan en el plan del FAQ, que reescribe el componente; marcarlos ahora seria trabajo doble.

`StickyCta.astro` no se toca: es un CTA fijo, siempre visible. `Hero.astro` tampoco: lo maneja la Task 4.

- [ ] **Step 4: Correr los tests**

Run: `node --test "tests/**/*.test.mjs"`
Expected: PASS en los tres nuevos. Si falla el conteo, el numero exacto esta en el mensaje del assert.

- [ ] **Step 5: Correr el ciclo completo y commitear**

```bash
npm run ci
git add src/components tests/content.test.mjs
git commit -m "feat: el reveal cubre las nueve secciones con jerarquia"
```

---

### Task 4: Coreografia de carga del hero

**Files:**
- Modify: `src/styles/global.css` (bloque MOTION, justo antes de `@media (prefers-reduced-motion: reduce)`; y el interior de ese media query)
- Modify: `src/components/Hero.astro`
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: `--ease-glock` de la Task 1.
- Produces: `.glock-hero-title` para el h1, `.glock-hero-rise` para los elementos de apoyo, `[data-hero-step]` para el orden.

**Desviacion del spec, y por que:** el spec pedia que el h1 terminara con un asentamiento de la capa de misregistration magenta. Animar `text-shadow` fuerza repaint justo en la ventana del LCP, que es lo que este trabajo viene a no romper. La entrada del h1 queda solo con `transform`; el asentamiento magenta ya existe como hover de `data-misalign` y se aplica al h1 sin costo de animacion. Si al mirarlo el h1 queda soso, la siguiente iteracion abre el clip a `inset(0 0 0 12%)`, con el test del h1 vigilando el LCP.

- [ ] **Step 1: Escribir el test que falla**

```js
test('la coreografia del hero no esconde el h1', opciones, () => {
  const css = leer('src/styles/global.css');
  const i = css.indexOf('.glock-hero-title');
  assert.ok(i > 0, 'no existe la entrada del h1');
  // Del selector hasta el cierre de la regla: nada de opacity 0 ni clip cerrado.
  const regla = css.slice(i, css.indexOf('}', i) + 1);
  assert.ok(!/opacity:\s*0/.test(regla), 'el h1 arranca en opacity 0: rompe el LCP');
  assert.ok(!/clip-path/.test(regla), 'el h1 arranca con clip: rompe el LCP');
  assert.match(regla, /transform|animation/, 'el h1 deberia entrar con transform');

  const j = css.indexOf('.glock-hero-rise');
  assert.ok(j > 0, 'no existe la entrada de los elementos de apoyo');
  assert.match(css.slice(j, css.indexOf('}', j) + 1), /animation/, 'los elementos de apoyo no animan');
});

test('los pasos del hero no se pisan entre si', opciones, () => {
  // El CTA (linea 14) vive dentro del grid (linea 11). Si los dos animan,
  // el CTA compone dos transforms y entra corrido.
  const src = leer('src/components/Hero.astro');
  const conPaso = (src.match(/data-hero-step="\d"/g) || []).length;
  assert.ok(conPaso >= 4, `se esperaban al menos 4 pasos, hay ${conPaso}`);
  const pasos = [...src.matchAll(/data-hero-step="(\d)"/g)].map(([, n]) => Number(n));
  assert.deepEqual([...new Set(pasos)].sort((a, b) => a - b), [1, 2, 3, 4], 'los pasos no son 1,2,3,4 correlativos');
});

test('la coreografia del hero respeta reduced-motion', opciones, () => {
  const css = leer('src/styles/global.css');
  const i = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(i > 0, 'falta el bloque prefers-reduced-motion');
  const bloque = css.slice(i);
  assert.match(bloque, /animation:\s*none\s*!important/, 'reduced-motion no mata las animaciones del hero');
  assert.match(
    bloque,
    /\.js-reveal\s*\[data-reveal="item"\]\s*\{[^}]*opacity:\s*1/,
    'reduced-motion no fuerza opacity 1 en los items: quedarian invisibles',
  );
  assert.match(bloque, /transform:\s*none\s*!important/, 'reduced-motion no neutraliza el rise de los items');
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test "tests/**/*.test.mjs"`
Expected: FAIL en `la coreografia del hero no esconde el h1` con `no existe la entrada del h1`, y en `reduced-motion` con `no fuerza opacity 1 en los items`.

- [ ] **Step 3: Agregar los keyframes y las reglas**

En `src/styles/global.css`, dentro del bloque MOTION, justo antes de `@media (prefers-reduced-motion: reduce)`:

```css
/* 4. Coreografia de carga del hero. El h1 entra con transform solamente:
      arranca pintado, asi que el LCP se registra en el primer frame. Si
      arrancara en opacity 0, el navegador esperaria a que se pinta y el
      timestamp de LCP se moveria. */
@keyframes glock-hero-title-in {
  from { transform: translateY(8px); }
  to { transform: translateY(0); }
}
@keyframes glock-hero-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.glock-hero-title {
  animation: glock-hero-title-in 0.45s var(--ease-glock) both;
}
.glock-hero-rise {
  animation: glock-hero-rise 0.5s var(--ease-glock) both;
}
/* Cada pieza entra detras de la anterior. Los delays viven en el markup,
      donde se leen junto al elemento que ordenan. */
[data-hero-step='1'] { animation-delay: 0ms; }
[data-hero-step='2'] { animation-delay: 80ms; }
[data-hero-step='3'] { animation-delay: 160ms; }
[data-hero-step='4'] { animation-delay: 240ms; }
```

El `both` en el fill mode importa: sin el, durante el delay el elemento se ve ya en su estado final y la coreografia no se ve.

En el bloque de reduced-motion, reemplazar la regla `.js-reveal [data-reveal] { clip-path: none !important; }` por:

```css
  /* Sin esto el wipe queda a medio camino para siempre. Y los items, que
     arrancan en opacity 0, quedarian invisibles: matamos la transition,
     asi que el estado final tiene que ser instantaneo y completo. */
  .js-reveal [data-reveal] { clip-path: none !important; }
  .js-reveal [data-reveal="item"] { opacity: 1 !important; transform: none !important; }
```

- [ ] **Step 4: Marcar el hero**

En `src/components/Hero.astro`. Cada linea es un paso, y ninguna esta anidada dentro de otra animada:

```astro
linea 8:  <h1 class="glock-hero-title font-display h-display uppercase md:col-span-7">Glock<br />shows <span class="text-[#C400FF]">&amp;</span> cy...</h1>
linea 9:  <p class="glock-hero-rise font-display uppercase leading-none md:col-span-5 md:text-right" data-hero-step="1" style="font-size: clamp(2rem, 5.5vw, 4rem);">...</p>
linea 13: <p class="glock-hero-rise text-xl leading-snug md:text-2xl" data-hero-step="2">GLOCK es comunidad. ...</p>
linea 14: <div class="glock-hero-rise mt-6 flex flex-col gap-3 sm:flex-row" data-hero-step="3">
linea 20: <p class="glock-hero-rise font-display text-2xl uppercase leading-tight md:text-3xl" data-hero-step="4">Cypher. Shows. Comunidad.</p>
```

El `<div class="mt-10 grid gap-8 md:grid-cols-12">` de la linea 11 **no** se anima: envuelve a la bajada, al CTA y al texto de la derecha, y animarlo sumaria un transform a cada uno. El `.marquee` de la linea 25 tampoco: ya tiene su animacion infinita, y encadenarle una entrada la dejaria temblando. El h1 no lleva `data-hero-step` porque su animacion arranca en 0 y el unico delay posible seria el propio.

La seccion `#top` **no** lleva `data-reveal-scope`: esta siempre arriba del fold y un reveal de scroll solo produciria un flash al cargar.

- [ ] **Step 5: Correr los tests y el ciclo completo**

```bash
node --test "tests/**/*.test.mjs"
npm run ci
```

- [ ] **Step 6: Commitear**

```bash
git add src/styles/global.css src/components/Hero.astro tests/content.test.mjs
git commit -m "feat: coreografia de carga del hero sin comprometer el LCP"
```

---

### Task 5: Mutar los guards nuevos y verificar en browser

**Files:**
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: los guards de las Tasks 1 a 4.
- Produces: confianza en que los guards fallan cuando el codigo se rompe.

- [ ] **Step 1: Mutar el gate de los items**

En `src/styles/global.css`, cambiar `.js-reveal [data-reveal="item"]` por `[data-reveal="item"]` (sacar el gate):
```bash
node --test "tests/**/*.test.mjs"
```
Expected: FAIL en `lead e item arrancan ocultos solo con el gate .js-reveal` con `oculta sin el gate`.

- [ ] **Step 2: Restaurar y mutar el tope del escalonado**

Restaurar el gate. En `src/scripts/motion.ts`, cambiar `` `${Math.min(posicion * PASO_MS, TOPE_MS)}ms` `` por `` `${posicion * PASO_MS}ms` ``:
```bash
node --test "tests/**/*.test.mjs"
```
Expected: FAIL en `el escalonado tiene paso 60 y tope 420`.

- [ ] **Step 3: Restaurar y mutar el h1**

Restaurar el tope. En `src/styles/global.css`, agregar `opacity: 0;` dentro de la regla `.glock-hero-title`:
```bash
node --test "tests/**/*.test.mjs"
```
Expected: FAIL en `la coreografia del hero no esconde el h1` con `arranca en opacity 0`.

- [ ] **Step 4: Restaurar y mutar los reveals sueltos**

Restaurar el h1. En `src/scripts/motion.ts`, sacar `...sueltos,` de `targets`:
```bash
node --test "tests/**/*.test.mjs"
```
Expected: FAIL en `el observer cubre los reveals sueltos, no solo los scopes`.

- [ ] **Step 5: Restaurar y mutar la red de seguridad**

Restaurar los sueltos. Borrar el bloque `// Red de seguridad propia` completo:
```bash
node --test "tests/**/*.test.mjs"
```
Expected: FAIL en `el observer cubre los reveals sueltos, no solo los scopes` con `se perdio la red de seguridad propia`.

- [ ] **Step 6: Confirmar que todo volvio a verde y commitear**

```bash
git diff --stat
node --test "tests/**/*.test.mjs"
npm run ci
git add -A
git commit -m "test: los guards del motion fallan cuando el codigo se rompe"
```

`git diff --stat` tiene que salir vacio antes del commit: si muestra cambios en `src/`, se quedaron mutaciones sin restaurar.

- [ ] **Step 7: Verificar en browser que el reveal no deja nada invisible**

```bash
npx astro build
npx astro preview --port 4321
```

Con el preview arriba, recorrer la pagina scrolleando hasta el fondo y confirmar que cada seccion wipea su titulo y sube su contenido. Despues, en las devtools, quitar la clase `js-reveal` del `<html>` y recargar: **todas** las secciones tienen que seguir siendo legibles. Ese es el test que importa, y `node --test` no lo puede hacer.

Con `prefers-reduced-motion: reduce` emulado, lo mismo: nada invisible, nada a medias.

Por ultimo, con la red movil, la caja de la derecha del hero (linea 9) queda arriba de la bajada en vez de al costado. Los pasos siguen siendo 1 a 4 en orden de lectura, asi que la coreografia no se rompe; solo cambia el ritmo.

---

## Self-Review

**Cobertura del spec:** la seccion "Vocabulario", "Escalonado" y "Lead wipe, item rise" se implementa en las Tasks 1 y 2. "Densidad" y "Hero" en las Tasks 3 y 4. Los invariantes 1 a 4 estan en Global Constraints y los verifica el CI existente; el invariante 5 y el gate `.js-reveal` en las Tasks 1 y 4. Parallax y FAQ quedan explicitamente afuera: son los planes 2 y 3.

**Placeholders:** ninguna tarea dice "similar a" ni "implementar la logica". Todos los bloques de codigo estan completos y son copiables.

**Consistencia de nombres:** `PASO_MS`, `TOPE_MS`, `mostrar`, `activarUno`, `activarScope`, `--reveal-delay`, `--ease-glock`, `.glock-hero-title`, `.glock-hero-rise`, `data-hero-step` se definen una vez y se usan igual en todos los tasks.

**Tres cosas que un revisor deberia mirar:**

1. `Artistas`, `Sessions` y `Sponsors` llevan `data-reveal="item"` en el `<ul>` completo y no en cada `<li>`. Es deliberado: doce nombres escalonados se leen como ruido, y con el tope de 420 ms la cascada se aplastaria igual. Contradice la lectura literal de "items de Artistas" del spec. Si se quiere cascada real por nombre, hay que subir el tope y eso cambia la sensacion de toda la pagina.
2. `SongWars` y `Proxima` quedan con items contados y un escalonado casi plano. Con dos items el efecto se percibe poco; no se les agrego estructura solo para justificar el vocabulario.
3. La desviacion del asentamiento magenta en el h1 esta en la Task 4 y es una decision, no un olvido. Animar `text-shadow` en el elemento LCP fuerza repaint en la ventana que este plan existe para no tocar.
