# P5 Final Validation / PASS-FAIL Goal 模式执行指南

日期：2026-06-20

状态：给执行者使用的 P5 最终验收指令文档

适用范围：P5 SelfHostedEditor Runtime authoring / productization 的最终验收与 PASS / FAIL 收口。目标是复核 Round 1-12 的功能、文档、验证矩阵、架构边界和接力入口，输出 `docs/self-hosted-editor-p5-final-validation-report.md`。它不是新的功能开发轮，不实现完整 host save，不进入 Unity / Bird / Host SDK，不实现 Rollback / Trace Replay / Flashback，不扩张 Host Schema action policy。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在最多 2 轮会话内完成 P5 SelfHostedEditor Runtime authoring / productization final validation / PASS-FAIL 收口：基于 P5 Round 12 已验收的 integration smoke，完整复核 P5 主指南、P5 Runtime authoring contract、Round 1-12 审计文档、SelfHostedEditor README、handoff / TODO / README 入口和当前代码验证矩阵。运行最终验证命令与边界扫描，确认 Mock Query、Runtime-backed Preview、Action pending / resume、Runtime Status、Log / Backlog、Branch Receipts、Runtime Substate、Runtime States inventory 与 `check:runtime-authoring-integration` 均保持通过。输出 `docs/self-hosted-editor-p5-final-validation-report.md`，明确 `P5 SelfHostedEditor Runtime authoring / productization: PASS | FAIL`。如果 PASS，更新 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`，并说明下一候选方向必须由用户重新批准；如果发现阻塞缺陷，不得宣布 PASS，应停止并建议进入 P5 Round 13-15 缓冲修复。

轮数约束：

- 总上限：2 轮会话。
- 第 1 轮：最终验收矩阵、边界扫描、P5 PASS 标准逐项核对。
- 第 2 轮：最终报告与入口文档收口；只允许做报告、索引、handoff / TODO / README 的文档同步，以及第一轮发现的非行为性文档错漏修正。
- 本阶段没有实现缓冲轮；如果需要修产品行为、Runtime bridge、UI surface、payload contract 或 smoke，应停止 final validation，并明确进入 P5 Round 13-15 buffer fix。
- 如果第 1 轮已经完整满足 PASS 标准，可以直接写最终报告并收口，不强行消耗第 2 轮。
- 如果同一阻塞连续 2 轮无法推进，标记 goal 为 blocked，并说明阻塞点、已尝试动作和需要的人类决策。

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

- 验证失败：不得宣布 P5 PASS，不得提交 PASS 报告，不得进入下一阶段。
- 验证通过但提交失败：不得进入下一轮或下一阶段。
- 提交成功但推送失败：不得进入下一轮或下一阶段。
- 推送成功：记录 commit hash 和远端分支，然后进入下一轮或结束 final validation。

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
17. `docs/self-hosted-editor-p5-integration-audit.md`
18. `src/ExternalSupport/SelfHostedEditor/README.md`

代码侧优先读：

- `src/ExternalSupport/SelfHostedEditor/package.json`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeAuthoringIntegrationSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeHttpSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorWorkbenchIntegrationHttpSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorModelContractSuite.js`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Runtime`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Preview`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Host`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Backend`
- `src/ExternalSupport/VSCode/package.json`

## 2. 本阶段要完成什么

必须完成：

- P5 PASS 标准逐项核对：
  - Runtime authoring contract 和审计文档是否齐全。
  - Mock Query 是否从 Host Schema 生成，并能驱动 Runtime Preview。
  - Runtime Actions 是否展示 capability、pending、resume/debug 状态。
  - Runtime-backed Preview 是否覆盖 P4 关键动作，并显式显示 pending / error / stale / unavailable。
  - Runtime Status 是否展示 provider、current node、visible choices、pending action、Runtime error 与 query provider 来源。
  - Log / Backlog 是否只展示 Runtime log entries bounded 摘要，并支持 source jump。
  - Branch Receipts 是否只展示 Runtime receipts，不重新查询 host。
  - Runtime Substate 是否能 export / validate / compatible import，并阻断 migratable / incompatible import。
  - Runtime States inventory 是否聚合七个 authoring surface 的 ready / empty / unavailable / error / stale / blocked 状态。
  - `check:runtime-authoring-integration` 是否串起最小作者调试路径。

