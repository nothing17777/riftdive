// Extra champion / lore / cosmetics / music questions, all derived from Meraki's static export (plus a short curated music list).
// Called from generateGame() with its helpers. Skin-name questions use a proxy for familiarity (line size + age), so they are marked lc:1.
import { build } from '../lib/question.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEVEL = { 1: 'Low', 2: 'Moderate', 3: 'High' };
const RATE = { damage: 'damage', toughness: 'toughness', control: 'crowd control', mobility: 'mobility', utility: 'utility' };
const ROLES = { FIGHTER: 'Fighter', TANK: 'Tank', ASSASSIN: 'Assassin', MAGE: 'Mage', MARKSMAN: 'Marksman', SUPPORT: 'Support' };
const lbl = s => s[0] + s.slice(1).toLowerCase();

// Words that appear in champion bios; the generator keeps only those that fit 8..70 champions.
const BIO_PROPER = ['Runeterra', 'Noxus', 'Demacia', 'Freljord', 'Ionia', 'Piltover', 'Zaun', 'Shurima', 'Targon', 'Bilgewater', 'Bandle City', 'Void', 'Shadow Isles', 'Black Mist', 'Darkin', 'Vastaya', 'Yordle', 'Ixtal', 'Valoran', 'Summoner', 'Ascended', 'Rune Wars', 'Harrowing', 'Icathia', 'Piltover'];
const BIO_PLAIN = ['ocean', 'moon', 'sun', 'star', 'forest', 'snow', 'ice', 'fire', 'shadow', 'blood', 'dragon', 'spirit', 'ancient', 'king', 'queen', 'hunter', 'blade', 'storm', 'sea', 'desert', 'mountain', 'thief', 'curse', 'honor', 'machine', 'magic', 'tower', 'throne', 'ghost', 'beast', 'war', 'pirate', 'monster', 'revenge', 'duty', 'love', 'dream', 'night', 'poison', 'hammer', 'sword', 'axe', 'bow', 'wolf', 'bird', 'flower', 'music', 'gold', 'prison'];

const MUSIC = [
  // [question text, id, [[name, fame 0..1, ...aliases]]]  (titles only)
  ['Name a song by Pentakill', 'pentakill-songs', [
    ['Mortal Reminder', 0.7], ['Lightbringer', 0.65], ['Last Whisper', 0.5], ['Deathfire Grasp', 0.5], ['Smite and Ignite', 0.5], ['Grasp of the Undying', 0.4], ['The Cull', 0.3],
    ['Tear of the Goddess', 0.35], ['Thornmail', 0.3, 'Thorn Mail'], ['Infinity Edge', 0.25], ["Dead Man's Plate", 0.2, 'Dead Mans Plate'], ['The Bloodthirster', 0.2, 'Bloodthirster'],
    ['From Fire, Reborn', 0.15, 'From Fire Reborn'], ['Rapid Firecannon', 0.1], ['The Prophecy', 0.1], ['The Hex Core mk-2', 0.05, 'Hex Core', 'The Hex Core MK2'],
  ]],
  ['Name a League of Legends Worlds anthem', 'worlds-anthems', [
    ['Legends Never Die', 0.9], ['Warriors', 0.7], ['RISE', 0.7], ['Ignite', 0.5], ['Phoenix', 0.5], ['Burn It All Down', 0.4], ['Take Over', 0.55],
    ['Star Walkin\'', 0.4, 'Star Walkin', 'Starwalkin'], ['GODS', 0.4, 'Gods'], ['Worlds Collide', 0.2], ['Heavy Is the Crown', 0.45, 'Heavy is the Crown'],
  ]],
];

