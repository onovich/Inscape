# SelfHostedEditor P3 Runtime Query Provider Audit

状态：P3 Round 10 Runtime query provider and internal facts design complete

最后更新：2026-06-18

## 结论

PASS：P3 Round 10 已完成 Runtime query provider 与内部叙事事实第一刀。

本轮不宣称 P3 完成。下一轮进入 P3 Round 11：Runtime State 最小模型。

## 本轮范围

已完成：

- 在 `Inscape.Runtime` 内新增 query provider 最小 contract：
  - `Delegate`：正式宿主接入主路径。
  - `Mock`：编辑器预览、测试和 CI 使用的只读值表。
  - `Recorded`：调试复现 / Trace Replay 使用的历史只读值表。
- `NarrativeRuntimeQueryProviderDomain` 统一解析 query request，并优先解析 Inscape 内部叙事事实。
- 新增 `NarrativeRuntimeFactsModel`，记录：
  - visited nodes 与 visit count。
  - seen line anchors。
  - choice history。
- `NarrativeRuntime` 在 `Start` / `Continue` / `Choose` 进入节点时记录 visit，在 `AdvanceFlow` 显示正文时记录 seen line，在 `Choose` 成功跳转后记录 choice。
- 内部 query 第一刀支持 `current_node()`、`previous_node()`、`visited(nodeId)`、`visit_count(nodeId)`、`seen(lineId)`、`choice_made(choiceId)`、`choice_count(choiceId)` 和 `last_choice(nodeId)`。
- Internal tests 覆盖 internal facts 与 delegate / mock / recorded provider source kind。

未完成且后置：

- 未实现条件表达式 Runtime 求值。
- 未实现 query receipt 持久化。
- 未实现 action dispatcher 或 `fire` / `wait` / `handoff`。
- 未实现完整 Save / Load、Rollback、Trace Replay 或 Flashback。
- 未新增用户自定义内部变量系统。

## Debug 自检

本轮先并行跑了一次 build 和 tests；测试可能读到旧测试程序集，因此后续需要串行重跑作为最终证据。

当前无已知未解决实现 bug。需要留意：`NarrativeRuntimeStateModel.Facts` 已进入当前 runtime snapshot JSON，但 Round 11 才会收口正式 Runtime State shape、版本字段和 `ValidateStateAgainstCurrentScript`。

## 架构自检

- Runtime 只消费 Compiler graph，不解析 `.inscape` 源文本。
- Query provider contract 位于 `Internal/Runtime/HostBridge`；不进入 Compiler、VSCode 或 SelfHostedEditor。
- 内部 facts 只记录叙事运行事实，不保存背包、任务、好感度、战斗结果、玩家位置或经济数值。
- Host Schema 仍是能力清单；query provider 是 Runtime Host 接入合同，不反向改变 Host Schema。
- 没有新增 snapshot 生产主链路。
- 没有引入 Unity、Bird、Addressables、项目内部 ID 或宿主资源 truth 到 `Internal`。

## 下一轮入口

P3 Round 11 优先完成：

1. Runtime State 最小模型：`format`、`formatVersion`、`runtimeVersion`、`scriptVersion`、`position`、`flow`、`facts`、`random`、`host.checkpointId`。
2. `ValidateStateAgainstCurrentScript` 的 compatible / migratable / incompatible 结果 shape。
3. 确认普通 Runtime State 不默认包含完整 Log、完整 Rollback stack 或完整 query/action trace。
