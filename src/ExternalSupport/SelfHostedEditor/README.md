# Inscape SelfHostedEditor

SelfHostedEditor is the planned first-party Inscape authoring client. It belongs to `src/ExternalSupport/SelfHostedEditor` because it binds to a concrete desktop / web host, while shared semantics stay in `Internal`:

- `Compiler` remains the DSL and StoryGraph truth.
- `LanguageServer` provides high-frequency editor semantics.
- `Tooling` provides project, preview, localization, HostSchema, and HostBinding flows.
- `Runtime` provides narrative execution and state observation.

The current shell is intentionally small, but it now includes a first Monaco-backed editor surface. It establishes the first workbench shape before LanguageServer, Tauri, and Runtime integration land.

## Current Prototype

- Notion-like writing surface with quiet metadata hints.
- Layout modes:
  - `write-preview`
  - `write-only`
  - `preview-only`
- Left editor / right preview split with source-line reveal.
- Local `.inscape` file import through the browser file picker.
- Quiet workspace file list in the sidebar for switching between imported `.inscape` files without leaving the writing session.
- Workspace files render as a compact list like Outline items; the panel keeps its content at the top instead of stretching a single file item to fill the available height.
- Sidebar Files and Outline panels share the available sidebar height, scroll internally when their content is long, and can collapse independently. Files collapses upward into its header row; Outline collapses downward into its header row.
- Localization table that can review against a selected previous CSV, filter visible rows by review status, jump to current / candidate review sources, expand candidate diff details, show session override / export readiness state, clear visible draft overrides, keep session-local translation overrides, export a lightweight draft CSV, export a real updated localization CSV through the shared CLI update flow, and when the browser exposes native file handles write that updated CSV back to the linked previous file. The dev host remembers the selected previous CSV by `sessionId`, so follow-up review / update requests can reuse that baseline without resending the full CSV text.
- Draft node graph preview extracted from the current script.
- Controlled node title rename from the graph view. The patch updates `# title` lines and matching `-> title` references in the text surface.
- Graph view keeps the user in the graph while selecting nodes or exits, shows Blueprint-like input/output ports with per-choice outgoing rows, and now supports dragging a card body to reposition it.
- Graph edges are drawn from real output port centers to target input port centers, and output ports can be dragged onto another node input to retarget that choice / jump in the text source; dropping anywhere outside an input port disconnects the edge.
- Hovering an output row lightly marks the source node, the visible target node, and the corresponding edge path so dense graphs can be read one connection at a time. The hover matcher accepts both Compiler project graph edges and offline draft outgoing rows, and reapplies the active edge highlight after SVG edge-layer refreshes.
- Graph rendering projects back edges and cycle-closing edges onto reference-only nodes in a source-local return lane. These reference nodes are view-layer shortcuts to the real target: they sit to the right of the source node, accept incoming edges, have no outgoing ports, cannot be renamed, and keep the displayed graph flowing forward without changing Compiler graph truth. Hovering a reference node lightly marks its source and real target cards.
- Reference popover for title refs now follows the clicked block, presenting compact context previews with the hit highlighted and a `choice -> target` summary instead of raw file paths.
- Line identity hints now come from the existing Tooling line sidecar refresh flow through the dev host bridge. The dev host keeps the latest line-map by `sessionId`, so the editor can refresh with a small session request while Tooling still migrates stable `line_...` ids across edits; explicit `existingLineMap` remains as a compatibility fallback. Structural rows that are not part of localization identity stay quiet instead of receiving fake ids.
- Line identity hover text is only rendered when Tooling provides an available `line_...` id. Untracked rows such as metadata and jumps stay quiet, and the adapter accepts both camelCase and PascalCase line-map JSON fields.
- Line hint positions are locked to Monaco's own content coordinate system. The hint rail has no independent vertical padding, and each hint row uses the editor's runtime line height so wrapped lines keep their following line numbers aligned with the next logical line start.
- Workspace summary chips for node count, localization rows, draft translations, and diagnostics.
- Quiet loading states now cover the workbench shell, Monaco editor setup, Preview, Graph, localization table, diagnostics, outline, Runtime, and workspace summary while local services refresh.
- Monaco-backed writing surface with a quieter, more client-like shell than the initial textarea prototype.
- Script semantic styling can be toggled from the top bar. When enabled, titles, narration, dialogue, prompts, choices, and the active block receive quiet text styling and soft block emphasis, and the toggle itself shows its pressed state.
- Dev-hosted diagnostics bridge: the workbench now tries `Inscape.LanguageServer --diagnose-file` through the local preview server, then falls back to the UI-only draft diagnostics model if the host bridge is unavailable.
- Monaco diagnostics markers: the editor surface now mirrors diagnostics into in-place Monaco markers while keeping the clickable diagnostics dock below.
- Status-bar diagnostic navigation: the bottom bar now shows current line, diagnostic provider, diagnostic count, and previous / next problem navigation.
- Problems panel organization: the diagnostics dock now behaves more like a real Problems panel, with severity filters, per-filter counts, and active-line highlighting.
- Workspace session state: the sidebar now shows file, dirty state, source state, active view, layout mode, and diagnostics backend as lightweight session facts.
- Host capability view that shows the shared Host Schema / Host Binding catalog for queries, events, speakers, and timeline bindings, with source jumps back to schema, bridge, or script locations.
- Writing-surface polish: the shell now uses a quieter paper-like writing surface, softer preview presentation, and less form-like control styling so the workbench reads more like an immersive authoring tool.
- Main-view reset in progress: the default editor + preview split is being rebuilt around a calmer Inky-like split and Notion-like reading hierarchy, with thinner chrome, quieter sidebar metadata, and hover-first auxiliary text.
- Preview speaker display is no longer duplicated on hover; the reading pane keeps the inline speaker label as the single speaker cue.
- Preview reading mode can switch between `Static` and `Flow`. Static keeps the full active block visible; Flow starts from the title, advances one prose line per click, fades speaker names in quickly, types newly revealed body text, then reveals the full choice group at once. Metadata tags do not consume Flow clicks: leading `@...` tags attach to the title, and tags after prose attach to that completed line. In Flow, mouse wheel navigation only takes over after the preview pane reaches its own top or bottom: upward wheel rewinds one reading step, downward wheel advances through a threshold accumulator, and visible choices block downward fast-forward.
- Preview now consumes the served Compiler project graph in the normal dev-host path. Its visible lines, metadata, choice prompts, choice options, and default jump continue actions are mapped from `/api/story-graph` output. The UI-only script model remains only as an offline fallback when the Compiler bridge is unavailable; if a compiler-project graph is returned but a node loses `previewLines`, Preview reports a compiler graph contract error instead of filling the body from the draft model.
- Dev-hosted hover bridge: node titles and jump targets in the Monaco surface now try `Inscape.LanguageServer --hover-file` through the local preview server.
- Dev-hosted definition and references bridges: the Monaco surface now tries `Inscape.LanguageServer --definition-file` and `--references-file` for node titles and jump targets in the current script.
- References parity is guarded by direct and HTTP smoke checks. `/api/references` uses `Inscape.LanguageServer --references-project`, includes the current workspace draft documents, returns cross-file references, and normalizes dev-host temporary source paths back to workspace-relative paths before the browser renders the refs overlay.
- Semantic parity across the LanguageServer-backed authoring endpoints is guarded by `check:semantic-parity-http`. It exercises diagnostics, node completion, definition, references, hover, and document symbols through real HTTP requests against a temporary workspace with current draft content and a cross-file target.
- Ctrl/Cmd-click definition navigation explicitly reveals the resolved source line in the editor and updates the preview block, instead of relying only on Monaco same-model goto behavior.
- Dev-hosted completion bridge: jump targets now try `Inscape.LanguageServer --completion-file` so the Monaco surface can suggest node names while writing `-> target`.
- Dev-hosted Host Schema bridge: `[query]` interpolation and `@emit` event authoring now request `Inscape.LanguageServer --host-schema-capabilities-project` through `/api/host-schema-capabilities`, so completion and hover hints stay aligned with the shared Host Schema catalog instead of browser-side guesses.
- Dev-hosted Host Binding bridge: speaker names and `@timeline` authoring now request `Inscape.LanguageServer --host-binding-capabilities-project` through `/api/host-binding-capabilities`, so completion, hover, definition, references, and Ctrl/Cmd-click navigation come from shared Host Bridge data plus compiled workspace occurrences instead of VSCode-specific JSON parsing.
- The `Host` workbench view consumes those same Host Schema and Host Binding bridges to display the current query, event, speaker, and timeline capability catalog. It only renders shared capability data and source jumps; it does not parse Host Schema or Host Bridge JSON in the browser.
- Dev-hosted stable node map bridge: the top bar `Node Map` action now requests `/api/node-map-review`, which runs shared CLI `update-node-map-project --report` over the current temporary workspace. The review surface shows the shared `renamed / new / missing / conflict / manual-review` report, can jump to current or candidate source lines, and can download the generated `inscape.node-map.json`. Manual-review candidates can also request a dry-run preview or apply a selected stable id through `/api/node-map-apply`, which calls shared CLI `apply-node-map-candidate-project`; the browser only updates the downloadable node map payload and does not reimplement sidecar mutation.
- Dev-hosted outline bridge: the sidebar outline now tries `Inscape.LanguageServer --document-symbols-file` and supports click-to-reveal navigation.
- Monaco rename bridge: node titles and jump targets now support the editor rename flow, then apply a controlled whole-document patch that updates `# title` lines and matching `-> title` references.
- Dev-hosted story graph bridge: the Graph view now requests compact project graph data from the preview server, which runs the existing CLI `compile-project` flow and returns real Compiler nodes and edges. Choice and default jump ports are built from that graph output; dragging an output port still patches the source `-> target` text.
- Dev-hosted runtime bridge: the workbench now requests a Runtime snapshot from `/api/runtime-state`, which runs the existing CLI `runtime-project` flow over the temporary workspace and reports the entry node in the session state. The dev host keeps the latest compact Runtime snapshot by `sessionId`, so `/api/runtime-action` can step that server-side session through `continue`, `advance-flow`, `rewind`, `rewind-flow`, or `choose` via the same CLI contract; explicit `runtimeState` payloads remain as a fallback.
- Dev-hosted line-map bridge: `/api/line-map-refresh` now keeps the latest Tooling line sidecar by `sessionId`, so follow-up refreshes do not have to upload the full previous line-map. The host only remembers the sidecar payload; line identity migration continues to be computed by shared `refresh-l10n-line-map-project`.
- Dev-hosted localization baseline bridge: `/api/localization-review` records an explicitly selected previous CSV by `sessionId`, and `/api/localization-review` / `/api/localization-update` can reuse that baseline on later requests. The host only remembers the previous CSV text; alignment review, candidate scoring, override application, and updated CSV generation still run through shared Tooling / CLI commands.
- Dev-hosted session cache state is bounded and observable. Runtime snapshots, line-map sidecars, and localization baselines share a two-hour idle TTL plus a 64-entry per-cache capacity limit; `/api/session-cache-status` reports counts, byte sizes, eviction counters, and session ids without exposing cached script, line-map, or CSV payload content.
- Preview choice clicks now try the Runtime action bridge first when the reading pane is already showing the same node as the latest Runtime snapshot. Successful `choose` / `continue` steps replace the reading pane with the returned Runtime node and reveal that node in the editor; source-only navigation remains the fallback when Runtime is unavailable or out of sync with the current preview node.
- Preview also prefers the latest Runtime current node during normal re-render when the active source line is still inside that same node. That keeps the reading pane on Runtime truth through ordinary refreshes instead of snapping back to the compiler-graph presenter state after every render pass.
- Preview now also uses the Runtime current node as the first player node when a new document opens at the top and the workbench has not established a presenter node yet. That lets the initial reading pane start from Runtime entry truth instead of assuming the first visible script node is the right player start.
- Preview now shows the Runtime path as a light reading-history strip and uses a Runtime-backed `Back` action to rewind one visited node at a time. The workbench only displays and triggers this shared runtime history; it does not rebuild a separate node-history state in the browser.
- Preview Flow now also prefers shared Runtime reading progress when a Runtime snapshot is available. Node-internal reading steps are driven by `readingProgress` and `state.visibleStepCount`, and the browser only relays `advance-flow` / `rewind-flow` instead of inventing a second flow-step truth locally. Existing `continue` / `choose` semantics stay unchanged.
- Runtime dev-host smoke now covers both direct bridge logic and real HTTP transport. `check:runtime` asserts the compact Runtime payload and the `choose` -> `continue` transition chain without starting a server first, while `check:runtime-http` starts the preview dev server in-process and exercises `/api/runtime-state` plus `/api/runtime-action` end to end, including server-side `sessionId` state progression without resending the full Runtime state on every action.
- Line-map dev-host smoke now covers both direct bridge logic and real HTTP transport. `check:line-map` and `check:line-map-http` assert that a second refresh can preserve an existing stable line id through `sessionId` alone, without resending `existingLineMap`.
- Dev-host process output is treated as UTF-8 end to end: CLI / LanguageServer entries set UTF-8 stdout, and the SelfHostedEditor dev server collects child-process stdout/stderr buffers before decoding. Failed commands report bounded process diagnostics with exit code or timeout state plus truncated stdout/stderr previews; do not decode child-process chunks one-by-one, and do not return unbounded process output in HTTP errors.

