# SelfHostedEditor P4 Final Validation Report

状态：P4 Runtime playable MVP PASS

最后更新：2026-06-18

## 结论

P4 Runtime playable MVP: PASS

P4 已在最终验收轮完成收口。当前实现把 P3 已落地的条件 IR、Host Schema `queries[]` / `actions[]`、Usage Manifest、Runtime query provider 与 Runtime State 最小模型推进到可运行剧情闭环，并保持 P4 明确的不做范围：不产品化 SelfHostedEditor Runtime Inspector UI，不做完整独立游戏存档产品，不做完整 Rollback / Trace Replay / Flashback / Presentation IR / Unity Host SDK。

## Completed

- Runtime condition evaluator 位于 `Internal/Runtime`，只消费 Compiler 条件 IR，支持 bool / number / string、`and` / `or` / `not`、括号、标量比较、query path / call，以及 missing query、provider exception、type mismatch 等结构化 Runtime error。
- Runtime flow 已接入条件选项、条件跳转、fallback 和 `first true wins`，并用 visible option index 保持玩家选择与隐藏选项分离。
- Runtime query provider 已支持 delegate / mock / recorded，内部叙事 facts 如 `visited()` / `seen()` / choice history 优先解析，宿主业务状态仍走 delegate query。
- Branch-affecting query receipt 已记录影响选项可见性和条件跳转的 query name、arguments、result、source kind、deterministic 与 node / choice / jump context；普通 Runtime State 不吞并完整 trace。
- Action dispatcher 第一刀已支持 Host Schema action mode `fire` / `wait` / `handoff`。`fire` 发出后继续，`wait` / `handoff` 进入 pending 并通过 `ResumeAction()` 恢复，失败 / 取消 / timeout 统一作为宿主异常上报。
- Log / Backlog 第一刀已存在，默认记录实际 reveal 的 `speaker`、`text`、`lineId`；条件隐藏文本、metadata 和 choice stage 不进入默认 Log。
- Formal Runtime State 继续保持小而可恢复，不包含完整 Log、Rollback stack、Trace Replay、branch receipts 或 action request history。
- P4 recoverable substate blob 已存在，格式为 `inscape.runtime-substate`，可 export / validate / import / continue，并保存 position、flow、facts、pending action、branch query receipts 与 opaque host checkpoint id。
- CLI `runtime-project` 已能用 JSON query provider、action dispatcher、resume、state/substate import/export/validation 驱动 P4 MVP。
- P4 integration smoke 使用真实 CLI 串起最小可玩样例：条件选项、mock query、`fire` action、`wait` pending / resume、Log、formal Runtime State、P4 substate 与 branch query receipt；key/fire path 和 no-key/wait/resume/help path 都能到达 `end`。
- VSCode / SelfHostedEditor 仍只做 host adapter / presenter / smoke，不复制 Runtime condition evaluator、query evaluator、action dispatcher、Log builder、substate import/export/validation 或 Runtime Inspector 产品语义。

## Validation

已运行并通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

最终边界扫描：

- `src/Internal` Unity / Bird / Addressables / ScriptableObject forbidden-term scan: PASS。
- `src/Internal` 与 ExternalSupport Resources 的 rollback / replay / failure / timeout policy implementation-field scan: PASS。
- ExternalSupport product-code Runtime semantic marker scan: PASS。
- Full docs policy-term review: REVIEWED。命中均为 P3 / P4 明确延期、边界说明、扫描命令文本，或未跟踪的外部建议草稿；没有 Host Schema / Runtime / ExternalSupport 实现字段落地。

说明：SelfHostedEditor `check:structure` 仍会输出既有 `SelfHostedEditorLocalization.css` hard-coded color warning，但命令退出成功，且该 warning 与 P4 Runtime 范围无关。`git diff --check` 在 Windows 工作区会提示 `TestCore.cs` 的 CRLF/LF 工作区 warning，但没有 whitespace error。

## Acceptance Evidence

- Runtime executes P3 conditions: `NarrativeRuntimeConditionEvaluatorEvaluatesCompilerIr`、`NarrativeRuntimeConditionEvaluatorUsesInternalFactsAndShortCircuit`、`NarrativeRuntimeConditionEvaluatorUsesRecordedProviderValues`、`NarrativeRuntimeConditionEvaluatorReportsRuntimeErrors`。
- Conditional choices / jumps / fallback / first true wins: `NarrativeRuntimeFiltersConditionalChoicesByVisibleIndex`、`NarrativeRuntimeFollowsFirstTrueConditionalJump`、`NarrativeRuntimeFollowsConditionalFallback`、`NarrativeRuntimeReportsMissingConditionalFallback`。
- Query provider and receipts: `NarrativeRuntimeQueryProviderUsesDelegateMockAndRecordedSources`、Round 4 receipt assertions、`P4IntegrationSmokeRunsPlayableMvpSample`。
- Actions: `NarrativeRuntimeDispatchesFireActionsAndContinues`、`NarrativeRuntimeWaitsForActionResume`、`NarrativeRuntimeHandsOffAndResumes`、`NarrativeRuntimeReportsActionDispatchErrors`、`NarrativeRuntimeReportsWaitResumeErrors`、`NarrativeRuntimeReportsHandoffResumeErrors`。
- Log / Backlog: `NarrativeRuntimeRecordsDisplayedTextLog`、`NarrativeRuntimeLogSkipsHiddenConditionalText`、P4 integration smoke Log assertions。
- Runtime State and substate: `NarrativeRuntimeExportsAndValidatesMinimalRuntimeState`、`NarrativeRuntimeExportsImportsSubstateAndContinues`、`NarrativeRuntimeImportsPendingSubstateAndResumes`、`NarrativeRuntimeRejectsMigratableSubstateWithoutRepair`。
- CLI playable driver: `CliRuntimeProjectExportsAndValidatesFormalRuntimeState`、`CliRuntimeProjectDrivesP4PlayableRuntime`、`CliRuntimeProjectReportsP4RuntimeQueryErrors`、`CliRuntimeProjectReportsP4RuntimeActionResultErrors`。
- P4 MVP sample closure: `tests/Internal/Inscape.Tests/P4/TestP4IntegrationSmoke.cs` runner `p4 integration smoke runs playable mvp sample`。

## Architecture Checks

- Compiler remains host-independent: YES。
- Runtime owns condition evaluation, query receipt, action dispatch, Log, state and substate semantics: YES。
- ExternalSupport remains host adapter / UI / payload presenter and does not own Runtime semantics: YES。
- Host Schema / Host Bridge / Usage separation preserved: YES。
- Runtime State remains a child narrative blob, not a full host save: YES。
- Formal Runtime State remains separate from full Log, Rollback stack, Trace Replay and action history: YES。
- No Unity / Bird / Addressables dependency added to `Internal`: YES。
- No rollback / replay / timeout / failure policy fields added as Host Schema first-version capability: YES。

## Deferred

- SelfHostedEditor Runtime Inspector product UI。
- SelfHostedEditor Usage / Audit panel productization。
- VSCode Runtime-backed preview rewrite。
- Full independent Inscape save product。
- Full Rollback。
- Full Trace Replay。
- Flashback Playback。
- Presentation IR。
- Unity / Host SDK。
- Action rollback / replay / receipt fine-grained policy。
- User-defined internal variable system。

## Next Candidate

P5 SelfHostedEditor Runtime authoring / productization, if the next phase is approved. P5 can productize authoring surfaces around mock query values, action capability hints, Runtime-backed preview and Runtime Inspector-like workflows; it should not retroactively expand P4.
