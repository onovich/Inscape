# SelfHostedEditor P4 Baseline Audit

日期：2026-06-18

状态：P4 Round 1 基线审计完成，不代表 P4 Runtime playable MVP 已完成

本轮目标是从 P3 final validation 接上 P4，确认现有 Runtime、query provider、Runtime State、CLI 与 P3 integration smoke 的真实能力边界，并给后续实现留下最小验收样例草案。P4 后续实现应以 [Runtime Playable MVP Contract](runtime-playable-mvp-contract.md) 为行为合同。

## 审计结论

当前代码已经具备 P4 的若干入口，但还没有形成“受条件、查询、动作和子状态影响的可玩剧情闭环”。

已具备：

- Compiler 已把选项条件与条件跳转解析为 `DslScriptCondition*` IR，条件跳转顺序、fallback 与 source 信息已保留。
- Usage Manifest 已从 Compiler IR 抽取 `choice-condition` / `conditional-jump` query usage。
- Host Schema 已提供 `queries[]` / `actions[]` 能力清单，`actions[].mode` 支持 `fire` / `wait` / `handoff`。
- Host Bridge 已作为项目 ID / handler 映射层存在，不进入 Compiler 语义。
- `NarrativeRuntime` 已能 `LoadGraph`、`Start`、`AdvanceFlow`、`RewindFlow`、`Choose`、`Continue`、`Rewind`、`Restore`。
- Runtime 已记录内部叙事 facts：visited node、seen line anchor、choice history。
- `NarrativeRuntimeQueryProviderDomain` 已提供 internal facts 优先、再落到 delegate / mock / recorded 的 query provider 解析域。
- `NarrativeRuntime.ExportState()` 已输出 `inscape.runtime-state` 最小 shape，`ValidateStateAgainstCurrentScript()` 已提供 compatible / migratable / incompatible 三档验证。
- CLI `runtime-project` 已支持启动、恢复 snapshot / formal state、advance / choose / continue / rewind、`--export-state` 与 `--validate-state`。
- P3 integration smoke 已证明 compile -> usage -> host integration audit -> runtime export / validate 可以串通。

尚未具备：

- `NarrativeRuntime` 尚未执行 `DslScriptConditionExpressionModel`，选项条件不会过滤可见选项。
- 条件跳转尚未在 Runtime 中按源码顺序执行，因此还没有 `first true wins` 与 fallback 的运行时行为。
- Query provider 尚未接入 Runtime 条件求值；现有 provider 只是可调用的解析域。
- 影响分支的 query receipt 尚未记录，recorded provider 也尚未消费分支 receipt。
- `@emit` 目前只被 Usage / Host Integration Audit 识别，Runtime 尚未把它变成 action request。
- `fire` / `wait` / `handoff` action dispatcher 尚未存在，pending / resume payload 也尚未存在。
- Log / Backlog 尚未存在；P3 formal Runtime State 明确不包含完整 log payload。
- Save / Load 还停留在 Runtime snapshot / formal state restore；P4 所需的 Inscape 子状态 blob 还没有 pending action、query receipt、log 分离等字段。
- CLI 还不能用 mock / delegate query、action pending / resume、Log、子状态 blob 来驱动 P4 MVP 样例。

## 现有入口

### Compiler / IR

`src/Internal/Compiler` 是 parser 与 IR 真相。P3 已实现：

- 选项条件：`- [condition] option text -> target`，进入 `DslScriptChoiceOptionModel.Condition`。
- 条件跳转：`? [condition] -> target`，进入 `DslScriptConditionalJumpModel`，并生成 conditional edge。
- fallback：`-> target`，继续使用 `DefaultNext` / default edge。

Runtime 后续必须消费这些模型，不得重新解析 `.inscape` 源文本。

### Runtime

`src/Internal/Runtime/StoryRuntime/Domains/NarrativeRuntime.cs` 当前是最小叙事推进器：

- `Start()` 进入 entry node。
- `AdvanceFlow()` / `RewindFlow()` 控制当前节点正文可见步数。
- `Choose(groupIndex, optionIndex)` 根据原始 option index 跳转并记录 choice fact。
- `Continue()` 只跟随 `DefaultNext`。
- `ExportState()` 投影 formal Runtime State。
- `ValidateStateAgainstCurrentScript()` 只验证状态与当前 graph 的兼容性。

缺口是：它尚未评估 option condition，也尚未考虑 `ConditionalJumps`。

### Query provider

`src/Internal/Runtime/HostBridge/Domains/NarrativeRuntimeQueryProviderDomain.cs` 当前提供三类 provider：

- `Delegate`：正式运行主路径，由宿主临时回答 query。
- `Mock`：编辑器预览、测试和 CI 使用的表驱动值。
- `Recorded`：调试复现使用的表驱动值，不是完整 Trace Replay。

