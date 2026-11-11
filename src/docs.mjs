import { SITE, publicConfig } from './config.mjs';

export function documents(site = SITE) {
  const c = publicConfig(site);
  const brief = `# ${c.name}\n\n> An unofficial, fan-made daily League of Legends trivia game.\n\nPlay: ${c.origin}/\nSource: ${c.repository}\n\nSeven prompts, ${c.answerSeconds} seconds each. Rarer answers score up to 100 points; each point is ${c.metresPerPoint} metres of depth. Free to play, no accounts.\n\nNot endorsed by Riot Games. League of Legends is a trademark of Riot Games, Inc.\n`;
  return { '/llms.txt': brief };
}
