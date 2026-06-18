# P5 Round 10 Substate Preview Save/Load Goal 模式执行指南

日期：2026-06-19

状态：P5 Round 10 开发指令文档；2026-06-19 已执行并完成 Round 10 PASS

适用范围：P5 SelfHostedEditor Runtime authoring / productization 的第 10 轮。目标是在 SelfHostedEditor 中提供 `inscape.runtime-substate` 的导出、导入、validate 与 preview 恢复测试入口，让作者能把 P4 Runtime 子状态作为编辑器预览 / 调试 artifact 使用。它不是完整宿主存档系统，不保存宿主业务状态，不实现 Rollback / Trace Replay / Flashback。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在最多 3 轮会话内完成 P5 Round 10 Substate preview save/load：基于 P4 已通过的 `inscape.runtime-substate`、`runtime-project --export-substate`、`--validate-substate` 与 `--substate` 能力，把 SelfHostedEditor 推进到可导出当前 Runtime preview 子状态、导入 / validate 用户提供的 substate、显示 compatible / migratable / incompatible / error 状态，并且只在 compatible 时恢复 Runtime Preview session。实现 Substate authoring model / UI / transport payload / smoke / 文档审计。不实现完整 host save，不保存宿主业务状态、完整 Log、完整 action history、Rollback stack 或 Trace Replay，不在 SelfHostedEditor 前端复制 Runtime substate import / export / validation 语义。

轮数约束：

- 总上限：3 轮会话。
- 第 1 轮：主实现轮，完成 model / bridge / UI / 基础 smoke 的可运行闭环。
- 第 2 轮：修复与补强轮，只补缺陷、错误态、smoke、文档和桌面 / HTTP 等价边界。
- 第 3 轮：最终验收轮，跑完整 Round 10 验证矩阵，写审计文档，更新 handoff / TODO，提交并推送。
- 如果第 1 轮已经完整满足 PASS 标准，可以直接执行最终验收并收口，不强行消耗剩余轮次。
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
5. `docs/self-hosted-editor-p5-branch-receipt-audit.md`
6. `docs/runtime-playable-mvp-contract.md`
7. `docs/self-hosted-editor-p4-substate-audit.md`
8. `docs/self-hosted-editor-p4-cli-runtime-audit.md`
9. `src/Internal/Runtime/README.md`
10. `src/ExternalSupport/SelfHostedEditor/README.md`

代码侧优先读：

