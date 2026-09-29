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
