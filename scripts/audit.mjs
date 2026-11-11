import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { homePage } from '../src/html.mjs';
import { POOL } from '../src/content/bank.mjs';

const html=homePage();
assert.ok(html.includes('https://riftdive.gg/'));
assert.ok(html.includes('isn’t endorsed by Riot Games'));
assert.ok(!/openkrillion\.com|analytics\.howtosurvive/i.test(html),'Previous owner branding or analytics left in the page');
for(const p of POOL)assert.ok(p.answers.length>=5,'Prompt too small: '+p.id);
const scan=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await scan(path);else if(/\.(mjs|js|json|jsonc|md|txt|sql|html|css|example)$/.test(path)){const text=await readFile(path,'utf8');assert.ok(!/gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text),'Sensitive material in '+path);}}};
for(const dir of ['src','public','scripts','tests','migrations'])await scan(dir);
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));assert.equal(config.d1_databases[0].database_id,'00000000-0000-0000-0000-000000000000');assert.ok(!config.account_id);
console.log(JSON.stringify({ok:true,prompts:POOL.length,publicConfigSanitized:true}));
