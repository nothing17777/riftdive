// "Unique" pro play questions: records, rarities and cross-league facts derived from match data.
// Tiering is count-based (see tools/lib/tiers.mjs) blended with each answer's overall prominence.
import { build, norm } from '../lib/question.mjs';
import { teamAliases } from './pro.mjs';

const CAT = 'Pro Play';
// Merge league renames so "the top European league" covers EU LCS and LEC, and likewise for North America.
const REGION = { LCK: 'LCK', LPL: 'LPL', 'EU LCS': 'EU', LEC: 'EU', 'NA LCS': 'NA', LCS: 'NA', LMS: 'LMS' };
const REGION_TEXT = { LCK: 'the LCK', LPL: 'the LPL', EU: 'the EU LCS/LEC', NA: 'the NA LCS/LCS', LMS: 'the LMS' };
const REGIONS = Object.keys(REGION_TEXT);

export function generateUnique({ players, years }, { fame = {} } = {}) {
  const out = [], stat = {};
  const minY = Math.min(...years), maxY = Math.max(...years);
  const ALL = maxY >= 2026 ? 'in pro play' : `in pro play between ${minY} and ${maxY}`;
  const famed = new Map(Object.entries(fame).map(([k, v]) => [norm(k), v]));
  const chFame = ch => famed.get(norm(ch)) ?? 15;
  const plGames = new Map(), tmGames = new Map();
  for (const r of players) { plGames.set(r.pl, (plGames.get(r.pl) || 0) + 1); tmGames.set(r.team, (tmGames.get(r.team) || 0) + 1); }
  const Q = (family, o) => { const q = build({ category: CAT, subtype: family, ...o }); if (q) { out.push(q); stat[family] = (stat[family] || 0) + 1; } };
  const idk = (...p) => p.map(x => norm(x) || 'x').join('.');
  const plE = m => [...m].map(([name, count]) => ({ name, count, glob: plGames.get(name) }));
  const tmE = m => [...m].map(([name, count]) => ({ name, count, glob: tmGames.get(name), aliases: teamAliases(name) }));
  const chE = m => [...m].map(([name, count]) => ({ name, count, glob: chFame(name) }));
  const add = (map, key, name, n = 1) => { let m = map.get(key); if (!m) map.set(key, (m = new Map())); m.set(name, (m.get(name) || 0) + n); };
  const popFor = reg => (reg === 'LCK' || reg === 'LPL' || reg === 'EU' || reg === 'NA' ? 85 : 45);

  // ---- Pentakills
  const pkPl = new Map(), pkCh = new Map(), pkPlR = new Map(), pkChR = new Map();
  for (const r of players) if (r.pk > 0) {
    add(pkPl, 'all', r.pl, r.pk); if (r.ch) add(pkCh, 'all', r.ch, r.pk);
    const reg = REGION[r.lg]; if (reg) { add(pkPlR, reg, r.pl, r.pk); if (r.ch) add(pkChR, reg, r.ch, r.pk); }
  }
  Q('pentakill players', { id: 'u.pk.players', text: `Name a player who has scored a Pentakill ${ALL}`, entries: plE(pkPl.get('all') || []), min: 8, max: 250, pop: 85 });
  Q('pentakill champions', { id: 'u.pk.champs', text: `Name a champion that was played in a Pentakill ${ALL}`, entries: chE(pkCh.get('all') || []), min: 8, max: 70, pop: 75 });
  for (const reg of REGIONS) {
    Q('pentakill players by region', { id: `u.pk.players.${reg}`, text: `Name a player who has scored a Pentakill in ${REGION_TEXT[reg]}`, entries: plE(pkPlR.get(reg) || []), min: 8, max: 150, pop: popFor(reg) });
    Q('pentakill champions by region', { id: `u.pk.champs.${reg}`, text: `Name a champion that was played in a Pentakill in ${REGION_TEXT[reg]}`, entries: chE(pkChR.get(reg) || []), min: 8, max: 70, pop: popFor(reg) - 5 });
  }

  // ---- Long games (team-games, one row per team per game)
  const seen = new Set();
  for (const mins of [45, 50, 55]) {
    const all = new Map(), byReg = new Map();
    seen.clear();
    for (const r of players) {
      if (r.len < mins * 60) continue; const k = r.gid + '|' + r.team; if (seen.has(k)) continue; seen.add(k);
      add(all, 'all', r.team); const reg = REGION[r.lg]; if (reg) add(byReg, reg, r.team);
    }
    Q('long games', { id: `u.long.${mins}`, text: `Name a team that has played a game longer than ${mins} minutes ${ALL}`, entries: tmE(all.get('all') || []), min: 8, max: 150, pop: 70 });
    for (const reg of REGIONS) Q('long games by region', { id: `u.long.${mins}.${reg}`, text: `Name a team that has played a game longer than ${mins} minutes in ${REGION_TEXT[reg]}`, entries: tmE(byReg.get(reg) || []), min: 8, max: 150, pop: popFor(reg) - 10 });
  }

  // ---- Big single-game kill totals
  for (const kills of [10, 15, 20]) {
    const all = new Map(), byReg = new Map();
    for (const r of players) if (r.k >= kills) { add(all, 'all', r.pl); const reg = REGION[r.lg]; if (reg) add(byReg, reg, r.pl); }
    Q('big kill games', { id: `u.kills.${kills}`, text: `Name a player who has had ${kills} or more kills in a single game ${ALL}`, entries: plE(all.get('all') || []), min: 8, max: 200, pop: 75 });
    for (const reg of REGIONS) Q('big kill games by region', { id: `u.kills.${kills}.${reg}`, text: `Name a player who has had ${kills} or more kills in a single game in ${REGION_TEXT[reg]}`, entries: plE(byReg.get(reg) || []), min: 8, max: 150, pop: popFor(reg) - 5 });
  }

  // ---- Careers: journeymen, multi-role, cross-league
  const teamsOf = new Map(), rolesOf = new Map(), regsOf = new Map();
  for (const r of players) {
    (teamsOf.get(r.pl) || teamsOf.set(r.pl, new Set()).get(r.pl)).add(r.team);
    if (['top', 'jng', 'mid', 'bot', 'sup'].includes(r.pos)) (rolesOf.get(r.pl) || rolesOf.set(r.pl, new Set()).get(r.pl)).add(r.pos);
    const reg = REGION[r.lg]; if (reg) (regsOf.get(r.pl) || regsOf.set(r.pl, new Set()).get(r.pl)).add(reg);
  }
  for (const n of [4, 5, 6, 7]) {
    const m = new Map([...teamsOf].filter(([, t]) => t.size >= n).map(([pl, t]) => [pl, t.size]));
    Q('journeymen', { id: `u.teams.${n}`, text: `Name a player who has played for at least ${n} different teams ${ALL}`, entries: plE(m), min: 8, max: 200, pop: 65 });
  }
  for (const n of [2, 3]) {
    const m = new Map([...rolesOf].filter(([pl, t]) => t.size >= n && plGames.get(pl) >= 20).map(([pl, t]) => [pl, plGames.get(pl)]));
    Q('multi-role players', { id: `u.roles.${n}`, text: `Name a player who has played at least ${n} different roles ${ALL}`, entries: plE(m), min: 8, max: 250, pop: 60 });
  }
  for (let i = 0; i < REGIONS.length; i++) for (let j = i + 1; j < REGIONS.length; j++) {
    const a = REGIONS[i], b = REGIONS[j];
    const m = new Map([...regsOf].filter(([, s]) => s.has(a) && s.has(b)).map(([pl]) => [pl, plGames.get(pl)]));
    Q('cross-league players', { id: `u.both.${a}.${b}`, text: `Name a player who has played in both ${REGION_TEXT[a]} and ${REGION_TEXT[b]}`, entries: plE(m), min: 6, max: 150, pop: 80 });
  }

  // ---- Players who shared two teams
  const bigTeams = [...tmGames].filter(([, g]) => g >= 400).map(([t]) => t);
  const playersOf = new Map(); for (const r of players) (playersOf.get(r.team) || playersOf.set(r.team, new Set()).get(r.team)).add(r.pl);
  for (let i = 0; i < bigTeams.length; i++) for (let j = i + 1; j < bigTeams.length; j++) {
    const a = bigTeams[i], b = bigTeams[j]; const shared = [...playersOf.get(a)].filter(p => playersOf.get(b).has(p));
    if (shared.length >= 6) Q('players shared by two teams', { id: `u.shared.${idk(a)}.${idk(b)}`, text: `Name a player who has played for both ${a} and ${b}`, entries: plE(new Map(shared.map(p => [p, plGames.get(p)]))), min: 6, max: 60, pop: 70 });
  }

  // ---- Win totals
  const winsPl = new Map(), winsTm = new Map(), winsTmR = new Map();
  const tg = new Set();
  for (const r of players) if (r.res === '1') {
    add(winsPl, 'all', r.pl);
    const k = r.gid + '|' + r.team; if (!tg.has(k)) { tg.add(k); add(winsTm, 'all', r.team); const reg = REGION[r.lg]; if (reg) add(winsTmR, reg, r.team); }
  }
  for (const n of [100, 200, 300]) Q('player win totals', { id: `u.wins.pl.${n}`, text: `Name a player who has won at least ${n} games ${ALL}`, entries: plE(new Map([...(winsPl.get('all') || [])].filter(([, w]) => w >= n))), min: 8, max: 250, pop: 70 });
  for (const n of [100, 200, 300]) Q('team win totals', { id: `u.wins.tm.${n}`, text: `Name a team that has won at least ${n} games ${ALL}`, entries: tmE(new Map([...(winsTm.get('all') || [])].filter(([, w]) => w >= n))), min: 8, max: 200, pop: 70 });
  for (const reg of REGIONS) for (const n of [50, 100, 150]) Q('team win totals by region', { id: `u.wins.tm.${reg}.${n}`, text: `Name a team that has won at least ${n} games in ${REGION_TEXT[reg]}`, entries: tmE(new Map([...(winsTmR.get(reg) || [])].filter(([, w]) => w >= n))), min: 8, max: 150, pop: popFor(reg) });

  // ---- Name patterns within a region
  const byRegPl = new Map(), byRegTm = new Map();
  for (const r of players) { const reg = REGION[r.lg]; if (!reg) continue; add(byRegPl, reg, r.pl); add(byRegTm, reg, r.team); }
  const L = s => s.replace(/[^A-Za-z]/g, '').toLowerCase();
  for (const reg of REGIONS) {
    const pls = byRegPl.get(reg) || new Map(), tms = byRegTm.get(reg) || new Map();
    for (const ch of 'abcdefghijklmnoprstvwxyz') {
      Q('player names by letter', { id: `u.pl.${reg}.first.${ch}`, text: `Name a player in ${REGION_TEXT[reg]} whose name starts with ${ch.toUpperCase()}`, entries: plE(new Map([...pls].filter(([n]) => L(n)[0] === ch))), min: 8, max: 120, pop: popFor(reg) - 20 });
      Q('team names by letter', { id: `u.tm.${reg}.first.${ch}`, text: `Name a team in ${REGION_TEXT[reg]} whose name starts with ${ch.toUpperCase()}`, entries: tmE(new Map([...tms].filter(([n]) => L(n.replace(/^team /i, ''))[0] === ch))), min: 6, max: 80, pop: popFor(reg) - 25 });
    }
    for (let n = 3; n <= 8; n++) Q('player names by length', { id: `u.pl.${reg}.len.${n}`, text: `Name a player in ${REGION_TEXT[reg]} whose name has exactly ${n} letters`, entries: plE(new Map([...pls].filter(([name]) => L(name).length === n))), min: 8, max: 120, pop: popFor(reg) - 20 });
    Q('team names with Gaming', { id: `u.tm.${reg}.gaming`, text: `Name a team in ${REGION_TEXT[reg]} that has "Gaming" in its name`, entries: tmE(new Map([...tms].filter(([n]) => /gaming/i.test(n)))), min: 6, max: 80, pop: popFor(reg) - 20 });
  }
  return { questions: out, stat };
}
