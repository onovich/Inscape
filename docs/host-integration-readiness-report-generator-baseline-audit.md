# Host Integration Readiness Report Generator Baseline Audit

日期：2026-06-22

结论：Round 1 Baseline / Report Generator Contract 已完成。当前 `reports/readiness-report.json` 生成逻辑仍内联在 `HostIntegrationPackageExportDomain`，下一轮应抽成 `Inscape.Tooling` 下可由 package export 与独立 package reader 共同复用的 readiness report generator。

## Current Implementation

现有 package export 入口：

- CLI 分发：`src/Internal/Cli/Inscape.Cli/Commands/CliStoryGraphCommand.cs`
- CLI 命令登记 / help：`src/Internal/Cli/Inscape.Cli/Providers/CliCommandProvider.cs`
- package assembly domain：`src/Internal/Tooling/HostIntegrationPackage/Domains/HostIntegrationPackageExportDomain.cs`
- manifest domain：`src/Internal/Tooling/HostIntegrationPackage/Domains/HostIntegrationPackageManifestDomain.cs`
- report model：`src/Internal/Tooling/HostIntegrationPackage/Models/HostIntegrationPackageReadinessReportModel.cs`

当前 `export-host-integration-package-project <root> -o <package-dir>` 会在 Tooling domain 内完成：

- 读取 workspace config。
- 读取 `.inscape` source。
- 编译 Project IR。
- 生成 Host Schema capability catalog。
- 生成 Usage Manifest。
- 生成 Host Integration Audit。
- 提取 localization CSV。
- 复制 `source/`，生成 `source-map/source-locations.json` 与 `localization/anchor-map.json`。
- 调用内部 `CreateReadinessReport(manifest, createdAtUtc)` 写出 `reports/readiness-report.json`。

当前 report 生成的范围是最小 package assembly report：

- 从 manifest artifact index 映射 `artifactChecks[]`。
- 复制 manifest capability boundary 到 report `boundary`。
- 固定 `hostBridgeCandidate.status = "missing"`。
- 汇总 ready / missing / invalid / unsupported / blocked counts。
- 当 required artifact missing 时把 summary result 标为 `missing`。

当前不足：

- `CreateReadinessReport`、`FinalizeReadinessSummary` 和 status severity 逻辑是 `HostIntegrationPackageExportDomain` 的私有方法，独立 CLI 无法复用。
- 当前 report 只信任 export 过程刚刚创建的 manifest，不读取已有 package 的 artifact 文件。
- 当前 report 不校验已有 artifact 的 JSON parse、format、formatVersion、CSV presence 或 source ref shape。
- 当前 report 尚未汇总 package 内已有 compiler diagnostics / host integration audit diagnostics。

## New Command Contract

