// @ts-check
// TODO: Add a link-checking build step (e.g. astro-links-checker or a post-build
// broken-link audit) to CI so dead internal/external links are caught before deploy.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://mcp-tool-shop-org.github.io',
  base: '/websketch-ir',
  integrations: [
    starlight({
      title: 'WebSketch IR',
      description: 'WebSketch IR handbook',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/mcp-tool-shop-org/websketch-ir' },
      ],
      sidebar: [
        {
          label: 'Handbook',
          autogenerate: { directory: 'handbook' },
        },
      ],
      customCss: ['./src/styles/starlight-custom.css'],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
