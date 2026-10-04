// UI race regression checks use controlled worker replies, not real inference.
// The separate browser-check.mjs exercises actual WASM retrieval and privacy.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const baseURL=new URL(process.env.TEST_BASE_URL||'http://127.0.0.1:4173');
assert.ok(['http:','https:'].includes(baseURL.protocol),'TEST_BASE_URL must use HTTP or HTTPS');
await fs.mkdir('output/playwright',{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
const requests=[],unexpectedRequests=[],blockedInfrastructureRequests=[];
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url());
 const challengePost=url.origin===baseURL.origin&&request.method()==='POST'&&url.pathname.startsWith('/cdn-cgi/challenge-platform/');
 const record={method:request.method(),url:challengePost?url.origin+'/cdn-cgi/challenge-platform/[redacted]':request.url(),resourceType:request.resourceType()};
 requests.push(record);
 if(url.origin!==baseURL.origin||request.method()!=='GET'||/(?:^|\/)embedding\.worker(?:[-.]|$)/i.test(url.pathname)||/\.(wasm|onnx)(?:$|\/)/i.test(url.pathname)){
  if(challengePost){
   blockedInfrastructureRequests.push(record);
  }else unexpectedRequests.push(record);
  await route.abort();
 }else await route.continue();
});
await context.routeWebSocket('**/*',socket=>{
 unexpectedRequests.push({method:'WEBSOCKET',url:socket.url(),resourceType:'websocket'});
 socket.close();
});
await context.addInitScript(()=>{
 window.__workerRequests=[];
 window.SharedWorker=class {constructor(){throw new Error('SharedWorker is forbidden in controlled UI tests');}};
 window.Worker=class {
  constructor(){window.__testWorker=this;}
  postMessage(data){if(data.type==='load')queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));else window.__workerRequests.push(data);}
  terminate(){}
  reply(data){this.onmessage({data});}
 };
});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(String(e)));
const check=name=>results.push({name,details:'passed'});
const rank=async()=>{await page.locator('#rank').click();return page.evaluate(()=>window.__workerRequests.at(-1));};
const reply=async(request,type='ranked')=>{
 const story=request.stories[0];
 await page.evaluate(({request,type,story})=>window.__testWorker.reply(type==='error'?{type,requestId:request.requestId,message:'Stale test error'}:{type,requestId:request.requestId,results:[{id:story.id,title:story.title,excerpt:{field:'action',text:story.action}}]}),{request,type,story});
};
const matched=async()=>{const request=await rank();await reply(request);assert.equal(await page.locator('.match').count(),1);return request;};
try{
 await page.goto(baseURL.href);
 assert.equal(await page.title(),'Rehearsal Mirror');
 assert.match(await page.locator('#results').innerText(),/No story cards yet/);
 assert.equal(await page.locator('#results-demo').isVisible(),true);
 await page.locator('#results-demo').click();
 assert.equal(await page.locator('.story').count(),3);
 assert.match(await page.locator('#model-status').innerText(),/Manual mode/);
 assert.equal(await page.evaluate(()=>window.__testWorker===undefined),true);
 await page.locator('#calendar-title').fill('Synthetic private title');
 const before=await page.evaluate(()=>localStorage.getItem('rehearsal-mirror-v1'));
 page.once('dialog',d=>d.dismiss());await page.locator('#results-demo').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('rehearsal-mirror-v1')),before);
 page.once('dialog',d=>d.accept());await page.locator('#results-demo').click();
 assert.match(await page.locator('#calendar-title').inputValue(),/Fictional/);
 check('Matching-area fictional demo is discoverable, requires replacement confirmation, and never loads AI automatically');

 await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#model-status').textContent.startsWith('Local AI ready'));
 await matched();const excerpt=await page.locator('.match p').innerText();
 await page.locator('#answer').pressSequentially('Synthetic answer retained while composing.');
 await page.locator('#duration').selectOption('90');await page.locator('#start').click();await page.locator('#start').click();await page.locator('#restart').click();
 assert.equal(await page.locator('.match p').innerText(),excerpt);
 assert.equal(await page.locator('#time').innerText(),'90');
 check('Answer typing, duration, timer start/pause/restart preserve retrieved excerpts');

 const inFlight=await rank();await page.locator('#answer').fill('Synthetic answer typed during retrieval.');await page.locator('#duration').selectOption('60');await page.locator('#start').click();await page.locator('#start').click();await page.locator('#restart').click();await reply(inFlight);
 assert.equal(await page.locator('.match').count(),1);
 check('Answer and timer edits during an in-flight request still allow its current reply');

 for(const [name,change] of [
  ['question',()=>page.locator('#question').selectOption('1')],
  ['role',()=>page.locator('#role').selectOption('Customer support')],
  ['story title',()=>page.locator('#calendar-title').fill('Fictional revised title')],
  ['story field',()=>page.locator('#calendar-action').fill('Fictional revised action')],
  ['story removal',async()=>{page.once('dialog',d=>d.accept());await page.locator('#card-calendar button').click();}],
  ['story addition',()=>page.locator('#add').click()],
 ]){
  await matched();const stale=await rank();await change();
  assert.equal(await page.locator('.match').count(),0,name);
  await reply(stale);assert.equal(await page.locator('.match').count(),0,name+' late reply');
  assert.equal(await page.locator('#rank').isEnabled(),true);
 }
 check('Query, role, title/field edits, removal and addition clear matches; late replies cannot restore them');

 const older=await rank();await page.locator('#question').selectOption('5');await reply(older);
 const newer=await rank();await reply(older);assert.equal(await page.locator('#rank').isDisabled(),true);
 await reply(older,'error');assert.equal(await page.locator('#rank').isDisabled(),true);
 await reply(newer);assert.equal(await page.locator('.match').count(),1);assert.equal(await page.locator('#rank').isEnabled(),true);
 const staleError=await rank();await page.locator('#question').selectOption('6');await reply(staleError,'error');
 assert.match(await page.locator('#model-status').innerText(),/Local AI ready/);assert.equal(await page.locator('.match').count(),0);
 check('Old duplicate replies/errors cannot release a newer request or replace current results');

 await matched();const unloadedRequest=await rank();
 await page.evaluate(()=>{window.__oldWorker=window.__testWorker;});
 page.once('dialog',d=>d.accept());await page.locator('#cache').click();
 await page.waitForFunction(()=>document.querySelector('#model-status').textContent.includes('Model cache cleared'));
 await page.evaluate(()=>{window.__oldWorker.reply({type:'ready'});window.__oldWorker.reply({type:'progress',progress:{status:'stale',file:'stale'}});window.__oldWorker.reply({type:'error',message:'Stale load error'});window.__oldWorker.onerror(new Event('error'));});await reply(unloadedRequest);
 assert.match(await page.locator('#model-status').innerText(),/Manual mode/);assert.equal(await page.locator('.match').count(),0);assert.equal(await page.locator('#rank').isDisabled(),true);
 check('Replies from an unloaded worker cannot reactivate matching or restore cleared results');

 await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#model-status').textContent.startsWith('Local AI ready'));await matched();
 await page.evaluate(()=>{window.__cacheKeys=caches.keys.bind(caches);caches.keys=async()=>{throw new Error('Controlled cache API failure');};});
 page.once('dialog',d=>d.accept());await page.locator('#cache').click();await page.waitForFunction(()=>document.querySelector('#model-status').textContent.includes('could not be cleared'));
 assert.equal(await page.locator('#load').isEnabled(),true);assert.equal(await page.locator('#rank').isDisabled(),true);assert.equal(await page.locator('.match').count(),0);assert.match(await page.locator('#model-status').innerText(),/manual mode/);
 await page.evaluate(()=>{caches.keys=window.__cacheKeys;});await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#model-status').textContent.startsWith('Local AI ready'));
 check('Cache API failure unloads AI honestly and restores a working download/retry control');

 const savedQuestion=await page.locator('#question').inputValue(),savedRole=await page.locator('#role').inputValue();
 await page.locator('#answer').fill('Synthetic saved answer survives refresh.');await page.locator('#duration').selectOption('90');await page.reload();
 assert.equal(await page.locator('#answer').inputValue(),'Synthetic saved answer survives refresh.');assert.equal(await page.locator('#duration').inputValue(),'90');
 assert.equal(await page.locator('#question').inputValue(),savedQuestion);assert.equal(await page.locator('#role').inputValue(),savedRole);
 assert.match(await page.locator('#model-status').innerText(),/Manual mode/);assert.equal(await page.locator('.match').count(),0);
 check('Refresh preserves the current answer, selected query and duration without claiming restored inference');

 assert.match(await page.locator('#match-caveat').innerText(),/Even the closest card may not fit/);
 assert.equal(await page.locator('#results').getAttribute('aria-live'),'polite');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 assert.deepEqual(unexpectedRequests,[],'Only same-origin GET requests for the static app are allowed; no worker/model downloads');
 check('Closest-card caveat is unconditional; mobile fits; no uncaught page errors');
 await fs.writeFile('output/playwright/retrieval-regressions.json',JSON.stringify({date:new Date().toISOString(),target:baseURL.href,browserVersion:browser.version(),nodeVersion:process.version,worker:'controlled fake; no inference',results,errors,requests,unexpectedRequests,blockedInfrastructureRequests},null,2));
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
