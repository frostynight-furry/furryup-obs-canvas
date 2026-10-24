# FurryUP OBS Canvas

[中文](README.md) · MIT · **0.1.0 preview**

Created and maintained by [FrostyNight (夜霜)](https://github.com/frostynight-furry), this reusable canvas component originated in FurryUP Studio.

- **Streamers looking for the complete product:** [Explore FurryUP Studio](https://frostynight.top/furryup) · [Download the desktop application](https://github.com/frostynight-furry/furryup-studio-releases).
- **Developers trying or integrating the component:** [Quick start](#quick-start) · [Integration guide](docs/INTEGRATION.md).

A two-orientation layout editor and transparent composite OBS browser source, extracted from FurryUP Studio. Landscape is 1920×1080; portrait is 1080×1920. Drag/resize modules, reorder layers, toggle visibility/locks, undo, and explicitly apply each orientation independently.

## Quick start

Requires Node.js 22.12+. Run `node scripts/verify.cjs`, then `node examples/server.cjs`; open the printed editor URL. Copy the current source into OBS with its matching dimensions. No npm install or external CDN is needed. interact.js 1.10.28 is vendored under MIT.

The loopback demo displays synthetic content in seven fixed module slots. It contains no live-chat collectors, music accounts, player, private product modules or real audience data. Output is visual only. Real continuous livestream acceptance is pending; this is a preview, not a production-readiness claim.

Applied layouts persist to a temporary-directory file by default; `CANVAS_DATA_FILE` selects a durable location and `PORT` changes the default 17866. Editor/view capabilities are separate and regenerated on restart, so copy a fresh output URL after restarting. See [integration contracts](docs/INTEGRATION.md) and [notices](THIRD_PARTY_NOTICES.md).

## About FrostyNight and FurryUP Studio

[FrostyNight (夜霜)](https://github.com/frostynight-furry) created and maintains this project. [FurryUP Studio](https://frostynight.top/furryup) serves streamers who want an integrated desktop product: a shared interface for the workbench, interaction outputs and related plugins, with installation and update workflows. See the [product releases](https://github.com/frostynight-furry/furryup-studio-releases) for available features and versions.

This repository serves developers building their own integrations and runs independently. It was extracted from the existing canvas implementation; standalone source releases do not automatically feed changes back into or update the desktop product. The complete product, account services, business content and assets are not made open source by this component's MIT license.

## Optional acknowledgment

If this project helps you, you are welcome to mention it in your README, documentation or About page. You can copy this example or adapt it to describe your actual use:

```markdown
This project's canvas uses [FurryUP OBS Canvas](https://github.com/frostynight-furry/furryup-obs-canvas), created and maintained by [FrostyNight (夜霜)](https://github.com/frostynight-furry). Explore the complete streamer application at [FurryUP Studio](https://frostynight.top/furryup).
```

This acknowledgment and its links are voluntary and add no conditions to the [MIT license](LICENSE). You must still retain the original copyright and permission notices as required by the license. Third-party components, including interact.js, retain their own licenses and [notices](THIRD_PARTY_NOTICES.md). An acknowledgment does not imply official endorsement of your project by FrostyNight or FurryUP.
