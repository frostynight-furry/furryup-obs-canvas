'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), {EventEmitter}=require('node:events');
const model=require('../core/layout.cjs');

test('all public geometry entry points reject inherited or unknown orientation keys',()=>{
  const profile=model.preset('landscape');
  for(const direction of ['__proto__','constructor','toString','unknown','']){
    assert.throws(()=>model.preset(direction),/画布方向/);
    assert.throws(()=>model.validate(profile,direction),/画布方向/);
    assert.throws(()=>model.bound(profile.modules[0],direction),/画布方向/);
    assert.throws(()=>model.apply(model.normalize(),{orientation:direction,baseRevision:0,profile}),/画布方向/);
  }
});


test('layer ordering handles ties, hidden modules, locked selections and leaves other properties intact',()=>{
  const original=model.preset('landscape');
  original.modules.find(x=>x.id==='comments').layer=6;
  assert.deepEqual(model.stack(original).slice(0,2).map(x=>x.id),['poll','comments']);
  const changed=model.reorder(original,'gifts',0);
  assert.equal(model.stack(changed)[0].id,'gifts');
  assert.equal(new Set(changed.modules.map(x=>x.layer)).size,7);
  assert.deepEqual(changed.modules.map(({layer,...rest})=>rest),original.modules.map(({layer,...rest})=>rest));
  assert.equal(model.stack(original)[0].id,'poll','original draft remains unchanged for undo');
  assert.equal(model.reorder(original,'animations',0),original,'locked selected layer cannot be moved');
  assert.equal(model.reorder(changed,'gifts',0),changed,'edge action is a no-op');
  const bottom=model.reorder(changed,'gifts',6);assert.equal(model.stack(bottom).at(-1).id,'gifts');
  const up=model.reorder(bottom,'gifts',5);assert.equal(model.stack(up)[5].id,'gifts');
  const down=model.reorder(up,'gifts',6);assert.deepEqual(model.stack(down).map(x=>x.id),model.stack(bottom).map(x=>x.id));
  assert.deepEqual(model.validate(changed,'landscape'),changed);
});
test('two canvas orientations retain independent validated layouts and reject stale writes',()=>{
  const initial=model.normalize();
  assert.deepEqual(model.sizes.landscape,{width:1920,height:1080});assert.deepEqual(model.sizes.portrait,{width:1080,height:1920});
  const draft=structuredClone(initial.profiles.landscape);draft.modules.find(x=>x.id==='songs').x=1200;
  const saved=model.apply(initial,{orientation:'landscape',baseRevision:0,profile:draft});
  assert.equal(saved.profiles.landscape.revision,1);assert.deepEqual(saved.profiles.portrait,initial.profiles.portrait);
  assert.equal(initial.profiles.landscape.modules.find(x=>x.id==='songs').x,1360);
  assert.throws(()=>model.apply(saved,{orientation:'landscape',baseRevision:0,profile:draft}),/其他窗口/);
  for(const invalid of [NaN,Infinity,-1,9999,1.5]){const bad=structuredClone(draft);bad.modules[0].x=invalid;assert.throws(()=>model.validate(bad,'landscape'));}
  const duplicate=structuredClone(draft);duplicate.modules[0].id='songs';assert.throws(()=>model.validate(duplicate,'landscape'));
  assert.throws(()=>model.apply(initial,{orientation:'__proto__',baseRevision:0,profile:draft}));
  draft.modules[0].url='https://untrusted.invalid';assert.equal(model.validate(draft,'landscape').modules[0].url,undefined);
  assert.deepEqual(model.normalize({profiles:{portrait:{modules:[]}}}),initial);
});
