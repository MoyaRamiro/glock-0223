# GLOCK | Shows & Cypher — Design Spec (v1)

Fecha: 2026-09-12
Estado: aprobado por secciones (arquitectura, contenido, datos/CTA), pendiente revisión final del archivo
Ruta proyecto: `glock-0223/` (carpeta nueva, al lado de `facundo-poda/`)
Stack: Astro + Tailwind v4 + TypeScript, sitio estático, solo español, deploy Vercel

## 1. Propósito

One-page para la productora de eventos GLOCK (Mar del Plata) que convierta visitantes en seguidores y participantes.

Lema: Comunidad haciendo la cone de artistas urbanos emergentes. Eventos organizados por artistas para artistas.

GLOCK nace desde la escena urbana de Mar del Plata para que artistas emergentes puedan encontrarse, mostrarse y crecer junto a otros artistas. El nombre GLOCK funciona como identidad de marca y no debe interpretarse literalmente.

Objetivo principal: convertir visitantes en personas que siguen y participan (IG / TikTok / YT / WhatsApp / próxima fecha).

Objetivos secundarios:
- Presentar qué es GLOCK y su formato.
- Mostrar las 4 ediciones anteriores con prueba (flyer + post IG + datos).
- Mostrar artistas que pasaron, con redes editables.
- Mostrar Cypher Sessions de YouTube.
- Anunciar próximas ediciones (v1: bloque "a anunciar" + seguir + WhatsApp).
- Llevar tráfico a Instagram / TikTok / YouTube.
- Vender entradas cuando exista nueva edición (v1: solo preparar el slot, sin checkout).
- Contactar a GLOCK (WhatsApp + email).
- Conseguir artistas interesados en participar.
- Conseguir sponsors / marcas / espacios con CTA ¿QUERÉS SER PARTE DE GLOCK?

## 2. Público

Principal (14–30, Mar del Plata y zona): trap, rap, hip-hop, freestyle, música urbana, cultura underground, artistas emergentes, eventos nocturnos. Mobile-first.

Secundario: artistas, productores, DJs, fotógrafos, videógrafos, marcas, sponsors, espacios culturales/nocturnos.

Ancla territorial: GLOCK es de Mar del Plata y debe sentirse en hero, ediciones (Mole Club Gascón 3158, Club TRI 20 de Septiembre 2650) y footer. Nada de estética porteña genérica.

## 3. Alcance v1 / fuera de alcance

Dentro:
- Hero + manifiesto + ediciones #1–#4 + artistas grilla + sessions + sponsors + ser parte + contacto/footer + CTA sticky mobile.
- Datos editables en `src/content/glock.json` + flyers/logos en `public/`.
- Embeds YouTube click-to-load, links externos a IG/TikTok/WhatsApp/mail.

Fuera (YAGNI):
- Checkout / venta online de entradas (solo slot reservado para link Passline futuro).
- CMS con panel admin.
- Galería completa de fotos profesionales / reels / entrevistas (v1 usa flyers + embeds; se deja estructura para agregar después).
- Bilingüe (solo ES por decisión).
- Cuentas, backend, base de datos, formularios con servidor.

## 4. Arquitectura

```
glock-0223/
  astro.config.mjs
  package.json (astro, @astrojs/sitemap, tailwindcss, @tailwindcss/vite, sharp)
  vercel.json
  public/
    images/
      logo/ (versiones blanco/negro/violeta, circular, pattern)
      flyers/ (glock-1.jpg, glock-2.jpg, glock-3.jpg, glock-4.jpg)
      textura/ (grano, splatter)
    favicon.svg
  src/
    content/glock.json
    pages/index.astro
    components/
      Hero.astro
      Manifiesto.astro
      Ediciones.astro + EdicionCard.astro
      Artistas.astro
      Sessions.astro
      Sponsors.astro
      SerParte.astro
      Contacto.astro (footer)
      StickyCta.astro
    layouts/Base.astro
    styles/global.css
```

