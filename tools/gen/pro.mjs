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
      else if (r[h.playername]) players.push({ ...base, pl: r[h.playername], pos: r[h.position], ch: r[h.champion], pk: +r[h.pentakills] || 0, qk: +r[h.quadrakills] || 0, k: +r[h.kills] || 0, d: +r[h.deaths] || 0, a: +r[h.assists] || 0, len: +r[h.gamelength] || 0, gid: r[h.gameid] });
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
    // ---- extra scopes
    tally(g('tmByLY'), r.lg + '|' + r.y, r.team); tally(g('tmByL'), r.lg, r.team);
    if (POS[r.pos]) { tally(g('plByTmP'), r.team + '|' + r.pos, r.pl); tally(g('plByLP'), r.lg + '|' + r.pos, r.pl); tally(g('plByLYSP'), r.lg + '|' + r.y + '|' + r.sp + '|' + r.pos, r.pl); }
    tally(g('plByLYS'), r.lg + '|' + r.y + '|' + r.sp, r.pl);
    if (r.ch) {
      tally(g('chByTm'), r.team, r.ch); tally(g('chByTmY'), r.team + '|' + r.y, r.ch); tally(g('chByTmYS'), r.team + '|' + r.y + '|' + r.sp, r.ch); tally(g('chByTmLY'), r.team + '|' + r.lg + '|' + r.y, r.ch);
      if (POS[r.pos]) { tally(g('chByTmYP'), r.team + '|' + r.y + '|' + r.pos, r.ch); tally(g('chByLYSP'), r.lg + '|' + r.y + '|' + r.sp + '|' + r.pos, r.ch); tally(g('plByChP'), r.ch + '|' + r.pos, r.pl); tally(g('chByYP'), r.y + '|' + r.pos, r.ch); tally(g('chByLP'), r.lg + '|' + r.pos, r.ch); }
      tally(g('chByPlTm'), r.pl + '|' + r.team, r.ch); tally(g('chByPlLY'), r.pl + '|' + r.lg + '|' + r.y, r.ch); tally(g('chByPlYS'), r.pl + '|' + r.y + '|' + r.sp, r.ch); tally(g('chByPlL'), r.pl + '|' + r.lg, r.ch);
      tally(g('plByChLYS'), r.ch + '|' + r.lg + '|' + r.y + '|' + r.sp, r.pl); tally(g('plByChL'), r.ch + '|' + r.lg, r.pl); tally(g('tmByChLY'), r.ch + '|' + r.lg + '|' + r.y, r.team); tally(g('tmByChL'), r.ch + '|' + r.lg, r.team);
      tally(g('chByL'), r.lg, r.ch); tally(g('chByY'), String(r.y), r.ch);
      if (r.po) tally(g('chPoLYS'), r.lg + '|' + r.y + '|' + r.sp, r.ch);
    }
  }
  for (const r of teams) for (const b of r.bans) { tally(g('banByLY'), r.lg + '|' + r.y, b); tally(g('banByTm'), r.team, b); tally(g('banByTmY'), r.team + '|' + r.y, b); tally(g('banByLYS'), r.lg + '|' + r.y + '|' + r.sp, b); tally(g('banByY'), String(r.y), b); tally(g('banByL'), r.lg, b); }
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
  // ---- more scopes (all keys are 'a|b|c' strings; text builders take the parts)
  const slug = f => f.replace(/[^a-z]+/gi, '-').toLowerCase();
  const X = (family, map, text, ent, o = {}) => { for (const [k, m] of G[map]) { const p = k.split('|'); const oo = typeof o === 'function' ? o(p, m) : o; if (oo === null) continue; Q(family, { id: `pro.${map}.${idk(...p)}`, subtype: slug(family), text: text(...p), entries: ent(m), ...oo }); } };
  const POSN = pos => POS[pos].replace(' laner', '');
  const lyPop = (lg, y) => 80 * LF(lg) * yf(+y);
  X('champions by team', 'chByTm', tm => `Name a champion ${tm} has played ${ALL}`, chE, (p, m) => (total(m) >= 40 ? { max: C, pop: 100 * tmProm(p[0]) } : null));
  X('champions by team and year', 'chByTmY', (tm, y) => `Name a champion ${tm} played in ${y}`, chE, (p, m) => (total(m) >= 25 ? { max: C, pop: 100 * tmProm(p[0]) * yf(+p[1]) } : null));
  X('champions by team, year and role', 'chByTmYP', (tm, y, pos) => `Name a champion ${tm} played in the ${POSN(pos)} role in ${y}`, chE, (p, m) => ({ min: 7, max: C, pop: 100 * tmProm(p[0]) * yf(+p[1]) }));
  X('champions by team, year and split', 'chByTmYS', (tm, y, sp) => `Name a champion ${tm} played in${split(sp)} ${y}`, chE, (p, m) => (total(m) >= 20 ? { max: C, pop: 100 * tmProm(p[0]) * yf(+p[1]) } : null));
  X('champions by team, league and year', 'chByTmLY', (tm, lg, y) => `Name a champion ${tm} played ${PLACE[lg]} in ${y}`, chE, (p, m) => (total(m) >= 20 ? { max: C, pop: 100 * tmProm(p[0]) * LF(p[1]) * yf(+p[2]) } : null));
  X('champions by player and team', 'chByPlTm', (pl, tm) => `Name a champion ${pl} played for ${tm}`, chE, (p, m) => (total(m) >= 20 ? { max: C, pop: 100 * plProm(p[0]) } : null));
  X('champions by player, league and year', 'chByPlLY', (pl, lg, y) => `Name a champion ${pl} played ${PLACE[lg]} in ${y}`, chE, (p, m) => (total(m) >= 20 ? { max: C, pop: 100 * plProm(p[0]) * LF(p[1]) * yf(+p[2]) } : null));
  X('champions by player, year and split', 'chByPlYS', (pl, y, sp) => `Name a champion ${pl} played in${split(sp)} ${y}`, chE, (p, m) => (total(m) >= 18 ? { max: C, pop: 100 * plProm(p[0]) * yf(+p[1]) } : null));
  X('champions by player and league', 'chByPlL', (pl, lg) => `Name a champion ${pl} played ${PLACE[lg]}`, chE, (p, m) => (total(m) >= 30 ? { max: C, pop: 100 * plProm(p[0]) * LF(p[1]) } : null));
  X('champions by league, year, split and role', 'chByLYSP', (lg, y, sp, pos) => `Name a champion played in the ${POSN(pos)} role ${PLACE[lg]} in${split(sp)} ${y}`, chE, (p) => ({ min: 10, max: C, pop: lyPop(p[0], p[1]) }));
  X('champions by year and role', 'chByYP', (y, pos) => `Name a champion played in the ${POSN(pos)} role in pro play in ${y}`, chE, (p) => ({ min: 10, max: C, pop: 80 * yf(+p[0]) }));
  X('champions by league and role', 'chByLP', (lg, pos) => `Name a champion played in the ${POSN(pos)} role ${PLACE[lg]}`, chE, (p) => ({ min: 10, max: C, pop: 80 * LF(p[0]) }));
  X('champions by league', 'chByL', lg => `Name a champion that has been played ${PLACE[lg]}`, chE, () => ({ min: 10, max: C, pop: 60 }));
  X('champions by year', 'chByY', y => `Name a champion that was played in pro play in ${y}`, chE, (p) => ({ min: 10, max: C, pop: 70 * yf(+p[0]) }));
  X('playoff champions', 'chPoLYS', (lg, y, sp) => `Name a champion that was played in the playoffs ${PLACE[lg]} in${split(sp)} ${y}`, chE, (p) => ({ min: 10, max: C, pop: 60 * LF(p[0]) * yf(+p[1]) }));
  X('banned champions by team', 'banByTm', tm => `Name a champion ${tm} has banned ${ALL}`, chE, (p, m) => (total(m) >= 30 ? { max: C, pop: 100 * tmProm(p[0]) } : null));
  X('banned champions by team and year', 'banByTmY', (tm, y) => `Name a champion ${tm} banned in ${y}`, chE, (p, m) => (total(m) >= 20 ? { max: C, pop: 100 * tmProm(p[0]) * yf(+p[1]) } : null));
  X('banned champions by league, year and split', 'banByLYS', (lg, y, sp) => `Name a champion that was banned ${PLACE[lg]} in${split(sp)} ${y}`, chE, (p) => ({ min: 12, max: C, pop: lyPop(p[0], p[1]) }));
  X('banned champions by year', 'banByY', y => `Name a champion that was banned in pro play in ${y}`, chE, (p) => ({ min: 12, max: C, pop: 60 * yf(+p[0]) }));
  X('banned champions by league', 'banByL', lg => `Name a champion that has been banned ${PLACE[lg]}`, chE, () => ({ min: 12, max: C, pop: 55 }));
  X('players by league, year and split', 'plByLYS', (lg, y, sp) => `Name a player who played ${PLACE[lg]} in${split(sp)} ${y}`, plE, (p) => ({ min: 15, pop: lyPop(p[0], p[1]) }));
  X('players by league, year, split and role', 'plByLYSP', (lg, y, sp, pos) => `Name a ${POS[pos]} who played ${PLACE[lg]} in${split(sp)} ${y}`, plE, (p) => ({ min: 10, pop: lyPop(p[0], p[1]) }));
  X('players by team and role', 'plByTmP', (tm, pos) => `Name a ${POS[pos]} who has played for ${tm} ${ALL}`, plE, (p) => ({ min: 7, pop: 100 * tmProm(p[0]) }));
  X('players by league and role', 'plByLP', (lg, pos) => `Name a ${POS[pos]} who has played ${PLACE[lg]}`, plE, (p) => ({ min: 15, pop: 70 * LF(p[0]) }));
  X('players by champion and role', 'plByChP', (ch, pos) => `Name a ${POS[pos]} who has played ${ch} ${ALL}`, plE, (p) => ({ min: 10, pop: chFame(p[0]) }));
  X('players by champion, league, year and split', 'plByChLYS', (ch, lg, y, sp) => `Name a player who played ${ch} ${PLACE[lg]} in${split(sp)} ${y}`, plE, (p) => ({ min: 8, pop: chFame(p[0]) * LF(p[1]) * yf(+p[2]) }));
  X('players by champion and league', 'plByChL', (ch, lg) => `Name a player who has played ${ch} ${PLACE[lg]}`, plE, (p) => ({ min: 10, pop: chFame(p[0]) * LF(p[1]) }));
  X('teams by champion, league and year', 'tmByChLY', (ch, lg, y) => `Name a team that played ${ch} ${PLACE[lg]} in ${y}`, tmE, (p) => ({ min: 8, max: 80, pop: chFame(p[0]) * LF(p[1]) * yf(+p[2]) }));
  X('teams by champion and league', 'tmByChL', (ch, lg) => `Name a team that has played ${ch} ${PLACE[lg]}`, tmE, (p) => ({ min: 8, max: 80, pop: chFame(p[0]) * LF(p[1]) }));
  X('teams by league and year', 'tmByLY', (lg, y) => `Name a team that played ${PLACE[lg]} in ${y}`, tmE, (p) => ({ min: 8, pop: 80 * LF(p[0]) * yf(+p[1]) }));
  X('teams by league', 'tmByL', lg => `Name a team that has played ${PLACE[lg]}`, tmE, () => ({ min: 10, pop: 60 }));
  return { questions: out, stat, rows: players.length, years: [minY, maxY] };
}

