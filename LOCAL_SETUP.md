# Working on Rift Dive locally

## Run the game
```sh
npm ci
npm run build          # pixel assets + fonts
npm run db:local       # local SQLite for the Worker
npm run dev            # http://localhost:3051
npm test               # 14 tests
npm run build:static   # builds dist/ (what GitHub Pages serves)
```
The question bank is already generated and committed in `public/q/` (index, 64 shards, `entities.json`), so the game runs without any raw data.

## Regenerate the question bank (optional)
Needs raw data that is NOT in the repo:
- Oracle's Elixir CSVs `2014.csv` ... in one folder (Drive folder: https://drive.google.com/drive/folders/1gLSw0RLjBbtaNy0dgnGQDAZOHIgCe-HH; 2020-2026 were quota-blocked when I tried, so only 2014-2019 were used; download them yourself and name them `<year>.csv`).
- Meraki `meraki-champs.json` and `meraki-items.json` from https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/ (champions.json / items.json).
```sh
node tools/build-pool.mjs <oe-csv-folder> <folder-with-meraki-json> public/q
```

## Where things are
- `tools/gen/pro.mjs`, `tools/gen/unique.mjs`, `tools/gen/game.mjs`: question generators (pro play, records/cross-league, champions/lore/items/skins)
- `tools/data/`: champion familiarity ratings (LLM) + ranked pick volume + blended prior
- `src/content/pool.mjs`: daily selection from the pool; `public/entities.mjs`: dictionary + suggestions
- `static/static-api.mjs`: in-browser API used by the GitHub Pages build

## Known gaps
- Pro data stops at 2019 (see above). Lore/music/other-League content is thin (Music has 4 questions).
- The newest UI (suggestion dropdown, rejected-guess chips, Skip) is unit-tested but was not yet checked visually in a browser.
- Familiarity scores are estimates; nothing yet adapts to real player answers.
