// Champion, lore, item and skin-line questions generated from Meraki's static data export.
// Champion rarity comes from the blended familiarity prior (LLM rating + ranked pick volume);
// item rarity is a weak proxy (marked low confidence, lc:1).
import { build, norm } from '../lib/question.mjs';

const FACTION = {
  ionia: 'Ionia', shurima: 'Shurima', noxus: 'Noxus', freljord: 'the Freljord', 'mount-targon': 'Mount Targon', void: 'the Void', zaun: 'Zaun',
  piltover: 'Piltover', 'bandle-city': 'Bandle City', 'shadow-isles': 'the Shadow Isles', demacia: 'Demacia', bilgewater: 'Bilgewater', ixtal: 'Ixtal',
};
const ROLE = { FIGHTER: 'Fighter', TANK: 'Tank', ASSASSIN: 'Assassin', MAGE: 'Mage', MARKSMAN: 'Marksman', SUPPORT: 'Support', JUGGERNAUT: 'Juggernaut', DIVER: 'Diver',
  SKIRMISHER: 'Skirmisher', BURST: 'Burst', BATTLEMAGE: 'Battlemage', ENCHANTER: 'Enchanter', CATCHER: 'Catcher', ARTILLERY: 'Artillery', VANGUARD: 'Vanguard', WARDEN: 'Warden', SPECIALIST: 'Specialist' };
const POSITION = { TOP: 'Top lane', JUNGLE: 'Jungle', MIDDLE: 'Mid lane', BOTTOM: 'Bot lane', SUPPORT: 'Support' };
const RESOURCE = { MANA: 'Mana', ENERGY: 'Energy', NONE: 'no resource', FURY: 'Fury', RAGE: 'Rage', HEALTH: 'Health', FLOW: 'Flow' };
const ALIAS = {
  'Miss Fortune': ['MF'], 'Master Yi': ['Yi'], 'Jarvan IV': ['J4', 'Jarvan'], 'Lee Sin': ['Lee'], 'Twisted Fate': ['TF'], "Cho'Gath": ['Cho'], "Kha'Zix": ['Kha'],
  "Kog'Maw": ['Kog'], "Vel'Koz": ['Vel'], "Rek'Sai": ['Rek'], "Bel'Veth": ['Bel'], 'Dr. Mundo': ['Mundo', 'Doctor Mundo'], 'Tahm Kench': ['Tahm'], 'Xin Zhao': ['Xin'],
  'Aurelion Sol': ['ASol'], 'Nunu & Willump': ['Nunu', 'Willump'], 'Renata Glasc': ['Renata'], Wukong: ['Monkey King'], Fiddlesticks: ['Fiddle'],
  Heimerdinger: ['Heimer', 'Donger'], Tryndamere: ['Trynd'], Cassiopeia: ['Cass'], Vladimir: ['Vlad'], Mordekaiser: ['Morde'], Volibear: ['Voli'], Gangplank: ['GP'],
  Evelynn: ['Eve'], Katarina: ['Kat'], "K'Sante": ['K Sante'], LeBlanc: ['Leblanc'],
};
const LETTERS = s => s.replace(/[^A-Za-z]/g, '');
const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'to', 'in', 'on', 'for', 'with', 'from']);

