import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { shrimp, fish, squid, angler } from './pixel-art.mjs';
import { documents } from '../src/docs.mjs';
import { homePage } from '../src/html.mjs';

await mkdir('public/assets',{recursive:true});
const sprite=shrimp();
for(const[name,svg]of Object.entries({'krill':sprite,'krill-gold':shrimp('gold'),'evil':shrimp('evil'),'schooler':fish(),'tooclever':fish(true),'rare':squid(),'deepcut':angler()}))await writeFile('public/assets/'+name+'.svg',svg);
await copyFile('node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff2','public/assets/vt323-latin-400-normal.woff2');
await copyFile('node_modules/@fontsource/vt323/LICENSE','public/assets/VT323-LICENSE.txt');
for(const[size,name]of [[32,'favicon.png'],[180,'apple-touch-icon.png'],[256,'icon.png']]){
  const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size/6}" fill="#010a13"/></svg>`);
  await sharp(bg).composite([{input:await sharp(Buffer.from(sprite)).resize(Math.floor(size*.8),Math.floor(size*.8),{kernel:'nearest'}).png().toBuffer(),gravity:'centre'}]).png().toFile('public/assets/'+name);
}
const og=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#1e3a5f"/><stop offset="1" stop-color="#0a1c33"/></linearGradient><linearGradient id="sea" x2="0" y2="1"><stop stop-color="#0b3b57"/><stop offset="1" stop-color="#010a13"/></linearGradient></defs><rect width="1200" height="630" fill="#010a13"/><path fill="url(#sky)" d="M0 0h1200v330H0z"/><path fill="url(#sea)" d="M0 320q150-12 300 0t300 0t300 0t300 0v310H0z"/><text x="598" y="213" text-anchor="middle" font-family="monospace" font-size="96" font-weight="bold" letter-spacing="6" fill="#c8aa6e">RIFT DIVE</text><text x="605" y="206" text-anchor="middle" font-family="monospace" font-size="96" font-weight="bold" letter-spacing="6" fill="#0ac8b9">RIFT DIVE</text><text x="601" y="210" text-anchor="middle" font-family="monospace" font-size="96" font-weight="bold" letter-spacing="6" fill="#f0e6d2">RIFT DIVE</text><text x="600" y="275" text-anchor="middle" font-family="monospace" font-size="23" letter-spacing="7" fill="#0ac8b9">THE DAILY LEAGUE OF LEGENDS DIVE</text><text x="600" y="427" text-anchor="middle" font-family="monospace" font-size="25" fill="#d5e7f4">7 prompts · 25 seconds · think rare, dive deeper</text><rect x="300" y="480" width="600" height="67" fill="#0a1c33" stroke="#c8aa6e" stroke-width="3"/><text x="600" y="524" text-anchor="middle" font-family="monospace" font-size="27" letter-spacing="5" fill="#f0e6d2">▼ BEGIN DESCENT ▼</text><text x="600" y="595" text-anchor="middle" font-family="monospace" font-size="17" letter-spacing="3" fill="#7d93b8">unofficial fan game · not endorsed by Riot Games</text></svg>`;
await sharp(Buffer.from(og)).png().toFile('public/assets/og.png');
// Build snapshots document drift; HTTP routes use the same renderers and configuration.
await mkdir('docs/generated',{recursive:true});
for(const[path,body]of Object.entries(documents()))await writeFile('docs/generated/'+path.slice(1),body);
console.log('Built pixel assets, font and documents.');
