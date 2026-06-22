# Host Integration Package CLI Goal 模式执行指南

状态：可执行指南

日期：2026-06-22

适用角色：开发者 AI / 执行者。本文可以直接交给对方阅读并进入 goal 模式执行。

## 直接 Goal Prompt

请在 `D:\LabProjects\Inscape` 进入 goal 模式，阅读本文和“必读上下文”，并在 **6 轮会话内** 完成 `Host Integration Package CLI` 阶段。

本阶段目标是把上一阶段已经确认的 Host Integration static artifacts 收成一个真实 CLI 导出入口：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project <workspace> -o <out-dir>
```

每轮必须先声明本轮边界，完成后做 Debug 自检、架构自检和验证。验证通过后才允许提交并推送，再进入下一轮。任何轮次都不得把本阶段扩成 Host Bridge candidate generator、generated apply、Sinan runtime 接入、Runtime Preview Bridge、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## 本阶段目标

把 `Host Integration Partner Readiness` 阶段产出的 contract / fixture / report / planning，推进成一个可由项目方试跑的静态 package 导出命令。

完成后，执行者应能对 `samples` 或临时 fixture workspace 运行 `export-host-integration-package-project`，得到一个确定性 package 目录。该目录至少包含：

```text
manifest.json
source/*.inscape
graph/project-ir.json
usage/usage.json
host/host-schema-capabilities.json
host/host-integration-audit.json
localization/l10n.csv
localization/anchor-map.json
source-map/source-locations.json
reports/readiness-report.json
```

`host/host-bridge-candidate.json` 在本阶段**不生成**。如果已有手写 / 外部 candidate artifact 被显式传入，最多只允许作为静态文件复制和 manifest 登记；不得实现自动候选生成、宿主 catalog 投影或写回。

## 必读上下文

先读这些文档，不要只看命令名猜实现：

1. [Agent 接手指南](agent-handoff.md)
2. [TODO](todo.md)
3. [文档索引](README.md)
4. [Host Integration Partner Readiness Final Validation Report](host-integration-partner-readiness-final-validation-report.md)
5. [Host Integration Package Contract](host-integration-package-contract.md)
6. [Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md)
7. [Source Location External Contract](source-location-external-contract.md)
8. [Localization Anchor Export Contract](localization-anchor-export-contract.md)
9. [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md)
10. [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md)
11. [Host Bridge Candidate Contract](host-bridge-candidate-contract.md)
12. [CLI 命令速查](cli-command-reference.md)
13. [项目配置草案](project-config.md)

然后再读相关代码：

```text
src/Internal/Cli/
src/Internal/Tooling/
tests/Internal/Inscape.Tests/
docs/host-integration-static-fixtures/
```

## 阶段边界

本阶段做：

- 新增 `export-host-integration-package-project <workspace> -o <out-dir>` CLI 命令，并接入 `commands` / `help`。
- 在 `Inscape.Tooling` 或现有 CLI shared domain 中实现 package assembly，不在 CLI 入口里堆业务语义。
- 复用现有 compiler / tooling 产物：project IR、usage manifest、Host Schema capability、Host Integration audit、localization extraction。
- 复制 `.inscape` 源文件到 package `source/`，并在 manifest / source-map 中只记录 package-relative path。
- 生成 `source-map/source-locations.json` 与 `localization/anchor-map.json` 的第一版可消费 artifact。
- 生成最小 `reports/readiness-report.json`：只评价本次 package assembly 的 artifact presence / parse / known static boundary，不做完整 partner readiness 智能判定。
- 新增或扩展测试 / smoke，保证 package 结构、JSON parse、路径归一化、determinism 和禁止范围不会回退。
- 更新 CLI 文档、TODO、handoff、README，并在完成阶段时输出 final validation report。

本阶段不做：

- 不做 Host Bridge candidate generator。
- 不做 generated apply，不写宿主数据，不改 Unity / Bird / Sinan 项目文件。
- 不做 Sinan Runtime Integration、Runtime Preview Bridge、Host SDK 或 Unity package。
- 不做完整 host save、Rollback、Trace Replay、Flashback Playback。
- 不做 Presentation IR。
- 不新增 Host Schema action policy 字段，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不把 Sinan / Bird / Unity 依赖引入 `src/Internal`。
- 不在 VSCode / SelfHostedEditor 中复制 package assembly 语义；宿主 UI 后续只能消费 shared output。

## 轮次预算

总预算：**6 轮会话**。

如果出现阻塞，只允许用第 5 轮 buffer 消化。第 6 轮必须用于 final validation / docs closure，不得继续扩功能。

### Round 1：Baseline / Command Contract

目标：

- 审计当前 CLI command 分发、Tooling 项目源加载、现有 artifact 输出入口。
- 明确 `export-host-integration-package-project` 的参数、错误码、输出目录覆盖策略、帮助文本。
- 输出 Round 1 审计文档，列出要复用的已有 domain 和不得复制的语义。

交付：

- 命令 contract / baseline audit 文档。
- 若改代码，只允许做命令入口 skeleton、help、commands、空实现错误或 dry-run guard。

自检重点：

- Debug：命令不存在 / 输出目录缺失 / workspace 不存在 / workspace 有诊断错误时的行为有没有写清楚。
- 架构：是否仍让 `Inscape.Compiler` 作为 compiler truth，是否避免在 CLI 入口重写 parser / graph 语义。

### Round 2：Package Domain / Manifest Writer

目标：

- 新增 package assembly domain、manifest model、artifact index writer、path normalization guard。
- 固定 manifest 的 package-relative path、artifact status、capability flags。
- 禁止绝对路径、`..` traversal、平台相关分隔符泄漏到 package artifact path。

交付：

- `manifest.json` writer。
- package path guard / deterministic ordering 测试。
- manifest 中明确：
  - `runtimeIntegration: false`
  - `previewBridge: false`
  - `writesHostData: false`
  - `containsHostDependency: false`

自检重点：

- Debug：重复运行到同一输出目录是否稳定，输出目录已存在时策略是否明确。
- 架构：manifest writer 是否是共享 domain，而不是 command handler 里的字符串拼接。

### Round 3：Existing Artifact Assembly

目标：

- 通过 shared domain 组装以下已有 artifact：
  - `graph/project-ir.json`
  - `usage/usage.json`
  - `host/host-schema-capabilities.json`
  - `host/host-integration-audit.json`
  - `localization/l10n.csv`
- 不通过“CLI 调 CLI”的方式实现；应复用现有 C# domain / presenter。

交付：

- 命令可对 `samples` 生成核心 artifact。
- 覆盖 JSON parse / CSV presence / artifact index 的测试或 smoke。

自检重点：

- Debug：缺失 Host Schema / Host Bridge / localization 时是否仍能生成明确 status，而不是崩成不明错误。
- 架构：有没有把 `inspect-*` 命令的输出格式当作内部唯一真相；正确做法是复用其下层 shared model / domain。

### Round 4：Source Copy / Source Map / Anchor Map / Minimal Report

目标：

- 复制 source `.inscape` 到 `source/`。
- 生成第一版 `source-map/source-locations.json`。
- 生成第一版 `localization/anchor-map.json`。
- 生成最小 `reports/readiness-report.json`，只报告 package artifact assembly 的 presence / shape / static boundary。

交付：

- source copy 和 source-map 测试。
- anchor-map 测试。
- readiness report 最小 smoke。

自检重点：

- Debug：source ref 是否可从 report / graph / localization 回到 package source path。
- 架构：readiness report 是否保持静态 package 视角，没有偷偷做 partner-specific import 判断。

### Round 5：Smoke Fixtures / Determinism / Docs

目标：

- 补 package CLI smoke，可对 `samples` 或专门临时 fixture workspace 生成 package，并校验 artifact parse / structure。
- 用 fixture 覆盖 missing speaker、unknown action、unsupported feature、diagnostic scenario 中至少一部分关键边界。
- 更新 CLI 命令速查和相关 docs。

交付：

- package CLI smoke script 或 Internal test。
- docs 更新。
- 如前四轮有小缺口，本轮只允许修复本阶段范围内的缺口。

自检重点：

- Debug：同一输入重复导出是否 byte-stable 或至少结构 /排序稳定；临时目录是否清理。
- 架构：smoke 是否验证禁止范围，尤其不是“生成了 package 就算过”。

### Round 6：Final Validation / PASS-FAIL Closure

目标：

- 全量验证本阶段。
- 输出 [Host Integration Package CLI Final Validation Report](host-integration-package-cli-final-validation-report.md)。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`。
- 明确下一阶段候选仍需用户批准，不能自动进入 Host Bridge Candidate Generator。

交付：

- final validation report。
- docs closure。
- 最终提交和推送。

自检重点：

- Debug：最终报告必须列出实际运行的命令、结果、失败项或未运行原因。
- 架构：确认本阶段没有越界进入 Host Bridge generator / generated apply / runtime / host save。

## 每轮固定工作流

每轮开始：

1. `git -c safe.directory=D:/LabProjects/Inscape status --short --branch`
2. 读取本文、`docs/agent-handoff.md`、`docs/todo.md` 和本轮相关 contract。
3. 用 3 到 6 行写明本轮只做什么、不做什么、验收门是什么。

每轮实现：

- 优先复用 `Inscape.Tooling` / CLI 现有 shared domain。
- `Inscape.Compiler` 只负责语义真相，不依赖 Tooling / CLI / VSCode / Unity / HTML。
- CLI 入口只做参数解析、调用 shared domain、打印 / 写文件、退出码映射。
- 所有 package path 使用 `/` 作为 artifact path 表示；文件系统写入可使用平台路径，但 manifest / report 不暴露平台绝对路径。
- 所有输出排序必须稳定。

每轮结束前必须写入执行记录，格式可放在当轮 audit 或 final report 中：

```text
Round N Self-Check
- Debug 自检：
  - 本轮最可能坏的 3 个点是什么？
  - 我如何验证它们？
  - 还有哪些失败场景没有覆盖，为什么可以留到下一轮？
- 架构自检：
  - 是否保持 Compiler truth？
  - 是否复用 Tooling shared domain？
  - 是否避免 VSCode / SelfHostedEditor 复制 package 语义？
  - 是否保持 Sinan / Unity / Bird 不进入 Internal？
  - 是否没有引入 forbidden deferred scope？
- 验证：
  - 命令：
  - 结果：
```

每轮提交 / 推送：

- 验证通过后才能提交。
- 提交后必须推送。
- 推送后再进入下一轮。
- 不要用 `git add .` 把旧的无关 untracked docs 混进提交；只 stage 本阶段文件。

## 验证矩阵

代码轮次默认运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help export-host-integration-package-project
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project samples -o artifacts\host-integration-package-smoke
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
git diff --check
```

如果新增 package smoke script，还要运行：

```powershell
node --check <new-smoke-script>
node <new-smoke-script>
```

文档-only 轮次至少运行：

```powershell
git diff --check
rg -n "host-integration-package-cli-goal-mode-execution-guide|export-host-integration-package-project|Host Integration Package CLI|6 轮" docs
```

边界扫描至少在 Round 5 和 Round 6 运行：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

说明：

- 对边界扫描而言，`rg` 无输出通常代表通过；报告中要明确写“无命中即 PASS”。
- 如果扫描命中历史文档，需要判断是否为既有说明文字还是本阶段新增越界；不能机械删除设计历史。

## PASS 标准

只有全部满足时，本阶段才可判定 PASS：

- CLI `commands` 和 `help` 能看到 `export-host-integration-package-project`。
- 命令能从项目 workspace 导出 package 到 `-o` 目录。
- package 至少包含目标结构中的 required artifacts。
- `manifest.json` 能 parse，artifact index 完整，路径为 package-relative，且不含绝对路径或 `..`。
- `graph/project-ir.json`、`usage/usage.json`、`host/host-schema-capabilities.json`、`host/host-integration-audit.json`、`source-map/source-locations.json`、`localization/anchor-map.json`、`reports/readiness-report.json` 均可 parse。
- `localization/l10n.csv` 存在且与当前 localization extraction contract 一致。
- source files 已复制到 `source/`，source refs 能回指 package source path。
- readiness report 明确 `writesHostData = false`，并没有声称完成 runtime / preview / host save。
- 测试 / smoke 覆盖 deterministic structure、missing optional artifact、diagnostic / unsupported scenario、path boundary。
- Round 6 final validation report 记录全部验证命令和结果。
- docs entry 已同步。
- 最终提交已推送。

## FAIL / Block 条件

遇到以下情况必须停下并报告，不要硬扩范围：

- 需要改变 Compiler IR 语义才能导出 package。
- 需要向 `src/Internal` 引入 Unity / Bird / Sinan / third-party host dependency。
- 需要实现 Host Bridge candidate generator 才能让 package 通过。
- 需要写宿主项目文件或生成 `data/**/*.json` / Unity `.asset`。
- 需要新增 Host Schema policy 字段才能解释回放 / 倒放 / timeout。
- package artifact 的 source path 只能用绝对路径表达，无法做到 package-relative。
- 现有 artifact domain 无法复用，必须大规模重写 Tooling 架构。

## 给验收者的验收方式

验收时优先看四件事：

1. 真实运行 `export-host-integration-package-project samples -o <temp>` 后 package 是否完整、可 parse、可重复。
2. manifest / report 是否诚实声明静态边界，尤其 `writesHostData = false`。
3. 代码是否把 package assembly 放在 shared Tooling / domain，而不是塞进 CLI 字符串脚本。
4. 边界扫描是否证明本阶段没有混入 Sinan runtime、Unity / Bird hard dependency、Host Bridge generator、generated apply 或 Host Schema policy 扩张。

## 下一阶段候选

本阶段 PASS 后，才可以讨论下一候选方向。按近期计划，最自然的下一候选是 `Readiness Report Generator`，但仍需用户重新批准。

不要在本阶段结束后自动进入：

- Host Bridge Candidate Generator
- Static Artifact POC-1 partner handoff
- POC-2 catalog projection
- Sinan Runtime Integration
- Runtime Preview Bridge
- Unity / Host SDK
- generated apply