目标命令：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package <package-dir> -o <report.json>
```

命令职责：

- 接收一个已经存在的 Host Integration Package 目录。
- 读取 `manifest.json`。
- 按 manifest artifact index 检查 artifact presence、required 状态、format、formatVersion 和基础 shape。
- 对 JSON artifacts 做 parse / shape 检查；对 CSV artifact 做存在性和非空检查。
- 汇总 `graph/project-ir.json` compiler diagnostics 与 `host/host-integration-audit.json` diagnostics，并保留 package-relative source refs。
- 输出 deterministic `inscape.host-integration.readiness-report` JSON。

CLI 入口只负责：

- 参数解析。
- 调用 Tooling shared report generator。
- 写入 `-o` 指定文件。
- stdout / stderr / exit code 映射。

Tooling shared domain 负责：

- package path normalization。
- manifest reader。
- artifact reader / shape checker。
- readiness report assembly。
- summary status severity。

## Input And Output Rules

输入规则：

- `<package-dir>` 必须存在且必须是目录。
- package root 必须包含 `manifest.json`。
- `manifest.format` 必须是 `inscape.integration-package`。
- `manifest.formatVersion` 当前支持 `1`。
- manifest artifact path 必须是 package-relative path，使用 `/`，不允许绝对路径、URI、空 segment 或 `..` traversal。

输出规则：

- `-o <report.json>` 必填。
- 输出 path 可以在 package 内，例如 `reports/readiness-report.regenerated.json`。
- 输出 path 也可以在 package 外，用于验收或 CI 对比。
- 输出文件父目录必须可创建。
- 如果输出 path 是目录，命令失败。
- 如果输出 path 在 package 内，不能借此写入 manifest 未声明的 package-owned artifact，除非该 path 是本次命令显式输出文件；不应绕过已有 output directory guard。
- 重复运行同一 package 与同一 `-o` 应产生 byte-stable JSON，除非后续显式引入并文档化 timestamp policy。本阶段优先复用 manifest 的 `createdAtUtc`，缺失时使用 deterministic empty / package metadata policy，不使用当前时间作为默认 report 变因。

建议 exit code：

| 场景 | Exit code | stderr |
| --- | --- | --- |
| `-o` 缺失 | `2` | `generate-host-integration-readiness-report-package requires -o <report.json>.` |
| package path 不是目录 | `3` | `Host Integration Package directory not found: <path>` |
| `manifest.json` 缺失 | `3` | `Host Integration Package manifest not found: <path>` |
| manifest invalid JSON | `3` | `Host Integration Package manifest is not valid JSON: ...` |
| manifest format / version incompatible | `3` | `Unsupported Host Integration Package manifest: ...` |
| output path 是目录或不可写 | `2` | 明确指出 output path 问题 |

Readiness report 本身可以输出 `summary.result = "missing" | "invalid" | "incompatible" | "blocked" | "unsupported"`；这些 package readiness 状态不一定等同于 CLI 失败。CLI 失败只表示无法读取 package 或无法写出 report。

## Minimal Package Reader Responsibilities

Package reader 不做：

- 不重新编译 `.inscape`。
- 不解析 `.inscape` source 来恢复 graph / usage / localization 语义。
- 不生成 Host Bridge candidate。
- 不执行 Runtime。
- 不写 host project data。

Package reader 只做：

- 读取 manifest。
- 解析 manifest artifact index。
- 读取 artifact file bytes / text。
- 对已知 JSON artifact 做 format / formatVersion / diagnostics shape 检查。
- 对 CSV artifact 做存在性检查。
- 对 source refs 做 package-relative path 与 `compiler-1-based` 坐标检查。

## Shared Generator Extraction Plan

Round 2 应将当前私有逻辑抽到 shared Tooling domain，例如：

```text
src/Internal/Tooling/HostIntegrationPackage/
  Domains/HostIntegrationPackageReadinessReportDomain.cs
  Domains/HostIntegrationPackageReaderDomain.cs
  Models/HostIntegrationPackageReadinessReportInputModel.cs
```

建议第一步拆分：

- `CreateFromManifest(manifest, createdAtUtc)`：维持 package export 现有行为。
- `TryCreateFromPackage(packageRoot, jsonOptions, out report, out diagnostics/error)`：独立 package reader 使用。
- `FinalizeSummary(report)`：单一 summary severity 规则。
- `CreateArtifactChecks(manifest, packageRoot)`：manifest artifact list 到 `artifactChecks[]` 的稳定映射。

`export-host-integration-package-project` 必须改为调用同一个 shared report generator，避免保留第二套 report semantics。

## Validation Surface

Round 1 只做 baseline / contract，因此验证重点是：

- 现有 command / help 仍能列出 package export 命令。
- 文档 diff 无空白错误。
- 新命令尚未实现时，不声明 PASS。

后续 Round 2-4 必须补：

- ready package。
- missing required artifact。
- invalid JSON artifact。
- incompatible manifest / artifact format version。
- compiler diagnostics aggregation。
- host integration audit diagnostics aggregation。
- source ref path / coordinate guard。
- output path guard。
- repeated generation determinism。

## Round 1 Self-Check

Debug 自检：

- package-dir 不存在、manifest 缺失、manifest invalid、`-o` 缺失的错误策略已写入本审计。
- report 输出在 package 内外的策略已写入本审计。
- 当前未实现独立 reader，因此本轮没有声称新命令可运行；后续轮次必须补 CLI 和 smoke。

架构自检：

- Reader contract 明确不重新编译 workspace，也不解析 `.inscape` source。
- Report generator 归属 Tooling shared domain，不放入 CLI 入口。
- CLI 只承担参数解析、调用、写文件和 exit code 映射。
- 本轮没有进入 Host Bridge Candidate Generator、partner handoff、POC-2、Runtime、Host SDK、generated apply、host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。
- Sinan / Unity / Bird 没有进入 `src/Internal`。

## Round 1 Validation

计划运行：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help export-host-integration-package-project
git diff --check
rg -n "host-integration-readiness-report-generator-goal-mode-execution-guide|Readiness Report Generator|generate-host-integration-readiness-report-package|5 轮" docs
```
