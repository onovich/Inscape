# Host Integration Readiness Report Generator Goal 模式执行指南

日期：2026-06-22

状态：给执行者使用的 Readiness Report Generator 开发指令文档

## 0. 直接给执行者的 Goal Prompt

请在 `D:\LabProjects\Inscape` 进入 goal 模式，阅读本文和“必读上下文”，并在 **5 轮会话内** 完成 `Host Integration Readiness Report Generator` 阶段。

本阶段目标是把 Host Integration Package CLI 中已经能生成的最小 `reports/readiness-report.json`，升级为可独立复用的 package readiness report generator。它应该能读取现有 Host Integration Package，检查 manifest / artifacts / source refs / diagnostics / boundary flags，并输出 deterministic readiness report。

建议目标命令为：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package <package-dir> -o <report.json>
```

每轮必须先声明本轮边界，完成后做 Debug 自检、架构自检和验证。验证通过后才允许提交并推送，再进入下一轮。任何轮次都不得把本阶段扩成 Host Bridge candidate generator、Static Artifact POC partner handoff、POC-2 catalog projection、Sinan Runtime Integration、Runtime Preview Bridge、Unity / Host SDK、generated apply、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## 1. 必读上下文

先读入口和上阶段报告：

1. [Agent 接手指南](agent-handoff.md)
2. [TODO](todo.md)
3. [文档索引](README.md)
4. [Host Integration Package CLI Final Validation Report](host-integration-package-cli-final-validation-report.md)
5. [Host Integration Package CLI Goal 模式执行指南](host-integration-package-cli-goal-mode-execution-guide.md)
6. [Host Integration Package CLI Source Map Report Audit](host-integration-package-cli-source-map-report-audit.md)
7. [Host Integration Package CLI Smoke Determinism Audit](host-integration-package-cli-smoke-determinism-audit.md)

再读 report / package 契约：

1. [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md)
2. [Host Integration Package Contract](host-integration-package-contract.md)
3. [Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md)
4. [Source Location External Contract](source-location-external-contract.md)
5. [Localization Anchor Export Contract](localization-anchor-export-contract.md)
6. [Host Bridge Candidate Contract](host-bridge-candidate-contract.md)
7. [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md)
8. [CLI 命令速查](cli-command-reference.md)

相关代码入口：

```text
src/Internal/Cli/
src/Internal/Tooling/HostIntegrationPackage/
src/Internal/Tooling/HostIntegrationAudit/
tests/Internal/Inscape.Tests/
docs/host-integration-static-fixtures/
```

## 2. 本阶段要完成什么

本阶段做一个窄而完整的 report generator：

- 把当前 `HostIntegrationPackageExportDomain` 内部的 readiness report 创建逻辑抽成 shared Tooling domain。
- 新增 package reader / report generator，用 package `manifest.json` 和 artifact 文件生成 report，不依赖原始 workspace。
- 新增 CLI 命令：`generate-host-integration-readiness-report-package <package-dir> -o <report.json>`。
- 让 `export-host-integration-package-project` 继续使用同一 shared report generator 写 `reports/readiness-report.json`，避免两套 report 语义。
- 校验 package artifact presence、JSON parse、known `format` / `formatVersion`、CSV artifact presence、package-relative path 和 source ref 基本有效性。
- 汇总 package 中已有 compiler diagnostics / host integration audit diagnostics，并保留 source refs。
- 生成 deterministic report：同一 package 多次生成结果稳定，除非显式传入或保留的 timestamp 策略被文档化。
- 新增 tests / smoke，覆盖 ready package、缺失 required artifact、invalid JSON artifact、unsupported / blocked diagnostic 和 output path guard。
- 更新 CLI 文档、handoff、TODO、README，并在最终轮输出 final validation report。

建议 final validation report 路径：

```text
docs/host-integration-readiness-report-generator-final-validation-report.md
```

## 3. 本阶段不做什么

本阶段不做：

- 不生成 `host/host-bridge-candidate.json`。
- 不做 Host Bridge candidate generator。
- 不做 generated apply。
- 不写宿主项目文件，不改 Sinan / Unity / Bird 项目。
- 不做 Static Artifact POC partner handoff；本阶段只让 report generator 可用。
- 不做 POC-2 catalog projection。
- 不引入 Sinan-specific report rules；`partner = "sinan"` 最多只是 profile 字段值，不触发特殊代码路径。
- 不接 Runtime、不接 Runtime Preview Bridge、不做 Host SDK。
- 不做完整 host save、Rollback、Trace Replay、Flashback Playback。
- 不做 Presentation IR。
- 不新增 Host Schema action policy 字段，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不把 Sinan / Unity / Bird hard dependency 引入 `src/Internal`。
- 不在 VSCode / SelfHostedEditor 中复制 readiness report 语义。

## 4. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

然后报告：

```text
Round: <n>/5
Guide: docs/host-integration-readiness-report-generator-goal-mode-execution-guide.md
This round does:
- ...
This round does not:
- ...
```

每轮实现规则：

- Compiler 仍是 graph / source truth。
- Tooling 承担 report generator / package reader / shape validation。
- CLI 入口只做参数解析、调用 shared domain、写文件 / stdout / stderr / exit code 映射。
- `export-host-integration-package-project` 和新 report CLI 必须复用同一个 report generator。
- 所有 package artifact path 必须是 package-relative，使用 `/` 分隔。
- 所有输出排序必须稳定。
- 旧的无关 untracked docs 不能被 stage。

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

每轮提交前必须确认：

- 只 stage 本阶段相关文件。
- 旧的无关 untracked docs 保持 untracked。
- `git diff --check` 或 `git diff --cached --check` 通过。

## 6. 分轮安排

总预算：**5 轮会话**。

- Round 1-3：主实现。
- Round 4：hardening / smoke / docs buffer。
- Round 5：final validation / PASS-FAIL closure。

### Round 1：Baseline / Report Generator Contract

目标：

- 审计当前 `CreateReadinessReport` / report model / package manifest / package export 逻辑。
- 明确新 CLI 命令、输入输出、错误码、输出覆盖策略。
- 定义 package reader 的最小职责：读 manifest、读 artifact 文件、检查 shape，不重新编译 workspace。
- 输出 Round 1 审计文档。

交付：

- `docs/host-integration-readiness-report-generator-baseline-audit.md`
- 如改代码，只允许注册命令 skeleton / help / commands / empty guard。

Debug 自检：

- package-dir 不存在、manifest 缺失、manifest invalid、`-o` 缺失时是否有明确错误。
- report 输出路径在 package 内外时策略是否写清楚。

架构自检：

- 是否没有把 package reader 写成重新编译 `.inscape`。
- 是否没有把 report generator 放在 CLI 入口。

### Round 2：Shared Report Domain / Package Reader

目标：

- 抽出 shared readiness report generator domain。
- 新增 package reader / artifact shape check。
- 支持 manifest artifact list 到 `artifactChecks[]` 的稳定映射。
- 将 package export 中的 report 写入改为调用 shared report generator。

交付：

- shared domain / model / reader。
- Unit tests 覆盖 ready package、missing required artifact、invalid JSON artifact。
- package export 仍能生成与现有 contract 兼容的 report。

Debug 自检：

- artifact missing / invalid / incompatible 是否分别落到明确 status。
- same package repeated report 是否 deterministic。

架构自检：

- report model 是否仍是 Tooling-owned。
- package export 和新 generator 是否复用同一个 domain。

### Round 3：CLI Command / Diagnostics Aggregation

目标：

- 完成 `generate-host-integration-readiness-report-package <package-dir> -o <report.json>`。
- 把 compiler diagnostics、host integration audit diagnostics、source ref 信息汇总到 report。
- 固定 summary severity 规则，例如 `invalid` / `incompatible` / missing required / `blocked` / `unsupported` / `ready` 的优先级。
- 确认 `writesHostData = false` 和 boundary flags 永远保持 false。

交付：

- CLI command 完整可跑。
- CLI tests 覆盖 help、success、invalid package、diagnostic aggregation。
- `export-host-integration-package-project` smoke 继续通过。

Debug 自检：

- diagnostics source ref 是否回到 package source path。
- unknown action 是否保持 blocked / audit diagnostic，不被 CLI 自动修复。

架构自检：

- CLI 是否只调用 Tooling，不复制 report status 算法。
- 是否没有新增 partner-specific rules。

### Round 4：Fixtures / Smoke / Docs Hardening

目标：

- 新增或扩展 JS smoke，例如 `HostIntegrationReadinessReportSmoke.js`。
- 覆盖真实 package 导出后独立生成 report。
- 覆盖缺失 artifact、invalid JSON、output directory / overwrite guard、determinism。
- 更新 report contract / CLI docs / static smoke docs，如实现细节需要同步。

交付：

- smoke script 和 `node --check` 覆盖。
- 文档更新。
- 若 Round 1-3 有小缺口，本轮只修本阶段范围内问题。

Debug 自检：

- smoke 是否能真实定位 report generator 层的问题，而不是只验证 package export。
- failure fixture 是否最小、可读、可重复。

架构自检：

- smoke 是否继续证明无 host write、无 runtime integration、无 Host Bridge candidate generation。
- docs 是否没有暗示 partner handoff 已完成。

### Round 5：Final Validation / PASS-FAIL Closure

目标：

- 运行完整验证矩阵。
- 输出 [Host Integration Readiness Report Generator Final Validation Report](host-integration-readiness-report-generator-final-validation-report.md)。
- 同步 `docs/agent-handoff.md`、`docs/todo.md`、`docs/README.md`。
- 明确下一候选方向仍需用户批准；不能自动进入 Static Artifact POC partner handoff 或 Host Bridge Candidate Generator。

交付：

- final validation report。
- docs closure。
- 最终提交和推送。

Debug 自检：

- 最终报告是否记录实际运行命令、结果、失败项或未运行原因。
- report generator 是否能独立读取已有 package，而不是依赖 workspace 编译上下文。

架构自检：

- 确认本阶段没有越界进入 Host Bridge generator / partner handoff / generated apply / runtime / host save。

## 7. 验证矩阵

代码轮次默认运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-integration-readiness-report-package
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project samples -o artifacts\host-integration-package-smoke
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package artifacts\host-integration-package-smoke -o artifacts\host-integration-package-smoke\reports\readiness-report.regenerated.json
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
git diff --check
```

