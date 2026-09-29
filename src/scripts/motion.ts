/**
 * Wipe de entrada por scroll.
 *
 * El estado inicial (oculto) lo aporta el CSS, pero solo cuando <html> tiene
 * `.js-reveal`, clase que agrega de forma sincrona el script inline del <head>.
 * Ese script ademas programa un failsafe de 2s que saca la clase si este modulo
 * no llegara a ejecutarse: por eso el texto no queda escondido para siempre
 * aunque el bundle falle o tarde en cargar.
 *
 * Solo se animan `clip-path` y `transform`, propiedades que no disparan
 * layout. No hay alturas, ni `top`, ni `margin`.
 */

const objetivos = document.querySelectorAll<HTMLElement>('[data-reveal]');

/**
 * El script inline del <head> programa un timer que saca `.js-reveal` de
 * <html> si este modulo no llegara a correr. Acá lo cancelamos porque ya
 * estamos en marcha: si no, a los 2s nos desharía el wipe en el medio.
 */
const doc = document.documentElement as HTMLElement & { _glockFailSafe?: number };
if (doc._glockFailSafe !== undefined) {
  clearTimeout(doc._glockFailSafe);
  delete doc._glockFailSafe;
}

/** Saca el estado inicial a mano. El observer no los revela. */
const mostrar = (el: Element) => el.classList.add('is-in');

if (objetivos.length > 0 && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entradas, self) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        mostrar(entrada.target);
        // Una vez revelado no queda observing: el observer no acumula trabajo
        // sobre elementos que ya termino su animacion.
        self.unobserve(entrada.target);
      }
    },
    // Un poco antes de que el elemento entre a pantalla, para que el wipe
    // empiece mientras todavia se ve el approaching y no despues.
    { rootMargin: '0px 0px -12% 0px', threshold: 0 },
  );

  for (const objetivo of objetivos) observer.observe(objetivo);

  // Red de seguridad propia: lo que esta en pantalla o arriba se muestra ya.
  // Sin esto, si el observer nunca dispara, el contenido visible queda oculto.
  for (const objetivo of objetivos) {
    if (objetivo.getBoundingClientRect().top < window.innerHeight) mostrar(objetivo);
  }
} else {
  // Sin IntersectionObserver no hay wipe, pero tampoco contenido escondido.
  for (const objetivo of objetivos) mostrar(objetivo);
}
