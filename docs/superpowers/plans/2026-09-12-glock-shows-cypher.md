# GLOCK | Shows & Cypher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la one-page estática de GLOCK en `glock-0223/` (Astro + Tailwind v4, solo ES) con las 8 secciones del spec y SEO/responsive de prioridad alta.

**Architecture:** Sitio Astro estático sin backend; contenido real en `src/content/glock.json`; página única `src/pages/index.astro` que compone 10 componentes pequeños; `Base.astro` concentra head/SEO/JSON-LD; deploy Vercel.

**Tech Stack:** Astro latest, @astrojs/sitemap latest, Tailwind v4 (@tailwindcss/vite latest), sharp latest, @fontsource/barlow-condensed, TypeScript strict, Vercel static.

**Spec:** `docs/superpowers/specs/2026-09-12-glock-shows-cypher-design.md`

## Global Constraints

- Idioma único: `lang="es-AR"`, sin i18n ni rutas `/en`.
- Site provisional: `https://glock-0223.vercel.app` (una sola línea en `astro.config.mjs`; el dueño la cambia al tener dominio).
- Title exacto: `GLOCK | Shows & Cypher — Trap, Rap y Hip-Hop en Mar del Plata`.
- Meta description exacta: `GLOCK Shows & Cypher en Mar del Plata: ronda cypher con MVP + shows de trap de artistas emergentes. Ediciones, artistas, Cypher Sessions y próxima fecha.`.
- Colores: negro `#0A0A0A`, hueso `#F5F1E8`, violeta `#4B0055`, magenta solo acentos `#C400FF`. Cero gradientes suaves, cero glassmorphism.
- Contacto exacto: WA `https://wa.me/5492235298014` label `+54 223 529-8014`, IG `https://www.instagram.com/glock.0223/`, TikTok `https://www.tiktok.com/@glock.0223`, YT `https://www.youtube.com/@GLOCK0223`, mail `glock08000@gmail.com`.
- Direcciones exactas: Mole Club `Gascón 3158, Mar del Plata`, Club TRI `20 de Septiembre 2650, Mar del Plata`.
- JS cliente < 30KB; YT siempre click-to-load; imágenes con `alt` real y dimensiones; tap targets ≥44px; `prefers-reduced-motion` respetado.
- Sin backend, sin checkout, sin CMS, sin contenido inventado: lo que falte (handles de artistas, flyers en alta) se omite sin romper layout.

---

## File Map

```
glock-0223/
  package.json, astro.config.mjs, tsconfig.json, vercel.json
  public/favicon.svg, public/robots.txt
  public/images/logo/*, public/images/flyers/*, public/images/og-glock.jpg
  src/content/glock.json
  src/layouts/Base.astro
  src/styles/global.css
  src/pages/index.astro, src/pages/404.astro
  src/components/Header.astro, Hero.astro, Manifiesto.astro
  src/components/Ediciones.astro, EdicionCard.astro
  src/components/Artistas.astro, Sessions.astro, Sponsors.astro
  src/components/SerParte.astro, Faq.astro, Contacto.astro, StickyCta.astro
  src/utils/seo.ts (JSON-LD builders + wa links)
```

---

### Task 1: Scaffold `glock-0223/`

**Files:**
- Create: `glock-0223/package.json`, `glock-0223/astro.config.mjs`, `glock-0223/tsconfig.json`, `glock-0223/vercel.json`, `glock-0223/src/pages/index.astro`, `glock-0223/src/layouts/Base.astro`, `glock-0223/src/styles/global.css`, `glock-0223/public/robots.txt`, `glock-0223/public/favicon.svg`
- Test: build output `glock-0223/dist/index.html`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: base compilable; `Base.astro` props `{ title: string; description: string }`; alias de леса CSS con tokens `--glock-*`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "glock-0223",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/sitemap": "latest",
    "@fontsource/barlow-condensed": "^5.3.0",
    "@tailwindcss/vite": "latest",
    "astro": "latest",
    "sharp": "latest",
    "tailwindcss": "latest"
  },
  "devDependencies": {
    "@astrojs/check": "latest",
    "typescript": "latest"
  }
}
```

- [ ] **Step 2: Crear `astro.config.mjs`, `tsconfig.json`, `vercel.json`, `robots.txt`, `favicon.svg`**

```js
// glock-0223/astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://glock-0223.vercel.app',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

```json
// glock-0223/tsconfig.json
{ "extends": "astro/tsconfigs/strict", "compilerOptions": { "verbatimModuleSyntax": true } }
```

```json
// glock-0223/vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]},
    { "source": "/_astro/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]}
  ]
}
```

```text
# glock-0223/public/robots.txt
User-agent: *
Allow: /
Sitemap: https://glock-0223.vercel.app/sitemap-index.xml
```

```svg
<!-- glock-0223/public/favicon.svg : G sólida stencil en violeta sobre negro -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0A0A0A"/><text x="32" y="46" font-family="Arial Black, sans-serif" font-size="40" font-weight="900" text-anchor="middle" fill="#F5F1E8">G</text></svg>
```

- [ ] **Step 3: Crear `Base.astro` mínimo + `global.css` + `index.astro` "hola GLOCK"**

```astro
---
// glock-0223/src/layouts/Base.astro
import '../styles/global.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';

interface Props { title: string; description: string; }
const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, 'https://glock-0223.vercel.app').toString();
---
<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content="https://glock-0223.vercel.app/images/og-glock.jpg" />
    <meta property="og:locale" content="es_AR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0A0A0A" />
  </head>
  <body class="bg-[#0A0A0A] text-[#F5F1E8] antialiased">
    <slot />
  </body>
</html>
```

