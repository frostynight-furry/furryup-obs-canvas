'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const base=require('../core/layout.cjs'),definitions=require('../examples/modules.cjs'),{startDemo}=require('../examples/server.cjs');
test('registered modules share geometry, ordering and immutable event contracts',()=>{
  const input=structuredClone(definitions),model=base.createLayoutModel(input);input[0].name='Changed';
  assert.equal(model.names.comments,base.names.comments);assert.ok(Object.isFrozen(model.definitions[0].defaults.landscape));
  assert.deepEqual(model.destinations['status-state'],['status']);assert.ok(model.transientEvents.includes('live-event'));
  for(const orientation of Object.keys(model.sizes)){
    const profile=model.preset(orientation);assert.equal(profile.modules.length,8);
    assert.equal(model.stack(model.reorder(profile,'status',0))[0].id,'status');
    assert.equal(base.validate(base.preset(orientation),orientation).modules.length,7);
  }
  const one=base.createLayoutModel([definitions.at(-1)]);assert.deepEqual(one.modules,['status']);assert.equal(one.preset('portrait').modules.length,1);
});
test('registry rejects unsafe routes, IDs, event policy conflicts and invalid defaults',()=>{
  const change=(key,value)=>{const input=structuredClone(definitions);input.at(-1)[key]=value;return()=>base.createLayoutModel(input);};
  for(const route of ['https://invalid.test','//invalid.test','../private','data:text/html,x','status#fragment','status?x=%2f','/status'])assert.throws(change('route',route));
  for(const id of ['constructor','__proto__','bad"id','songs','A'])assert.throws(change('id',id));
  for(const events of [['canvas-layout'],['message'],['status\ndata'],['status-state','status-state']])assert.throws(change('events',events));
  assert.throws(change('events',['live-event']),/Conflicting/);
  assert.throws(change('defaults',{landscape:{x:-1}}));assert.throws(()=>base.createLayoutModel([]));
});
test('additive migration retains both layouts and revisions, hides new modules and rejects data loss',()=>{
  const model=base.createLayoutModel(definitions),old=base.normalize();
  old.profiles.landscape.revision=7;old.profiles.landscape.modules[0].x=70;old.profiles.portrait.modules[2].visible=true;
  const original=structuredClone(old),next=model.migrate(old);
  for(const orientation of Object.keys(base.sizes)){
    assert.deepEqual(next.profiles[orientation].modules.slice(0,7),old.profiles[orientation].modules);
    assert.equal(next.profiles[orientation].revision,old.profiles[orientation].revision);
    assert.equal(next.profiles[orientation].modules.at(-1).visible,false);
  }
  assert.deepEqual(old,original);assert.deepEqual(model.migrate(next),next);
  assert.throws(()=>base.migrate(next),/Unknown/);
  for(const mutate of [v=>v.version=2,v=>v.profiles.landscape.modules[0].x=-1,v=>v.profiles.landscape.modules[0].id='unknown',v=>v.profiles.portrait.revision=-1,v=>v.profiles.landscape.modules.pop()&&v.profiles.landscape.modules.push(v.profiles.landscape.modules[0])]){
    const bad=structuredClone(old);mutate(bad);assert.throws(()=>model.migrate(bad));
  }
  assert.throws(()=>model.apply(next,{orientation:'landscape',baseRevision:6,profile:next.profiles.landscape}),/其他窗口/);
});
async function fixture(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-registry-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));return path.join(directory,'layout.json');}
test('example upgrades a saved seven-module layout in memory and writes only on explicit apply',async t=>{
  const file=await fixture(t),old=base.normalize();old.profiles.portrait.revision=4;fs.writeFileSync(file,JSON.stringify(old));const bytes=fs.readFileSync(file);
  const demo=await startDemo({port:0,file,definitions});try{
    assert.deepEqual(fs.readFileSync(file),bytes);const state=demo.snapshot().settings.obsLayout;
    assert.equal(state.profiles.portrait.revision,4);assert.equal(state.profiles.landscape.modules.length,8);
    demo.apply({orientation:'portrait',baseRevision:4,profile:state.profiles.portrait});
    assert.equal(JSON.parse(fs.readFileSync(file)).profiles.portrait.revision,5);
    const registry=await fetch(demo.origin+'/registry.js');assert.equal(registry.headers.get('cache-control'),'no-store');assert.match(await registry.text(),/status-state/);
    const url=new URL(demo.canvasUrls.landscape);url.pathname='/status';assert.equal((await fetch(url)).status,200);
  }finally{await demo.close();}
  const saved=fs.readFileSync(file);await assert.rejects(startDemo({port:0,file}),/original file preserved/);assert.deepEqual(fs.readFileSync(file),saved);
});
test('connection diagnostics distinguish old clients; current clients receive registered snapshots',{timeout:8000},async t=>{
  const file=await fixture(t),demo=await startDemo({port:0,file,definitions});
  const controllers=[];t.after(async()=>{controllers.forEach(c=>c.abort());await demo.close();});
  async function stream(current){const url=new URL(demo.canvasUrls.landscape);url.pathname='/canvas-events';if(current){url.searchParams.set('version',demo.snapshot().diagnostics.version);url.searchParams.set('registry',demo.snapshot().diagnostics.registryId);}const c=new AbortController();controllers.push(c);const response=await fetch(url,{signal:c.signal});return {reader:response.body.getReader(),controller:c};}
  assert.deepEqual(demo.snapshot().diagnostics.outputs,[]);
  const old=await stream(false);const stale=new TextDecoder().decode((await old.reader.read()).value);assert.match(stale,/refresh-required/);assert.doesNotMatch(stale,/status-state/);
  const live=await stream(true);let data='';while(!data.includes('status-state'))data+=new TextDecoder().decode((await live.reader.read()).value);
  assert.match(data,/自定义模块已接入/);assert.match(data,/"available":true/);
  assert.deepEqual(demo.snapshot().diagnostics.outputs,[{orientation:'landscape',current:false},{orientation:'landscape',current:true}]);
  live.controller.abort();old.controller.abort();await Promise.all([live.reader.cancel().catch(()=>{}),old.reader.cancel().catch(()=>{})]);
});
