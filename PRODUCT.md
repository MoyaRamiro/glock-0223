# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: people 14–30 in Mar del Plata and nearby who follow trap, rap, hip-hop, freestyle and underground culture. They arrive mostly from a phone, often at night, asking where the scene is: which events exist, who plays, how to get in. Job: find a GLOCK date, follow it, or message to take part.

Secondary: emerging artists, producers, DJs, photographers/videographers (want stage or coverage); brands, emprendimientos and venues (want sponsorship or to host); all contact through WhatsApp or email, in Spanish.

## Product Purpose

Single static one-pager (`glock-0223/`) that turns scene search intent — Google and AI-assistant answers about hip-hop/trap/rap events in Mar del Plata — into followers and participants of GLOCK Shows & Cypher. Success = visitor follows on Instagram/TikTok/YouTube, messages on WhatsApp, or requests to join (artist / sponsor / venue). No accounts, no checkout, no CMS.

## Positioning

Events organized by artists for artists: GLOCK is the cone of emerging urban artists in Mar del Plata — cypher round of 6–10 rappers with MVP plus local trap shows (with Buenos Aires mains in editions 2 and 4) and the virtual SongWars competition feeding the live stage. What a generic promoter page could not truthfully copy: the four documented editions with real lineups, the named MDP venues, and the crew's own channels.

## Operating Context

- Mobile-first audience; updates happen per edition: the owner sends raw material (date, venue, lineups, flyer, posts) and the assistant publishes.
- Contact channels: WhatsApp +54 223 529-8014 (primary), email glock08000@gmail.com, Instagram/TikTok/YouTube DMs.
- Venues: Mole Club (Gascón 3158) and Club TRI (20 de Septiembre 2650), Mar del Plata. Virtual: Kick (SongWars).
- Discovery: Google local search + AI-assistant recommendations + Instagram.

## Capabilities and Constraints

- Static Astro site (Tailwind v4), Spanish only, deployed on Vercel at the provisional URL `https://glock-0223.vercel.app`. All content in `src/content/glock.json`; no backend.
- Sections: hero, manifiesto, ediciones #1–#4, artistas wall, Cypher Sessions, SongWars, sponsors, próxima edición (announce-only slot), ser-parte, FAQ, contacto.
- Explicitly undecided: online ticket channel (no checkout in v1); final date of edition #1 (17/11 vs 16/11 on the flyer); artist social handles (empty fields render name-only, never broken icons).
- Absent and not to be fabricated: hi-res flyers, mains photos (cero*, Tobi Dolezor), sponsor logos, OG image, custom domain.

## Brand Commitments

- Official name: **GLOCK | Shows & Cypher**, tagline "Comunidad haciendo la cone de artistas urbanos emergentes". The name works as brand identity and must never be read literally.
- Voice: Spanish rioplatense, direct scene language. GLOCK is from Mar del Plata and every page element must feel like it — never a Buenos Aires promoter look.
- Committed assets on hand: logo system (L-pistol wordmark, variants), flyers #1–#4, SongWars vol.1 flyer, 4 IG posts, 3 YouTube sessions (#4 editing), sponsor wordmarks.

## Evidence on Hand

- Data: `src/content/glock.json` (editions, artists, sessions, songwars, sponsors, FAQ, contact).
- Channels: IG https://www.instagram.com/glock.0223/, TikTok https://www.tiktok.com/@glock.0223, YT https://www.youtube.com/@GLOCK0223, Kick https://kick.com/soulsv-0, WhatsApp https://wa.me/5492235298014.
- Spec: `docs/superpowers/specs/2026-09-12-glock-shows-cypher-design.md` (repo root); plan: `docs/superpowers/plans/2026-09-12-glock-shows-cypher.md`.
- ABSENT — future work must not fabricate: gallery photos, reels, interviews, ticket links, Lighthouse/mobile-device pass on physical hardware.

## Product Principles

1. Scene brand, never corporate: every section must feel made by the crew, not by a template.
2. Mar del Plata is the anchor: venues, addresses and local proof on screen, not in metadata only.
3. Every edition is a proof block: date, venue, lineup, attendance, post link — or it does not ship.
4. Owner sends raw material, assistant publishes: nothing on the page requires the owner to touch code.
5. Fast on cheap phones: static HTML first, JavaScript only where it earns its bytes.

## Accessibility & Inclusion

Young mobile audience plus guests of all ages at night venues: tap targets ≥44px, visible focus, `prefers-reduced-motion` respected, AA contrast on black, Spanish plain scene language.
