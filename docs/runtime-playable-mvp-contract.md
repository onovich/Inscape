# Runtime Playable MVP Contract

日期：2026-06-18

状态：P4 Runtime playable MVP 行为合同草案，供 P4 Round 2 起实现；不代表当前代码已经完成

本文把 P4 Runtime playable MVP 的最小行为钉成实现合同。它继承 P3 的 Compiler IR、Host Schema、Usage Manifest、Host Bridge、Runtime query provider 与 Runtime State 口径，不扩展到编辑器产品化 Runtime UI、完整 Rollback、Trace Replay、Flashback、Presentation IR 或通用 Unity / Host SDK。

## 目标

P4 MVP 的目标是让一段 `.inscape` 剧情可以在 Runtime 中真实推进：

- 条件选项会按 query / facts 过滤。
- 条件跳转会按源码顺序执行，first true wins。
- fallback 在条件跳转均未命中时执行。
- `@emit` action 会按 Host Schema `mode` 生成 fire / wait / handoff 行为。
- Runtime 可以记录已展示文本的 Log / Backlog 第一刀。
- Runtime 可以导出 / 导入 Inscape 自己的叙事子状态 blob，并由宿主存档作为权威外壳。

## 非目标

P4 MVP 不做：

- SelfHostedEditor 产品化 Runtime Inspector UI。
- VSCode Runtime-backed preview 重做。
- 完整独立游戏存档产品。
- 完整 Rollback、Trace Replay 或 Flashback Playback。
- Presentation IR。
- 通用 Unity / Host SDK。
- 用户自定义内部变量系统。
- per-action rollback / replay / receipt / failure / timeout policy。
- 宿主业务状态内置化，例如背包、任务、好感度、战斗结果。
- 把 Unity、Bird、Addressables、ScriptableObject 或项目具体 ID 引入 `Internal`。

## Runtime 条件求值

输入：

- `DslScriptConditionExpressionModel`。
- `NarrativeRuntimeStateModel` 或后续兼容的 Runtime 子状态。
- `NarrativeRuntimeQueryProviderModel`。
- 条件上下文：`choice-condition` 或 `conditional-jump`，以及 source node / option / jump 信息。

输出：

- `bool` 条件结果；或
- 结构化 Runtime error。

最小值类型：

- `bool`
- `number`
- `string`

求值规则：

- literal 按 Compiler IR 的 literal kind 转成 Runtime value。
- query path / query call 交给 `NarrativeRuntimeQueryProviderDomain.Resolve()`。
- internal facts 仍优先于 delegate / mock / recorded。
- `and` / `or` 使用布尔操作，允许短路。
- `not` 只接受 bool。
- `==` / `!=` 可比较相同类型的 bool、number、string。
- `<` / `<=` / `>` / `>=` 只接受 number。
- 条件表达式最终必须是 bool；非 bool 顶层结果是 Runtime error。
- query missing、provider exception、类型不匹配、未知 expression kind 都是 Runtime error。

禁止事项：

- 不重新解析 `Condition.Raw`。
- 不读取 Host Schema 来决定表达式语义。
- 不在 VSCode / SelfHostedEditor 复制 evaluator。

## 分支语义

选项：

- Runtime 展示 choice stage 时，只暴露 condition 为空或 condition 求值为 true 的选项。
- 选项 index 对外应使用可见选项 index；Runtime 内部需要保留原始 group / option index 以记录 facts 和 source。
- 若用户选择了不可见或不存在的选项，返回 Runtime error 或失败结果，不静默跳转。

条件跳转：

- 当当前 node 的正文已完成且需要继续时，先按 `ConditionalJumps` 源码顺序求值。
- 第一个求值为 true 的 jump 成为目标，first true wins。
- 全部为 false 时走 `DefaultNext` fallback。
- 若没有命中且没有 fallback，则不能继续，返回明确的 Runtime no-target 状态或 error。

## Query receipt

P4 第一刀只记录影响分支的 query receipt：

- 选项条件。
- 条件跳转。

默认不记录：

- 文本插值 query。
- Hover / completion / audit 查询。
- Host action 执行细节。

建议最小字段：

```text
queryReceipt
  id
  context: choice-condition | conditional-jump
  nodeId
  sourceLine
  sourceColumn
  name
  syntax: path | call
  arguments
  result
  sourceKind: internal-fact | delegate | mock | recorded
  deterministic
```

