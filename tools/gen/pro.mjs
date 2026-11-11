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
  const spell = new Map();
  for (const r of players) { const k = norm(r.pl); let m = spell.get(k); if (!m) spell.set(k, (m = new Map())); m.set(r.pl, (m.get(r.pl) || 0) + 1); }
  const canon = new Map([...spell].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1])[0][0]]));
  for (const r of players) r.pl = canon.get(norm(r.pl));
  return { players, teams, years };
}

const LEAGUE_FACTOR = { LCK: 1, LPL: 1, LEC: 1, LCS: 1, 'NA LCS': 1, 'EU LCS': 1, WLDs: 1, MSI: 1, LMS: .5, CBLOL: .5, LLA: .5, LJL: .5, VCS: .5, TCL: .5, OPL: .5, LCL: .5, LDL: .2, CK: .2, 'NA CS': .2, 'EU CS': .2 };

export function generatePro({ players, teams, years }, { fame = {} } = {}) {
  const minY = Math.min(...years), maxY = Math.max(...years);
  const ALL = maxY >= 2026 ? 'in pro play' : `in pro play between ${minY} and ${maxY}`;
  const out = [], stat = {};
  const famed = new Map(Object.entries(fame).map(([k, v]) => [norm(k), v]));
  const chFame = ch => famed.get(norm(ch)) ?? 15;
  const plGames = new Map(), tmGames = new Map();
  for (const r of players) { plGames.set(r.pl, (plGames.get(r.pl) || 0) + 1); tmGames.set(r.team, (tmGames.get(r.team) || 0) + 1); }
  const maxPl = Math.max(...plGames.values()), maxTm = Math.max(...tmGames.values());
  const plProm = pl => Math.log1p(plGames.get(pl) || 0) / Math.log1p(maxPl);
  const tmProm = tm => Math.log1p(tmGames.get(tm) || 0) / Math.log1p(maxTm);
  const yf = y => 0.6 + 0.4 * (y - minY) / Math.max(1, maxY - minY);
  const LF = lg => LEAGUE_FACTOR[lg] ?? .3;
  const push = (family, q) => { if (q) { out.push(q); stat[family] = (stat[family] || 0) + 1; } };
  const plE = m => [...m].map(([name, count]) => ({ name, count, glob: plGames.get(name) }));
  const tmE = m => [...m].map(([name, count]) => ({ name, count, glob: tmGames.get(name), aliases: teamAliases(name) }));
  const chE = m => [...m].map(([name, count]) => ({ name, count, glob: chFame(name) }));
  const split = sp => (sp ? ` ${sp}` : '');
  const idk = (...p) => p.map(x => norm(x) || 'x').join('.');
  const C = 60; // champion answer sets above this are too easy to be interesting

  const G = {};
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
  const total = m => [...m.values()].reduce((s, x) => s + x, 0);
  const Q = (family, o) => push(family, build({ category: CAT, ...o }));

  for (const [pl, m] of G.chByPl) if (total(m) >= 40) Q('champions by player', { id: `pro.chbypl.${idk(pl)}`, subtype: 'champions-by-player', text: `Name a champion ${pl} has played ${ALL}`, entries: chE(m), max: C, pop: 100 * plProm(pl) });
  for (const [k, m] of G.chByPlY) { const [pl, y] = k.split('|'); if (total(m) >= 25) Q('champions by player and year', { id: `pro.chbyply.${idk(pl, y)}`, subtype: 'champions-by-player-year', text: `Name a champion ${pl} played in ${y}`, entries: chE(m), max: C, pop: 100 * plProm(pl) * yf(+y) }); }
  for (const [ch, m] of G.plByCh) Q('players by champion', { id: `pro.plbych.${idk(ch)}`, subtype: 'players-by-champion', text: `Name a player who has played ${ch} ${ALL}`, entries: plE(m), min: 10, pop: chFame(ch) });
  for (const [k, m] of G.plByChY) { const [ch, y] = k.split('|'); Q('players by champion and year', { id: `pro.plbychy.${idk(ch, y)}`, subtype: 'players-by-champion-year', text: `Name a player who played ${ch} in ${y}`, entries: plE(m), min: 10, pop: chFame(ch) * yf(+y) }); }
  for (const [k, m] of G.plByChLY) { const [ch, lg, y] = k.split('|'); Q('players by champion, league and year', { id: `pro.plbychly.${idk(ch, lg, y)}`, subtype: 'players-by-champion-league-year', text: `Name a player who played ${ch} ${PLACE[lg]} in ${y}`, entries: plE(m), min: 10, pop: chFame(ch) * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.tmByChY) { const [ch, y] = k.split('|'); Q('teams by champion and year', { id: `pro.tmbychy.${idk(ch, y)}`, subtype: 'teams-by-champion-year', text: `Name a team that played ${ch} in ${y}`, entries: tmE(m), min: 10, max: 80, pop: chFame(ch) * yf(+y) }); }
  for (const [ch, m] of G.tmByCh) Q('teams by champion', { id: `pro.tmbych.${idk(ch)}`, subtype: 'teams-by-champion', text: `Name a team that has played ${ch} ${ALL}`, entries: tmE(m), min: 10, max: 80, pop: chFame(ch) });
  for (const [tm, m] of G.plByTm) if (total(m) >= 40) Q('players by team', { id: `pro.plbytm.${idk(tm)}`, subtype: 'players-by-team', text: `Name a player who has played for ${tm} ${ALL}`, entries: plE(m), pop: 100 * tmProm(tm) });
  for (const [k, m] of G.plByTmY) { const [tm, y] = k.split('|'); Q('players by team and year', { id: `pro.plbytmy.${idk(tm, y)}`, subtype: 'players-by-team-year', text: `Name a player who played for ${tm} in ${y}`, entries: plE(m), min: 6, pop: 100 * tmProm(tm) * yf(+y) }); }
  for (const [k, m] of G.tmByLYS) { const [lg, y, sp] = k.split('|'); Q('teams by league, year and split', { id: `pro.tmbylys.${idk(lg, y, sp)}`, subtype: 'teams-by-league-split', text: `Name a team that played ${PLACE[lg]} in${split(sp)} ${y}`, entries: tmE(m), min: 6, pop: 80 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.tmPlayoffs) { const [lg, y, sp] = k.split('|'); Q('playoff teams', { id: `pro.tmpo.${idk(lg, y, sp)}`, subtype: 'playoff-teams', text: `Name a team that played in the playoffs ${PLACE[lg]} in${split(sp)} ${y}`, entries: tmE(m), min: 6, pop: 70 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.plByLYP) { const [lg, y, pos] = k.split('|'); Q('players by league, year and role', { id: `pro.plbylyp.${idk(lg, y, pos)}`, subtype: 'players-by-role', text: `Name a ${POS[pos]} who played ${PLACE[lg]} in ${y}`, entries: plE(m), min: 12, pop: 80 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.plByLY) { const [lg, y] = k.split('|'); Q('players by league and year', { id: `pro.plbyly.${idk(lg, y)}`, subtype: 'players-by-league-year', text: `Name a player who played ${PLACE[lg]} in ${y}`, entries: plE(m), min: 20, pop: 80 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.chByLYS) { const [lg, y, sp] = k.split('|'); Q('champions by league, year and split', { id: `pro.chbylys.${idk(lg, y, sp)}`, subtype: 'champions-by-league-split', text: `Name a champion that was played ${PLACE[lg]} in${split(sp)} ${y}`, entries: chE(m), min: 15, max: C, pop: 80 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.chByLY) { const [lg, y] = k.split('|'); Q('champions by league and year', { id: `pro.chbyly.${idk(lg, y)}`, subtype: 'champions-by-league-year', text: `Name a champion that was played ${PLACE[lg]} in ${y}`, entries: chE(m), min: 15, max: C, pop: 80 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.chByLYP) { const [lg, y, pos] = k.split('|'); Q('champions by league, year and role', { id: `pro.chbylyp.${idk(lg, y, pos)}`, subtype: 'champions-by-role', text: `Name a champion played in the ${POS[pos].replace(' laner', '')} role ${PLACE[lg]} in ${y}`, entries: chE(m), min: 10, max: C, pop: 80 * LF(lg) * yf(+y) }); }
  for (const [k, m] of G.banByLY) { const [lg, y] = k.split('|'); Q('banned champions by league and year', { id: `pro.banly.${idk(lg, y)}`, subtype: 'bans-by-league-year', text: `Name a champion that was banned ${PLACE[lg]} in ${y}`, entries: chE(m), min: 15, max: C, pop: 80 * LF(lg) * yf(+y) }); }
  return { questions: out, stat, rows: players.length, years: [minY, maxY] };
}
