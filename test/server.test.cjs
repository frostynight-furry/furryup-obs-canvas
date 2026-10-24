'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startDemo}=require('../examples/server.cjs');
async function setup(t,options={}){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-tests-')),file=path.join(directory,'layout.json');const demo=await startDemo({port:0,file,...options});t.after(async()=>{await demo.close();assert.equal(path.dirname(directory),os.tmpdir());fs.rmSync(directory,{recursive:true,force:true});});const key=new URL(demo.editorUrl).searchParams.get('edit');const headers={'X-Canvas-Key':key,'Content-Type':'application/json',Origin:demo.origin};return {demo,file,key,headers};}
test('editor and output capabilities are separate; foreign origins and unsafe paths are refused',async t=>{
 const{demo,headers}=await setup(t);assert.equal((await fetch(demo.editorUrl)).status,200);assert.equal((await fetch(demo.origin)).status,403);
 assert.equal((await fetch(demo.origin+'/api/state',{headers})).status,200);
 const viewer=new URL(demo.canvasUrls.landscape).searchParams.get('token');assert.equal((await fetch(demo.origin+'/api/state',{headers:{'X-Canvas-Key':viewer}})).status,403);
 assert.equal((await fetch(demo.canvasUrls.landscape,{headers:{Origin:'https://untrusted.invalid'}})).status,403);
 const wrongHost=await new Promise((resolve,reject)=>{const req=require('node:http').get(demo.canvasUrls.landscape,{headers:{Host:'untrusted.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(wrongHost,403);
 assert.equal((await fetch(demo.origin+'/../../package.json?token='+viewer)).status,404);
 assert.equal((await fetch(demo.origin+'/api/layout',{method:'POST',headers:{...headers,Origin:'https://untrusted.invalid'},body:'{}'})).status,403);
 assert.equal((await fetch(demo.origin+'/api/layout',{method:'POST',headers,body:'{'})).status,400);
 assert.equal((await fetch(demo.canvasUrls.landscape+'&orientation=bad')).status,200,'first valid orientation wins consistently');
 const bad=new URL(demo.canvasUrls.landscape);bad.searchParams.set('orientation','bad');assert.equal((await fetch(bad)).status,400);
 const page=await fetch(demo.canvasUrls.landscape);assert.match(page.headers.get('content-security-policy'),/frame-src 'self'/);assert.equal(page.headers.get('referrer-policy'),'no-referrer');
});
test('validated apply persists before publication; stale writes cannot overwrite either orientation',async t=>{
 const{demo,headers,file}=await setup(t);const before=demo.snapshot().settings.obsLayout;const profile=structuredClone(before.profiles.landscape);profile.modules[0].x=60;profile.modules[0].url='https://untrusted.invalid';
 const body=JSON.stringify({orientation:'landscape',baseRevision:0,profile});const result=await fetch(demo.origin+'/api/layout',{method:'POST',headers,body});assert.equal(result.status,200);
 const saved=(await result.json()).settings.obsLayout;assert.equal(saved.profiles.landscape.revision,1);assert.equal(saved.profiles.landscape.modules[0].url,undefined);assert.deepEqual(saved.profiles.portrait,before.profiles.portrait);
 assert.deepEqual(JSON.parse(fs.readFileSync(file)),saved);assert.equal((await fetch(demo.origin+'/api/layout',{method:'POST',headers,body})).status,409);assert.deepEqual(demo.snapshot().settings.obsLayout,saved);
});
test('a storage failure leaves the published layout unchanged',async t=>{
 const{demo}=await setup(t,{persist:()=>{throw new Error('Simulated disk failure');}});const before=demo.snapshot().settings.obsLayout,profile=structuredClone(before.profiles.portrait);profile.modules[0].x=50;profile.modules[0].width=900;
 assert.throws(()=>demo.apply({orientation:'portrait',baseRevision:0,profile}),/disk failure/);assert.deepEqual(demo.snapshot().settings.obsLayout,before);
});
test('one bounded event stream carries layouts and events; disconnect and shutdown finish promptly',{timeout:8000},async t=>{
 const{demo}=await setup(t);const url=new URL(demo.canvasUrls.portrait);url.pathname='/canvas-events';const controller=new AbortController();t.after(()=>controller.abort());const response=await fetch(url,{signal:controller.signal});const reader=response.body.getReader(),decoder=new TextDecoder();let buffered='';
 async function next(name){for(;;){const end=buffered.indexOf('\n\n');if(end<0){const part=await reader.read();assert.equal(part.done,false);buffered+=decoder.decode(part.value,{stream:true});continue;}const message=buffered.slice(0,end);buffered=buffered.slice(end+2);if(message.startsWith('event: '+name+'\n'))return JSON.parse(message.split('\ndata: ')[1]);}}
 assert.deepEqual((await next('canvas-layout')).profile,demo.snapshot().settings.obsLayout.profiles.portrait);await next('song-state');demo.emit('live-event',{user_name:'Fixture',content:'Synthetic message'});assert.equal((await next('live-event')).content,'Synthetic message');
 const state=demo.snapshot().settings.obsLayout,profile=structuredClone(state.profiles.portrait);profile.modules[0].x=50;profile.modules[0].width=900;demo.apply({orientation:'portrait',baseRevision:0,profile});assert.equal((await next('canvas-layout')).profile.revision,1);
 assert.throws(()=>demo.emit('unsupported',{}));assert.throws(()=>demo.emit('live-event',{content:'x'.repeat(17000)}),/large/);controller.abort();await reader.cancel().catch(()=>{});
});
test('saved layouts survive restart; unreadable or corrupt files never silently reset',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-restart-')),file=path.join(directory,'layout.json');t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));let demo=await startDemo({port:0,file});const profile=demo.snapshot().settings.obsLayout.profiles.landscape;profile.modules[0].visible=false;demo.apply({orientation:'landscape',baseRevision:0,profile});await demo.close();demo=await startDemo({port:0,file});assert.equal(demo.snapshot().settings.obsLayout.profiles.landscape.modules[0].visible,false);await demo.close();fs.writeFileSync(file,'invalid');await assert.rejects(startDemo({port:0,file}),/invalid or unreadable/);assert.equal(fs.readFileSync(file,'utf8'),'invalid');
});
