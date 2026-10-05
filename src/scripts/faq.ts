// acordeón del FAQ. El `<details>` es nativo y el CSS hace casi todo: abrir es
// sólo cambiar el atributo, y `grid-template-rows: 0fr → 1fr` interpola
// hasta el tamaño real del texto sin que nadie mida un solo pixel.
//
// Acá está lo único que el CSS no puede cubrir: el cierre. Si el `open` se
// saca de entrada, la fila pasa de 1fr a 0fr de golpe y no hay transición. Así
// que el cierre se marca con una clase, se espera a que termine, y recién
// entonces se saca el atributo.

const selector = '#faq details';

document.querySelectorAll<HTMLDetailsElement>(selector).forEach((det) => {
  const cuerpo = det.querySelector<HTMLElement>('.faq-cuerpo');
  const resumen = det.querySelector<HTMLElement>('summary');
  if (!cuerpo || !resumen) return;

  const calmado = matchMedia('(prefers-reduced-motion: reduce)');

  // cierre en vuelo, si lo hay, para poder revertirlo con un click.
  let pendiente: ((cancelar: boolean) => void) | null = null;

  resumen.addEventListener('click', (ev: MouseEvent) => {
    // quien pidió menos movimiento lo tiene nativo y al instante: no lo
    // frenamos con un preventDefault.
    if (calmado.matches) return;

    // clickear mientras se cierra lo revierte, en vez de encadenar dos cierres
    // o dejar la pregunta trabada a medio camino.
    if (pendiente) {
      ev.preventDefault();
      const cerrar = pendiente;
      pendiente = null;
      cerrar(true);
      return;
    }

    // abrir no necesita JS: le alcanza al CSS con ver el atributo.
    if (!det.open) return;

    ev.preventDefault();

    let listo = false;
    const cerrar = (cancelar: boolean) => {
      if (listo) return;
      listo = true;
      pendiente = null;
      det.classList.remove('faq-cerrando');
      // con `cancelar` el `open` se queda: lo que se deshace es el cierre.
      if (!cancelar) det.open = false;
    };
    pendiente = cerrar;

    det.classList.add('faq-cerrando');
    cuerpo.addEventListener('transitionend', () => cerrar(false), { once: true });
    // con la pestaña en background el `transitionend` no llega nunca, y sin
    // esto la pregunta queda a medio cerrar para siempre.
    window.setTimeout(() => cerrar(false), 700);
  });
});
