# Host Integration Partner Readiness Goal 模式执行指南

日期：2026-06-21

状态：给执行者使用的 Host Integration Partner Readiness 开发指令文档

适用范围：P5 SelfHostedEditor Runtime authoring / productization 已通过 final validation，用户已批准 `Host Integration Partner Readiness` 作为下一短阶段。本阶段只做 contract / fixture / report / planning，不接入 Sinan Runtime，不做 Runtime Preview Bridge，不引入 hard dependency。

轮数预算：

- 总上限：6 轮会话。
- 主工作：第 1-4 轮。
- 缓冲 / 收口：第 5 轮。
- Final validation：第 6 轮。
- 如果第 5 轮没有消耗缓冲修复，应用于 static artifact smoke hardening、docs closure 和 POC-1 checklist 收口。
- 如果第 6 轮仍未通过 final validation，不得自行扩轮进入新范围；只允许报告 blocked / fail、列出缺口和建议新 goal。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在最多 6 轮会话内完成 `Host Integration Partner Readiness`：基于 P5 final validation PASS、Post-P5 decision brief、Sinan cooperation decision brief 和现有 Host Schema / Host Bridge / Usage Manifest / Host Integration Audit 能力，把 Inscape 的外部宿主静态集成契约整理成可被 partner 项目消费、dry-run、对账和诊断的最小 readiness package。必须输出 integration package contract、Narrative Graph IR external contract、source location external contract、localization anchor export contract、Host Bridge candidate contract、5-7 个 static artifact fixtures、POC-1 acceptance checklist 和 final validation report。Sinan 只能作为第一个 partner profile / fixture，不得成为 Inscape core dependency。每轮必须 Debug 自检、架构自检、运行相关验证；验证通过后提交并推送，记录 commit hash 和 push 结果，才能进入下一轮。

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

每轮开始先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `docs/README.md`
4. `docs/self-hosted-editor-p5-final-validation-report.md`
5. `docs/post-p5-next-direction-decision-brief.md`
6. `docs/sinan-cooperation/README.md`
7. `docs/sinan-cooperation/host-integration-partner-readiness-decision-brief-2026-06-21.md`
8. `docs/sinan-cooperation/host-integration-partner-readiness-business-response-2026-06-21.md`
9. `docs/host-schema.md`
10. `docs/host-bridge-contract.md`
11. `docs/usage-manifest-contract.md`
12. `docs/condition-syntax-contract.md`
13. `docs/runtime-unity.md`

按轮次补读：

- Round 1：`docs/self-hosted-editor-p5-integration-audit.md`、`docs/self-hosted-editor-p5-runtime-authoring-contract.md`
- Round 2：`docs/cli-command-reference.md`、现有 project IR / source map 相关文档
- Round 3：`docs/l10n-extraction.md`、`docs/hash-localization.md`、stable node / line-map 相关文档
- Round 4：`docs/unity-host-bridge-preparation-plan.md`、`docs/project-config.md`
- Round 5-6：本阶段新增 contract、fixtures、audit 和 report

不要全量阅读无关历史文档；如果需要补读，说明原因和读取目标。

## 2. 本阶段要完成什么

本阶段必须完成：

- 定义 `Inscape Integration Package Contract`。
- 定义 `Narrative Graph IR External Contract`。
- 定义 `Source Location External Contract`。
- 定义 `Localization Anchor Export Contract`。
- 定义 `Host Bridge Candidate Contract`。
- 准备 5-7 个 static artifact fixtures，至少覆盖：
  - minimal dialogue
  - branching
  - localization
  - missing speaker
  - unknown action
  - unsupported feature
  - source diagnostic
