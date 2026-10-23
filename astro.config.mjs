// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const isDev = import.meta.env.DEV;

// https://astro.build/config
export default defineConfig({
  site: 'https://alvin-portfolio.heungyun.workers.dev',
base: '/',
  prefetch: { defaultStrategy: 'viewport' },
  vite: { plugins: [tailwindcss()] },
  // Authorizing remote images https://images.unsplash.com/
  image: { remotePatterns: [{ protocol: 'https' }] },
});
