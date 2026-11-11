// Compact question builder. Output shape: {id, c: category, g: subtype, t: text, a: [[name, tier, ...aliases]]}
import { tierByMass, tierByFame } from './tiers.mjs';
export const norm = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
export function build({ id, category, subtype, text, entries, mode = 'mass', min = 8, max = 150 }) {
  const seen = new Map();
  for (const e of entries) { const k = norm(e.name); if (k && !seen.has(k)) seen.set(k, e); } // drop duplicates after normalization
  const list = [...seen.values()];
  if (list.length < min || list.length > max) return null;
  const tiered = (mode === 'fame' ? tierByFame : tierByMass)(list);
  // Reject degenerate sets: need at least 3 distinct tiers to make the rarity game meaningful.
  if (new Set(tiered.map(e => e.tier)).size < 3) return null;
  return { id, c: category, g: subtype, t: text, a: tiered.map(e => [e.name, e.tier, ...(e.aliases || [])]) };
}
