# SelfHostedEditor P5 Baseline Audit

日期：2026-06-18

状态：P5 Round 1 baseline audit

适用范围：SelfHostedEditor Runtime authoring / productization 第一刀。本文只记录 P4 之后的可复用能力、SelfHostedEditor 现有入口、P5 缺口、风险和 smoke 策略；不实现新的 Runtime 语义或 UI 行为。

## 本轮边界

本轮只做：

- 审计 P4 Runtime playable MVP 已经具备的共享能力。
- 审计 SelfHostedEditor 现有 Runtime bridge、Preview、Host Schema / Host Binding、desktop transport 和 session cache 入口。
- 固定 P5 后续轮次的最小 Runtime authoring fixture 与 smoke 方向。
- 新增 Runtime authoring contract 文档。

本轮不做：

- 不新增 mock query UI、action panel、Log / receipt / substate UI。
- 不修改 Runtime kernel、Compiler、Host Schema policy、Unity / Bird、Rollback / Trace / Flashback 或 Presentation IR。
- 不把 Runtime condition evaluator、query evaluator、action dispatcher、branch receipt 或 substate 语义复制到 SelfHostedEditor 前端。

## P4 已具备的共享 Runtime 能力

P4 final validation 已确认 Runtime playable MVP 为 PASS，关键能力位于 `src/Internal/Runtime` 与 `src/Internal/Cli`，SelfHostedEditor 只能通过共享 CLI / Runtime payload 消费这些能力。

- Runtime condition evaluator：支持 bool / number / string、query path / call、`and` / `or` / `not`、比较、short-circuit、missing query、type mismatch 与 provider error。
- Query provider：支持 internal facts、delegate、mock value table 与 recorded value table；CLI JSON 只表达 mock / recorded，delegate callback 仍属于正式 host integration。
- Runtime flow：条件选项过滤、visible option index、条件跳转 first true wins、fallback 和 structured flow error 均由 Runtime 执行。
- Branch query receipt：Runtime 记录 branch-affecting query name、arguments、result、source kind、deterministic、node / choice / jump context；receipt 不进入 formal Runtime State。
- Action dispatcher：Host Schema `actions[]` 等价 action capability 与 Host Bridge handler binding 驱动 `fire` / `wait` / `handoff`；`wait` / `handoff` 会创建 pending action，并通过 resume 继续。
- Log / Backlog：Runtime snapshot 暴露 transient `logEntries`，默认只记录实际 reveal 的正文行；formal Runtime State 不包含完整 Log。
- Formal Runtime State：`inscape.runtime-state` 仍保持最小可恢复状态。
- P4 substate：`inscape.runtime-substate` 保存 position、flow、facts、pending action、branch query receipts 和 opaque host checkpoint id；它不是完整游戏存档。
- CLI playable driver：`runtime-project` 支持 query provider、action dispatcher、resume action、state / substate import、state / substate export、state / substate validate、choose / continue / advance-flow / rewind / rewind-flow。

## SelfHostedEditor 现有入口

### Runtime Bridge

`src/ExternalSupport/SelfHostedEditor/Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js` 通过 backend service 调用 Runtime session：

- `getRuntimeSnapshot(scriptText)` 调 `runtimeSession.startOrObserve(...)`，返回 `provider: "runtime-project"` 或 `provider: "unavailable"`。
- `stepRuntimeSnapshot(scriptText, runtimeState, action)` 调 `runtimeSession.step(...)`，优先使用 `sessionId` 服务端状态，失败时才用显式 `runtimeState` fallback。
- 请求使用 `EditorBackendWorkspaceRequestModel`，可携带 workspace context / workspace snapshot；这是 SelfHostedEditor 消费 Runtime 的薄桥。

### Dev-host Runtime API

`src/ExternalSupport/SelfHostedEditor/DevScripts/StartSelfHostedEditorPreview.js` 目前提供：

- `/api/runtime-state`：运行 `runtime-project <tempRoot>`，返回 compact `inscape.self-hosted-editor.runtime-state`。
- `/api/runtime-action`：基于 session cache 或显式 `runtimeState` 调 `runtime-project` 的 `--continue`、`--advance-flow`、`--rewind`、`--rewind-flow`、`--choose`。
- Runtime snapshot 会写入 bounded session cache，便于后续 action 只带 `sessionId`。

当前缺口：dev-host 路径尚未暴露 P5 mock query authoring、action dispatcher authoring、resume action、substate export / import / validate、branch receipt explanation 或 Log / Backlog UI 专用模型。

### Runtime-backed Preview

`src/ExternalSupport/SelfHostedEditor/Scripts/Preview/Models/PreviewRuntimePreferenceModelBuilder.js` 已能把 Runtime snapshot 投影为 Preview model：

