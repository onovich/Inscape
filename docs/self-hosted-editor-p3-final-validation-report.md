# SelfHostedEditor P3 Final Validation Report

状态：P3 first cut PASS

最后更新：2026-06-18

## 结论

P3 second syntax / Runtime / host capability first cut: PASS

P3 第一刀已在 Round 13 提前进入最终验收并通过。P3 范围保持为最小模型、最小 Tooling / CLI / smoke 与文档 / ADR 收口；未扩大为完整 Runtime 产品化。

## Completed

- ADR 0021 已接受，并与实际实现保持一致：`[]` 只读，`@` 做事，Host Schema 统一包含 `queries[]` / `actions[]`，Usage Manifest 不是宿主能力真相。
- Host Schema v2 最小 contract 已落地到文档、模板、VSCode JSON Schema 与 Internal tests；legacy `events[]` 保留为 deprecated 兼容输入。
- Tooling / CLI / LanguageServer / VSCode / SelfHostedEditor 已消费 shared Host Schema capability catalog，`actions[]` 为新主路径，legacy `events[]` 继续可读。
- Usage Manifest contract 与 `inspect-usage-project` 已完成，输出 `inscape.usage`，包含 query / action usage、literal arguments、source location、context 与 required ids。
- Host Integration Audit 与 `audit-host-integration-project` 已完成，输出 `inscape.host-integration.audit`，可对账 Usage + Host Schema + Host Bridge。
- 条件语法第一刀已完成 contract、Compiler parser / IR 与 diagnostics：选项条件、条件跳转、fallback、`and` / `or` / `not`、括号、标量比较、字符串、数字和 bool。
- 条件 usage 已接入 Tooling / LanguageServer / editor parity；VSCode / SelfHostedEditor 没有复制 condition expression parser。
- Runtime query provider 与 internal narrative facts 已完成最小 contract：delegate / mock / recorded provider 与 internal visited / seen / choice facts。
- Runtime State 最小模型已完成：`NarrativeRuntime.ExportState` 与 `ValidateStateAgainstCurrentScript` 覆盖 compatible / migratable / incompatible。
- Round 12 integration smoke 已串起 `compile-project`、`inspect-usage-project`、`audit-host-integration-project`、`runtime-project --export-state` 与 `runtime-project --validate-state`。

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

补充边界扫描已通过：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|receiptPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources docs\host-schema.md docs\usage-manifest-contract.md docs\condition-syntax-contract.md
rg -n "condition expression parser|parseCondition|ConditionParser|DslScriptConditionParser|rollbackPolicy|replayPolicy|receiptPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\VSCode src\ExternalSupport\SelfHostedEditor -g "*.js" -g "*.json"
```

说明：SelfHostedEditor `check:structure` 仍输出既有 `SelfHostedEditorLocalization.css` hard-coded color warning，但命令通过，且 P3 未改该 CSS。

## Acceptance Evidence

- ADR 0021 存在且一致：`docs/adr/0021-p3-runtime-and-host-capability-boundary.md`。
- Host Schema `queries[]` / `actions[]`：`docs/host-schema.md`、`src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json`、`HostSchemaJsonSchemaDefinesActionsAndLegacyEvents`、`HostSchemaActionReaderReportsSchemaActions`。
- Legacy `events[]` 兼容：`HostSchemaJsonSchemaDefinesActionsAndLegacyEvents`、`HostSchemaEventReaderReportsSchemaEvents`、P3 Host Schema compatibility audit。
- Usage Manifest：`docs/usage-manifest-contract.md`、`UsageManifestReportsQueriesActionsAndRequiredIds`、`CliInspectUsageProjectEmitsJson`.
- Host Integration Audit：`HostIntegrationAuditReportsSchemaAndBridgeGaps`、`CliAuditHostIntegrationProjectEmitsJson`.
- 条件语法 IR：`ParsesChoiceConditionsIntoIr`、`ParsesConditionalJumpsIntoIr`、`DiagnosesConditionalJumpMissingFallback`、`DiagnosesUnsupportedConditionSyntax`。
- 条件语义未复制到编辑器：VSCode `check:semantic-parity`、SelfHostedEditor `check:semantic-parity-http`、`INS061` parity coverage。
- Runtime query provider / facts：`NarrativeRuntimeRecordsInternalNarrativeFacts`、`NarrativeRuntimeQueryProviderUsesDelegateMockAndRecordedSources`。
- Runtime State：`NarrativeRuntimeExportsAndValidatesMinimalRuntimeState`、`CliRuntimeProjectExportsAndValidatesFormalRuntimeState`。
- 最小端到端 smoke：`P3IntegrationSmokeConnectsUsageAuditConditionsAndRuntimeState`。

## Architecture Checks

- Compiler remains host-independent: YES。
- Host Schema / Host Bridge / Usage separation preserved: YES。
- ExternalSupport did not duplicate Compiler / Runtime semantics: YES。
- Host Schema remains capability catalog, not Compiler truth: YES。
- `actions[]` remains Host Schema action section, not a separate Action Schema system: YES。
- Runtime State remains minimal and does not swallow full Log / Rollback / Trace: YES。
- No Unity / Bird / Addressables dependency added to `Internal`: YES。
- No rollback / replay / receipt / failure / timeout policy fields added to first-version Host Schema: YES。

## Deferred

- Full Save / Load product system。
- Runtime condition evaluation。
- Action dispatcher and `fire` / `wait` / `handoff` pending / resume execution。
- Query / action receipt persistence。
- Full Log / Backlog product surface。
- Full Rollback。
- Full Trace Replay。
- Flashback Playback。
- Action rollback / replay policy。
- Presentation IR。
- General Unity package / Host SDK productization。

## Next Candidate Phase

P4 Runtime playable MVP:

- Runtime 执行 P3 条件表达式。
- 接入 delegate query provider 与 mock / recorded preview path。
- 接入 action dispatcher，最小支持 `fire` / `wait` / `handoff`。
- 加入 Log / Backlog 第一刀。
- 做普通 Save / Load 的 Inscape 子状态 blob，而不是完整独立存档产品。
