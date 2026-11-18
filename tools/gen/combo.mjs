// Combinatorial question families: intersect 1-3 attribute clauses over champions, skins and items.
// Every question is a real set from Meraki's data, kept only if it has 7..MAX answers, every clause is necessary
// (dropping any clause changes the set), and no two questions share the same answer set.
import { build, norm } from '../lib/question.mjs';

const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const MAIN_ROLES = { FIGHTER: 'Fighter', TANK: 'Tank', ASSASSIN: 'Assassin', MAGE: 'Mage', MARKSMAN: 'Marksman', SUPPORT: 'Support' };
const LANES = { TOP: 'Top lane', JUNGLE: 'Jungle', MIDDLE: 'Mid lane', BOTTOM: 'Bot lane', SUPPORT: 'Support position' };
const LV = { 1: 'Low', 2: 'Moderate', 3: 'High' };
const RATING = { damage: 'damage', toughness: 'toughness', control: 'crowd control', mobility: 'mobility', utility: 'utility' };
const FACTION = { ionia: 'Ionia', shurima: 'Shurima', noxus: 'Noxus', freljord: 'the Freljord', 'mount-targon': 'Mount Targon', void: 'the Void', zaun: 'Zaun', piltover: 'Piltover', 'bandle-city': 'Bandle City', 'shadow-isles': 'the Shadow Isles', demacia: 'Demacia', bilgewater: 'Bilgewater', ixtal: 'Ixtal' };
const KIT = {
  stun: ['a stun', /\bstun/], slow: ['a slow', /\bslow/], knockup: ['a knock up', /knock(s|ed|ing)? (\w+ )?up|airborne/], root: ['a root', /\broot|\bsnare/], silence: ['a silence', /\bsilenc/],
  taunt: ['a taunt', /\btaunt/], fear: ['a fear', /\bfear|\bflee/], charm: ['a charm', /\bcharm/], suppress: ['a suppression', /\bsuppress/], shield: ['a shield', /\bshield/],
  heal: ['healing', /\bheal/], stealth: ['stealth', /stealth|invisib|camouflage/], dash: ['a dash', /\bdash/], blink: ['a blink or teleport', /\bblink|\bteleport/],
  execute: ['an execute', /\bexecut/], truedmg: ['true damage', /true damage/], knockback: ['a knockback', /knock(s|ed|ing)? (\w+ )?back|\bpush/], pull: ['a pull', /\bpull|\bdrag/],
  blind: ['a blind', /\bblind/], revive: ['a revive', /revive|resurrect|zombie/], reveal: ['a reveal', /\breveal/], terrain: ['terrain', /\bterrain|\bwall\b/], cleanse: ['a cleanse', /\bcleanse|removes? all crowd control/],
  channel: ['a channel', /\bchannel/], recast: ['a recast', /\brecast|\bcast again|\bre-cast/], stacks: ['stacks', /\bstacks?\b/], mark: ['a mark', /\bmark(ed|s)?\b/], toggle: ['a toggle', /\btoggle/], stance: ['a stance or form', /\bstance|\bform\b/],
  charges: ['charges', /\bcharges?\b/], execthreshold: ['a health threshold', /below \d+% (of )?(their |his |her |its )?(max(imum)? )?health|missing health/], slowimmune: ['unstoppable or immune effects', /unstoppable|immune|invulnerab|untargetable/], pet: ['a pet or minion', /\bpet\b|\bminions?\b|\bturret/], lifesteal: ['lifesteal or omnivamp', /life ?steal|omnivamp|spell vamp/], mrshred: ['penetration or shred', /penetrat|shred|reduces? (the )?(armor|magic resist)/], ghost: ['ghosting or movement speed', /ghost|movement speed/], recall: ['a recall or return', /\breturns? to\b|\brecall/], decay: ['decay or death', /\bdeath\b|\bdie\b|\bdies\b/],
  global: ['a global range', /\bglobal|anywhere on the map|across the map/], summon: ['a summon', /\bsummon|\bclone/], transform: ['a transformation', /\btransform/],
};