- 使用 Runtime `currentNode`、`lines`、`choices`、`defaultNext` 与 `state.path`。
- choice / continue 控件携带 Runtime action。
- provider 标为 `runtime`，不能伪装成 compiler 或 offline draft preview。

`PreviewPanelController` 已支持 Runtime action bridge、advance-flow、rewind-flow、choice click 与 Runtime history path 的基础呈现。

当前缺口：P5 还需要 pending / error / stale 状态、mock query influence、action request evidence、Log / receipt / substate 的可观察 UI，并补完整 authoring smoke。

### Host Schema / Host Binding

SelfHostedEditor 当前通过 shared LanguageServer / Tooling capability endpoint 获取 Host Schema 与 Host Binding：

- `SelfHostedEditorHostSchemaBridge` 调 backend `schemaCapabilities(...)`，映射到 Host Schema capability catalog。
- `SelfHostedEditorHostBindingBridge` 调 backend `bindingCapabilities(...)`，映射到 Host Binding capability catalog，并支持 definition / references。
- `HostCapabilityCatalogController` 显示 queries、actions、legacy events、speakers、timeline bindings 与 source jump。

当前缺口：P5 mock query authoring 尚未从 `queries[]` 生成可编辑 mock table；action authoring surface 尚未把 `actions[]` 与 Runtime action request / pending / resume 串起来。

### Backend / Desktop Transport

`EditorBackendTransportCommand` 已有 Runtime command：

- `runtime.start-or-observe` -> dev-host `/api/runtime-state`
- `runtime.step` -> dev-host `/api/runtime-action`

`EditorBackendClient.runtimeSession`、`RuntimeSessionClient`、`SelfHostedEditorPreloadBackendTransport`、`ElectronPreloadApi` 和 `ElectronPreload.cjs` 已有对应 command surface。renderer 仍通过窄 backend service / command / transport 工作，不直接访问 Node / Electron / arbitrary IPC。

当前缺口：desktop Runtime session 仍需要与 P5 authoring session shape 对齐；P5 后续若扩 command，必须保持 dev-host HTTP 与 desktop command 的 payload 等价，且 desktop 响应不能泄露 workspace text 以外的不该常驻内容。

### Session Cache

`SelfHostedEditorSessionBridge` 统一管理 Runtime snapshot、line-map sidecar 与 localization baseline 的 bounded cache：

- 默认 2 小时 idle TTL。
- 每类最多 64 条 session。
- `/api/session-cache-status` 只报告 session id、大小、idle / age 与 eviction counter，不暴露 Runtime snapshot、line-map 或 CSV 内容。

当前缺口：P5 Runtime authoring session 还没有正式 shape，尚未区分 current snapshot、formal state、P4 substate、pending action、log entries、branch receipts、provider metadata 和 stale / error 状态。

## P5 主要缺口

- Runtime authoring session contract：需要稳定表达 current snapshot、formal state、P4 substate、pending action、action requests、log entries、branch receipts、provider / session / stale / error metadata。
- Mock query authoring：需要从 Host Schema `queries[]` 生成 session-only mock input，覆盖 bool / number / string、reset、missing、unknown、type mismatch。
- Action authoring / pending surface：需要显示 action capability、handler availability、Runtime action request、pending evidence 和 completed / failed / cancelled / timeout resume controls。
- Runtime-backed Preview hardening：需要可见 pending blocked、Runtime error、snapshot stale、provider fallback，且所有分支推进继续走 Runtime bridge。
- Log / Backlog surface：需要显示 Runtime `logEntries` 并支持 source jump，不重新执行脚本。
- Branch receipt / condition explanation：需要显示 branch query receipt 与条件解释，不实现完整 Trace Replay。
- Substate authoring：需要导出 / 导入 / validate `inscape.runtime-substate` 的测试入口，incompatible / migratable 不静默修复。
- Error / empty / stale state：需要清楚区分 schema missing、bridge missing、query missing、action handler missing、Runtime CLI failure、HTTP failure、session stale、script drift。
- Integration smoke：需要至少一个 dev-host 或 model smoke 串起 P5 最小作者调试路径。

## 最小 Runtime Authoring Fixture

P5 后续验收统一围绕 P4 已验证过的最小剧情 fixture：

```inscape
# start
@entry
Narrator: Door.
? Gate
- [has_item("silver_key")] Use key -> gate.open
- Knock -> gate.knock

# gate.open
@emit play_timeline mira_reveal
Narrator: Door opens.
-> end

# gate.knock
@emit wait_for_ui confirm_help
Narrator: Knocked.
? [visited("gate.knock") and trust("mira") >= 3] -> mira.help
-> gate.locked

# mira.help
Narrator: Mira helps.
-> end

# gate.locked
Narrator: Locked.
-> end

# end
Narrator: End.
```

