// Reproducible real-browser verification. All text is synthetic.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('output/playwright',{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
const page=await context.newPage();const network=[],errors=[],results=[];
context.on('request',r=>network.push({url:r.url(),method:r.method(),body:r.postData()}));page.on('pageerror',e=>errors.push(String(e)));
const check=(name,details='passed')=>results.push({name,details});
try{
 await page.clock.install();await page.goto('http://127.0.0.1:4173');await page.locator('#role').waitFor();
 assert.match(await page.locator('#model-status').innerText(),/Manual mode.*not loaded/);assert.equal(await page.locator('#rank').isDisabled(),true);check('Truthful manual fallback before model download');
 await page.locator('#demo').click();await page.locator('#answer').fill('SYNTHETIC_PRIVATE_CANARY_78431: I organised the appointments.');
 await page.locator('#calendar-action').fill('SYNTHETIC_STORY_CANARY_78431: I checked attendees availability, moved an appointment and updated the calendar.');
 // Restore demo for consistent semantic ranking, after testing user text handling.
 page.once('dialog',d=>d.accept());await page.locator('#demo').click();
 await page.locator('#load').click();assert.equal(await page.locator('#progress').isVisible(),true);await page.waitForFunction(()=>document.querySelector('#model-status').textContent.startsWith('Local AI ready'),{},{timeout:240000});check('Real browser WASM q8 MiniLM model download and load with visible progress');
 for(const [role,question,expected]of [['Personal assistant','0','Calendar collision'],['Customer support','4','A delayed delivery'],['Administration','8','Duplicate invoice']]){
  await page.locator('#role').selectOption(role);await page.locator('#question').selectOption(question);await page.locator('#rank').click();await page.locator('.match').first().waitFor({timeout:90000});assert.match(await page.locator('.match h3').first().innerText(),new RegExp(expected));assert.ok((await page.locator('.match p').first().innerText()).length>30);check(`Local embedding ranking: ${role}`,await page.locator('.match h3').first().innerText());
 }
 await page.locator('#role').selectOption('Personal assistant');await page.locator('#answer').fill('SYNTHETIC_PRIVATE_CANARY_78431: I organised the appointments.');
 await page.locator('#calendar-action').fill('SYNTHETIC_STORY_CANARY_78431: I checked attendees availability, moved an appointment and updated the calendar.');
 await context.setOffline(true);const beforeOffline=network.length;await page.locator('#rank').click();await page.locator('.match').first().waitFor({timeout:90000});assert.match(await page.locator('.match h3').first().innerText(),/Calendar collision/);assert.equal(network.length,beforeOffline);check('Loaded model ranks edited private story while network is offline');await context.setOffline(false);
 await page.locator('#answer').fill('Fictional practice: I checked availability and confirmed the revised appointment with everyone.');await page.locator('#rank').click();await page.locator('.match').first().waitFor({timeout:90000});
 await page.screenshot({path:'output/playwright/desktop-ai.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/mobile-ai.png',fullPage:true});await page.setViewportSize({width:1280,height:900});await page.locator('#answer').fill('SYNTHETIC_PRIVATE_CANARY_78431: I organised the appointments.');
 // Verify browser persistence, before export.
 await page.reload();assert.match(await page.locator('#answer').inputValue(),/SYNTHETIC_PRIVATE_CANARY/);check('Local storage survives reload');
 await page.locator('#duration').selectOption('90');assert.equal(await page.locator('#time').innerText(),'90');
 await page.locator('#start').click();await page.waitForTimeout(1200);await page.locator('#start').click();const paused=await page.locator('#time').innerText();await page.waitForTimeout(1200);assert.equal(await page.locator('#time').innerText(),paused);await page.locator('#restart').click();assert.equal(await page.locator('#time').innerText(),'90');
 // Playwright clock accelerates an actual 60-second completion.
 await page.locator('#duration').selectOption('60');await page.locator('#start').click();await page.clock.fastForward(61000);assert.equal(await page.locator('#time').innerText(),'00');assert.match(await page.locator('#timer-status').innerText(),/complete/);await page.locator('#restart').click();assert.equal(await page.locator('#time').innerText(),'60');check('90/60 seconds, pause, restart and completion');
 const original=await page.evaluate(()=>localStorage.getItem('rehearsal-mirror-v1'));const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs('output/playwright/synthetic-backup.json');assert.deepEqual(JSON.parse(await fs.readFile('output/playwright/synthetic-backup.json','utf8')),JSON.parse(original));
 page.once('dialog',d=>d.dismiss());await page.locator('#delete').click();assert.equal(await page.evaluate(()=>localStorage.getItem('rehearsal-mirror-v1')),original);check('Deletion cancellation preserves data');
 page.once('dialog',d=>d.accept());await page.locator('#delete').click();assert.equal(await page.locator('.story').count(),0);assert.equal(await page.locator('#answer').inputValue(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('rehearsal-mirror-v1')),null);check('Confirmed deletion removes only practice key');
 page.once('dialog',d=>d.accept());await page.locator('#import').setInputFiles('output/playwright/synthetic-backup.json');await page.waitForFunction(()=>document.querySelectorAll('.story').length===3);assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('rehearsal-mirror-v1'))),JSON.parse(original));check('Actual export/import round trip');
 await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Import failed'));assert.equal(await page.locator('.story').count(),3);check('Invalid import leaves existing data intact');
 await page.screenshot({path:'output/playwright/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);check('Desktop and 390px mobile screenshots; no horizontal overflow');
 const unlabeled=await page.locator('input,textarea,select').evaluateAll(nodes=>nodes.filter(n=>!n.labels?.length).map(n=>n.id));assert.deepEqual(unlabeled,[]);check('Form controls have labels');
 assert.ok(await page.evaluate(async()=> (await caches.keys()).includes('transformers-cache')));page.once('dialog',d=>d.accept());await page.locator('#cache').click();await page.waitForFunction(()=>document.querySelector('#model-status').textContent.includes('Model cache cleared'));assert.equal(await page.evaluate(async()=> (await caches.keys()).includes('transformers-cache')),false);check('Confirmed cache deletion removes Transformers cache');
 await context.route('https://huggingface.co/**',route=>route.abort());await page.locator('#load').click();await page.waitForFunction(()=>document.querySelector('#model-status').textContent.includes('AI unavailable'),{},{timeout:30000});assert.equal(await page.locator('#rank').isDisabled(),true);assert.equal(await page.locator('#load').isEnabled(),true);check('Blocked model download gives honest manual fallback and retry');
 // A blank new card becomes eligible for retrieval when the user edits it.
 await context.unroute('https://huggingface.co/**');await page.locator('#add').click();assert.equal(await page.locator('.story').count(),4);assert.equal(await page.locator('.story input').last().evaluate(e=>e===document.activeElement),true);await page.locator('.story input').last().fill('Synthetic extra story');page.once('dialog',d=>d.dismiss());await page.locator('.story button').last().click();assert.equal(await page.locator('.story').count(),4);page.once('dialog',d=>d.accept());await page.locator('.story button').last().click();assert.equal(await page.locator('.story').count(),3);check('Add/edit focus and individual card deletion confirmation');
 const leaked=network.filter(r=>/SYNTHETIC_(PRIVATE|STORY)_CANARY/.test(r.url+(r.body||'')));assert.deepEqual(leaked,[]);assert.equal(network.filter(r=>r.method!=='GET').length,0);assert.deepEqual(errors,[]);check('Network inspection: all requests GET; neither private canary sent; no page errors');
 await fs.writeFile('output/playwright/network.json',JSON.stringify(network.map(r=>({...r,url:r.url.split('?')[0]})),null,2));await fs.writeFile('output/playwright/results.json',JSON.stringify({date:new Date().toISOString(),results,errors,networkRequestCount:network.length},null,2));
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
