'use strict';
(() => {
  const model = window.FurryUPObsLayout, params = new URLSearchParams(location.search), token = params.get('token') || '';
  const orientation = params.get('orientation') === 'portrait' ? 'portrait' : 'landscape', size = model.sizes[orientation];
  const canvas = document.getElementById('canvas'), frames = new Map();
  const ready = new Set(), pending = new Map(), snapshots = new Map();
  const destinations = model.destinations;
  function send(frame, name, data) { frame.contentWindow?.postMessage({ kind:'canvas-event', name, data }, location.origin); }
  window.addEventListener('message', event => {
    const id = event.data?.module, frame = frames.get(id);
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.kind !== 'canvas-ready') return;
    ready.add(id);
    for (const [name,data] of snapshots) if (destinations[name]?.includes(id)) send(frame,name,data);
    for (const message of pending.get(id) || []) send(frame,message.name,message.data);
    pending.delete(id);
  });
  function broadcast(name, data) {
    const transient = model.transientEvents.includes(name);
    if (!transient) snapshots.set(name,data);
    for (const id of destinations[name] || []) {
      const frame=frames.get(id); if (!frame) continue;
      if (ready.has(id)) send(frame,name,data);
      else if (transient) { const queue=pending.get(id)||[]; queue.push({name,data}); if(queue.length>50)queue.shift(); pending.set(id,queue); }
    }
  }
  canvas.style.width = size.width + 'px'; canvas.style.height = size.height + 'px';
  const resize = () => { canvas.style.transform = `scale(${Math.min(innerWidth / size.width, innerHeight / size.height)})`; };
  resize(); window.addEventListener('resize', resize);
  const clear = () => { for (const frame of frames.values()) frame.remove(); frames.clear(); ready.clear(); pending.clear(); snapshots.clear(); canvas.dataset.connected = 'false'; };
  function render(value) {
    if (!value?.available) { clear(); canvas.dataset.reason=value?.reason||'unavailable'; return; }
    const profile = model.validate(value.profile, orientation);
    const visible = new Set(profile.modules.filter(item => item.visible).map(item => item.id));
    for (const [id, frame] of frames) if (!visible.has(id)) { frame.remove(); frames.delete(id); ready.delete(id); pending.delete(id); }
    for (const item of profile.modules) {
      if (!item.visible) continue;
      let frame = frames.get(item.id);
      if (!frame) {
        frame = document.createElement('iframe'); frame.title = model.names[item.id]; frame.dataset.module = item.id;
        // Only host-registered same-origin routes. Saved layouts cannot supply URLs.
        const url = new URL(model.routes[item.id], location.href); url.searchParams.set('token', token);
        url.searchParams.set('canvas','1'); url.searchParams.set('module',item.id);
        frame.src = url.href; canvas.append(frame); frames.set(item.id, frame);
      }
      Object.assign(frame.style, { left:item.x+'px', top:item.y+'px', width:item.width+'px', height:item.height+'px', zIndex:String(item.layer) });
    }
    canvas.dataset.connected = 'true'; delete canvas.dataset.reason; canvas.dataset.revision = String(profile.revision);
  }
  const build=window.FurryUPCanvasBuild;
  const source = new EventSource(`/canvas-events?token=${encodeURIComponent(token)}&orientation=${orientation}&version=${encodeURIComponent(build.version)}&registry=${encodeURIComponent(build.registryId)}`);
  for (const name of Object.keys(destinations)) source.addEventListener(name, event => broadcast(name,event.data));
  source.addEventListener('canvas-layout', event => { try { render(JSON.parse(event.data)); } catch { clear(); } });
  source.onerror = clear;
  window.addEventListener('pagehide', () => { source.close(); clear(); }, { once:true });
})();
