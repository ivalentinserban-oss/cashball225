// Generates the favicon and PWA icons in public/ from one SVG. Run with `npm run icons`.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const icon = ({ rounded }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#ffd66b"/>
      <stop offset="0.6" stop-color="#eda100"/>
      <stop offset="1" stop-color="#c98500"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#1c5cab"/>
  <circle cx="256" cy="256" r="150" fill="url(#g)"/>
  <circle cx="256" cy="256" r="104" fill="#fff8e6"/>
  <text x="256" y="292" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="100" fill="#0b0b0b">225</text>
</svg>`;

const rounded = icon({ rounded: true });
const square = icon({ rounded: false });

await writeFile('public/favicon.svg', rounded);
await sharp(Buffer.from(rounded)).resize(192, 192).png().toFile('public/pwa-192.png');
await sharp(Buffer.from(rounded)).resize(512, 512).png().toFile('public/pwa-512.png');
// Maskable and Apple icons are full-bleed; the platform applies its own mask.
await sharp(Buffer.from(square)).resize(512, 512).png().toFile('public/pwa-maskable-512.png');
await sharp(Buffer.from(square)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('Icons written to public/');
