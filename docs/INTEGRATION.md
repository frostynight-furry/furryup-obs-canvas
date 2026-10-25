# Host and module integration

## Layout model

`require('./core/layout.cjs')` exports `sizes`, `modules`, `names`, `routes`, `preset`, `validate`, `normalize`, `apply`, `bound`, `stack`, and `reorder`. The same file provides `window.FurryUPObsLayout` in a browser.

`normalize()` creates `{version, profiles:{landscape,portrait}}`. Each profile contains `revision` and exactly one record per registered module with `id`, integer `x/y/width/height/layer`, and boolean `visible/locked`. Unknown fields such as arbitrary URLs are stripped. Geometry must remain inside its orientation. `apply(state,{orientation,baseRevision,profile})` rejects a stale revision and returns a new state; persist it successfully before publishing. `stack(profile)` gives front-to-back order; `reorder(profile,id,destination)` returns a new ordering, respects the selected module's lock and preserves its geometry.

## Trusted module registry (0.2.0)

The default export retains the seven 0.1.0 modules. `createLayoutModel(definitions)` returns an isolated model for 1–21 modules; its registry metadata is immutable. The CLI demo adds a hidden `status` module using [examples/modules.cjs](../examples/modules.cjs):

```js
const base = require('./core/layout.cjs');
const definitions = require('./examples/modules.cjs');
const model = base.createLayoutModel(definitions);
```

Each definition has `id`, display `name`, same-origin `route`, optional `previewRoute`, `events`, optional `transientEvents` and `defaults:{landscape,portrait}`. Each default contains the geometry, visibility, lock and layer fields. Routes are relative single path segments with an optional simple query, not arbitrary URLs. Event names are bounded, registered once per module, and must agree on transient policy across subscribers. The model exposes `definitions`, `previewRoutes`, `destinations` and `transientEvents` for host and renderer reuse. These are trusted developer configuration, served to browsers: never place credentials or private business data in definitions.

Use `model.migrate(saved)` to load version-1 layouts after adding modules. Existing records and revisions are preserved; new modules start hidden. Missing orientations, invalid records, duplicate/unknown IDs or newer schema versions fail. Removing or renaming a registered module needs an explicit host migration; the example refuses to silently discard it. Migration is in memory until the next explicit apply. `normalize()` remains a forgiving default/draft helper and must not be used to silently repair saved files.

## Editor bridge

Load `core/layout.cjs`, your registry bootstrap, the included interact.js, the host bridge, and `web/obs-layout-editor.js` in that order. The example's `/registry.js` creates the same configured model in editor, output and child pages and supplies `FurryUPCanvasBuild:{version,registryId}`. Supply the element IDs shown in `web/index.html` and this object:

```js
window.FurryUPCanvasHost = {
  async get() { return state; },
  onState(listener) { /* subscribe; return unsubscribe */ },
  async applyObsLayout(request) { /* validate + persist; return new state */ },
  async copy(name) { /* name is canvas-landscape or canvas-portrait */ }
};
```

The state shape is `{settings:{obsLayout,appearance},outputUrl,canvasUrls:{landscape,portrait}}`, with optional `diagnostics` in the demo. `outputUrl` is the base for registered module routes and carries a view token in its query. The bridge owns authentication, durable writes, conflict handling and clipboard behavior. The editor holds unpublished drafts and up to 50 undo states per orientation. A page reload discards drafts. It uses the displayed saved revision for optimistic concurrency. “Reload live layout” fetches fresh host state before replacing the current draft, including after a stale-write conflict.

The standalone editor is active by default. Embedded hosts may dispatch `canvas:visibility` with `{detail:{visible:false}}` to remove preview frames, or `visible:true` to restore them. Optional `FurryUPUIBindings` supplies translation bindings; default messages are Chinese.

## Composite output

Serve the HTML/CSS/JS shown in `web/obs-canvas.html` and a token-protected `/canvas-events` SSE route. Send `canvas-layout` with `{available:true,profile}`; `available:false` or transport failure clears frames. The browser model allows only its fixed same-origin routes. Orientation is selected by the URL.

`obs-canvas.js` routes registered event names to subscribed modules. Child pages use `canvas-stream.js`: with `canvas=1&module=<id>` they receive validated same-origin `postMessage` events from the parent instead of opening a separate SSE connection. Each child accepts only its own registered events. Transient pre-ready queues are bounded to 50 entries per module; snapshots are retained per registered event. Event data is JSON text. See `web/module.js` for `song-state`, `live-event` and synthetic `status-state` examples; a production host defines its own filtered payloads and safe rendering.

`startDemo({port,file,persist?,definitions?})` in `examples/server.cjs` returns `editorUrl`, `canvasUrls`, `snapshot()`, `apply(request)`, `emit(name,data)` and `close()`. Its HTTP adapter separates editor and view keys, checks Host/Origin, bounds input sizes and connections, persists before publication, and never serves arbitrary filesystem paths. `persist` is synchronous: throwing must leave the old published layout intact. All registered routes in this example use the same synthetic renderer; production hosts must serve their own trusted module pages.

## Output diagnosis and upgrades

The editor's “Check output connections” button fetches fresh state without applying drafts. `diagnostics.outputs` lists SSE connections by orientation and whether their version and registry digest match the running server. It has no viewer identity, token or account data. This counts both OBS and regular browser output tabs, not the editor preview. A checked visibility box is only a saved layout choice; it does not establish an output connection. SSE presence does not prove successful rendering, active OBS scene visibility or real audience delivery.

`/canvas-events` requires the query's `version` and `registry` to match `FurryUPCanvasBuild`. Old or mismatched clients receive `{available:false,reason:'refresh-required'}` and no module events. Refresh the corresponding OBS browser source's page cache after upgrading; if the example server was restarted, copy its newly generated source URL as well. This prevents a newly connected stale script from applying an incompatible registry. It does not detect an old page while it remains attached to an old server process.

This example is bound to loopback and is not a public hosting service. Integrations must decide their own deployment authentication, data minimization, output lifecycle and audio capture. The seven sample renderers are illustrative, not the private product's platform, gift or music modules.
