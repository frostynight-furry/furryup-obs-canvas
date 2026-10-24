# FurryUP OBS Canvas

[中文](README.md) · MIT · **0.1.0 preview**

A two-orientation layout editor and transparent composite OBS browser source, extracted from FurryUP Studio. Landscape is 1920×1080; portrait is 1080×1920. Drag/resize modules, reorder layers, toggle visibility/locks, undo, and explicitly apply each orientation independently.

Requires Node.js 22.12+. Run `node scripts/verify.cjs`, then `node examples/server.cjs`; open the printed editor URL. Copy the current source into OBS with its matching dimensions. No npm install or external CDN is needed. interact.js 1.10.28 is vendored under MIT.

The loopback demo displays synthetic content in seven fixed module slots. It contains no live-chat collectors, music accounts, player, private product modules or real audience data. Output is visual only. Real continuous livestream acceptance is pending; this is a preview, not a production-readiness claim.

Applied layouts persist to a temporary-directory file by default; `CANVAS_DATA_FILE` selects a durable location and `PORT` changes the default 17866. Editor/view capabilities are separate and regenerated on restart, so copy a fresh output URL after restarting. See [integration contracts](docs/INTEGRATION.md) and [notices](THIRD_PARTY_NOTICES.md).
