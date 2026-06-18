# P5 SelfHostedEditor Runtime Authoring Goal 模式执行指南

日期：2026-06-18

状态：给执行者使用的 P5 开发指令文档

适用范围：SelfHostedEditor Runtime authoring / productization 第一刀。目标是把 P4 已完成的 Runtime playable MVP 能力接进作者工作流，让作者能在编辑器里配置 mock query、观察 action / pending、使用 Runtime-backed Preview、查看 Log / branch receipt / substate，并通过稳定 smoke 验证这些能力。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在 16 轮会话内完成 P5 SelfHostedEditor Runtime authoring / productization 第一刀：基于 P4 已通过验收的 Runtime condition evaluator、delegate / mock / recorded query provider、branch query receipt、`fire` / `wait` / `handoff` action dispatcher、Log / Backlog、`inscape.runtime-substate` 和 `runtime-project` CLI，把 SelfHostedEditor 推进为可用于作者调试 Runtime 分支的产品化工作流。实现 Runtime authoring baseline contract、mock query 编辑与预设、action capability / pending / resume 调试面板、Runtime-backed Preview 控制、Log / Backlog 查看、branch receipt / condition explanation、substate export / import / validate 测试入口、错误 / 空 / 过期状态提示、HTTP / desktop bridge smoke 和文档收口。不实现 Unity / Host SDK，不实现完整 Rollback / Trace Replay / Flashback，不实现完整独立游戏存档产品，不把 Runtime 语义复制到 SelfHostedEditor 前端，不扩张 Host Schema 第一版 policy 字段。

执行硬约束：

- 总轮数上限：16 轮。
- 第 1-12 轮是主线开发轮。
- 第 13-15 轮是缓冲修复轮，只能用于补缺陷、补测试、补文档、修兼容和处理验证失败。
- 第 16 轮必须做最终验收并输出 P5 PASS / FAIL。
- 每一轮都必须包含 Debug 自检和架构自检。
- 每一轮必须在验证通过后提交并推送；推送成功后才允许进入下一轮。
- 不允许在最终验收矩阵通过前把 goal 标记为 complete。
- 如果同一阻塞连续 3 轮无法推进，标记 goal 为 blocked，并说明阻塞点、已尝试动作和需要的人类决策。

每轮回复必须包含：

- 本轮目标
- 本轮完成内容
- Debug 自检
- 架构自检
- 已运行验证命令与结果
- commit hash 与 push 结果
- 下一轮目标
- 是否消耗缓冲轮

## 1. 必读上下文

每次接手前先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `docs/self-hosted-editor-p4-final-validation-report.md`
4. `docs/self-hosted-editor-p4-goal-mode-execution-guide.md`
5. `docs/runtime-playable-mvp-contract.md`
6. `docs/p3-runtime-language-discussion-memory.md`
7. `docs/runtime-unity.md`
8. `docs/editor-design.md`
9. `docs/self-hosted-editor-architecture-plan.md`
10. `docs/vscode-self-hosted-editor-parity.md`
11. `docs/host-schema.md`
12. `docs/host-bridge-contract.md`
13. `docs/usage-manifest-contract.md`
14. `docs/condition-syntax-contract.md`
15. `docs/code-structure.md`
16. `docs/coding-conventions.md`

代码侧优先读：