Fixture 需要覆盖：

- `has_item("silver_key") = true` 进入 `gate.open`，触发 `play_timeline` fire action。
- `has_item("silver_key") = false` 隐藏钥匙选项，只显示 `Knock`。
- `wait_for_ui` 进入 pending，resume completed 后继续。
- `visited("gate.knock") and trust("mira") >= 3` 命中 `mira.help`。
- `logEntries` 只包含实际 reveal 的正文。
- branch receipts 保留 `has_item`、`visited`、`trust` 等 branch-affecting evidence。
- substate 可保存 pending / resumed / advanced narrative 子状态，并通过 validate / import 恢复。

## 风险清单

- Runtime 语义复制风险：为了 UI 解释条件或 action，在前端重算 condition / query / dispatch。
- Mock query 越界风险：把 session-only mock 值当作正式 host state 或写入 formal Runtime State。
- Substate 越界风险：把 `inscape.runtime-substate` 扩成完整游戏存档或宿主业务状态存储。
- Fallback 掩盖风险：Runtime / hosted payload contract error 被 offline draft fallback 吞掉，作者看不到真实问题。
- Payload 膨胀风险：session status、desktop IPC 或 panel model 暴露完整 Log、Runtime snapshot、workspace text 或 CSV。
- Transport 漂移风险：dev-host `/api/*` 与 desktop command 的 payload shape 分叉。
- UI 可用性风险：Runtime authoring 面板抢占写作视图、状态文字重叠或把调试证据显示成正式剧情内容。
- 范围扩张风险：把 Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR 或 Host Schema action policy 扩张混入 P5。

## Per-round Smoke 策略

- Round 2 Runtime session contract：新增或扩展 model contract，覆盖 session shape、text-free status、current snapshot / formal state / substate / pending / log / receipt 分类。
- Round 3 Mock query model：model check 覆盖 Host Schema queries -> mock table、bool / number / string、missing / invalid / unknown。
- Round 4 Mock query UI：model 或 runtime smoke 覆盖 apply / reset / Runtime preview restart；可见 UI 改动需浏览器或 GUI smoke。
- Round 5 Action authoring：Runtime action smoke 覆盖 `fire`、`wait` / `handoff` pending、resume completed / failed / cancelled / timeout 的本轮目标路径。
- Round 6 Preview controls：`check:runtime` / `check:runtime-http` 覆盖 choose / continue / advance-flow / rewind-flow / back 与 pending / stale / error 状态。
- Round 7 Runtime status：model check 覆盖 provider、current node、visible choices、visible step count、pending action、last error、query provider source。
- Round 8 Log / Backlog：model 或 smoke 覆盖 `logEntries` 展示、source jump 和 hidden text absence。
- Round 9 Branch receipt：contract smoke 覆盖 receipt display model、condition explanation、source jump；不重新查询 host。
- Round 10 Substate：smoke 覆盖 export / validate / import、compatible / migratable / incompatible、pending restore。
- Round 11 Error state：contract smoke 覆盖 schema missing、bridge missing、query missing、action handler missing、CLI / HTTP failure、session stale、script drift。
- Round 12 Integration：dev-host HTTP smoke 串起 mock query、Runtime Preview、action pending / resume、Log、receipt explanation、substate export / import / validate。
- Final validation：P5 指南列出的 full matrix 加边界扫描。

每轮基础验证继续使用 P5 guide 的推荐矩阵：`.NET build`、Internal tests、VSCode structure / semantic parity、SelfHostedEditor syntax / structure / model / runtime / runtime-http / semantic parity HTTP 和 `git diff --check`。改动 workbench 集成时补 `check:workbench-integration-http` 与 `check:session-cache-http`；改动 Electron / desktop transport 时补 Electron boundary / IPC / workspace / desktop smoke。

## Round 1 Debug 自检

- 最小 fixture 已固定到 P4 已验证路径，可解释后续 mock query、action pending、Log、receipt、substate 需求。
- 当前失败定位层次明确：shared CLI / Runtime、dev-host HTTP、backend command transport、renderer bridge、UI panel。
- Round 1 未新增 mock query 或 action behavior，因此不需要新增代码 smoke。
- 当前文档要求后续 Log / receipt / substate 只展示 Runtime payload，不重新执行脚本。

## Round 1 架构自检

- Runtime 语义仍归 `Internal/Runtime`；SelfHostedEditor 只允许桥接、presenter 与 UI。
- Host Schema / Host Bridge / Usage Manifest 分层保持不变。
- Mock query 被限定为 authoring / preview / CI session input，不是正式宿主状态。
- Substate 被限定为 Inscape narrative 子状态 blob，不是完整游戏存档。
- 本轮不修改 `src/Internal`、Unity / Bird、Host Schema policy 或 ExternalSupport 产品语义。
