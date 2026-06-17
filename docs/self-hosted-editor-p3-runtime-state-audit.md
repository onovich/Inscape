# SelfHostedEditor P3 Runtime State Audit

状态：P3 Round 11 Runtime State minimal model complete

最后更新：2026-06-18

## 结论

PASS：P3 Round 11 已完成 Runtime State 最小模型与 `ValidateStateAgainstCurrentScript` shape。

本轮不宣称 P3 完成。下一轮进入 P3 Round 12：最小端到端 smoke 与文档收口。

## 本轮范围

已完成：

- `Inscape.Runtime` 新增正式 Runtime State 导出模型 `NarrativeRuntimeExportStateModel`，格式名仍为 `inscape.runtime-state`。
- Runtime State 最小字段包含：
  - `format` / `formatVersion`。
  - `runtimeVersion` / `scriptVersion`。
  - `position.nodeId` / `position.lineId` / `position.commandIndex`。
  - `flow.entryNodeId` / `flow.stack`。
  - `facts.visitedNodes` / `facts.seenLineAnchors` / `facts.choiceHistory`。
  - `random.policy` / `random.seed` / `random.state`。
  - `host.checkpointId`。
- `NarrativeRuntime.ExportState(scriptVersion, hostCheckpointId)` 可从当前 Runtime snapshot 投影出正式 Runtime State。
- `NarrativeRuntime.ValidateStateAgainstCurrentScript(state, currentScriptVersion)` 输出 `compatible` / `migratable` / `incompatible` 三档结果和结构化 diagnostics。
- `runtime-project` 新增：
  - `--export-state`：输出正式 Runtime State shape。
  - `--validate-state <path>`：输出 `inscape.runtime-state-validation`。
  - `--script-version <version>`：参与 export / validate。
  - `--host-checkpoint-id <id>`：作为 opaque host checkpoint 保存，不由 Inscape 解释。
- `runtime-project --state` 保持旧 Player snapshot 兼容，并可读取新正式 Runtime State 后继续执行最小 action。
- Internal tests 覆盖：
  - Runtime State export shape。
  - 普通 Runtime State 不包含完整 Log、Rollback stack 或 Trace。
  - compatible / migratable / incompatible validation。
  - CLI export / validate / restore smoke。

未完成且后置：

- 未实现完整正式 Save / Load 产品系统。
- 未实现 query receipt 持久化。
- 未实现完整 Log / Backlog、Rollback stack、Trace Replay 或 Flashback Playback。
- 未实现条件 Runtime 求值。
- 未实现 action dispatcher 或 `fire` / `wait` / `handoff` 执行。
- 未实现 Runtime State 自动迁移；本轮只报告 migratable shape。

## Debug 自检

本轮先实现模型、Runtime domain 和 CLI smoke，再跑 `.NET build` 与 Internal tests。第一次验证未遇到编译或测试失败。

当前无已知未解决实现 bug。需要留意：旧 `runtime-project` snapshot 与正式 Runtime State 目前共享 `inscape.runtime-state` 格式名；CLI 已保持旧 snapshot 的 `state` 嵌套读取兼容，并用 `--export-state` 明确要求正式 state 输出。Round 12 端到端 smoke 应继续证明两条用途没有混淆。

## 架构自检

- Runtime 只消费 Compiler graph，不解析 `.inscape` 源文本。
- Runtime State 只保存叙事恢复所需的最小状态和 opaque host checkpoint，不解释宿主 checkpoint 内容。
- `random` 只保存策略/seed/state 形状，不替宿主决定公平性或反复读档策略。
- 普通 Runtime State 不默认包含完整 Log、完整 Rollback stack 或完整 query/action trace。
- Compiler 没有读取 Host Schema、Host Bridge 或 Runtime State。
- VSCode / SelfHostedEditor 没有新增 parser、schema reader 或 Runtime 语义副本。
- 没有引入 Unity、Bird、Addressables、项目内部 ID 或宿主资源 truth 到 `Internal`。

## 下一轮入口

P3 Round 12 优先完成：

1. 串起 Host Schema、Usage Manifest、Host Integration Audit、条件语法和 Runtime State 的最小端到端样例 / smoke。
2. 更新 handoff / TODO / README / ADR，使 P3 Round 1-12 当前状态一致。
3. 不宣布 P3 PASS；Round 12 后进入缓冲修复或最终验证准备。