- `src/Internal/Runtime`
- `src/Internal/Tooling`
- `src/Internal/Cli`
- `src/ExternalSupport/SelfHostedEditor/README.md`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Runtime`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Preview`
- `src/ExternalSupport/SelfHostedEditor/Scripts/HostSchema`
- `src/ExternalSupport/SelfHostedEditor/Scripts/HostBinding`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Backend`
- `src/ExternalSupport/SelfHostedEditor/DevScripts`
- `tests/Internal/Inscape.Tests`

P5 默认不需要真实 Bird / Unity 验证。若执行者认为必须碰 `src/ExternalSupport/UnityPlugin` 或外部 Unity 项目，必须先停止并说明原因；除非用户明确批准，否则 P5 不修改 Unity / Bird 方向。

## 2. P5 要完成什么

P5 是 SelfHostedEditor Runtime authoring / productization 第一刀。大白话说，它不是继续扩 Runtime 内核，而是把 P4 Runtime 能力变成作者在编辑器里能看、能改 mock、能点、能解释的调试闭环。

必须完成：

- Runtime authoring contract：
  - 明确 SelfHostedEditor 只消费 `Internal/Runtime`、CLI、LanguageServer、Tooling 的共享契约。
  - 明确哪些 UI 是正式产品行为，哪些只是 dev-host / smoke / fixture。
  - 明确 P5 不把 Host Schema、Runtime condition evaluator、query evaluator、action dispatcher 写成前端第二套语义。

- Runtime session product boundary：
  - 让 SelfHostedEditor Runtime 会话有稳定的 session 状态表达。
  - 能区分 current snapshot、formal state、P4 substate、pending action、log entries、branch receipts。
  - dev-host HTTP 与 desktop transport 都只能做薄桥接，不拥有 Runtime 语义。

- Mock query authoring：
  - 从 Host Schema `queries[]` 生成可编辑 mock query 表面。
  - 支持 string / number / bool 的 mock 值编辑与重置。
  - 支持保存为当前编辑器 session 的测试输入，不能伪装成宿主正式状态。
  - unknown query、type mismatch、missing mock value 要给清楚的调试提示。

- Action authoring / pending surface：
  - 从 Host Schema `actions[]` 和 Host Bridge handler 显示 action 能力。
  - 显示 Runtime 发出的 `fire` / `wait` / `handoff` action request。
  - 对 pending action 提供调试 resume 控制：completed / failed / cancelled / timeout。
  - 不新增 action rollback / replay / timeout / failure policy。

- Runtime-backed Preview：
  - Preview 的 Runtime 路径优先消费 `/api/runtime-state` / `/api/runtime-action` 或对应 desktop command。
  - 选择、继续、节点内前进、节点内后退、节点级 back 都应复用 Runtime 返回的 snapshot。
  - Runtime 不可用时可以保留现有 fallback，但必须明确标注 provider，不能静默伪装成 Runtime。
  - 条件选项、条件跳转、pending 阻断和 Runtime error 要在 UI 上可观察。

- Log / Backlog surface：
  - 显示 Runtime `logEntries`，默认字段仍是 `speaker`、`text`、`lineId`。
  - 支持从 log item 跳回源文本。
  - 不重新执行脚本，不把 Log 当作状态真相。

- Branch receipt / condition explanation：
  - 显示影响分支的 query receipt。
  - 能解释选项为什么显示 / 隐藏，条件跳转为什么命中 / 未命中。
  - 显示 query source kind、arguments、result、node / choice / jump context。
  - 不升级为完整 Trace Replay。

- Substate 测试入口：
  - 支持导出 / 导入 / validate `inscape.runtime-substate` 用于编辑器预览和测试。
  - 明确这不是完整游戏存档产品。
  - 导入 script drift / incompatible substate 时必须显示清楚错误，不静默修复。

- 错误 / 空 / 过期状态：
  - Runtime unavailable、schema missing、bridge missing、query missing、action handler missing、pending blocked、session stale、script drift 都要有清楚 UI 状态。
  - 不能用 offline fallback 掩盖 hosted / Runtime payload contract error。

- Smoke / docs：
  - 每个阶段性结果有审计文档。
  - Runtime authoring UI 的关键路径有 dev-host 或 model smoke。
  - 最终有 P5 PASS / FAIL 报告。

## 3. P5 不做什么

明确不做：

- Unity / Host SDK。
- Bird adapter 或 Unity importer 继续扩展。
- 完整 Rollback。
- 完整 Trace Replay。
- Flashback Playback。
- Presentation IR。
- 完整独立游戏存档产品。
- 用户自定义内部变量系统。
- Host Schema 第一版 action policy 扩张，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- SelfHostedEditor 前端重写 Runtime condition evaluator / query evaluator / action dispatcher。
- 把 mock query 当作正式宿主状态。
- 把 `inscape.runtime-substate` 当作完整游戏存档。
- 为了 UI 便利把 Runtime / Tooling / LanguageServer 的 payload meaning 重命名成宿主私有真相。
- 大规模视觉重做。P5 可以做必要 UI，但不做全站换皮。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

如果工作区存在与本轮无关的未跟踪文件或修改，不要纳入提交。当前仓库可能有外部合作草稿类未跟踪文档，除非用户明确要求，不要改动、不要删除、不要提交。

每轮必须先声明本轮边界：

```text
本轮只做：
- ...

