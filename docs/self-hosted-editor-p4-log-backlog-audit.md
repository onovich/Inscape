# SelfHostedEditor P4 Log Backlog Audit

日期：2026-06-18

状态：P4 Round 8 Log / Backlog 第一刀完成；P4 Runtime playable MVP 尚未完成。

## 本轮目标

- Runtime 记录已经实际展示的内容。
- 默认字段为 `speaker`、`text`、`lineId`。
- Log 与普通 Runtime State 主体分离。
- 条件导致未展示的文本不进入 Log。

## 实现内容

新增 Runtime Log 最小模型：

- `NarrativeRuntimeLogEntryModel`
- 字段：`Sequence`、`NodeId`、`LineId`、`Speaker`、`Text`

扩展 `NarrativeRuntime`：

- 新增 `NarrativeRuntime.LogEntries`，作为 Runtime 当前会话的 displayed-text backlog。
- `AdvanceFlow()` 真正 reveal 正文行时记录 log entry。
- metadata 行、choice stage、choice text、未展示分支文本不会进入默认 Log。
- `CreateSnapshot()` 暴露克隆后的 `LogEntries`，供 editor Player / debug surface 读取。
- `LoadGraph()` / `Start()` / minimal `Restore()` 清空 transient log evidence。
- formal `ExportState()` 仍不包含 `LogEntries`。

## 行为边界

- Log 只记录已经实际展示过的正文行。
- `speaker` 与 `text` 来自 Compiler IR 的 `DslScriptLineModel`。
- `lineId` 优先使用 stable line anchor；缺失时 fallback 到 source line 或 content step。
- 本轮不默认记录 presented choices / chosen choice；这仍保留为后续 debug / dev 扩展方向。
- 本轮不把完整 Log 塞进普通 `inscape.runtime-state` 主体；P4 子状态 blob 留给 Round 9。

## 测试覆盖

新增 Internal tests：

- `narrative runtime records displayed text log`
- `narrative runtime log skips hidden conditional text`

覆盖范围：

- node entry 与 metadata 不产生 log。
- reveal 正文行时记录 sequence、nodeId、lineId、speaker、text。
- snapshot 暴露 log entries，重复 snapshot 不新增 log。
- choice stage 不进入默认玩家 Log。
- 条件过滤导致未展示的分支文本不进入 Log。
- formal `ExportState()` 不包含 log entry。
- minimal state restore 不恢复 transient log entries。

## 架构自检

- Log 记录位于 `Internal/Runtime`，由 Runtime flow 的 reveal 时刻驱动，不在 VSCode / SelfHostedEditor 侧重建。
- Runtime 仍只消费 Compiler IR，不解析 `.inscape` 文本。
- ExternalSupport 未新增 condition parser、query evaluator、action dispatcher、Log builder 或 Runtime 语义副本。
- formal Runtime State 继续保持 P3 最小 shape，不吞并完整 Log / Rollback / Trace。
- 没有引入 Unity / Bird / Addressables / ScriptableObject / 项目具体 ID。

## 未完成范围

- P4 Save / Load 子状态 blob。
- pending action 与 branch query receipt 进入 P4 runtime substate blob。
- Log checkpoint / log id 与子状态 blob 的关系。
- CLI Runtime playable driver 输出 / 恢复 Log 的参数化适配。
- P4 integration smoke 与最终 PASS / FAIL。

## 下一轮入口

P4 Round 9：Save / Load 子状态 blob。

重点：

- 将 P3 `ExportState` 推进到 P4 可恢复状态。
- 保存 position、flow、facts、pending action、必要 branch query receipt、opaque host checkpoint id。
- `ValidateStateAgainstCurrentScript` 继续只报告 diagnostics，不静默修复状态。
- 不保存宿主业务状态。
