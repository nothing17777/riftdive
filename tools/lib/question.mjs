// Compact question builder. Output shape: {id, c: category, g: subtype, t: text, a: [[name, tier, ...aliases]]}
import { tierByMass, tierByFame } from './tiers.mjs';
export const norm = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
// 'a Assassin' -> 'an Assassin', 'a ADC' -> 'an ADC' (a capitalised vowel-initial word follows).
const article = text => text.replace(/\ba (?=[AEIOU])/g, 'an ');
export function build({ id, category, subtype, text, entries, mode = 'mass', min = 8, max = 150, pop = 50 }) {
  const seen = new Map();
  for (const e of entries) { const k = norm(e.name); if (k && !seen.has(k)) seen.set(k, e); } // drop duplicates after normalization
  const list = [...seen.values()];
  if (list.length < min || list.length > max) return null;
  // Mass mode blends how often an answer occurs in this question's scope with its overall prominence (glob).
  const weighted = mode === 'fame' ? list : list.map(e => (e.glob != null ? { ...e, count: Math.sqrt(e.count) * Math.sqrt(Math.max(1, e.glob)) } : e));
  const tiered = (mode === 'fame' ? tierByFame : tierByMass)(weighted);
  // Reject degenerate sets: need at least 3 distinct tiers to make the rarity game meaningful.
  if (new Set(tiered.map(e => e.tier)).size < 3) return null;
  return { id, c: category, g: subtype, t: article(text), p: Math.max(1, Math.min(100, Math.round(pop))), a: tiered.map(e => [e.name, e.tier, ...(e.aliases || [])]) };
}