```css
/* glock-0223/src/styles/global.css */
@import "tailwindcss";

:root {
  --glock-black: #0A0A0A;
  --glock-bone: #F5F1E8;
  --glock-violet: #4B0055;
  --glock-magenta: #C400FF;
}

html { scroll-behavior: smooth; }
body { font-family: ui-sans-serif, system-ui, sans-serif; }
.font-display { font-family: "Barlow Condensed", "Arial Narrow", sans-serif; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

```astro
---
// glock-0223/src/pages/index.astro
import Base from '../layouts/Base.astro';
---
<Base title="GLOCK | Shows & Cypher — Trap, Rap y Hip-Hop en Mar del Plata" description="GLOCK Shows & Cypher en Mar del Plata: ronda cypher con MVP + shows de trap de artistas emergentes. Ediciones, artistas, Cypher Sessions y próxima fecha.">
  <main><h1 class="font-display">GLOCK</h1></main>
</Base>
```

- [ ] **Step 4: Instalar y compilar**

Run: `npm install && npm run build` (workdir `glock-0223/`)
Expected: `✔ Completed in …` + `dist/index.html` existe.

- [ ] **Step 5: Commit**

```bash
git add glock-0223/package.json glock-0223/astro.config.mjs glock-0223/tsconfig.json glock-0223/vercel.json glock-0223/src glock-0223/public
git commit -m "feat(glock): scaffold Astro + Tailwind + Base SEO"
```

---

### Task 2: Datos reales + assets base

**Files:**
- Create: `glock-0223/src/content/glock.json`, `glock-0223/public/images/logo/README.md`
- Test: script inline node que valida JSON (sin archivo de test permanente).

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `glock.json` con `contacto, ediciones[4], artistas[], sessions[4], sponsors[], proxima, faq[6]`; resto de tareas importan este JSON con tipos de `src/utils/seo.ts` (Task 7 define tipos; hasta entonces `any` documentado).

- [ ] **Step 1: Escribir `glock.json` con todo el contenido real del spec**

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
      "n": 4, "fecha": "23/07", "lugar": "Club TRI",
      "direccion": "20 de Septiembre 2650, Mar del Plata",
      "maps": "https://www.google.com/maps/search/?api=1&query=Club+TRI+20+de+Septiembre+2650+Mar+del+Plata",
      "cypher": ["ULI40", "TOWAN", "QUECO", "REFLE", "ROUS", "AGS"],
      "shows": ["J TOBI", "DUKETT", "MINE", "PIPPER", "LUCKY BLANKO", "NEKO"],
      "extra": "Show de baile: ELIKRISS / POPPING MDP",
      "main": "Tobi Dolezor", "asistentes": 100, "mvp": "AGS",
      "destacado": "Segundo main de renombre",
      "flyer": "/images/flyers/glock-4.jpg",
      "flyerAlt": "Flyer GLOCK #4 con Tobi Dolezor en Club TRI Mar del Plata",
      "postIg": "https://www.instagram.com/p/DX7zVMHic42/"
    },
    {
      "n": 3, "fecha": "12/04", "lugar": "Mole Club",
      "direccion": "Gascón 3158, Mar del Plata",
      "maps": "https://www.google.com/maps/search/?api=1&query=Mole+Club+Gasc%C3%B3n+3158+Mar+del+Plata",
      "cypher": ["LIBRARY", "REFLE", "ROUS", "TOMPYET", "GUSTI", "AGS", "UHRY"],
      "shows": ["MERSA CLUB", "LIL STAR", "YG SOSSA", "TRUER", "JERELOREN", "HACHE"],
      "extra": "", "main": null, "asistentes": 50, "mvp": "REFLE",
      "destacado": "Junín + Mar del Plata y mejor cypher hasta ahora",
      "flyer": "/images/flyers/glock-3.jpg",
      "flyerAlt": "Flyer GLOCK #3 cypher session en Mole Club Mar del Plata",
      "postIg": "https://www.instagram.com/p/DWfGsVkie6k/"
    },
    {
      "n": 2, "fecha": "10/01", "lugar": "Mole Club",
      "direccion": "Gascón 3158, Mar del Plata",
      "maps": "https://www.google.com/maps/search/?api=1&query=Mole+Club+Gasc%C3%B3n+3158+Mar+del+Plata",
      "cypher": ["D-WAN", "J TOBI", "OVCRIX", "ONMYSHIT", "PICHI", "TOWAN", "ULI40"],
      "shows": ["HUNTER YB", "MATTEITO YB", "SOWKINGPASTO", "THATY RDZ", "LUCKY BLANKO", "UZU"],
      "extra": "", "main": "cero*", "asistentes": 190, "mvp": null,
      "destacado": "Primer main de Buenos Aires y récord de asistencia",
      "flyer": "/images/flyers/glock-2.jpg",
      "flyerAlt": "Flyer GLOCK #2 con cero como main en Mole Club Mar del Plata",
      "postIg": "https://www.instagram.com/p/DSORaB4CTsR/"
    },
    {
      "n": 1, "fecha": "17/11", "lugar": "Mole Club",
      "direccion": "Gascón 3158, Mar del Plata",
      "maps": "https://www.google.com/maps/search/?api=1&query=Mole+Club+Gasc%C3%B3n+3158+Mar+del+Plata",
      "cypher": ["OXXO", "ULI40", "LEIVA", "CHAMBRET", "CUNDO YB", "LIBRARY ft. SOWKINGPASTO", "TOWAN", "QUECO", "NIGATO NIMACRI", "MATEODOSMG"],
      "shows": ["MURRI", "ENZY M", "HUNTER YB", "MATTEITO YB", "LUCKY BLANKO", "KENAY WOH", "THATY RDZ"],
      "extra": "", "main": null, "asistentes": 120, "mvp": null,
      "destacado": "Fecha inaugural",
      "flyer": "/images/flyers/glock-1.jpg",
      "flyerAlt": "Flyer GLOCK #1 fecha inaugural en Mole Club Mar del Plata",
      "postIg": "https://www.instagram.com/p/DRDpROdCUQH/"
    }
  ],
  "artistas": [
    { "nombre": "ULI40", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "TOWAN", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "QUECO", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "REFLE", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "ROUS", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "AGS", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "LIBRARY", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "LUCKY BLANKO", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "HUNTER YB", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "MATTEITO YB", "ig": "", "tiktok": "", "yt": "" },
    { "nombre": "J TOBI", "ig": "", "tiktok": "", "yt": "" }
  ],
  "sessions": [
    { "n": 1, "yt": "https://www.youtube.com/watch?v=SGWKBFfL4XE", "estado": "publicada" },
    { "n": 2, "yt": "https://www.youtube.com/watch?v=qSjPJW9Fa_o", "estado": "publicada" },
    { "n": 3, "yt": "https://www.youtube.com/watch?v=bvaBQ7Y_bEE", "estado": "publicada" },
    { "n": 4, "yt": "", "estado": "editandose" }
  ],
  "sponsors": [
    { "nombre": "The Real Pilcha" }, { "nombre": "Fas Spot" },
    { "nombre": "Squadra Vincente" }, { "nombre": "PalaciosTTT" },
    { "nombre": "Vela Barbería" }
  ],
  "proxima": { "n": 5, "estado": "a-anunciar", "entradasUrl": "" },
  "faq": [
    { "q": "¿Qué es GLOCK?", "a": "GLOCK Shows & Cypher es una productora de Mar del Plata: ronda cypher de 6 a 10 raperos con MVP + shows de trap de artistas emergentes. Eventos organizados por artistas para artistas." },
    { "q": "¿Qué es un cypher y qué es el MVP?", "a": "En el cypher cada rapero suelta un tema en ronda; al final se define al MVP de la noche." },
    { "q": "¿Dónde son los eventos de GLOCK?", "a": "En Mar del Plata: Mole Club (Gascón 3158) y Club TRI (20 de Septiembre 2650)." },
    { "q": "¿Cómo compro entradas?", "a": "Cuando hay fecha confirmada se publica el link de entradas acá y en Instagram. Sin fecha confirmada, escribinos por WhatsApp al +54 223 529-8014 y te avisamos." },
    { "q": "Soy artista, ¿cómo participo?", "a": "Escribinos por WhatsApp contando tu aka y qué hacés (trap, rap, freestyle) o al mail glock08000@gmail.com." },
    { "q": "¿Cómo sponsoreo GLOCK?", "a": "Escribinos por WhatsApp como marca o espacio y te pasamos la propuesta." }
  ]
}
```

