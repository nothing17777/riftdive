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
- Oracle's Elixir CSVs `2014.csv` ... `2026.csv` in one folder (Drive folder: https://drive.google.com/drive/folders/1gLSw0RLjBbtaNy0dgnGQDAZOHIgCe-HH; rename `<year>_LoL_esports_match_data_from_OraclesElixir.csv` to `<year>.csv`, symlinks work).
- Meraki `meraki-champs.json` and `meraki-items.json` from https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/ (champions.json / items.json).
```sh
node tools/build-pool.mjs <oe-csv-folder> <folder-with-meraki-json> public/q
```

## Where things are
- `tools/gen/pro.mjs`, `tools/gen/unique.mjs`, `tools/gen/game.mjs`: question generators (pro play, records/cross-league, champions/lore/items/skins)
- `tools/data/`: champion familiarity ratings (LLM) + ranked pick volume + blended prior
- `src/content/pool.mjs`: daily selection from the pool; `public/entities.mjs`: dictionary + suggestions
- `static/static-api.mjs`: in-browser API used by the GitHub Pages build

## Adapting tiers to real players (Worker + D1 only)
`answer_counts` (migration 0003) counts accepted daily answers per question, with no player ids. Export it and re-tier the shards:
```sh
npx wrangler d1 execute riftdive --remote --json --command "SELECT qid,answer,n FROM answer_counts" > counts.json
node tools/adapt.mjs counts.json public/q
```
The prior counts as about 40 players (`tools/lib/adapt.mjs`). The static GitHub Pages build has no server, so it cannot collect counts.

## Known gaps
- Pro Play is ~95% of the bank (about 21k questions, many about minor-league players); Music is tiny (6) and skin-name / item tiers are proxies (`lc:1`).
- Meraki data (champions/items) is a snapshot; regenerate when new champions ship.
- Familiarity for items, players and teams is not LLM-rated yet.
