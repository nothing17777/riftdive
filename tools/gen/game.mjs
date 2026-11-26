// Champion, lore, skin and item questions from Meraki's static data export. One simple clause per question:
// the kind of thing a player knows from playing, not internal data such as ratings, base stats or release dates.
// Champion rarity comes from the blended familiarity prior (LLM rating + ranked pick volume);
// item rarity is a weak proxy built from how many items it builds into, its price and its nicknames.
import { build, norm } from '../lib/question.mjs';

const FACTION = {
  ionia: 'Ionia', shurima: 'Shurima', noxus: 'Noxus', freljord: 'the Freljord', 'mount-targon': 'Mount Targon', void: 'the Void', zaun: 'Zaun',
  piltover: 'Piltover', 'bandle-city': 'Bandle City', 'shadow-isles': 'the Shadow Isles', demacia: 'Demacia', bilgewater: 'Bilgewater', ixtal: 'Ixtal',
};
const CLASS = { FIGHTER: 'Fighter', TANK: 'Tank', ASSASSIN: 'Assassin', MAGE: 'Mage', MARKSMAN: 'Marksman', SUPPORT: 'Support' };
const LANE = { TOP: 'in the top lane', JUNGLE: 'in the jungle', MIDDLE: 'in the mid lane', BOTTOM: 'in the bot lane', SUPPORT: 'as a support' };
// Skin lines most players have heard of. A line covers every Meraki set that starts with its name.
const SKIN_LINES = ['Spirit Blossom', 'High Noon', 'Infernal', 'PROJECT', 'Pool Party', 'Blood Moon', 'Star Guardian', 'Arcade', 'Coven', 'Elderwood', 'Dark Star', 'Lunar Revel', 'Battle Academia',
  'Odyssey', 'Pulsefire', 'Cosmic', 'Hextech', 'Victorious', 'Winter Wonder', 'Space Groove', 'Soul Fighter', 'Cafe Cuties', 'Battlecast', 'Arcane', 'Nightbringer and Dawnbringer'];
const ALIAS = {
  'Miss Fortune': ['MF'], 'Master Yi': ['Yi'], 'Jarvan IV': ['J4', 'Jarvan'], 'Lee Sin': ['Lee'], 'Twisted Fate': ['TF'], "Cho'Gath": ['Cho'], "Kha'Zix": ['Kha'],
  "Kog'Maw": ['Kog'], "Vel'Koz": ['Vel'], "Rek'Sai": ['Rek'], "Bel'Veth": ['Bel'], 'Dr. Mundo': ['Mundo', 'Doctor Mundo'], 'Tahm Kench': ['Tahm'], 'Xin Zhao': ['Xin'],
  'Aurelion Sol': ['ASol'], 'Nunu & Willump': ['Nunu', 'Willump'], 'Renata Glasc': ['Renata'], Wukong: ['Monkey King'], Fiddlesticks: ['Fiddle'],
  Heimerdinger: ['Heimer', 'Donger'], Tryndamere: ['Trynd'], Cassiopeia: ['Cass'], Vladimir: ['Vlad'], Mordekaiser: ['Morde'], Volibear: ['Voli'], Gangplank: ['GP'],
  Evelynn: ['Eve'], Katarina: ['Kat'], "K'Sante": ['K Sante'], LeBlanc: ['Leblanc'],
};
const STAT = { abilityPower: 'Ability Power', attackDamage: 'Attack Damage', armor: 'Armor', magicResistance: 'Magic Resist', attackSpeed: 'Attack Speed', criticalStrikeChance: 'Critical Strike Chance', health: 'Health', mana: 'Mana',
  abilityHaste: 'Ability Haste', movespeed: 'Movement Speed', lifesteal: 'Life Steal', lethality: 'Lethality', magicPenetration: 'Magic Penetration', armorPenetration: 'Armor Penetration' };