Receipt 用途：

- debug P4 branch decision。
- 让 recorded provider 或等价 recorded values 能复现分支。
- 随 Inscape 子状态 blob 保存必要的 branch decision 证据。

Receipt 不应变成完整 trace；普通 Runtime State 主体也不应塞进完整 query / action history。

## Action dispatcher

输入：

- Compiler graph 中的 action line，目前最小来源是 `@emit actionName ...`。
- Host Schema capability catalog 中对应 `actions[]` 的 `mode`。
- Host Bridge 中对应 action handler 映射。

输出：

- action request；以及
- Runtime continuation / pending / host exception 状态。

模式：

- `fire`：发出 request 后 Runtime 可以继续推进。
- `wait`：发出 request 后 Runtime 进入 pending，等待宿主 resume。
- `handoff`：发出 request 后 Runtime 交出控制权，等待宿主以后 resume。

Pending 最小字段：

```text
pendingAction
  requestId
  name
  mode
  arguments
  nodeId
  lineId
  status: waiting
```

Resume 最小输入：

```text
resumeAction
  requestId
  status: completed | failed | cancelled | timeout
  hostPayload
```

P4 第一刀规则：

- `completed` 可以恢复 Runtime。
- `failed` / `cancelled` / `timeout` 统一上报宿主异常，不做剧情分支。
- 不新增 per-action policy。
- 不把 Host Bridge handler 语义写进 Compiler。

## Log / Backlog

P4 第一刀默认记录已经实际展示的文本：

```text
logEntry
  sequence
  nodeId
  lineId
  speaker
  text
```

规则：

- 只记录实际展示过的正文行。
- metadata 行不进入普通玩家 Log。
- 选项记录可以作为 debug / dev 扩展，但不是普通玩家 Log 默认要求。
- Log / Backlog 与普通 Runtime State 主体分离。
- 导出 Inscape 子状态 blob 时可以包含必要 log checkpoint 或 log id，但不把完整 Log 塞进 `inscape.runtime-state` 主体。

## Inscape 子状态 blob

正式项目中宿主存档是权威，Inscape 只导出自己的叙事子状态。

P4 子状态 blob 建议最小字段：

```text
format: inscape.runtime-substate
formatVersion
runtimeVersion
scriptVersion
position
flow
facts
pendingAction
branchQueryReceipts
host.checkpointId
```

允许包含：

- 当前 node / command / line。
- flow stack。
- visited / seen / choice facts。
- pending action。
- 影响分支的 query receipt。
- opaque host checkpoint id。

禁止包含：

- 宿主完整存档。
- 背包 / 任务 / 好感度 / 战斗等业务状态。
- 完整 Log 主体。
- 完整 Rollback stack。
- 完整 Trace Replay payload。

导入规则：

- 先验证 format / version / runtimeVersion / scriptVersion / current graph。
- 兼容时恢复。
- 可迁移时返回 diagnostics 和 suggested position，不静默猜测。
- 不兼容时拒绝继续。

## CLI / smoke 验收

P4 最小 CLI / smoke 应能证明：

- mock query 控制条件选项可见性。
- delegate 或等价测试 delegate 控制条件跳转。
- internal fact `visited()` 参与条件跳转。
- 条件跳转 first true wins。
- fallback 在无条件命中时执行。
- `fire` action 产生 request 并允许继续。
- `wait` 或 `handoff` action 产生 pending，并可 resume。
- Log 只记录实际展示文本。
- export / import / continue 后 Runtime 不重复执行已完成动作，不丢必要 branch receipt。

## 架构自检清单

实现 P4 每一轮都应检查：

- Compiler 是否仍不依赖 Host Schema、Host Bridge、Runtime provider、Unity、Bird、VSCode、SelfHostedEditor。
- Runtime evaluator 是否只消费 Compiler IR。
- Host Schema 是否只作为宿主能力清单。
- Host Bridge 是否只作为项目 ID / handler 映射。
- Usage Manifest 是否仍是审计清单，不参与 Runtime 执行。
- ExternalSupport 是否没有复制 condition evaluator、query evaluator、action dispatcher 或 Runtime 语义。
- `Internal` 是否没有 Unity / Bird / Addressables / ScriptableObject / 项目具体 ID。
- 是否没有新增 rollback / replay / failure / timeout 等 per-action policy 字段。
