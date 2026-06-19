# P5 Round 12 Integration Smoke + Docs Closure Goal 模式执行指南

日期：2026-06-20

状态：给执行者使用的 P5 Round 12 开发指令文档

适用范围：P5 SelfHostedEditor Runtime authoring / productization 的第 12 轮。目标是把 Round 2-11 已完成的 Runtime authoring surfaces 串成一条可自动验证的最小作者调试工作流，并完成 P5 主线文档收口。它不是 P5 final validation，不实现完整 host save，不实现 Rollback / Trace Replay / Flashback，不进入 Unity / Bird / Host SDK，也不扩张 Host Schema action policy。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在最多 3 轮会话内完成 P5 Round 12 integration smoke + docs closure：基于 P5 Round 11 已通过的 Runtime States / error-state inventory，把 Runtime-backed Preview、Mock Query、Runtime Actions pending / resume、Runtime Status、Log / Backlog、Branch Receipts、Runtime Substate export / validate / import 与 Runtime States 总览串成一个端到端 smoke。最小路径必须覆盖设置 mock query、看到条件分支、触发 fire action、进入 wait 或 handoff pending、debug resume、继续推进、查看 log、查看 branch receipt、导出/校验/导入 substate，并在 Runtime States 总览中看到各 surface 的 bounded 状态。更新 README / handoff / TODO，并输出 `docs/self-hosted-editor-p5-integration-audit.md`。不得复制 Runtime evaluator、query evaluator、action dispatcher、substate validator 或 log builder；不得把 P5 扩成完整宿主存档、Rollback、Trace Replay、Flashback、Unity / Host SDK 或 Host Schema action policy。

轮数约束：

- 总上限：3 轮会话。
- 第 1 轮：integration smoke 现状审计 + 最小端到端 fixture / contract 设计与主实现。
- 第 2 轮：补齐 smoke 覆盖、UI / transport / stale / error 缺口和必要文档。
- 第 3 轮：Round 12 最终验证、审计文档与入口文档收口。
- Round 12 内部不设置额外缓冲轮；如果第 3 轮仍不能 PASS，应明确进入 P5 总计划的 Round 13-15 缓冲修复，而不是继续扩大 Round 12。
- 如果第 1 或第 2 轮已经完整满足 PASS 标准，可以直接进入最终验收并收口，不强行消耗剩余轮次。
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

推进规则：

- 验证失败：不得提交推送，不得进入下一轮。
- 验证通过但提交失败：不得进入下一轮。
- 提交成功但推送失败：不得进入下一轮。
- 推送成功：记录 commit hash 和远端分支，然后进入下一轮。

## 1. 必读上下文

每次接手前先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `docs/README.md`
4. `docs/self-hosted-editor-p5-goal-mode-execution-guide.md`
5. `docs/self-hosted-editor-p5-runtime-authoring-contract.md`
6. `docs/self-hosted-editor-p5-baseline-audit.md`
7. `docs/self-hosted-editor-p5-runtime-session-audit.md`
8. `docs/self-hosted-editor-p5-mock-query-model-audit.md`
9. `docs/self-hosted-editor-p5-mock-query-ui-audit.md`
10. `docs/self-hosted-editor-p5-action-authoring-audit.md`
11. `docs/self-hosted-editor-p5-runtime-preview-audit.md`
12. `docs/self-hosted-editor-p5-runtime-status-audit.md`
13. `docs/self-hosted-editor-p5-log-backlog-audit.md`
14. `docs/self-hosted-editor-p5-branch-receipt-audit.md`
15. `docs/self-hosted-editor-p5-substate-authoring-audit.md`
16. `docs/self-hosted-editor-p5-error-state-audit.md`
17. `src/ExternalSupport/SelfHostedEditor/README.md`

代码侧优先读：

