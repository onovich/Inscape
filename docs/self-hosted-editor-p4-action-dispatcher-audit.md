# SelfHostedEditor P4 Action Dispatcher Audit

日期：2026-06-18

状态：P4 Round 5 action dispatcher contract + `fire` 第一刀完成；P4 Runtime playable MVP 尚未完成。

## 本轮目标

- 定义 Runtime action request / result / error 的最小模型。
- 让 Runtime 读取 Host Schema `actions[]` 等价输入中的 `mode`。
- 将当前 Compiler graph 中的 `@emit` metadata action intent 转成 Runtime action request。
- 实现 `fire`：发出 action request 后 Runtime 继续推进。

## 实现内容

新增 Runtime HostBridge action 模型：

- `NarrativeRuntimeActionDispatcherModel`
- `NarrativeRuntimeActionCapabilityModel`
- `NarrativeRuntimeActionHandlerBindingModel`
- `NarrativeRuntimeActionRequestModel`
- `NarrativeRuntimeActionArgumentModel`
- `NarrativeRuntimeActionResultModel`

新增 Runtime action dispatcher：

- `NarrativeRuntimeActionDispatcherDomain.Dispatch(...)`
- 按 action name 查找 Host Schema 等价 capability。
- 读取 `mode`，本轮只允许 `fire`。
- 按 action name 查找 Host Bridge 等价 handler mapping。
- 可选调用宿主 delegate `DispatchAction`；delegate 异常或失败统一作为 host action error。

扩展 `NarrativeRuntime`：

- 新增 `ActionDispatcher`。
- 新增 `ActionRequests`，记录已发出的 fire request。
- `CreateSnapshot()` 暴露 action request 克隆，便于 CLI / smoke 调试。
- `Start()` / node enter 会 dispatch 当前节点起始处可用的 `@emit fire`。
- `AdvanceFlow()` 会 dispatch 随正文推进到达的 `@emit fire`。
- 同一次节点访问中同一 action metadata line 不重复 dispatch。
- `LoadGraph()` / `Start()` / `Restore()` 会清空 transient action request 记录。

## Error 第一刀

当前 action dispatcher error code：

```text
IRA001 action-not-declared-in-host-schema
IRA002 action-handler-missing-in-host-bridge
IRA003 action-mode-not-implemented-yet
IRA004 host-action-dispatch-failed
```

这些 error 作为 Runtime flow `LastError` 暴露。本轮不做剧情分支，不新增 per-action rollback / replay / failure / timeout policy。

## 测试覆盖

新增 Internal tests：

- `narrative runtime dispatches fire actions and continues`
- `narrative runtime reports action dispatch errors`

覆盖范围：

- leading `@emit fire` 在进入节点时产生 request。
- 正文推进经过的 `@emit fire` 会产生 request。
- `fire` action 不阻塞 `AdvanceFlow()` / `Continue()`。
- request 包含 request id、action name、mode、handler name、node id、line id、source line / column、raw 与 typed arguments。
- snapshot 暴露 action requests。
- formal Runtime State export 不包含 action request history。
- missing Host Schema action、missing Host Bridge handler、`wait` mode 和 host delegate exception 均有明确 Runtime error。

## 架构自检

- Runtime 仍只依赖 `Inscape.Compiler`，没有引用 `Inscape.Tooling`、VSCode、SelfHostedEditor、Unity 或 Bird。
- Host Schema / Host Bridge 读取仍由 Tooling / 后续 CLI 适配负责；Runtime 本轮只消费等价的 action capability / handler binding model。
- `@emit` 暂时从 Compiler graph 的 metadata line 转为 Runtime action intent；没有在 ExternalSupport 复制 action dispatcher。
- `wait` / `handoff` 没有被偷跑实现，只被识别为未实现 mode。
- 没有新增 rollback / replay / failure / timeout policy 字段。

## 未完成范围

- `wait` pending / resume。
- `handoff` 控制权移交 / resume。
- pending action 进入 P4 runtime substate blob。
- Log / Backlog。
- P4 Save / Load 子状态 blob。
- CLI Runtime playable driver 对 Host Schema / Host Bridge 的真实适配。
- P4 integration smoke 与最终 PASS / FAIL。

## 下一轮入口

P4 Round 6：实现 `wait` action pending / resume 第一刀。

重点：

- 定义 pending state / resume token / request id。
- `wait` action 进入 pending，不继续推进 Runtime。
- 宿主以 request id resume 后 Runtime 继续。
- `failed` / `cancelled` / `timeout` 仍统一作为 host action error，不做剧情分支。
- 不新增 per-action timeout policy 字段。
