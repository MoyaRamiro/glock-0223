import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://glock-0223.vercel.app',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
