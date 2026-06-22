# Host Integration Readiness Report Generator Shared Domain Audit

日期：2026-06-22

结论：Round 2 Shared Report Domain / Package Reader 已完成。

本轮把 `reports/readiness-report.json` 的 summary / artifact check 语义从 package export 私有方法抽到 `Inscape.Tooling` shared domain，并新增最小 package reader。`export-host-integration-package-project` 现在继续写出同样的 readiness report，但调用同一个 shared generator，后续独立 CLI 可以直接复用该 domain。

## Completed

新增 Tooling domain：

- `HostIntegrationPackageReadinessReportDomain`
  - `CreateFromManifest(...)`：供 package export 复用，保持现有 report shape。
  - `TryCreateFromPackage(...)`：读取已有 package 并生成 report。
  - 统一 ready / missing / invalid / incompatible / blocked / unsupported summary severity。
- `HostIntegrationPackageReaderDomain`
  - 读取 package `manifest.json`。
  - 校验 manifest format / formatVersion。
  - 将 manifest artifact list 映射到 artifact read result。
  - 检查 artifact presence。
  - 对 JSON artifact 做 parse、`format`、`formatVersion` 检查。
  - 对 `source/` 做目录 presence 检查。
  - 对 CSV artifact 做文件 presence 检查。

新增测试：

- ready package 生成 `summary.result = "ready"`。
- missing required `graph/project-ir.json` 生成 `summary.result = "missing"`。
- invalid JSON `graph/project-ir.json` 生成 `summary.result = "invalid"`。

## Compatibility Notes

- `HostIntegrationPackageExportDomain` 不再保留第二套 private `CreateReadinessReport` / summary 逻辑。
- `reports/readiness-report.json` 仍保持 `format = "inscape.host-integration.readiness-report"` 与 `formatVersion = 1`。
- `boundary.runtimeIntegration`、`boundary.previewBridge`、`boundary.writesHostData`、`boundary.containsHostDependency` 继续来自 manifest capabilities，当前仍全部为 `false`。
- `hostBridgeCandidate` 仍只是 missing review evidence，不生成 candidate artifact。
- 本轮新增 `summary.incompatibleCount` 作为 additive field，用于后续 package formatVersion 检查；不改变既有 consumer 必需字段。

## Deferred To Round 3

- CLI 命令 `generate-host-integration-readiness-report-package`。
- stdout / stderr / exit code 映射。
- compiler diagnostics 与 Host Integration Audit diagnostics 聚合到 `report.diagnostics[]`。
- source ref normalization / preservation 的更完整断言。

## Round 2 Self-Check

Debug 自检：

- ready package、missing required artifact、invalid JSON artifact 已由 Internal tests 覆盖。
- existing package export 仍能生成 package，现有 CLI smoke 继续证明 deterministic。
- 还未覆盖 incompatible artifact version 与 diagnostics aggregation，按 guide 留到 Round 3。

架构自检：

- Report model 和 generator 仍归属 `Inscape.Tooling`。
- CLI 尚未新增入口；后续入口只能调用 shared Tooling domain。
- Package reader 只读 manifest / artifact 文件，不重新编译 workspace，不解析 `.inscape` source。
- `export-host-integration-package-project` 和后续独立 report CLI 将复用同一 report generator。
- 未引入 VSCode / SelfHostedEditor report 语义复制。
- 未进入 Host Bridge Candidate Generator、Static Artifact POC partner handoff、POC-2、Sinan Runtime Integration、Runtime Preview Bridge、Unity / Host SDK、generated apply、full host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## Validation

已运行并通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help export-host-integration-package-project
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project samples -o artifacts\host-integration-package-smoke
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
git diff --check
```

说明：`git diff --check` 退出码为 0；Git 对 `tests/Internal/Inscape.Tests/Entries/TestCore.cs` 输出 CRLF 提示，但不是 whitespace failure。