本轮不做：
- ...
```

每轮 Debug 自检：

- 当前改动能否用一个最小 SelfHostedEditor runtime authoring fixture 解释？
- 失败时能否定位到 server / transport / payload / client / UI 哪一层？
- 如果涉及 mock query，是否覆盖 known query、unknown query、type mismatch、missing value？
- 如果涉及 action，是否覆盖 `fire`、`wait`、`handoff` 中本轮目标模式的 request / pending / resume / error？
- 如果涉及 Runtime Preview，是否覆盖 Runtime 可用、Runtime 不可用、snapshot stale、pending blocked？
- 如果涉及 Log / receipt，是否证明 UI 只展示 Runtime payload，不重新执行脚本？
- 如果涉及 substate，是否覆盖 export / import / validate / incompatible？
- 如果涉及桌面桥接，是否覆盖 dev-host 与 desktop transport 的差异，且响应不泄露正文之外的敏感状态？
- 如果涉及可见 UI，是否做了浏览器或 smoke 验证，确认文字不重叠、控件可用、状态清楚？

每轮架构自检：

- `Inscape.Compiler` 是否仍不依赖 SelfHostedEditor、Host Schema、Runtime provider、Unity 或 Bird？
- Runtime 语义是否仍归 `Internal/Runtime`，SelfHostedEditor 只做桥接、presenter 和 UI？
- Host Schema / Host Bridge / Usage Manifest 三者是否仍分层清楚？
- Mock query 是否只服务 authoring / preview / CI，没有变成正式宿主状态？
- Substate 是否仍是 Inscape narrative 子状态 blob，没有变成完整游戏存档？
- ExternalSupport 是否没有复制 condition evaluator、query evaluator、action dispatcher 或 branch receipt 语义？
- Editor backend 是否仍通过窄 service / command / transport 工作，没有暴露 generic RPC 或 Node / Electron 任意能力给 renderer？
- 是否没有把 Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR 混入 P5？

每轮推荐验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

若改动 workbench 跨功能行为，补跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
```

