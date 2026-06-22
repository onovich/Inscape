# Host Bridge Candidate Generator First Slice Goal 模式执行指南

日期：2026-06-22

状态：给执行者使用的 Host Bridge Candidate Generator first slice 开发指令文档

## 0. 直接给执行者的 Goal Prompt

请在 `D:\LabProjects\Inscape` 进入 goal 模式，阅读本文和“必读上下文”，并在 **6 轮会话内**完成 `Host Bridge Candidate Generator First Slice` 阶段。

本阶段已经由用户批准。目标是把既有 Host Integration Package、Usage Manifest、Host Schema capabilities、Host Integration Audit 和可选 partner feedback evidence，收成一个 **generic first、review-only、可验证、可复现** 的 Host Bridge Candidate 生成闭环。

硬边界：
- Candidate 是 review evidence，不是 confirmed Host Bridge。
- 第一刀使用显式独立 CLI 命令，优先建议命名为 `generate-host-bridge-candidate-package <package-dir> -o <candidate.json>`。
- `export-host-integration-package-project` 默认仍不得自动生成 `host/host-bridge-candidate.json`。
- readiness report 可以读取并汇总已经存在的 candidate artifact，但不得代替 candidate generator 自动生成它。
- 本阶段不得写 `inscape.host.bridge.json`，不得 generated apply，不得写宿主正式 data，不得进入 POC-2 catalog projection，不得接 Runtime Preview Bridge、Sinan Runtime、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy expansion。

你必须每轮执行：
- Debug 自检。
- 架构自检。
- 运行本轮相关验证。
- 验证通过后 commit + push。
- push 成功后才能进入下一轮。

6 轮预算：
- Round 1：baseline / command contract / source-of-truth audit。
- Round 2：shared Tooling candidate domain / package reader integration。
- Round 3：CLI command / diagnostics / output guard。
- Round 4：smoke fixture / determinism / docs hardening。
- Round 5：buffer / edge-case hardening / compatibility closure。
- Round 6：final validation / PASS-FAIL closure。

## 1. 必读上下文

先读：

```text
docs/agent-handoff.md
docs/todo.md
docs/host-integration-static-artifact-poc-partner-handoff-final-validation-report.md
docs/host-integration-static-artifact-poc-partner-handoff-kit.md
docs/host-integration-static-artifact-poc-partner-feedback-schema.md
docs/host-bridge-candidate-contract.md
docs/host-integration-package-contract.md
docs/host-integration-readiness-report-contract.md
docs/usage-manifest-contract.md
docs/host-schema.md
docs/host-bridge-contract.md
docs/source-location-external-contract.md
docs/host-integration-static-fixtures/PartnerHandoffKitSmoke.js
docs/host-integration-static-fixtures/HostIntegrationPackageCliSmoke.js
docs/host-integration-static-fixtures/HostIntegrationReadinessReportSmoke.js
```

再读源码入口：

```text
src/Internal/Tooling/HostIntegrationPackage/
src/Internal/Tooling/HostIntegrationAudit/
src/Internal/Tooling/HostSchema/
src/Internal/Tooling/UsageManifest/
src/Internal/Cli/Inscape.Cli/Commands/CliStoryGraphCommand.cs
src/Internal/Cli/Inscape.Cli/Providers/CliCommandProvider.cs
tests/Internal/Inscape.Tests/
```

如果实现需要新增目录，优先放在：

```text
src/Internal/Tooling/HostBridgeCandidate/
```

## 2. 本阶段要完成什么

本阶段要完成一个最小但真实的 Host Bridge Candidate 生成闭环：

