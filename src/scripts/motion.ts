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

/** Saca el estado inicial. Quien decide cuando se muestra es `activar`. */
const mostrar = (el: Element) => el.classList.add('is-in');

/**
 * Todos los reveals del documento, en orden, y se observan uno por uno.
 *
 * El scope agrupa el escalonado, no decide el momento de la animacion. Mirar el
 * scope entero lo revelaria de golpe al cruzar su borde superior, y los items
 * de abajo correrian su transicion fuera de pantalla, donde el escalonado no
 * se ve. Por eso el grupo observado son los elementos individuales.
 *
 * Ademas, ningun reveal puede quedar fuera del grupo: uno que no cae dentro de
 * ningun scope, o que se monte despues del init, lo deja el CSS oculto y sin
 * observer nadie lo vuelve a mostrar. Como el failsafe ya fue cancelado arriba,
 * ese fallo no tendria ni una red de seguridad que lo delatara.
 */
const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');

/**
 * El retardo de cada item se calcula una sola vez, al cargar y en una sola
 * pasada: el lugar que ocupa entre los items de su propio scope. El scope solo
 * agrupa; el orden del documento ya los recorre de arriba hacia abajo.
 */
const retardos = new Map<Element, string>();
const vistos = new Map<Element, number>();
for (const el of reveals) {
  if (el.dataset.reveal === 'lead') continue;
  const ambito = el.closest('[data-reveal-scope]');
  // Sin scope no hay escalonado que aplicar: lo resuelve el default del CSS.
  if (!ambito) continue;
  const indice = vistos.get(ambito) ?? 0;
  vistos.set(ambito, indice + 1);
  retardos.set(el, `${Math.min(indice * PASO_MS, TOPE_MS)}ms`);
}

/**
 * Activa un lote de reveals que ya entraron en pantalla. El observer y la red
 * de seguridad pasan por acá, asi que hay una sola definicion de que es
 * "aparecer" y no dos que puedan divergir.
 */
const activar = (entrantes: Iterable<HTMLElement>) => {
  for (const el of entrantes) {
    // El lead entra ya y sin retardo. Al observarse cada reveal por separado, su
    // lugar en el flujo ya lo hace cruzarse antes que los items que tiene abajo,
    // asi que no hace falta ningun caso especial para que el titular sea lo
    // primero de la seccion.
    if (el.dataset.reveal === 'lead') {
      mostrar(el);
      continue;
    }
    // `0ms` es el default del CSS: un reveal sin scope entra con el retardo por
    // defecto. El retardo se escribe antes de la clase para que la transicion
    // lo lea desde el primer frame, y no desde el siguiente.
    el.style.setProperty('--reveal-delay', retardos.get(el) ?? '0ms');
    mostrar(el);
  }
};

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entradas, self) => {
      const cruzados: HTMLElement[] = [];
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        // Una vez activado no queda observing: el observer no acumula trabajo
        // sobre elementos que ya terminaron su animacion.
        self.unobserve(entrada.target);
        cruzados.push(entrada.target as HTMLElement);
      }
      activar(cruzados);
    },
    // Un poco antes de que el elemento entre a pantalla, para que la animacion
    // empiece mientras todavia se ve el approaching y no despues.
    { rootMargin: '0px 0px -12% 0px', threshold: 0 },
  );

  for (const el of reveals) observer.observe(el);

  // Red de seguridad propia: lo que esta en pantalla o arriba se muestra ya.
  // Sin esto, si el observer nunca dispara, el contenido visible queda oculto.
  const enPantalla = Array.from(reveals).filter(
    (el) => el.getBoundingClientRect().top < window.innerHeight,
  );
  activar(enPantalla);
  for (const el of enPantalla) observer.unobserve(el);
} else {
  // Sin IntersectionObserver no hay reveal, pero tampoco contenido escondido.
  activar(reveals);
}
