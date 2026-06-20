# Post-P5 Next Direction Decision Goal 模式执行指南

日期：2026-06-20

状态：给执行者使用的 Post-P5 下一候选方向决策指令文档

适用范围：P5 SelfHostedEditor Runtime authoring / productization 已通过 final validation 之后的方向选择门。目标是整理候选方向、评估风险和前置条件，输出给项目负责人决策的 brief。它不是新的研发 phase，不启动 Unity / Host SDK、Rollback / Trace Replay / Flashback、Presentation IR、完整 host save 或跨引擎实现。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在最多 2 轮会话内完成 Post-P5 下一候选方向决策门：基于 P5 final validation PASS、P3/P4/P5 的已完成能力、`open-questions.md`、`roadmap.md`、`runtime-unity.md` 与 `p3-runtime-language-discussion-memory.md`，整理下一步可选方向的决策 brief。候选至少覆盖 Unity / Host SDK 第一刀、高级运行时调试（有限 Rollback / Trace / recorded replay / Flashback）、Presentation IR / 跨引擎 / 独立 Runtime，以及更保守的 Host Bridge / Schema 自动化收口方向。输出 `docs/post-p5-next-direction-decision-brief.md`，说明每个方向的目标、收益、风险、前置条件、建议轮数、验证矩阵和必须延后的内容。不得启动任何候选方向的产品开发；不得修改 Runtime / Compiler / SelfHostedEditor 行为；不得把任何候选方向写成已批准 phase。完成后同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`，状态必须保持“等待用户批准下一候选方向”。

轮数约束：

- 总上限：2 轮会话。
- 第 1 轮：候选方向审计与资料整理。
- 第 2 轮：输出决策 brief、同步入口文档并验证。
- 如果第 1 轮已经完整完成 brief 和入口同步，可以直接提交推送，不强行消耗第 2 轮。
- 如果用户在执行中明确批准某个候选方向，停止本 goal，不要直接实现；应记录用户选择，并要求为该方向单独输出新的 goal-mode execution guide。
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

- 验证失败：不得提交推送，不得进入下一轮。
- 验证通过但提交失败：不得进入下一轮。
- 提交成功但推送失败：不得进入下一轮。
- 推送成功：记录 commit hash 和远端分支，然后进入下一轮或结束本决策门。

## 1. 必读上下文

每次接手前先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `docs/README.md`
4. `docs/self-hosted-editor-p5-final-validation-report.md`
5. `docs/self-hosted-editor-p5-integration-audit.md`
6. `docs/self-hosted-editor-p5-runtime-authoring-contract.md`
7. `docs/p3-runtime-language-discussion-memory.md`
8. `docs/runtime-unity.md`
9. `docs/open-questions.md`
10. `docs/roadmap.md`
11. `docs/host-schema.md`
12. `docs/host-bridge-contract.md`
13. `docs/usage-manifest-contract.md`
14. `docs/condition-syntax-contract.md`

按候选方向补读：

- Unity / Host SDK：`docs/bird-unity-research.md`、`docs/bird-adapter.md`、`docs/unity-editor-importer.md`、`docs/unity-sample-adapter.md`、`docs/project-config.md`
- 高级运行时调试：`docs/p3-runtime-language-discussion-memory.md` 的 Log / Rollback / Trace / Flashback 段、`docs/runtime-unity.md`
- Presentation IR / 跨引擎：`docs/roadmap.md`、`docs/editor-design.md`、`docs/dsl-ecosystem-positioning.md`
- Host Bridge / Schema 自动化：`docs/host-schema.md`、`docs/host-bridge-contract.md`、`docs/unity-host-bridge-preparation-plan.md`

## 2. 本阶段要完成什么

必须完成：

- 输出 `docs/post-p5-next-direction-decision-brief.md`。
- 至少评估四个候选方向：
  - Unity / Host SDK 第一刀。
  - 高级运行时调试：有限 Rollback、Trace / recorded replay、Flashback Playback。
  - Presentation IR / 跨引擎 / 独立 Inscape Runtime。
  - Host Bridge / Host Schema 自动化与代码生成收口。
- 对每个候选方向写清：
  - 目标和不目标。
  - 依赖的已有能力。
  - 主要收益。
  - 最大风险。
  - 最小第一刀范围。
  - 预计会话轮数。
  - 每轮验证矩阵草案。
  - 必须延后的内容。
  - 是否需要用户决策。
- 给出一个“推荐下一步”：
  - 推荐可以是单一方向，也可以是“先做方向 A 的 scoping，再做方向 B”。
  - 推荐必须写成建议，不得写成已批准 phase。
  - 如果证据不足，推荐应是“先补决策资料”，而不是启动研发。
- 同步入口文档：
  - `docs/agent-handoff.md`
  - `docs/todo.md`
  - `docs/README.md`

## 3. 本阶段不做什么

明确不做：

- 不启动 Unity / Host SDK 开发。
- 不实现 Rollback、Trace Replay、Flashback Playback。
- 不实现 Presentation IR、跨引擎 runtime 或独立 Inscape Runtime。
- 不实现完整 host save / load。
- 不新增 Host Schema action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不修改 Runtime / Compiler / Tooling / SelfHostedEditor 产品行为。
- 不修改 UnityPlugin / Bird importer 行为。
- 不把候选方向写入 TODO 为已批准 phase。
- 不提交 unrelated untracked docs、生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

如果工作区存在与本决策门无关的未跟踪文件或修改，不要纳入提交。当前仓库可能有外部合作草稿类未跟踪文档，除非用户明确要求，不要改动、不要删除、不要提交。

每轮必须先声明边界：

```text
本轮只做：
- ...

