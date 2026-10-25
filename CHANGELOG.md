# Changelog

## 0.2.0 — 2026-10-26 — Preview

- Trusted, validated module registry shared by the editor, composite output and child event transport; the default seven-module API remains compatible. The CLI demonstrates an eighth synthetic status card.
- Explicit additive migration preserves version-1 layouts and revisions, starts added modules hidden, and rejects corrupt files or removed IDs without overwriting saved data.
- Output connection diagnostics distinguish orientation and stale script/registry connections. Mismatched clients are asked to refresh and receive no content events.
- “Reload live layout” now fetches current host state after a conflict. Single-module registries are supported in selection and layer dragging.
- Expanded integration documentation, synthetic tests and source-boundary review. No new third-party dependencies, desktop update, private effects, official rules or model content. Real continuous livestream acceptance remains pending.

## 0.1.0 — 2026-10-24 — Preview

Initial independent release: landscape/portrait layout model, draggable/resizable editor, layer ordering, visibility/locks, undo, revision-checked apply, transparent composite browser source and a loopback synthetic example. Includes offline interact.js with its MIT license, tests and source/archive audits. Real livestream acceptance remains pending; no desktop application or private runtime is distributed.
