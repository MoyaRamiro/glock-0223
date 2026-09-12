const SITE = 'https://glock-0223.vercel.app';
const CONTACT = {
  whatsapp: 'https://wa.me/5492235298014',
  instagram: 'https://www.instagram.com/glock.0223/',
  tiktok: 'https://www.tiktok.com/@glock.0223',
  youtube: 'https://www.youtube.com/@GLOCK0223',
};

export const wa = (text: string): string =>
  `https://wa.me/5492235298014?text=${encodeURIComponent(text)}`;

export const ytId = (url: string): string => url.match(/v=([\w-]{11})/)?.[1] ?? '';

export interface FaqItem { q: string; a: string }
export interface EdicionLd {
  n: number; fecha: string; anio: number; lugar: string; direccion: string;
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

export function websiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GLOCK Shows & Cypher',
    url: SITE,
    inLanguage: 'es-AR',
  };
}

export interface SessionLd { n: number; yt: string }

export function videosJsonLd(sessions: SessionLd[]): object[] {
  return sessions
    .filter((s) => s.yt.includes('watch?v='))
    .map((s) => ({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `GLOCK Cypher Session #${s.n}. Mar del Plata`,
      description: `Cypher Session #${s.n} de GLOCK Shows & Cypher: ronda cypher de rap en Mar del Plata.`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId(s.yt)}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${ytId(s.yt)}`,
      inLanguage: 'es-AR',
    }));
}
export function eventsJsonLd(ediciones: EdicionLd[]): object[] {
  return ediciones.map((e) => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `GLOCK #${e.n}. Shows & Cypher en Mar del Plata`,
    startDate: `${e.anio}-${e.fecha.split('/').reverse().join('-')}`,
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