- [ ] **Step 2: Crear `public/images/logo/README.md` con inventario de assets**

```md
# Assets GLOCK
Pegar acá los archivos del dueño:
- logo-blanco.svg, logo-negro.svg, logo-violeta.svg, logo-circular.svg
- flyers: glock-1.jpg, glock-2.jpg, glock-3.jpg, glock-4.jpg (alta, <400KB c/u)
- og-glock.jpg (1200x630, logo blanco sobre negro + flyer #4)
Fallback: si falta un flyer, la card muestra bloque sólido violeta con el nº de edición (nunca imagen rota).
```

- [ ] **Step 3: Validar JSON**

Run: `node -e "const g=require('./src/content/glock.json'); console.log('ediciones:'+g.ediciones.length,' artistas:'+g.artistas.length,' sessions:'+g.sessions.length,' faq:'+g.faq.length); if(g.ediciones.length!==4||g.faq.length!==6) process.exit(1)"` (workdir `glock-0223/`)
Expected: `ediciones:4 artistas:11 sessions:4 faq:6`.

- [ ] **Step 4: Commit**

```bash
git add glock-0223/src/content/glock.json glock-0223/public/images/logo/README.md
git commit -m "feat(glock): datos reales ediciones/artistas/sessions/faq"
```

---

### Task 3: Header + Hero + Manifiesto + StickyCTA

**Files:**
- Create: `glock-0223/src/components/Header.astro`, `Hero.astro`, `Manifiesto.astro`, `StickyCta.astro`
- Modify: `glock-0223/src/pages/index.astro` (componer las 4)
- Test: `glock-0223/dist/index.html` contiene H1, lema, CTAs.

**Interfaces:**
- Consumes: `glock.json contacto`.
- Produces: anclas `#ediciones #artistas #sessions #contacto`; CSS classes `.btn-glock`, `.eyebrow`.

- [ ] **Step 1: Crear los 4 componentes (importan el JSON directo)**

```astro
---
// Header.astro
import data from '../content/glock.json';
---
<header class="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
  <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Principal">
    <a href="#top" class="font-display text-2xl font-bold tracking-wide">GLOCK</a>
    <div class="hidden gap-6 text-sm md:flex">
      <a href="#ediciones">Ediciones</a><a href="#artistas">Artistas</a>
      <a href="#sessions">Sessions</a><a href="#contacto">Contacto</a>
    </div>
    <a href={data.contacto.instagram} target="_blank" rel="noopener" class="btn-glock">Seguir</a>
  </nav>
</header>
```

