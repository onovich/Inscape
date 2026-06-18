# SelfHostedEditor P4 Handoff Audit

日期：2026-06-18

状态：P4 Round 7 `handoff` 控制权移交 / resume 第一刀完成；P4 Runtime playable MVP 尚未完成。

## 本轮目标

- 实现 `handoff` action。
- 明确 `wait` 与 `handoff` 的 Runtime 状态差异。
- 支持 handoff completed resume 与 host error resume。
- 不实现小游戏、战斗、Timeline 具体逻辑，只实现控制权模型。

## 实现内容

扩展 action dispatcher：

- `fire` 成功后返回 `completed`，Runtime 可继续推进。
- `wait` 与 `handoff` 都是 pending mode，dispatch 成功后统一返回 `waiting`。
- host delegate 若返回空 status，或对 pending mode 返回 `completed`，Runtime 会归一化为 `waiting`。
- 未知 mode 仍返回 `IRA003`，不会被静默当成 `fire` / `wait` / `handoff`。

扩展 `NarrativeRuntime`：

- `@emit ...` 对应 Host Schema mode 为 `handoff` 时，会记录 action request 并进入 `PendingAction`。
- `PendingAction.Mode` 保留 `handoff`，用来区分“宿主成为当前段落主控”与 `wait` 的“等待一个宿主动作完成”。
- pending 状态继续阻断 `AdvanceFlow()`、`Continue()`、`Choose()`、`RewindFlow()` 与 `Rewind()`。
- `ResumeAction(Status = completed)` 清空 pending，并继续扫描当前位置已到达但尚未 dispatch 的 action；不会重复 dispatch 已完成的 handoff action。
- `failed` / `cancelled` / `timeout` resume 仍统一返回 `IRA007`，并保留 pending evidence 的 mode 与失败 status。

## wait / handoff 差异

- `wait`：Runtime 已发出一个宿主动作请求，等待该动作完成后继续同一段 Runtime flow。
- `handoff`：Runtime 已把当前段落控制权交给宿主系统，宿主系统之后用同一个 request id 恢复剧情。
- 两者共享最小 pending / resume 数据面：`requestId`、`name`、`mode`、`arguments`、`nodeId`、`lineId`、`status`。
- 第一刀不新增每个 action 自己的回退、重放、失败或超时策略字段。

## Error 第一刀

既有 action error 保持同一语义：

```text
IRA001 action missing Host Schema declaration
IRA002 action missing Host Bridge handler mapping
IRA003 action mode not implemented
IRA004 host action dispatch failed
IRA005 runtime action pending
IRA006 action resume request mismatch
IRA007 action resume host error
```

## 测试覆盖

新增 Internal tests：

- `narrative runtime hands off and resumes`
- `narrative runtime reports handoff resume errors`

覆盖范围：

- leading `@emit handoff` 在进入节点时产生 request。
- pending action 包含 request id、action name、mode、handler name、status、node / line / source 与 typed arguments。
- snapshot 暴露 pending action，reading progress 在 handoff pending 时不可 advance。
- formal `ExportState()` 仍不包含 action request history 或 pending action。
- completed resume 清空 pending，且不重复 dispatch 同一 handoff action。
- timeout resume 返回 `IRA007`，pending evidence 保留 `handoff` mode 与 `timeout` status，后续 flow 操作继续被阻断。
- unsupported mode 测试改为真实未知 mode，避免把已实现的 `handoff` 当成错误路径。

## 架构自检

- Runtime 仍只依赖 `Inscape.Compiler`，没有引用 `Inscape.Tooling`、VSCode、SelfHostedEditor、Unity 或 Bird。
- `handoff` 只作为 Host Schema action mode 的 Runtime-side 控制权模型，不包含小游戏、战斗、Timeline 或项目资源 ID 语义。
- ExternalSupport 未新增 condition parser、query evaluator、action dispatcher 或 Runtime 语义副本。
- Host Schema / Host Bridge 真实 JSON 读取仍由 Tooling / CLI / 后续 adapter 负责；Runtime 只消费等价注入模型。
- formal `ExportState()` 继续保持 P3 最小 shape，不吞并 action request / pending evidence；P4 子状态 blob 留给后续轮次。

## 未完成范围

- Log / Backlog 第一刀。
- pending action 进入 P4 runtime substate blob。
- P4 Save / Load 子状态 blob。
- CLI Runtime playable driver 对 handoff / wait resume 的真实参数化适配。
- P4 integration smoke 与最终 PASS / FAIL。

## 下一轮入口

P4 Round 8：Log / Backlog 第一刀。

重点：

- Runtime 只记录已经实际展示的内容。
- 默认字段为 `speaker`、`text`、`lineId`。
- 条件导致未展示的文本不进入 Log。
- Log 与普通 Runtime State 主体分离。
