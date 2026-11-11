// Usage: node tools/run-pro.mjs <rawDir> [out.json]
import { writeFile } from 'node:fs/promises';
import { loadRows, generatePro } from './gen/pro.mjs';
const [raw, out] = process.argv.slice(2);
const t0 = Date.now();
const data = await loadRows(raw);
console.log(`loaded ${data.players.length} player rows, ${data.teams.length} team rows, years ${data.years.join(',')} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
const { questions, stat } = generatePro(data);
console.log(Object.entries(stat).map(([k, v]) => `${String(v).padStart(5)}  ${k}`).join('\n'));
console.log('TOTAL pro play questions:', questions.length);
const ids = new Set(questions.map(q => q.id)); console.log('unique ids:', ids.size);
if (out) await writeFile(out, JSON.stringify(questions));