```astro
---
// Hero.astro
import data from '../content/glock.json';
---
<section id="top" class="mx-auto max-w-6xl px-4 pb-10 pt-14 md:pt-20">
  <p class="eyebrow">MAR DEL PLATA — ESCENA URBANA</p>
  <h1 class="font-display text-5xl font-bold leading-none md:text-7xl">GLOCK <span class="text-[#C400FF]">|</span> Shows &amp; Cypher</h1>
  <p class="mt-4 max-w-2xl text-lg">Comunidad haciendo la cone de artistas urbanos emergentes.</p>
  <p class="mt-2 max-w-2xl text-white/70">Eventos organizados por artistas para artistas. Cypher + shows de trap en Mar del Plata.</p>
  <div class="mt-6 flex flex-col gap-3 sm:flex-row">
    <a class="btn-glock" href={data.contacto.instagram} target="_blank" rel="noopener">Seguir en Instagram</a>
    <a class="btn-ghost" href={data.contacto.whatsapp} target="_blank" rel="noopener">WhatsApp {data.contacto.telefonoLabel}</a>
    <a class="btn-ghost" href="#sessions">Ver Cypher Sessions</a>
  </div>
  <p class="mt-6 text-sm text-white/60">4 ediciones · 2 mains de Buenos Aires · 460 asistentes acumulados</p>
</section>
```

```astro
---
// Manifiesto.astro
---
<section class="border-y border-white/10 bg-[#120312]">
  <div class="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
    <div><h2 class="font-display text-2xl">CYPHER 6–10 + MVP</h2><p class="text-white/70">Ronda donde cada rapero suelta un tema y se define al MVP.</p></div>
    <div><h2 class="font-display text-2xl">SHOWS DE TRAP</h2><p class="text-white/70">Artistas locales y mains de Buenos Aires (ediciones 2 y 4).</p></div>
    <div><h2 class="font-display text-2xl">POR ARTISTAS, PARA ARTISTAS</h2><p class="text-white/70">Encontrarse, mostrarse y crecer en Mar del Plata.</p></div>
  </div>
</section>
```

```astro
---
// StickyCta.astro
import data from '../content/glock.json';
---
<div class="fixed bottom-0 left-0 right-0 z-50 flex gap-2 border-t border-white/10 bg-[#0A0A0A]/95 p-3 md:hidden">
  <a class="btn-glock flex-1 text-center" href={data.contacto.instagram} target="_blank" rel="noopener">Instagram</a>
  <a class="btn-ghost flex-1 text-center" href={data.contacto.whatsapp} target="_blank" rel="noopener">WhatsApp</a>
</div>
```

- [ ] **Step 2: Agregar clases `.btn-glock .btn-ghost .eyebrow` a `global.css`**

```css
.btn-glock { display: inline-block; background: #4B0055; color: #F5F1E8; font-weight: 700; padding: 0.8rem 1.4rem; min-height: 44px; }
.btn-ghost { display: inline-block; border: 2px solid #F5F1E8; color: #F5F1E8; font-weight: 700; padding: 0.8rem 1.4rem; min-height: 44px; }
.eyebrow { letter-spacing: 0.2em; font-size: 0.8rem; color: #C400FF; font-weight: 700; }
```

- [ ] **Step 3: Componer en `index.astro` y compilar**

```astro
---
import Base from '../layouts/Base.astro';
import Header from '../components/Header.astro';
import Hero from '../components/Hero.astro';
import Manifiesto from '../components/Manifiesto.astro';
import StickyCta from '../components/StickyCta.astro';
---
<Base title="GLOCK | Shows & Cypher — Trap, Rap y Hip-Hop en Mar del Plata" description="GLOCK Shows & Cypher en Mar del Plata: ronda cypher con MVP + shows de trap de artistas emergentes. Ediciones, artistas, Cypher Sessions y próxima fecha.">
  <Header /><main><Hero /><Manifiesto /></main><StickyCta />
</Base>
```

Run: `npm run build` (workdir `glock-0223/`)
Expected: build OK.

- [ ] **Step 4: Verificar contenido en el HTML**

Run: `node -e "const f=require('fs').readFileSync('./dist/index.html','utf8'); for(const s of ['Shows &amp; Cypher','Comunidad haciendo la cone','instagram.com/glock.0223','wa.me/5492235298014']) if(!f.includes(s)) throw new Error('falta: '+s); console.log('hero OK')"` (workdir `glock-0223/`)
Expected: `hero OK`.

- [ ] **Step 5: Commit**

```bash
git add glock-0223/src/components/Header.astro glock-0223/src/components/Hero.astro glock-0223/src/components/Manifiesto.astro glock-0223/src/components/StickyCta.astro glock-0223/src/pages/index.astro glock-0223/src/styles/global.css
git commit -m "feat(glock): header hero manifiesto sticky-cta"
```

---

### Task 4: Ediciones #1–#4

**Files:**
- Create: `glock-0223/src/components/Ediciones.astro`, `EdicionCard.astro`
- Modify: `glock-0223/src/pages/index.astro` (insertar `<Ediciones/>` tras Manifiesto)
- Test: dist contiene las 4 ediciones, direcciones, links Maps e IG.

**Interfaces:**
- Consumes: `glock.json ediciones[]`.
- Produces: sección `#ediciones`; fallback flyer si falta el jpg; `mainFoto` opcional en ediciones 2 (`cero*`) y 4 (`Tobi Dolezor`) SOLO si los archivos existen en disco (`public/images/mains/cero.jpg`, `tobi-dolezor.jpg`): en ese caso agregar la clave al JSON y prop `mainFoto: string` en EdicionCard con `<img>` + alt (`Foto de cero* en vivo en GLOCK` / `Foto de Tobi Dolezor en vivo en GLOCK`); si no existen, texto como está y nota en el reporte.

- [ ] **Step 1: Crear `EdicionCard.astro` + `Ediciones.astro`**