The draft extraction model is UI-only. It exists to make the shell useful while the real `Tooling` / `LanguageServer` / `Runtime` contracts are wired in.

## Handoff Notes

Most recent user-facing work focused on replacing fragile prototype behavior with real shared contracts:

- Default sample loading now uses the real `samples/court-loop.inscape` file through the preview server. There is no hard-coded script fallback in the entry file.
- Graph edges are no longer layout guesses. `StoryGraphPreviewController` renders cards first, reads real input/output port centers with `getBoundingClientRect()`, and draws SVG curves from output to input. Dragging an output port to an input retargets the source line; dropping elsewhere disconnects it. The graph SVG layer sits above the board and below node cards, and input-port hit testing includes a small snap area so connection drags do not vanish after release.
- Graph topology is no longer derived from the front-end draft parser in the normal hosted path. `SelfHostedEditorStoryGraphBridge` calls `/api/story-graph`, and the dev host runs `compile-project` over the temporary workspace so the visual graph follows the same choice / jump edges as Compiler project IR.
- Graph edge drawing is refreshed after the graph panel becomes visible or resizes. This avoids hidden-panel layout reads producing zero-sized port positions and an apparently disconnected graph.
- Graph now renders inside a pannable and zoomable viewport that expands to the workbench body when the Graph view is active. Empty canvas drag pans the board, mouse wheel zooms around the pointer, and the small viewport controls provide zoom in / out / reset. Node dragging and edge drawing use graph-space coordinates so they keep working while zoomed.
- Graph output rows now provide local edge focus feedback: hovering a row highlights the source card, the displayed target card, and the SVG path without changing selection or switching views. This path is tolerant of both `sourceTitle` / `targetTitle` graph edges and `nodeTitle` / `target` outgoing rows.
- Graph back-edge cleanup is view-only: `StoryGraphPreviewController` projects edges whose target appears at or before the source, or whose addition would close a cycle in the displayed graph, onto source-local reference nodes. Loop edges remain short rightward links instead of crossing back through the main canvas, and hovering a reference reveals the source / real-target relationship without adding persistent labels. Retargeting a connection to a reference still writes the real target title back to source text.
- Script semantic styling now treats `@...` metadata as muted authoring metadata and `[query]` spans as quiet query tokens. Monaco's Unicode ambiguous character warning is disabled for this prose-oriented surface so Chinese punctuation does not produce source-code confusable warnings.
- Preview rendering hides the literal `@` marker and presents metadata as non-clickable, non-selectable, borderless blue-gray tags. Query interpolation tokens remain visible as subtle inline chips.
- Preview now renders the block that contains the active source line. Definition navigation or source-line focus into another block updates the preview content without coupling the editor and preview scroll positions.
- Preview no longer renders the draft total-line-count meta text inside the reading surface; line counts belong in workspace/session status, not in the prose preview.
- Preview mode is local presenter state: `static` renders the whole active block, while `flow` uses click-to-advance line disclosure and reveals all choices together with their target titles. It is not Runtime state yet.
- Preview choice clicks are a product invariant: clicking a choice in the reading pane must advance the Preview to the target block and reveal the target block title in the editor. Do not regress this into source-only navigation.
- Script Ctrl/Cmd-click definition navigation routes through the workbench source selection flow, so the editor cursor and preview block both reveal the resolved target.
- The editor and preview panes use independent scroll containers. The outer workbench body is not a shared scroll surface, so scrolling Monaco should not move the preview pane.
- Monaco sticky scroll is disabled in the writing surface. Node titles and choice / prompt lines should scroll out like normal prose instead of pinning at the top and creating overlay artifacts.
- The preview server sends static assets with `Cache-Control: no-store`, so reloads should not keep stale entry scripts or the removed sample fallback alive during local iteration.
- Reference overlay positioning now receives the clicked refs button rect from `EditorSurfaceController` and repositions inside the editor frame while scrolling.
- Script semantic styling is controlled by the `Syntax` toggle and uses Monaco inline decorations for text style plus overlay decorations for the active block.
- Stable line hints use `SelfHostedEditorLineMapBridge` and `ScriptLineIdentityModelBuilder`. The bridge calls `/api/line-map-refresh`, which runs the existing CLI/Tooling `refresh-l10n-line-map-project` in a temporary workspace. The dev host now remembers the previous line-map by session, with explicit previous sidecar upload kept as fallback, so Tooling can preserve `line_...` ids across edits without the browser always resending the full sidecar.
- The hint rail must not display placeholder identity text. Show a stable id only when the identity status is `available`; untracked or unavailable rows should render just the local block line number.
- The line hint rail must stay in Monaco content coordinates. Do not add separate top/bottom padding to `.hint-rail`; Monaco `getTopForLineNumber()` already includes editor padding and wrapped-line height.

