// Usage: node tools/build-pool.mjs <oeRawDir> <merakiDir> [outDir=public/q]
// Generates every question, merges the curated bank, de-duplicates, and writes sharded JSON.
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { loadRows, generatePro } from './gen/pro.mjs';
import { generateGame } from './gen/game.mjs';
import { POOL, tierFor } from '../src/content/bank.mjs';
import { shardOf, SHARDS } from '../src/content/pool.mjs';
import { norm } from './lib/question.mjs';

const [raw, meraki, out = 'public/q'] = process.argv.slice(2);
const fame = JSON.parse(await readFile('tools/data/fame-champions-blended.json', 'utf8')).scores;
const j = async f => JSON.parse(await readFile(`${meraki}/${f}`, 'utf8'));

const pro = generatePro(await loadRows(raw), { fame });
const game = generateGame({ champions: await j('meraki-champs.json'), items: await j('meraki-items.json'), fame });
// Curated prompts (hand-written): kept where no generated question covers the same wording.
const TIER = { plankton: 0, tooclever: 1, schooler: 2, rare: 3, deepcut: 4, krillion: 5 };
const curated = POOL.map(p => {
  const a = p.answers.map(([name, f, ...aliases]) => [name, TIER[tierFor(f)], ...aliases]);
  if (!a.some(x => x[1] === 5)) a.reduce((lo, x, i) => (p.answers[i][1] < p.answers[a.indexOf(lo)][1] ? x : lo), a[0])[1] = 5;
  return { id: 'h.' + p.id, c: p.category, g: 'curated', t: p.text, p: 70, a };
});

const all = [], ids = new Set(), texts = new Set(), dropped = { dupId: 0, dupText: 0 };
for (const q of [...pro.questions, ...game.questions, ...curated]) {
  const tk = norm(q.t);
  if (ids.has(q.id)) { dropped.dupId++; continue; }
  if (texts.has(tk)) { dropped.dupText++; continue; }
  ids.add(q.id); texts.add(tk); all.push(q);
}
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
const shards = Array.from({ length: SHARDS }, () => ({}));
for (const q of all) shards[shardOf(q.id)][q.id] = { c: q.c, t: q.t, a: q.a };
await Promise.all(shards.map((s, i) => writeFile(`${out}/s${i}.json`, JSON.stringify(s))));
const cats = {}, fam = {};
for (const q of all) { cats[q.c] = (cats[q.c] || 0) + 1; fam[`${q.c} / ${q.g}`] = (fam[`${q.c} / ${q.g}`] || 0) + 1; }
await writeFile(`${out}/index.json`, JSON.stringify({ v: 1, n: all.length, cats, q: all.map(q => [q.id, q.c, q.g, q.p, q.lc ? 1 : 0]) }));
const report = { total: all.length, categories: cats, dropped, proYears: pro.years, families: fam, lowConfidence: all.filter(q => q.lc).length };
await mkdir('docs', { recursive: true }); await writeFile('docs/question-bank-report.json', JSON.stringify(report, null, 1) + '\n');
console.log('TOTAL questions:', all.length, '| dropped:', JSON.stringify(dropped), '| low-confidence (items):', report.lowConfidence);
console.log('by category:', JSON.stringify(cats));
