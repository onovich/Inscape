# SelfHostedEditor P4 Runtime Flow Audit

日期：2026-06-18

状态：P4 Round 3 Runtime flow 条件接入完成，不代表 P4 Runtime playable MVP 已完成

本轮目标是把 Round 2 的 `NarrativeRuntimeConditionEvaluatorDomain` 接入 `NarrativeRuntime` flow，让条件选项和条件跳转开始影响真实 Runtime 推进。

## 实现内容

新增 Runtime error model：

- `NarrativeRuntimeFlowErrorModel`

扩展 Runtime snapshot：

- `NarrativeRuntimeSnapshotModel.LastError`
- `CreateSnapshot()` 返回过滤后的 `CurrentNode`，其 choice groups 只包含当前 Runtime state / query provider 下可见的 option。

扩展 `NarrativeRuntime`：

- 新增 `QueryProvider`，供 Runtime flow 统一使用 delegate / mock / recorded / internal facts。
- 新增 `LastError`，保留最近一次 flow error。
- `Choose(groupIndex, optionIndex)` 现在把 `optionIndex` 解释为 visible option index，并映射回原始 option index 记录 choice fact。
- `Choose()` 会拒绝不可见或不存在的 visible option index。
- `Continue()` 现在先按 `ConditionalJumps` 源码顺序求值，first true wins。
- 条件跳转全部为 false 时走 `DefaultNext` fallback。
- 无 conditional match 且无 fallback 时返回 `IRF006` Runtime error。
- 无条件 choice / default next 剧情保持原有推进行为。

当前 flow error 第一刀：

```text
IRF001 graph-or-current-node-missing
IRF002 choice-group-missing
IRF003 visible-choice-option-missing
IRF004 target-missing
IRF005 condition-evaluation-failed
IRF006 no-conditional-match-or-fallback
IRF007 flow-advance-out-of-range
IRF008 flow-rewind-out-of-range
IRF009 node-rewind-unavailable
```

`IRF005` 会携带 evaluator 返回的 condition diagnostics，例如 `IRC003` missing query、`IRC004` provider exception、`IRC006` type mismatch。

## 测试覆盖

新增 Internal tests：

- `narrative runtime filters conditional choices by visible index`
- `narrative runtime follows first true conditional jump`
- `narrative runtime follows conditional fallback`
- `narrative runtime reports missing conditional fallback`

覆盖范围：

- snapshot 只暴露可见 option。
- visible option index 映射到原始 option index，choice fact 仍保留原始 index。
- 不存在的 visible option index 返回 `IRF003`。
- 条件跳转 first true wins。
- 条件跳转全部 false 时走 fallback。
- 条件跳转无命中且无 fallback 时返回 `IRF006`。
- 既有无条件剧情、Runtime State export / validate 和 CLI restore smoke 未回归。

## 未完成范围

本轮仍未实现：

- branch-affecting query receipt。
- recorded provider 消费 branch receipt。
- action dispatcher。
- `fire` / `wait` / `handoff` pending / resume。
- Log / Backlog。
- P4 Runtime 子状态 blob。
- CLI Runtime playable driver。
- VSCode / SelfHostedEditor Runtime-backed 产品化 UI。

## 架构自检

- `NarrativeRuntime` 仍只消费 Compiler IR，不解析 `.inscape` 条件源码。
- 条件求值继续复用 `NarrativeRuntimeConditionEvaluatorDomain` 和 `NarrativeRuntimeQueryProviderDomain`，没有在 flow 中复制 evaluator。
- Compiler 没有依赖 Host Schema、Host Bridge、Runtime provider、Unity、Bird、VSCode 或 SelfHostedEditor。
- Host Schema / Host Bridge / Usage Manifest 没有进入 Runtime flow 语义。
- ExternalSupport 没有新增 condition evaluator、query evaluator、action dispatcher 或 Runtime 语义副本。
- `Internal` 没有新增 Unity / Bird / Addressables / ScriptableObject / 项目具体 ID。
- 没有新增 rollback / replay / failure / timeout per-action policy。

## 下一轮入口

P4 Round 4 应进入 Query receipt 第一刀：

- 定义 branch-affecting query receipt 最小 shape。
- 条件选项和条件跳转求值时记录 query name、arguments、result、sourceKind、deterministic、node / line / option / jump context。
- 普通 Runtime State 主体仍保持小而可恢复，不吞并完整 Trace Replay。
- recorded provider 可用 receipt 或等价 recorded values 做调试复现。
