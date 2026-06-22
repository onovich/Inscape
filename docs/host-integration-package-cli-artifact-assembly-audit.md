# Host Integration Package CLI Artifact Assembly Audit

日期：2026-06-22

结论：Host Integration Package CLI Round 3 Existing Artifact Assembly 已完成。

本轮在 Round 2 manifest writer 之上，复用既有 C# domain / model 生成核心静态 artifact：

- `graph/project-ir.json`
- `usage/usage.json`
- `host/host-schema-capabilities.json`
- `host/host-integration-audit.json`
- `localization/l10n.csv`

实现边界：

- 不通过 CLI 调 CLI。
- `graph/project-ir.json` 由 `StoryGraphCompilerDomain` 编译结果映射为 package graph artifact。
- `usage/usage.json` 复用 `UsageManifestDomain`。
- `host/host-schema-capabilities.json` 复用 `HostSchemaCapabilityCatalogDomain`。
- `host/host-integration-audit.json` 复用 `HostIntegrationAuditDomain` 与 `HostBindingCapabilityCatalogDomain`。
- `localization/l10n.csv` 复用 `LocalizationCsvFlowDomain.Extract`。
- CLI 入口仍只传入 workspace、`--config` 和 `-o`，不复制 artifact assembly 语义。

## Manifest Status

Round 3 导出后，manifest status 分界如下：

| Artifact | Status |
| --- | --- |
| `manifest.json` | `ready` |
| `graph/project-ir.json` | `ready` |
| `usage/usage.json` | `ready` |
| `host/host-schema-capabilities.json` | `ready` |
| `host/host-integration-audit.json` | `ready` |
| `localization/l10n.csv` | `ready` |
| `source/` | `missing` |
| `localization/anchor-map.json` | `missing` |
| `source-map/source-locations.json` | `missing` |
| `reports/readiness-report.json` | `missing` |

输出目录策略已更新为递归检查 package-owned 文件：允许重复写入当前 Round 3 产物与 `manifest.json`，拒绝嵌套的非 package 文件。

## Round 3 Self-Check

Debug 自检：

- 最可能坏的点 1：复用 CLI 输出而不是 shared domain。验证：实现位于 `Inscape.Tooling`，直接调用 compiler / Tooling domains；CLI 只构造 request。
- 最可能坏的点 2：Host Schema / Host Bridge 缺失导致 package command 崩溃。验证：host schema capabilities 和 host integration audit 仍用既有 missing/error model 产出 JSON；测试覆盖 no host schema / bridge 的最小项目。
- 最可能坏的点 3：重复导出目录混入嵌套未知文件时被误覆盖。验证：CLI 测试向 `graph/unexpected.json` 写入非 package 文件并断言命令拒绝。
- 未覆盖场景：source copy、source-map、anchor-map 和 readiness report 仍未生成；这些留给 Round 4。

架构自检：

- Compiler 仍负责 graph source truth，Tooling 负责 package assembly。
- 没有把 `inspect-*` CLI 文本输出当作内部真相；本轮复用下层 C# domain / model。
- VSCode / SelfHostedEditor 未引入 package assembly 逻辑。
- Sinan / Unity / Bird 未进入 `src/Internal`。
- 未实现 Host Bridge candidate generator、generated apply、runtime integration、preview bridge、host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## Validation

已运行：

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

结果：通过。