Página única `/` + 404 simple. Sin router adicional. Sin estado cliente salvo menú móvil, YT lite y CTA sticky.

## 5. Identidad visual

Desde logos y flyers reales aportados:

- Urbana, underground, agresiva, nocturna, contemporánea, hip-hop/trap, experimental. Marca de escena, no empresa que quiere parecer joven.
- Base: negro #0A0A0A, blanco hueso #F5F1E8, violeta flyer #4B0055 / acento magenta #C400FF usado con moderación, gris humo para textos secundarios.
- Tipografía: display condensada stencil pesada (Barlow Condensed Bold / Anton como fallback) para titulares y nombres; sistema sans para cuerpo. Tracking tight en display, uppercase en labels.
- Texturas: grano, splatter, scanlines sutiles, bordes duros, recortes collage en flyers. Nada de gradientes suaves, glassmorphism startup, ni look festival mainstream / disco comercial.
- Logo L como pistola-estilizada es el isotipo: usar en blanco sobre negro en hero y footer, versión violeta solo como sello. Nunca reinterpretar literalmente en copy.
- Flyers #1–#4 como imagen principal de cada edición, con `alt` descriptivo y `loading="lazy"` (hero eager).

## 6. Contenido por sección (orden final)

### 6.1 Hero
- Eyebrow: MAR DEL PLATA — ESCENA URBANA
- H1: GLOCK | Shows & Cypher
- Lema: Comunidad haciendo la cone de artistas urbanos emergentes.
- Sub: Eventos organizados por artistas para artistas. Cypher + shows de trap.
- CTAs: [Seguir en Instagram] [WhatsApp] + link secundario Ver Cypher Sessions.
- Fondo: negro + textura + logo grande. Badge: 4 ediciones / 2 mains de BA / 460 asistentes acumulados.

### 6.2 Manifiesto / Qué es
- 3 bullets: 1) Ronda cypher 6–10 raperos, cada uno suelta un tema, se define MVP. 2) Shows de trap de artistas locales (+ main de Buenos Aires en ediciones 2 y 4). 3) Espacio de encuentro para mostrarse y crecer.
- Nota de marca: nombre como identidad, no literal.

### 6.3 Ediciones
Tarjeta por edición con: número, fecha, lugar + dirección, lista cypher, lista shows, main (si aplica), asistentes, MVP (si aplica), dato destacado, flyer, link post IG.

- GLOCK #1 — Fecha 17/11 (flyer impreso dice 16/11, se usa 17/11 del brief hasta confirmación). Lugar Mole Club, Gascón 3158, Mar del Plata. Cypher: OXXO, ULI40, LEIVA, CHAMBRET, CUNDO YB, LIBRARY ft. SOWKINGPASTO, TOWAN, QUECO, NIGATO NIMACRI, MATEODOSMG. Shows: murri, enzy m, hunter yb, matteito yb, lucky blanko, kenay woh, thaty rdz. Asistentes ~120. Destacado: fecha inaugural. Post: https://www.instagram.com/p/DRDpROdCUQH/
- GLOCK #2 — Fecha 10/01. Lugar Mole Club. Cypher: D-WAN, J TOBI, OVCRIX, ONMYSHIT, PICHI, TOWAN, ULI40. Shows: hunter yb, matteito yb, sowkingpasto, thaty rdz, lucky blanko, uzu. Main: cero*. Asistentes ~190. Destacado: primer main de Buenos Aires y récord de asistencia. Post: https://www.instagram.com/p/DSORaB4CTsR/
- GLOCK #3 — Fecha 12/04. Lugar Mole Club. Shows: mersa club, lil star, yg sossa, truer, jereloren, hache. Cypher: library, refle, rous, tompyet, gusti, ags, uhry. MVP: refle. Asistentes ~50. Destacado: locales de Junín + Mar del Plata y mejor cypher hasta ahora. Post: https://www.instagram.com/p/DWfGsVkie6k/
- GLOCK #4 — Fecha 23/07 (flyer: 23/07/26). Lugar Club TRI, 20 de Septiembre 2650, Mar del Plata. Shows: j tobi, dukett, mine, pipper, lucky blanko, neko + show de baile elikriss / popping mdp. Cypher especial all-stars: uli40, towan, queco, refle, rous, ags. MVP: ags. Main: Tobi Dolezor. Asistentes ~100. Destacado: segundo main de renombre. Post: https://www.instagram.com/p/DX7zVMHic42/