- 最终验证报告：
  - 输出 `docs/self-hosted-editor-p5-final-validation-report.md`。
  - 报告必须包含 PASS / FAIL 结论、验证矩阵、边界扫描、Round 1-12 审计索引、已知非阻塞问题、若 PASS 的下一候选方向约束。
  - 如果 PASS，明确下一候选方向必须由用户批准，不能自动扩张到 Unity / Host SDK、Rollback / Trace Replay / Flashback、Presentation IR 或完整独立存档产品。
  - 如果 FAIL，明确失败命令、失败层级、建议进入哪个 P5 Round 13-15 缓冲修复，不得伪造 PASS。

- 文档入口同步：
  - 更新 `docs/agent-handoff.md` 当前快照。
  - 更新 `docs/todo.md` P5 状态。
  - 更新 `docs/README.md` 快速入口 / 阅读入口。
  - 如发现 `src/ExternalSupport/SelfHostedEditor/README.md` 的 P5 smoke 描述落后，只做最小文档同步。

## 3. 本阶段不做什么

明确不做：

- 不新增 P5 功能 surface。
- 不修大规模 UI，不换视觉系统。
- 不实现完整 host save / load 产品。
- 不实现 Rollback。
- 不实现 Trace Replay。
- 不实现 Flashback Playback。
- 不进入 Unity / Bird / Host SDK。
- 不新增 Host Schema action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不让 SelfHostedEditor 前端重写 Runtime condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder。
- 不修改 Compiler 条件语义、Runtime evaluator、query provider 或 action dispatcher，除非 final validation 暴露阻塞缺陷；这种情况应停止 final validation，并转入 P5 Round 13-15 buffer fix。
- 不提交 unrelated untracked docs、生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

如果工作区存在与 final validation 无关的未跟踪文件或修改，不要纳入提交。当前仓库可能有外部合作草稿类未跟踪文档，除非用户明确要求，不要改动、不要删除、不要提交。

每轮必须先声明边界：

```text
本轮只做：
- ...

本轮不做：
- ...
```

每轮 Debug 自检：

- 当前验证能否覆盖 P5 最小作者工作流：mock query -> Runtime Preview -> fire action -> wait/handoff pending -> debug resume -> log -> branch receipt -> substate -> Runtime States？
- 失败时能否定位到 Runtime / CLI / server / transport / payload / client / UI / docs 哪一层？
- success、failure、empty、stale、blocked、unavailable 状态是否在已有 smoke / model / audit 中有证据？
- hosted payload contract error 是否不会被 offline fallback 掩盖？
- final validation report 是否只总结已验证事实，而不是补写未实现能力？
- 如果发现缺陷，是文档错漏、测试缺口，还是产品行为缺陷？产品行为缺陷必须转入 buffer fix。

每轮架构自检：

- Runtime / CLI 是否仍是 Runtime state、condition、query、action、substate、log 与 branch receipt 的语义真相？
- SelfHostedEditor 是否只做 bridge、presenter、UI、authoring workflow 和 smoke 编排？
- Host Schema / Host Bridge / Usage Manifest / Runtime State 是否仍分层清楚？
- ExternalSupport 是否没有复制 condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder？
- Editor backend 是否仍通过窄 service / command / transport 工作，没有暴露 generic RPC 或任意 Node / Electron 能力给 renderer？
- 是否没有把 Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR、完整 host save 或新 phase 规划混入 P5 final validation？

最终验证矩阵：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-authoring-integration
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

若 final validation touched Electron / preload / desktop command whitelist，补跑：

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

`rg` 无命中时会返回 exit code 1；本阶段按“无输出即边界扫描通过”解释，但必须在报告中说明。

## 5. 每轮通过后提交推送工作流

每轮只有在 Debug 自检、架构自检和本轮相关验证全部通过后，才能提交推送。

推荐命令：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
tools\CommitAndPushInscape.cmd "docs: finalize p5 runtime authoring validation"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 只提交 P5 final validation 相关文档和必要的最小 README / handoff / TODO 同步。
- 不提交 unrelated untracked docs。
- 不提交生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。
- 推送失败时，不允许宣布 final validation complete。

## 6. 分轮安排

### 第 1 轮：Final validation matrix / PASS 标准核对

目标：

- 跑最终验证矩阵和边界扫描。
- 对照 P5 主指南的 PASS 标准逐项核对。
- 确认 Round 12 integration audit 没有留下必须进入 Round 13-15 的阻塞缺陷。

建议产出：

