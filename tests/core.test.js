import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PracticeTimer,validateState,emptyState,questions,rankStories} from '../src/core.js';
import {demoStories} from '../src/demo.js';
test('twelve original questions across three roles',()=>{assert.equal(questions.length,12);assert.equal(new Set(questions.map(q=>q.text)).size,12);for(const role of new Set(questions.map(q=>q.role)))assert.equal(questions.filter(q=>q.role===role).length,4);});
test('timer pause, resume, completion and restart with elapsed time',()=>{let now=0;const t=new PracticeTimer(60,()=>now);t.start();now=1250;assert.equal(t.tick(),59);t.pause();now=90000;assert.equal(t.tick(),59);t.start();now+=58750;assert.equal(t.tick(),0);assert.equal(t.running,false);t.reset(90);assert.equal(t.tick(),90);assert.equal(t.running,false);});
test('validated backup preserves content and rejects malformed input',()=>{const s={...emptyState(),stories:demoStories,answers:{0:'Synthetic private answer'},duration:90,question:4};assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);assert.throws(()=>validateState({...s,stories:[...demoStories,demoStories[0]]}));assert.throws(()=>validateState({...s,answers:{99:'wrong'}}));assert.throws(()=>validateState({...s,stories:[{...demoStories[0],action:33}]}));});
test('normalised embedding ranking sorts similarity',()=>{const result=rankStories(demoStories,[[1,0],[0,1],[-1,0]],[0,1]);assert.equal(result[0].story.id,'complaint');});