// Stats an item only grants through its passive or active, which the base stats do not list. Reviewed by hand
// against the effect text; check this list when new items ship.
const ALL_ROUND = ['abilityPower', 'attackDamage', 'armor', 'magicResistance', 'attackSpeed', 'health'];
const GRANTED = {
  'Sword of Blossoming Dawn': ['attackSpeed'], 'Lich Bane': ['attackSpeed'], 'Ardent Censer': ['attackSpeed'], Bandlepipes: ['attackSpeed', 'movespeed'], "Sterak's Gage": ['attackDamage'],
  Terminus: ['armor', 'magicResistance', 'armorPenetration', 'magicPenetration'], "Demon King's Crown": ALL_ROUND, 'Twin Mask': ALL_ROUND, Dragonheart: ALL_ROUND,
  "Twilight's Edge": ['abilityPower', 'attackDamage', 'attackSpeed', 'abilityHaste'], 'Endless Hunger': ['abilityHaste'], 'Spear of Shojin': ['abilityHaste'], "Hemomancer's Helm": ['health'], Reverberation: ['health'],
  Puppeteer: ['attackSpeed', 'movespeed'], 'Innervating Locket': ['abilityPower', 'movespeed'], 'Protoplasm Harness': ['movespeed'], "Mejai's Soulstealer": ['movespeed'], Phage: ['movespeed'], 'Black Cleaver': ['movespeed'],
  'Experimental Hexplate': ['attackSpeed', 'movespeed'], 'Trinity Force': ['movespeed'], Stormrazor: ['movespeed'], 'Mercurial Scimitar': ['movespeed'], 'Solstice Sleigh': ['movespeed'], Stridebreaker: ['movespeed'],
  Opportunity: ['movespeed'], "Guardian's Dirk": ['movespeed'], 'Night Harvester': ['movespeed'], 'Kinkou Jitte': ['movespeed'], "Pyromancer's Cloak": ['movespeed'],
};
// Turret and champion-only upgrades that the data lists as items.
const NOT_ITEMS = id => (id >= 1500 && id < 1600) || [3400, 3901, 3902, 3903].includes(id);