// ---- engine -------------------------------------------------------------------------------------------------
const bit = i => 1n << BigInt(i);
const pop = m => m.toString(2).replace(/0/g, '').length;
function enumerate(count, dims, { maxClauses, min, max }) {
  const vals = [];
  dims.forEach((d, di) => d.values.forEach(v => { let mask = 0n; for (let i = 0; i < count; i++) if (v.test(i)) mask |= bit(i); const n = pop(mask); if (n >= min) vals.push({ dim: di, v, mask, n }); }));
  const found = new Map(); // answer-set signature -> {clauses, mask}
  const full = (1n << BigInt(count)) - 1n;
  const consider = (cl, mask, subMasks) => {
    const n = pop(mask); if (n < min || n > max) return;
    if (subMasks.some(s => s === mask)) return; // some clause is redundant
    const sig = mask.toString(36); if (!found.has(sig)) found.set(sig, { cl, mask });
  };
  for (const a of vals) consider([a], a.mask, a.mask === full ? [full] : []);
  if (maxClauses >= 2) for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
    const a = vals[i], b = vals[j]; if (a.dim === b.dim) continue; const m = a.mask & b.mask; if (m === 0n) continue;
    consider([a, b], m, [a.mask, b.mask]);
  }
  if (maxClauses >= 3) for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
    const a = vals[i], b = vals[j]; if (a.dim === b.dim) continue; const ab = a.mask & b.mask; if (pop(ab) < min) continue;
    for (let k = j + 1; k < vals.length; k++) {
      const c = vals[k]; if (c.dim === a.dim || c.dim === b.dim) continue;
      const m = ab & c.mask; if (pop(m) < min) continue;
      consider([a, b, c], m, [a.mask & b.mask, a.mask & c.mask, b.mask & c.mask]);
    }
  }
  return [...found.values()].map(({ cl, mask }) => ({ cl: cl.sort((x, y) => x.dim - y.dim), idx: [...Array(count).keys()].filter(i => mask & bit(i)) }));
}
const joinClauses = parts => (parts.length < 2 ? parts.join('') : parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1));