1. 在 `Inscape.Tooling` 新增共享 candidate generation domain。
2. 从既有 Host Integration Package 读取输入，不重新解析 `.inscape` 语义。
3. 输出符合 [Host Bridge Candidate Contract](host-bridge-candidate-contract.md) 的 `inscape.host-bridge-candidate` artifact。
4. 提供显式 CLI 命令，例如：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-bridge-candidate-package <package-dir> -o <candidate.json>
```

5. 新增 smoke，例如：

```text
docs/host-integration-static-fixtures/HostBridgeCandidateGeneratorSmoke.js
```

6. 更新 package / readiness / handoff 文档，使它们说明：
   - package export 默认不生成 candidate；
   - candidate generator 是单独批准后的显式命令；
   - candidate artifact 只读静态 package，输出 review evidence；
   - readiness report 可以把已有 candidate 的 status / count / write flags 纳入汇总。
7. 输出每轮 audit 文档和最终验证报告。

建议新增文档：

```text
docs/host-bridge-candidate-generator-baseline-audit.md
docs/host-bridge-candidate-generator-domain-audit.md
docs/host-bridge-candidate-generator-cli-audit.md
docs/host-bridge-candidate-generator-smoke-audit.md
docs/host-bridge-candidate-generator-final-validation-report.md
```

## 3. 本阶段不做什么

本阶段禁止：

- 不生成、修改或确认 `inscape.host.bridge.json`。
- 不做 confirmed bridge / accepted-to-bridge 写回。
- 不做 generated apply。
- 不把 candidate 写成 adapter patch。
- 不做 POC-2 catalog projection。
- 不读取 Sinan repo 或 Sinan catalog 作为产品依赖。
- 不把 Sinan runtime id、Unity GUID、Addressables、ScriptableObject、Director / Timeline runtime 语义写进 Compiler / Host Schema truth。
- 不接 Runtime Preview Bridge。
- 不接 Sinan Runtime。
- 不接 Unity / Host SDK。
- 不做完整 host save / load。
- 不做 Rollback / Trace Replay / Flashback。
- 不做 Presentation IR。
- 不新增 Host Schema action policy 字段，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy`、`timeoutPolicy`。
- 不把 candidate review UI 接入 VSCode 或 SelfHostedEditor。
- 不提交 generated package、zip、临时 candidate output、临时 report 或 `artifacts/` 内容。

## 4. 关键设计选择

本阶段采用以下保守选择：

- **Standalone command first**：candidate generator 是独立命令，不塞进 package export 默认路径。这样不会破坏既有 smoke 中“package CLI 不自动生成 candidate”的边界。
- **Package artifact truth first**：generator 读取 package 内的 `manifest.json`、`usage/usage.json`、`host/host-schema-capabilities.json`、`host/host-integration-audit.json`、`source-map/source-locations.json` 等 artifact。不要重新解析 `.inscape` 文本来推断语义。
- **Tooling owns semantics**：candidate generation 语义放在 `Inscape.Tooling`。CLI 只负责参数解析、调用、输出和 exit code。
- **Candidate-only ownership**：所有 generated candidate 默认 `generatedOwnership = "candidate-only"`，`writesHostData = false`。
- **Unknown schema stays blocked**：未知 action / query usage 只能生成 `schema-capability` 或 `blocked` evidence，不能伪造 action-handler / query-handler。
- **No partner catalog projection**：第一刀不消费 Sinan catalog 或真实 partner catalog。若需要 catalog，只能用 docs fixture 或后续单独批准阶段。

## 5. 每轮固定工作流

每一轮开始前：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

每一轮必须回答：

```text
- 本轮目标
- 本轮完成内容
- Debug 自检
- 架构自检
- 已运行验证命令与结果
- commit hash 与 push 结果
- 下一轮目标
- 是否消耗缓冲轮
```

Debug 自检至少包含：
- 当前改动能否用一个最小 package fixture 或 CLI 命令解释清楚？
- 失败能否定位到 package reader、candidate generator domain、CLI、JSON output、smoke fixture 或 docs 入口？
- missing / invalid / unsupported / blocked / empty / ready 状态是否有明确表达？
- output path guard、determinism、no host write 是否覆盖？

架构自检至少包含：
- Compiler 仍是 parser / graph truth，没有读取 Host Schema、Host Bridge、candidate 或 partner feedback。
- Runtime 没有被引入 candidate generation。
- Tooling 是 candidate generation 语义入口，CLI 保持薄壳。
- Host Schema、Host Bridge、Usage Manifest、Audit、Candidate、Feedback 的职责没有互相吞并。
- Candidate 仍是 review evidence，不是 confirmed bridge truth。
- 没有把 Sinan / Unity / Bird / Host SDK dependency 拉进 `src/Internal`。

## 6. 每轮通过后提交推送工作流