内部 facts 优先解析：

- `current_node()`
- `previous_node()`
- `visited(nodeId)`
- `visit_count(nodeId)`
- `seen(lineId)`
- `choice_made(choiceId)`
- `choice_count(choiceId)`
- `last_choice(nodeId)`

P4 后续应把该解析域接到 Runtime condition evaluator，而不是复制一套 query 语义。

### Runtime State / CLI

`NarrativeRuntimeExportStateModel` 当前 shape：

```text
format: inscape.runtime-state
formatVersion
runtimeVersion
scriptVersion
position
flow
facts
random
host.checkpointId
```

`runtime-project` 当前能：

- 从 project compile graph 启动 runtime。
- 从 snapshot 或 formal state restore。
- 执行单个 `--advance-flow`、`--rewind-flow`、`--choose`、`--continue`、`--rewind`。
- 输出 snapshot 或 `--export-state`。
- 对 `--validate-state` 输出 `inscape.runtime-state-validation`。

P4 后续不能把完整宿主存档、完整 Log、Rollback 栈或 Trace Replay 塞进这个 state 主体；应新增或扩展 Inscape 子状态 blob 的最小边界。

## 最小样例草案

P4 MVP fixture 应覆盖条件选项、条件跳转、delegate / mock query、internal facts、fire action、wait / handoff pending、Log、export / import / continue 和分支 query receipt。语法按当前 parser 使用 choice prompt：

```text
# start
@entry
旁白：你站在门前。
? 选择：
- [has_item("silver_key")] 用银钥匙开门 -> gate.open
- 敲门 -> gate.knock
? [visited("gate.knock") and trust("mira") >= 3] -> mira.help
-> gate.locked

# gate.open
@emit play_timeline "mira_reveal"
旁白：门开了。
-> end

# gate.knock
@emit knock_sound
旁白：门后没有回应。
-> start

# mira.help
@emit wait_for_ui "confirm_help"
旁白：米拉帮你打开了门。
-> end

# end
旁白：结束。
```

建议配套 Host Schema：

```json
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    { "name": "has_item", "returnType": "bool", "parameters": [{ "name": "itemId", "type": "string", "idKind": "item" }] },
    { "name": "trust", "returnType": "number", "parameters": [{ "name": "roleId", "type": "string", "idKind": "role" }] }
  ],
  "actions": [
    { "name": "play_timeline", "mode": "wait", "parameters": [{ "name": "timelineId", "type": "string", "idKind": "timeline" }] },
    { "name": "knock_sound", "mode": "fire", "parameters": [] },
    { "name": "wait_for_ui", "mode": "handoff", "parameters": [{ "name": "requestId", "type": "string" }] }
  ]
}
```

样例意图：

- `has_item("silver_key")` 控制选项可见性。
- `visited("gate.knock")` 使用 Runtime internal fact。
- `trust("mira") >= 3` 使用 mock / delegate query。
- 条件跳转按源码顺序命中 `mira.help`，否则走 `gate.locked`。
- `knock_sound` 走 `fire`，不阻塞 Runtime。
- `play_timeline` 或 `wait_for_ui` 走 pending / resume。
- Runtime 记录实际展示过的 speaker / text / lineId 到 Log / Backlog。
- export/import 后继续推进不重复执行已完成动作，不丢失必要 branch receipt。

## 风险与约束

- 条件求值只能消费 Compiler IR，不能在 Runtime、CLI、VSCode 或 SelfHostedEditor 里重写 parser。
- Host Schema 只描述能力，不能变成 Compiler truth。
- Host Bridge 只做项目映射，不能把 Unity / Bird / GUID / asset path / Addressables 引入 `Internal`。
- Recorded provider 只服务调试复现，不升级为完整 Trace Replay。
- Query receipt 只记录影响分支的 query，不默认记录所有文本插值 query。
- Action 失败、取消、超时统一作为宿主异常，不在 P4 第一刀新增 per-action failure / timeout / replay / rollback policy。
- Log / Backlog 与普通 Runtime State 主体分离，避免把普通存档伪装成完整回放。

## 下一轮入口

P4 Round 2 应进入 Runtime condition evaluator：

- 新增位于 `Internal/Runtime` 的 condition evaluator domain。
- 输入 `DslScriptConditionExpressionModel`，输出 typed runtime value 或 structured runtime error。
- 接入 `NarrativeRuntimeQueryProviderDomain`。
- 覆盖 bool / number / string literal、query path / call、`and` / `or` / `not`、标量比较。
- 不改 Compiler parser，不碰 ExternalSupport 语义。

## 本轮验证

本轮主要改文档，验证结果见执行轮回复。最低要求是 `git diff --check`；若后续同轮补代码，必须追加 build / tests。
