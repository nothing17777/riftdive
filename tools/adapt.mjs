// Usage: node tools/adapt.mjs <counts.json> [qdir=public/q] [--dry]
// counts.json: rows {qid, answer, n} -- e.g. from
//   npx wrangler d1 execute riftdive --remote --json --command "SELECT qid,answer,n FROM answer_counts" > counts.json
// (the wrangler envelope [{results:[...]}] is accepted). Re-tiers the shards in place; the index and dictionary are unchanged.
import { readFile, writeFile } from 'node:fs/promises';
import { retier } from './lib/adapt.mjs';
const [file, dir = 'public/q'] = process.argv.slice(2).filter(a => !a.startsWith('--')), dry = process.argv.includes('--dry');
let rows = JSON.parse(await readFile(file, 'utf8'));
if (rows[0]?.results) rows = rows.flatMap(r => r.results);
const byQ = new Map();
for (const { qid, answer, n } of rows) (byQ.get(qid) || byQ.set(qid, {}).get(qid))[answer] = n;
let changed = 0, touched = 0;
for (let s = 0; s < 64; s++) {
  const path = `${dir}/s${s}.json`, shard = JSON.parse(await readFile(path, 'utf8')); let dirty = false;
  for (const [id, q] of Object.entries(shard)) {
    const counts = byQ.get(id); if (!counts) continue; touched++;
    const next = retier(q.a, counts);
    if (next.some((a, i) => a[1] !== q.a[i][1])) { q.a = next; dirty = true; changed++; }
  }
  if (dirty && !dry) await writeFile(path, JSON.stringify(shard));
}
console.log(`${touched} questions had real counts; ${changed} re-tiered${dry ? ' (dry run)' : ''}`);
