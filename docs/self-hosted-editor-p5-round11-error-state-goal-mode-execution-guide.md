# P5 Round 11 Error / Empty / Stale State Goal 模式执行指南

日期：2026-06-20

状态：给执行者使用的 P5 Round 11 开发指令文档

适用范围：P5 SelfHostedEditor Runtime authoring / productization 的第 11 轮。目标是收口 Runtime authoring workflow 中的错误态、空态、过期态和 payload contract error，让作者能明确知道问题发生在 schema、bridge、query、action、Runtime CLI、HTTP / desktop transport、session stale、script drift 还是 malformed payload。它不是 P5 最终 integration smoke，不实现完整 host save，不实现 Rollback / Trace Replay / Flashback，也不扩张 Host Schema action policy。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在最多 3 轮会话内完成 P5 Round 11 Error / empty / stale state hardening：基于 P5 Round 10 已通过的 Runtime Substate authoring、Runtime-backed Preview、Runtime Status、Log / Backlog、Branch Receipts、Mock Query 与 Action authoring surfaces，统一收口 Runtime authoring 的 error / empty / stale 状态表达。覆盖 Runtime unavailable、Runtime CLI / backend command failure、HTTP / desktop transport failure、Host Schema missing、Host Bridge handler missing、query missing / unknown / type mismatch、action handler missing / unsupported mode、pending blocked、session stale、script drift / incompatible substate 与 payload contract error。错误文本必须 bounded、可定位、不泄露 workspace text / host payload / Runtime snapshot body。不得用 offline fallback 掩盖 hosted payload contract error，不得复制 Runtime evaluator、query evaluator、action dispatcher 或 substate validator。

轮数约束：

- 总上限：3 轮会话。
- 第 1 轮：error-state contract / model inventory 主实现轮。
- 第 2 轮：UI / transport / smoke hardening 轮。
- 第 3 轮：最终验证与文档收口轮。
- 如果第 1 轮已经完整满足 PASS 标准，可以直接进入最终验收并收口，不强行消耗剩余轮次。
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
3. `docs/self-hosted-editor-p5-goal-mode-execution-guide.md`
4. `docs/self-hosted-editor-p5-runtime-authoring-contract.md`
5. `docs/self-hosted-editor-p5-substate-authoring-audit.md`
6. `docs/self-hosted-editor-p5-runtime-preview-audit.md`
7. `docs/self-hosted-editor-p5-runtime-status-audit.md`
8. `docs/self-hosted-editor-p5-log-backlog-audit.md`
9. `docs/self-hosted-editor-p5-branch-receipt-audit.md`
10. `docs/self-hosted-editor-p5-action-authoring-audit.md`
11. `docs/self-hosted-editor-p5-mock-query-ui-audit.md`
12. `src/ExternalSupport/SelfHostedEditor/README.md`

代码侧优先读：

- `src/ExternalSupport/SelfHostedEditor/Scripts/Runtime`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Preview`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorAppEntry.js`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Backend`
- `src/ExternalSupport/SelfHostedEditor/Desktop`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorPayloadBridge.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeSmoke.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeHttpSmoke.js`

## 2. 本轮要完成什么

Round 11 只收口 Runtime authoring surfaces 的状态表达和错误定位。

必须完成：

- Error-state inventory：
  - 列出现有 Runtime authoring surfaces：Preview、Runtime Status、Mock Query、Runtime Actions、Log / Backlog、Branch Receipts、Runtime Substate。
  - 为每个 surface 确认 ready、empty、unavailable、error、stale 或 blocked 的可见状态。
  - 确认每种状态来自 Runtime / backend / payload envelope，而不是前端重算 Runtime 语义。

- Bounded diagnostic contract：
  - 错误信息包含可定位字段：layer、code、short message、surface、suggested fix category。
  - suggested fix category 至少区分：schema、bridge、query、action、runtime-cli、transport、session、script、payload。
  - 不回传 workspace text、host payload body、mock value table、完整 Runtime snapshot、完整 substate body、完整 Log、完整 action history。

