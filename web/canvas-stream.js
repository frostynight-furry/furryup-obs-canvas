'use strict';
// Canvas children share the parent connection; standalone sources keep their own transport.
window.FurryUPCanvasStream = url => {
  const params = new URLSearchParams(location.search);
  if (params.get('canvas') !== '1' || parent === window) return new EventSource(url);
  const target = new EventTarget(), names = new Set(['appearance','overlay-control','retained-gifts','viewer-avatar','live-event','gift-notification-state','gift-animation-state','song-state']);
  let opened = false;
  const receive = event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.kind !== 'canvas-event' || !names.has(event.data.name) || typeof event.data.data !== 'string') return;
    if (!opened) { opened = true; target.onopen?.(); }
    target.dispatchEvent(new MessageEvent(event.data.name, { data:event.data.data }));
  };
  window.addEventListener('message', receive);
  target.close = () => window.removeEventListener('message', receive);
  queueMicrotask(() => parent.postMessage({ kind:'canvas-ready', module:params.get('module') }, location.origin));
  return target;
};
