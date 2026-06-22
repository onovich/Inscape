# Host Integration Static Artifact POC Partner Handoff Kit Goal 模式执行指南

日期：2026-06-22

状态：给执行者使用的 Static Artifact POC Partner Handoff Kit 开发指令文档

## 0. 直接给执行者的 Goal Prompt

请在 `D:\LabProjects\Inscape` 进入 goal 模式，阅读本文和“必读上下文”，并在 **4 轮会话内**完成 `Host Integration Static Artifact POC Partner Handoff Kit` 阶段。

本阶段已经由用户拍板：

- 方向：`Static Artifact POC Partner Handoff Kit`。
- 定位：把现有 Host Integration Package CLI 和 Readiness Report Generator 收成可交给外部合作方执行 dry-run 的 POC-1 交接套件。
- 策略：generic first，Sinan 只作为 partner profile / fixture / dry-run planning 例子。
- 不提交生成出来的 package artifact；仓库只提交文档、schema / fixture、smoke 和必要测试。
- Host Bridge Candidate 仍只能作为 review evidence；本阶段不做 candidate generator，不做 confirmed bridge，不做 generated apply。
- 不碰 Sinan / Unity / Bird 正式项目，不写任何宿主正式数据。

每轮必须先声明本轮边界，完成后做 Debug 自检、架构自检和验证。验证通过后才允许提交并推送，再进入下一轮。任何轮次都不得把本阶段扩成 Host Bridge Candidate Generator、POC-2 catalog projection、Runtime Preview Bridge、Sinan Runtime Integration、Unity / Host SDK、generated apply、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## 1. 必读上下文

先读项目入口和最近 PASS 证据：

1. [Agent 接手指南](agent-handoff.md)
2. [TODO](todo.md)
3. [文档索引](README.md)
4. [Host Integration Readiness Report Generator Final Validation Report](host-integration-readiness-report-generator-final-validation-report.md)
5. [Host Integration Package CLI Final Validation Report](host-integration-package-cli-final-validation-report.md)

再读 POC-1 已有契约：

1. [Host Integration Package Contract](host-integration-package-contract.md)
2. [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md)
3. [Host Bridge Candidate Contract](host-bridge-candidate-contract.md)
4. [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md)
5. [Host Integration Partner Readiness Fixtures](host-integration-partner-readiness-fixtures.md)
6. [Host Integration Partner Readiness POC-1 Checklist](host-integration-partner-readiness-poc-1-checklist.md)
7. [Sinan Static Artifact POC Planning Note](sinan-cooperation/sinan-static-artifact-poc-planning-note.md)
8. [CLI 命令速查](cli-command-reference.md)

相关代码 / fixture 入口：

```text
src/Internal/Cli/
src/Internal/Tooling/HostIntegrationPackage/
docs/host-integration-static-fixtures/
docs/sinan-cooperation/
tests/Internal/Inscape.Tests/
```

## 2. 本阶段要完成什么

本阶段交付一个面向外部合作方的静态 artifact POC-1 handoff kit：

