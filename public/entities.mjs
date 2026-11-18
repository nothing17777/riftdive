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

// Suggestions as you type: whole-name prefix, then word prefix, then substring; typos only if nothing else matches.
export function suggest(dict, input, limit = 6) {
  const q = normalize(input); if (q.length < 2) return [];
  const scored = [];
  for (let i = 0; i < dict.names.length; i++) {
    const n = dict.names[i]; let s = -1;
    if (n.key.startsWith(q)) s = 0; else if (n.words.some(w => w.startsWith(q))) s = 1; else if (q.length >= 3 && n.key.includes(q)) s = 2;
    if (s >= 0) scored.push([s, i, n.name]);
  }
  if (!scored.length && q.length >= 4) for (let i = 0; i < dict.names.length; i++) { const n = dict.names[i]; if (Math.abs(n.key.length - q.length) <= 1 && distance(q, n.key.slice(0, q.length + 1), 1) <= 1) scored.push([3, i, n.name]); }
  return scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, limit).map(x => x[2]);
}