Known prototype layers that should be replaced next:

- `ScriptDocumentModelBuilder` is still a UI-only extraction model. Do not expand it into parser truth; replace narrow consumers with `Tooling` / `LanguageServer` / `Runtime` outputs.
- Host Schema `[query]` / `@emit` and Host Binding speaker / `@timeline` hints now come from LanguageServer capabilities. Speaker definition / references and `@timeline` navigation also use the same Host Binding capability path instead of copying VSCode's `.host.bridge.json` parsing into the browser.
- Stable node map update / review now has a SelfHostedEditor entry point, and candidate apply remains a thin host bridge over shared CLI commands. `/api/node-map-review` calls `update-node-map-project --report`; `/api/node-map-apply` calls `apply-node-map-candidate-project` for both dry-run and apply. The browser can download the updated sidecar, but it still does not edit `inscape.node-map.json` directly.
- Graph has started that replacement path: it still uses draft extraction only as an offline fallback, while the served prototype consumes Compiler project graph output.
- The line-map bridge is still a dev-host HTTP + CLI bridge. It is semantically correct because it reuses Tooling, and now has a first `sessionId` memory boundary for the latest sidecar; the desktop client should eventually route this through a real editor backend or long-lived Tooling session.
- Graph positions are session memory only. They need a layout sidecar before becoming persistent product behavior.
- Localization editing is mid-migration from a session-local draft table toward `LocalizationAlignmentReportModel.Presenter`. The dev-host `/api/localization-review` bridge now returns a compact review payload tailored to the workbench table instead of forwarding the full audit report, but it keeps the shared `presenter.items` shape rather than inventing a second host-only presenter contract. The compact payload also preserves Tooling review actions for current source jump, candidate source jump, and candidate diff display. The front-end `SelfHostedEditorLocalizationReviewBridge` consumes those hosted review items while direct/offline mode still falls back to the draft table. The workbench can now select a real previous CSV, filter visible rows by host-side status visibility only, use row-level review actions, show session override / export readiness state, clear only the currently visible draft overrides, export a real updated CSV through `/api/localization-update`, and when native file handles are available write that updated CSV back to the linked previous file. The dev host now keeps the last selected previous CSV by `sessionId`, so follow-up review / update requests can carry only the session and current overrides; explicit `previousCsv` is still accepted as a compatibility and reseed path. Linked baselines also report a host-only `clean / unsaved` state so the workbench can tell whether there is anything left to write back. Browsers without native file handles stay on the existing file-input plus download path.
- Preview is not yet Runtime Player. It should eventually consume `Runtime` state rather than only front-end preview extraction.
- Preview content now starts from Compiler project graph data, and when Runtime is available its node-internal Flow progression also follows shared Runtime reading progress. Local presenter flow state remains only as an offline fallback when Runtime is unavailable. A returned compiler-project graph must keep `previewLines` intact for every node that has compiler lines; malformed graph data is an explicit Preview error, not a draft-content fallback.
- The Runtime bridge can now step restored snapshots through `continue`, `advance-flow`, `rewind`, `rewind-flow`, and `choose`, and Preview can already consume those actions when the current preview node matches the latest Runtime snapshot. Initial player node selection, node-level history rewind, and node-internal flow-step progress are now Runtime-backed when Runtime is available; the dev host now has a first `sessionId` state boundary, while the remaining gap is a real desktop-side Runtime session that is not rebuilt around temporary workspaces.

