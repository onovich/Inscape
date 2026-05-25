# Runtime

Owns runtime-facing narrative execution code that consumes Compiler IR.

Allowed business areas: `StoryRuntime`, `Input`, `Localization`, and `HostBridge`.

Do not move compiler graph construction or editor preview state here.

Current baseline:

- `Inscape.Runtime.csproj` is a buildable library project in `Inscape.slnx`.
- `StoryRuntime/Domains/NarrativeRuntime.cs` consumes `DslScriptDocumentModel` graph output from Compiler.
- The runtime supports a minimal lifecycle: `LoadGraph`, `Start`, `Choose`, `Continue`, and `Restore`.
- `NarrativeRuntime.CreateSnapshot()` returns `inscape.runtime-state` data with the current state and current Compiler node for editor Player integration.
- Runtime does not parse `.inscape` text and does not know about VSCode, HTML Preview, UnitySample, or Host Bridge details.
