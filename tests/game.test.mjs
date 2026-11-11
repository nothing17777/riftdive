import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.mjs';
import { DEMO } from '../src/demo.mjs';
import { POOL, promptsFor } from '../src/content/bank.mjs';
import { SITE } from '../src/config.mjs';
import { documents } from '../src/docs.mjs';
import { etDate, resetAt, normalize, matchAnswer, TIERS } from '../public/rules.mjs';
import { homePage } from '../src/html.mjs';

function database(){
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0002_pause.sql',import.meta.url),'utf8'));
  const prepare=sql=>({
    bind(...args){
      const s=db.prepare(sql);
      return {
        async first(){return s.get(...args)||null},
        async all(){return {results:s.all(...args)}},
        async run(){const r=s.run(...args);return {success:true,meta:{changes:Number(r.changes)}}},
      };
    },
    async first(){return db.prepare(sql).get()||null},
  });
  return{prepare,async batch(statements){db.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}},close:()=>db.close()};
}
function service(){const env={DB:database(),BUCKET:{put:async()=>{},get:async()=>null},LOCAL_DEVELOPMENT:'true',REFERENCE_SYNC:'false',ASSETS:{fetch:async()=>new Response('not found',{status:404})}};let cookie='';return{env,async call(path,data,extra={}){const r=await worker.fetch(new Request('http://localhost:3051'+path,{...(data===undefined?{}:{method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'application/json','Cookie':cookie,...extra}}),...(data===undefined?{headers:{Cookie:cookie,...extra}}:{})}),env,{});if(r.headers.get('Set-Cookie'))cookie=r.headers.get('Set-Cookie').split(';')[0];return{status:r.status,body:await r.json()}},cookie:()=>cookie};}

