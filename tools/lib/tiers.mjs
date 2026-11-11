// Tier assignment. Tier index: 0 Minion, 1 Big Brain, 2 Jungler, 3 Elite, 4 Elder, 5 Pentakill.
// Mass-based: an answer's tier reflects how much of the total "how often does this come up" probability
// mass sits above it. The most common answers are Minions; the long tail is Pentakill.
const MASS_CUTS = [0.40, 0.65, 0.80, 0.90, 0.97];
export function tierByMass(entries) {
  const sorted = [...entries].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const total = sorted.reduce((s, e) => s + e.count, 0);
  let before = 0, out = [], lastCount = null, lastTier = 0;
  for (const e of sorted) {
    let tier;
    if (e.count === lastCount) tier = lastTier; // ties share a tier
    else { tier = MASS_CUTS.findIndex(c => before / total < c); if (tier === -1) tier = 5; }
    out.push({ ...e, tier }); before += e.count; lastCount = e.count; lastTier = tier;
  }
  if (!out.some(e => e.tier === 5)) out[out.length - 1].tier = 5; // always offer a 100-point answer
  return out;
}
// Fame-based: tier from the answer's global fame percentile (0..1, 1 = most famous).
const FAME_CUTS = [0.85, 0.70, 0.50, 0.30, 0.12];
export function tierByFame(entries) {
  const out = entries.map(e => { const t = FAME_CUTS.findIndex(c => e.fame >= c); return { ...e, tier: t === -1 ? 5 : t }; });
  if (!out.some(e => e.tier === 5)) out.reduce((lo, e) => (e.fame < lo.fame ? e : lo)).tier = 5;
  return out;
}
