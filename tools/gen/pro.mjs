// Pro play questions generated from Oracle's Elixir match data.
// Answer rarity comes from the data itself: how many games the player/champion/team appears in for the
// question's scope (see tools/lib/tiers.mjs, tierByMass).
import { readdir } from 'node:fs/promises';
import { csvRows } from '../lib/csv.mjs';
import { build, norm } from '../lib/question.mjs';

const CAT = 'Pro Play';
// Leagues with a name players recognise. Anything else (minor circuits, cups) is skipped.
const PLACE = {
  LCK: 'in the LCK', LPL: 'in the LPL', LEC: 'in the LEC', LCS: 'in the LCS', 'NA LCS': 'in the NA LCS', 'EU LCS': 'in the EU LCS',
  LMS: 'in the LMS', WLDs: 'at the World Championship', MSI: 'at the Mid-Season Invitational', CBLOL: 'in the CBLOL', LLA: 'in the LLA',
  LJL: 'in the LJL', VCS: 'in the VCS', TCL: 'in the TCL', OPL: 'in the OPL', LCL: 'in the LCL', LDL: 'in the LDL', CK: 'in Challengers Korea',
  'NA CS': 'in the NA Challenger Series', 'EU CS': 'in the EU Challenger Series',
};
const POS = { top: 'Top laner', jng: 'Jungler', mid: 'Mid laner', bot: 'ADC', sup: 'Support' };
const TEAM_ALIASES = {
  'SK Telecom T1': ['SKT', 'SKT T1', 'T1'], T1: ['SKT', 'SK Telecom T1'], 'Samsung Galaxy': ['SSG', 'Samsung'], 'Samsung White': ['SSW'], 'Samsung Blue': ['SSB'],
  'Royal Never Give Up': ['RNG'], 'Invictus Gaming': ['IG'], 'EDward Gaming': ['EDG'], 'FunPlus Phoenix': ['FPX'], 'Team WE': ['WE'],
  'Team SoloMid': ['TSM'], 'Cloud9': ['C9'], 'Counter Logic Gaming': ['CLG'], 'Team Liquid': ['TL'], 'Immortals': ['IMT'],
  'G2 Esports': ['G2'], 'Fnatic': ['FNC'], 'Origen': ['OG'], 'Splyce': ['SPY'], 'Unicorns of Love': ['UOL'], 'H2k-Gaming': ['H2K'], 'H2K Gaming': ['H2K'],
  'Misfits Gaming': ['MSF', 'Misfits'], 'Team Vitality': ['VIT'], 'Schalke 04 Esports': ['S04', 'Schalke'], 'Gambit Gaming': ['GMB', 'Gambit'],
  'Taipei Assassins': ['TPA'], 'Flash Wolves': ['FW'], 'ahq e-Sports Club': ['ahq'], 'Machi Esports': ['MCX'], 'J Team': ['JT'],
  'KT Rolster': ['KT'], 'Longzhu Gaming': ['LZ'], 'Kingzone DragonX': ['KZ', 'DragonX'], 'DAMWON Gaming': ['DWG', 'DAMWON'], 'Gen.G': ['GEN', 'GenG'],
  'Afreeca Freecs': ['AFS'], 'Jin Air Green Wings': ['JAG'], 'Najin e-mFire': ['Najin'], 'CJ Entus': ['CJ'], 'Team Dignitas': ['DIG', 'Dignitas'],
  'Team Impulse': ['IMP'], 'Albus NoX Luna': ['ANX'], 'Alliance': ['ALL'], 'Ninjas in Pyjamas': ['NIP'], 'Copenhagen Wolves': ['CW'],
  'Edward Gaming': ['EDG'], 'Snake Esports': ['SS'], 'LGD Gaming': ['LGD'], 'Vici Gaming': ['VG'], 'Oh My God': ['OMG'], 'Newbee': ['NB'],
  'Team Alternate': ['ALT'], 'Team Coast': ['CST'], 'Evil Geniuses': ['EG'], 'Phoenix1': ['P1'], 'Echo Fox': ['FOX'], 'FlyQuest': ['FLY'],
  '100 Thieves': ['100T'], 'Golden Guardians': ['GGS'], 'Clutch Gaming': ['CG'], 'OpTic Gaming': ['OPT'], 'Apex Gaming': ['APX'],
  'Paris Saint-Germain Talon': ['PSG Talon', 'PSG'], 'Beşiktaş Esports Club': ['Besiktas', 'BJK'], 'Fenerbahçe Espor': ['Fenerbahce'],
};
const STRIP = / (gaming|esports|e-sports|club|team|esport|espor)$/i;
export function teamAliases(name) {
  const a = new Set(TEAM_ALIASES[name] || []);
  const stripped = name.replace(/^team /i, '').replace(STRIP, '').trim();
  if (stripped && stripped !== name) a.add(stripped);
  const words = name.split(/\s+/).filter(w => /^[A-Z0-9]/.test(w));
  if (words.length >= 3) a.add(words.map(w => w[0]).join(''));
  return [...a].filter(x => norm(x) && norm(x) !== norm(name));
}

