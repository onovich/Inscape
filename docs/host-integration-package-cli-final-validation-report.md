# Host Integration Package CLI Final Validation Report

日期：2026-06-22

结论：`Host Integration Package CLI: PASS`

Host Integration Package CLI 阶段已完成 6 轮目标：`export-host-integration-package-project <workspace> -o <out-dir>` 现在可导出静态 Host Integration Package，并复用 `Inscape.Tooling` / Compiler 既有 artifact，不在 CLI、VSCode 或 SelfHostedEditor 复制 package assembly 语义。

## Scope Result

已完成：

- CLI command 已进入 `commands` / `help`。
- Package 导出包含 `manifest.json`、`source/`、`graph/project-ir.json`、`usage/usage.json`、`host/host-schema-capabilities.json`、`host/host-integration-audit.json`、`localization/l10n.csv`、`localization/anchor-map.json`、`source-map/source-locations.json` 与 `reports/readiness-report.json`。
- `manifest.json` artifact index 全部 package-relative，且 required artifact 已标记为 `ready`。
- source copy、source-map、anchor-map 和最小 readiness report 已完成。
- `HostIntegrationPackageCliSmoke.js` 覆盖真实 CLI package export、artifact parse / structure、unknown action audit、compiler diagnostic、重复导出 byte-stable determinism 和 nested output guard。
- readiness report 明确保持静态 package 视角，`writesHostData = false`。

未进入范围：

- 未实现 Host Bridge candidate generator。
- 未实现 generated apply。
- 未进入 Sinan Runtime Integration、Runtime Preview Bridge、Unity / Host SDK 或完整 host save。
- 未实现 Rollback / Trace Replay / Flashback。
- 未实现 Presentation IR。
- 未扩张 Host Schema action policy，例如 `rollbackPolicy`、`replayPolicy`、`failurePolicy` 或 `timeoutPolicy`。

## Validation Matrix

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
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git diff --check
```

结果：PASS。

## Boundary Scans

已运行：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

结果：四条扫描均无输出。`rg` 无命中返回 exit code 1，此处按“无输出即边界通过”记录。

## Self-Check

Debug 自检：

- package 可从真实 workspace 导出，samples smoke 和临时 fixture smoke 均通过。
- repeated export 已由 smoke 证明 byte-stable。
- output directory guard 已覆盖 nested unknown file。
- unknown action 保留在 Usage / Host Integration Audit，不被 CLI 修正或生成 handler。
- compiler diagnostic 保留在 `graph/project-ir.json`，source-map / anchor-map 提供 package source path。

架构自检：

- Compiler 仍是 graph / source truth。
- Tooling 承载 package assembly；CLI 只做参数、调用和 exit/stdout/stderr 映射。
- VSCode / SelfHostedEditor 没有复制 package assembly。
- Sinan / Unity / Bird 没有进入 `src/Internal`。
- 本阶段没有引入 deferred scope 或 host-specific hard dependency。

## Next Direction Gate

下一候选方向必须由用户批准，不能自动进入：

- Host Bridge Candidate Generator
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