- `src/Internal/Runtime/StoryRuntime/Models/NarrativeRuntimeSubstateModel.cs`
- `src/Internal/Runtime/StoryRuntime/Domains/NarrativeRuntime.cs`
- `src/Internal/Cli/Inscape.Cli/Commands/CliStoryGraphCommand.cs`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Runtime`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js`
- `src/ExternalSupport/SelfHostedEditor/Scripts/Backend`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorPayloadBridge.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/StartSelfHostedEditorPreview.js`
- `src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts`
- `tests/Internal/Inscape.Tests/Runtime/TestNarrativeRuntime.cs`
- `tests/Internal/Inscape.Tests/P4/TestP4IntegrationSmoke.cs`

## 2. 本轮要完成什么

Round 10 只把已有 Runtime substate 能力产品化为 SelfHostedEditor authoring workflow。

必须完成：

- Substate authoring model：
  - 从 Runtime envelope / current preview session / imported artifact 生成 bounded model。
  - 显示 `format`、`formatVersion`、`runtimeVersion`、`scriptVersion`、current node、command index、flow stack depth、pending action 摘要、branch receipt count、host checkpoint 是否存在。
  - 显示 validate 结果：`compatible`、`migratable`、`incompatible`、`unavailable`、`error`。
  - 不显示完整 substate body、完整 Log、完整 action request history、host payload 或 workspace text。

- Substate UI：
  - 在 SelfHostedEditor Host view 增加 Runtime Substate panel。
  - 支持导出当前 preview substate，至少提供可复制 / 可保存的 JSON artifact 路径或文本。
  - 支持粘贴或选择用户提供的 `inscape.runtime-substate` JSON 并 validate。
  - 只有 compatible substate 可以触发导入并恢复 Runtime Preview session。
  - migratable / incompatible 必须显示清楚原因，不允许静默修复或猜位置。
  - Runtime unavailable / empty session / pending action / script drift / malformed JSON 都要有明确状态。

- Transport / bridge：
  - 复用 Runtime / CLI 的 substate import / export / validate 语义。
  - 如果新增 backend command，先定义 shared payload shape，再分别接 dev-host HTTP 与 desktop thin transport。
  - Renderer 只通过 backend service / command / transport 使用能力，不直接访问 `/api/*`、Node、Electron 或 arbitrary IPC。
  - dev-host 与 desktop command 的业务边界保持等价；如果 desktop 当前仍 unavailable，UI 必须显式显示 provider / unavailable 状态，不伪装实现。

- Runtime Preview 恢复：
  - compatible substate 导入后，Preview session 应恢复到 substate 的 current node / command index / pending action 等 Runtime 返回状态。
  - 导入 substate 不应重新 dispatch 已完成 action。
  - 导入 substate 后 Log / Branch Receipts / Runtime Status surface 应跟随最新 Runtime envelope 刷新。

- Smoke / docs：
  - 增加或扩展 model / payload / runtime HTTP / workbench integration smoke。
  - 更新 `src/ExternalSupport/SelfHostedEditor/README.md`。
  - 输出审计文档 `docs/self-hosted-editor-p5-substate-authoring-audit.md`。
  - 更新 `docs/agent-handoff.md` 与 `docs/todo.md`。

## 3. 本轮不做什么

明确不做：

- 不做完整 host save / load 产品。
- 不把 `inscape.runtime-substate` 当作完整游戏存档。
- 不保存宿主业务状态，例如背包、任务、好感度、战斗、服务器状态。
- 不保存完整 Log、完整 action request history、Rollback stack 或 Trace Replay。
- 不实现 Rollback、Trace Replay、Flashback Playback。
- 不扩张 Host Schema 第一版 action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不让 SelfHostedEditor 前端重写 Runtime substate import / export / validate 语义。
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

- 当前改动能否用 P4 最小 fixture 解释：`has_item("silver_key")`、`trust("mira")`、`play_timeline`、`wait_for_ui`、pending substate、resume 后继续？
- 失败时能否定位到 CLI / Runtime / server / transport / payload / client / UI 哪一层？
- substate export / import / validate 是否覆盖 compatible、migratable、incompatible、malformed JSON、Runtime unavailable？
- compatible substate 导入后，Preview、Runtime Status、Log / Backlog、Branch Receipts 是否刷新到同一 Runtime envelope？
- 导入 substate 是否证明不会重新 dispatch 已完成 action？
- pending substate 是否显示 pending action 摘要，并且不会被当作普通 completed state？
- 可见 UI 是否文字不重叠、按钮状态清楚、错误提示 bounded？

每轮架构自检：

- Runtime substate import / export / validate 语义是否仍归 `Internal/Runtime` 与 CLI？
- SelfHostedEditor 是否只做桥接、presenter、UI 和 authoring workflow？
- Substate 是否仍是 Inscape narrative 子状态 blob，而不是完整宿主存档？
- Formal Runtime State、P4 substate、Log、branch receipts、action request history 是否仍分层清楚？
- Host Schema / Host Bridge / Usage Manifest 是否没有因为 substate UI 被扩张？
- ExternalSupport 是否没有复制 condition evaluator、query evaluator、action dispatcher、substate validator 或 Runtime Inspector 产品语义？
- Editor backend 是否仍通过窄 service / command / transport 工作，没有暴露 generic RPC 或任意 Node / Electron 能力给 renderer？
- 是否没有把 Unity / Host SDK、Rollback / Trace / Flashback、Presentation IR 混入 Round 10？

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

若改动可见 UI，必须补一个可重复 UI 验证入口：

- 优先新增或更新 `check:*` / `smoke:*` 自动化。
- 必要时启动 SelfHostedEditor dev host 并用浏览器检查关键视图。
- 不要只靠静态检查宣布 UI 完成。

## 5. 每轮通过后提交推送工作流

每轮只有在 Debug 自检、架构自检和本轮验证全部通过后，才能提交推送。

推荐命令：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
tools\CommitAndPushInscape.cmd "p5: add runtime substate authoring surface"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 只提交 Round 10 相关文件。
- 不提交 unrelated untracked docs。
- 不提交生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。
- 推送失败时，不允许进入下一轮。
- 推送成功后，在本轮回复中写明 commit hash、远端分支和下一轮目标。

## 6. 分轮安排

### 第 1 轮：Substate model / bridge / UI first cut

目标：

- 定义 Substate authoring model。
- 建立 export / validate / import 的 shared payload shape。
- 接入 dev-host Runtime path 或 backend service。
- 增加 Runtime Substate panel first cut。
- compatible import 能恢复 Runtime Preview session。

产出：

- Substate model / controller / UI。
- payload bridge 或 runtime bridge contract check。
- model smoke 覆盖 compatible / unavailable / malformed / incompatible 基础状态。

验收：

- UI 不展示完整 substate body 以外的敏感大 payload。
- 不复制 Runtime substate validator。
- 通过本轮相关验证后提交推送。

### 第 2 轮：Error states / workbench / smoke hardening

目标：

- 补齐 migratable / incompatible / script drift / pending substate / import failure。
- Workbench 在 import / restore 后同步刷新 Preview、Runtime Status、Log / Backlog、Branch Receipts。
- HTTP smoke 覆盖 export / validate / import / restore。
- 如涉及 desktop command，补齐 preload whitelist 和 boundary check。

产出：

- workbench integration smoke。
- runtime HTTP smoke。
- README 更新。

验收：

- incompatible / migratable 不静默修复。
- imported pending substate 不重新 dispatch 已完成 action。
- Runtime unavailable 或 desktop unavailable 不被 fallback 掩盖。
- 通过本轮相关验证后提交推送。

### 第 3 轮：Round 10 final validation / docs closure

目标：

- 跑完整 Round 10 验证矩阵。
- 写 `docs/self-hosted-editor-p5-substate-authoring-audit.md`。
- 更新 `docs/agent-handoff.md`、`docs/todo.md` 和必要 README。
- 做边界扫描。
- 提交并推送。

最终边界扫描：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

验收：

- 审计文档记录实现、边界自检、验证命令和后续进入 Round 11。
- 验证通过后提交推送。

## 7. PASS 标准

P5 Round 10 PASS 必须同时满足：

- SelfHostedEditor 有 Runtime Substate authoring surface。
- 当前 Runtime preview session 可导出 `inscape.runtime-substate` 测试 artifact。
- 用户提供的 substate 可 validate，并显示 compatible / migratable / incompatible / error。
- 只有 compatible substate 可导入恢复 Runtime Preview session。
- 导入 substate 后 Preview / Runtime Status / Log / Branch Receipts 同步刷新。
- pending substate 可被识别并显示 pending action 摘要。
- incompatible / migratable / script drift 不静默修复。
- Substate 仍不包含宿主业务状态、完整 Log、完整 action history、Rollback stack 或 Trace Replay。
- SelfHostedEditor 未复制 Runtime substate validator、condition evaluator、query evaluator 或 action dispatcher。
- dev-host HTTP 与 desktop command 边界清楚；未实现的 desktop Runtime path 必须显式 unavailable。
- `docs/self-hosted-editor-p5-substate-authoring-audit.md`、`docs/agent-handoff.md`、`docs/todo.md` 与实际状态一致。
- 本轮验证矩阵通过，提交并推送成功。

## 8. 最终报告模板

第 3 轮最终报告使用：

```text
P5 Round 10 Substate preview save/load: PASS | FAIL

Completed:
- ...

Debug self-check:
- export / import / validate covered: YES | NO
- compatible / migratable / incompatible / malformed / unavailable covered: YES | NO
- Preview / Status / Log / Receipts refresh after import: YES | NO
- imported substate does not redispatch completed action: YES | NO

Architecture checks:
- Runtime substate semantics remain in Internal/Runtime / CLI: YES | NO
- SelfHostedEditor remains adapter / presenter / UI: YES | NO
- Substate remains narrative child blob, not full host save: YES | NO
- No Host Schema policy expansion: YES | NO
- No Unity / Bird / Rollback / Trace / Flashback scope creep: YES | NO

Validation:
- command: PASS | FAIL

Commit / push:
- commit: <hash>
- push: PASS | FAIL

Deferred:
- P5 Round 11 Error / empty / stale state hardening
- Full host save
- Full Rollback
- Full Trace Replay
- Flashback Playback
- Unity / Host SDK
```
