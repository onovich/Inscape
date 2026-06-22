# Host Integration Package CLI Smoke Determinism Audit

日期：2026-06-22

结论：Host Integration Package CLI Round 5 Smoke Fixtures / Determinism / Docs 已完成。

本轮在 Round 4 package assembly 之上新增真实 CLI smoke：

- [HostIntegrationPackageCliSmoke.js](host-integration-static-fixtures/HostIntegrationPackageCliSmoke.js) 会创建临时 workspace，写入 `.inscape`、Host Schema 和 Host Bridge fixture。
- smoke 真实运行 `export-host-integration-package-project <workspace> -o <out-dir>`。
- smoke 验证 required package files、JSON parse、manifest artifact status、package-relative artifact path、source copy、source-map、anchor-map、readiness report、unknown action audit、compiler diagnostic 和 output directory guard。
- smoke 对同一 workspace / 同一 output directory 重复导出并比较 package file hash，验证 byte-stable determinism。
- smoke 明确断言本阶段不生成 `host/host-bridge-candidate.json`，且 manifest / readiness boundary 继续保持 `writesHostData = false`、`runtimeIntegration = false`、`previewBridge = false`。

本轮仍复用既有 [StaticArtifactFixtureSmoke.js](host-integration-static-fixtures/StaticArtifactFixtureSmoke.js)，覆盖 Host Integration Partner Readiness 的 minimal dialogue、branching、localization、missing speaker、unknown action、unsupported feature 和 source diagnostic 静态 fixture pack。

## Round 5 Self-Check

Debug 自检：

- 最可能坏的点 1：真实 CLI package 和静态 fixture 文档分离，导致 samples 能导出但 fixture 边界没有覆盖。验证：新增 CLI smoke 创建带 Host Schema / Host Bridge 的临时 workspace，并覆盖 unknown action、missing target diagnostic 和 nested source copy。
- 最可能坏的点 2：重复导出不稳定。验证：CLI smoke 对同一 output directory 连续导出两次，比较 package 文件列表和 SHA-256。
- 最可能坏的点 3：输出目录 guard 只检查顶层文件。验证：CLI smoke 在 `host/unexpected.json` 写入未知嵌套文件后重新导出，断言命令以非 package content 错误拒绝。
- 未覆盖场景：Round 6 继续跑完整 final validation matrix 和边界扫描，并输出 PASS / FAIL final report。

架构自检：

- Smoke 只作为测试证据，不引入 Runtime、Unity、Host SDK、Sinan Runtime 或 host write。
- Package assembly 仍位于 `Inscape.Tooling`，CLI smoke 只是调用公开 CLI。
- Readiness report 仍保持静态 package presence / shape / boundary，不做 partner-specific import judgement。
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
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
git diff --check
```

边界扫描已运行：

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

结果：通过。`rg` 无命中按“无输出即边界通过”记录。
