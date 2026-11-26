// Pro play questions generated from Oracle's Elixir match data.
// One simple clause per question, over a whole career: titles, leagues, Worlds, famous teams and stars.
// Answer rarity comes from the data itself: how many games the player/champion/team appears in for the
// question's scope (see tools/lib/tiers.mjs, tierByMass).
import { readdir } from 'node:fs/promises';
import { csvRows } from '../lib/csv.mjs';
import { build, norm } from '../lib/question.mjs';

const CAT = 'Pro Play';
// Leagues that are read from the data. Anything else (minor circuits, cups) is skipped.
const PLACE = {
  LCK: 'in the LCK', LPL: 'in the LPL', LEC: 'in the LEC', LCS: 'in the LCS', 'NA LCS': 'in the NA LCS', 'EU LCS': 'in the EU LCS',
  LMS: 'in the LMS', WLDs: 'at the World Championship', MSI: 'at the Mid-Season Invitational', CBLOL: 'in the CBLOL', LLA: 'in the LLA',
  LJL: 'in the LJL', VCS: 'in the VCS', TCL: 'in the TCL', OPL: 'in the OPL', LCL: 'in the LCL',
  'LTA N': 'in LTA North', 'LTA S': 'in LTA South', LTA: 'in the LTA',
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
      const base = { y: +r[h.year], date: r[h.date], gid: r[h.gameid], lg, sp: r[h.split], po: r[h.playoffs] === '1', team: r[h.teamname], res: r[h.result] };
      if (r[h.position] === 'team') teams.push({ ...base, bans: [1, 2, 3, 4, 5].map(i => r[h['ban' + i]]).filter(Boolean) });
      else if (r[h.playername]) players.push({ ...base, id: r[h.playerid], pl: r[h.playername], pos: r[h.position], ch: r[h.champion], pk: +r[h.pentakills] || 0, qk: +r[h.quadrakills] || 0, k: +r[h.kills] || 0, d: +r[h.deaths] || 0, a: +r[h.assists] || 0, len: +r[h.gamelength] || 0, gid: r[h.gameid] });
    }
  }
  const spell = new Map();
  for (const r of players) { const k = norm(r.pl); let m = spell.get(k); if (!m) spell.set(k, (m = new Map())); m.set(r.pl, (m.get(r.pl) || 0) + 1); }
  const canon = new Map([...spell].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1])[0][0]]));
  for (const r of players) r.pl = canon.get(norm(r.pl));
  return { players, teams, years };
}

const LEAGUE_FACTOR = { LCK: 1, LPL: 1, LEC: 1, LCS: 1, 'NA LCS': 1, 'EU LCS': 1, WLDs: 1, MSI: 1, LMS: .5, CBLOL: .5, LLA: .5, LJL: .5, VCS: .5, TCL: .5, OPL: .5, LCL: .5, LDL: .2, CK: .2, 'NA CS': .2, 'EU CS': .2 };

// The four leagues a fan knows, including their former names.
const MAJORS = { LCK: ['LCK'], LPL: ['LPL'], LEC: ['LEC', 'EU LCS'], LCS: ['LCS', 'NA LCS', 'LTA N'] };
// Old and new names of the same organisation are merged under one answer.
const MERGE = { 'SK Telecom T1': 'T1' };
const MORE_ALIASES = {
  T1: ['SKT', 'SKT T1', 'SK Telecom T1'], 'Dplus Kia': ['DK', 'DWG', 'DAMWON', 'DAMWON Gaming', 'DWG KIA'], 'Kiwoom DRX': ['DRX'],
  'Hanwha Life Esports': ['HLE', 'Hanwha'], 'MAD Lions KOI': ['MAD Lions', 'MAD'], 'Movistar KOI': ['KOI', 'MKOI'], 'DN SOOPers': ['Kwangdong Freecs', 'DN Freecs'],
  'Bilibili Gaming': ['BLG'], 'JD Gaming': ['JDG'], 'Top Esports': ['TES'], "Anyone's Legend": ['AL'], 'Weibo Gaming': ['WBG'],
};
const aliasesFor = name => [...new Set([...teamAliases(name), ...(MORE_ALIASES[name] || [])])];

