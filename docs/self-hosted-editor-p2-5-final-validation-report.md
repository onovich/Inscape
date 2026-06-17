# SelfHostedEditor P2.5 Final Validation Report

P2.5 Host Schema / Host Bridge / Unity-Bird adaptation: PASS
P3 entry allowed: YES

## Completed

- Bird importer / `InscapeGenerated` resource commit strategy is defined: P2.5 is dry-run-only, with temporary Bird importer copy allowed only for Unity batchmode verification and cleaned afterward.
- Real Timeline binding export was verified with Bird timeline `court_intro`, GUID `b07842ff2fa161e459e024dc1a9fae7f`, and asset path `Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset`.
- Bird Import Dry Run completed against the phase fixture manifest. `talking.exit` resolves to the real TimelineSO, while `node.enter`, `talking.enter`, and `node.exit` remain explicit `UNSUPPORTED_PHASE` warnings.
- Current Bird API drift was adapted only in `ExternalSupport`: `TalkingSO.TalkingId` and `TimelineSO.TimelineId` are used as the current IDs, while removed `TalkingTM` fields are no longer written.
- Bird L10N format was evaluated as an adapter / merge concern. Bird `ID,Desc,ZH_CN,EN_US`, `<pr>`, and `L10N_TalkingOption` do not change the generic Inscape localization CSV contract.
- Host Schema / Host Bridge boundaries were closed: Host Schema remains a capability catalog, while Host Bridge / adapter artifacts carry Unity GUID, asset path, Addressables key, Bird ID, handler, and query implementation mapping.
- Unity / Bird implementation remains in `src/ExternalSupport/UnityPlugin` or the external Bird project. `src/Internal` did not gain Unity, Bird, or Addressables dependencies.
- P2 stable identity / localization review semantics were not rewritten. P3 syntax, Runtime, and extension research were not implemented in P2.5.

## Validation

- `dotnet build Inscape.slnx --no-restore`: PASS
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`: PASS
- `dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj`: PASS
- `dotnet build src\ExternalSupport\UnityPlugin\Inscape.Adapters.UnitySample\Inscape.Adapters.UnitySample.csproj`: PASS
- `dotnet build src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj`: PASS
- `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`: PASS
- `npm --prefix src\ExternalSupport\VSCode run check:structure`: PASS
- `npm --prefix src\ExternalSupport\VSCode run check:semantic-parity`: PASS
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`: PASS
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure`: PASS, with the existing hard-coded color advisory for `SelfHostedEditorLocalization.css`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model`: PASS
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http`: PASS
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http`: PASS
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http`: PASS
- `rg -n "UnityEngine|UnityEditor|Bird\.|Addressables" src\Internal`: PASS, only the HostBinding README prohibition matched
- `rg -n "Host Schema.*assetPath|Host Schema.*birdId|Host Schema.*unityGuid" docs src\Internal`: PASS, only boundary docs, this phase guide/audits, and this final report matched
- `git diff --check`: PASS

## Bird / Unity Environment

- Available: YES
- Unity editor: `D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe`
- Bird project: `D:\UnityProjects\Bird`
- Latest passing dry run log: `D:\LabProjects\Inscape\artifacts\bird-trial\unity-dry-run-p2-5-phases-fixed-rerun.log`
- Latest passing dry run report: `D:\LabProjects\Inscape\artifacts\bird-trial\phase-export\bird-import-dry-run-report.txt`
- Dry run report summary: `create TalkingSO: 4`, `timeline hooks: 4`, `unresolved timeline hooks: 0`, `unsupported timeline hook phases: 3`
- Bird repo write status: no P2.5 temporary importer, `.meta`, `InscapeGenerated`, Addressables, or official L10N writes remain. The Bird worktree still only has the pre-existing two font fallback asset modifications.

## Remaining Risks

- True Bird Import and Addressables application still require explicit user confirmation and a separate Bird-side commit strategy.
- Bird `L10N_TalkingOption` output and project-language-column merge support are documented as adapter / merge follow-ups, not productized in this phase.
- The Bird importer remains a prototype under `unity-bird-importer/`, not a general Unity package.

## Next Candidate Phase

- P3 second syntax / Runtime / extension research may start only as a new scoped phase after this P2.5 PASS. It should not backfill Unity / Bird assumptions into `Internal`.