### 6.4 ARTISTAS QUE PASARON POR GLOCK
Grilla simple de nombres, sin foto en v1. Cada item: nombre + links opcionales a IG/TikTok/YT. Todo editable en `glock.json` sin tocar código. Listado inicial construido desde cypher + shows de #1–#4 (dedup, respetar mayúsculas de escena). Campos vacíos se ocultan, nunca se muestra icono roto.

### 6.5 Cypher Sessions
- #1 https://www.youtube.com/watch?v=SGWKBFfL4XE
- #2 https://www.youtube.com/watch?v=qSjPJW9Fa_o
- #3 https://www.youtube.com/watch?v=bvaBQ7Y_bEE
- #4 estado "editándose" sin link, con CTA avisarme por WhatsApp.
Embeds con fachada click-to-load (thumbnail + botón), `loading="lazy"`.

### 6.5b SongWars (eventos virtuales)
- Vol. 1 — Domingo 31/05, 21:30 hs, en vivo por Kick: https://kick.com/soulsv-0 (KICK.COM/SOULSV-Ø).
- Formato: cada artista presenta su canción, un jurado evalúa con puntaje, al final los ganadores se llevan premios.
- Premio 1er puesto vol. 1: cupo para tocar en vivo en GLOCK #4.
- Flyer: `/images/flyers/songwars-vol1.jpg` (si falta el archivo: bloque violeta sólido con "SONGWARS VOL.1", nunca imagen rota).
- En UI: sección "SongWars" entre Sessions y Sponsors, con formato + lista de volúmenes extensible en `glock.json:songwars[]`.

### 6.6 Sponsors destacados
The Real Pilcha, Fas Spot, Squadra Vincente, PalaciosTTT, Vela Barbería. Más logos que aparecen en flyers (Happy Hour Mdp, Mardel Trap, J&P Sabores, Lovzilla, Perreo Logia, ART, Club TRI, Mole Club) como fila secundaria. Grilla de logos en blanco y negro, sin colores corporativos.

### 6.7 ¿QUERÉS SER PARTE DE GLOCK?
Tres tarjetas con mensaje WhatsApp prellenado distinto:
- Soy artista: "Quiero mostrarme en GLOCK, soy [aka] y hago [trap/rap/...]"
- Soy marca/sponsor: "Quiero sponsorear GLOCK, soy [marca]"
- Tengo espacio: "Tengo un espacio para GLOCK en [zona]"
Más fallback mailto a glock08000@gmail.com.

### 6.8 Próxima edición (slot v1)
Sin fecha confirmada: bloque "GLOCK #5 — fecha a anunciar" + CTAs seguir IG y WhatsApp "avísenme". Estructura lista para agregar fecha/lugar/link Passline sin rediseño.