- 新增 generic handoff kit 文档，说明合作方如何拿到 Inscape package、如何运行 readiness report、如何阅读 artifact、如何回传 dry-run evidence。
- 新增 partner feedback / dry-run report schema 文档或 fixture，定义外部合作方可以回传哪些字段、状态、source refs、diagnostics 和 open questions。
- 新增或扩展 smoke，验证 handoff kit 中的命令、package generation、readiness report regeneration、partner feedback fixture shape、no host writes 和 no generated candidate boundary。
- 新增一个最小 partner feedback fixture，优先 generic，可包含 Sinan profile 作为例子，但不能让 Sinan 字段进入 Inscape core truth。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md` 和必要的 Sinan cooperation index。
- 最后一轮输出 final validation report，明确 PASS / FAIL、验证矩阵、未进入范围和下一方向 gate。

建议新增文档路径：

```text
docs/host-integration-static-artifact-poc-partner-handoff-kit.md
docs/host-integration-static-artifact-poc-partner-feedback-schema.md
docs/host-integration-static-artifact-poc-partner-handoff-final-validation-report.md
```

建议新增 smoke / fixture 路径：

```text
docs/host-integration-static-fixtures/partner-feedback.generic.json
docs/host-integration-static-fixtures/PartnerHandoffKitSmoke.js
```

如果执行中发现已有路径更贴合现有命名，可以调整，但必须同步入口文档。

## 3. 本阶段不做什么

本阶段不做：

- 不做 Host Bridge Candidate Generator。
- 不生成 confirmed Host Bridge。
- 不做 generated apply。
- 不做 POC-2 catalog projection。
- 不要求或修改 Sinan catalog。
- 不写 Sinan / Unity / Bird 正式项目文件。
- 不提交生成出来的 package artifact、zip、临时 reports 或 `artifacts/` 内容。
- 不接 Sinan Runtime、不接 Runtime Preview Bridge、不做 Host SDK。
- 不做完整 host save、Rollback、Trace Replay、Flashback Playback。
- 不做 Presentation IR。
- 不新增 Host Schema action policy 字段，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不把 Sinan / Unity / Bird hard dependency 引入 `src/Internal`。
- 不在 VSCode / SelfHostedEditor 复制 readiness report、package reader、Runtime evaluator、query evaluator 或 action dispatcher 语义。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

然后报告：

```text
Round: <n>/4
Guide: docs/host-integration-static-artifact-poc-partner-handoff-goal-mode-execution-guide.md
This round does:
- ...
This round does not:
- ...
```

实现规则：

- POC-1 是 static artifact exchange / dry-run，不是 runtime integration。
- Handoff kit 必须能让外部合作方不理解 Inscape 内部源码也能消费 package。
- Partner feedback 是 partner-owned evidence，不是 Inscape Compiler / Host Schema / Host Bridge truth。
- Source refs 必须保持 package-relative path 和 `compiler-1-based` 坐标。
- Sinan 可作为例子，但所有主文档要保持 generic first。
- 生成物只放 ignored `artifacts/` 或临时目录，不进入 git。
- 旧的无关 untracked docs 不得 stage。

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

## 5. 每轮通过后提交推送工作流

优先 selective staging，不要使用会 stage 全部无关 untracked 文件的脚本。

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
git -c safe.directory=D:/LabProjects/Inscape add <round-relevant files>
git -c safe.directory=D:/LabProjects/Inscape diff --cached --check
git -c safe.directory=D:/LabProjects/Inscape commit -m "<phase>: <round summary>"
git -c safe.directory=D:/LabProjects/Inscape push
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

提交前必须确认：

- 只 stage 本阶段相关文件。
- 旧的无关 untracked docs 保持 untracked。
- `artifacts/`、临时 package、zip 或生成 reports 不进入提交。
- `git diff --check` 或 `git diff --cached --check` 通过。

## 6. 分轮安排

总预算：**4 轮会话**。

- Round 1-2：主交付。
- Round 3：smoke / hardening / docs buffer。
- Round 4：final validation / PASS-FAIL closure。

### Round 1：Handoff Kit Contract / Exchange Workflow

目标：

- 审计现有 package CLI、readiness report generator、POC-1 checklist 和 Sinan planning note。
- 新增 generic partner handoff kit 文档，描述从 Inscape package 到 partner dry-run feedback 的完整交换流程。
- 固定“对方要运行什么命令、读取哪些 artifact、回传什么 evidence、哪些事情不能做”。
- 明确 package artifact 不提交到 repo，只由命令生成或外部传递。

交付：

- `docs/host-integration-static-artifact-poc-partner-handoff-kit.md`
- Round 1 audit 段落或独立审计文档，记录本轮只做 handoff contract。
- README / TODO / handoff 初步同步。

Debug 自检：

- 一个不了解 Inscape 源码的合作方是否能按文档跑出 package 和 readiness report？
- 失败能否定位到 package generation、report generation、artifact parse、source ref、partner dry-run 或 feedback schema？

架构自检：

- 是否没有把 partner feedback 写成 Inscape truth？
- 是否没有暗示 generated apply、confirmed bridge 或 runtime integration 已经可用？

### Round 2：Partner Feedback Schema / Fixture

目标：

- 新增 partner feedback / dry-run report schema 文档。
- 定义 partner-owned statuses，例如 `ready`、`blocked`、`unsupported`、`missing-catalog`、`mapping-candidate`、`needs-review`、`rejected`。
- 定义 source refs、artifact refs、open questions、candidate evidence 和 boundary flags。
- 新增一个 generic feedback fixture；可以附带 Sinan profile 示例，但字段不得进入 Host Schema / Compiler truth。

交付：

- `docs/host-integration-static-artifact-poc-partner-feedback-schema.md`
- `docs/host-integration-static-fixtures/partner-feedback.generic.json`
- 如有必要，更新 `docs/sinan-cooperation/README.md`，只作为 partner profile index。

Debug 自检：

- feedback fixture 的状态是否能表达 missing catalog、unknown action、unsupported timeline phase 和 source diagnostic？
- 合作方回传的 host ids / catalog ids 是否保持 partner evidence，不会覆盖 Inscape anchors / source refs？

架构自检：

- 是否继续保持 Host Schema、Host Bridge、candidate evidence 和 partner feedback 分层？
- 是否没有新增 Sinan-specific core semantics？

### Round 3：Handoff Smoke / Docs Hardening

目标：

- 新增或扩展 smoke，验证 handoff kit 的最小闭环。
- Smoke 应能生成 ignored package、重新生成 readiness report、解析 partner feedback fixture，并检查 no host writes / no generated candidate / no runtime flags。
- Smoke 不得依赖 Sinan / Unity / Bird 项目。
- 收紧文档里的 CLI transcript、目录清单和常见失败解释。

交付：

- `docs/host-integration-static-fixtures/PartnerHandoffKitSmoke.js`
- smoke 说明文档或将说明并入 handoff kit。
- docs index / CLI reference / Sinan cooperation index 按需同步。

Debug 自检：

- smoke 是否能真实定位 handoff kit 中最容易错的环节，而不是只检查文本存在？
- ignored `artifacts/` 目录残留是否会导致误判？如会，smoke 是否自己使用临时目录或先清理目标？

架构自检：

- smoke 是否仍只消费 package / report / feedback fixture，不调用 Runtime、Unity、Sinan 或 Host SDK？
- 是否没有复制 Tooling report generator 语义到 JS 里，只做外部消费层检查？

### Round 4：Final Validation / PASS-FAIL Closure

目标：

- 运行完整验证矩阵。
- 输出 final validation report。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`。
- 明确下一候选方向仍需用户批准，尤其不能自动进入 Host Bridge Candidate Generator、POC-2 catalog projection 或 Runtime / Host SDK。

