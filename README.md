# Rift Dive

An unofficial, fan-made daily League of Legends trivia game. Seven prompts, 25 seconds each. The rarer your answer, the deeper you dive.

Rift Dive isn’t endorsed by Riot Games and doesn’t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## How it works

- Everyone gets the same seven prompts each day (champions by region, lore, Arcane, items and spells, objectives, skins, music, pro play).
- Every accepted answer has a fixed **familiarity score**, set in `src/content/bank.mjs`, that maps to one of six tiers: Minion 10, Big Brain 15, Jungler 30, Elite 60, Elder 85, Pentakill 100. Other players' answers never change your score.
- The server owns the timer and the score; the browser only renders. Typos are corrected with confirmation.
- Every point sinks you 10 m. 700 points is the Rift Core.

## Run locally

Node.js 22+ and npm. No account or API key is needed.

```sh
npm ci
npm run build
npm run db:local
npm run dev     # http://localhost:3051
npm test
```

Wrangler runs a local Worker with SQLite-backed D1. State lives in the ignored `.wrangler/` folder.

## Adding prompts

Add a `P(id, category, text, [[answer, familiarity, ...aliases], ...])` entry to `POOL` in `src/content/bank.mjs`. Familiarity is 0–100 (higher = more obvious = fewer points). The rarest answer in each prompt is always promoted to Pentakill. Check facts against the current patch before shipping.

## Credits and license

The engine (server-scored rounds, canvas descent, synthesized Web Audio) is derived from [OpenKrillion](https://github.com/VulcanEon/openkrillion.com-service), MIT-licensed. This project is independent of krillion.io and of Riot Games. VT323 font: SIL Open Font License (see `public/assets/VT323-LICENSE.txt`). Code is MIT; see `LICENSE`.