export function generateGame({ champions, items, fame }) {
  const out = [];
  const list = Object.values(champions).filter(c => c.name);
  const fameOf = new Map(Object.entries(fame).map(([k, v]) => [norm(k), v]));
  const score = c => fameOf.get(norm(c.name)) ?? 20;
  const sorted = list.map(score).sort((a, b) => a - b);
  const pct = c => sorted.filter(s => s < score(c)).length / (sorted.length - 1); // 0..1 percentile of fame
  const ents = cs => cs.map(c => ({ name: c.name, fame: pct(c), aliases: ALIAS[c.name] || (c.name.includes(' ') ? [c.name.split(' ')[0]].filter(w => w.length >= 4) : []) }));
  const q = (family, id, category, text, f, pop = 55) => { const r = build({ id: `g.${id}`, category, subtype: family, text, entries: ents(list.filter(f)), mode: 'fame', min: 7, max: 500, pop }); if (r) out.push(r); };
  const has = (c, k, v) => (c[k] || []).includes(v);

  // ---- champions
  for (const [k, label] of Object.entries(CLASS)) q('champions by class', `class.${k}`, 'Champions', `Name a champion with the ${label} class tag`, c => has(c, 'roles', k), 70);
  for (const [k, label] of Object.entries(LANE)) q('champions by lane', `lane.${k}`, 'Champions', `Name a champion who is played ${label}`, c => has(c, 'positions', k), 70);
  for (const [k, label] of [['MELEE', 'melee'], ['RANGED', 'ranged']]) q('champions by range', `atk.${k}`, 'Champions', `Name a ${label} champion`, c => c.attackType === k, 40);
  for (const [k, label] of [['PHYSICAL_DAMAGE', 'physical'], ['MAGIC_DAMAGE', 'magic']]) q('champions by damage', `dmg.${k}`, 'Champions', `Name a champion who mostly deals ${label} damage`, c => c.adaptiveType === k, 40);
  q('champions by resource', 'res.ENERGY', 'Champions', 'Name a champion that uses Energy', c => c.resource === 'ENERGY');
  q('champions by resource', 'res.nomana', 'Champions', 'Name a champion that does not use Mana', c => c.resource !== 'MANA', 60);
  const letters = n => n.replace(/[^A-Za-z]/g, '').toLowerCase();
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') q('champions by first letter', `first.${ch}`, 'Champions', `Name a champion whose name starts with ${ch.toUpperCase()}`, c => letters(c.name)[0] === ch, 25);
  q('champions with two-word names', 'twowords', 'Champions', 'Name a champion whose name is more than one word', c => / /.test(c.name), 35);
  q('champions with apostrophes', 'apostrophe', 'Champions', 'Name a champion whose name contains an apostrophe', c => /'/.test(c.name), 35);
  // ---- lore
  for (const [k, label] of Object.entries(FACTION)) q('champions by region', `faction.${k}`, 'Lore', `Name a champion from ${label}`, c => c.faction === k, 65);
  // ---- skins
  const skins = c => (c.skins || []).filter(s => !s.isBase && s.name !== 'Original');
  for (const n of [10, 15]) q('champions by skin count', `skins.${n}`, 'Cosmetics', `Name a champion with at least ${n} skins (not counting chromas)`, c => skins(c).length >= n, 60);
  for (const r of ['Legendary', 'Ultimate']) q('champions by skin rarity', `rarity.${r}`, 'Cosmetics', `Name a champion who has ${r === 'Ultimate' ? 'an' : 'a'} ${r} skin`, c => skins(c).some(s => s.rarity === r), 55);
  for (const line of SKIN_LINES) q('champions by skin line', `skinline.${norm(line)}`, 'Cosmetics', `Name a champion with a ${line} skin`, c => skins(c).some(s => (s.set || []).some(x => x === line || x.startsWith(line + ' ') || x.startsWith(line + ':'))), 55);

  // ---- items
  const buy = Object.values(items).filter(i => i.shop?.purchasable && !i.removed && i.name && (i.shop?.prices?.total ?? 0) > 0);
  const byId = Object.fromEntries(Object.values(items).map(i => [i.id, i]));
  const prox = i => 2 * Math.log1p((i.buildsInto || []).length) + Math.log1p(i.shop.prices.total) / 2 + ((i.nicknames || []).length ? 1 : 0);
  const ps = buy.map(prox).sort((a, b) => a - b);
  const ipct = i => ps.filter(s => s < prox(i)).length / (ps.length - 1);
  // Everything a player can hold, including ARAM and Arena items (often listed without a price), upgraded forms
  // such as Muramana, and granted boots and consumables. Shop items come first so they keep their names and tiers.
  const held = [...buy, ...Object.values(items).filter(i => i.name && !i.removed && !NOT_ITEMS(i.id) && !buy.includes(i)
    && (i.shop?.purchasable || (i.shop?.prices?.total ?? 0) > 0 || (i.rank || []).some(r => r === 'BOOTS' || r === 'CONSUMABLE')))];
  const iq = (family, id, text, is, pop = 55) => { const r = build({ id: `i.${id}`, category: 'Game', subtype: family, text, entries: is.map(i => ({ name: i.name, fame: ipct(i), aliases: i.nicknames || [] })), mode: 'fame', min: 6, max: 500, pop }); if (r) out.push(r); };
  const gives = (i, k) => Object.values(i.stats?.[k] || {}).some(Boolean) || !!GRANTED[i.name]?.includes(k);
  for (const [k, label] of Object.entries(STAT)) iq('items by stat', `stat.${k}`, `Name an item that gives ${label}`, held.filter(i => gives(i, k)), 60);
  iq('items by price', 'cheap', 'Name an item that costs less than 1000 gold', buy.filter(i => i.shop.prices.total < 1000), 60);
  iq('items by price', 'expensive', 'Name an item that costs at least 3000 gold', buy.filter(i => i.shop.prices.total >= 3000));
  for (const [rk, label] of [['BOOTS', 'a pair of boots'], ['STARTER', 'a starter item'], ['LEGENDARY', 'a Legendary item'], ['CONSUMABLE', 'a consumable']]) iq('items by class', `rank.${rk}`, `Name ${label}`, held.filter(i => (i.rank || []).includes(rk)));
  const comps = {};
  for (const i of buy) for (const f of new Set(i.buildsFrom || [])) (comps[f] ||= []).push(i);
  for (const [id, is] of Object.entries(comps)) if (byId[id] && is.length >= 8 && (byId[id].shop?.prices?.total ?? 9999) <= 500) iq('items by component', `from.${id}`, `Name an item that builds from ${byId[id].name}`, is, 40);
  return { questions: out };
}