交付：

- `docs/host-integration-static-artifact-poc-partner-handoff-final-validation-report.md`
- docs closure。
- 最终提交和推送。

Debug 自检：

- final report 是否记录实际运行命令、结果、失败项或未运行原因？
- 合作方是否可以从 handoff kit、feedback schema、smoke 和 final report 独立理解 POC-1 成功标准？

架构自检：

- 确认本阶段没有越界进入 Host Bridge generator / POC-2 / generated apply / runtime / host save / Unity / Host SDK。

## 7. 验证矩阵

文档轮次至少运行：

```powershell
git diff --check
rg -n "host-integration-static-artifact-poc-partner-handoff|Static Artifact POC Partner Handoff|PartnerHandoffKitSmoke|partner-feedback.generic" docs
```

涉及 smoke / fixture 后运行：

```powershell
node --check docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
```

最终轮默认运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help export-host-integration-package-project
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-integration-readiness-report-package
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git diff --check
```

Round 3 和 Round 4 必须运行边界扫描：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

说明：边界扫描无输出时按 PASS 记录；如果命中文档历史，需要判断是否是本阶段新增越界，不要机械删除历史决策资料。

## 8. PASS 标准

全部满足才可判定 PASS：

- Partner handoff kit 文档存在，且能指导合作方从 package generation 到 feedback 回传。
- Partner feedback schema 明确区分 partner evidence、candidate evidence、confirmed Host Bridge 和 Inscape truth。
- 至少一个 partner feedback fixture 可被 smoke 解析。
- Smoke 覆盖 package generation、readiness report regeneration、feedback fixture parse、no host writes、no generated candidate、no runtime integration。
- 不提交生成 package、zip、临时 reports 或 `artifacts/` 内容。
- docs entry 已同步。
- final validation report 已输出。
- 最终提交已推送。
- 本阶段没有进入 Host Bridge Candidate Generator、POC-2 catalog projection、generated apply、Runtime Preview Bridge、Sinan Runtime Integration、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## 9. 最终报告模板

建议使用：

````markdown
# Host Integration Static Artifact POC Partner Handoff Final Validation Report

日期：2026-06-22

结论：`Host Integration Static Artifact POC Partner Handoff Kit: PASS | FAIL`

## Scope Result

已完成：
- ...

未进入范围：
- Host Bridge Candidate Generator
- POC-2 catalog projection
- generated apply
- Sinan Runtime Integration
- Runtime Preview Bridge
- Unity / Host SDK
- full host save
- Rollback / Trace Replay / Flashback
- Presentation IR
- Host Schema action policy expansion

## Validation Matrix

已运行：

```powershell
...
```

结果：

## Boundary Scans

已运行：

```powershell
...
```

结果：

## Self-Check

Debug 自检：
- ...

架构自检：
- ...

## Next Direction Gate

下一候选方向必须由用户批准。不要自动进入 Host Bridge Candidate Generator、POC-2 catalog projection、generated apply、Runtime Preview Bridge、Sinan Runtime Integration、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。
````
