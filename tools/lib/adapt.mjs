// Blend the generated tier prior with real accepted-answer counts.
// Prior: each answer gets a share from its current tier (rarer tier = smaller share). Posterior share =
// (PSEUDO * prior + n) / (PSEUDO + N), so ~40 real players weigh as much as the prior. Answers are then re-ranked
// by posterior share and handed the question's EXISTING tier multiset (most-picked -> lowest tier), which keeps
// "at least 3 tiers" and "has a Pentakill answer" intact.
export const PRIOR_WEIGHT = [16, 8, 4, 2, 1, 0.5]; // tier 0..5
export function retier(answers, counts, pseudo = 40) {
  const N = answers.reduce((s, a) => s + (counts[a[0]] || 0), 0);
  if (!N) return answers;
  const priorTotal = answers.reduce((s, a) => s + PRIOR_WEIGHT[a[1]], 0);
  const scored = answers.map((a, i) => ({ a, i, p: (pseudo * PRIOR_WEIGHT[a[1]] / priorTotal + (counts[a[0]] || 0)) / (pseudo + N) }));
  const tiers = answers.map(a => a[1]).sort((x, y) => x - y);
  const order = [...scored].sort((x, y) => y.p - x.p || x.a[1] - y.a[1] || x.i - y.i);
  const tierOf = new Map(order.map((s, k) => [s.i, tiers[k]]));
  return answers.map((a, i) => [a[0], tierOf.get(i), ...a.slice(2)]);
}