- 覆盖状态：
  - Runtime unavailable。
  - Runtime CLI / backend command failure。
  - HTTP / desktop transport failure。
  - Host Schema missing。
  - Host Bridge handler missing。
  - Query missing / unknown / type mismatch。
  - Action handler missing / unsupported mode。
  - Pending blocked。
  - Session stale / workspace revision mismatch。
  - Script drift / incompatible substate。
  - Payload contract error / malformed shared payload。
  - Empty Runtime snapshot / empty Log / empty Branch Receipts / empty Substate artifact。

- UI hardening：
  - 每个 Runtime authoring surface 的 error / empty / stale 文案清楚、短、可定位。
  - hosted payload contract error 不得被 offline fallback 盖掉。
  - Runtime unavailable 可以 fallback 到 compiler / draft view，但必须显式标注 provider，不伪装 Runtime ready。
  - pending blocked 必须说明当前被哪个 action / request 阻断。

- Smoke / docs：
  - 增加或扩展 model / runtime / runtime-http / workbench integration smoke。
  - 更新 `src/ExternalSupport/SelfHostedEditor/README.md`。
  - 输出审计文档 `docs/self-hosted-editor-p5-error-state-audit.md`。
  - 更新 `docs/agent-handoff.md` 与 `docs/todo.md`。

## 3. 本轮不做什么

明确不做：

- 不做 P5 Round 12 integration smoke。
- 不做完整 host save / load 产品。
- 不实现完整 Rollback。
- 不实现完整 Trace Replay。
- 不实现 Flashback Playback。
- 不扩张 Host Schema 第一版 action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不让 SelfHostedEditor 前端重写 Runtime condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder。
- 不修改 Compiler 条件语义、Runtime evaluator、query provider 或 action dispatcher，除非发现阻塞性 bug 且有最小测试证明。
- 不碰 Unity / Bird / Host SDK。
- 不做大规模视觉换皮。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
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

- 当前改动能否用 P5 最小 authoring fixture 解释：mock query、action pending / resume、Runtime Preview、Log、Branch Receipts、Substate？
- 失败时能否定位到 CLI / Runtime / server / transport / payload / client / UI 哪一层？
- 是否覆盖 ready / empty / unavailable / error / stale / blocked 中本轮涉及的状态？
- hosted payload contract error 是否不会被 offline fallback 掩盖？
- 错误文本是否 bounded，且没有泄露 workspace text、host payload body、Runtime snapshot body、mock value table 或完整 substate？
- 如果 UI changed，是否补了 repeatable model / smoke 验证，而不是只靠人工观察？

每轮架构自检：

- Runtime / CLI 是否仍是 Runtime state、condition、query、action、substate 的语义真相？
- SelfHostedEditor 是否只做 bridge、presenter、UI 和 authoring workflow？
- Host Schema / Host Bridge / Usage Manifest / Runtime State 是否仍分层清楚？
- ExternalSupport 是否没有复制 condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder？
- Editor backend 是否仍通过窄 service / command / transport 工作，没有暴露 generic RPC 或任意 Node / Electron 能力给 renderer？
- 是否没有把 Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR 或 Round 12 integration scope 混入 Round 11？

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
tools\CommitAndPushInscape.cmd "p5: harden runtime authoring error states"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 只提交 Round 11 相关文件。
- 不提交 unrelated untracked docs。
- 不提交生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。
- 推送失败时，不允许进入下一轮。
- 推送成功后，在本轮回复中写明 commit hash、远端分支和下一轮目标。

## 6. 分轮安排

### 第 1 轮：Error-state contract / model inventory

目标：

- 审计 Preview、Runtime Status、Mock Query、Runtime Actions、Log / Backlog、Branch Receipts、Runtime Substate 的状态模型。
- 定义或收敛 bounded diagnostic shape。
- 补 model contract，覆盖 ready / empty / unavailable / error / stale / blocked 中缺失的状态。