如果新增 report smoke，还要运行：

```powershell
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
```

涉及 VSCode command reference 或 package metadata 时运行：

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
```

文档-only 轮次至少运行：

```powershell
git diff --check
rg -n "host-integration-readiness-report-generator-goal-mode-execution-guide|Readiness Report Generator|generate-host-integration-readiness-report-package|5 轮" docs
```

Round 4 和 Round 5 必须运行边界扫描：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

说明：边界扫描无输出时按 PASS 记录；如果命中文档历史，需要判断是否是本阶段新增越界，不要机械删除历史决策资料。

## 8. PASS 标准

全部满足才可判定 PASS：

- CLI `commands` 和 `help` 能看到 `generate-host-integration-readiness-report-package`。
- 新命令能读取已有 Host Integration Package 并输出 report。
- `export-host-integration-package-project` 继续生成 `reports/readiness-report.json`，且复用同一 shared generator。
- report 可 parse，`format = "inscape.host-integration.readiness-report"`，`formatVersion = 1`。
- report 的 `artifactChecks[]` 反映 manifest artifacts 的 presence / status / format / version。
- 缺失 required artifact、invalid JSON artifact、unsupported / blocked diagnostic 均有明确状态。
- diagnostics 保留 source refs，且 source refs 使用 package/workspace-relative path 和 `compiler-1-based` 坐标。
- `writesHostData = false`，boundary flags 继续保持 false。
- repeated generation deterministic。
- tests / smoke 覆盖 ready package、missing artifact、invalid artifact、diagnostic aggregation、path/output guard。
- docs entry 已同步。
- final validation report 已输出。
- 最终提交已推送。

## 9. 最终报告模板

最终报告建议使用：

```markdown
# Host Integration Readiness Report Generator Final Validation Report

日期：2026-06-22

结论：`Host Integration Readiness Report Generator: PASS | FAIL`

## Scope Result

已完成：
- ...

未进入范围：
- Host Bridge candidate generator
- Static Artifact POC partner handoff
- POC-2 catalog projection
- Sinan Runtime Integration
- Runtime Preview Bridge
- Unity / Host SDK
- generated apply
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

下一候选方向必须由用户批准，不能自动进入 Static Artifact POC partner handoff、Host Bridge Candidate Generator、POC-2 catalog projection 或任何 runtime / host write scope。
```