- `src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorAppEntry.js`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Runtime`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Preview`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Host`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Backend`
- `src/ExternalSupport/SelfHostedEditor/Desktop`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeHttpSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorWorkbenchIntegrationHttpSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorSemanticParityHttpSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts`

## 2. 本轮要完成什么

Round 12 只做 P5 最小作者工作流的端到端 smoke 与文档收口。

必须完成：

- 自动化 integration smoke：
  - 打开 / 构建一个包含 Host Schema queries、Host Bridge action mapping、条件分支、`fire` action、`wait` 或 `handoff` action、log、branch receipt 和 substate 的最小 workspace。
  - 设置 session-only mock query，让 Runtime Preview 走到条件选项或条件跳转。
  - 触发 `fire` action，并能在 Runtime Actions surface 看到 request evidence。
  - 触发 `wait` 或 `handoff` pending，并能通过 debug resume 完成继续推进。
  - 推进后能在 Runtime Log / Backlog surface 看到 bounded log 摘要。
  - 能在 Branch Receipts surface 看到 branch-affecting query receipt 摘要。
  - 能导出当前 Runtime Preview substate，validate artifact，并在 compatible 时导入恢复 Preview。
  - 能在 Runtime States 总览中看到 Preview、Runtime Status、Mock Query、Runtime Actions、Log / Backlog、Branch Receipts、Runtime Substate 的 bounded surface state。

- 覆盖关键失败 / 空态：
  - Runtime unavailable 或 command failure 不能伪装为 Runtime ready。
  - hosted payload contract error 不能被 offline fallback 掩盖。
  - empty log、empty branch receipt、empty substate artifact、missing schema / bridge / handler 至少有一个可重复检查入口。
  - session stale / workspace revision mismatch 如果已由现有 surface 表达，smoke 要确认不会静默继续旧状态。

- 文档收口：
  - 输出 `docs/self-hosted-editor-p5-integration-audit.md`，记录 PASS/FAIL、覆盖路径、验证矩阵、边界扫描和已知非阻塞问题。
  - 更新 `docs/agent-handoff.md`，新增 P5 Round 12 快照，并说明下一步：
    - 如果 Round 12 PASS 且没有必须修复项，进入 P5 final validation / PASS-FAIL 收口。
    - 如果 Round 12 暴露阻塞缺陷，进入 P5 Round 13-15 缓冲修复。
  - 更新 `docs/todo.md`，把 Round 12 标为完成或记录未完成阻塞，并更新下一步。
  - 更新 `docs/README.md` 或相关索引，让后续 agent 能找到 Round 12 审计。
  - 更新 `src/ExternalSupport/SelfHostedEditor/README.md`，记录 Round 12 smoke 入口和 Runtime authoring workflow 覆盖范围。

## 3. 本轮不做什么

明确不做：

- 不做 P5 final validation / PASS-FAIL 报告；最终报告留给 P5 final validation。
- 不实现完整 host save / load 产品。
- 不实现完整 Rollback。
- 不实现完整 Trace Replay。
- 不实现 Flashback Playback。
- 不进入 Unity / Bird / Host SDK。
- 不新增 Host Schema action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不让 SelfHostedEditor 前端重写 Runtime condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder。
- 不修改 Compiler 条件语义、Runtime evaluator、query provider 或 action dispatcher，除非 smoke 暴露阻塞性 bug，且修复有最小测试证明。
- 不做大规模视觉换皮。
- 不提交 unrelated untracked docs、生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -8
```

如果工作区存在与本轮无关的未跟踪文件或修改，不要纳入提交。当前仓库可能有外部合作草稿类未跟踪文档，除非用户明确要求，不要改动、不要删除、不要提交。

每轮必须先声明边界：

```text
本轮只做：
- ...

本轮不做：
- ...
```

每轮 Debug 自检：

- 当前改动能否用 P5 最小作者工作流解释：mock query -> Runtime Preview -> action pending/resume -> log -> branch receipt -> substate -> Runtime States？
- 失败时能否定位到 Runtime / CLI / server / transport / payload / client / UI 哪一层？
- 是否覆盖 ready / empty / unavailable / error / stale / blocked 中本轮涉及的状态？
- hosted payload contract error 是否不会被 offline fallback 掩盖？
- substate export / validate / import 是否通过 Runtime CLI / backend command，而不是前端自造语义？
- 如果 UI changed，是否补了 repeatable model / smoke 验证，而不是只靠人工观察？
- smoke 是否足够小，失败时能快速知道是哪一个 surface 断了？

每轮架构自检：

- Runtime / CLI 是否仍是 Runtime state、condition、query、action、substate、log 和 branch receipt 的语义真相？
- SelfHostedEditor 是否只做 bridge、presenter、UI、authoring workflow 和 smoke 编排？
- Host Schema / Host Bridge / Usage Manifest / Runtime State 是否仍分层清楚？
- ExternalSupport 是否没有复制 condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder？
- Editor backend 是否仍通过窄 service / command / transport 工作，没有暴露 generic RPC 或任意 Node / Electron 能力给 renderer？
- 是否没有把 Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR、完整 host save 或 final validation scope 混入 Round 12？

每轮推荐验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
git diff --check
```

若改动 Electron / preload / desktop command whitelist，补跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace
```

最终边界扫描：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

## 5. 每轮通过后提交推送工作流

每轮只有在 Debug 自检、架构自检和本轮验证全部通过后，才能提交推送。

推荐命令：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
tools\CommitAndPushInscape.cmd "p5: add runtime authoring integration smoke"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 只提交 Round 12 相关代码、smoke 和文档。
- 不提交 unrelated untracked docs。
- 不提交生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。
- 推送失败时，不允许进入下一轮。

## 6. 分轮安排

### 第 1 轮：Integration smoke fixture / contract

目标：

- 读完必读上下文，确认 Round 11 PASS 证据和现有 smoke 覆盖。
- 设计并实现最小 P5 authoring integration smoke fixture。
- 先串起 mock query、Runtime Preview、action pending / resume、log、branch receipt、substate 和 Runtime States 的主成功路径。

