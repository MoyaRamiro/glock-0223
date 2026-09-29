# Sistema de motion: densidad, jerarquía, parallax y FAQ

Fecha: 2026-09-29
Estado: aprobado en diseño, pendiente de revisión

## Contexto

El motion actual son cuatro efectos: wipe de entrada en 9 títulos, misregistration
magenta al hover, botón que baja 1 px al presionar, y flyers que se enderezan al
hover. El resultado se percibe poco profesional al scrollear por dos razones
medibles:

1. Los 9 wipes son identicos en duracion, easing y momento. El mismo efecto
   repetido nueve veces se lee como plantilla.
2. Fuera de esos 9 titulos no se mueve nada. Hero, parrafos, cards de ediciones,
   artistas, canciones, FAQ y footer estan quietos, asi que la mayor parte del
   scroll es terreno muerto.

Ademas no hay ninguna capa que reaccione a la *posicion* del scroll, solo a
*cuándo* se cruza un umbral.

## Objetivos

- Que la pagina se sienta diseñada al scrollear, no solo no vacia.
- Un solo lenguaje de entrada con jerarquia, no efectos sueltos.
- Cubrir el scroll muerto con densidad.
- Una capa ligada al scroll sin costo de JS.
- Animar el FAQ, que hoy abre instantaneo.
- No perder el presupuesto de performance ya verificado.

## No objetivos

- Cursor propio.
- GSAP, Lenis o cualquier libreria nueva.
- Transiciones entre paginas: el sitio tiene una sola pagina real.
- Reestilizar. La paleta (`#0A0A0A`, `#F5F1E8`, `#4B0055`, `#C400FF`) no se toca.
- Cambiar la velocidad fisica del scroll.

## Decisiones tomadas

1. Capa ligada al scroll: `animation-timeline: view()` en CSS puro, 0 JS.
2. Lenguaje de entrada: una sola entrada con jerarquia y escalonado.
3. FAQ: acordeon de una sola respuesta abierta, animado en todos los navegadores.
4. Arquitectura: un solo `IntersectionObserver`; el CSS decide el como.
5. El h1 si se anima (decision del usuario, sobre la recomendacion de dejarlo
   quieto). Se anima en variante segura para el LCP, ver "Hero".

## Arquitectura

Tres responsabilidades, sin dependencias nuevas:

- `src/scripts/motion.ts` — reveals de scroll. Un solo
  `IntersectionObserver`. Decide el *cuando*.
- `src/scripts/faq.ts` — acordeon. Es interaccion, no reveal, y necesita
  `aria-expanded`. No comparte estado ni observer con `motion.ts`.
- `src/styles/global.css`, bloque MOTION — decide el *como*: wipe, rise,
  escalonado, parallax, flecha del FAQ, entrada del hero.

Flujo de un reveal:

1. El observer observa dos conjuntos: los `[data-reveal-scope]` y los
   `[data-reveal]` que quedaron sueltos, fuera de todo scope.
2. Al entrar un scope, recorre sus hijos `[data-reveal]` en orden de documento y
   escribe `--reveal-delay` en cada uno.
3. El CSS aplica el wipe o el rise con ese retardo.
4. El scope, o el elemento suelto, se hace `unobserve`. No reaccumula trabajo.

El paso 1 observa tambien los reveals sueltos a proposito. Si solo se observaran
los scopes, un `[data-reveal]` fuera de todo scope no tendria quien lo revelara y
se quedaria invisible para siempre, que es el peor fallo posible en este sitio.
Los reveals sueltos se revelan con retardo 0, sin escalonado.

`motion.ts` y `faq.ts` se importan desde `Base.astro`. Se mantienen separados
porque cambian por motivos distintos: uno reacciona al scroll, el otro a un
click. Un archivo que hiciera ambos seria mas dificil de probar.

## Vocabulario

Contrato con el markup. Tres atributos, todos declarativos.

```astro
<section data-reveal-scope>
  <h2 data-reveal="lead">Artistas</h2>
  <article data-reveal="item">...</article>
  <article data-reveal="item">...</article>
</section>
```