每轮相关验证通过后：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape diff --stat
git -c safe.directory=D:/LabProjects/Inscape diff --check
git -c safe.directory=D:/LabProjects/Inscape add <本轮相关文件>
git -c safe.directory=D:/LabProjects/Inscape diff --cached --check
git -c safe.directory=D:/LabProjects/Inscape commit -m "<message>"
git -c safe.directory=D:/LabProjects/Inscape push origin main
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

不要 stage unrelated untracked files。当前仓库可能存在与本阶段无关的未跟踪文档，保持不动。

推进规则：
- 验证失败：不得提交推送，不得进入下一轮。
- 验证通过但提交失败：不得进入下一轮。
- 提交成功但 push 失败：不得进入下一轮。
- push 成功：记录 commit hash 和远端分支，再进入下一轮。

## 7. 分轮安排

总预算：**6 轮会话**。

### Round 1：Baseline / Command Contract / Source-Of-Truth Audit

目标：
- 审计现有 package export、readiness report、Host Bridge Candidate Contract、partner feedback schema 和 smokes。
- 明确 first slice 的输入、输出、命令名、错误状态和不做范围。
- 如果新增 CLI 命令 skeleton，必须保持 help / commands 可见，但可以先输出明确的 `not-implemented` 或最小 guard。

建议产物：
- `docs/host-bridge-candidate-generator-baseline-audit.md`
- CLI command contract 更新，若本轮落地 skeleton。
- `docs/todo.md` / `docs/agent-handoff.md` Round 1 快照。

必须确认：
- `export-host-integration-package-project` 默认仍不生成 `host/host-bridge-candidate.json`。
- `generate-host-integration-readiness-report-package` 不偷偷生成 candidate。
- 新命令的输出路径必须显式指定，且必须通过 package path / output guard。

本轮建议验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-bridge-candidate-package
git diff --check
```

### Round 2：Shared Tooling Candidate Domain / Package Reader Integration

目标：
- 新增或扩展 `Inscape.Tooling` domain，生成 `inscape.host-bridge-candidate` model。
- 读取 existing package artifacts，而不是重新解析 `.inscape` source。
- 产出 ready / empty / blocked / invalid / incompatible 等状态。
- 至少覆盖：
  - no gaps -> empty candidate artifact；
  - unknown action/query -> `schema-capability` 或 `blocked`；
  - required id / resource gap -> `id-binding` 或 `resource-binding` candidate；
  - existing action/query without bridge mapping -> review-only `action-handler` / `query-handler` candidate only when Host Schema already declares it。

建议产物：
- `src/Internal/Tooling/HostBridgeCandidate/...`
- Internal tests。
- `docs/host-bridge-candidate-generator-domain-audit.md`

本轮必须守住：
- candidate `summary.writesHostData = false`。
- 每个 candidate `ownership.writesHostData = false`。
- unknown action/query 不得伪造成 handler mapping。
- `source` refs 使用 `compiler-1-based`。

本轮建议验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

### Round 3：CLI Command / Diagnostics / Output Guard

目标：
- 完成 `generate-host-bridge-candidate-package <package-dir> -o <candidate.json>`。
- CLI 只做参数解析、domain 调用、JSON 写出、stdout/stderr/exit code 映射。
- 输出 JSON 使用无 BOM UTF-8。
- 覆盖 missing package、invalid package、unsupported format、output path guard、determinism。
- 更新 `CliCommandProvider` commands/help。

建议产物：
- `docs/host-bridge-candidate-generator-cli-audit.md`
- CLI / Internal tests。

本轮必须守住：
- 不新增 `export-host-integration-package-project --include-candidate` 之类默认扩张。
- 不写入 package，除非用户显式把 `-o` 指向 package 内目标路径。
- 不生成 confirmed bridge。

本轮建议验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-bridge-candidate-package
git diff --check
```

### Round 4：Smoke Fixture / Determinism / Docs Hardening

目标：
- 新增 `HostBridgeCandidateGeneratorSmoke.js`。
- smoke 使用临时 workspace / package，真实调用：
  - `export-host-integration-package-project`
  - `generate-host-bridge-candidate-package`
  - 可选：`generate-host-integration-readiness-report-package`
