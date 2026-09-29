import { getImage, logoImage } from '../assets';
import { SITE, SITE_NAME } from '../site';

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
  main?: string | null; mvp?: string | null; asistentes?: number; maps?: string;
  foto?: string; hora?: string; horaFin?: string; precio?: number; entradaGratis?: boolean;
  estado?: string;
}

const isoDate = (fecha: string, anio: number, hora?: string): string => {
  const [d, m] = fecha.split('/');
  return `${anio}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${hora ? `T${hora}:00-03:00` : ''}`;
};

/**
 * Un show que arranca 19:00 y termina 00:00 cruza la medianoche, asi que su
 * `endDate` va al dia siguiente. Sin este salto Google recibiria un `endDate`
 * anterior al `startDate`.
 */
const isoFin = (fecha: string, anio: number, hora: string | undefined, horaFin: string): string => {
  if (hora && horaFin <= hora) {
    const [d, m] = fecha.split('/');
    const dia = new Date(Date.UTC(anio, Number(m) - 1, Number(d) + 1));
    return `${dia.getUTCFullYear()}-${String(dia.getUTCMonth() + 1).padStart(2, '0')}-${String(dia.getUTCDate()).padStart(2, '0')}T${horaFin}:00-03:00`;
  }
  return isoDate(fecha, anio, horaFin);
};

const oferta = (e: EdicionLd): object | undefined => {
  if (typeof e.precio !== 'number' && !e.entradaGratis) return undefined;
  return {
    '@type': 'Offer',
    price: e.entradaGratis || e.precio === 0 ? '0' : String(e.precio),
    priceCurrency: 'ARS',
    availability: 'https://schema.org/InStock',
    url: `${SITE}/#ediciones`,
    validFrom: isoDate(e.fecha, e.anio, e.hora),
  };
};

const descripcion = (e: EdicionLd): string => {
  const partes = [
    `GLOCK #${e.n} en ${e.lugar}, ${e.direccion}.`,
    e.cypher.length ? `Cypher con ${e.cypher.join(', ')}.` : '',
    e.shows.length ? `Shows de ${e.shows.join(', ')}.` : '',
    e.mvp ? `MVP de la noche: ${e.mvp}.` : '',
  ];
  return partes.filter(Boolean).join(' ');
};

export function orgJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE,
    logo: `${SITE}${logoImage.src}`,
    description:
      'Productora de rap en Mar del Plata. Ronda cypher con MVP y shows de trap de artistas emergentes.',
    sameAs: [CONTACT.instagram, CONTACT.tiktok, CONTACT.youtube],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Mar del Plata',
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: '+54-223-529-8014',
        email: 'glock08000@gmail.com',
        availableLanguage: ['es-AR'],
        url: `${SITE}/#contacto`,
      },
    ],
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

export interface SessionLd {
  n: number;
  yt: string;
  subido?: string;
  duracion?: string;
}

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
      // `uploadDate` lo exige Google para rich results de video; `duration` es
      // recomendado. Solo se emiten si el contenido los declara, igual que
      // endDate en los shows: no se rellena con datos inventados.
      ...(s.subido ? { uploadDate: `${s.subido}T00:00:00-03:00` } : {}),
      ...(s.duracion ? { duration: s.duracion } : {}),
      inLanguage: 'es-AR',
    }));
}
export function eventsJsonLd(ediciones: EdicionLd[]): object[] {
  const eventos = ediciones.map((e) => {
    const foto = getImage(e.foto);
    const flyers = getImage(e.flyer);
    const imagen = foto ?? flyers;
    const start = isoDate(e.fecha, e.anio, e.hora);
    // No hay duracion confirmada en el contenido, asi que `endDate` solo se emite
    // si el show declara una hora de cierre explicita.
    const end = e.horaFin ? isoFin(e.fecha, e.anio, e.hora, e.horaFin) : undefined;
    const ofertaLd = oferta(e);
    return {
      '@context': 'https://schema.org',
      '@type': 'MusicEvent',
      name: `GLOCK #${e.n}. Shows & Cypher en Mar del Plata`,
      description: descripcion(e),
      inLanguage: 'es-AR',
      startDate: start,
      ...(end ? { endDate: end } : {}),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEvent',
      location: {
        '@type': 'Place',
        name: e.lugar,
        address: {
          '@type': 'PostalAddress',
          streetAddress: e.direccion,
          addressLocality: 'Mar del Plata',
          addressRegion: 'Buenos Aires',
          addressCountry: 'AR',
        },
        ...(e.maps ? { hasMap: e.maps } : {}),
      },
      organizer: { '@type': 'Organization', name: SITE_NAME, url: `${SITE}/#contacto` },
      performer: [...e.cypher, ...e.shows].map((p) => ({ '@type': 'MusicGroup', name: p })),
      ...(imagen ? { image: [`${SITE}${imagen.src}`] } : {}),
      url: `${SITE}/#ediciones`,
      sameAs: [e.postIg],
      ...(ofertaLd ? { offers: ofertaLd } : {}),
    };
  });

  return eventos;
}

export interface ProximaLd {
  n: number; estado: string; fecha?: string; anio?: number; hora?: string; horaFin?: string;
  lugar?: string; direccion?: string; maps?: string; precio?: number; entradaGratis?: boolean;
  cypher?: string[]; shows?: string[]; postIg?: string; entradasUrl?: string;
}

export function proximaJsonLd(p?: ProximaLd | null): object[] {
  if (!p?.fecha || !p.anio) return [];
  const e: EdicionLd = {
    n: p.n,
    fecha: p.fecha,
    anio: p.anio,
    lugar: p.lugar ?? 'Mar del Plata',
    direccion: p.direccion ?? 'Mar del Plata',
    flyer: '',
    postIg: p.postIg ?? `${SITE}/#ediciones`,
    shows: p.shows ?? [],
    cypher: p.cypher ?? [],
    hora: p.hora,
    horaFin: p.horaFin,
    precio: p.precio,
    entradaGratis: p.entradaGratis,
    maps: p.maps,
  };
  return eventsJsonLd([e]).slice(0, 1);
}