- 验证命令结果记录。
- PASS 标准核对清单。
- 如果全过，开始撰写 `docs/self-hosted-editor-p5-final-validation-report.md`。

本轮 PASS：

- 最终验证矩阵通过。
- 边界扫描无命中。
- 没有产品行为阻塞缺陷。
- 若已经完成报告和入口同步，可直接提交推送并结束。

### 第 2 轮：Final report / docs closure

目标：

- 完成 `docs/self-hosted-editor-p5-final-validation-report.md`。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`。
- 必要时同步 `src/ExternalSupport/SelfHostedEditor/README.md`。
- 重新跑文档检查和必要验证，提交推送。

建议产出：

- `docs/self-hosted-editor-p5-final-validation-report.md`
- 入口文档同步
- 最终 commit / push

本轮 PASS：

- P5 final validation report 明确 PASS / FAIL。
- 若 PASS，入口文档不再说 P5 仍待 final validation；若 FAIL，入口文档明确进入 P5 Round 13-15 buffer fix。
- 验证通过、提交并推送。

## 7. PASS 标准

P5 final validation PASS 必须同时满足：

- P5 Round 1-12 审计文档齐全，并能串起完整演进。
- Runtime authoring contract 与实现一致。
- Mock Query authoring 可从 Host Schema 生成，并能驱动 Runtime Preview。
- Runtime Actions surface 能展示 action capability、pending request、resume/debug 状态。
- Runtime-backed Preview 覆盖 P4 关键动作，并显示 pending / error / stale / unavailable 状态。
- Runtime Status surface 显示 provider、current node、visible choices、pending action、Runtime error 与 query provider 来源。
- Log / Backlog surface 只展示 Runtime log entries bounded 摘要，不写入 formal Runtime State。
- Branch Receipts surface 只展示 Runtime receipts，不重新查询 host。
- Runtime Substate export / validate / compatible import 可用，并阻断 migratable / incompatible import。
- Runtime States inventory 聚合七个 authoring surface 的 ready / empty / unavailable / error / stale / blocked 状态。
- `check:runtime-authoring-integration` 覆盖最小作者调试路径。
- 最终验证矩阵通过。
- 边界扫描确认 `Internal` 未引入 Unity / Bird / Addressables 依赖。
- 未新增 rollback / replay / timeout / failure policy 字段作为 Host Schema 第一版能力。
- SelfHostedEditor 没有复制 Runtime condition evaluator / query evaluator / action dispatcher / substate validator / Log builder。
- `docs/self-hosted-editor-p5-final-validation-report.md` 存在，并与 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md` 状态一致。
- 每轮已按要求提交并推送。

如果任一项不满足：

- 不得宣布 P5 PASS。
- 记录 FAIL / BLOCKED 证据。
- 若缺陷需要实现修复，建议进入 P5 Round 13-15 buffer fix，并等待用户确认或下一份 GoalNext 指南。

## 8. 最终报告模板

`docs/self-hosted-editor-p5-final-validation-report.md` 建议使用：

```text
# SelfHostedEditor P5 Final Validation Report

日期：2026-06-20

结论：
- P5 SelfHostedEditor Runtime authoring / productization: PASS | FAIL

范围：
- 本报告只验收 P5 Runtime authoring / productization。
- 不宣布 Unity / Host SDK、Rollback / Trace Replay / Flashback、Presentation IR 或完整 host save 进入开发。

已完成能力：
- Runtime authoring contract:
- Mock Query:
- Runtime-backed Preview:
- Runtime Actions:
- Runtime Status:
- Log / Backlog:
- Branch Receipts:
- Runtime Substate:
- Runtime States:
- Integration smoke:

验证矩阵：
- `dotnet build Inscape.slnx --no-restore`: PASS | FAIL
- ...

边界扫描：
- Internal Unity / Bird dependency scan: PASS | FAIL
- Deferred policy scan: PASS | FAIL
- ExternalSupport Runtime semantics duplication scan: PASS | FAIL

Round 1-12 审计索引：
- Round 1:
- ...
- Round 12:

已知非阻塞问题：
- ...

最终判断：
- PASS: ...
- 或 FAIL: ...

下一步：
- 若 PASS：下一候选方向必须由用户批准，不自动进入 Unity / Host SDK、Rollback / Trace Replay / Flashback、Presentation IR 或完整 host save。
- 若 FAIL：进入 P5 Round 13-15 buffer fix，目标是 ...
```
