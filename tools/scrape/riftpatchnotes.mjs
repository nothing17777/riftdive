// Ranked pick rates per champion from riftpatchnotes.com (its robots.txt allows this; one request).
// Usage: node tools/scrape/riftpatchnotes.mjs [saved.html] > tools/data/pickrates-champions.json
// With no argument it fetches https://www.riftpatchnotes.com/lol/winrates once, with an honest user agent.
import { readFileSync } from 'node:fs';
const UA = 'RiftDiveResearch/0.1 (League trivia data study; low-rate)';
const html = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : await (await fetch('https://www.riftpatchnotes.com/lol/winrates', { headers: { 'User-Agent': UA } })).text();
const re = /\\"slug\\":\\"([^\\]+)\\",\\"rank\\":\d+,\\"position\\":(\d+),\\"winRate\\":([\d.]+),\\"pickRate\\":([\d.]+),\\"banRate\\":([\d.]+),\\"games\\":(\d+)/g;
// The page stacks several views (regions/ranks); the first row per champion+role is the default view.
const seen = new Set(), byChamp = {}; let m;
while ((m = re.exec(html))) {
  const [, slug, pos, , , ban, games] = m, k = slug + '|' + pos;
  if (seen.has(k)) continue; seen.add(k);
  const c = (byChamp[slug] ||= { games: 0, ban: +ban });
  c.games += +games;
}
const total = Object.values(byChamp).reduce((s, c) => s + c.games, 0);
const out = Object.fromEntries(Object.entries(byChamp).map(([slug, c]) => [slug, { games: c.games, share: +(100 * c.games / total * 10).toFixed(3), banRate: c.ban }]));
console.log(JSON.stringify({ meta: { source: 'riftpatchnotes.com/lol/winrates (default view)', note: 'share = champion appearances as % of all games (x10 players/game => roughly pick rate)', fetched: new Date().toISOString().slice(0, 10) }, champions: out }, null, 1));