```astro
---
// EdicionCard.astro
interface Props {
  n: number; fecha: string; lugar: string; direccion: string; maps: string;
  cypher: string[]; shows: string[]; extra: string; main: string | null;
  asistentes: number; mvp: string | null; destacado: string;
  flyer: string; flyerAlt: string; postIg: string;
}
const p = Astro.props;
---
<article class="grid gap-4 border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2">
  <div class="bg-[#4B0055] font-display text-6xl font-bold flex items-center justify-center min-h-48">
    <img src={p.flyer} alt={p.flyerAlt} loading="lazy" width="800" height="1000" class="h-auto w-full object-cover" onerror="this.remove()" />
  </div>
  <div>
    <h3 class="font-display text-3xl">GLOCK #{p.n} — {p.fecha}</h3>
    <p class="text-white/80">{p.lugar} · {p.direccion} · <a href={p.maps} target="_blank" rel="noopener" class="underline">Cómo llegar</a></p>
    <p class="mt-2 text-sm"><strong>CYPHER:</strong> {p.cypher.join(' · ')}</p>
    <p class="mt-1 text-sm"><strong>SHOWS:</strong> {p.shows.join(' · ')}</p>
    {p.main && <p class="mt-1 text-sm"><strong>MAIN:</strong> {p.main}</p>}
    {p.mvp && <p class="mt-1 text-sm"><strong>MVP:</strong> {p.mvp}</p>}
    <p class="mt-1 text-sm text-white/70">~{p.asistentes} asistentes · {p.destacado}</p>
    <a href={p.postIg} target="_blank" rel="noopener" class="btn-ghost mt-3">Ver post</a>
  </div>
</article>
```

```astro
---
// Ediciones.astro
import data from '../content/glock.json';
import EdicionCard from './EdicionCard.astro';
---
<section id="ediciones" class="mx-auto max-w-6xl px-4 py-12">
  <p class="eyebrow">HISTORIAL</p>
  <h2 class="font-display text-4xl md:text-5xl">Ediciones en Mar del Plata</h2>
  <div class="mt-6 grid gap-6">
    {data.ediciones.map((e) => <EdicionCard {...e} />)}
  </div>
</section>
```

- [ ] **Step 2: Montar en `index.astro`** (agregar `import Ediciones` y `<Ediciones />` después de `<Manifiesto />`), compilar.

Run: `npm run build` (workdir `glock-0223/`)
Expected: build OK.

- [ ] **Step 3: Verificar las 4 ediciones**

Run: `node -e "const f=require('fs').readFileSync('./dist/index.html','utf8'); for(const s of ['GLOCK #4','GLOCK #1','Gascón 3158','20 de Septiembre 2650','Tobi Dolezor','cero*','instagram.com/p/DRDpROdCUQH','instagram.com/p/DX7zVMHic42']) if(!f.includes(s)) throw new Error('falta: '+s); console.log('ediciones OK')"` (workdir `glock-0223/`)
Expected: `ediciones OK`.

- [ ] **Step 4: Commit**

```bash
git add glock-0223/src/components/Ediciones.astro glock-0223/src/components/EdicionCard.astro glock-0223/src/pages/index.astro
git commit -m "feat(glock): ediciones 1-4 con flyer maps e IG"
```

---

### Task 5: Artistas + Sessions + Sponsors + Próxima

**Files:**
- Create: `glock-0223/src/components/Artistas.astro`, `Sessions.astro`, `Sponsors.astro`, `Proxima.astro`, `SongWars.astro`
- Modify: `glock-0223/src/pages/index.astro`, `glock-0223/src/content/glock.json` (agregar clave `songwars[]` con vol. 1 exacto de abajo; agregar `logo` a los 5 sponsors SOLO si el archivo existe en disco en `public/images/sponsors/`: `real-pilcha.png, fas-spot.png, squadra-vincente.png, palacios-ttt.png, vela-barberia.png`)
- Test: dist sin `href=""`, session #4 sin iframe, sponsors presentes.

**Interfaces:**
- Consumes: `glock.json artistas, sessions, sponsors, proxima, contacto` + `songwars[]` (lo crea esta tarea).
- Produce: secciones `#artistas #sessions #sponsors #proxima #songwars` (SongWars entre Sessions y Sponsors). `Sponsors.astro` renderiza `<img>` solo si `logo` non-empty; si no, nombre en texto.

**Datos SongWars vol. 1 (verbatim a `glock.json:songwars[]`):** `{ "vol": 1, "fecha": "31/05", "hora": "21:30", "plataforma": "Kick", "url": "https://kick.com/soulsv-0", "formato": "Cada artista presenta su canción, un jurado evalúa con puntaje y los ganadores se llevan premios.", "premio": "1er puesto: cupo para tocar en vivo en GLOCK #4", "flyer": "/images/flyers/songwars-vol1.jpg", "flyerAlt": "Flyer SongWars vol.1 competencia virtual de GLOCK" }`. Sección con eyebrow `VIRTUAL`, H2 `SongWars`, párrafo de formato, tarjeta VOL.1 (fecha/hora/plataforma/link `Ver en Kick`/premio/flyer o bloque violeta fallback).

- [ ] **Step 1: Crear los 4 componentes**

```astro
---
// Artistas.astro
import data from '../content/glock.json';
---
<section id="artistas" class="mx-auto max-w-6xl px-4 py-12">
  <p class="eyebrow">COMUNIDAD</p>
  <h2 class="font-display text-4xl md:text-5xl">Artistas que pasaron por GLOCK</h2>
  <ul class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
    {data.artistas.map((a) => (
      <li class="border border-white/10 p-3">
        <p class="font-display text-xl">{a.nombre}</p>
        <p class="mt-1 flex gap-3 text-sm">
          {a.ig && <a href={a.ig} target="_blank" rel="noopener" class="underline">IG</a>}
          {a.tiktok && <a href={a.tiktok} target="_blank" rel="noopener" class="underline">TT</a>}
          {a.yt && <a href={a.yt} target="_blank" rel="noopener" class="underline">YT</a>}
          {(!a.ig && !a.tiktok && !a.yt) && <span class="text-white/40">redes pronto</span>}
        </p>
      </li>
    ))}
  </ul>
  <p class="mt-4 text-sm text-white/60">¿Sos artista y querés tu link acá? Escribinos por WhatsApp.</p>
</section>
```

