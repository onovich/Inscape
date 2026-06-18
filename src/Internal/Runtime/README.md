# Runtime

Owns runtime-facing narrative execution code that consumes Compiler IR.

Allowed business areas: `StoryRuntime`, `Input`, `Localization`, and `HostBridge`.

Do not move compiler graph construction or editor preview state here.

Current baseline:

- `Inscape.Runtime.csproj` is a buildable library project in `Inscape.slnx`.
- `StoryRuntime/Domains/NarrativeRuntime.cs` consumes `DslScriptDocumentModel` graph output from Compiler.
- The runtime supports a minimal lifecycle: `LoadGraph`, `Start`, `AdvanceFlow`, `RewindFlow`, `Choose`, `Continue`, `Rewind`, and `Restore`.
- Runtime state now tracks `VisibleStepCount`, so node-internal reading progress has shared Runtime truth instead of living only in a host-side presenter.
- Runtime state now tracks internal narrative facts: visited nodes, seen line anchors, and choice history.
- `NarrativeRuntime.QueryProvider` supplies delegate / mock / recorded query values to Runtime flow while internal facts still resolve first.
- `HostBridge/Domains/NarrativeRuntimeQueryProviderDomain.cs` defines the first Runtime query provider contract:
  - `Delegate` is the formal host gameplay-state path.
  - `Mock` is for editor preview, tests, and CI.
  - `Recorded` is for debug replay / trace evidence.
  - Internal facts such as `current_node()`, `visited(nodeId)`, `seen(lineId)`, and `last_choice(nodeId)` resolve before external provider sources.
- `StoryRuntime/Domains/NarrativeRuntimeConditionEvaluatorDomain.cs` evaluates Compiler condition IR with Runtime values:
  - It consumes `DslScriptConditionExpressionModel`, never raw `.inscape` condition strings.
  - It supports bool / number / string values, `and` / `or` / `not`, scalar comparisons, query path / call, and Runtime query provider lookup.
  - It returns structured Runtime diagnostics for missing query, provider exception, type mismatch, unsupported operator, or non-bool top-level results.
- Runtime flow now uses the evaluator for conditional choices and conditional jumps:
  - `CreateSnapshot()` exposes only visible choice options in `CurrentNode`.
  - `Choose(groupIndex, optionIndex)` treats `optionIndex` as visible option index and records the original option index in choice facts.
  - `Continue()` resolves conditional jumps in source order with first true wins, then falls back to `DefaultNext`.
  - `LastError` and snapshot `LastError` report flow errors such as missing visible choice, missing target, condition evaluation failure, or no matching conditional jump / fallback.
- Runtime now has the first action dispatcher contract:
  - `NarrativeRuntime.ActionDispatcher` accepts action capability mode data and Host Bridge handler bindings as injected Runtime-side models.
  - `@emit` metadata lines can produce `fire` action requests without blocking Runtime flow.
  - `wait` action requests enter `PendingAction` and block Runtime flow until `ResumeAction()` receives a completed resume.
  - `handoff` action requests use the same pending / resume surface as `wait`, while preserving `Mode = "handoff"` to signal host control transfer instead of a single host action wait.
  - Missing schema action, missing handler mapping, unsupported mode, host delegate exceptions, wrong resume request ids, and failed / cancelled / timeout resumes produce structured action errors.
- `NarrativeRuntime.CreateSnapshot()` returns `inscape.runtime-state` data with the current state, current Compiler node, and `ReadingProgress` for editor Player integration.
- `NarrativeRuntime.CreateSnapshot()` also exposes branch query receipts, action requests, pending action evidence, and displayed-text `LogEntries` outside the formal Runtime State export.
- `NarrativeRuntime.ExportState()` returns the P3 minimal formal Runtime State shape: `format`, `formatVersion`, `runtimeVersion`, `scriptVersion`, `position`, `flow`, `facts`, `random`, and `host.checkpointId`.
- `NarrativeRuntime.ValidateStateAgainstCurrentScript()` reports `compatible`, `migratable`, or `incompatible` without silently repairing state.
- `NarrativeRuntime.ExportSubstate()` returns the P4 recoverable Inscape narrative substate shape: `format = inscape.runtime-substate`, `formatVersion`, `runtimeVersion`, `scriptVersion`, `position`, `flow`, `facts`, `pendingAction`, `branchQueryReceipts`, and `host.checkpointId`.
- `NarrativeRuntime.ImportSubstate()` restores only compatible P4 substate data, rejects migratable / incompatible substate data with `IRT011`, and does not silently repair script drift.
- Runtime Log / Backlog first cut records only content lines that were actually revealed through `AdvanceFlow()`, using `sequence`, `nodeId`, `lineId`, `speaker`, and `text`.
- `ReadingProgress` currently exposes `ContentStepCount`, `MaxVisibleStepCount`, `VisibleStepCount`, `CanAdvance`, `CanRewind`, `IsChoiceStageVisible`, and `IsContinueStageVisible`.
- The CLI `runtime-project` command can start a project or restore a previous snapshot / formal state and apply one `Continue` / `AdvanceFlow` / `Rewind` / `RewindFlow` / `Choose` action before returning the next snapshot. It can also emit formal state with `--export-state` and validate it with `--validate-state`.
- Formal Runtime State does not include full Log, full Rollback stack, full Trace Replay, or gameplay state ownership.
- P4 Runtime Substate does not include full Log, full action request history, full Rollback stack, full Trace Replay, or host gameplay state; `host.checkpointId` remains an opaque id owned by the host save shell.
- Runtime does not parse `.inscape` text and does not know about VSCode, HTML Preview, UnitySample, or Host Bridge details.
- Runtime does not own gameplay state such as inventory, quest stage, trust, combat result, player position, or economy values; those belong behind host delegate queries.
- Runtime does not yet expose the full P4 playable driver through CLI import / resume parameters.