export function addExtra({ q, where, list, FACTION, push }) {
  // ---- Ratings from the client's champion select
  const R = (c, k) => c.attributeRatings?.[k];
  for (const lv of [1, 2, 3]) {
    q('champions by difficulty', `diff.${lv}`, 'Champions', `Name a champion with ${LEVEL[lv]} difficulty`, where(c => R(c, 'difficulty') === lv), 8, 90);
    for (const [r, rl] of Object.entries(ROLES)) q('champions by role and difficulty', `diff.${lv}.${r}`, 'Champions', `Name a ${rl} with ${LEVEL[lv]} difficulty`, where(c => R(c, 'difficulty') === lv && (c.roles || []).includes(r)), 8);
    for (const [k, kl] of Object.entries(RATE)) {
      q('champions by rating', `rate.${k}.${lv}`, 'Champions', `Name a champion with ${LEVEL[lv] === 'Moderate' ? 'a Moderate' : 'a ' + LEVEL[lv]} ${kl} rating`, where(c => R(c, k) === lv), 8, 90);
      for (const [r, rl] of Object.entries(ROLES)) q('champions by role and rating', `rate.${k}.${lv}.${r}`, 'Champions', `Name a ${rl} with a ${LEVEL[lv]} ${kl} rating`, where(c => R(c, k) === lv && (c.roles || []).includes(r)), 8);
    }
  }
  // ---- Base-stat sweeps: pick thresholds that leave roughly 10 / 25 / 50 champions
  const sweep = (family, id, label, get, dir, filter = () => true) => {
    const pool = list.filter(c => filter(c) && Number.isFinite(get(c)));
    const vals = [...new Set(pool.map(get))].sort((a, b) => a - b);
    const chosen = new Set();
    for (const target of [10, 25, 50]) {
      let best = null;
      for (const v of vals) {
        const n = pool.filter(c => (dir === 'most' ? get(c) <= v : get(c) >= v)).length;
        if (n < 8 || n > 70) continue;
        if (!best || Math.abs(n - target) < Math.abs(best.n - target)) best = { v, n };
      }
      if (best) chosen.add(best.v);
    }
    for (const v of chosen) q(family, `${id}.${dir}.${v}`, 'Game', `Name a champion with at ${dir === 'most' ? 'most' : 'least'} ${+v.toFixed(3)} ${label}`, pool.filter(c => (dir === 'most' ? get(c) <= v : get(c) >= v)), 8, 70);
  };
  const S = (k, f = 'flat') => c => c.stats?.[k]?.[f];
  for (const [key, label, g, filter] of [
    ['hp', 'base health', S('health')], ['hpreg', 'base health regeneration', S('healthRegen')], ['mana', 'base mana', S('mana'), c => (c.stats?.mana?.flat || 0) > 0],
    ['armor', 'base armor', S('armor')], ['mr', 'base magic resistance', S('magicResistance')], ['ad', 'base attack damage', S('attackDamage')], ['as', 'base attack speed', S('attackSpeed')],
    ['hplvl', 'health gained per level', S('health', 'perLevel')], ['armorlvl', 'armor gained per level', S('armor', 'perLevel')], ['adlvl', 'attack damage gained per level', S('attackDamage', 'perLevel')],
  ]) for (const dir of ['least', 'most']) sweep('champions by base stat', key, label, g, dir, filter);
  // ---- Store prices
  const rp = {};
  for (const c of list) if (c.price?.rp) (rp[c.price.rp] ||= []).push(c);
  for (const [p, cs] of Object.entries(rp)) q('champions by RP price', `rp.${p}`, 'Game', `Name a champion that costs ${p} RP`, cs, 8, 70);
  // ---- Release month, damage type, role x damage type, region x damage type
  const month = c => +(c.releaseDate || '').slice(5, 7);
  MONTHS.forEach((m, i) => q('champions by release month', `month.${i + 1}`, 'Lore', `Name a champion that was released in ${m} (any year)`, where(c => month(c) === i + 1), 8, 40));
  const DMG = [['PHYSICAL_DAMAGE', 'physical'], ['MAGIC_DAMAGE', 'magic']];
  for (const [r, rl] of Object.entries(ROLES)) for (const [d, dl] of DMG) q('champions by role and damage type', `role.${r}.${d}`, 'Champions', `Name a ${rl} who mostly deals ${dl} damage`, where(c => (c.roles || []).includes(r) && c.adaptiveType === d), 8);
  for (const [key, label] of Object.entries(FACTION)) for (const [d, dl] of DMG) q('champions by region and damage type', `faction.${key}.${d}`, 'Lore', `Name a champion from ${label} who mostly deals ${dl} damage`, where(c => c.faction === key && c.adaptiveType === d), 7);
  // ---- Lore: words in the official bios (used only as a filter; no bio text is reproduced)
  const bioHas = (c, w) => new RegExp(`\\b${w}\\b`, /^[A-Z]/.test(w) ? '' : 'i').test(c.lore || '');
  for (const w of new Set(BIO_PROPER)) q('champions by bio mention', `bio.${w}`, 'Lore', `Name a champion whose official bio mentions ${w}`, where(c => bioHas(c, w)), 8, 70);
  for (const w of BIO_PLAIN) q('champions by bio word', `bioword.${w}`, 'Lore', `Name a champion whose official bio uses the word "${w}"`, where(c => bioHas(c, w)), 8, 70);

  // ---- Cosmetics: skins by rarity, price, year
  const skins = c => (c.skins || []).filter(s => !s.isBase && s.name !== 'Original');
  const year = s => +(s.release || '0').slice(0, 4);
  for (const rar of ['Legendary', 'Mythic', 'Epic', 'Ultimate', 'Rare']) {
    q('champions by skin rarity', `skinrar.${rar}`, 'Cosmetics', `Name a champion who has a ${rar} skin`, where(c => skins(c).some(s => s.rarity === rar)), 7, 150);
    for (const [r, rl] of Object.entries(ROLES)) q('champions by skin rarity and role', `skinrar.${rar}.${r}`, 'Cosmetics', `Name a ${rl} who has a ${rar} skin`, where(c => (c.roles || []).includes(r) && skins(c).some(s => s.rarity === rar)), 8);
  }
  for (const cost of [520, 750, 975, 1350, 1820]) {
    q('champions by skin price', `skincost.${cost}`, 'Cosmetics', `Name a champion who has a skin that costs ${cost} RP`, where(c => skins(c).some(s => s.cost === cost)), 8, 150);
    for (const [r, rl] of Object.entries(ROLES)) q('champions by skin price and role', `skincost.${cost}.${r}`, 'Cosmetics', `Name a ${rl} who has a skin that costs ${cost} RP`, where(c => (c.roles || []).includes(r) && skins(c).some(s => s.cost === cost)), 8);
  }
  for (let y = 2009; y <= 2025; y++) for (const [r, rl] of Object.entries(ROLES)) q('champions by skin year and role', `skinyear.${y}.${r}`, 'Cosmetics', `Name a ${rl} who received a new skin in ${y}`, where(c => (c.roles || []).includes(r) && skins(c).some(s => year(s) === y)), 8);

  // ---- Cosmetics: skin lines / skin names for one champion (proxy tiers, lc:1)
  const lineSize = new Map(), lineFirst = new Map();
  for (const c of list) for (const s of skins(c)) for (const set of s.set || []) if (set && set !== 'Legacy') {
    (lineSize.get(set) || lineSize.set(set, new Set()).get(set)).add(c.name);
    lineFirst.set(set, Math.min(lineFirst.get(set) ?? 9999, year(s) || 9999));
  }
  const rank = (m, f) => { const v = [...m.keys()].map(k => [k, f(k)]).sort((a, b) => a[1] - b[1]); const r = new Map(); v.forEach(([k], i) => r.set(k, i / Math.max(1, v.length - 1))); return r; };
  const sizePct = rank(lineSize, k => lineSize.get(k).size);
  const custom = (family, id, category, text, entries, min, max, pop) => {
    const r = build({ id: `g.${id}`, category, subtype: family, text, entries, mode: 'fame', min, max, pop });
    if (r) { r.lc = 1; push(family, r); }
  };
  for (const c of list) {
    const mine = skins(c);
    const lines = new Set(); mine.forEach(s => (s.set || []).forEach(l => l && l !== 'Legacy' && lines.add(l)));
    custom('skin lines per champion', `lines.${c.key}`, 'Cosmetics', `Name a skin line that includes a ${c.name} skin`, [...lines].map(l => ({ name: l, fame: sizePct.get(l) ?? 0 })), 7, 70, 30);
    const ageOf = s => 1 - (Math.min(2025, Math.max(2009, year(s) || 2025)) - 2009) / 16;
    custom('skins per champion', `skins.${c.key}`, 'Cosmetics', `Name a skin that ${c.name} has`, mine.map(s => {
      const line = (s.set || []).find(l => l && l !== 'Legacy');
      return { name: `${s.name} ${c.name}`, fame: 0.5 * (line ? sizePct.get(line) ?? 0 : 0.2) + 0.5 * ageOf(s), aliases: [s.name] };
    }), 8, 70, 35);
  }

  // ---- Music (titles only; tiers are rough familiarity estimates)
  for (const [text, id, rows] of MUSIC) {
    const r = build({ id: `m.${id}`, category: 'Music', subtype: 'curated music', text, entries: rows.map(([name, fame, ...aliases]) => ({ name, fame, aliases })), mode: 'fame', min: 7, max: 150, pop: 45 });
    if (r) { r.lc = 1; push('curated music', r); }
  }
}
