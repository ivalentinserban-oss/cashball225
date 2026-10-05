/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const DATA_FILE = path.resolve(import.meta.dirname, 'data/draws.json');

/** Serves data/draws.json in dev and copies it into the build, so the app always reads the committed data file. */
function drawsData(): Plugin {
  return {
    name: 'draws-data',
    configureServer(server) {
      server.middlewares.use('/data/draws.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(DATA_FILE));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'data/draws.json', source: readFileSync(DATA_FILE) });
    },
  };
}

export default defineConfig({
  // GitHub Pages serves project sites from /<repo>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    drawsData(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cash Ball 225 Odds & Stats',
        short_name: 'Cash Ball 225',
        description: 'Odds, prize math and five years of Kentucky Cash Ball 225 draw history.',
        theme_color: '#1c5cab',
        background_color: '#0d0d0d',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and the draw data so everything works offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The exhaustive ticket check and the chi-square calibration run take a few seconds.
    testTimeout: 60_000,
  },
});