- 验证 candidate artifact shape、determinism、write flags、candidate-only ownership、source refs、unknown action/query blocked、no generated apply。
- 更新 docs README、handoff kit、package contract、readiness report contract、static fixture smoke docs。

建议产物：
- `docs/host-integration-static-fixtures/HostBridgeCandidateGeneratorSmoke.js`
- `docs/host-bridge-candidate-generator-smoke-audit.md`

本轮必须守住：
- package CLI smoke 如果仍断言 package export 默认不生成 candidate，这条断言应继续成立。
- readiness report smoke 可以增加“当 candidate 已存在时读取 candidate summary”的覆盖，但不得让 readiness generator 生成 candidate。

本轮建议验证：

```powershell
node --check docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

### Round 5：Buffer / Edge-Case Hardening / Compatibility Closure

目标：
- 处理 Round 1-4 暴露的问题。
- 补 compatibility / invalid JSON / unsupported version / missing artifact / conflict / empty 的缺口。
- 补 docs 与 TODO 的最终前置收口。
- 如果没有缺口，本轮可作为 docs hardening 和 validation dry-run，不强行扩 scope。

可做：
- 加强 candidate parser / validator。
- 加强 readiness report 对 existing candidate 的 status 汇总。
- 增加 fixture 覆盖 conflict / blocked / empty。

不可做：
- 不做 UI review。
- 不做 batch accept。
- 不做 generated apply。
- 不做 partner catalog projection。

本轮建议验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
git diff --check
```

### Round 6：Final Validation / PASS-FAIL Closure

目标：
- 输出最终报告。
- 跑完整验证矩阵。
- 确认 non-scope 没有越界。
- 同步 docs README、TODO、agent-handoff。
- 提交推送。

建议产物：

```text
docs/host-bridge-candidate-generator-final-validation-report.md
```

最终必须运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help export-host-integration-package-project
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-integration-readiness-report-package
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-bridge-candidate-package
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
node --check docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node --check docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
git diff --check
```

最终必须运行边界扫描：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
rg -n "confirmedHostBridge|generatedApply|writesHostData\s*[:=]\s*true|accepted-to-bridge" src\Internal docs\host-integration-static-fixtures -g "*.cs" -g "*.js" -g "*.json"
```

说明：前四条边界扫描无输出时按 PASS 记录。最后一条如果命中文档 fixture 或 final report 中明确的禁区说明，需要人工判断；产品代码中不得出现本阶段新增的 confirmed / apply / host-write 实现。

## 8. PASS 标准

全部满足才可判定 PASS：

- 新 CLI 命令存在，并出现在 `commands` 与 `help`。
- Candidate generator 使用 `Inscape.Tooling` shared domain；CLI 没有复制 generation 语义。
- Candidate artifact 符合 `format = "inscape.host-bridge-candidate"`、`formatVersion = 1`。
- Candidate output deterministic。
- output path guard 覆盖。
- unknown action/query 不生成假 handler mapping。
- `summary.writesHostData = false`，所有 candidate ownership `writesHostData = false`。
- package export 默认仍不生成 candidate。
- readiness report generator 不自动生成 candidate。
- smokes 覆盖 generator、package export no-candidate default、readiness existing-candidate handling。
- docs README / TODO / agent-handoff 同步。
- final validation report 输出。
- 最终提交已 push。
- 没有进入 confirmed bridge、generated apply、POC-2 catalog projection、Runtime Preview Bridge、Sinan Runtime、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy expansion。

## 9. 最终报告模板

建议使用：

````markdown
# Host Bridge Candidate Generator First Slice Final Validation Report

日期：2026-06-22

结论：`Host Bridge Candidate Generator First Slice: PASS | FAIL`

## Scope Result

已完成：
- ...

未进入范围：
- confirmed Host Bridge write
- generated apply
- POC-2 catalog projection
- Runtime Preview Bridge
- Sinan Runtime
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

## Smoke Evidence

`HostBridgeCandidateGeneratorSmoke.js` output summary:

```json
{
  "status": "pass"
}
```

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

下一候选方向必须由用户批准。不要自动进入 confirmed bridge、generated apply、POC-2 catalog projection、Runtime Preview Bridge、Sinan Runtime、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy expansion。
````
