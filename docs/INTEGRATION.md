# Host and module integration

## Layout model

`require('./core/layout.cjs')` exports `sizes`, `modules`, `names`, `routes`, `preset`, `validate`, `normalize`, `apply`, `bound`, `stack`, and `reorder`. The same file provides `window.FurryUPObsLayout` in a browser.

`normalize()` creates `{version, profiles:{landscape,portrait}}`. Each profile contains `revision` and exactly seven module records with `id`, integer `x/y/width/height/layer`, and boolean `visible/locked`. Unknown fields such as arbitrary URLs are stripped. Geometry must remain inside its orientation. `apply(state,{orientation,baseRevision,profile})` rejects a stale revision and returns a new state; persist it successfully before publishing. `stack(profile)` gives front-to-back order; `reorder(profile,id,destination)` returns a new ordering, respects the selected module's lock and preserves its geometry.

## Editor bridge

Load `core/layout.cjs`, the included interact.js, the host bridge, and `web/obs-layout-editor.js` in that order. Supply the element IDs shown in `web/index.html` and this object:

```js
window.FurryUPCanvasHost = {
  async get() { return state; },
  onState(listener) { /* subscribe; return unsubscribe */ },
  async applyObsLayout(request) { /* validate + persist; return new state */ },
  async copy(name) { /* name is canvas-landscape or canvas-portrait */ }
};
```

The state shape is `{settings:{obsLayout,appearance},outputUrl,canvasUrls:{landscape,portrait}}`. `outputUrl` is the base for fixed module routes and carries a view token in its query. The bridge owns authentication, durable writes, conflict handling and clipboard behavior. The editor holds unpublished drafts and up to 50 undo states per orientation. A page reload discards drafts. It uses the displayed saved revision for optimistic concurrency.

The standalone editor is active by default. Embedded hosts may dispatch `canvas:visibility` with `{detail:{visible:false}}` to remove preview frames, or `visible:true` to restore them. Optional `FurryUPUIBindings` supplies translation bindings; default messages are Chinese.

## Composite output

Serve the HTML/CSS/JS shown in `web/obs-canvas.html` and a token-protected `/canvas-events` SSE route. Send `canvas-layout` with `{available:true,profile}`; `available:false` or transport failure clears frames. The browser model allows only its fixed same-origin routes. Orientation is selected by the URL.

`obs-canvas.js` routes fixed event names to relevant modules. Child pages use `canvas-stream.js`: with `canvas=1&module=<id>` they receive validated same-origin `postMessage` events from the parent instead of opening a separate SSE connection. Transient pre-ready queues are bounded. Event data is JSON text. See the minimal renderer `web/module.js` for `song-state` and `live-event` examples; a production host defines its own filtered payloads and displays them with `textContent` or equivalent safe rendering.

`startDemo({port,file,persist?})` in `examples/server.cjs` returns `editorUrl`, `canvasUrls`, `snapshot()`, `apply(request)`, `emit(name,data)` and `close()`. Its HTTP adapter separates editor and view keys, checks Host/Origin, bounds input sizes and connections, persists before publication, and never serves arbitrary filesystem paths. `persist` is synchronous: throwing must leave the old published layout intact.

This example is bound to loopback and is not a public hosting service. Integrations must decide their own deployment authentication, data minimization, output lifecycle and audio capture. The seven sample renderers are illustrative, not the private product's platform, gift or music modules.
