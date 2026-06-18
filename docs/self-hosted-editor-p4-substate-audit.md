# SelfHostedEditor P4 Substate Audit

日期：2026-06-18

状态：P4 Round 9 Save / Load 子状态 blob 第一刀完成，不代表 P4 MVP 已完成

## 本轮范围

本轮按 [P4 Runtime Playable MVP Goal 模式执行指南](self-hosted-editor-p4-goal-mode-execution-guide.md) 第 9 轮推进 Save / Load 子状态 blob。目标是让 Runtime 能导出 Inscape 自己的叙事子状态，并在兼容脚本上导入后继续推进。

本轮不做 CLI playable driver、不做完整游戏存档、不做 rollback / trace replay / flashback，也不把宿主业务状态放入 Inscape Runtime。

## 实现结果

- `Internal/Runtime` 新增 `NarrativeRuntimeSubstateModel`，格式名为 `inscape.runtime-substate`，版本为 `1`。
- `NarrativeRuntime.ExportSubstate(scriptVersion, hostCheckpointId)` 导出 position、flow、facts、pending action、branch query receipts 与 opaque host checkpoint id。
- `NarrativeRuntime.ValidateSubstateAgainstCurrentScript(substate, currentScriptVersion)` 复用 Runtime position 验证逻辑，继续只报告 compatible / migratable / incompatible，不静默修复。
- `NarrativeRuntime.ImportSubstate(substate, currentScriptVersion)` 只接受 compatible substate；migratable 或 incompatible substate 会拒绝导入并返回 `IRT011`。
- 导入成功后恢复 `State`、`BranchQueryReceipts` 与 `PendingAction`，同时清空 transient `ActionRequests`、`LogEntries` 与 action dispatch cache。
- 导入后会把当前位置已经到达的 `@emit` action 标记为已 dispatch，避免 `ResumeAction()` 或后续推进重复执行已经保存在 pending substate 里的宿主动作。

## 子状态内容边界

允许保存：

- 当前 node / command / line position。
- flow entry 与 stack。
- visited / seen / choice facts。
- 当前 pending action。
- 影响分支的 branch query receipts。
- `host.checkpointId`，仅作为 opaque id 透传。

禁止保存：

- 宿主完整存档。
- 背包、任务、好感度、战斗结果、玩家位置、经济数值等宿主业务状态。
- 完整 Log / Backlog 主体。
- 完整 action request history。
- Rollback stack、Trace Replay payload 或 Flashback Playback 数据。

## Debug 自检

- export -> import -> continue 已由 `NarrativeRuntimeExportsImportsSubstateAndContinues` 覆盖。
- pending action export -> import -> resume 已由 `NarrativeRuntimeImportsPendingSubstateAndResumes` 覆盖，确认导入与 resume 都不会重复 dispatch 已保存的 pending action。
- script version drift 已由 `NarrativeRuntimeRejectsMigratableSubstateWithoutRepair` 覆盖，确认 validation 只报告 migratable，import 不做猜测修复。
- JSON 序列化检查确认 substate 不包含 `log`、`actionRequests` 或示例宿主业务字段 `inventory`。

## 架构自检

- Compiler 仍是编译事实来源，本轮未改 Compiler parser 或 condition IR。
- Runtime substate 消费 Compiler graph 与 Runtime 自有状态，不读取 VSCode、SelfHostedEditor、Unity、Bird 或 Host SDK。
- Host checkpoint id 仍是 opaque string，Runtime 不解释宿主存档内容。
- ExternalSupport 未新增 condition evaluator、action dispatcher、log builder 或 Runtime 语义副本。
- 本轮未新增 rollback / replay / failure / timeout 等 per-action policy 字段。

## 验证

本轮应运行并通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
```

同时应执行边界扫描，确认 `ExternalSupport` 未复制 Runtime 语义，`Internal` 未引入 Unity / Bird / Addressables / ScriptableObject，且未新增 rollback / replay / failure / timeout policy 字段。

## 下一轮

进入 P4 Round 10：CLI Runtime playable driver。重点是扩展 `runtime-project` 或等价 CLI 参数，让命令行能驱动 query provider 输入、action result / resume、substate import / export 与 log output，并保持既有 `runtime-project` 参数兼容。
