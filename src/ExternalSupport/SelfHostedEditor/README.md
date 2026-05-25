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
- Draft localization table extracted from the current script, with session-local translation draft editing and browser CSV export.
- Draft node graph preview extracted from the current script.
- Controlled node title rename from the graph view. The patch updates `# title` lines and matching `-> title` references in the text surface.
- Graph view keeps the user in the graph while selecting nodes or exits, shows Blueprint-like input/output ports with per-choice outgoing rows, and now supports dragging a card body to reposition it.
- Graph edges are drawn from real output port centers to target input port centers, and output ports can be dragged onto another node input to retarget that choice / jump in the text source; dropping anywhere outside an input port disconnects the edge.
- Hovering an output row lightly marks the source node, the visible target node, and the corresponding edge path so dense graphs can be read one connection at a time. The hover matcher accepts both Compiler project graph edges and offline draft outgoing rows, and reapplies the active edge highlight after SVG edge-layer refreshes.
- Graph rendering projects back edges and cycle-closing edges onto reference-only nodes in a source-local return lane. These reference nodes are view-layer shortcuts to the real target: they sit to the right of the source node, accept incoming edges, have no outgoing ports, cannot be renamed, and keep the displayed graph flowing forward without changing Compiler graph truth. Hovering a reference node lightly marks its source and real target cards.
- Reference popover for title refs now follows the clicked block, presenting compact context previews with the hit highlighted and a `choice -> target` summary instead of raw file paths.
- Line identity hints now come from the existing Tooling line sidecar refresh flow through the dev host bridge. The editor keeps the last line-map as the next refresh input, so Tooling can migrate stable `line_...` ids across edits; structural rows that are not part of localization identity stay quiet instead of receiving fake ids.
- Line identity hover text is only rendered when Tooling provides an available `line_...` id. Untracked rows such as metadata and jumps stay quiet, and the adapter accepts both camelCase and PascalCase line-map JSON fields.
- Line hint positions are locked to Monaco's own content coordinate system. The hint rail has no independent vertical padding, and each hint row uses the editor's runtime line height so wrapped lines keep their following line numbers aligned with the next logical line start.
- Workspace summary chips for node count, localization rows, draft translations, and diagnostics.
- Monaco-backed writing surface with a quieter, more client-like shell than the initial textarea prototype.
- Script semantic styling can be toggled from the top bar. When enabled, titles, narration, dialogue, prompts, choices, and the active block receive quiet text styling and soft block emphasis, and the toggle itself shows its pressed state.
- Dev-hosted diagnostics bridge: the workbench now tries `Inscape.LanguageServer --diagnose-file` through the local preview server, then falls back to the UI-only draft diagnostics model if the host bridge is unavailable.
- Monaco diagnostics markers: the editor surface now mirrors diagnostics into in-place Monaco markers while keeping the clickable diagnostics dock below.
- Status-bar diagnostic navigation: the bottom bar now shows current line, diagnostic provider, diagnostic count, and previous / next problem navigation.
- Problems panel organization: the diagnostics dock now behaves more like a real Problems panel, with severity filters, per-filter counts, and active-line highlighting.
- Workspace session state: the sidebar now shows file, dirty state, source state, active view, layout mode, and diagnostics backend as lightweight session facts.
- Writing-surface polish: the shell now uses a quieter paper-like writing surface, softer preview presentation, and less form-like control styling so the workbench reads more like an immersive authoring tool.
- Main-view reset in progress: the default editor + preview split is being rebuilt around a calmer Inky-like split and Notion-like reading hierarchy, with thinner chrome, quieter sidebar metadata, and hover-first auxiliary text.
- Preview speaker display is no longer duplicated on hover; the reading pane keeps the inline speaker label as the single speaker cue.
- Preview reading mode can switch between `Static` and `Flow`. Static keeps the full active block visible; Flow starts from the title, advances one line per click, then reveals the full choice group at once.
- Dev-hosted hover bridge: node titles and jump targets in the Monaco surface now try `Inscape.LanguageServer --hover-file` through the local preview server.
- Dev-hosted definition and references bridges: the Monaco surface now tries `Inscape.LanguageServer --definition-file` and `--references-file` for node titles and jump targets in the current script.
- Ctrl/Cmd-click definition navigation explicitly reveals the resolved source line in the editor and updates the preview block, instead of relying only on Monaco same-model goto behavior.
- Dev-hosted completion bridge: jump targets now try `Inscape.LanguageServer --completion-file` so the Monaco surface can suggest node names while writing `-> target`.
- Dev-hosted outline bridge: the sidebar outline now tries `Inscape.LanguageServer --document-symbols-file` and supports click-to-reveal navigation.
- Monaco rename bridge: node titles and jump targets now support the editor rename flow, then apply a controlled whole-document patch that updates `# title` lines and matching `-> title` references.
- Dev-hosted story graph bridge: the Graph view now requests compact project graph data from the preview server, which runs the existing CLI `compile-project` flow and returns real Compiler nodes and edges. Choice and default jump ports are built from that graph output; dragging an output port still patches the source `-> target` text.

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
- Script Ctrl/Cmd-click definition navigation routes through the workbench source selection flow, so the editor cursor and preview block both reveal the resolved target.
- The editor and preview panes use independent scroll containers. The outer workbench body is not a shared scroll surface, so scrolling Monaco should not move the preview pane.
- Monaco sticky scroll is disabled in the writing surface. Node titles and choice / prompt lines should scroll out like normal prose instead of pinning at the top and creating overlay artifacts.
- The preview server sends static assets with `Cache-Control: no-store`, so reloads should not keep stale entry scripts or the removed sample fallback alive during local iteration.
- Reference overlay positioning now receives the clicked refs button rect from `EditorSurfaceController` and repositions inside the editor frame while scrolling.
- Script semantic styling is controlled by the `Syntax` toggle and uses Monaco inline decorations for text style plus overlay decorations for the active block.
- Stable line hints use `SelfHostedEditorLineMapBridge` and `ScriptLineIdentityModelBuilder`. The bridge calls `/api/line-map-refresh`, which runs the existing CLI/Tooling `refresh-l10n-line-map-project` in a temporary workspace. The previous line-map is sent back as the next existing sidecar so Tooling can preserve `line_...` ids across edits.
- The hint rail must not display placeholder identity text. Show a stable id only when the identity status is `available`; untracked or unavailable rows should render just the local block line number.
- The line hint rail must stay in Monaco content coordinates. Do not add separate top/bottom padding to `.hint-rail`; Monaco `getTopForLineNumber()` already includes editor padding and wrapped-line height.

Known prototype layers that should be replaced next:

- `ScriptDocumentModelBuilder` is still a UI-only extraction model. Do not expand it into parser truth; replace narrow consumers with `Tooling` / `LanguageServer` / `Runtime` outputs.
- Graph has started that replacement path: it still uses draft extraction only as an offline fallback, while the served prototype consumes Compiler project graph output.
- The line-map bridge is a dev-host HTTP + CLI bridge. It is semantically correct because it reuses Tooling, but the desktop client should eventually route this through a real editor backend or long-lived Tooling session.
- Graph positions are session memory only. They need a layout sidecar before becoming persistent product behavior.
- Localization editing is still a session-local draft table and CSV download. It should consume real CSV data and `LocalizationAlignmentReportModel.Presenter`.
- Preview is not yet Runtime Player. It should eventually consume `Runtime` state rather than only front-end preview extraction.

## Development

Run static checks:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

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
