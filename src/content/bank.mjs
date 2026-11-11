// League of Legends prompt bank.
// Each answer is [name, familiarity 0-100, ...aliases]. Familiarity is a fixed, hand-set estimate of how
// well-known the answer is (the plan is to derive it from wiki pageviews / mention counts and review by hand).
// It is NOT derived from live player votes. Higher familiarity = more obvious = fewer points.
// Verify facts against the current patch and lore before shipping.
const TIER_CUTS = [[60, 'plankton'], [30, 'tooclever'], [15, 'schooler'], [6, 'rare'], [2, 'deepcut'], [0, 'krillion']];
export const tierFor = familiarity => TIER_CUTS.find(([min]) => familiarity >= min)[1];

const P = (id, category, text, answers) => ({ id, category, text, answers });

export const POOL = [
  P('demacia', 'Champions', 'Name a champion from Demacia', [
    ['Garen', 100], ['Lux', 90], ['Jarvan IV', 45, 'jarvan', 'j4'], ['Fiora', 40], ['Galio', 30], ['Vayne', 28], ['Sona', 22],
    ['Lucian', 18], ['Xin Zhao', 14, 'xin'], ['Quinn', 12], ['Poppy', 12], ['Shyvana', 8], ['Sylas', 6], ['Kayle', 5],
    ['Morgana', 2], ['Taric', 2]]),
  P('noxus', 'Champions', 'Name a champion from Noxus', [
    ['Darius', 100], ['Draven', 70], ['Katarina', 60], ['Swain', 45], ['Talon', 38], ['Riven', 34], ['Vladimir', 20, 'vlad'],
    ['Sion', 18], ['Samira', 16], ['LeBlanc', 12], ['Cassiopeia', 8, 'cass'], ['Kled', 6], ['Ambessa', 7], ['Rell', 3], ['Mel', 3], ['Briar', 2]]),
  P('freljord', 'Champions', 'Name a champion from the Freljord', [
    ['Ashe', 100], ['Sejuani', 55], ['Lissandra', 50], ['Tryndamere', 48, 'trynd'], ['Trundle', 40], ['Volibear', 38, 'voli'],
    ['Braum', 35], ['Nunu & Willump', 30, 'nunu', 'nunu and willump', 'willump'], ['Udyr', 22], ['Olaf', 20], ['Anivia', 18],
    ['Gnar', 12], ['Ornn', 10]]),
  P('ionia', 'Champions', 'Name a champion from Ionia', [
    ['Yasuo', 100], ['Zed', 90], ['Ahri', 85], ['Akali', 75], ['Lee Sin', 70], ['Irelia', 60], ['Master Yi', 55, 'yi'], ['Jhin', 50],
    ['Kayn', 48], ['Shen', 45], ['Yone', 65], ['Sett', 42], ['Kennen', 40], ['Karma', 35], ['Wukong', 30], ['Varus', 28],
    ['Xayah', 25], ['Syndra', 22], ['Rakan', 18], ['Lillia', 15]]),
  P('piltover-zaun', 'Champions', 'Name a champion from Piltover or Zaun', [
    ['Jinx', 90], ['Caitlyn', 85], ['Vi', 70], ['Jayce', 60], ['Ezreal', 55], ['Ekko', 50], ['Blitzcrank', 45, 'blitz'],
    ['Heimerdinger', 40, 'heimer', 'donger'], ['Camille', 35], ['Viktor', 32], ['Singed', 28], ['Warwick', 26], ['Twitch', 24],
    ['Orianna', 30], ['Seraphine', 25], ['Dr. Mundo', 20, 'mundo', 'doctor mundo'], ['Urgot', 12], ['Zeri', 10], ['Renata Glasc', 5, 'renata'], ['Zac', 8]]),
  P('shadow-isles', 'Champions', 'Name a champion from the Shadow Isles', [
    ['Thresh', 100], ['Hecarim', 65], ['Kalista', 55], ['Karthus', 50], ['Mordekaiser', 60, 'morde'], ['Yorick', 40],
    ['Gwen', 45], ['Viego', 55], ['Senna', 50], ['Maokai', 35], ['Vex', 8]]),
  P('yordle', 'Champions', 'Name a yordle champion', [
    ['Teemo', 100], ['Tristana', 70, 'trist'], ['Poppy', 60], ['Lulu', 55], ['Veigar', 50], ['Kennen', 25], ['Rumble', 24],
    ['Ziggs', 22], ['Heimerdinger', 20, 'heimer'], ['Corki', 18], ['Gnar', 20], ['Kled', 14], ['Fizz', 12], ['Vex', 12], ['Yuumi', 6]]),
  P('marksman', 'Champions', 'Name a champion who is a marksman (ADC)', [
    ['Jinx', 100], ['Caitlyn', 90], ['Ashe', 85], ['Vayne', 80], ['Ezreal', 75], ['Jhin', 70], ['Miss Fortune', 65, 'mf'],
    ['Lucian', 55], ['Kai\'Sa', 60, 'kaisa'], ['Draven', 50], ['Tristana', 45], ['Twitch', 40], ['Kog\'Maw', 25, 'kogmaw'],
    ['Varus', 28], ['Xayah', 22], ['Aphelios', 20], ['Zeri', 14], ['Smolder', 6], ['Nilah', 4], ['Corki', 3], ['Quinn', 2]]),
  P('summoner-spell', 'Game', 'Name a summoner spell', [
    ['Flash', 100], ['Ignite', 90], ['Teleport', 75, 'tp'], ['Heal', 60], ['Smite', 55], ['Barrier', 45], ['Exhaust', 38],
    ['Ghost', 35], ['Cleanse', 30], ['Clarity', 4], ['Mark', 4, 'snowball']]),
  P('starting-item', 'Game', 'Name an item you can buy in the first minute of a Summoner’s Rift game', [
    ['Doran’s Blade', 100, 'dorans blade', 'doran blade'], ['Doran’s Ring', 70, 'dorans ring'], ['Doran’s Shield', 55, 'dorans shield'],
    ['Health Potion', 60, 'pot', 'potion'], ['Dark Seal', 30], ['Cull', 25], ['Long Sword', 22], ['Boots', 20],
    ['Control Ward', 18, 'pink ward', 'pink'], ['Refillable Potion', 14], ['Tear of the Goddess', 10, 'tear'],
    ['Amplifying Tome', 5, 'amp tome'], ['Corrupting Potion', 6], ['Faerie Charm', 3], ['Ruby Crystal', 3], ['Cloth Armor', 2]]),
  P('objective', 'Game', 'Name a neutral objective or monster on Summoner’s Rift', [
    ['Baron Nashor', 100, 'baron', 'nashor'], ['Dragon', 90, 'drake'], ['Rift Herald', 45, 'herald'], ['Elder Dragon', 35, 'elder'],
    ['Void Grubs', 25, 'grubs'], ['Scuttle Crab', 20, 'scuttle'], ['Red Brambleback', 16, 'red buff', 'red'],
    ['Blue Sentinel', 16, 'blue buff', 'blue'], ['Gromp', 14], ['Raptors', 14, 'raptor'], ['Krugs', 12, 'krug'],
    ['Murk Wolves', 10, 'wolves'], ['Atakhan', 8]]),
  P('dragon', 'Game', 'Name a type of elemental drake', [
    ['Infernal', 100, 'fire'], ['Mountain', 85, 'earth'], ['Ocean', 70, 'water'], ['Cloud', 65, 'air', 'wind'],
    ['Hextech', 40], ['Chemtech', 35]]),
  P('region', 'Lore', 'Name a region of Runeterra', [
    ['Demacia', 100], ['Noxus', 95], ['Ionia', 80], ['Piltover', 70], ['Zaun', 65], ['Freljord', 60], ['Shurima', 45],
    ['Bilgewater', 40], ['Shadow Isles', 38], ['Targon', 30], ['Bandle City', 18], ['The Void', 12, 'void'], ['Ixtal', 10]]),
  P('arcane', 'Lore', 'Name a character from the animated series Arcane', [
    ['Jinx', 100, 'powder'], ['Vi', 90], ['Jayce', 85], ['Caitlyn', 85], ['Viktor', 80], ['Silco', 70], ['Vander', 65],
    ['Mel', 55], ['Ekko', 50], ['Heimerdinger', 40, 'heimer'], ['Ambessa', 35], ['Sevika', 20], ['Singed', 15], ['Warwick', 10],
    ['Marcus', 4], ['Jericho', 2]]),
  P('pentakill', 'Music', 'Name a member of the metal band Pentakill', [
    ['Mordekaiser', 100, 'morde'], ['Sona', 70], ['Karthus', 60], ['Olaf', 55], ['Yorick', 40]]),
  P('kda', 'Music', 'Name a member of the virtual group K/DA', [
    ['Ahri', 100], ['Akali', 80], ['Evelynn', 60], ['Kai’Sa', 45, 'kaisa'], ['Seraphine', 12]]),
  P('true-damage', 'Music', 'Name a member of the virtual group True Damage', [
    ['Akali', 90], ['Yasuo', 85], ['Ekko', 70], ['Qiyana', 60], ['Senna', 40]]),
  P('worlds-anthem', 'Music', 'Name a League of Legends World Championship anthem', [
    ['Legends Never Die', 90], ['Phoenix', 70], ['Rise', 65], ['Warriors', 60], ['Take Over', 55], ['Burn It All Down', 40],
    ['Star Walkin’', 35, 'star walkin', 'star walking'], ['Ignite', 28], ['Gods', 25], ['Worlds Collide', 10],
    ['Heavy Is the Crown', 12, 'heavy is the crown']]),
  P('worlds-team', 'Pro Play', 'Name a team that has won the League of Legends World Championship', [
    ['T1', 100, 'skt', 'sk telecom t1', 'sktelecom t1', 'skt t1'], ['Fnatic', 30, 'fnc'], ['EDward Gaming', 22, 'edg'],
    ['Samsung Galaxy', 18, 'samsung'], ['DAMWON Gaming', 16, 'damwon', 'dwg', 'dwg kia', 'dplus kia'],
    ['FunPlus Phoenix', 14, 'fpx'], ['Invictus Gaming', 12, 'ig'], ['DRX', 8], ['Samsung White', 5], ['Taipei Assassins', 4, 'tpa']]),
  P('esports-region', 'Pro Play', 'Name a professional League of Legends league or region', [
    ['LCK', 100, 'korea'], ['LPL', 90, 'china'], ['LEC', 70, 'europe'], ['LCS', 65, 'north america', 'na'], ['CBLOL', 20, 'brazil'],
    ['LLA', 15, 'latin america'], ['PCS', 12], ['LJL', 10, 'japan'], ['VCS', 8, 'vietnam'], ['LCO', 5, 'oceania']]),
  P('skin-line', 'Cosmetics', 'Name a League of Legends skin line or universe', [
    ['Star Guardian', 100], ['K/DA', 85, 'kda'], ['PROJECT', 80, 'project'], ['Pulsefire', 75], ['Blood Moon', 70],
    ['Dark Star', 65], ['High Noon', 60], ['Arcade', 55], ['True Damage', 50], ['Spirit Blossom', 48], ['Pool Party', 40],
    ['Battle Academia', 38], ['Odyssey', 35], ['Lunar Revel', 30], ['Cyber Pop', 15], ['Crime City', 12], ['Withered Rose', 10],
    ['Broken Covenant', 8], ['Faerie Court', 7], ['Heavenscale', 6], ['Ruined', 5]]),
];

// Deterministic daily selection: 7 distinct prompts, never two of the same category in a row.
function seeded(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32; }
const hash = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function promptsFor(date) {
  const rand = seeded(hash(date)), pool = [...POOL];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picked = [];
  for (const p of pool) { if (picked.length < 7 && p.category !== picked.at(-1)?.category) picked.push(p); }
  for (const p of pool) { if (picked.length < 7 && !picked.includes(p)) picked.push(p); }
  return picked.map(({ id, category, text, answers }) => {
    const out = answers.map(([answer, familiarity, ...aliases]) => ({ answer, tier: tierFor(familiarity), aliases, familiarity }));
    // Every prompt must offer a 100-point gem: if nothing is rare enough in absolute terms, the least
    // familiar answer in the set is promoted to the top tier.
    if (!out.some(a => a.tier === 'krillion')) out.reduce((lo, a) => (a.familiarity < lo.familiarity ? a : lo)).tier = 'krillion';
    return { id, category, text, answers: out.map(({ familiarity, ...a }) => a) };
  });
}
export const LAUNCH = '2026-11-10'; // day #1
export const dayNumber = date => Math.floor((Date.parse(date) - Date.parse(LAUNCH)) / 86400000) + 1;
