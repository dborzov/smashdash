import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import yaml from 'js-yaml';

/** Turns `content/**.yaml` files into plain JS objects at build time. */
function yamlContent(): Plugin {
  return {
    name: 'smashdash-yaml',
    transform(code, id) {
      if (!/\.ya?ml$/.test(id)) return null;
      const data = yaml.load(code, { filename: id });
      return { code: `export default ${JSON.stringify(data)};`, map: null };
    },
  };
}

export default defineConfig({
  // Served from https://dborzov.github.io/smashdash/
  base: '/smashdash/',
  plugins: [preact(), yamlContent()],
  build: {
    rollupOptions: {
      // KaTeX is big and rarely changes: keep it in its own cacheable chunk.
      output: { manualChunks: { katex: ['katex'] } },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