// Keep only questions a fan could reasonably attempt: major leagues, and well-known players/teams in the question itself.
// Works on the normalised tokens in the question id (answers may still be obscure; the question's subject may not).
export function fanFilter({ players }, { topPlayers = 130, topTeams = 55 } = {}) {
  const MAJOR = new Set(Object.keys(LEAGUE_FACTOR).filter(k => LEAGUE_FACTOR[k] === 1));
  const pg = new Map(), tg = new Map(), allPl = new Set(), allTm = new Set();
  for (const r of players) { allPl.add(norm(r.pl)); allTm.add(norm(r.team)); if (MAJOR.has(r.lg)) { pg.set(r.pl, (pg.get(r.pl) || 0) + 1); tg.set(r.team, (tg.get(r.team) || 0) + 1); } }
  const top = (m, n) => new Set([...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(x => norm(x[0])));
  const famPl = top(pg, topPlayers), famTm = top(tg, topTeams);
  const minor = new Set(Object.keys(PLACE).filter(k => !MAJOR.has(k)).map(norm));
  return q => {
    if (!q.id.startsWith('pro.') && !q.id.startsWith('u.')) return true;
    for (const t of q.id.split('.').slice(2)) {
      if (minor.has(t)) return false;
      if (/^(rounds?\d|split\d|lockin|cup|stage|group|opening|closing|promotion|relegation|knockout|regional|qualifier|play(in|offs?)\d)/.test(t)) return false; // odd split names nobody recognises
      if (allPl.has(t) && !famPl.has(t)) return false;
      if (allTm.has(t) && !famTm.has(t)) return false;
    }
    return true;
  };
}