### 6.9 Contacto / footer
WhatsApp +54 223 529-8014 (https://wa.me/5492235298014), Instagram https://www.instagram.com/glock.0223/, TikTok https://www.tiktok.com/@glock.0223, YouTube https://www.youtube.com/@GLOCK0223, Email glock08000@gmail.com. Línea Mar del Plata, Buenos Aires, Argentina. Sticky CTA mobile con IG + WhatsApp.

## 7. Modelo de datos (`src/content/glock.json`)

```json
{
  "contacto": {
    "whatsapp": "https://wa.me/5492235298014",
    "telefonoLabel": "+54 223 529-8014",
    "instagram": "https://www.instagram.com/glock.0223/",
    "tiktok": "https://www.tiktok.com/@glock.0223",
    "youtube": "https://www.youtube.com/@GLOCK0223",
    "email": "glock08000@gmail.com"
  },
  "ediciones": [
    {
      "n": 1, "fecha": "17/11", "lugar": "Mole Club",
      "direccion": "Gascón 3158, Mar del Plata",
      "cypher": ["OXXO", "ULI40", "..."],
      "shows": ["murri", "..."], "main": null,
      "asistentes": 120, "mvp": null,
      "destacado": "fecha inaugural",
      "flyer": "/images/flyers/glock-1.jpg",
      "postIg": "https://www.instagram.com/p/DRDpROdCUQH/"
    }
  ],
  "artistas": [{ "nombre": "ULI40", "ig": "", "tiktok": "", "yt": "" }],
  "sessions": [
    { "n": 1, "yt": "https://www.youtube.com/watch?v=SGWKBFfL4XE", "estado": "publicada" },
    { "n": 4, "yt": "", "estado": "editandose" }
  ],
  "sponsors": [{ "nombre": "The Real Pilcha", "logo": "/images/sponsors/real-pilcha.png", "link": "" }],
  "proxima": { "n": 5, "estado": "a-anunciar", "entradasUrl": "" }
}
```

Reglas: artistas/sponsors sin link no renderizan icono; sessions en estado editandose no renderizan iframe; ediciones orden descendente (#4 primero en UI, data en el mismo orden descendente). `mainFoto` (ediciones) y `logo` (sponsors) son opcionales: solo se renderizan si el archivo existe en disco; si no, texto. `songwars[]` lista volúmenes con `vol, fecha, hora, plataforma, url, formato, premio, flyer`.

## 8. Flujos y resiliencia

- Sin backend: todos los CTA son anchors externos. WhatsApp con `?text=` codificado por intención.
- Info completa del evento a 1 tap: cada tarjeta de edición muestra fecha, lugar + dirección, cómo llegar (link Google Maps: Mole Club Gascón 3158, Club TRI 20 de Septiembre 2650), lineup cypher + shows, main, precio cuando exista, CTA entradas / WhatsApp. La próxima edición repite ese patrón aunque esté en estado a-anunciar.
- Si YouTube falla: queda thumbnail + link directo. Si IG falla: el post link abre en pestaña nueva, nunca rompe layout.
- Imágenes: `alt` real con keywords (ej. "GLOCK #2 cypher trap Mar del Plata Mole Club"), dimensiones fijas para evitar CLS, lazy salvo hero.
- 404 con vuelta a `/` y links sociales.

## 9. SEO (prioridad alta: rankear en Google + respuestas de IA)

Intención objetivo: "eventos hip hop Mar del Plata", "trap Mar del Plata", "rap Mar del Plata", "cypher Mar del Plata", "shows trap Mar del Plata", "freestyle Mar del Plata", "under Mar del Plata", "qué hacer en Mar del Plata música urbana".

- Fundamentos: `lang="es-AR"`, URL canónica única, `robots.txt` + sitemap Astro, títulos jerárquicos únicos (un H1, H2 por sección con Mar del Plata + keyword), meta title "GLOCK | Shows & Cypher — Trap, Rap y Hip-Hop en Mar del Plata" (≤60 caracteres), meta description con cypher + shows + emergentes + Mar del Plata (≤155), OG/Twitter con logo + flyer #4, favicon SVG.
- Contenido: hero y manifiesto repiten de forma naturalTrap / Rap / Hip-Hop / Freestyle / Cypher / Mar del Plata sin keyword stuffing. Cada edición es un bloque indexable con fecha, lugar, dirección exacta y lineup en texto real (no solo imagen). FAQ visible con 6 preguntas/respuestas literales para featured snippets y citación por IAs: qué es GLOCK, qué es un cypher y MVP, dónde son los eventos, cómo compro entradas, cómo participo como artista, cómo sponsoreo.
- Datos estructurados JSON-LD: Organization (GLOCK, sameAs IG/TikTok/YT), MusicEvent x4 con name, startDate, location name + streetAddress + addressLocality Mar del Plata, performer list, image flyer, offers cuando haya precio, WebSite + WebPage, VideoObject x3 (name, embedUrl, thumbnail), FAQPage, BreadcrumbList.
- Autoridad y frescura: links salientes a posts IG y YT oficiales, NAP consistente en hero + ediciones + footer (GLOCK, Mar del Plata, +54 223 529-8014), bloque próxima edición que se actualiza en `glock.json` sin rediseño, `lastmod` en sitemap.
- GEO (IA): párrafos cortos citables, datos en formato pregunta-respuesta, fechas/lugares/lineups en texto plano, sin contenido clave solo dentro de imágenes o JS.

## 9b. Responsive (mobile + tablet + desktop)

Mobile-first porque el público 14–30 llega desde el celular; tablet y desktop deben verse plenos, no estirados.

- Breakpoints Tailwind: base 360px (móvil), `md:` 768px (tablet: 2 columnas en ediciones/artistas/sponsors), `lg:` 1021024px (desktop: hero 2 columnas, ediciones en grid alternado, sessions 3 columnas). Sin scroll horizontal en 360px.
- Hero: en móvil logo + H1 + 2 CTAs full-width apilados; en desktop collage + CTAs inline. Tipografía fluida con `clamp()`: H1 2.5rem→5rem, H2 1.75rem→3rem.
- Ediciones: tarjeta vertical en móvil (flyer arriba, datos abajo, lineup en lista legible); en tablet 2x2; en desktop alternada imagen/texto. Lineups con wrap y tamaño ≥15px, nunca texto incrustado ilegible.
- Artistas grilla: 2 col móvil → 3 tablet → 4-5 desktop, tap ≥44px. Sessions: 16:9 responsive, 1 col móvil → 3 col desktop. Sponsors: 2→3→5. Tablas prohibidas; todo flex/grid con wrap.
- Sticky CTA solo en móvil (`md:hidden`); en desktop CTA en header fijo. Menú hamburguesa solo móvil, nav inline en desktop. `prefers-reduced-motion` desactiva marquee/parallax. Imágenes `srcset` + `sizes`, hero eager + `fetchpriority="high"`.
- Contraste AA sobre negro, focos visibles, inputs/CTA ≥44px.

## 10. Performance y accesibilidad (presupuesto)

- Presupuesto: LCP < 2.5s en 4G, CLS < 0.1, JS cliente < 30KB (solo menú + YT lite + sticky), imágenes AVIF/WebP comprimidas.
- Checks: `astro check`, `astro build` limpio, Lighthouse mobile ≥90 y desktop ≥95, verificación manual en 360 / 768 / 1024 / 1440, links externos verificados (4 posts IG + 3 YT + 4 sociales), grilla artistas sin iconos rotos, #4 sin link roto, OG y JSON-LD validados (Rich Results + Schema validator).

## 11. Assets y pendientes del dueño

Aportado: logos (10 variantes), flyers #1–#4, 4 posts IG, 3 YT + #4 editándose, contactos.
Pendiente para carga inicial: flyers en alta para `public/images/flyers/` (glock-1..4 + songwars-vol1), logos recortados, fotos de mains (`public/images/mains/cero.jpg`, `tobi-dolezor.jpg`), logos de sponsors (`public/images/sponsors/real-pilcha.png, fas-spot.png, squadra-vincente.png, palacios-ttt.png, vela-barberia.png`), lista final de handles de artistas (se puede cargar después sin código), confirmación fecha #1 (17/11 vs 16/11 del flyer), confirmación nombre "cero*" #2 y "Tobi Dolezor" #4 tal como están.
Futuro sin rediseño: galería (fotos shows/público), reels/entrevistas, link Passline #5.
