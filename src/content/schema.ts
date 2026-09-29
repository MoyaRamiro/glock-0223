import { z } from 'astro/zod';
import { esImagenConocida } from '../assets/keys.ts';

const localImage = z
  .string()
  .refine(esImagenConocida, { message: 'la imagen no esta registrada en src/assets/keys.ts' });

const fecha = z.string().regex(/^\d{2}\/\d{2}$/, 'formato dd/mm');

const youtube = z.url().refine((u) => /youtube\.com\/watch\?v=|youtu\.be\//.test(u), {
  message: 'no parece una URL de YouTube',
});

const edicion = z
  .object({
    n: z.number().int().positive(),
    fecha,
    anio: z.number().int().min(2020).max(2100),
    lugar: z.string().min(1),
    direccion: z.string().min(1),
    maps: z.url(),
    cypher: z.array(z.string().min(1)),
    shows: z.array(z.string().min(1)),
    extra: z.string(),
    main: z.string().nullable(),
    asistentes: z.number().int().nonnegative(),
    mvp: z.string().nullable(),
    highlight: z.array(z.string()).default([]),
    destacado: z.string(),
    flyer: z.string(),
    flyerAlt: z.string().min(1),
    foto: localImage.optional(),
    fotoAlt: z.string().min(1).optional(),
    postIg: z.url(),
    hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    precio: z.number().nonnegative().optional(),
    entradaGratis: z.boolean().optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (e.horaFin && !e.hora) {
      ctx.addIssue({ code: 'custom', path: ['horaFin'], message: 'horaFin requiere hora' });
    }
    if (e.hora && e.horaFin && e.horaFin <= e.hora) {
      ctx.addIssue({ code: 'custom', path: ['horaFin'], message: 'horaFin debe ser posterior a hora' });
    }
    if (e.entradaGratis && e.precio) {
      ctx.addIssue({ code: 'custom', path: ['precio'], message: 'no puede haber precio y entradaGratis a la vez' });
    }
  });

export const glockSchema = z
  .object({
    contacto: z
      .object({
        whatsapp: z.url(),
        telefonoLabel: z.string().min(1),
        instagram: z.url(),
        tiktok: z.url(),
        youtube: z.url(),
        email: z.email(),
      })
      .strict(),
    ediciones: z.array(edicion).min(1),
    artistas: z
      .array(
        z
          .object({
            nombre: z.string().min(1),
            ig: z.url().optional(),
            tiktok: z.url().optional(),
            yt: z.url().optional(),
          })
          .strict(),
      )
      .min(1),
    sessions: z
      .array(
        z
          .object({
            n: z.number().int().positive(),
            yt: z.string(),
            estado: z.enum(['publicada', 'editandose']),
          })
          .strict()
          .superRefine((s, ctx) => {
            if (s.estado === 'publicada' && !s.yt) {
              ctx.addIssue({ code: 'custom', path: ['yt'], message: 'una session publicada necesita su URL de YouTube' });
            }
            if (s.estado === 'publicada') {
              const r = youtube.safeParse(s.yt);
              if (!r.success) ctx.addIssue({ code: 'custom', path: ['yt'], message: 'URL de YouTube invalida' });
            } else if (s.yt) {
              ctx.addIssue({ code: 'custom', path: ['yt'], message: 'una session sin publicar no deberia tener URL de YouTube' });
            }
          }),
      )
      .min(1),
    songwars: z.array(
      z
        .object({
          vol: z.number().int().positive(),
          fecha,
          hora: z.string().regex(/^\d{2}:\d{2}$/),
          anio: z.number().int().min(2020).max(2100),
          plataforma: z.string().min(1),
          url: z.url(),
          formato: z.string().min(1),
          premio: z.string().min(1),
          ganador: z.string().nullable(),
          flyer: localImage,
          flyerAlt: z.string().min(1),
          post: z.url(),
        })
        .strict(),
    ),
    sponsors: z.array(
      z
        .object({
          nombre: z.string().min(1),
          logo: localImage.optional(),
        })
        .strict(),
    ),
    proxima: z
      .object({
        n: z.number().int().positive(),
        estado: z.string().min(1),
        entradasUrl: z.string(),
        fecha: fecha.optional(),
        anio: z.number().int().optional(),
        hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        horaFin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        lugar: z.string().optional(),
        direccion: z.string().optional(),
        cypher: z.array(z.string()).optional(),
        shows: z.array(z.string()).optional(),
        postIg: z.url().optional(),
        precio: z.number().nonnegative().optional(),
        entradaGratis: z.boolean().optional(),
      })
      .strict(),
    faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) }).strict()).min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ns = new Set<number>();
    const fechas = new Set<string>();
    for (const [i, e] of data.ediciones.entries()) {
      if (ns.has(e.n)) ctx.addIssue({ code: 'custom', path: ['ediciones', i, 'n'], message: `n duplicado: ${e.n}` });
      ns.add(e.n);
      const k = `${e.anio}-${e.fecha}`;
      if (fechas.has(k)) ctx.addIssue({ code: 'custom', path: ['ediciones', i, 'fecha'], message: `fecha duplicada: ${e.fecha}/${e.anio}` });
      fechas.add(k);
      for (const [j, h] of e.highlight.entries()) {
        if (!e.cypher.includes(h) && !e.shows.includes(h)) {
          ctx.addIssue({ code: 'custom', path: ['ediciones', i, 'highlight', j], message: `"${h}" no esta en cypher ni en shows` });
        }
      }
    }
    for (const [i, a] of data.artistas.entries()) {
      if (!a.ig && !a.tiktok && !a.yt) {
        ctx.addIssue({ code: 'custom', path: ['artistas', i], message: 'el artista no tiene ningun link' });
      }
    }
  });

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*\s.]/g, '');

/**
 * `main` y `mvp` se editan con abreviaturas ("TOBI" para "J TOBI", "CERO*" para un
 * invitado especial que no lista en `shows`), asi que no se exigen como members exactos.
 * Se validan en `data.ts` con coincidencia laxa y se reportan como aviso, no como error.
 */
export function referenciasSueltas(data: Glock): string[] {
  const avisos: string[] = [];
  for (const e of data.ediciones) {
    for (const [campo, valor] of [
      ['main', e.main],
      ['mvp', e.mvp],
    ] as const) {
      if (!valor) continue;
      const n = norm(valor);
      const actos = [...e.cypher, ...e.shows].map(norm);
      if (!actos.some((a) => a === n || a.includes(n) || n.includes(a))) {
        avisos.push(`ediciones[${e.n}].${campo} = "${valor}" no coincide con ningun acto del cartel`);
      }
    }
  }
  return avisos;
}

export type Glock = z.infer<typeof glockSchema>;
