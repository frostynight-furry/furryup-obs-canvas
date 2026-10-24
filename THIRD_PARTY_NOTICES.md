# Sources and notices

The layout model, editor, styles, output composition and event bridge are extracted and adapted from original FurryUP Studio code, released by the maintainer under MIT. Standalone host wiring, synthetic module pages and loopback service are included. Drag/resize completion refreshes controls so layer actions remain available immediately after an interaction.

## interact.js 1.10.28

- Upstream: https://github.com/taye/interact.js
- Homepage: https://interactjs.io/
- License: MIT; complete upstream text in `web/vendor/interactjs/LICENSE`.
- Unmodified browser bundle: `web/vendor/interactjs/interact.min.js`.
- Fixed source URL, package integrity and per-file SHA-256: `web/vendor/interactjs/PROVENANCE.json`.

No external CDN or second drag runtime is used. Audit/archive tooling is reused from [FurryUP Live Assistant Core](https://github.com/frostynight-furry/furryup-live-assistant-core), MIT, by the same maintainer. Node built-ins are provided by the user's Node installation.

Prior architecture research compared CastMate, Breeze and NodeCG; none of their source code is included in this project. The implementation reuses the existing interact.js integration and adds only the standalone host/example layer.