- `data-reveal-scope` — la unidad que coordina. Se observa a si mismo, no a sus
  hijos.
- `data-reveal="lead"` — entra primero, sin retardo. Hace wipe.
- `data-reveal="item"` — entra detras del lead, escalonado. Hace rise.

Si un `[data-reveal]` esta dentro de un scope y no declara valor, se trata como
`item`. Un `[data-reveal]` fuera de todo scope se observa por separado y se
revela solo, con retardo 0.

Easing: `cubic-bezier(0.22, 0.7, 0.2, 1)` para todos los reveals, sin excepcion.
Es el mismo que ya usa el wipe, y mantenerlo es parte de la coherencia.

### Escalonado

- Paso: 60 ms entre items.
- Tope: 420 ms. El retardo nunca supera ese valor, se satura.

El tope existe porque una grilla de 12 cards con paso de 60 ms tardaria 660 ms
en terminar de entrar. Pasado eso se percibe como lentitud, no como diseno.

### Lead wipe, item rise

Es la distincion que resuelve el problema de los 9 wipes identicos:

- `lead` → wipe con `clip-path`, 0.5 s.
- `item` → rise con `translateY(10px)` + `opacity`, 0.5 s.

Mismo easing, misma direccion, misma duracion. Es un solo lenguaje con roles, no
variantes. Beneficio practico adicional: **nada interactivo queda escondido tras
un clip**, que era el riesgo con las flechas del FAQ.

## Las cuatro piezas

### 1. Densidad

Pasan a `item`: cards de `EdicionCard`, items de `Artistas`, filas de
`SongWars`, items del FAQ, parrafos del manifiesto y el footer. El h2 de cada
seccion pasa a `lead`. El total crece de 9 elementos a aproximadamente 45.

### 2. Hero

Coreografia de carga, en este orden: bajada → CTAs → `.marquee-track`, con 80 ms
de separacion y el mismo easing que el wipe.

El `h1` **se anima, en variante segura para el LCP**:

- Se pinta visible desde el primer frame. No arranca en `opacity: 0` ni con el
  clip cerrado, porque el LCP no se registraria hasta que se pinta y eso rompe
  el presupuesto de 2500 ms.
- Lo que anima es `translateY(8px) → 0` en 0.45 s, más un asentamiento de la
  capa de misregistration magenta que se desvanece a 0.

Si el wipe completo del h1 resultara visualmente necesario, el limite es
abrirlo desde `inset(0 0 0 12%)` en lugar de desde cero, de modo que la mayor
parte del texto se pinte en el primer frame. Queda anotado como ajuste
posterior, no como parte de este trabajo.

`.marquee` ya tiene una animacion infinita. Sigue igual.

### 3. Parallax

Todo dentro de `@supports (animation-timeline: view())`, de modo que en
navegadores sin soporte la regla **no existe** y el sitio se ve completo, solo
sin parallax. Degradacion limpia, no rota.

- Derive en el fondo del hero y en los fondos de seccion. Recorrido total de
  60 px, reparto `0% → 100%` del `animation-range: entry 0% exit 100%`. Es
  deliberadamente poco: mas de 100 px de recorrido se lee como descolgado y
  marea.
- Barra de progreso de lectura en el `Header.astro`, con
  `animation-timeline: scroll(root)` y `scaleX` de 0 a 1. Es decorativa:
  `aria-hidden="true"`. Va en un envoltorio propio para no intentar pegar el
  `transform` al contenedor del nav, que ya lo usa para otras cosas.

**Regla dura: un elemento no puede ser target de parallax y de reveal a la vez.**
Los dos usan `transform` y el segundo pisa al primero. El parallax se aplica
siempre a envoltorios decorativos, nunca a un elemento que ya sea target de
reveal. Si un elemento necesita ambas cosas, el reveal va en el hijo y el
parallax en el padre.

### 4. FAQ

`Faq.astro` deja de usar `<details>`/`<summary>` y pasa a un acordeon de una
sola respuesta abierta.

- Boton real con `aria-expanded` y `aria-controls`, apuntando a un
  `role="region"` con `aria-labelledby`. Es el patron correcto para acordeon de
  apertura unica, que `<details>` no puede resolver sin JS igual.