```astro
---
// Sessions.astro
import data from '../content/glock.json';
const idOf = (url: string) => (url.match(/v=([\w-]{11})/)?.[1] ?? '');
---
<section id="sessions" class="border-y border-white/10 bg-[#120312]">
  <div class="mx-auto max-w-6xl px-4 py-12">
    <p class="eyebrow">VIDEO</p>
    <h2 class="font-display text-4xl md:text-5xl">Cypher Sessions</h2>
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      {data.sessions.map((s) => s.estado === 'publicada' ? (
        <a href={s.yt} target="_blank" rel="noopener" class="block border border-white/10">
          <img src={`https://i.ytimg.com/vi/${idOf(s.yt)}/hqdefault.jpg`} alt={`Cypher Session #${s.n} GLOCK Mar del Plata`} loading="lazy" width="480" height="360" class="aspect-video w-full object-cover" />
          <p class="p-3 font-display text-xl">SESSION #{s.n} — ver en YouTube</p>
        </a>
      ) : (
        <div class="border border-dashed border-white/30 p-6">
          <p class="font-display text-xl">SESSION #{s.n} — editándose</p>
          <a href="https://wa.me/5492235298014?text=Av%C3%ADsenme%20cuando%20salga%20la%20Session%20%234" target="_blank" rel="noopener" class="btn-ghost mt-3">Avísenme</a>
        </div>
      ))}
    </div>
  </div>
</section>
```

```astro
---
// Sponsors.astro
import data from '../content/glock.json';
---
<section id="sponsors" class="mx-auto max-w-6xl px-4 py-12">
  <p class="eyebrow">APOYAN</p>
  <h2 class="font-display text-4xl md:text-5xl">Sponsors</h2>
  <ul class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
    {data.sponsors.map((s) => <li class="border border-white/10 p-4 text-center font-display text-xl">{s.nombre}</li>)}
  </ul>
</section>
```

```astro
---
// Proxima.astro
import data from '../content/glock.json';
---
<section id="proxima" class="mx-auto max-w-6xl px-4 pb-12">
  <div class="border-2 border-[#C400FF] p-6 text-center">
    <p class="eyebrow">PRÓXIMA EDICIÓN</p>
    <h2 class="font-display text-4xl">GLOCK #{data.proxima.n} — fecha a anunciar</h2>
    {data.proxima.entradasUrl
      ? <a class="btn-glock mt-4" href={data.proxima.entradasUrl} target="_blank" rel="noopener">Comprar entradas</a>
      : <div class="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <a class="btn-glock" href={data.contacto.instagram} target="_blank" rel="noopener">Enterarme por Instagram</a>
          <a class="btn-ghost" href="https://wa.me/5492235298014?text=Av%C3%ADsenme%20de%20la%20pr%C3%B3xima%20GLOCK" target="_blank" rel="noopener">Avísenme por WhatsApp</a>
        </div>}
  </div>
</section>
```

- [ ] **Step 2: Montar en `index.astro`** (`Artistas, Sessions, Sponsors, Proxima` antes del cierre de `</main>`), compilar.

Run: `npm run build` (workdir `glock-0223/`)
Expected: build OK.

- [ ] **Step 3: Verificar reglas (sin href vacío, #4 sin iframe)**

Run: `node -e "const f=require('fs').readFileSync('./dist/index.html','utf8'); if(f.includes('href=\"\"')) throw new Error('hay href vacio'); if(!f.includes('editándose')) throw new Error('falta estado editandose'); if(!f.includes('The Real Pilcha')) throw new Error('falta sponsor'); for(const s of ['SONGWARS','kick.com/soulsv-0','GLOCK #4']) if(!f.includes(s)) throw new Error('falta: '+s); console.log('bloque OK')"` (workdir `glock-0223/`)
Expected: `bloque OK`.

- [ ] **Step 4: Commit**

```bash
git add glock-0223/src/components/Artistas.astro glock-0223/src/components/Sessions.astro glock-0223/src/components/Sponsors.astro glock-0223/src/components/Proxima.astro glock-0223/src/components/SongWars.astro glock-0223/src/content/glock.json glock-0223/src/pages/index.astro
git commit -m "feat(glock): artistas sessions sponsors songwars proxima"
```

---

### Task 6: SerParte + FAQ + Contacto/Footer + 404 + JSON-LD

**Files:**
- Create: `glock-0223/src/utils/seo.ts`, `glock-0223/src/components/SerParte.astro`, `Faq.astro`, `Contacto.astro`, `glock-0223/src/pages/404.astro`
- Modify: `glock-0223/src/layouts/Base.astro` (slot JSON-LD extra), `glock-0223/src/pages/index.astro`
- Test: dist con 3 intents WA, FAQPage LD válido, footer NAP.

**Interfaces:**
- Consumes: `glock.json` completo.
- Produce: `seo.ts` exporta `orgJsonLd()`, `faqJsonLd(faq)`, `eventsJsonLd(ediciones)`, `wa(text)`; `Base.astro` acepta prop opcional `extraLd?: object[]`.

- [ ] **Step 1: Crear `src/utils/seo.ts`**

```ts
const SITE = 'https://glock-0223.vercel.app';
const CONTACT = {
  whatsapp: 'https://wa.me/5492235298014',
  instagram: 'https://www.instagram.com/glock.0223/',
  tiktok: 'https://www.tiktok.com/@glock.0223',
  youtube: 'https://www.youtube.com/@GLOCK0223',
};