export function generateGame({ champions, items, fame }) {
  const out = [], stat = {};
  const push = (family, q) => { if (q) { out.push(q); stat[family] = (stat[family] || 0) + 1; } };
  const list = Object.values(champions).filter(c => c.name);
  const fameOf = new Map(Object.entries(fame).map(([k, v]) => [norm(k), v]));
  const score = c => fameOf.get(norm(c.name)) ?? 20;
  const sortedScores = list.map(score).sort((a, b) => a - b);
  const pct = c => sortedScores.filter(s => s < score(c)).length / (sortedScores.length - 1); // 0..1 percentile of fame
  const ents = cs => cs.map(c => ({ name: c.name, fame: pct(c), aliases: [...(ALIAS[c.name] || []), ...(c.name.includes(' ') && !ALIAS[c.name] ? [c.name.split(' ')[0]].filter(w => w.length >= 4) : [])] }));
  const avgFame = cs => cs.reduce((s, c) => s + score(c), 0) / cs.length;
  // Popularity of a question for daily selection: how famous the champions in the answer set are.
  const q = (family, id, category, text, cs, min = 8, max = 60, lo = 0) => push(family, build({ id: `g.${id}`, category, subtype: family, text, entries: ents(cs), mode: 'fame', min: Math.max(min, lo), max, pop: Math.round(Math.min(100, avgFame(cs) + 10)) }));

  const where = f => list.filter(f);
  const byYear = c => +(c.releaseDate || '0').slice(0, 4);

  // ---- Lore: regions
  for (const [key, label] of Object.entries(FACTION)) {
    const cs = where(c => c.faction === key);
    q('champions by region', `faction.${key}`, 'Lore', `Name a champion from ${label}`, cs, 7);
    for (const [r, rl] of Object.entries(ROLE)) q('champions by region and role', `faction.${key}.${r}`, 'Lore', `Name a ${rl} from ${label}`, where(c => c.faction === key && (c.roles || []).includes(r)), 6);
    for (const [a, al] of [['MELEE', 'melee'], ['RANGED', 'ranged']]) q('champions by region and range', `faction.${key}.${a}`, 'Lore', `Name a ${al} champion from ${label}`, where(c => c.faction === key && c.attackType === a), 7);
  }
  // ---- Roles, lanes
  for (const [r, rl] of Object.entries(ROLE)) {
    q('champions by role', `role.${r}`, 'Champions', `Name a ${rl} champion`, where(c => (c.roles || []).includes(r)), 8);
    for (const [p, pl] of Object.entries(POSITION)) q('champions by role and lane', `role.${r}.${p}`, 'Champions', `Name a ${rl} champion who is played in the ${pl}`, where(c => (c.roles || []).includes(r) && (c.positions || []).includes(p)), 8);
    for (const [a, al] of [['MELEE', 'melee'], ['RANGED', 'ranged']]) q('champions by role and range', `role.${r}.${a}`, 'Champions', `Name a ${al} ${rl}`, where(c => (c.roles || []).includes(r) && c.attackType === a), 8);
  }
  for (const [p, pl] of Object.entries(POSITION)) {
    for (const [a, al] of [['MELEE', 'melee'], ['RANGED', 'ranged']]) q('champions by lane and range', `pos.${p}.${a}`, 'Champions', `Name a ${al} champion who is played in the ${pl}`, where(c => (c.positions || []).includes(p) && c.attackType === a), 8);
    for (const [d, dl] of [['PHYSICAL_DAMAGE', 'physical'], ['MAGIC_DAMAGE', 'magic']]) q('champions by lane and damage', `pos.${p}.${d}`, 'Champions', `Name a champion who is played in the ${pl} and mostly deals ${dl} damage`, where(c => (c.positions || []).includes(p) && c.adaptiveType === d), 8);
  }
  // ---- Release dates
  for (let y = 2009; y <= 2025; y++) q('champions by release year', `year.${y}`, 'Lore', `Name a champion that was released in ${y}`, where(c => byYear(c) === y), 7);
  for (const [a, b] of [[2009, 2010], [2011, 2012], [2013, 2014], [2014, 2015], [2016, 2017], [2018, 2019], [2020, 2021], [2022, 2023], [2023, 2025], [2020, 2025]])
    q('champions by release window', `years.${a}-${b}`, 'Lore', `Name a champion that was released between ${a} and ${b}`, where(c => byYear(c) >= a && byYear(c) <= b), 8);
  for (const [r, rl] of Object.entries(ROLE)) for (const [a, b] of [[2009, 2011], [2012, 2016], [2017, 2025]]) q('champions by role and era', `role.${r}.era.${a}`, 'Champions', `Name a ${rl} that was released between ${a} and ${b}`, where(c => (c.roles || []).includes(r) && byYear(c) >= a && byYear(c) <= b), 8);
  // ---- Resources and stats
  for (const [k, label] of Object.entries(RESOURCE)) q('champions by resource', `res.${k}`, 'Game', k === 'NONE' ? 'Name a champion that has no resource bar' : `Name a champion that uses ${label}`, where(c => c.resource === k), 5, 70);
  q('champions without mana', 'res.nomana', 'Game', 'Name a champion that does not use Mana', where(c => c.resource !== 'MANA'), 8);
  for (const [t, label] of [[500, '500'], [550, '550'], [575, '575'], [600, '600']]) q('champions by attack range', `range.${t}`, 'Game', `Name a champion with a base attack range of at least ${label}`, where(c => (c.stats?.attackRange?.flat || 0) >= t), 8);
  for (const t of [345, 350, 355, 360]) q('champions by move speed', `ms.${t}`, 'Game', `Name a champion with a base movement speed of at least ${t}`, where(c => (c.stats?.movespeed?.flat || 0) >= t), 8);
  for (const [t, lo] of [[3150, 'costs 3150 Blue Essence'], [4800, 'costs 4800 Blue Essence'], [6300, 'costs 6300 Blue Essence'], [450, 'costs 450 Blue Essence'], [1350, 'costs 1350 Blue Essence']]) q('champions by price', `price.${t}`, 'Game', `Name a champion that ${lo}`, where(c => c.price?.blueEssence === t), 8);
  // ---- Names, titles
  const L = n => LETTERS(n).toLowerCase();
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
    q('champions by first letter', `first.${ch}`, 'Champions', `Name a champion whose name starts with ${ch.toUpperCase()}`, where(c => L(c.name)[0] === ch), 7);
    q('champions by last letter', `last.${ch}`, 'Champions', `Name a champion whose name ends with ${ch.toUpperCase()}`, where(c => L(c.name).slice(-1) === ch), 7);
    q('champions containing a letter', `has.${ch}`, 'Champions', `Name a champion whose name contains the letter ${ch.toUpperCase()}`, where(c => L(c.name).includes(ch)), 8, 60);
  }
  for (let n = 3; n <= 12; n++) q('champions by name length', `len.${n}`, 'Champions', `Name a champion whose name has exactly ${n} letters`, where(c => L(c.name).length === n), 7);
  q('champions with two-word names', 'twowords', 'Champions', 'Name a champion whose name is more than one word', where(c => /[ ]/.test(c.name)), 8);
  q('champions with apostrophes', 'apostrophe', 'Champions', 'Name a champion whose name contains an apostrophe', where(c => /'/.test(c.name)), 8);
  const words = {};
  for (const c of list) for (const w of new Set((c.title || '').toLowerCase().match(/[a-z]+/g) || [])) if (!STOP.has(w) && w.length > 2) (words[w] ||= []).push(c);
  for (const [w, cs] of Object.entries(words)) q('champions by title word', `title.${w}`, 'Champions', `Name a champion whose title includes "${w[0].toUpperCase() + w.slice(1)}"`, cs, 7);
  q('champions with a "the" title', 'title.the', 'Champions', 'Name a champion whose title starts with "the"', where(c => /^the /i.test(c.title || '')), 8, 70);
  // ---- Ability names
  const abil = {};
  for (const c of list) {
    const names = Object.values(c.abilities || {}).flat().map(a => a?.name || '');
    for (const w of new Set(names.join(' ').toLowerCase().match(/[a-z]{4,}/g) || [])) if (!STOP.has(w)) (abil[w] ||= []).push(c);
  }
  for (const [w, cs] of Object.entries(abil)) q('champions by ability name', `ability.${w}`, 'Champions', `Name a champion that has an ability with "${w[0].toUpperCase() + w.slice(1)}" in its name`, cs, 8);

  // ---- Skin lines (Cosmetics)
  const lines = {};
  for (const c of list) for (const s of c.skins || []) for (const set of s.set || []) if (set && set !== 'Legacy') (lines[set] ||= new Map()).set(c.name, c);
  for (const [set, m] of Object.entries(lines)) {
    const cs = [...m.values()];
    q('champions by skin line', `skinline.${norm(set)}`, 'Cosmetics', `Name a champion who has a skin in the ${set} line`, cs, 8, 80);
    for (const [r, rl] of [['MAGE', 'Mage'], ['ASSASSIN', 'Assassin'], ['FIGHTER', 'Fighter'], ['SUPPORT', 'Support'], ['MARKSMAN', 'Marksman'], ['TANK', 'Tank']]) q('skin line by role', `skinline.${norm(set)}.${r}`, 'Cosmetics', `Name a ${rl} who has a skin in the ${set} line`, cs.filter(c => (c.roles || []).includes(r)), 8);
  }

  // ---- Items (low confidence: proxy rarity)
  const buy = Object.values(items).filter(i => i.shop?.purchasable && !i.removed && i.name && (i.shop?.prices?.total ?? 0) > 0);
  const byId = Object.fromEntries(Object.values(items).map(i => [i.id, i]));
  const prox = i => 2 * Math.log1p((i.buildsInto || []).length) + Math.log1p(i.shop.prices.total) / 2 + ((i.nicknames || []).length ? 1 : 0);
  const sorted = buy.map(prox).sort((a, b) => a - b);
  const ipct = i => sorted.filter(s => s < prox(i)).length / (sorted.length - 1);
  const STAT = { abilityPower: 'Ability Power', attackDamage: 'Attack Damage', armor: 'Armor', magicResistance: 'Magic Resist', attackSpeed: 'Attack Speed', criticalStrikeChance: 'Critical Strike Chance', health: 'Health', mana: 'Mana',
    abilityHaste: 'Ability Haste', movespeed: 'Movement Speed', lifesteal: 'Life Steal', omnivamp: 'Omnivamp', magicPenetration: 'Magic Penetration', lethality: 'Lethality', armorPenetration: 'Armor Penetration', healthRegen: 'Health Regen', manaRegen: 'Mana Regen', tenacity: 'Tenacity' };
  const iq = (family, id, text, is, min = 6, max = 70) => { const e = is.map(i => ({ name: i.name, fame: ipct(i), aliases: i.nicknames || [] })); const r = build({ id: `i.${id}`, category: 'Game', subtype: family, text, entries: e, mode: 'fame', min, max, pop: 25 }); if (r) { r.lc = 1; out.push(r); stat[family] = (stat[family] || 0) + 1; } };
  for (const [k, label] of Object.entries(STAT)) {
    iq('items by stat', `stat.${k}`, `Name an item that gives ${label}`, buy.filter(i => i.stats?.[k] && (i.stats[k].flat || i.stats[k].percent)), 8);
    for (const rk of ['LEGENDARY', 'EPIC']) iq('items by stat and tier', `stat.${k}.${rk}`, `Name a ${rk === 'LEGENDARY' ? 'Legendary' : 'Epic'} item that gives ${label}`, buy.filter(i => (i.rank || []).includes(rk) && i.stats?.[k] && (i.stats[k].flat || i.stats[k].percent)), 8);
  }
  const comps = {}; for (const i of buy) for (const f of i.buildsFrom || []) (comps[f] ||= []).push(i);
  for (const [cid, is] of Object.entries(comps)) { const c = byId[cid]; if (c) iq('items by component', `from.${cid}`, `Name an item that builds from ${c.name}`, is, 6); }
  const prices = {}; for (const i of buy) (prices[i.shop.prices.total] ||= []).push(i);
  for (const [p, is] of Object.entries(prices)) iq('items by price', `price.${p}`, `Name an item that costs ${p} gold`, is, 6);
  for (const [rk, label] of [['BOOTS', 'a Boots item'], ['STARTER', 'a starter item'], ['EPIC', 'an Epic item'], ['BASIC', 'a Basic item'], ['CONSUMABLE', 'a consumable']]) iq('items by class', `rank.${rk}`, `Name ${label}`, buy.filter(i => (i.rank || []).includes(rk)), 8);
  return { questions: out, stat };
}
