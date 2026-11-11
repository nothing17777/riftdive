// Browser-side stand-in for the Worker API, used by the GitHub Pages build.
// It applies the same rules (matching, tiers, timing) as src/worker.mjs, but state lives in this browser.
import { TIERS, matchAnswer, etDate, resetAt, ROUND_MS, PREVIEW_MS } from './rules.mjs';
import { promptsFor, dayNumber } from './content/bank.mjs';

const KEY = 'rd:static-db:v1';
let mem = null;
const load = () => { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(KEY)); } catch {} return (mem ||= { runs: {}, answers: [] }); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* private mode: keep in memory */ } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (error, status = 400) => json({ error }, status);
const puzzle = date => ({ date, dayNumber: dayNumber(date), source: 'Rift Dive prompt bank', prompts: promptsFor(date) });

function state(run) {
  const db = load(), p = puzzle(run.date);
  const results = db.answers.filter(a => a.run === run.id).sort((a, b) => a.round - b.round).map(({ round, rawAnswer, answer, tier, score }) => ({ round, rawAnswer, answer, tier, score }));
  return { date: p.date, dayNumber: p.dayNumber, sample: false, source: p.source, resetsAt: resetAt(p.date), prompts: p.prompts.map(({ id, text }) => ({ id, text })),
    runId: run.id, mode: run.mode, round: run.next_round, roundStart: run.round_start, pausedAt: run.paused_at || null, serverNow: Date.now(),
    completed: !!run.completed, results, score: results.reduce((s, r) => s + r.score, 0) };
}

function handle(path, url, init) {
  const db = load(), date = etDate(), method = (init?.method || 'GET').toUpperCase();
  let data = {};
  if (method === 'POST') { try { data = JSON.parse(init.body || '{}'); } catch { return fail('Invalid request.'); } }
  const run = db.runs[data.runId || url.searchParams.get('run')];
  if (method === 'GET' && path === 'today') { const p = puzzle(date); return json({ date, dayNumber: p.dayNumber, sample: false, source: p.source, resetsAt: resetAt(date), prompts: p.prompts.map(({ id, text }) => ({ id, text })) }); }
  if (method === 'GET' && path === 'health') return json({ ok: true, static: true });
  if (method === 'GET' && path === 'state') return run ? json(state(run)) : fail('Dive not found on this browser.', 404);
  if (method === 'GET' && path === 'review') {
    if (!run?.completed) return fail('Finish your dive before opening the answer sheet.', 403);
    const p = puzzle(run.date);
    return json({ prompts: p.prompts.map(q => ({ ...q, answers: q.answers.map(a => ({ ...a, score: TIERS[a.tier].score })).sort((a, b) => b.score - a.score || a.answer.localeCompare(b.answer)) })),
      population: 0, betterThan: null, dist: Array.from({ length: 71 }, () => 0) });
  }
  if (method !== 'POST') return fail('Unknown endpoint.', 404);
  if (path === 'start') {
    const mode = data.practice === true ? 'practice' : 'daily';
    let r = mode === 'daily' ? Object.values(db.runs).find(x => x.date === date && x.mode === 'daily') : null;
    if (!r) { r = { id: crypto.randomUUID(), date, mode, round_start: Date.now() + PREVIEW_MS, next_round: 0, completed: 0, paused_at: null }; db.runs[r.id] = r; save(); }
    return json(state(r));
  }
  if (path === 'feedback') return json({ ok: true });
  if (!run) return fail('Dive not found.', 404);
  if (path === 'pause') {
    if (data.paused === true && !run.completed && run.round_start !== null && !run.paused_at && Date.now() <= run.round_start + ROUND_MS) run.paused_at = Date.now();
    else if (data.paused === false && run.paused_at) { run.round_start += Date.now() - run.paused_at; run.paused_at = null; }
    save(); return json(state(run));
  }
  if (path === 'next') {
    if (run.paused_at) return fail('Close the menu to resume your dive.', 409);
    if (!run.completed && run.round_start === null) { run.round_start = Date.now() + PREVIEW_MS; save(); }
    return json(state(run));
  }
  if (path === 'answer') {
    if (run.paused_at) return fail('Close the menu to resume your dive.', 409);
    if (run.completed || run.round_start === null || data.round !== run.next_round) return json({ state: state(run), alreadyScored: true });
    const prompt = puzzle(run.date).prompts[run.next_round];
    const raw = typeof data.answer === 'string' ? data.answer.trim().slice(0, 256) : '';
    const late = Date.now() > run.round_start + ROUND_MS;
    const timely = !late || (data.timeout === true && Date.now() <= run.round_start + ROUND_MS + 1500);
    const match = raw && timely ? matchAnswer(raw, prompt.answers) : null;
    if (!match && raw && !late && !data.timeout) return json({ rejected: true, message: `“${raw}”: no echo. try again` });
    if (match?.correction && data.confirm !== true && !late && !data.timeout && data.previewCorrection !== false) return json({ correction: match.answer, original: raw });
    const result = { round: run.next_round, rawAnswer: raw || null, answer: match?.answer || null, tier: match?.tier || null, score: match ? TIERS[match.tier].score : 0, quip: null, promptText: prompt.text };
    db.answers.push({ run: run.id, round: result.round, rawAnswer: result.rawAnswer, answer: result.answer, tier: result.tier, score: result.score });
    run.next_round = result.round + 1; run.round_start = null; run.completed = result.round === 6 ? 1 : 0; save();
    return json({ result, state: state(run) });
  }
  return fail('Unknown endpoint.', 404);
}

const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const m = url.origin === location.origin && url.pathname.match(/\/api\/([a-z]+)$/);
  return m ? Promise.resolve(handle(m[1], url, init)) : realFetch(input, init);
};
