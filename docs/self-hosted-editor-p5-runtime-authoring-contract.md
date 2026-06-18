# SelfHostedEditor P5 Runtime Authoring Contract

日期：2026-06-18

状态：P5 Round 1 authoring contract

本文定义 P5 SelfHostedEditor Runtime authoring / productization 第一刀的边界。它是后续 Round 2-12 的共同合同：SelfHostedEditor 可以把 P4 Runtime 能力产品化为作者调试工作流，但不能接管或复制 Runtime 语义。

## 目标

P5 的目标是让作者能在 SelfHostedEditor 里完成一条最小 Runtime 调试闭环：

- 从 Host Schema 查看 query / action capability。
- 为当前 session 设置 mock query test input。
- 用 Runtime-backed Preview 观察条件选项、条件跳转和 Runtime error。
- 触发 `fire` / `wait` / `handoff` action，并观察 action request / pending evidence。
- 对 pending action 做调试 resume。
- 查看 Log / Backlog、branch receipt / condition explanation。
- 导出 / 导入 / validate `inscape.runtime-substate` 做编辑器预览和测试。

## 非目标

P5 明确不做：

- Unity / Host SDK。
- Bird adapter 或 Unity importer 扩展。
- 完整 Rollback、完整 Trace Replay、Flashback Playback。
- Presentation IR。
- 完整独立游戏存档产品。
- 用户自定义内部变量系统。
- Host Schema 第一版 action policy 扩张，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- SelfHostedEditor 前端重写 Runtime condition evaluator、query evaluator、action dispatcher、branch receipt 生成器或 substate import / validate。
- 把 mock query 当作正式宿主状态。
- 把 `inscape.runtime-substate` 当作完整 host save。
- 大规模视觉重做。

## 权威来源

SelfHostedEditor Runtime authoring 的权威来源固定如下：

- Compiler：DSL parse、project graph、source mapping 与诊断真相。
- Runtime：condition evaluator、query provider consumption、flow、action dispatch、pending / resume、Log、branch receipt、Runtime State、Runtime substate。
- Tooling / LanguageServer：Host Schema / Host Binding capability、authoring hint、source location 与 shared presenter。
- Cli：`runtime-project` 是 dev-host / smoke 可调用的 shared execution boundary。
- SelfHostedEditor：只做 backend command / transport、bridge、presenter、UI、session shell 和可见调试状态。

SelfHostedEditor 不得通过复制代码、重新解析 payload meaning 或本地重算来制造第二套 Runtime truth。

## Runtime Authoring Session 分类

P5 session model 必须能区分以下类别。Round 2 应把这些类别落成稳定 model / contract check。

- Current snapshot：当前 Runtime snapshot，用于 Preview、status、action evidence、Log / receipt 展示。
- Formal state：`inscape.runtime-state`，用于最小 Runtime 恢复；不包含完整 Log、完整 action request history 或完整 branch receipt history。
- P4 substate：`inscape.runtime-substate`，用于保存 / 恢复 Inscape narrative 子状态；可包含 pending action 与必要 branch receipts，但不包含宿主业务状态。
- Pending action：当前阻断 Runtime 的 `wait` / `handoff` evidence。
- Action requests：Runtime 本次 snapshot / step 暴露的 action request evidence；用于调试展示，不作为长期 action history。
- Log entries：Runtime snapshot 的 transient `logEntries`；用于 Backlog / source jump，不作为状态真相。
- Branch receipts：Runtime snapshot / substate 中的 branch-affecting query evidence；用于 condition explanation，不作为完整 Trace Replay。
- Provider metadata：runtime provider、query provider、transport、session id、workspace revision、stale / error 状态。

Session status 可以摘要这些类别，但不能暴露完整 workspace text、CSV、line-map、Runtime snapshot 大 payload 或长期 action history。

## Mock Query Authoring

Mock query authoring 的合同：

- Query 列表来自 Host Schema `queries[]` 的 shared capability payload。
- UI 只允许为当前 editor session 设置 test input。
- 支持 bool / number / string 的最小 value editing。
- 支持 reset、missing value、unknown query、type mismatch、invalid literal 的结构化提示。
- Mock value 可用于 `runtime-project --query-provider` 或等价 backend command payload。
- Mock value 不写入 formal Runtime State、不写入 P4 substate、不伪装成正式宿主状态。
- Unknown query 不应被 SelfHostedEditor 临时发明 schema；必须显示为 schema / script / mock table 不匹配。

后续若要持久化 mock preset，必须先新增单独 authoring preset contract，且仍不能把它并入 Runtime State 或 host state。

## Action Authoring / Pending

Action authoring 的合同：