产出：

- Error-state model / presenter contract。
- `check:model` 覆盖新增状态。
- 必要的 README draft note。

验收：

- 状态能定位到 schema / bridge / query / action / runtime-cli / transport / session / script / payload。
- 不泄露大 payload。
- 验证通过后提交推送。

### 第 2 轮：UI / transport / smoke hardening

目标：

- 把状态 contract 接入 Workbench / Runtime panels / Preview。
- 覆盖 Runtime CLI failure、HTTP failure、desktop unavailable、payload contract error。
- 补 direct runtime smoke、HTTP smoke、workbench integration smoke。

产出：

- UI state hardening。
- Runtime direct / HTTP / Workbench smoke。
- Electron boundary / IPC / workspace smoke，如改动 desktop command surface。

验收：

- hosted payload contract error 不被 offline fallback 掩盖。
- Runtime unavailable fallback 必须显式标注 provider。
- 用户能知道下一步该修 schema、bridge、query、action、script、session 还是 transport。
- 验证通过后提交推送。

### 第 3 轮：Round 11 final validation / docs closure

目标：

- 跑完整 Round 11 验证矩阵。
- 写 `docs/self-hosted-editor-p5-error-state-audit.md`。
- 更新 `docs/agent-handoff.md`、`docs/todo.md` 和必要 README。
- 做边界扫描。
- 提交并推送。

验收：

- 审计文档记录实现、边界自检、验证命令和后续进入 Round 12。
- 文档入口不再说 Round 11 是下一轮；应明确 Round 11 complete，下一轮进入 Round 12 integration smoke + docs closure。
- 验证通过后提交推送。

## 7. PASS 标准

P5 Round 11 PASS 必须同时满足：

- Runtime authoring surfaces 有清楚的 ready / empty / unavailable / error / stale / blocked 状态。
- Runtime unavailable、Runtime CLI / backend command failure、HTTP / desktop transport failure 都有可见且 bounded 的错误状态。
- Host Schema missing、Host Bridge handler missing、query missing / unknown / type mismatch、action handler missing / unsupported mode 都能定位到对应修复类别。
- Pending blocked、session stale、script drift / incompatible substate、payload contract error 不被 fallback 掩盖。
- 错误文本不泄露 workspace text、host payload body、mock value table、完整 Runtime snapshot、完整 substate、完整 Log 或完整 action history。
- SelfHostedEditor 未复制 Runtime condition evaluator、query evaluator、action dispatcher、substate validator 或 Log builder。
- 未新增 rollback / replay / failure / timeout policy 字段。
- `docs/self-hosted-editor-p5-error-state-audit.md`、`docs/agent-handoff.md`、`docs/todo.md` 与实际状态一致。
- 本轮验证矩阵通过，提交并推送成功。

## 8. 最终报告模板

第 3 轮最终报告使用：

```text
P5 Round 11 Error / empty / stale state hardening: PASS | FAIL

Completed:
- ...

Debug self-check:
- ready / empty / unavailable / error / stale / blocked covered: YES | NO
- schema / bridge / query / action / runtime-cli / transport / session / script / payload categories covered: YES | NO
- payload contract errors are not hidden by fallback: YES | NO
- bounded diagnostics avoid secret payloads: YES | NO

Architecture checks:
- Runtime semantics remain in Internal/Runtime / CLI: YES | NO
- SelfHostedEditor remains adapter / presenter / UI: YES | NO
- Host Schema / Host Bridge / Usage / Runtime state separation preserved: YES | NO
- No Runtime evaluator / dispatcher / validator copied into ExternalSupport: YES | NO
- No Unity / Bird / Rollback / Trace / Flashback scope creep: YES | NO

Validation:
- command: PASS | FAIL

Commit / push:
- commit: <hash>
- push: PASS | FAIL

Deferred:
- P5 Round 12 integration smoke + docs closure
- Full host save
- Full Rollback
- Full Trace Replay
- Flashback Playback
- Unity / Host SDK
```
