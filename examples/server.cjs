'use strict';
// Loopback-only integration example. All displayed data is synthetic.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {randomBytes,randomUUID,timingSafeEqual,createHash}=require('node:crypto');
const layoutModel=require('../core/layout.cjs');
const version=require('../package.json').version;
const root=path.resolve(__dirname,'../web');
const assets=new Map(['base.css','obs-layout-editor.css','obs-layout-editor.js','obs-canvas.css','obs-canvas.js','canvas-stream.js','demo-host.js','module.js','module.css','vendor/interactjs/interact.min.js'].map(name=>['/'+name,path.join(root,name)]));
assets.set('/layout.cjs',path.resolve(__dirname,'../core/layout.cjs'));
const equal=(a,b)=>{const left=Buffer.from(a||''),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};
async function startDemo({port=17866,file=path.join(os.tmpdir(),'furryup-obs-canvas-example','layout.json'),persist,definitions=layoutModel.definitions}={}) {
  const model=layoutModel.createLayoutModel(definitions),eventNames=new Set(Object.keys(model.destinations));
  const registryId=createHash('sha256').update(JSON.stringify(model.definitions)).digest('hex');
  const moduleRoutes=new Set([...Object.values(model.routes),...Object.values(model.previewRoutes)].map(route=>new URL(route,'http://localhost/').pathname));
  if([...moduleRoutes].some(route=>assets.has(route)||['/canvas','/canvas-events','/registry.js'].includes(route)))throw new Error('Reserved module route');
  const viewKey=randomBytes(24).toString('hex'),editKey=randomBytes(24).toString('hex');
  let layout=model.normalize(),origin;
  try { const saved=JSON.parse(fs.readFileSync(file,'utf8')); layout=model.migrate(saved); }
  catch(error){if(error.code!=='ENOENT')throw new Error('Saved layout is invalid or unreadable; original file preserved',{cause:error});}
  const save=persist||((next)=>{fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temporary,JSON.stringify(next,null,2),{flag:'wx',mode:0o600});fs.renameSync(temporary,file);}finally{try{fs.unlinkSync(temporary);}catch{}}});
  const clients=new Set(),snapshots=new Map();
  const canvasUrl=key=>origin+'/canvas?token='+viewKey+'&orientation='+key;
  const diagnostics=()=>({version,registryId,outputs:[...clients].map(({orientation,current})=>({orientation,current})),visibleModules:Object.fromEntries(Object.keys(model.sizes).map(key=>[key,layout.profiles[key].modules.filter(item=>item.visible).map(item=>item.id)]))});
  const snapshot=()=>({settings:{obsLayout:structuredClone(layout),appearance:{}},diagnostics:diagnostics(),outputUrl:origin+'/?token='+viewKey,canvasUrls:Object.fromEntries(Object.keys(model.sizes).map(key=>[key,canvasUrl(key)]))});
  function send(client,name,data){if(!client.response.write('event: '+name+'\ndata: '+JSON.stringify(data)+'\n\n'))client.response.destroy();}
  function emit(name,data){if(!eventNames.has(name))throw new Error('Unsupported canvas event');const encoded=JSON.stringify(data);if(!encoded||Buffer.byteLength(encoded)>16384)throw new Error('Event too large');const clean=JSON.parse(encoded);if(!model.transientEvents.includes(name))snapshots.set(name,clean);for(const client of clients)if(client.current)send(client,name,clean);}
  function apply(request){if(request&&Object.hasOwn(model.sizes,request.orientation)&&request.baseRevision!==layout.profiles[request.orientation].revision)throw Object.assign(new Error('Stale layout'),{code:'OBS_LAYOUT_CONFLICT'});const next=model.apply(layout,request);save(next);layout=next;for(const client of clients)if(client.current)send(client,'canvas-layout',{available:true,profile:layout.profiles[client.orientation]});return snapshot();}
  const server=http.createServer(async(req,res)=>{
    const finish=(status,data,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(data);};
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
    if(req.headers.host!==new URL(origin).host||req.headers.origin&&req.headers.origin!==origin)return finish(403,'Forbidden origin');
    const url=new URL(req.url,origin),route=url.pathname;
    try{
      if(route==='/api/state'||route==='/api/layout'){
        if(!equal(req.headers['x-canvas-key'],editKey))return finish(403,'Editor key required');
        if(route==='/api/state'&&req.method==='GET')return finish(200,JSON.stringify(snapshot()),'application/json');
        if(route!=='/api/layout'||req.method!=='POST')return finish(405,'Method not allowed');
        if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')return finish(403,'Same-origin JSON required');
        const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>16384){finish(413,'Request too large');return;}chunks.push(chunk);}
        let request;try{request=JSON.parse(Buffer.concat(chunks));}catch{return finish(400,'Invalid JSON');}
        let next;try{next=apply(request);}catch(error){return finish(error.code==='OBS_LAYOUT_CONFLICT'?409:400,'Layout update rejected');}
        return finish(200,JSON.stringify(next),'application/json');
      }
      if(req.method!=='GET')return finish(405,'Method not allowed');
      if(route==='/registry.js')return finish(200,'window.FurryUPObsLayout=window.FurryUPObsLayout.createLayoutModel('+JSON.stringify(model.definitions)+');window.FurryUPCanvasBuild='+JSON.stringify({version,registryId})+';','text/javascript; charset=utf-8');
      if(assets.has(route)){const type=route.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';return finish(200,fs.readFileSync(assets.get(route)),type);}
      if(route==='/'){
        if(!equal(url.searchParams.get('edit'),editKey))return finish(403,'Open the editor URL printed by the local server');
        return finish(200,fs.readFileSync(path.join(root,'index.html')),'text/html; charset=utf-8');
      }
      if(!equal(url.searchParams.get('token'),viewKey))return finish(403,'View key required');
      if(route==='/canvas'||route==='/canvas-events'){
        const orientation=url.searchParams.get('orientation')||'landscape';if(!Object.hasOwn(model.sizes,orientation))return finish(400,'Invalid orientation');
        if(route==='/canvas')return finish(200,fs.readFileSync(path.join(root,'obs-canvas.html')),'text/html; charset=utf-8');
        if(clients.size>=32)return finish(503,'Too many output clients');
        res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});
        const current=url.searchParams.get('version')===version&&url.searchParams.get('registry')===registryId;
        const client={response:res,orientation,current};clients.add(client);
        send(client,'canvas-layout',current?{available:true,profile:layout.profiles[orientation]}:{available:false,reason:'refresh-required'});if(current)for(const[name,data]of snapshots)send(client,name,data);
        const timer=setInterval(()=>{if(!res.write(': heartbeat\n\n'))res.destroy();},15000);timer.unref();
        res.on('close',()=>{clients.delete(client);clearInterval(timer);});return;
      }
      if(moduleRoutes.has(route))return finish(200,fs.readFileSync(path.join(root,'module.html')),'text/html; charset=utf-8');
      return finish(404,'Not found');
    }catch{if(!res.headersSent)finish(500,'Local example request failed');else res.destroy();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  if(eventNames.has('song-state'))emit('song-state',{title:'示例旋律',artist:'示例乐队'});
  if(eventNames.has('status-state'))emit('status-state',{text:'自定义模块已接入'});
  return {origin,editorUrl:origin+'/?edit='+editKey,canvasUrls:snapshot().canvasUrls,snapshot,apply,emit,
    close:async()=>{for(const client of clients)client.response.end();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}};
}
if(require.main===module)startDemo({port:Number(process.env.PORT||17866),definitions:require('./modules.cjs'),...(process.env.CANVAS_DATA_FILE?{file:path.resolve(process.env.CANVAS_DATA_FILE)}:{})}).then(demo=>{console.log('Synthetic OBS canvas preview. Editor URL (keep private):\n'+demo.editorUrl);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>demo.close().then(()=>process.exit(0)));}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={startDemo};