- 输出 `Sinan Static Artifact POC Planning Note`。
- 输出 POC-1 acceptance checklist。
- 建立最小 static artifact smoke / audit，证明 artifact deterministic、diffable、diagnostics 可回源。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`、`docs/sinan-cooperation/README.md`。
- 输出 final validation report，明确 PASS / FAIL。

建议产物命名：

- `docs/host-integration-package-contract.md`
- `docs/narrative-graph-ir-external-contract.md`
- `docs/source-location-external-contract.md`
- `docs/localization-anchor-export-contract.md`
- `docs/host-bridge-candidate-contract.md`
- `docs/host-integration-partner-readiness-fixtures.md`
- `docs/sinan-cooperation/sinan-static-artifact-poc-planning-note.md`
- `docs/host-integration-partner-readiness-final-validation-report.md`

如果实现 smoke / fixture 需要新增代码，优先放在 `src/Internal/Tooling`、`tests/Internal` 或现有 DevScripts / smoke 体系；不得把 Sinan runtime 代码放入 `src/Internal`。

## 3. 本阶段不做什么

明确不做：

- 不接入 Sinan Runtime。
- 不做 Runtime Preview Bridge。
- 不做 live preview、runtime state sync、bidirectional edit。
- 不直接写 Sinan `data/**/*.json`。
- 不生成 Sinan 正式业务 data。
- 不做 Sinan 专用 DSL 语法。
- 不让 `Inscape.Compiler` 依赖 Sinan。
- 不让 `Internal/Runtime` 依赖 Sinan TypeScript runtime。
- 不把 Sinan Director / World / Timeline / Camera / Runtime UI 语义写入 Inscape core。
- 不把 Sinan catalog 直接等同为 Inscape Host Schema truth。
- 不新增 Host Schema action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不实现 Unity / Host SDK、Rollback、Trace Replay、Flashback、Presentation IR、完整 host save。
- 不提交 unrelated untracked docs、生成物、`dist/`、`node_modules/`、log 文件或临时 workspace。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

如果存在与本阶段无关的未跟踪文件，不要纳入提交。当前仓库已知可能存在旧的 untracked `docs/*.md`，除非用户明确要求，不要改动、删除或提交。

每轮先声明：

```text
本轮只做：
- ...

本轮不做：
- ...
```

每轮 Debug 自检：

- 当前改动能否用本轮最小 fixture 或最小 partner workflow 解释？
- 失败是否能定位到具体层：Compiler、Tooling、CLI、Host Schema、Host Bridge、Usage Manifest、Host Integration Audit、fixture、report、docs？
- success / failure / empty / incompatible / unsupported 状态是否有表达？
- artifact 是否 deterministic / diffable？
- diagnostics / report 是否能回到 `.inscape` source location？
- 是否避免把 Sinan dry-run、Host Bridge candidate、generated candidate 混成同一个东西？
- 是否明确记录本轮是否消耗缓冲轮？

每轮架构自检：

- `Inscape.Compiler` 是否仍是 compiler truth，且不依赖 Sinan？
- `Internal/Runtime` 是否仍是 Runtime 语义真相，且没有复制 Sinan execution semantics？
- Host Schema、Host Bridge、Usage Manifest、Host Integration Audit、Runtime State 是否仍分层清楚？
- Host Schema 是否仍是 authoring capability contract，而不是 Engine API 或 Sinan catalog 复制品？
- Host Bridge candidate 是否只是候选 / review / mapping evidence，不写 host data？
- ExternalSupport / partner profile 是否没有成为 core truth？
- 是否没有把后置方向混入本阶段？

本阶段推荐验证：

```powershell
git diff --check
rg -n "Host Integration Partner Readiness|host-integration-partner-readiness|Sinan Runtime Integration|Runtime Preview Bridge|Hard Dependency|Sinan-specific Core Semantics" docs\agent-handoff.md docs\todo.md docs\README.md docs\sinan-cooperation\README.md
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
```

`rg` 边界扫描无命中时会返回 exit code 1；这在边界扫描里应解释为 PASS。

若本轮只改文档：

```powershell
git diff --check
```

若本轮改了 Tooling / CLI / tests：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

若本轮改了 VSCode 或 SelfHostedEditor capability / payload：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

## 5. 每轮通过后提交推送工作流

每轮只有在 Debug 自检、架构自检和本轮相关验证全部通过后，才能提交推送。

优先使用选择性 stage，避免把无关 untracked 文件带入提交：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
git -c safe.directory=D:/LabProjects/Inscape add <本轮相关文件>
git -c safe.directory=D:/LabProjects/Inscape diff --cached --stat
git -c safe.directory=D:/LabProjects/Inscape diff --cached --check
git -c safe.directory=D:/LabProjects/Inscape commit -m "<message>"
git -c safe.directory=D:/LabProjects/Inscape push
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交规则：

- 每轮一个小提交，提交信息建议：
  - `docs: define host integration package contract`
  - `docs: define external graph source localization contracts`
  - `docs: define host bridge candidate readiness`
  - `test: add host integration artifact fixtures`
  - `docs: finalize host integration partner readiness`
- 不使用会全量 stage 的脚本，除非确认工作区没有无关 untracked 文件。
- 推送失败时，不允许宣布本轮完成。
- 每轮总结必须记录 commit hash 和 push 结果。

## 6. 分轮安排

### 第 1 轮：Baseline Audit / Artifact Inventory

目标：

- 审计现有 Host Schema / Host Bridge / Usage Manifest / Host Integration Audit / Narrative Graph IR / localization anchors 的已有输出。
- 明确 readiness package 的 artifact inventory。
- 输出本阶段 baseline audit。

建议产出：

- `docs/host-integration-partner-readiness-baseline-audit.md`
- `docs/host-integration-package-contract.md` 初稿
- 入口文档记录本阶段已启动

本轮 PASS：

- 能列出 POC-1 所需 artifact、当前已有命令、缺口和不做项。
- 明确 Sinan 只是 partner profile / fixture。
- 边界扫描通过。
- 验证通过、提交并推送。

### 第 2 轮：Integration Package + Narrative Graph IR External Contract

目标：

- 收口 integration package 的最小目录 / manifest / artifact 组合。
- 明确 Narrative Graph IR external contract：外部 importer 可依赖字段、不得依赖字段、版本和兼容规则。
- 明确 source graph 与 source location 的连接点，为 Round 3 source contract 做准备。

建议产出：

- `docs/host-integration-package-contract.md`
- `docs/narrative-graph-ir-external-contract.md`
- 必要的 fixture / schema 草案

本轮 PASS：

- Contract 不把所有信息塞进一个巨型文件。
- External Graph IR 只暴露稳定字段，不承诺 internal implementation detail。
- 不改 Compiler 语义，除非只是补测试 / fixture 证明现有输出。
- 验证通过、提交并推送。

### 第 3 轮：Source Location + Localization Anchor Export Contract

目标：

- 定义 source location external contract，保证 diagnostics / dry-run report 可回到 `.inscape` 源文件与范围。
- 定义 localization anchor export contract，说明 anchor / CSV / anchor map / source map / line identity 的关系。
- 明确 partner importer 不直接解析 `.inscape` 源文本。

建议产出：

- `docs/source-location-external-contract.md`
- `docs/localization-anchor-export-contract.md`
- 对应 fixture 或 sample report

本轮 PASS：

- 每类 report / diagnostic 都有回源方式。
- localization contract 不为 Sinan 改通用 CSV truth。
- 不新增 Sinan-specific localization 字段到 core contract。
- 验证通过、提交并推送。

### 第 4 轮：Host Bridge Candidate Contract + Static Artifact Fixtures

目标：

- 定义 Host Bridge candidate contract：candidate mapping、confidence、conflict、manual review、generated ownership、是否写 host data。
- 准备 5-7 个 static artifact fixtures。
- 明确 Sinan catalog 到 Host Schema / Host Bridge candidate 的 projection 边界。

建议产出：

- `docs/host-bridge-candidate-contract.md`
- `docs/host-integration-partner-readiness-fixtures.md`
- `samples` / `tests` / `docs` 下的 static artifact fixtures，位置需符合现有项目习惯

本轮 PASS：

- Host Bridge candidate 只是候选和审查证据，不写 host data。
- fixture 覆盖 minimal dialogue、branching、localization、missing speaker、unknown action、unsupported feature、source diagnostic。
- 不新增 Sinan-only Host Schema action policy。
- 验证通过、提交并推送。

### 第 5 轮：Static Artifact Smoke / POC Planning / Buffer

目标：

- 建立或收口最小 static artifact smoke / audit。
- 输出 Sinan Static Artifact POC Planning Note 和 POC-1 acceptance checklist。
- 如果前 4 轮有小缺口，本轮作为唯一缓冲轮修复；不得扩范围。

建议产出：

- `docs/sinan-cooperation/sinan-static-artifact-poc-planning-note.md`
- `docs/host-integration-partner-readiness-poc-1-checklist.md`
- smoke / audit fixture 输出，或 docs-only smoke 说明

本轮 PASS：

- POC-1 成功标准明确：不改正式 host data、不引入 hard dependency、report deterministic / diffable、diagnostics 可回源。
- 若消耗缓冲轮，记录原因和修复范围。
- 不进入 POC-2 / generated candidate / runtime bridge。
- 验证通过、提交并推送。

### 第 6 轮：Final Validation / Docs Closure

目标：

- 对本阶段全部产物做 final validation。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`、`docs/sinan-cooperation/README.md`。
- 输出 PASS / FAIL final validation report。

建议产出：

- `docs/host-integration-partner-readiness-final-validation-report.md`
- 入口文档同步

本轮 PASS：

- Final report 明确结论：`Host Integration Partner Readiness: PASS` 或 `FAIL`。
- 验证矩阵全部通过。
- 边界扫描通过：`src/Internal` 无 Sinan dependency，Host Schema 无 forbidden policy field。
- 提交并推送成功。

## 7. PASS 标准

本阶段 PASS 必须同时满足：

- `docs/host-integration-package-contract.md` 存在并定义 integration package 最小 artifact 组合。
- `docs/narrative-graph-ir-external-contract.md` 存在并定义外部 importer 可依赖字段。
- `docs/source-location-external-contract.md` 存在并定义 report / diagnostic 回源方式。
- `docs/localization-anchor-export-contract.md` 存在并定义 anchor / CSV / anchor map / source map 关系。
- `docs/host-bridge-candidate-contract.md` 存在并定义 candidate / confidence / conflict / manual review / generated ownership。
- static artifact fixtures 覆盖 5-7 个必需场景。
- `docs/sinan-cooperation/sinan-static-artifact-poc-planning-note.md` 存在。
- POC-1 acceptance checklist 存在。
- final validation report 存在并给出 PASS / FAIL。
- `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`、`docs/sinan-cooperation/README.md` 已同步。
- 没有实现 Sinan Runtime Integration、Runtime Preview Bridge、hard dependency 或 Sinan-specific core semantics。
- 没有把 Sinan catalog 读入 `Inscape.Compiler`。
- 没有让 `Internal/Runtime` 复制 Sinan execution semantics。
- 没有新增 forbidden Host Schema action policy 字段。
- 每轮验证通过、提交并推送成功。

## 8. 最终报告模板

`docs/host-integration-partner-readiness-final-validation-report.md` 建议使用：

```text
# Host Integration Partner Readiness Final Validation Report

日期：2026-..-..

结论：
- Host Integration Partner Readiness: PASS / FAIL

范围回顾：
- 本阶段只做 contract / fixture / report / planning。
- Sinan 只作为 partner profile / fixture。

交付物：
- Integration Package Contract:
- Narrative Graph IR External Contract:
- Source Location External Contract:
- Localization Anchor Export Contract:
- Host Bridge Candidate Contract:
- Static Artifact Fixtures:
- Sinan Static Artifact POC Planning Note:
- POC-1 Acceptance Checklist:

验证矩阵：
- git diff --check:
- build / tests:
- docs / link scan:
- boundary scan:
- static artifact smoke:

边界扫描：
- src/Internal Sinan dependency:
- Compiler reads Sinan catalog:
- Runtime copies Sinan semantics:
- forbidden Host Schema policy fields:
- runtime integration / preview bridge:

缓冲轮消耗：
- 是否消耗：
- 原因：
- 修复范围：

残留风险：
- ...

后续建议：
- POC-1 handoff:
- POC-2 前置条件:
- 仍 HOLD 的方向:
```
