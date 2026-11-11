// Blend LLM familiarity ratings with ranked pick volume into one champion familiarity prior (0-100).
// familiarity = 0.7 * LLM rating + 0.3 * pick-volume percentile; for champions released in the last
// 12 months pick volume is ignored (launch hype inflates it). Real player answers will update this later.
import { readFileSync, writeFileSync } from 'node:fs';
const [meraki, out] = process.argv.slice(2);
const llm = JSON.parse(readFileSync('tools/data/fame-champions.json', 'utf8')).scores;
const picks = JSON.parse(readFileSync('tools/data/pickrates-champions.json', 'utf8')).champions;
const mer = Object.values(JSON.parse(readFileSync(meraki, 'utf8')));
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const bySlug = Object.fromEntries(Object.entries(picks).map(([k, v]) => [norm(k), v]));
const rows = mer.map(c => ({ name: c.name, released: c.releaseDate, llm: llm[c.name], games: (bySlug[norm(c.key)] || bySlug[norm(c.name)] || { games: 0 }).games }));
const order = [...rows].sort((a, b) => a.games - b.games);
order.forEach((r, i) => (r.pickPct = Math.round(100 * i / (order.length - 1))));
const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
const scores = {}, notes = [];
for (const r of rows) {
  const recent = new Date(r.released) > cutoff;
  scores[r.name] = Math.round(recent ? r.llm : 0.7 * r.llm + 0.3 * r.pickPct);
  if (recent) notes.push(r.name);
}
writeFileSync(out, JSON.stringify({ meta: { method: '0.7*LLM rating + 0.3*ranked pick-volume percentile; pick volume ignored for champions released in the last 12 months', recentlyReleasedLLMOnly: notes, sources: ['tools/data/fame-champions.json', 'tools/data/pickrates-champions.json'] }, scores }, null, 1));
console.log('wrote', Object.keys(scores).length, 'scores; LLM-only (recent):', notes.join(', '));
console.log('top 8:', Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, s]) => n + ' ' + s).join(', '));
console.log('bottom 8:', Object.entries(scores).sort((a, b) => a[1] - b[1]).slice(0, 8).map(([n, s]) => n + ' ' + s).join(', '));