test('New York reset follows DST rather than device midnight',()=>{
  assert.equal(etDate(Date.parse('2026-10-17T03:59:59Z')),'2026-10-16');
  assert.equal(etDate(Date.parse('2026-10-17T04:00:00Z')),'2026-10-17');
  assert.equal(new Date(resetAt('2026-10-17')).toISOString(),'2026-10-18T04:00:00.000Z');
  assert.equal(new Date(resetAt('2026-12-17')).toISOString(),'2026-12-18T05:00:00.000Z');
});
test('prompt bank: daily set is deterministic, has 7 distinct prompts and a top-tier answer in each',()=>{
  const a=promptsFor('2026-11-10'),b=promptsFor('2026-11-10'),c=promptsFor('2026-11-13');
  assert.deepEqual(a,b);assert.equal(a.length,7);assert.equal(new Set(a.map(p=>p.id)).size,7);assert.notDeepEqual(a.map(p=>p.id),c.map(p=>p.id));
  for(const day of ['2026-11-10','2026-12-01','2027-01-15'])for(const p of promptsFor(day)){assert.ok(p.answers.some(x=>x.tier==='krillion'),p.id);assert.ok(p.answers.every(x=>TIERS[x.tier]));}
  assert.ok(new Set(POOL.map(p=>p.id)).size===POOL.length);
});
test('answer matching normalizes accents, uses aliases and avoids short fuzzy guesses',()=>{
  const demacia=POOL.find(p=>p.id==='demacia'),prompts=promptsFor('2026-11-10');
  const answers=[...(Object.hasOwn(Object,'x')?[]:[])];void answers;
  const d=promptsFor('2026-11-10').find(p=>p.id==='demacia')||{answers:demacia.answers.map(([answer,f,...aliases])=>({answer,tier:'plankton',aliases}))};
  assert.equal(normalize('Kai’Sa & Co'),'kaisaandco');
  assert.equal(matchAnswer('j4',d.answers).answer,'Jarvan IV');
  assert.equal(matchAnswer('Jarvn IV',d.answers).correction,true);
  assert.equal(matchAnswer('Garen',d.answers).correction,false);
  assert.equal(matchAnswer('zzzzzzzzzz',d.answers),null);
  assert.equal(matchAnswer('Gar',d.answers),null);void prompts;
});
test('seven rounds are scored on server; retries cannot duplicate points; other browsers cannot read the run',async()=>{
  const s=service();let{body:game}=await s.call('/api/start',{});const id=game.runId;
  const today=promptsFor(etDate());
  const rejected=await s.call('/api/answer',{runId:id,round:0,answer:'zzzzzzzzzz'});assert.equal(rejected.body.rejected,true);
  for(let i=0;i<7;i++){
    const answer=today[i].answers.find(a=>a.tier==='krillion').answer;
    const result=await s.call('/api/answer',{runId:id,round:i,answer,confirm:true,score:99999});assert.equal(result.status,200);assert.equal(result.body.result.score,TIERS.krillion.score);game=result.body.state;
    const duplicate=await s.call('/api/answer',{runId:id,round:i,answer});assert.equal(duplicate.body.alreadyScored,true);assert.equal(duplicate.body.state.results.length,i+1);
    if(i<6){const n=await s.call('/api/next',{runId:id});assert.equal(n.body.round,i+1);}
  }
  assert.equal(game.score,700);assert.equal(game.completed,true);
  const same=await s.call('/api/start',{});assert.equal(same.body.runId,id);
  const review=await s.call('/api/review?run='+id);assert.equal(review.status,200);assert.equal(review.body.betterThan,null);assert.equal(review.body.population,0);
  const other=service();const missing=await other.call('/api/state?run='+id);assert.equal(missing.status,404);
  const csrf=await s.call('/api/start',{}, {Origin:'https://evil.example'});assert.equal(csrf.status,403);
  s.env.DB.close();other.env.DB.close();
});
test('review stays locked, pause is server-side and practice is separate',async()=>{
  const s=service();const{body:g}=await s.call('/api/start',{});
  assert.equal((await s.call('/api/review?run='+g.runId)).status,403);
  const paused=await s.call('/api/pause',{runId:g.runId,paused:true});assert.ok(paused.body.pausedAt);
  const resumed=await s.call('/api/pause',{runId:g.runId,paused:false});assert.equal(resumed.body.pausedAt,null);assert.ok(resumed.body.roundStart>=g.roundStart);
  const practice=await s.call('/api/start',{practice:true});assert.notEqual(practice.body.runId,g.runId);assert.equal(practice.body.mode,'practice');
  s.env.DB.close();
});
test('expired server windows cannot score late answers or be revived by pausing',async()=>{
  const s=service();const{body:g}=await s.call('/api/start',{});
  s.env.LOCAL_DEVELOPMENT='false';
  await s.env.DB.prepare('UPDATE runs SET round_start=? WHERE id=?').bind(Date.now()-30000,g.runId).run();
  const paused=await s.call('/api/pause',{runId:g.runId,paused:true});assert.equal(paused.body.pausedAt,null);
  const today=await s.call('/api/today');const late=await s.call('/api/answer',{runId:g.runId,round:0,answer:'anything',confirm:true,timeout:true});
  assert.equal(late.body.result.score,0);assert.equal(late.body.state.round,1);void today;s.env.DB.close();
});
test('the service makes no external puzzle requests and exposes no sync endpoint',async()=>{
  const s=service();const original=globalThis.fetch;let called=false;globalThis.fetch=async(...a)=>{called=true;return original(...a)};
  try{await s.call('/api/today');const r=await s.call('/api/admin/sync',{});assert.equal(r.status,404);assert.equal(called,false);}finally{globalThis.fetch=original;s.env.DB.close();}
});
test('home page is League-branded, has an expandable guide and the required Riot disclaimer',()=>{
  const html=homePage();assert.ok(html.includes('Rift Dive'));assert.ok(html.includes('<details id="guide"'));assert.ok(html.includes('isn’t endorsed by Riot Games'));
  assert.ok(!/openkrillion\.com|analytics\.howtosurvive|plausible\.io|krillion\.io\/api/i.test(html));assert.ok(html.includes('Built on the MIT-licensed OpenKrillion engine'));
});
test('docs are minimal, UTF-8 and not SPA HTML',async()=>{
  const s=service();for(const path of Object.keys(documents()))for(const method of ['GET','HEAD']){const r=await worker.fetch(new Request('http://localhost:3051'+path,{method}),s.env,{});assert.equal(r.status,200);assert.match(r.headers.get('Content-Type'),/text\/plain; charset=utf-8/);const body=await r.text();if(method==='HEAD')assert.equal(body,'');else{assert.ok(body.startsWith('# Rift Dive'));assert.ok(!body.includes('<!doctype html>'));}}s.env.DB.close();
});
