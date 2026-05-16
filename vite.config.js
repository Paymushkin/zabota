import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const INCLUDE_RE = /<!--\s*@include\s+(.+?)\s*-->/g;

function resolveIncludes(html) {
  return html.replace(INCLUDE_RE, (_, includePath) => {
    const file = path.resolve(root, includePath.trim());
    const content = fs.readFileSync(file, 'utf-8');
    return resolveIncludes(content);
  });
}

function htmlIncludes() {
  return {
    name: 'html-includes',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return resolveIncludes(html);
      },
    },
    handleHotUpdate({ file, server }) {
      if (
        file.includes(`${path.sep}src${path.sep}sections${path.sep}`) ||
        file.includes(`${path.sep}src${path.sep}partials${path.sep}`) ||
        file.includes(`${path.sep}src${path.sep}data${path.sep}`)
      ) {
        server.ws.send({ type: 'full-reload', path: '*' });
        return [];
      }
    },
  };
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [htmlIncludes()],
  publicDir: 'public',
  build: {
    cssMinify: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
