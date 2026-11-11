// Runtime question pool: a small index plus sharded question files (public/q/). Used by the Worker and the static build.
// Daily selection is deterministic per date, weighted by each question's popularity score, with category quotas.
import { promptsFor as curatedFor, dayNumber } from './bank.mjs';
export { dayNumber };

export const TIER_KEYS = ['plankton', 'tooclever', 'schooler', 'rare', 'deepcut', 'krillion'];
export const SHARDS = 64;
// Weights favour variety; thin categories (few questions) are down-weighted so they do not repeat constantly.
const WEIGHTS = { 'Pro Play': 0.30, Champions: 0.22, Game: 0.14, Lore: 0.14, Cosmetics: 0.12, Music: 0.02, Culture: 0.02 };

const hash = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const shardOf = id => hash(id) % SHARDS;
const rng = seed => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32; };

// index.q rows: [id, category, subtype, popularity, lowConfidence]
export function pickIds(index, date, count = 7) {
  const rand = rng(hash('rift-dive:' + date));
  const byCat = {};
  for (const row of index.q) (byCat[row[1]] ||= []).push(row);
  const cats = Object.keys(byCat).filter(c => byCat[c].length);
  const picked = [], usedSub = new Set(), perCat = {};
  for (let slot = 0; slot < count; slot++) {
    const open = cats.filter(c => c !== picked.at(-1)?.[1] && (perCat[c] || 0) < 2);
    const pool = open.length ? open : cats;
    const wsum = pool.reduce((s, c) => s + (WEIGHTS[c] ?? 0.05), 0);
    let r = rand() * wsum, cat = pool[0];
    for (const c of pool) { r -= WEIGHTS[c] ?? 0.05; if (r <= 0) { cat = c; break; } }
    const cand = byCat[cat].filter(row => !usedSub.has(row[2]) && !picked.includes(row));
    const rows = cand.length ? cand : byCat[cat].filter(row => !picked.includes(row));
    const w = rows.map(row => (row[3] ** 2 + 1) * (row[4] ? 0.3 : 1));
    let t = rand() * w.reduce((s, x) => s + x, 0), chosen = rows[0];
    for (let i = 0; i < rows.length; i++) { t -= w[i]; if (t <= 0) { chosen = rows[i]; break; } }
    picked.push(chosen); usedSub.add(chosen[2]); perCat[cat] = (perCat[cat] || 0) + 1;
  }
  return picked.map(r => r[0]);
}

const cache = new Map();
export const resetPoolCache = () => cache.clear(); // for tests
const load = async (path, getJson) => { if (!cache.has(path)) cache.set(path, getJson(path)); try { return await cache.get(path); } catch (e) { cache.delete(path); throw e; } };

export async function puzzleFromPool(date, getJson) {
  try {
    const index = await load('q/index.json', getJson);
    const ids = pickIds(index, date);
    const shards = await Promise.all([...new Set(ids.map(shardOf))].map(n => load(`q/s${n}.json`, getJson).then(d => [n, d])));
    const byShard = Object.fromEntries(shards);
    const prompts = ids.map(id => {
      const q = byShard[shardOf(id)][id];
      if (!q) throw new Error('Question missing from shard: ' + id);
      return { id, category: q.c, text: q.t, answers: q.a.map(([answer, tier, ...aliases]) => ({ answer, tier: TIER_KEYS[tier], aliases })) };
    });
    return { date, dayNumber: dayNumber(date), source: 'Rift Dive question bank', prompts };
  } catch (e) {
    console.warn('Question pool unavailable, using the curated bank:', e.message);
    return { date, dayNumber: dayNumber(date), source: 'Rift Dive curated bank', prompts: curatedFor(date) };
  }
}