## Development

Run static checks:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:process-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
```

`check:localization-review` exercises the full localization-review dev-host path for `samples/court-loop.inscape` without requiring the local HTTP server to be started first.
`check:host-binding` exercises the Host Binding capability helper without requiring the local HTTP server to be started first.
`check:host-binding-http` starts the preview dev server in-process and performs a real HTTP request to `/api/host-binding-capabilities`.
`check:host-schema` exercises the Host Schema capability helper without requiring the local HTTP server to be started first.
`check:host-schema-http` starts the preview dev server in-process and performs a real HTTP request to `/api/host-schema-capabilities`.
`check:line-map` exercises the Tooling line-map refresh helper without requiring the local HTTP server to be started first, including server-side session carry-over of the previous sidecar.
`check:line-map-http` starts the preview dev server in-process and performs real HTTP requests to `/api/line-map-refresh`, including the `sessionId` path where the second refresh preserves stable ids without an `existingLineMap` request body.
`check:localization-review-http` starts the preview dev server in-process and performs a real HTTP request to `/api/localization-review`.
`check:localization-update` exercises the real updated-CSV path by feeding previous CSV text plus anchor-based translation overrides into the shared CLI update flow, then verifies the same update can reuse the previous CSV from `sessionId`.
`check:localization-update-http` starts the preview dev server in-process and performs real HTTP requests to `/api/localization-review` and `/api/localization-update`, including the `sessionId` path where review and update reuse the server-side previous CSV baseline.
`check:runtime` exercises the Runtime dev-host path without requiring the local HTTP server to be started first, and asserts `advance-flow` / `rewind-flow` plus `choose` / `continue` transitions over a compact payload.
`check:runtime-http` starts the preview dev server in-process and performs real HTTP requests to `/api/runtime-state` and `/api/runtime-action`, including the `sessionId` path where actions advance server-side Runtime state without a `runtimeState` request body.
`check:semantic-parity-http` starts the preview dev server in-process and performs real HTTP requests to the LanguageServer-backed authoring endpoints: diagnostics, completions, definition, references, hover, and document symbols.
`check:references` exercises the LanguageServer project references dev-host helper without requiring the local HTTP server to be started first, including cross-file references and current draft content.
`check:references-http` starts the preview dev server in-process and performs a real HTTP request to `/api/references`, including workspace-relative source path normalization.
`check:node-map` exercises the stable node map review and candidate apply helpers without requiring the local HTTP server to be started first, including a title rename over an existing generated sidecar and a manual-review candidate dry-run/apply.
`check:node-map-http` starts the preview dev server in-process and performs real HTTP requests to `/api/node-map-review` and `/api/node-map-apply`.
`check:process-bridge` verifies successful process output, nonzero exit diagnostics, truncated stdout/stderr previews, and timeout state without starting a server.
`check:session-cache` verifies the dev-host session cache TTL, per-cache capacity limit, eviction counters, and non-content status shape without starting a server.
`check:session-cache-http` starts the preview dev server in-process, seeds Runtime, line-map, and localization baseline session caches through real HTTP APIs, then requests `/api/session-cache-status`.

Serve the prototype locally:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run start
```

Install dependencies when the package lock changes:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor install
```

The server prints a local URL. Open the prototype through that local server so the workbench CSS, Monaco loader, and API bridges resolve from the expected root paths.

Use `Open .inscape` in the top bar to load a local script into the prototype. This is a browser-only bridge for the first shell; the future desktop client should replace it with the host file / project workspace bridge.

The local preview server now opens `samples/court-loop.inscape` as the default sample when served through `npm run start`. If the HTML is opened without the server or the file cannot be read, the workbench reports that the default `.inscape` sample failed to load instead of using embedded script text.

## Boundary

Do not implement parser, graph compiler, localization scoring, or runtime truth in this package. Temporary UI-only parsing is allowed only to make the shell legible; it must be replaced by `LanguageServer` / `Tooling` / `Runtime` contracts before becoming product behavior.
