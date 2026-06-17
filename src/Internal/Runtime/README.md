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
- `HostBridge/Domains/NarrativeRuntimeQueryProviderDomain.cs` defines the first Runtime query provider contract:
  - `Delegate` is the formal host gameplay-state path.
  - `Mock` is for editor preview, tests, and CI.
  - `Recorded` is for debug replay / trace evidence.
  - Internal facts such as `current_node()`, `visited(nodeId)`, `seen(lineId)`, and `last_choice(nodeId)` resolve before external provider sources.
- `NarrativeRuntime.CreateSnapshot()` returns `inscape.runtime-state` data with the current state, current Compiler node, and `ReadingProgress` for editor Player integration.
- `NarrativeRuntime.ExportState()` returns the P3 minimal formal Runtime State shape: `format`, `formatVersion`, `runtimeVersion`, `scriptVersion`, `position`, `flow`, `facts`, `random`, and `host.checkpointId`.
- `NarrativeRuntime.ValidateStateAgainstCurrentScript()` reports `compatible`, `migratable`, or `incompatible` without silently repairing state.
- `ReadingProgress` currently exposes `ContentStepCount`, `MaxVisibleStepCount`, `VisibleStepCount`, `CanAdvance`, `CanRewind`, `IsChoiceStageVisible`, and `IsContinueStageVisible`.
- The CLI `runtime-project` command can start a project or restore a previous snapshot / formal state and apply one `Continue` / `AdvanceFlow` / `Rewind` / `RewindFlow` / `Choose` action before returning the next snapshot. It can also emit formal state with `--export-state` and validate it with `--validate-state`.
- Formal Runtime State does not include full Log, full Rollback stack, full Trace Replay, or gameplay state ownership.
- Runtime does not parse `.inscape` text and does not know about VSCode, HTML Preview, UnitySample, or Host Bridge details.
- Runtime does not own gameplay state such as inventory, quest stage, trust, combat result, player position, or economy values; those belong behind host delegate queries.
