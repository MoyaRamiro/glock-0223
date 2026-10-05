/**
 * FAQ: apertura y cierre animados sobre `<details>` nativo.
 *
 * El `<details>` se deja como está, y esa es la decisión que define todo lo
 * demás. Animarlo "de a poco" no funciona: el browser esconde los hijos en el
 * instante del toggle, así que una `transition: height` alcanza para la
 * apertura pero el cierre no se ve nunca —para cuando empezaría la transición,
 * el contenido ya estaba oculto—.
 *
 * La salida es tomar el click: se previene el toggle nativo, se anima el alto
 * del wrapper a mano, y recién ahí se escribe `details.open`. Abriendo, `open`
 * va primero, para que exista layout que medir; cerrando, `open` se quita al
 * final, cuando el bloque ya llegó a 0. Sin JS el `<details>` nativo abre al
 * instante y el FAQ sigue siendo usable.
 */

/**
 * Tiene que coincidir con la transición de `.faq-cuerpo` en el CSS. No se usa
 * para animar: se usa como red de seguridad del `transitionend`, que no siempre
 * llega (una pestaña en background no transiciona, y una transición
 * interrumpida no emite el evento).
 */
const DURACION_MS = 500;

/** Cortar el margen del CSS por lo que tarda el frame final del alto. */
const MARGEN_MS = 80;

const reducido = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Se recorren todos los `<details>` y se descartan los que no tienen wrapper,
// en vez de apuntar a `#faq`: el que decide qué se anima es la presencia del
// wrapper, no el id del section. Un acordeón nuevo en otra parte del sitio
// empieza a funcionar solo, y uno sin el wrapper no se toca.
for (const det of document.querySelectorAll<HTMLDetailsElement>('details')) {
  const cuerpo = det.querySelector<HTMLElement>(':scope > .faq-cuerpo');
  const resumen = det.querySelector<HTMLElement>(':scope > summary');
  if (!cuerpo || !resumen) continue;

  /** Hacia dónde va la animación. Decide cuál es el estado final al asentar. */
  let abriendo = false;
  let red: number | undefined;

  /**
   * Deja las cosas en su estado final y cierra el `<details>` si toca.
   *
   * Sin esto el cierre se queda a medias: `details` seguiría con `open` en
   * `true` mientras el bloque mide 0, o sea el elemento se declara abierto y no
   * muestra nada. Es la misma clase de falla que el reveal tiene prohibida.
   */
  const asentar = () => {
    window.clearTimeout(red);
    // `auto` en abierto para que el texto reflowee al redimensionar la ventana;
    // vacío en cerrado para que el CSS vuelva a mandar.
    cuerpo.style.height = abriendo ? 'auto' : '';
    if (!abriendo) det.open = false;
  };

  resumen.addEventListener('click', (ev) => {
    ev.preventDefault();

    // Sin transición no hay `transitionend`, y el cierre depende de él. Con
    // reduced motion el toggle lo hace el browser, que es lo que corresponde:
    // quien pidió menos movimiento no quiere una transición, quiere el cambio.
    if (reducido()) {
      det.open = !det.open;
      return;
    }

    abriendo = !det.open;
    // Al abrir, `open` va primero para poder medir. El wrapper arranca en
    // `height: 0` desde el CSS, así que ponerlo en `open` no muestra nada
    // todavía: el contenido sigue recortado y la transición lo destapa.
    if (abriendo) det.open = true;

    const desde = cuerpo.getBoundingClientRect().height;
    const hasta = abriendo ? cuerpo.scrollHeight : 0;

    // Dos escrituras con un reflow en el medio. Sin el reflow el navegador
    // colapsa los dos valores en uno solo y no hay transición: hay un salto.
    cuerpo.style.height = `${desde}px`;
    void cuerpo.offsetHeight;
    cuerpo.style.height = `${hasta}px`;

    window.clearTimeout(red);
    red = window.setTimeout(asentar, DURACION_MS + MARGEN_MS);
  });

  cuerpo.addEventListener('transitionend', (ev) => {
    // La respuesta también tiene transition propia; esta pregunta es por el
    // alto del contenedor, no por cualquiera.
    if (ev.propertyName !== 'height') return;
    asentar();
  });
}