// League champions, [league code, year, split as written in the data, team]. Hand-listed because the data's
// playoff flag is incomplete (e.g. LPL 2017) and also marks side events. Rosters come from the data.
const TITLES = {
  LCK: [['LCK', 2016, 'Spring', 'SK Telecom T1'], ['LCK', 2016, 'Summer', 'ROX Tigers'], ['LCK', 2017, 'Spring', 'SK Telecom T1'], ['LCK', 2017, 'Summer', 'Longzhu Gaming'],
    ['LCK', 2018, 'Spring', 'Kingzone DragonX'], ['LCK', 2018, 'Summer', 'KT Rolster'], ['LCK', 2019, 'Spring', 'SK Telecom T1'], ['LCK', 2019, 'Summer', 'SK Telecom T1'],
    ['LCK', 2020, 'Spring', 'T1'], ['LCK', 2020, 'Summer', 'Dplus Kia'], ['LCK', 2021, 'Spring', 'Dplus Kia'], ['LCK', 2021, 'Summer', 'Dplus Kia'],
    ['LCK', 2022, 'Spring', 'T1'], ['LCK', 2022, 'Summer', 'Gen.G'], ['LCK', 2023, 'Spring', 'Gen.G'], ['LCK', 2023, 'Summer', 'Gen.G'],
    ['LCK', 2024, 'Spring', 'Gen.G'], ['LCK', 2024, 'Summer', 'Hanwha Life Esports'], ['LCK', 2025, 'Rounds 3-5', 'Gen.G'], ['LCK', 2026, 'Rounds 3-4', 'Gen.G']],
  LPL: [['LPL', 2016, 'Summer', 'EDward Gaming'], ['LPL', 2017, 'Spring', 'Team WE'], ['LPL', 2017, 'Summer', 'EDward Gaming'],
    ['LPL', 2018, 'Spring', 'Royal Never Give Up'], ['LPL', 2018, 'Summer', 'Royal Never Give Up'], ['LPL', 2019, 'Spring', 'Invictus Gaming'], ['LPL', 2019, 'Summer', 'FunPlus Phoenix'],
    ['LPL', 2020, 'Spring', 'JD Gaming'], ['LPL', 2020, 'Summer', 'Top Esports'], ['LPL', 2021, 'Spring', 'Royal Never Give Up'], ['LPL', 2021, 'Summer', 'EDward Gaming'],
    ['LPL', 2022, 'Spring', 'Royal Never Give Up'], ['LPL', 2022, 'Summer', 'JD Gaming'], ['LPL', 2023, 'Spring', 'JD Gaming'], ['LPL', 2023, 'Summer', 'JD Gaming'],
    ['LPL', 2024, 'Spring', 'Bilibili Gaming'], ['LPL', 2024, 'Summer', 'Bilibili Gaming'], ['LPL', 2025, 'Split 1', 'Top Esports'], ['LPL', 2025, 'Split 2', "Anyone's Legend"],
    ['LPL', 2025, 'Split 3', 'Bilibili Gaming'], ['LPL', 2026, 'Split 1', 'Bilibili Gaming'], ['LPL', 2026, 'Split 2', 'Bilibili Gaming'], ['LPL', 2026, 'Split 3', "Anyone's Legend"]],
  LEC: [...[[2014, 'Spring', 'Fnatic'], [2014, 'Summer', 'Alliance'], [2015, 'Spring', 'Fnatic'], [2015, 'Summer', 'Fnatic'], [2016, 'Spring', 'G2 Esports'], [2016, 'Summer', 'G2 Esports'],
      [2017, 'Spring', 'G2 Esports'], [2017, 'Summer', 'G2 Esports'], [2018, 'Spring', 'Fnatic'], [2018, 'Summer', 'Fnatic']].map(t => ['EU LCS', ...t]),
    ...[[2019, 'Spring', 'G2 Esports'], [2019, 'Summer', 'G2 Esports'], [2020, 'Spring', 'G2 Esports'], [2020, 'Summer', 'G2 Esports'], [2021, 'Spring', 'MAD Lions KOI'], [2021, 'Summer', 'MAD Lions KOI'],
      [2022, 'Spring', 'G2 Esports'], [2022, 'Summer', 'Rogue'], [2023, 'Winter', 'G2 Esports'], [2023, 'Spring', 'MAD Lions KOI'], [2023, 'Summer', 'G2 Esports'], [2023, 'Finals', 'G2 Esports'],
      [2024, 'Winter', 'G2 Esports'], [2024, 'Spring', 'G2 Esports'], [2024, 'Summer', 'G2 Esports'], [2024, 'Finals', 'G2 Esports'], [2025, 'Winter', 'Karmine Corp'], [2025, 'Spring', 'Movistar KOI'],
      [2025, 'Summer', 'G2 Esports'], [2026, 'Versus', 'G2 Esports'], [2026, 'Spring', 'G2 Esports'], [2026, 'Summer', 'G2 Esports']].map(t => ['LEC', ...t])],
  LCS: [...[[2014, 'Spring', 'Cloud9'], [2014, 'Summer', 'TSM'], [2015, 'Spring', 'TSM'], [2015, 'Summer', 'Counter Logic Gaming'], [2016, 'Spring', 'Counter Logic Gaming'], [2016, 'Summer', 'TSM'],
      [2017, 'Spring', 'TSM'], [2017, 'Summer', 'TSM'], [2018, 'Spring', 'Team Liquid'], [2018, 'Summer', 'Team Liquid']].map(t => ['NA LCS', ...t]),
    ...[[2019, 'Spring', 'Team Liquid'], [2019, 'Summer', 'Team Liquid'], [2020, 'Spring', 'Cloud9'], [2020, 'Summer', 'TSM'], [2021, 'Spring', 'Cloud9'], [2021, 'Summer', '100 Thieves'],
      [2022, '', 'Evil Geniuses'], [2022, 'Summer', 'Cloud9'], [2023, 'Spring', 'Cloud9'], [2023, 'Summer', 'NRG'], [2024, 'Spring', 'Team Liquid'], [2024, 'Summer', 'FlyQuest'],
      [2026, 'Spring', 'LYON'], [2026, 'Summer', 'Team Liquid']].map(t => ['LCS', ...t]),
    ['LTA N', 2025, 'Split 2', 'FlyQuest'], ['LTA', 2025, '', 'FlyQuest']],
};
const TEAMS = ['T1', 'Gen.G', 'KT Rolster', 'Dplus Kia', 'Hanwha Life Esports', 'Kiwoom DRX', 'Samsung Galaxy', 'Fnatic', 'G2 Esports', 'MAD Lions KOI', 'Team Vitality', 'SK Gaming', 'Rogue', 'Origen',
  'Misfits Gaming', 'FC Schalke 04 Esports', 'Splyce', 'H2k-Gaming', 'Karmine Corp', 'Cloud9', 'TSM', 'Team Liquid', 'Counter Logic Gaming', '100 Thieves', 'FlyQuest', 'Immortals', 'Dignitas', 'Evil Geniuses',
  'Echo Fox', 'Golden Guardians', 'EDward Gaming', 'Royal Never Give Up', 'Invictus Gaming', 'FunPlus Phoenix', 'Bilibili Gaming', 'JD Gaming', 'Top Esports', 'Team WE', 'LGD Gaming', 'Weibo Gaming'];
