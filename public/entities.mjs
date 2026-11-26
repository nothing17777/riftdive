// Shared dictionary of every known name (champions, players, teams, items, regions...). Used by the game to
// (1) tell "real name, but it doesn't fit this prompt" apart from "not recognised", and
// (2) power suggestions. The dictionary is global, so suggesting from it never reveals a prompt's answers.
import { normalize, distance } from './rules.mjs';

export function buildDictionary(data) {
  const byKey = new Map(), names = [];
  for (const [display, ...aliases] of data.e) {
    const key = normalize(display); if (!key) continue;
    if (!byKey.has(key)) { byKey.set(key, display); names.push({ name: display, key, words: display.toLowerCase().split(/[\s'’.\-&]+/).filter(Boolean).map(normalize) }); }
    for (const a of aliases) { const k = normalize(a); if (k && !byKey.has(k)) byKey.set(k, display); }
  }
  return { byKey, names };
}

const allowance = len => (len < 4 ? 0 : len < 8 ? 1 : 2);

// Why did this guess not score? 'wrong' = a known name that isn't valid here; 'unknown' = not recognised.
export function explainMiss(dict, input) {
  const key = normalize(input);
  if (!key) return { reason: 'blank' };
  const exact = dict.byKey.get(key);
  if (exact) return { reason: 'wrong', name: exact };
  const limit = allowance(key.length);
  if (limit) {
    let best = null, bestD = limit + 1;
    for (const n of dict.names) { if (Math.abs(n.key.length - key.length) > limit) continue; const d = distance(key, n.key, limit); if (d < bestD) { best = n.name; bestD = d; } }
    if (best) return { reason: 'wrong', name: best, typo: true };
  }
  return { reason: 'unknown' };
}

export function missMessage(raw, e) {
  if (e.reason === 'wrong') return e.typo ? `“${raw}” → “${e.name}” doesn't fit. try another.` : `“${e.name}” doesn't fit. try another.`;
  if (e.reason === 'generic') return `“${raw}”: no echo. try again`;
  if (e.reason === 'unknown') return `didn't recognise “${raw}”. check the spelling?`;
  return 'type an answer first.';
}

// Suggestions only finish a name you have mostly typed: they help with spelling without listing answers for you.
// A name is offered once the input starts it (or one of its words) and covers most of its length.
const TYPED_SHARE = 0.6;
export function suggest(dict, input, limit = 3) {
  const q = normalize(input); if (q.length < 3) return [];
  return dict.names
    .filter(n => q.length >= Math.ceil(n.key.length * TYPED_SHARE) && (n.key.startsWith(q) || n.words.some(w => w.startsWith(q))))
    .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) || a.key.length - b.key.length || a.name.localeCompare(b.name)) // never by how often a name is an answer
    .slice(0, limit).map(n => n.name);
}
