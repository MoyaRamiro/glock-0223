import raw from './content/glock.json';
import { glockSchema, referenciasSueltas } from './content/schema';

export const data = glockSchema.parse(raw);
export type { Glock } from './content/schema';

for (const aviso of referenciasSueltas(data)) {
  console.warn(`[contenido] ${aviso}`);
}