export const wa = (text: string): string =>
  `https://wa.me/5492235298014?text=${encodeURIComponent(text)}`;

export interface FaqItem { q: string; a: string }
export interface EdicionLd {
  n: number; fecha: string; lugar: string; direccion: string;
  flyer: string; postIg: string; shows: string[]; cypher: string[];
}

export function orgJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GLOCK Shows & Cypher',
    url: SITE,
    sameAs: [CONTACT.instagram, CONTACT.tiktok, CONTACT.youtube],
  };
}

export function faqJsonLd(faq: FaqItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function eventsJsonLd(ediciones: EdicionLd[]): object[] {
  return ediciones.map((e) => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `GLOCK #${e.n} — Shows & Cypher en Mar del Plata`,
    startDate: `2026-${e.fecha.split('/').reverse().join('-')}`,
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: e.lugar,
      address: { '@type': 'PostalAddress', streetAddress: e.direccion, addressLocality: 'Mar del Plata', addressCountry: 'AR' },
    },
    performer: [...e.cypher, ...e.shows].map((p) => ({ '@type': 'MusicGroup', name: p })),
    image: [`${SITE}${e.flyer}`],
    url: e.postIg,
  }));
}
```

- [ ] **Step 2: Crear `SerParte.astro`, `Faq.astro`, `Contacto.astro`, `404.astro`**

```astro
---
// SerParte.astro
import { wa } from '../utils/seo';
---
<section id="ser-parte" class="border-y border-white/10 bg-[#120312]">
  <div class="mx-auto max-w-6xl px-4 py-12">
    <p class="eyebrow">COMUNIDAD</p>
    <h2 class="font-display text-4xl md:text-5xl">¿Querés ser parte de GLOCK?</h2>
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <a class="border border-white/10 p-5" href={wa('Quiero mostrarme en GLOCK, soy [aka] y hago [trap/rap/freestyle]')} target="_blank" rel="noopener"><p class="font-display text-2xl">SOY ARTISTA</p><p class="text-white/70">Mostrate en el cypher o en los shows.</p></a>
      <a class="border border-white/10 p-5" href={wa('Quiero sponsorear GLOCK, soy [marca]')} target="_blank" rel="noopener"><p class="font-display text-2xl">SOY MARCA</p><p class="text-white/70">Sponsors y emprendimientos.</p></a>
      <a class="border border-white/10 p-5" href={wa('Tengo un espacio para GLOCK en [zona]')} target="_blank" rel="noopener"><p class="font-display text-2xl">TENGO ESPACIO</p><p class="text-white/70">Espacios culturales y nocturnos.</p></a>
    </div>
  </div>
</section>
```

```astro
---
// Faq.astro
import data from '../content/glock.json';
---
<section id="faq" class="mx-auto max-w-6xl px-4 py-12">
  <p class="eyebrow">DUDAS</p>
  <h2 class="font-display text-4xl md:text-5xl">Preguntas frecuentes</h2>
  <div class="mt-6 grid gap-3">
    {data.faq.map((f) => (
      <details class="border border-white/10 p-4">
        <summary class="cursor-pointer font-bold">{f.q}</summary>
        <p class="mt-2 text-white/75">{f.a}</p>
      </details>
    ))}
  </div>
</section>
```

```astro
---
// Contacto.astro
import data from '../content/glock.json';
---
<footer id="contacto" class="border-t border-white/10">
  <div class="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
    <div>
      <p class="font-display text-3xl">GLOCK | Shows &amp; Cypher</p>
      <p class="text-white/70">Mar del Plata, Buenos Aires, Argentina</p>
      <p class="mt-2">WhatsApp <a class="underline" href={data.contacto.whatsapp} target="_blank" rel="noopener">{data.contacto.telefonoLabel}</a></p>
      <p>Email <a class="underline" href="mailto:glock08000@gmail.com">glock08000@gmail.com</a></p>
    </div>
    <div class="flex flex-wrap gap-3">
      <a class="btn-ghost" href={data.contacto.instagram} target="_blank" rel="noopener">Instagram</a>
      <a class="btn-ghost" href={data.contacto.tiktok} target="_blank" rel="noopener">TikTok</a>
      <a class="btn-ghost" href={data.contacto.youtube} target="_blank" rel="noopener">YouTube</a>
    </div>
  </div>
</footer>
```

```astro
---
// 404.astro
import Base from '../layouts/Base.astro';
---
<Base title="No encontrado — GLOCK Mar del Plata" description="Página no encontrada. Volvé a GLOCK Shows & Cypher Mar del Plata.">
  <main class="mx-auto max-w-6xl px-4 py-20 text-center">
    <h1 class="font-display text-5xl">404 — Esa fecha no existe</h1>
    <a class="btn-glock mt-6" href="/">Volver a GLOCK</a>
  </main>