- Altura con `grid-template-rows: 0fr → 1fr` sobre un envoltorio, con
  `overflow: hidden` en el hijo interno. No hay que medir nada en JS y funciona
  en todos los navegadores.
- El colapso se condiciona a una clase `.js-faq` en `<html>`, agregada por un
  script sincronico en el `<head>` con la misma logica del failsafe de 2 s que
  ya existe. Es el mismo patron que `.js-reveal`: sin la clase, las respuestas
  quedan visibles y el toggle no colapsa nada.
- Flecha propia que rota al abrir. Reemplaza el triangulo nativo.
- Los items del FAQ participan del reveal de scroll como `item`, con el retardo
  topado para que no haya una ventana en la que un control visible todavia no
  responda.

## Invariantes

Estos limites no se cruzan. Son la razon por la que el sitio sigue siendo
rapido.

1. Solo se animan `transform`, `clip-path`, `opacity` y `filter`. Nunca `height`,
   `top`, `margin` ni `width`: esas props disparan layout y producen CLS.
2. Cero listeners de scroll. La capa ligada al scroll es CSS.
3. Cero dependencias nuevas.
4. Presupuesto de JS total bajo 4096 B. Hoy son 2560 B (1840 B del loader de
   YouTube que ya existia, 201 B del failsafe, 519 B del observer), asi que el
   margen para el FAQ y el escalonado es de ~1500 B.
5. El h1 nunca arranca invisible.

## Fallos y degradacion

- `.js-reveal` en `<html>` mas el failsafe sincrono de 2 s se mantienen igual.
  Ahora cubren ~45 elementos en lugar de 9, asi que los tests tienen que crecer
  en consecuencia.
- `prefers-reduced-motion: reduce` mata `animation` y `transition`. El bloque
  neutraliza `clip-path` a mano y se le anaden `opacity: 1` y `transform: none`
  para los `item`, de forma defensiva.
- Sin `IntersectionObserver`, se revelan todos los elementos.
- Sin JS, las respuestas del FAQ **se ven**. Se renderizan visibles y el JS las
  colapsa al arrancar. El toggle nunca es un control muerto.
- Si `faq.ts` falla, el contenido de las respuestas ya esta en el DOM y legible.

## Testing

Los 43 tests existentes siguen pasando. Se agregan:

- El escalonado respeta el tope de 420 ms y el paso de 60 ms.
- `lead` nunca lleva retardo.
- Todo `[data-reveal]` queda cubierto: esta dentro de un scope, o el observer lo
  observa suelto. Es el guard que impide el fallo de "invisible para siempre"
  que casi se filtra en el diseno.
- El h1 no tiene `data-reveal` ni arranca en `opacity: 0`.
- Las reglas de parallax estan dentro de `@supports (animation-timeline: view())`.
- Ningun elemento es a la vez target de parallax y de reveal.
- Las respuestas del FAQ son legibles sin la clase `.js-faq`.
- `aria-expanded` alterna y `aria-controls` apunta a un id existente.
- `prefers-reduced-motion` deja los `item` visibles.
- El presupuesto de JS sigue bajo 4096 B.

Despues se mutan los guards nuevos para verificar que fallan cuando
corresponde, igual que se hizo con los seis guards de motion.

## Riesgos

- **Budget de JS.** El margen real es de ~1500 B para el FAQ. Si el acordeon se
  pasa, el presupuesto es lo primero que se recorta, no la accesibilidad.
- **Soporte de `animation-timeline`.** Safari y Firefox no lo tienen a hoy. El
  sitio se ve bien ahi, sin parallax. Si en el futuro el parallax se vuelve
  imprescindible, habria que decidir si vale sumar un polyfill, y esa decision
  queda fuera de este trabajo.
- **Superficie de fallo.** Hide-behind-JS sobre 45 elementos es mas riesgo que
  sobre 9. El failsafe de 2 s es la red; los tests son la verificacion.
- **LCP del hero.** La variante elegida lo evita, pero cualquier cambio futuro
  que ponga el h1 en `opacity: 0` lo rompe. El test del h1 existe para eso.
