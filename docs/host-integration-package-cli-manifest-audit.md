# Host Integration Package CLI Manifest Audit

日期：2026-06-22

结论：Host Integration Package CLI Round 2 Package Domain / Manifest Writer 已完成。

本轮把 `export-host-integration-package-project <workspace> -o <out-dir>` 从 Round 1 skeleton 推进到最小 manifest 导出：

- 新增 `src/Internal/Tooling/HostIntegrationPackage` shared domain，包含 manifest model、artifact index writer、package path guard 与 manifest-only export writer。
- CLI 入口只构造 request、调用 `HostIntegrationPackageExportDomain.TryWriteManifest`、映射 stdout / stderr / exit code。
- 当前只写 `manifest.json`；`graph/project-ir.json`、`usage/usage.json`、`host/host-schema-capabilities.json`、`host/host-integration-audit.json`、`localization/l10n.csv`、`localization/anchor-map.json`、`source-map/source-locations.json` 与 `reports/readiness-report.json` 仍留给后续轮次装配。
- `capabilities.runtimeIntegration`、`capabilities.previewBridge`、`capabilities.writesHostData`、`capabilities.containsHostDependency` 均固定为 `false`。

## Output Directory Policy

- `-o` 必填；缺失时返回 `2`。
- workspace root 不存在时返回 `3`。
- `-o` 指向已有文件时返回 `2`。
- 输出目录不存在时创建。
- 输出目录已存在且为空，或只包含 package-owned `manifest.json` 时允许写入。
- 输出目录存在其他文件或目录时拒绝，避免覆盖非 package 内容。
- 重复导出同一目录会保留已有 `createdAtUtc`，并保持 manifest 字节稳定。

## Artifact Index

Round 2 manifest 当前把 package 自身标记为 ready，其余后续 artifact 标记为 missing：

| Kind | Path | Required | Status |
| --- | --- | --- | --- |
| `manifest` | `manifest.json` | yes | `ready` |
| `source-files` | `source` | yes | `missing` |
| `narrative-graph-ir` | `graph/project-ir.json` | yes | `missing` |
| `usage-manifest` | `usage/usage.json` | yes | `missing` |
| `host-schema-capabilities` | `host/host-schema-capabilities.json` | no | `missing` |
| `host-integration-audit` | `host/host-integration-audit.json` | yes | `missing` |
| `localization-csv` | `localization/l10n.csv` | yes | `missing` |
| `localization-anchor-map` | `localization/anchor-map.json` | yes | `missing` |
| `source-locations` | `source-map/source-locations.json` | yes | `missing` |
| `readiness-report` | `reports/readiness-report.json` | no | `missing` |

All manifest artifact paths are package-relative and normalized to `/`.

## Round 2 Self-Check

Debug 自检：

- 最可能坏的点 1：输出目录重复运行覆盖策略不清。验证：测试覆盖缺失 `-o`、首轮写入、二次写入 byte-stable、混入非 package 文件拒绝。
- 最可能坏的点 2：manifest 泄漏绝对路径或 Windows `\` 分隔符。验证：Tooling path guard 测试和 CLI JSON 测试均逐项检查 artifact path。
- 最可能坏的点 3：manifest 提前声称 runtime / preview / host write 能力。验证：Tooling model 测试和 CLI manifest 测试均断言四个 capability flag 为 `false`。
- 未覆盖场景：真实 graph / usage / audit / l10n / source-map / report 装配仍未实现，留给 Round 3-5；本轮不应为这些 artifact 宣布 ready。

架构自检：

- Compiler 仍是 source truth；本轮未改 Compiler parser / semantic。
- Package manifest writer 位于 `Inscape.Tooling` shared domain，CLI 未复制 package 语义。
- VSCode / SelfHostedEditor 未引入 package 逻辑。
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