若改动 Electron / desktop transport，补跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-runtime
```

若改动可见 UI，必须补一个可重复 UI 验证入口：

- 优先新增或更新 `check:*` / `smoke:*` 自动化。
- 必要时启动 `npm --prefix src\ExternalSupport\SelfHostedEditor run start` 并用浏览器检查关键视图。
- 不要只靠“静态检查通过”宣布可见 UI 完成。

## 5. 每轮通过后提交推送工作流

每轮只有在 Debug 自检、架构自检和本轮验证全部通过后，才能提交推送。

推荐命令：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
tools\CommitAndPushInscape.cmd "p5: <round summary>"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 每轮一个提交，除非缓冲修复必须拆成多个独立风险点。
- commit message 推荐格式：`p5: <short summary>`。
- 只提交本轮相关文件。
- 不提交 unrelated untracked docs。
- 不提交生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。
- 推送失败时，不允许进入下一轮；先修复推送问题或标记 blocked。
- 推送成功后，在本轮回复中写明 commit hash、远端分支和下一轮目标。

如果仓库脚本不可用，才使用显式 git 流程：

```powershell
git -c safe.directory=D:/LabProjects/Inscape add <本轮相关文件>
git -c safe.directory=D:/LabProjects/Inscape commit -m "p5: <round summary>"
git -c safe.directory=D:/LabProjects/Inscape push
```

## 6. 分轮安排

### 第 1 轮：P5 baseline audit + authoring contract

目标：

- 审计 P4 Runtime 能力、SelfHostedEditor Runtime bridge、Preview、Host Schema / Host Binding UI、desktop transport、session cache。
- 写清 P5 第一刀产品化范围和不做范围。
- 固定 Runtime authoring 最小验收样例。

产出：

- `docs/self-hosted-editor-p5-baseline-audit.md`
- `docs/self-hosted-editor-p5-runtime-authoring-contract.md`

验收：

- 文档列出现有入口、缺口、风险和每轮 smoke 策略。
- 本轮验证通过后提交推送，才能进入第 2 轮。

### 第 2 轮：Runtime authoring session contract

目标：

- 定义 SelfHostedEditor Runtime authoring session shape。
- 区分 current snapshot、formal state、P4 substate、pending action、log entries、branch receipts。
- 明确 dev-host HTTP 与 desktop transport 的等价 payload 边界。

产出：

- Runtime authoring session model / contract check。
- 审计文档 `docs/self-hosted-editor-p5-runtime-session-audit.md`。

验收：

- `check:model` 或新增专项 check 覆盖 session shape。
- 不把 Runtime state 正文、完整 Log 或完整 action history塞进 session status。
- 验证通过后提交推送。

### 第 3 轮：Mock query model

目标：

- 从 Host Schema `queries[]` 生成 mock query authoring model。
- 支持 string / number / bool mock value。
- 支持 missing / invalid / unknown query 的结构化提示。
- 保持 mock query 只作为 editor session test input。

产出：

- Mock query model / mapper / contract check。
- 审计文档 `docs/self-hosted-editor-p5-mock-query-model-audit.md`。

验收：

- 不修改 Host Schema 语义。
- 不把 mock query 写进正式 Runtime state。
- 验证通过后提交推送。

### 第 4 轮：Mock query UI

目标：

- 在 SelfHostedEditor 增加 mock query 编辑表面。
- 支持按 Host Schema 显示 query、类型、当前 mock 值、错误状态。
- 支持 reset / apply to runtime preview。
- Runtime Preview 使用这些 mock 值重新启动或推进测试会话。

产出：

- UI controller / renderer / bridge。
- model 或 runtime smoke。
- 审计文档 `docs/self-hosted-editor-p5-mock-query-ui-audit.md`。

验收：

- 可见 UI 不重叠、不遮挡主写作视图。
- Runtime unavailable 时有明确 fallback 状态。
- 验证通过后提交推送。

### 第 5 轮：Action capability / pending surface

目标：

- 显示 Host Schema `actions[]` 与 Host Bridge handler mapping。
- 显示 Runtime action request history 的当前可调试证据。
- 对 pending `wait` / `handoff` 提供 completed / failed / cancelled / timeout 调试 resume。

产出：

- Action authoring panel / model。
- Runtime action smoke。
- 审计文档 `docs/self-hosted-editor-p5-action-authoring-audit.md`。

验收：

- `fire` 不应阻断 UI。
- `wait` / `handoff` pending 必须阻断 Runtime controls，直到 resume。
- 不新增 action policy schema。
- 验证通过后提交推送。

### 第 6 轮：Runtime-backed Preview controls

目标：

- Preview 控制优先使用 Runtime snapshot 和 Runtime action。
- 覆盖 choose、continue、advance-flow、rewind-flow、back。
- pending / error / stale snapshot 状态在 Preview 中可见。

产出：

- Preview runtime control update。
- `check:runtime` / `check:runtime-http` 覆盖新增路径。
- 审计文档 `docs/self-hosted-editor-p5-runtime-preview-audit.md`。

验收：

- Preview 不再为 P5 新增本地分支推进语义。
- Runtime 不可用时 fallback 清楚可见。
- 验证通过后提交推送。

### 第 7 轮：Runtime status surface

目标：

- 显示当前 node、visible choices、visible step count、provider、pending action、Runtime error。
- 显示 query provider 来源：mock / recorded / internal / delegate unavailable。
- 保持状态面板轻量，不抢主写作视图。

产出：

- Runtime status model / presenter / UI。
- 审计文档 `docs/self-hosted-editor-p5-runtime-status-audit.md`。

验收：

- session status 不泄露不该常驻的大 payload。
- 状态来自 Runtime payload，不重算。
- 验证通过后提交推送。

### 第 8 轮：Log / Backlog surface

目标：

- 显示 Runtime `logEntries`。
- 支持从 log item 跳到源文本。
- 支持空状态、Runtime unavailable 状态。
- 不显示条件隐藏文本。

产出：

- Log / Backlog UI first cut。
- model / smoke 覆盖 source jump 和 hidden text absence。
- 审计文档 `docs/self-hosted-editor-p5-log-backlog-audit.md`。

验收：

- Log 不重新执行脚本。
- Log 不进入 formal Runtime State。
- 验证通过后提交推送。

### 第 9 轮：Branch receipt / condition explanation

目标：

- 显示 branch query receipts。
- 对条件选项和条件跳转给出解释：query、arguments、result、source kind、context。
- 支持从 receipt 跳回相关 node / line。

产出：

- Receipt / condition explanation UI。
- contract smoke。
- 审计文档 `docs/self-hosted-editor-p5-branch-receipt-audit.md`。

验收：

- 不实现完整 Trace Replay。
- 不重新查询宿主来解释历史分支。
- 验证通过后提交推送。

### 第 10 轮：Substate preview save/load

目标：

- 提供导出 / 导入 / validate `inscape.runtime-substate` 的测试入口。
- 显示 compatible / migratable / incompatible。
- 支持从 compatible substate 恢复 preview session。

产出：

- Substate authoring model / UI / smoke。
- 审计文档 `docs/self-hosted-editor-p5-substate-authoring-audit.md`。

验收：

- 明确这不是完整游戏存档产品。
- incompatible / migratable 不静默修复。
- 验证通过后提交推送。

### 第 11 轮：Error / empty / stale state hardening

目标：

- 收口 Runtime authoring 的错误、空、过期状态。
- 覆盖 schema missing、bridge missing、query missing、action handler missing、Runtime CLI failure、HTTP failure、session stale、script drift。
- 错误信息 bounded，不泄露大 payload。

产出：

- Error-state contract / smoke。
- 审计文档 `docs/self-hosted-editor-p5-error-state-audit.md`。

验收：

- hosted payload contract error 不被 offline fallback 掩盖。
- 用户能知道下一步该修 schema、bridge、query、action 还是脚本。
- 验证通过后提交推送。

### 第 12 轮：P5 integration smoke + docs closure

目标：

- 串起 P5 最小作者工作流：
  - 打开项目。
  - 设置 mock query。
  - Runtime Preview 显示条件选项。
  - 触发 `fire` action。
  - 触发 `wait` 或 `handoff` pending。
  - 用 UI resume。
  - 查看 Log。
  - 查看 branch receipt explanation。
  - 导出 / 导入 / validate substate。
- 更新 README / handoff / TODO。

产出：

- `docs/self-hosted-editor-p5-integration-audit.md`
- P5 integration smoke。

验收：

- 至少一个自动化 smoke 覆盖完整 P5 authoring path。
- 可见 UI 改动有 browser 或 GUI smoke 证据。
- 验证通过后提交推送。

### 第 13-15 轮：缓冲修复

只能用于：

- 修第 1-12 轮发现的失败项。
- 补 tests / smoke / docs。
- 修 UI 状态、payload 兼容、session stale、substate 边界。
- 修 VSCode / SelfHostedEditor parity 或 structure guard。
- 修 push / packaging / desktop transport 的非产品范围阻塞。

不能用于：

- 开始 Unity / Host SDK。
- 开始完整 Rollback / Trace Replay / Flashback。
- 开始 Presentation IR。
- 开始完整独立游戏存档产品。
- 重新设计 Host Schema action policy。
- 做大规模视觉换皮。

每个缓冲轮也必须验证通过后提交推送。

### 第 16 轮：最终验证与 P5 PASS / FAIL

目标：

- 跑最终验证矩阵。
- 更新 P5 final validation report、handoff、TODO、README。
- 输出 P5 PASS / FAIL。
- 若 PASS，明确下一候选只能由用户再批准，不自动扩成 Unity / Rollback / Presentation IR。

产出：

- `docs/self-hosted-editor-p5-final-validation-report.md`

最终验证建议：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

最终边界扫描：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

最终通过后：

```powershell
tools\CommitAndPushInscape.cmd "docs: finalize p5 runtime authoring validation"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

