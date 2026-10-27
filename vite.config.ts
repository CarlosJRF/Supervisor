import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ command }) => ({
  plugins: [
    preact(),
    // sql-wasm.wasm solo hace falta en el navegador (desarrollo); en Android se usa SQLite nativo.
    ...(command === 'serve'
      ? [viteStaticCopy({ targets: [{ src: 'node_modules/sql.js/dist/sql-wasm.wasm', dest: 'assets' }] })]
      : []),
  ],
  build: { target: 'es2020', cssCodeSplit: false },
  test: { include: ['tests/**/*.test.ts'] },
}));
