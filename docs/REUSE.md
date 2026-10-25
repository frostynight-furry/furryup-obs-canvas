# Reuse decisions for 0.2.0

Reviewed 2026-10-26. This release extends the existing public 0.1.0 implementation; it does not import the desktop application's current runtime.

| Candidate | Scope / license | Decision |
| --- | --- | --- |
| [interact.js](https://interactjs.io/docs/) | Pointer drag/resize; MIT, existing pinned 1.10.28 copy | Retain the already integrated offline distribution and hash/license checks. Official documentation still describes both required actions; verify compatibility in the browser smoke and CI rather than assume a newer dependency is needed. |
| [SortableJS](https://github.com/SortableJS/Sortable) | Reorderable lists; MIT; upstream repository and documentation remain available | Not added. It could implement the list gesture but would duplicate the current interact.js gesture handling and would not replace canvas resize. |
| [obs-websocket](https://github.com/obsproject/obs-websocket) | OBS control protocol; official project | Reference for a future host adapter. This release only diagnoses its own SSE output connections; it neither connects to OBS WebSocket nor writes OBS scene transforms. No OBS implementation is bundled. |

Module registration and additive layout migration extend this repository's existing validation, ordering and event transport. A separate UI framework or sorting dependency is unnecessary for these data contracts. The eight-module CLI example uses only synthetic text. No product effects, official rules, model code, mappings, assets or recordings are included.

Repository availability is not a promise of future upstream maintenance. See the pinned distribution and provenance in [third-party notices](../THIRD_PARTY_NOTICES.md); the dependency version and license are unchanged in 0.2.0.