建议产出：

- 新增或扩展一个自动化 smoke，例如 `SelfHostedEditorRuntimeAuthoringIntegrationSmoke.js`，并接入合适的 `npm` check。
- 复用现有 Runtime / HTTP / Workbench smoke 的 server、transport、payload bridge 和 fixtures，不重复造 runtime 语义。
- 初步更新 `src/ExternalSupport/SelfHostedEditor/README.md` 的 smoke 入口。

本轮 PASS：

- 主成功路径能自动跑通。
- 失败能定位到具体 surface / layer。
- 验证通过、提交并推送。

### 第 2 轮：Surface coverage / failure hardening

目标：

- 补齐第 1 轮没覆盖到的空态、错误态、stale / blocked 状态。
- 确认 Runtime States 总览能反映各 surface 状态，而不是只验证单点 panel。
- 修复 Round 12 smoke 暴露的最小真实缺口。

建议产出：

- 扩展 model / runtime-http / workbench integration checks。
- 补足 payload contract error、runtime unavailable、missing schema / bridge / handler、empty log / receipt / substate 的可重复断言。
- 若 UI 交互有变化，补可重复 smoke；必要时记录人工 browser / GUI smoke 步骤。

本轮 PASS：

- success、empty、unavailable、error、stale / blocked 中本轮相关状态有覆盖。
- bounded payload / secret absence 仍被守住。
- 验证通过、提交并推送。

### 第 3 轮：Final validation / docs closure

目标：

- 跑完整 Round 12 验证矩阵。
- 输出 `docs/self-hosted-editor-p5-integration-audit.md`。
- 更新 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md` 与 `src/ExternalSupport/SelfHostedEditor/README.md`。
- 明确下一步是 P5 final validation，还是消耗 P5 Round 13-15 缓冲修复。

建议产出：

- `docs/self-hosted-editor-p5-integration-audit.md`
- 文档入口同步
- 最终验证记录

本轮 PASS：

- 至少一个自动化 smoke 覆盖完整 P5 authoring path。
- 文档入口全部指向最新状态。
- 全部验证和边界扫描通过。
- 提交并推送。

## 7. Round 12 PASS 标准

P5 Round 12 PASS 必须同时满足：

- Runtime-backed Preview、Mock Query、Runtime Actions pending / resume、Runtime Status、Log / Backlog、Branch Receipts、Runtime Substate 与 Runtime States 总览被一条最小端到端 smoke 串起来。
- Smoke 覆盖至少一条条件分支路径、一条 action `fire` 路径、一条 pending + resume 路径、一条 log 路径、一条 branch receipt 路径和一条 substate export / validate / import 路径。
- Runtime States 总览能看到各 Runtime authoring surface 的 bounded 状态。
- hosted payload contract error 不被 offline fallback 掩盖。
- SelfHostedEditor 没有复制 Runtime evaluator、query evaluator、action dispatcher、substate validator 或 log builder。
- 没有把完整 host save、Rollback、Trace Replay、Flashback、Unity / Host SDK 或 Host Schema action policy 混入本轮。
- `docs/self-hosted-editor-p5-integration-audit.md` 存在并记录验证矩阵。
- `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md` 和 `src/ExternalSupport/SelfHostedEditor/README.md` 已同步。
- 验证矩阵和边界扫描通过。
- 提交和推送成功。

## 8. 最终报告模板

每轮结束时按这个格式汇报：

```text
P5 Round 12 Integration Smoke + Docs Closure

本轮：第 N / 3 轮
状态：PASS | FAIL | BLOCKED

本轮目标：
- ...

完成内容：
- ...

Debug 自检：
- P5 最小作者工作流是否跑通：
- 失败定位层：
- ready / empty / unavailable / error / stale / blocked 覆盖：
- payload / secret / fallback 边界：
- UI / smoke 证据：

架构自检：
- Runtime / CLI 语义真相：
- SelfHostedEditor bridge / presenter 边界：
- Host Schema / Host Bridge / Usage / Runtime State 分层：
- 未混入延期范围：
- 未提交 unrelated 文件：

验证：
- `...`: PASS / FAIL

提交推送：
- commit:
- push:

是否消耗缓冲轮：
- 否；Round 12 内无缓冲。
- 或：是；需要进入 P5 Round 13-15 缓冲，原因是 ...

下一步：
- ...
```

Round 12 最终收口时，`docs/self-hosted-editor-p5-integration-audit.md` 建议包含：

```text
SelfHostedEditor P5 Integration Audit

结论：
- PASS | FAIL

覆盖路径：
- mock query:
- runtime preview:
- fire action:
- wait / handoff pending:
- debug resume:
- log:
- branch receipt:
- substate export / validate / import:
- runtime states overview:

验证矩阵：
- ...

边界扫描：
- ...

未完成 / 非阻塞问题：
- ...

下一步：
- P5 final validation / PASS-FAIL
- 或 P5 Round 13-15 buffer fix: ...
```