## 7. P5 PASS 标准

P5 PASS 必须同时满足：

- SelfHostedEditor 有 Runtime authoring contract 和审计文档。
- Mock query authoring 可从 Host Schema 生成，并能驱动 Runtime Preview。
- Action capability / pending / resume authoring surface 可用。
- Runtime-backed Preview 可覆盖 P4 关键动作，并显示 pending / error / stale 状态。
- Log / Backlog surface 可显示 Runtime log entries，并支持源跳转。
- Branch receipt / condition explanation 可解释选项和条件跳转。
- Substate export / import / validate 测试入口可用。
- Runtime unavailable / schema missing / bridge missing / query missing / action missing / script drift 都有清晰状态。
- P5 integration smoke 覆盖最小作者调试路径。
- SelfHostedEditor 没有复制 Runtime condition evaluator / query evaluator / action dispatcher。
- `Internal` 未引入 Unity / Bird / Addressables 依赖。
- 未新增 rollback / replay / timeout / failure policy 字段作为 Host Schema 第一版能力。
- 最终验证矩阵通过。
- 每轮已按要求提交并推送。
- `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md` 与实际状态一致。

## 8. 最终报告模板

第 16 轮最终报告使用：

```text
P5 SelfHostedEditor Runtime authoring / productization: PASS | FAIL

Completed:
- ...

Validation:
- command: PASS | FAIL

Per-round push audit:
- Round 1: commit ..., pushed YES | NO
- ...

Architecture checks:
- Runtime semantics remain in Internal/Runtime: YES | NO
- SelfHostedEditor remains adapter / presenter / UI: YES | NO
- Host Schema / Host Bridge / Usage separation preserved: YES | NO
- Mock query remains authoring-only: YES | NO
- Substate remains child blob, not full host save: YES | NO
- No Unity / Bird dependency in Internal: YES | NO

Deferred:
- Unity / Host SDK
- Full Rollback
- Full Trace Replay
- Flashback Playback
- Presentation IR
- Full independent Inscape save product
- Host Schema action policy expansion

Next candidate:
- Requires user decision after P5 PASS.
```