const STARS = ['Faker', 'Rekkles', 'Caps', 'Perkz', 'Jankos', 'Wunder', 'Hylissang', 'Upset', 'Humanoid', 'Mikyx', 'xPeke', 'Froggen', 'Doublelift', 'Bjergsen', 'Sneaky', 'CoreJJ', 'Impact', 'Jensen', 'Blaber',
  'Deft', 'Ruler', 'ShowMaker', 'Chovy', 'Canyon', 'Keria', 'Gumayusi', 'Oner', 'Zeus', 'Peanut', 'Doran', 'Kiin', 'Lehends', 'Smeb', 'Uzi', 'TheShy', 'Rookie', 'Knight', 'Bin', 'Viper', 'Scout', 'Meiko', 'JackeyLove', 'Ming', 'Xiaohu'];

export function generatePro({ players, teams }, { fame = {} } = {}) {
  const out = [];
  const famed = new Map(Object.entries(fame).map(([k, v]) => [norm(k), v]));
  const chFame = ch => famed.get(norm(ch)) ?? 15;
  const team = t => MERGE[t] || t;
  // A person is identified by the data's player id, so two players sharing a name are not mixed up.
  const who = r => r.id || 'name:' + norm(r.pl);
  const games = new Map(), nameOf = new Map(), teamGames = new Map();
  for (const r of players) { games.set(who(r), (games.get(who(r)) || 0) + 1); nameOf.set(who(r), r.pl); teamGames.set(team(r.team), (teamGames.get(team(r.team)) || 0) + 1); }
  const maxTm = Math.max(...teamGames.values());
  const playerEntries = rows => { const m = new Map(); for (const r of rows) m.set(who(r), (m.get(who(r)) || 0) + 1); return [...m].map(([id, count]) => ({ name: nameOf.get(id), count, glob: games.get(id) })); };
  const tally = (rows, key) => { const m = new Map(); for (const r of rows) m.set(key(r), (m.get(key(r)) || 0) + 1); return m; };
  const teamEntries = rows => [...tally(rows, r => team(r.team))].map(([name, count]) => ({ name, count, glob: teamGames.get(name), aliases: aliasesFor(name) }));
  const champEntries = rows => [...tally(rows.filter(r => r.ch), r => r.ch)].map(([name, count]) => ({ name, count, glob: chFame(name) }));
  const Q = (subtype, id, text, entries, pop, min = 6) => { const q = build({ id: `pro.${id}`, category: CAT, subtype, text, entries, min, max: 5000, pop }); if (q) out.push(q); return q; };
  const need = (rows, what) => { if (!rows.length) throw new Error('No match data for ' + what); return rows; };

  const worlds = players.filter(r => r.lg === 'WLDs'), msi = players.filter(r => r.lg === 'MSI');
  const inMajor = Object.fromEntries(Object.entries(MAJORS).map(([k, codes]) => [k, players.filter(r => codes.includes(r.lg))]));

  // ---- titles
  for (const [league, list] of Object.entries(TITLES)) {
    const rows = [], champions = [];
    for (const [lg, y, sp, tm] of list) {
      const all = need(players.filter(r => r.lg === lg && r.y === y && (r.sp || '') === sp && r.team === tm), `${tm} ${lg} ${y} ${sp}`);
      const finals = all.filter(r => r.po); // players who appeared in the playoffs; whole split if the data has no playoff games
      rows.push(...(finals.length >= 5 ? finals : all)); champions.push(all[0]);
    }
    Q('league title players', `title.${norm(league)}`, `Name a player who has won an ${league === 'LCS' ? 'LCS title (including NA LCS and LTA)' : league === 'LEC' ? 'LEC title (including EU LCS)' : `${league} title`}`, playerEntries(rows), 85);
    Q('league title teams', `titleteam.${norm(league)}`, `Name a team that has won the ${league === 'LCS' ? 'LCS (or NA LCS)' : league === 'LEC' ? 'LEC (or EU LCS)' : league}`, teamEntries(champions), 60, 5);
  }
  for (const [rows, key, label, pop] of [[worlds, 'worlds', 'the World Championship', 90], [msi, 'msi', 'MSI', 60]]) {
    const winners = [];
    for (const y of new Set(rows.map(r => r.y))) {
      const ko = rows.filter(r => r.y === y), last = ko.reduce((a, b) => (String(b.date) > String(a.date) ? b : a)); // the last game decides the title
      if (last.res !== '1') { const w = ko.find(r => r.gid === last.gid && r.res === '1'); winners.push(...ko.filter(r => r.team === w.team)); } else winners.push(...ko.filter(r => r.team === last.team));
    }
    Q('international winners', `won.${key}`, `Name a player who has won ${label}`, playerEntries(winners), pop);
    Q('international players', `at.${key}`, `Name a player who has played at ${label}`, playerEntries(rows), pop);
    Q('international teams', `teamsat.${key}`, `Name a team that has played at ${label}`, teamEntries(rows), pop - 20);
    for (const [pos, label2] of Object.entries(POS)) Q('international players by role', `at.${key}.${pos}`, `Name ${pos === 'bot' ? 'an' : 'a'} ${label2} who has played at ${label}`, playerEntries(rows.filter(r => r.pos === pos)), pop - 30);
    Q('international pentakills', `penta.${key}`, `Name a player who has scored a Pentakill at ${label}`, playerEntries(rows.filter(r => r.pk > 0)), pop - 40);
  }
  // ---- major leagues
  for (const [league, rows] of Object.entries(inMajor)) {
    const k = norm(league);
    Q('league players', `in.${k}`, `Name a player who has played in the ${league}`, playerEntries(rows), 70);
    Q('league teams', `teams.${k}`, `Name a team that has played in the ${league}`, teamEntries(rows), 55);
    for (const [pos, label] of Object.entries(POS)) Q('league players by role', `in.${k}.${pos}`, `Name ${pos === 'bot' ? 'an' : 'a'} ${label} who has played in the ${league}`, playerEntries(rows.filter(r => r.pos === pos)), 45);
    Q('league pentakills', `penta.${k}`, `Name a player who has scored a Pentakill in the ${league}`, playerEntries(rows.filter(r => r.pk > 0)), 40);
  }
  // ---- more than one major league
  const leaguesOf = new Map();
  for (const [league, rows] of Object.entries(inMajor)) for (const r of rows) (leaguesOf.get(who(r)) || leaguesOf.set(who(r), new Set()).get(who(r))).add(league);
  const majorRows = Object.values(inMajor).flat();
  Q('multi league players', 'multi', 'Name a player who has played in two or more of the LCK, LPL, LEC and LCS', playerEntries(majorRows.filter(r => leaguesOf.get(who(r)).size >= 2)), 80);
  const keys = Object.keys(MAJORS);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const [a, b] = [keys[i], keys[j]];
    Q('two league players', `both.${norm(a)}.${norm(b)}`, `Name a player who has played in both the ${a} and the ${b}`, playerEntries(majorRows.filter(r => leaguesOf.get(who(r)).has(a) && leaguesOf.get(who(r)).has(b))), 40, 10);
  }
  // ---- famous teams, star players, popular champions at Worlds
  for (const t of TEAMS) {
    const rows = need(players.filter(r => team(r.team) === t), t);
    Q('team players', `team.${norm(t)}`, `Name a player who has played for ${t}`, playerEntries(rows), Math.round(75 * Math.log1p(teamGames.get(t)) / Math.log1p(maxTm)), 8);
  }
  for (const s of STARS) {
    const mine = need(majorRows.concat(worlds, msi).filter(r => norm(r.pl) === norm(s)), s);
    const id = [...tally(mine, who)].sort((a, b) => b[1] - a[1])[0][0];
    Q('star champions', `star.${norm(s)}`, `Name a champion ${nameOf.get(id)} has played in pro play`, champEntries(players.filter(r => who(r) === id)), s === 'Faker' ? 70 : 40, 12);
  }
  const atWorlds = new Map();
  for (const r of worlds) if (r.ch) (atWorlds.get(r.ch) || atWorlds.set(r.ch, new Set()).get(r.ch)).add(who(r));
  for (const [ch, set] of atWorlds) if (set.size >= 40 && chFame(ch) >= 40) Q('worlds champion players', `worldspick.${norm(ch)}`, `Name a player who has played ${ch} at the World Championship`, playerEntries(worlds.filter(r => r.ch === ch)), Math.round(chFame(ch) / 2));
  return { questions: out };
}