function tally(map, key, name) {
  let m = map.get(key); if (!m) map.set(key, (m = new Map()));
  m.set(name, (m.get(name) || 0) + 1);
}

export async function loadRows(rawDir) {
  const files = (await readdir(rawDir)).filter(f => /^\d{4}\.csv$/.test(f)).sort();
  const players = [], teams = []; const years = [];
  for (const f of files) {
    let h; let valid = false;
    for await (const r of csvRows(`${rawDir}/${f}`)) {
      if (!h) { h = Object.fromEntries(r.map((c, i) => [c, i])); valid = 'gameid' in h; if (!valid) break; years.push(+f.slice(0, 4)); continue; }
      const lg = r[h.league]; if (!PLACE[lg]) continue;
      const base = { y: +r[h.year], lg, sp: r[h.split], po: r[h.playoffs] === '1', team: r[h.teamname], res: r[h.result] };
      if (r[h.position] === 'team') teams.push({ ...base, bans: [1, 2, 3, 4, 5].map(i => r[h['ban' + i]]).filter(Boolean) });
      else if (r[h.playername]) players.push({ ...base, pl: r[h.playername], pos: r[h.position], ch: r[h.champion] });
    }
  }
  return { players, teams, years };
}

export function generatePro({ players, teams, years }) {
  const minY = Math.min(...years), maxY = Math.max(...years);
  const ALL = maxY >= 2026 ? 'in pro play' : `in pro play between ${minY} and ${maxY}`;
  const out = [], stat = {};
  const push = (family, q) => { if (q) { out.push(q); stat[family] = (stat[family] || 0) + 1; } };
  const entries = m => [...m].map(([name, count]) => ({ name, count }));
  const teamEntries = m => [...m].map(([name, count]) => ({ name, count, aliases: teamAliases(name) }));
  const split = sp => (sp ? ` ${sp}` : '');
  const idk = (...p) => p.map(x => norm(x) || 'x').join('.');

  const G = {}; // group name -> Map<key, Map<name,count>>
  const g = n => (G[n] ||= new Map());
  for (const r of players) {
    if (r.ch) {
      tally(g('chByPl'), r.pl, r.ch); tally(g('chByPlY'), r.pl + '|' + r.y, r.ch);
      tally(g('plByCh'), r.ch, r.pl); tally(g('plByChY'), r.ch + '|' + r.y, r.pl); tally(g('plByChLY'), r.ch + '|' + r.lg + '|' + r.y, r.pl);
      tally(g('tmByChY'), r.ch + '|' + r.y, r.team); tally(g('tmByCh'), r.ch, r.team);
      tally(g('chByLYS'), r.lg + '|' + r.y + '|' + r.sp, r.ch); tally(g('chByLY'), r.lg + '|' + r.y, r.ch);
      if (POS[r.pos]) tally(g('chByLYP'), r.lg + '|' + r.y + '|' + r.pos, r.ch);
    }
    tally(g('plByTm'), r.team, r.pl); tally(g('plByTmY'), r.team + '|' + r.y, r.pl);
    tally(g('tmByLYS'), r.lg + '|' + r.y + '|' + r.sp, r.team); tally(g('plByLY'), r.lg + '|' + r.y, r.pl);
    if (POS[r.pos]) tally(g('plByLYP'), r.lg + '|' + r.y + '|' + r.pos, r.pl);
    if (r.po) tally(g('tmPlayoffs'), r.lg + '|' + r.y + '|' + r.sp, r.team);
  }
  for (const r of teams) for (const b of r.bans) tally(g('banByLY'), r.lg + '|' + r.y, b);

  const total = (m) => [...m.values()].reduce((s, x) => s + x, 0);
  for (const [pl, m] of G.chByPl) if (total(m) >= 40) push('champions by player', build({ id: `pro.chbypl.${idk(pl)}`, category: CAT, subtype: 'champions-by-player', text: `Name a champion ${pl} has played ${ALL}`, entries: entries(m) }));
  for (const [k, m] of G.chByPlY) { const [pl, y] = k.split('|'); if (total(m) >= 25) push('champions by player and year', build({ id: `pro.chbyply.${idk(pl, y)}`, category: CAT, subtype: 'champions-by-player-year', text: `Name a champion ${pl} played in ${y}`, entries: entries(m) })); }
  for (const [ch, m] of G.plByCh) push('players by champion', build({ id: `pro.plbych.${idk(ch)}`, category: CAT, subtype: 'players-by-champion', text: `Name a player who has played ${ch} ${ALL}`, entries: entries(m), min: 10 }));
  for (const [k, m] of G.plByChY) { const [ch, y] = k.split('|'); push('players by champion and year', build({ id: `pro.plbychy.${idk(ch, y)}`, category: CAT, subtype: 'players-by-champion-year', text: `Name a player who played ${ch} in ${y}`, entries: entries(m), min: 10 })); }
  for (const [k, m] of G.plByChLY) { const [ch, lg, y] = k.split('|'); push('players by champion, league and year', build({ id: `pro.plbychly.${idk(ch, lg, y)}`, category: CAT, subtype: 'players-by-champion-league-year', text: `Name a player who played ${ch} ${PLACE[lg]} in ${y}`, entries: entries(m), min: 10 })); }
  for (const [k, m] of G.tmByChY) { const [ch, y] = k.split('|'); push('teams by champion and year', build({ id: `pro.tmbychy.${idk(ch, y)}`, category: CAT, subtype: 'teams-by-champion-year', text: `Name a team that played ${ch} in ${y}`, entries: teamEntries(m), min: 10 })); }
  for (const [ch, m] of G.tmByCh) push('teams by champion', build({ id: `pro.tmbych.${idk(ch)}`, category: CAT, subtype: 'teams-by-champion', text: `Name a team that has played ${ch} ${ALL}`, entries: teamEntries(m), min: 10 }));
  for (const [tm, m] of G.plByTm) if (total(m) >= 40) push('players by team', build({ id: `pro.plbytm.${idk(tm)}`, category: CAT, subtype: 'players-by-team', text: `Name a player who has played for ${tm} ${ALL}`, entries: entries(m) }));
  for (const [k, m] of G.plByTmY) { const [tm, y] = k.split('|'); push('players by team and year', build({ id: `pro.plbytmy.${idk(tm, y)}`, category: CAT, subtype: 'players-by-team-year', text: `Name a player who played for ${tm} in ${y}`, entries: entries(m), min: 6 })); }
  for (const [k, m] of G.tmByLYS) { const [lg, y, sp] = k.split('|'); push('teams by league, year and split', build({ id: `pro.tmbylys.${idk(lg, y, sp)}`, category: CAT, subtype: 'teams-by-league-split', text: `Name a team that played ${PLACE[lg]} in${split(sp)} ${y}`, entries: teamEntries(m), min: 6 })); }
  for (const [k, m] of G.tmPlayoffs) { const [lg, y, sp] = k.split('|'); push('playoff teams', build({ id: `pro.tmpo.${idk(lg, y, sp)}`, category: CAT, subtype: 'playoff-teams', text: `Name a team that played in the playoffs ${PLACE[lg]} in${split(sp)} ${y}`, entries: teamEntries(m), min: 6 })); }
  for (const [k, m] of G.plByLYP) { const [lg, y, pos] = k.split('|'); push('players by league, year and role', build({ id: `pro.plbylyp.${idk(lg, y, pos)}`, category: CAT, subtype: 'players-by-role', text: `Name a ${POS[pos]} who played ${PLACE[lg]} in ${y}`, entries: entries(m), min: 12 })); }
  for (const [k, m] of G.plByLY) { const [lg, y] = k.split('|'); push('players by league and year', build({ id: `pro.plbyly.${idk(lg, y)}`, category: CAT, subtype: 'players-by-league-year', text: `Name a player who played ${PLACE[lg]} in ${y}`, entries: entries(m), min: 20 })); }
  for (const [k, m] of G.chByLYS) { const [lg, y, sp] = k.split('|'); push('champions by league, year and split', build({ id: `pro.chbylys.${idk(lg, y, sp)}`, category: CAT, subtype: 'champions-by-league-split', text: `Name a champion that was played ${PLACE[lg]} in${split(sp)} ${y}`, entries: entries(m), min: 15 })); }
  for (const [k, m] of G.chByLY) { const [lg, y] = k.split('|'); push('champions by league and year', build({ id: `pro.chbyly.${idk(lg, y)}`, category: CAT, subtype: 'champions-by-league-year', text: `Name a champion that was played ${PLACE[lg]} in ${y}`, entries: entries(m), min: 15 })); }
  for (const [k, m] of G.chByLYP) { const [lg, y, pos] = k.split('|'); push('champions by league, year and role', build({ id: `pro.chbylyp.${idk(lg, y, pos)}`, category: CAT, subtype: 'champions-by-role', text: `Name a champion played in the ${POS[pos].replace(' laner', '').replace('ADC', 'ADC')} role ${PLACE[lg]} in ${y}`, entries: entries(m), min: 10 })); }
  for (const [k, m] of G.banByLY) { const [lg, y] = k.split('|'); push('banned champions by league and year', build({ id: `pro.banly.${idk(lg, y)}`, category: CAT, subtype: 'bans-by-league-year', text: `Name a champion that was banned ${PLACE[lg]} in ${y}`, entries: entries(m), min: 15 })); }
  return { questions: out, stat, rows: players.length, years: [minY, maxY] };
}
