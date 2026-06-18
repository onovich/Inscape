# SelfHostedEditor P4 Wait Pending Audit

日期：2026-06-18

状态：P4 Round 6 `wait` pending / resume 第一刀完成；P4 Runtime playable MVP 尚未完成。

## 本轮目标

- 实现 `wait` action pending。
- 定义 pending state / resume token / request id。
- 宿主 resume 后 Runtime 继续。
- `failed` / `cancelled` / `timeout` 统一作为 Runtime action error。

## 实现内容

扩展 Runtime HostBridge action 模型：

- `NarrativeRuntimePendingActionModel`
- `NarrativeRuntimeActionResumeModel`

扩展 action dispatcher：

- `fire` 继续返回 `completed`。
- `wait` 现在是受支持 mode，dispatch 成功后返回 `waiting`。
- `handoff` 仍返回 `IRA003 mode not implemented`，不被偷跑成 `fire` 或 `wait`。
- host delegate 失败、抛异常，或返回 `failed` / `cancelled` / `timeout`，仍统一作为 host action error。

扩展 `NarrativeRuntime`：

- 新增 `PendingAction`。
- `Start()` / `AdvanceFlow()` 触发 `@emit wait...` 后会记录 action request，并进入 pending。
- pending 状态会阻断 `AdvanceFlow()`、`Continue()`、`Choose()`、`RewindFlow()` 和 `Rewind()`。
- `ResumeAction(NarrativeRuntimeActionResumeModel)` 用 request id 作为 resume token。
- `Status = completed` 会清空 pending，并继续扫描当前位置已到达但尚未 dispatch 的 action。
- wrong request id 返回 `IRA006`，pending action 保持 waiting。
- `failed` / `cancelled` / `timeout` 返回 `IRA007`，pending evidence 保留为对应 status。
- `LoadGraph()` / `Start()` / `Restore()` 会清空 transient pending / action request evidence。

## Error 第一刀

本轮新增或扩展 action error：

```text
IRA005 runtime-action-pending
IRA006 action-resume-request-mismatch
IRA007 action-resume-host-error
```

既有 `IRA001` / `IRA002` / `IRA003` / `IRA004` 保持不变。本轮不新增 per-action rollback / replay / failure / timeout policy。

## 测试覆盖

新增 Internal tests：

- `narrative runtime waits for action resume`
- `narrative runtime reports wait resume errors`

覆盖范围：

- leading `@emit wait` 在进入节点时产生 request。
- pending action 包含 request id、action name、mode、handler name、status、node / line / source 与 typed arguments。
- snapshot 暴露 pending action，reading progress 在 pending 时不可 advance。
- pending 阻断 Runtime flow 操作，返回 `IRA005`。
- completed resume 清空 pending，且不会重复 dispatch 同一 wait action。
- wrong request id 返回 `IRA006`，pending action 仍 waiting。
- cancelled resume 返回 `IRA007`，pending evidence 保留 cancelled status。
- `handoff` 仍是未实现 mode。

## 架构自检

- Runtime 仍只依赖 `Inscape.Compiler`，没有引用 `Inscape.Tooling`、VSCode、SelfHostedEditor、Unity 或 Bird。
- `PendingAction` / `ResumeAction` 位于 `Internal/Runtime`；ExternalSupport 没有复制 Runtime action dispatcher。
- Host Schema / Host Bridge 真实 JSON 读取仍由 Tooling / CLI / 后续 adapter 负责；Runtime 只消费等价注入模型。
- formal `ExportState()` 仍不包含 action request history 或 pending action；P4 子状态 blob 留给 Round 9。
- 没有新增 rollback / replay / failure / timeout policy 字段。

## 未完成范围

- `handoff` 控制权移交 / resume。
- pending action 进入 P4 runtime substate blob。
- Log / Backlog。
- P4 Save / Load 子状态 blob。
- CLI Runtime playable driver 对 wait resume 的真实参数化适配。
- P4 integration smoke 与最终 PASS / FAIL。

## 下一轮入口

P4 Round 7：实现 `handoff` 控制权移交 / resume 第一刀。

重点：

- 明确 `wait` 与 `handoff` 的状态差异。
- `handoff` action dispatch 后 Runtime 交出控制权，不推进剧情。
- 宿主以后用 request id resume；completed 恢复 Runtime，失败 / 取消 / 超时仍统一作为 host action error。
- 不引入 Unity / Bird / 小游戏 / Timeline 具体业务逻辑。