// ---- champions -------------------------------------------------------------------------------------------------
function champDims(list) {
  const year = c => +(c.releaseDate || '0').slice(0, 4);
  const ab = c => Object.values(c.abilities || {}).flat().filter(Boolean);
  const text = list.map(c => ab(c).map(a => (a.blurb || '') + ' ' + (a.effects || []).map(e => e.description).join(' ')).join(' ').toLowerCase());
  const R = c => c.abilities?.R?.[0] || {}, Q = c => c.abilities?.Q?.[0] || {};
  const pct = (get, q, hi) => { const v = list.map(get).filter(Number.isFinite).sort((a, b) => a - b); const cut = v[Math.floor(v.length * (hi ? 1 - q : q))]; return hi ? c => get(c) >= cut : c => get(c) <= cut; };
  const stat = (k, f = 'flat') => c => c.stats?.[k]?.[f];
  const D = [];
  const dim = (id, values) => D.push({ id, values });
  dim('role', Object.entries(MAIN_ROLES).map(([k, l]) => ({ key: 'role.' + k, role: l, test: i => (list[i].roles || []).includes(k) })));
  dim('range', [['MELEE', 'melee'], ['RANGED', 'ranged']].map(([k, l]) => ({ key: 'atk.' + k, adj: l, test: i => list[i].attackType === k })));
  dim('lane', Object.entries(LANES).map(([k, l]) => ({ key: 'lane.' + k, clause: `who is played in the ${l}`, test: i => (list[i].positions || []).includes(k) })));
  dim('faction', Object.entries(FACTION).map(([k, l]) => ({ key: 'fac.' + k, clause: `from ${l}`, test: i => list[i].faction === k })));
  dim('damage', [['PHYSICAL_DAMAGE', 'physical'], ['MAGIC_DAMAGE', 'magic']].map(([k, l]) => ({ key: 'dmg.' + k, clause: `who mostly deals ${l} damage`, test: i => list[i].adaptiveType === k })));
  dim('resource', [['MANA', 'uses Mana'], ['ENERGY', 'uses Energy'], ['NONE', 'has no resource bar']].map(([k, l]) => ({ key: 'res.' + k, clause: `who ${l}`, test: i => list[i].resource === k })));
  dim('difficulty', [1, 2, 3].map(l => ({ key: 'diff.' + l, clause: `with ${LV[l]} difficulty`, test: i => list[i].attributeRatings?.difficulty === l })));
  for (const [k, kl] of Object.entries(RATING)) dim('rate.' + k, [1, 3].map(l => ({ key: `rate.${k}.${l}`, clause: `with a ${LV[l]} ${kl} rating`, test: i => list[i].attributeRatings?.[k] === l })));
  const eras = [[2009, 2010], [2011, 2012], [2013, 2014], [2015, 2016], [2017, 2018], [2019, 2020], [2021, 2022], [2023, 2025], [2009, 2011], [2012, 2015], [2016, 2019], [2020, 2025]];
  dim('release', [...Array.from({ length: 17 }, (_, k) => [2009 + k, 2009 + k]), ...eras].map(([a, b]) => ({ key: `rel.${a}.${b}`, clause: a === b ? `released in ${a}` : `released between ${a} and ${b}`, test: i => year(list[i]) >= a && year(list[i]) <= b })));
  for (const [k, label, g, ok] of [['hp', 'health', stat('health')], ['hpreg', 'health regeneration', stat('healthRegen')], ['mana', 'mana', stat('mana'), c => (c.stats?.mana?.flat || 0) > 0], ['armor', 'armor', stat('armor')], ['mr', 'magic resistance', stat('magicResistance')],
    ['ad', 'attack damage', stat('attackDamage')], ['as', 'attack speed', stat('attackSpeed')], ['ms', 'movement speed', stat('movespeed')], ['range', 'attack range', stat('attackRange')], ['hplvl', 'health growth', stat('health', 'perLevel')]]) {
    const pool = list.filter(c => !ok || ok(c)), poolIdx = new Set(pool.map(c => list.indexOf(c)));
    const hiT = pct(g, 0.3, true), loT = pct(g, 0.3, false);
    dim('stat.' + k, [['high', hiT], ['low', loT]].map(([w, t]) => ({ key: `stat.${k}.${w}`, clause: `with ${w} base ${label}`, test: i => poolIdx.has(i) && t(list[i]) })));
  }
  for (const [k, [label, re]] of Object.entries(KIT)) dim('kit.' + k, [{ key: 'kit.' + k, clause: `whose abilities mention ${label}`, test: i => re.test(text[i]) }]);
  dim('ult', [['auto', 'is auto-targeted'], ['location', 'is aimed at a location'], ['direction', 'is a directional skillshot'], ['unit', 'targets a unit']].map(([k, l]) => ({ key: 'ult.' + k, clause: `whose ultimate ${l}`, test: i => new RegExp(k, 'i').test(R(list[i]).targeting || '') })));
  dim('ultdmg', [['MAGIC_DAMAGE', 'magic'], ['PHYSICAL_DAMAGE', 'physical'], ['TRUE_DAMAGE', 'true']].map(([k, l]) => ({ key: 'ultdmg.' + k, clause: `whose ultimate deals ${l} damage`, test: i => R(list[i]).damageType === k })));
  dim('ultally', [{ key: 'ultally', clause: 'whose ultimate can affect allies', test: i => /ally|allies/i.test(R(list[i]).affects || '') }]);
  dim('qshape', [['direction', 'is a directional skillshot'], ['unit', 'targets a unit'], ['auto', 'is auto-targeted']].map(([k, l]) => ({ key: 'q.' + k, clause: `whose Q ${l}`, test: i => new RegExp(k, 'i').test(Q(list[i]).targeting || '') })));
  const cd = (c, slot) => c.abilities?.[slot]?.[0]?.cooldown?.modifiers?.[0]?.values?.[0];
  dim('ultcd', [['at most 80 seconds', v => v <= 80], ['at least 120 seconds', v => v >= 120]].map(([l, f], k) => ({ key: 'ultcd.' + k, clause: `whose ultimate has a base cooldown of ${l}`, test: i => Number.isFinite(cd(list[i], 'R')) && f(cd(list[i], 'R')) })));
  dim('qcd', [['at most 6 seconds', v => v <= 6], ['at least 10 seconds', v => v >= 10]].map(([l, f], k) => ({ key: 'qcd.' + k, clause: `whose Q has a base cooldown of ${l}`, test: i => Number.isFinite(cd(list[i], 'Q')) && f(cd(list[i], 'Q')) })));
  dim('skins', [[12, 'at least 12 skins'], [18, 'at least 18 skins']].map(([n, l]) => ({ key: 'skins.' + n, clause: `with ${l}`, test: i => (list[i].skins || []).length > n })));
  dim('skinfew', [{ key: 'skins.few', clause: 'with at most 6 skins', test: i => (list[i].skins || []).length <= 6 }]);
  dim('price', [450, 790, 880, 585, 260].map(p => ({ key: 'rp.' + p, clause: `that costs ${p} RP`, test: i => list[i].price?.rp === p })));
  dim('first', 'abcdefghijklmnopqrstuvwxyz'.split('').map(ch => ({ key: 'first.' + ch, clause: `whose name starts with ${ch.toUpperCase()}`, test: i => (list[i].name.replace(/[^A-Za-z]/g, '')[0] || '').toLowerCase() === ch })));
  dim('name', [{ key: 'name.space', clause: 'whose name has more than one word', test: i => /\s/.test(list[i].name) }, { key: 'name.apos', clause: 'whose name has an apostrophe', test: i => /'/.test(list[i].name) }]);
  dim('title', [{ key: 'title.the', clause: 'whose title starts with "the"', test: i => /^the /i.test(list[i].title || '') }]);
  return D;
}
function composeChampion(cl) {
  const role = cl.find(c => c.v.role)?.v.role, adj = cl.find(c => c.v.adj)?.v.adj;
  const rest = cl.filter(c => c.v.clause).map(c => c.v.clause);
  const noun = [adj, role || 'champion'].filter(Boolean).join(' ');
  return `Name a ${noun}${rest.length ? ' ' + joinClauses(rest) : ''}`;
}

// ---- skins -------------------------------------------------------------------------------------------------
function skinEntities(list) {
  const lineSize = new Map(), out = [];
  for (const c of list) for (const s of c.skins || []) if (!s.isBase && s.name !== 'Original') for (const l of s.set || []) if (l && l !== 'Legacy') (lineSize.get(l) || lineSize.set(l, new Set()).get(l)).add(c.name);
  const sizes = [...lineSize.values()].map(s => s.size).sort((a, b) => a - b);
  const sizePct = l => (sizes.filter(x => x < (lineSize.get(l)?.size || 0)).length) / Math.max(1, sizes.length - 1);
  for (const c of list) for (const s of c.skins || []) {
    if (s.isBase || s.name === 'Original' || !s.release || s.release.startsWith('0000')) continue;
    const line = (s.set || []).find(l => l && l !== 'Legacy');
    const y = +s.release.slice(0, 4);
    out.push({ c, s, line, year: y, name: `${s.name} ${c.name}`, fame: 0.5 * (line ? sizePct(line) : 0.2) + 0.5 * (1 - (Math.min(2025, Math.max(2009, y)) - 2009) / 16) });
  }
  return { ents: out, lineSize };
}
function skinDims(ents, lineSize) {
  const D = [];
  const lines = [...lineSize].filter(([, s]) => s.size >= 7).map(([l]) => l);
  D.push({ id: 'line', values: lines.map(l => ({ key: 'line.' + l, clause: `in the ${l} line`, test: i => ents[i].line === l })) });
  D.push({ id: 'rarity', values: ['Legendary', 'Mythic', 'Epic', 'Ultimate', 'NoRarity'].map(r => ({ key: 'r.' + r, adj: r === 'NoRarity' ? 'standard' : r, test: i => ents[i].s.rarity === r })) });
  D.push({ id: 'year', values: [...Array.from({ length: 17 }, (_, k) => [2009 + k, 2009 + k]), [2009, 2012], [2013, 2016], [2017, 2020], [2021, 2025]].map(([a, b]) => ({ key: `y.${a}.${b}`, clause: a === b ? `released in ${a}` : `released between ${a} and ${b}`, test: i => ents[i].year >= a && ents[i].year <= b })) });
  D.push({ id: 'cost', values: [520, 750, 975, 1350, 1820].map(p => ({ key: 'cost.' + p, clause: `costing ${p} RP`, test: i => ents[i].s.cost === p })) });
  D.push({ id: 'role', values: Object.entries(MAIN_ROLES).map(([k, l]) => ({ key: 'role.' + k, clause: `for a ${l}`, test: i => (ents[i].c.roles || []).includes(k) })) });
  D.push({ id: 'range', values: [['MELEE', 'melee'], ['RANGED', 'ranged']].map(([k, l]) => ({ key: 'atk.' + k, clause: `for a ${l} champion`, test: i => ents[i].c.attackType === k })) });
  D.push({ id: 'faction', values: Object.entries(FACTION).map(([k, l]) => ({ key: 'f.' + k, clause: `for a champion from ${l}`, test: i => ents[i].c.faction === k })) });
  D.push({ id: 'first', values: 'abcdefghijklmnopqrstuvwxyz'.split('').map(ch => ({ key: 'first.' + ch, clause: `starting with the letter ${ch.toUpperCase()}`, test: i => ents[i].name[0].toLowerCase() === ch })) });
  return D;
}
const composeSkin = cl => { const adj = cl.find(c => c.v.adj)?.v.adj; const rest = cl.filter(c => c.v.clause).map(c => c.v.clause); return `Name a${adj ? ' ' + adj : ''} skin${rest.length ? ' ' + joinClauses(rest) : ''}`; };

// ---- items -------------------------------------------------------------------------------------------------
const STAT = { abilityPower: 'Ability Power', attackDamage: 'Attack Damage', armor: 'Armor', magicResistance: 'Magic Resist', attackSpeed: 'Attack Speed', criticalStrikeChance: 'Critical Strike Chance', health: 'Health', mana: 'Mana', abilityHaste: 'Ability Haste', movespeed: 'Movement Speed', lifesteal: 'Life Steal', omnivamp: 'Omnivamp', magicPenetration: 'Magic Penetration', lethality: 'Lethality', armorPenetration: 'Armor Penetration', healthRegen: 'Health Regen', manaRegen: 'Mana Regen', tenacity: 'Tenacity' };
function itemDims(items, byId) {
  const D = [];
  D.push({ id: 'rank', values: [['LEGENDARY', 'a Legendary'], ['EPIC', 'an Epic'], ['BASIC', 'a Basic'], ['BOOTS', 'a Boots'], ['STARTER', 'a starter'], ['CONSUMABLE', 'a consumable']].map(([k, l]) => ({ key: 'rank.' + k, adj: l, test: i => (items[i].rank || []).includes(k) })) });
  for (const [k, l] of Object.entries(STAT)) D.push({ id: 'stat.' + k, values: [{ key: 'stat.' + k, clause: `that gives ${l}`, test: i => !!(items[i].stats?.[k] && (items[i].stats[k].flat || items[i].stats[k].percent)) }] });
  D.push({ id: 'price', values: [[0, 700], [701, 1200], [1201, 2000], [2001, 2800], [2801, 3200], [3201, 5000], [0, 1000], [2500, 5000]].map(([a, b]) => ({ key: `p.${a}.${b}`, clause: `that costs between ${a} and ${b} gold`, test: i => items[i].shop.prices.total >= a && items[i].shop.prices.total <= b })) });
  const comps = new Set(items.flatMap(i => i.buildsFrom || []));
  D.push({ id: 'from', values: [...comps].filter(id => byId[id] && items.filter(i => (i.buildsFrom || []).includes(id)).length >= 7).map(id => ({ key: 'from.' + id, clause: `that builds from ${byId[id].name}`, test: i => (items[i].buildsFrom || []).includes(id) })) });
  const itext = items.map(i => JSON.stringify([i.passives, i.active, i.simpleDescription]).toLowerCase());
  for (const [k, l, re] of [['onhit', 'on-hit', /on-hit/], ['shield', 'a shield', /\bshield/], ['slow', 'a slow', /\bslow/], ['burn', 'burn damage', /\bburn/], ['heal', 'healing', /\bheal/], ['stasis', 'stasis', /stasis/], ['ward', 'wards or vision', /\bward|vision|reveal/], ['tp', 'a teleport', /teleport/], ['dash', 'a dash', /\bdash|\bblink/], ['knock', 'a knockback or knock up', /knock/], ['stun', 'a stun', /\bstun/], ['execute', 'an execute', /\bexecut|below \d+%/], ['crit', 'critical strikes', /critical/], ['mana', 'mana restoration', /restores? .*mana|\bmana\b/], ['dr', 'damage reduction', /damage reduction|reduce[sd]? damage/], ['stack', 'stacks', /\bstacks?\b/], ['sheen', 'an empowered attack', /empower|spellblade|next basic attack/], ['revive', 'a revive', /revive|resurrect/]]) D.push({ id: 'text.' + k, values: [{ key: 'text.' + k, clause: `whose effects mention ${l}`, test: i => re.test(itext[i]) }] });
  D.push({ id: 'active', values: [{ key: 'active', clause: 'with an active ability', test: i => (items[i].active || []).length > 0 }, { key: 'passive', clause: 'with a passive effect', test: i => (items[i].passives || []).length > 0 }] });
  D.push({ id: 'into', values: [{ key: 'into0', clause: 'that does not build into anything', test: i => !(items[i].buildsInto || []).length }, { key: 'into3', clause: 'that builds into 3 or more items', test: i => (items[i].buildsInto || []).length >= 3 }] });
  D.push({ id: 'first', values: 'abcdefghijklmnopqrstuvwxyz'.split('').map(ch => ({ key: 'first.' + ch, clause: `whose name starts with ${ch.toUpperCase()}`, test: i => (items[i].name.replace(/[^A-Za-z]/g, '')[0] || '').toLowerCase() === ch })) });
  return D;
}
const composeItem = cl => { const adj = cl.find(c => c.v.adj)?.v.adj; const rest = cl.filter(c => c.v.clause).map(c => c.v.clause); return `Name ${adj || 'an'} item${rest.length ? ' ' + joinClauses(rest) : ''}`; };

// ---- abilities -------------------------------------------------------------------------------------------------
const SLOT = { P: ['passive', 'a passive'], Q: ['Q ability', 'a Q ability'], W: ['W ability', 'a W ability'], E: ['E ability', 'an E ability'], R: ['ultimate', 'an ultimate'] };
function abilityEntities(list, pct) {
  const out = [];
  const num = v => (Number.isFinite(v) ? v : NaN);
  for (const c of list) for (const [slot, arr] of Object.entries(c.abilities || {})) {
    const seen = new Set();
    for (const a of arr || []) {
      if (!a?.name || seen.has(a.name)) continue; seen.add(a.name);
      const text = ((a.blurb || '') + ' ' + (a.effects || []).map(e => e.description).join(' ')).toLowerCase();
      out.push({ c, slot, a, text, name: a.name, cd: num(a.cooldown?.modifiers?.[0]?.values?.[0]), fame: Math.min(1, 0.7 * pct(c) + 0.3 * ({ R: 1, Q: 0.85, W: 0.55, E: 0.55, P: 0.25 }[slot] ?? 0.3)) });
    }
  }
  return out;
}
function abilityDims(E) {
  const year = c => +(c.releaseDate || '0').slice(0, 4), D = [];
  D.push({ id: 'slot', values: Object.entries(SLOT).map(([k, [, art]]) => ({ key: 'slot.' + k, slot: art, test: i => E[i].slot === k })) });
  for (const [k, [label, re]] of Object.entries(KIT)) D.push({ id: 'kit.' + k, values: [{ key: 'kit.' + k, clause: `that mentions ${label}`, test: i => re.test(E[i].text) }] });
  D.push({ id: 'dmg', values: [['MAGIC_DAMAGE', 'magic'], ['PHYSICAL_DAMAGE', 'physical'], ['TRUE_DAMAGE', 'true']].map(([k, l]) => ({ key: 'dmg.' + k, clause: `that deals ${l} damage`, test: i => E[i].a.damageType === k })) });
  D.push({ id: 'target', values: [['auto', 'is auto-targeted'], ['location', 'is aimed at a location'], ['direction', 'is a directional skillshot'], ['unit', 'targets a unit']].map(([k, l]) => ({ key: 'tg.' + k, clause: `that ${l}`, test: i => new RegExp(k, 'i').test(E[i].a.targeting || '') })) });
  D.push({ id: 'cd', values: [['at most 5 seconds', v => v <= 5], ['at most 10 seconds', v => v <= 10], ['at least 20 seconds', v => v >= 20], ['at least 60 seconds', v => v >= 60], ['at least 100 seconds', v => v >= 100]].map(([l, f], k) => ({ key: 'cd.' + k, clause: `with a base cooldown of ${l}`, test: i => Number.isFinite(E[i].cd) && f(E[i].cd) })) });
  D.push({ id: 'role', values: Object.entries(MAIN_ROLES).map(([k, l]) => ({ key: 'role.' + k, clause: `belonging to a ${l}`, test: i => (E[i].c.roles || []).includes(k) })) });
  D.push({ id: 'range', values: [['MELEE', 'melee'], ['RANGED', 'ranged']].map(([k, l]) => ({ key: 'atk.' + k, clause: `of a ${l} champion`, test: i => E[i].c.attackType === k })) });
  D.push({ id: 'faction', values: Object.entries(FACTION).map(([k, l]) => ({ key: 'fac.' + k, clause: `of a champion from ${l}`, test: i => E[i].c.faction === k })) });
  D.push({ id: 'era', values: [[2009, 2011], [2012, 2014], [2015, 2017], [2018, 2020], [2021, 2023], [2024, 2025]].map(([a, b]) => ({ key: `era.${a}`, clause: `of a champion released between ${a} and ${b}`, test: i => year(E[i].c) >= a && year(E[i].c) <= b })) });
  D.push({ id: 'resource', values: [['MANA', 'uses Mana'], ['ENERGY', 'uses Energy'], ['NONE', 'has no resource bar']].map(([k, l]) => ({ key: 'res.' + k, clause: `of a champion who ${l}`, test: i => E[i].c.resource === k })) });
  const words = {}; E.forEach(e => new Set(e.name.toLowerCase().match(/[a-z]{4,}/g) || []).forEach(w => (words[w] ||= []).push(1)));
  D.push({ id: 'word', values: Object.entries(words).filter(([, v]) => v.length >= 7).map(([w]) => ({ key: 'w.' + w, clause: `with "${w[0].toUpperCase() + w.slice(1)}" in its name`, test: i => new RegExp('\\b' + w + '\\b', 'i').test(E[i].name) })) });
  D.push({ id: 'first', values: 'abcdefghijklmnopqrstuvwxyz'.split('').map(ch => ({ key: 'first.' + ch, clause: `whose name starts with ${ch.toUpperCase()}`, test: i => (E[i].name.replace(/[^A-Za-z]/g, '')[0] || '').toLowerCase() === ch })) });
  return D;
}
const composeAbility = cl => { const slot = cl.find(c => c.v.slot)?.v.slot; const rest = cl.filter(c => c.v.clause).map(c => c.v.clause); return `Name ${slot || 'an ability'}${slot ? '' : ''}${rest.length ? ' ' + joinClauses(rest) : ''}`; };

// ---- entry point -------------------------------------------------------------------------------------------------
export function generateCombos({ champions, items, fame, caps = { champ: 40000, skin: 12000, item: 5000 } }) {
  const out = [], stat = {};
  const emit = (family, category, idPrefix, found, ents, compose, fameOf, aliasesOf, opts) => {
    const ranked = found.map(f => ({ f, h: hash(idPrefix + f.idx.join(',')) })).sort((a, b) => a.h - b.h).slice(0, opts.cap);
    for (const { f } of ranked) {
      const entries = f.idx.map(i => ({ name: ents[i].name ?? ents[i].c?.name, fame: fameOf(i), aliases: aliasesOf?.(i) || [] }));
      const text = compose(f.cl);
      const id = `${idPrefix}.${f.cl.map(c => c.v.key).join('+')}`;
      const avg = f.idx.reduce((s, i) => s + fameOf(i), 0) / f.idx.length;
      const cat = opts.lore && f.cl.some(c => /^(fac|rel|era)\./.test(c.v.key)) ? 'Lore' : category;
      const r = build({ id, category: cat, subtype: family, text, entries, mode: 'fame', min: 7, max: opts.max, pop: Math.round(Math.min(100, 100 * avg + 10)) });
      if (r) { if (opts.lc) r.lc = 1; out.push(r); stat[family] = (stat[family] || 0) + 1; }
    }
  };
  // champions
  const list = Object.values(champions).filter(c => c.name);
  const fameOf = new Map(Object.entries(fame).map(([k, v]) => [norm(k), v]));
  const score = c => fameOf.get(norm(c.name)) ?? 20;
  const sorted = list.map(score).sort((a, b) => a - b), pct = c => sorted.filter(s => s < score(c)).length / (sorted.length - 1);
  const dims = champDims(list);
  const found = enumerate(list.length, dims, { maxClauses: 3, min: 7, max: 90 });
  const ents = list.map(c => ({ c, name: c.name }));
  emit('champion attribute combos', 'Champions', 'x.c', found, ents, composeChampion, i => pct(list[i]), null, { cap: caps.champ, max: 90, lore: true });
  // skins
  const { ents: sk, lineSize } = skinEntities(list);
  const skFound = enumerate(sk.length, skinDims(sk, lineSize), { maxClauses: 3, min: 7, max: 150 });
  emit('skin attribute combos', 'Cosmetics', 'x.s', skFound, sk, composeSkin, i => sk[i].fame, null, { cap: caps.skin, max: 150, lc: true });
  // abilities (answers are ability names; "Ahri R" style aliases)
  const ab = abilityEntities(list, pct);
  const abFound = enumerate(ab.length, abilityDims(ab), { maxClauses: 3, min: 7, max: 90 });
  emit('ability attribute combos', 'Game', 'x.a', abFound, ab, composeAbility, i => ab[i].fame, i => [`${ab[i].c.name} ${ab[i].slot}`, `${ab[i].c.name} ${SLOT[ab[i].slot]?.[0] || ab[i].slot}`], { cap: caps.ability ?? 25000, max: 90, lc: true, lore: true });
  // items
  const buy = Object.values(items).filter(i => i.shop?.purchasable && !i.removed && i.name && (i.shop?.prices?.total ?? 0) > 0);
  const byId = Object.fromEntries(Object.values(items).map(i => [i.id, i]));
  const prox = i => 2 * Math.log1p((i.buildsInto || []).length) + Math.log1p(i.shop.prices.total) / 2 + ((i.nicknames || []).length ? 1 : 0);
  const ps = buy.map(prox).sort((a, b) => a - b), ipct = i => ps.filter(s => s < prox(i)).length / (ps.length - 1);
  const itFound = enumerate(buy.length, itemDims(buy, byId), { maxClauses: 3, min: 7, max: 90 });
  emit('item attribute combos', 'Game', 'x.i', itFound, buy.map(i => ({ name: i.name })), composeItem, i => ipct(buy[i]), i => buy[i].nicknames || [], { cap: caps.item, max: 90, lc: true });
  return { questions: out, stat };
}