- Action capability 来自 Host Schema `actions[]`。
- Handler availability 来自 Host Bridge capability / binding payload。
- Runtime action request 和 pending action 来自 Runtime snapshot / substate。
- `fire` action 可显示 request / dispatch evidence，但不阻断 Runtime controls。
- `wait` / `handoff` pending 必须阻断 Runtime controls，直到作者通过调试 resume 输入 completed / failed / cancelled / timeout。
- Resume request 只能通过 Runtime / CLI / backend command 交回 shared Runtime；SelfHostedEditor 不得本地清 pending。
- 不新增 action rollback / replay / timeout / failure policy 字段。

## Runtime-backed Preview

Preview 的 Runtime 合同：

- Runtime 可用时，Preview 选择、继续、advance-flow、rewind-flow、节点级 back 都必须消费 Runtime bridge 返回的 snapshot。
- Preview 可以保留 compiler / offline fallback，但必须明确显示 provider。
- Runtime payload contract error 不得被 offline draft fallback 静默掩盖。
- Pending blocked、Runtime error、snapshot stale、Runtime unavailable 必须能被用户看见。
- Preview 不为 P5 新增本地分支推进语义；条件选项、条件跳转、visited / trust 等内部事实都由 Runtime 决定。

## Log / Backlog

Log / Backlog 的合同：

- 只展示 Runtime `logEntries`。
- 默认字段为 `speaker`、`text`、`lineId`，可带 node / source location。
- 支持从 log item 跳回源文本。
- 不重新执行脚本生成 log。
- 不显示条件隐藏文本。
- 不把 Log 写入 formal Runtime State。

## Branch Receipt / Condition Explanation

Branch receipt / condition explanation 的合同：

- 只展示 Runtime 提供的 branch query receipt。
- 可解释 query name、arguments、result、source kind、deterministic、node / choice / jump context。
- 可从 receipt 跳回 source location。
- 不重新查询 host 来解释历史分支。
- 不实现完整 Trace Replay 或 replay timeline。

## Substate Authoring

Substate authoring 的合同：

- 支持导出 `inscape.runtime-substate` 作为 editor preview / test artifact。
- 支持 validate substate，显示 compatible / migratable / incompatible。
- 只有 compatible substate 可导入恢复 preview session。
- Migratable / incompatible 不静默修复。
- Substate 不保存宿主业务状态、完整 Log、完整 action request history、Rollback stack 或 Trace Replay。
- `host.checkpointId` 仍是 opaque 外壳，不由 SelfHostedEditor 解读。

## Error / Empty / Stale

P5 UI 必须区分并可见化：

- Runtime unavailable。
- Runtime CLI / backend command failure。
- HTTP / desktop transport failure。
- Host Schema missing。
- Host Bridge handler missing。
- Query missing / unknown / type mismatch。
- Action handler missing / unsupported mode。
- Pending blocked。
- Session stale。
- Script drift / incompatible substate。
- Payload contract error。

错误文本应 bounded、可定位，不回传大 payload，不泄露不必要的 workspace content。

## Transport 等价边界

Dev-host HTTP 与 desktop command 必须保持业务等价：

- `runtime.start-or-observe` 对应 Runtime snapshot start / observe。
- `runtime.step` 对应 Runtime action step。
- 后续 mock query、resume action、substate import / export / validate 如需新增 command，必须先定义 shared payload shape，再分别接 dev-host 与 desktop thin transport。
- Renderer 只通过 backend service / command / transport 使用这些能力，不直接访问 `/api/*`、Node、Electron 或 arbitrary IPC。

## 最小验收 Fixture

P5 所有 authoring 功能应能回到同一个最小 fixture：

- query：`has_item("silver_key")` 与 `trust("mira")`。
- internal fact：`visited("gate.knock")`。
- action：`play_timeline` 为 `fire`，`wait_for_ui` 为 `wait`。
- path：key/fire path 与 no-key/wait/resume/help path。
- evidence：pending action、action request、log entry、branch receipt、substate export / import / validate。

这个 fixture 已由 P4 Internal / CLI tests 证明 Runtime truth，P5 只负责把它呈现为作者可调试的 SelfHostedEditor workflow。

## Per-round Acceptance Gate

- Round 2：session model 能表达本文的 session 分类，且 status text-free。
- Round 3：mock query model 从 Host Schema 生成，不修改 Runtime / Host Schema 语义。
- Round 4：mock query UI 能驱动 Runtime Preview，并清楚显示 unavailable / invalid。
- Round 5：action surface 能显示 capability / request / pending / resume，不新增 policy。
- Round 6：Preview controls 只走 Runtime bridge 推进 Runtime path。
- Round 7：Runtime status 来自 Runtime payload，不重算。
- Round 8：Log surface 只展示 Runtime log entries。
- Round 9：Receipt explanation 只展示 Runtime receipts。
- Round 10：substate export / import / validate 不变成完整 save product。
- Round 11：error / empty / stale 不被 fallback 掩盖。
- Round 12：integration smoke 串起最小作者调试 workflow。

每轮都必须通过 Debug 自检、架构自检、验证、提交和推送后，才能进入下一轮。
