// Hand-written sets for parts of League that Meraki/Oracle's Elixir do not cover (runes, modes, maps, spin-offs, ranks, wards...).
// [category, id, question, [[name, familiarity 0..1, ...aliases]]]. Familiarity values are rough estimates (lc:1); facts should be re-checked each season.
import { build } from '../lib/question.mjs';

const SETS = [
  ['Game', 'keystones', 'Name a keystone rune', [['Electrocute', .85], ['Conqueror', .85], ['Press the Attack', .7, 'PTA'], ['Lethal Tempo', .6], ['Fleet Footwork', .55], ['Dark Harvest', .6], ['Hail of Blades', .6], ['Summon Aery', .5, 'Aery'], ['Arcane Comet', .45, 'Comet'], ['Phase Rush', .45], ['Grasp of the Undying', .55, 'Grasp'], ['Aftershock', .5], ['Guardian', .35], ['Glacial Augment', .4, 'Glacial'], ['Unsealed Spellbook', .3], ['First Strike', .4]]],
  ['Game', 'modes', 'Name a League of Legends game mode', [['ARAM', .95, 'All Random All Mid'], ['Arena', .6], ['URF', .7, 'Ultra Rapid Fire'], ['One for All', .45], ['Nexus Blitz', .35], ['Ultimate Spellbook', .35], ['Doom Bots of Doom', .2, 'Doom Bots'], ['Ascension', .15], ['Dominion', .15], ['Hexakill', .15], ['Poro King', .15], ['Black Market Brawlers', .12], ['Snowdown Showdown', .12], ['Swarm', .3], ['Odyssey: Extraction', .1, 'Odyssey']]],
  ['Game', 'maps', 'Name a League of Legends map', [["Summoner's Rift", .98, 'Summoners Rift', 'SR'], ['Howling Abyss', .85], ['Twisted Treeline', .45], ['Crystal Scar', .2], ['Proving Grounds', .15], ["Butcher's Bridge", .1, 'Butchers Bridge'], ['Cosmic Ruins', .05]]],
  ['Game', 'ranks', 'Name a ranked tier in League of Legends', [['Iron', .9], ['Bronze', .9], ['Silver', .9], ['Gold', .95], ['Platinum', .85], ['Emerald', .6], ['Diamond', .9], ['Master', .75], ['Grandmaster', .55], ['Challenger', .85]]],
  ['Game', 'wards', 'Name a ward, trinket or vision item', [['Control Ward', .95, 'Pink Ward'], ['Warding Totem', .8, 'Stealth Ward', 'Trinket'], ['Farsight Alteration', .5, 'Farsight', 'Blue Trinket'], ['Oracle Lens', .4, 'Sweeping Lens', 'Oracle Alteration'], ['Vision Ward', .4], ['Zombie Ward', .2], ['Ghost Poro', .15], ['Eye of the Herald', .1], ['Stealth Ward', .6]]],
  ['Champions', 'classes', 'Name a champion class or subclass', [['Fighter', .95], ['Mage', .95], ['Marksman', .9], ['Assassin', .9], ['Tank', .9], ['Support', .9], ['Juggernaut', .45], ['Diver', .4], ['Skirmisher', .35], ['Burst', .35], ['Battlemage', .3], ['Enchanter', .35], ['Catcher', .3], ['Artillery', .3], ['Vanguard', .2], ['Warden', .2], ['Specialist', .2]]],
  ['Lore', 'spinoffs', 'Name a League of Legends spin-off game or card game', [['Teamfight Tactics', .95, 'TFT'], ['Legends of Runeterra', .6, 'LoR'], ['Wild Rift', .75], ['Ruined King', .35, 'Ruined King: A League of Legends Story'], ['Hextech Mayhem', .2, 'Hextech Mayhem: A League of Legends Story'], ['Song of Nunu', .2, 'Song of Nunu: A League of Legends Story'], ['The Mageseeker', .2, 'The Mageseeker: A League of Legends Story'], ['Convergence', .15, 'Convergence: A League of Legends Story'], ['Riftbound', .3], ['2XKO', .35, 'Project L']]],
  ['Lore', 'species', 'Name a species or people of Runeterra', [['Humans', .9, 'Human'], ['Yordles', .9, 'Yordle'], ['Vastaya', .6, 'Vastayan'], ['Darkin', .6], ['Celestials', .3, 'Celestial'], ['Brackern', .2], ['Magicborn', .15], ['Iceborn', .15], ['Golems', .15, 'Golem'], ['Spirits', .3, 'Spirit'], ['Trolls', .2, 'Troll'], ['Undead', .4]]],
  ['Cosmetics', 'skin-tiers', 'Name a skin rarity or tier', [['Epic', .8], ['Legendary', .9], ['Ultimate', .6], ['Mythic', .6], ['Transcendent', .3], ['Exalted', .15], ['Prestige', .5]]],
];

export function generateCurated() {
  const out = [];
  for (const [category, id, text, rows] of SETS) {
    const r = build({ id: `k.${id}`, category, subtype: 'curated sets', text, entries: rows.map(([name, fame, ...aliases]) => ({ name, fame, aliases })), mode: 'fame', min: 7, max: 150, pop: 50 });
    if (r) { r.lc = 1; out.push(r); } else console.warn('curated set rejected:', id);
  }
  return { questions: out };
}