</Base>
```

- [ ] **Step 3: Inyectar JSON-LD en `index.astro` (head) y montar secciones**

```astro
---
import Base from '../layouts/Base.astro';
import Header from '../components/Header.astro';
import Hero from '../components/Hero.astro';
import Manifiesto from '../components/Manifiesto.astro';
import Ediciones from '../components/Ediciones.astro';
import Artistas from '../components/Artistas.astro';
import Sessions from '../components/Sessions.astro';
import Sponsors from '../components/Sponsors.astro';
import Proxima from '../components/Proxima.astro';
import SerParte from '../components/SerParte.astro';
import Faq from '../components/Faq.astro';
import Contacto from '../components/Contacto.astro';
import StickyCta from '../components/StickyCta.astro';
import data from '../content/glock.json';
import { orgJsonLd, faqJsonLd, eventsJsonLd } from '../utils/seo';
const lds = [orgJsonLd(), faqJsonLd(data.faq), ...eventsJsonLd(data.ediciones as never[])];
---
<Base title="GLOCK | Shows & Cypher — Trap, Rap y Hip-Hop en Mar del Plata" description="GLOCK Shows & Cypher en Mar del Plata: ronda cypher con MVP + shows de trap de artistas emergentes. Ediciones, artistas, Cypher Sessions y próxima fecha.">
  {lds.map((ld) => <script type="application/ld+json" set:html={JSON.stringify(ld)} />)}
  <Header /><main><Hero /><Manifiesto /><Ediciones /><Artistas /><Sessions /><Sponsors /><Proxima /><SerParte /><Faq /></main><Contacto /><StickyCta />
</Base>
```

Run: `npm run build` (workdir `glock-0223/`)
Expected: build OK.

- [ ] **Step 4: Verificar intents + JSON-LD + NAP**

Run: `node -e "const f=require('fs').readFileSync('./dist/index.html','utf8'); for(const s of ['SOY ARTISTA','FAQPage','MusicEvent','Mar del Plata, Buenos Aires, Argentina','glock08000@gmail.com']) if(!f.includes(s)) throw new Error('falta: '+s); console.log('cierre OK')"` (workdir `glock-0223/`)
Expected: `cierre OK`.

- [ ] **Step 5: Commit**

```bash
git add glock-0223/src/utils/seo.ts glock-0223/src/components/SerParte.astro glock-0223/src/components/Faq.astro glock-0223/src/components/Contacto.astro glock-0223/src/pages/404.astro glock-0223/src/pages/index.astro
git commit -m "feat(glock): ser-parte faq contacto 404 + json-ld"
```

---

### Task 7: QA SEO + responsive + accesibilidad

**Files:**
- Modify: lo que surja del QA (lista explícita en el commit).
- Test: `npm run check`, `npm run build`, auditoría de alts, anchos 360/768/1024/1440, Lighthouse.

**Interfaces:**
- Consumes: sitio completo.
- Produce: sitio deployable; reporte QA en el mensaje de commit.

- [ ] **Step 1: Chequeo de tipos y build**

Run: `npm run check && npm run build` (workdir `glock-0223/`)
Expected: 0 errores.

- [ ] **Step 2: Auditoría de imágenes y links**

Run: `node -e "const f=require('fs').readFileSync('./dist/index.html','utf8'); const imgs=[...f.matchAll(/<img[^>]*>/g)]; const sinAlt=imgs.filter(m=>!/alt=/.test(m[0])); if(sinAlt.length) throw new Error('imgs sin alt: '+sinAlt.length); if(/__ASTRO|TODO|TBD|lorem/i.test(f)) throw new Error('placeholder en html'); console.log('imgs:'+imgs.length+' sin rotos lógicos OK')"` (workdir `glock-0223/`)
Expected: `imgs:N sin rotos lógicos OK` con N ≥ 4.

- [ ] **Step 3: Revisión responsive manual (DevTools o resize)**

Verificar en 360 / 768 / 1024 / 1440: sin scroll horizontal, hero apilado en móvil y 2 col en desktop, ediciones 1→2 col, artistas 2→3→4, sessions 1→3, sticky CTA solo visible <768px, taps ≥44px, `prefers-reduced-motion` sin animaciones. Anotar fixes aplicados.

- [ ] **Step 4: Lighthouse + validadores**

Lighthouse mobile ≥90 y desktop ≥95; validar una URL de preview en Rich Results Test (MusicEvent + FAQPage detectados) y OG (imagen 1200x630). Si el dominio final aún no existe, validar contra la URL de preview Vercel y dejar nota.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(glock): QA SEO responsive a11y — usable y deployable"
```

---

## Self-Review (autor del plan)

1. **Spec coverage:** propósito/CTA → Tasks 3,5,6; ediciones con datos exactos → Task 4; artistas editables → Task 5; sessions incl. #4 editándose → Task 5; sponsors → Task 5; ser-parte triple intent → Task 6; próxima a-anunciar + slot Passline → Task 5; contacto NAP → Task 6; SEO (title/description/canonical/OG/sitemap/JSON-LD/FAQ/keywords MDQ) → Tasks 1,6,7; responsive 360–1440 + sticky solo móvil → Tasks 3,5,7; performance <30KB JS + YT lite + lazy → Tasks 3,5,7; identidad (tokens, Barlow, sin gradientes) → Tasks 1,3.
2. **Placeholder scan:** sin TBD/TODO/lorem; los únicos strings vacíos son campos opcionales de artistas (`ig/tiktok/yt`) y `entradasUrl`, ambos con render condicional verificado en Tasks 5; assets faltantes tienen fallback sólido documentado en Task 2.
3. **Type consistency:** `EdicionCard` props matchean claves de `glock.json ediciones[]`; `seo.ts` (`FaqItem`, `EdicionLd`, `wa`, `orgJsonLd`, `faqJsonLd`, `eventsJsonLd`) coincide con sus usos en `index.astro`/`SerParte`; `Base` props `{title, description}` usadas igual en `index.astro` y `404.astro`.

## Deuda explícita con el dueño

- Pegar flyers en alta + logos en `public/images/` (ver `logo/README.md`); sin ellos el build usa fallback sólido (nunca roto).
- Completar handles de artistas en `glock.json` cuando los tengas (sin código).
- Confirmar fecha #1 17/11 vs 16/11 del flyer y cambiar dominio `site` al definitivo.