本轮不做：
- ...
```

每轮 Debug 自检：

- 当前 brief 是否能解释 P5 PASS 之后为什么不能自动进入新 phase？
- 每个候选方向的第一刀是否足够小，能独立验收？
- 是否把用户必须决策的问题列清楚，而不是替用户拍板？
- 是否能把候选方向失败风险定位到 Runtime、Host Schema、Host Bridge、Unity adapter、editor UI、文档或测试哪一层？
- 是否避免把 Log、Rollback、Trace Replay、Flashback 混成同一个功能？
- 是否避免把 Bird 项目细节回灌为 Inscape 通用规则？

每轮架构自检：

- `Inscape.Compiler` 是否仍保持宿主无关？
- `Internal/Runtime` 是否仍是 Runtime 语义真相？
- Host Schema / Host Bridge / Usage Manifest / Runtime State 是否仍分层清楚？
- ExternalSupport 是否没有复制 Runtime evaluator、query evaluator、action dispatcher、substate validator 或 Log builder？
- Unity / Bird 是否只作为 ExternalSupport / adapter 候选方向被讨论？
- 是否没有把后置方向写成已批准研发 phase？

本阶段推荐验证：

```powershell
git diff --check
rg -n "post-p5-next-direction-decision|Post-P5|下一候选方向" docs\agent-handoff.md docs\todo.md docs\README.md docs\post-p5-next-direction-decision-brief.md
```

如本阶段只改文档，不需要跑完整 build。若执行者误改代码，必须先说明原因，并补跑对应完整验证矩阵；若代码改动不是用户明确要求，应回退本轮方向并保持决策门为文档阶段。

## 5. 每轮通过后提交推送工作流

每轮只有在 Debug 自检、架构自检和本轮相关验证全部通过后，才能提交推送。

推荐命令：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
tools\CommitAndPushInscape.cmd "docs: prepare post-p5 direction decision"
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 只提交 Post-P5 direction decision 相关文档和必要入口同步。
- 不提交 unrelated untracked docs。
- 不提交生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。
- 推送失败时，不允许宣布本决策门完成。

## 6. 分轮安排

### 第 1 轮：候选方向审计

目标：

- 读取必读上下文。
- 整理 P5 已完成能力和仍后置的候选方向。
- 建立候选方向对比框架。

建议产出：

- `docs/post-p5-next-direction-decision-brief.md` 初稿。
- 候选方向表：目标、收益、风险、第一刀、轮数、验证。

本轮 PASS：

- 四个候选方向都已覆盖。
- 没有把任何候选写成已批准 phase。
- 文档验证通过、提交并推送。

### 第 2 轮：决策 brief 收口

目标：

- 完成 decision brief。
- 给出推荐下一步和用户决策问题清单。
- 同步 `agent-handoff.md`、`todo.md`、`README.md`。

建议产出：

- `docs/post-p5-next-direction-decision-brief.md`
- 入口文档同步

本轮 PASS：

- brief 可直接给项目负责人决策。
- 入口文档状态为“等待用户批准下一候选方向”。
- 验证通过、提交并推送。

## 7. PASS 标准

本决策门 PASS 必须同时满足：

- `docs/post-p5-next-direction-decision-brief.md` 存在。
- brief 至少覆盖 Unity / Host SDK、高级运行时调试、Presentation IR / 跨引擎 / 独立 Runtime、Host Bridge / Schema 自动化四个方向。
- 每个方向都有目标、不目标、收益、风险、第一刀范围、预计轮数、验证矩阵草案和延后项。
- brief 明确 P5 已 PASS，但下一候选方向尚未被用户批准。
- brief 给出推荐下一步和需要用户拍板的问题。
- `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md` 已同步。
- 没有修改 Runtime / Compiler / SelfHostedEditor / UnityPlugin 行为。
- `git diff --check` 通过。
- 提交和推送成功。

## 8. 最终报告模板

`docs/post-p5-next-direction-decision-brief.md` 建议使用：

```text
# Post-P5 Next Direction Decision Brief

日期：2026-06-20

结论：
- P5 已 PASS。
- 下一候选方向尚未批准。
- 推荐下一步：...

P5 已完成能力：
- ...

候选方向对比：

## A. Unity / Host SDK 第一刀
- 目标：
- 不目标：
- 收益：
- 风险：
- 最小第一刀：
- 预计轮数：
- 验证矩阵草案：
- 延后项：
- 需要用户决策：

## B. 高级运行时调试
...

## C. Presentation IR / 跨引擎 / 独立 Runtime
...

## D. Host Bridge / Schema 自动化
...

推荐：
- ...

需要用户拍板：
- ...

下一步：
- 用户批准一个方向后，再输出该方向的 goal-mode execution guide。
```
