# SelfHostedEditor P4 Condition Evaluator Audit

日期：2026-06-18

状态：P4 Round 2 Runtime condition evaluator 完成，不代表 P4 Runtime playable MVP 已完成

本轮目标是在 `Internal/Runtime` 实现 Runtime condition evaluator 最小 domain，让 P3 Compiler IR 中的条件表达式可以被 Runtime 求值。它只消费 `DslScriptConditionExpressionModel`，不重新解析源码字符串，也不把 evaluator 复制到 VSCode 或 SelfHostedEditor。

## 实现内容

新增 Runtime 模型：

- `NarrativeRuntimeConditionEvaluationModel`
- `NarrativeRuntimeConditionEvaluationDiagnosticModel`

新增 Runtime domain：

- `NarrativeRuntimeConditionEvaluatorDomain`

Evaluator 当前能力：

- 输入 `DslScriptConditionExpressionModel`、`NarrativeRuntimeStateModel`、`NarrativeRuntimeQueryProviderModel` 和可选 context。
- literal 支持 bool、number、string；query argument 中的 identifier 作为 string 传给 provider。
- query path / query call 统一转换为 `NarrativeRuntimeQueryRequestModel`。
- query 解析复用 `NarrativeRuntimeQueryProviderDomain`，因此 internal facts 仍先于 delegate / mock / recorded。
- 支持 `and` / `or` / `not`，并对 `and` / `or` 做短路求值。
- 支持 `==` / `!=` 的同类型 bool / number / string 比较。
- 支持 `<` / `<=` / `>` / `>=` 的 number 比较。
- 顶层表达式必须求值为 bool。
- Runtime error 通过 `IRC001` 到 `IRC009` 诊断返回。

当前 diagnostic 第一刀：

```text
IRC001 missing-expression
IRC002 unsupported-or-missing-literal
IRC003 missing-query
IRC004 query-provider-exception
IRC005 bool-operator-type-mismatch
IRC006 comparison-type-mismatch
IRC007 unsupported-operator
IRC008 top-level-non-bool
IRC009 unsupported-expression-kind
```

## 测试覆盖

新增 Internal tests：

- `narrative runtime condition evaluator evaluates compiler ir`
- `narrative runtime condition evaluator uses internal facts and short circuit`
- `narrative runtime condition evaluator uses recorded provider values`
- `narrative runtime condition evaluator reports runtime errors`

覆盖范围：

- mock provider 驱动 query call、query path 与 identifier argument。
- internal fact `visited()` 参与条件求值。
- `or` 短路跳过会抛异常的 delegate query。
- recorded provider values 参与条件求值。
- missing query 返回 `IRC003`。
- ordered comparison 类型不匹配返回 `IRC006`。
- delegate provider exception 返回 `IRC004`。

## 未完成范围

本轮未接入 Runtime flow，因此仍未完成：

- 条件选项可见性过滤。
- `Choose()` 对不可见选项的拒绝。
- 条件跳转 `first true wins`。
- fallback 运行时选择。
- branch-affecting query receipt。
- action dispatcher。
- Log / Backlog。
- P4 子状态 blob。
- CLI Runtime playable driver。

这些属于 P4 Round 3 及后续轮次。

## 架构自检

- Compiler 仍只负责 parser / IR；本轮没有修改 Compiler parser。
- Runtime evaluator 位于 `src/Internal/Runtime/StoryRuntime`，只消费 Compiler IR。
- Query provider 仍通过 `NarrativeRuntimeQueryProviderDomain` 统一解析，没有新增第二套 provider 语义。
- Host Schema / Host Bridge / Usage Manifest 没有进入 evaluator。
- VSCode / SelfHostedEditor 没有新增 condition evaluator、query evaluator、action dispatcher 或 Runtime 语义副本。
- 没有新增 Unity / Bird / Addressables / ScriptableObject / 项目具体 ID 到 `Internal`。
- 没有新增 rollback / replay / failure / timeout per-action policy。

## 下一轮入口

P4 Round 3 应接入 Runtime flow：

- choice stage 只暴露 condition 为空或求值为 true 的 option。
- 对外选择可见 option index，内部保留原始 group / option index 记录 facts。
- `Continue()` 或等价 flow 推进时先按 `ConditionalJumps` 源码顺序求值，first true wins。
- 条件跳转全部 false 时走 `DefaultNext` fallback。
- 无命中且无 fallback 时返回明确 Runtime no-target / error。
- 无条件剧情不得回归。
