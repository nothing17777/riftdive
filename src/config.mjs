export const SITE = {
  name: 'Rift Dive', origin: 'https://riftdive.gg',
  repository: 'https://github.com/nothing17777/riftdive',
  description: 'Rift Dive is a free daily League of Legends trivia game. Seven prompts, 25 seconds each. Think rare, dive deeper, and share your score.',
  title: 'Rift Dive — The Daily League of Legends Dive',
  languages: ['en'], gameplayLanguage: 'en',
  price: { amount: 0, currency: 'USD', label: 'Free to play', checkout: false },
  rounds: 7, previewSeconds: 3, answerSeconds: 25, maxScore: 700, metresPerPoint: 10,
  models: [], credits: false, accounts: false,
  modes: ['daily', 'practice'],
  features: ['Daily seven-prompt trivia', 'Practice dives', 'Six rarity tiers', 'Typo correction with confirmation', 'Animated descent', 'Synthesized sound effects', 'Score and depth report', 'Answer review', 'Local history and streaks', 'Shareable results', 'Low-power and colorblind modes'],
  analytics: { plausible: '' },
};
export const publicConfig = site => ({ name: site.name, origin: site.origin, repository: site.repository, price: site.price, rounds: site.rounds, previewSeconds: site.previewSeconds, answerSeconds: site.answerSeconds, maxScore: site.maxScore, metresPerPoint: site.metresPerPoint, models: site.models, credits: site.credits, accounts: site.accounts, modes: site.modes, features: site.features, languages: site.languages, gameplayLanguage: site.gameplayLanguage });
