# Host Integration Package CLI Source Map Report Audit

日期：2026-06-22

结论：Host Integration Package CLI Round 4 Source Copy / Source Map / Anchor Map / Minimal Report 已完成。

本轮在 Round 3 existing artifact assembly 之上，把静态 package 补齐到可由外部 partner 读取源位置和最小 readiness 状态的形态：

- `source/*.inscape`
- `source-map/source-locations.json`
- `localization/anchor-map.json`
- `reports/readiness-report.json`

实现边界：

- source copy 使用 workspace-relative path 写入 package `source/`，manifest / report / source-map / anchor-map 只记录 package-relative path。
- `localization/l10n.csv` 中的 `sourcePath` 同步改写为 package source path，避免泄露本机绝对路径。
- `source-map/source-locations.json` 使用 `compiler-1-based` 坐标，记录 package source、workspace path、graph-node 与 localization-row location。
- `localization/anchor-map.json` 把 localization anchor 连接回 `localization/l10n.csv`、`source/*.inscape` 和 `graph/project-ir.json`；line identity 当前按 `missing` 明确标注，留给后续独立阶段。
- `reports/readiness-report.json` 只报告本次 package assembly 的 artifact presence / shape / static boundary；不做 partner-specific import 判断，不生成 Host Bridge candidate，不写宿主数据。
- CLI 入口仍只传入 workspace、`--config` 和 `-o`，package assembly 位于 `Inscape.Tooling` shared domain。

## Manifest Status

Round 4 导出后，manifest status 分界如下：

| Artifact | Status |
| --- | --- |
| `manifest.json` | `ready` |
| `source/` | `ready` |
| `graph/project-ir.json` | `ready` |
| `usage/usage.json` | `ready` |
| `host/host-schema-capabilities.json` | `ready` |
| `host/host-integration-audit.json` | `ready` |
| `localization/l10n.csv` | `ready` |
| `localization/anchor-map.json` | `ready` |
| `source-map/source-locations.json` | `ready` |
| `reports/readiness-report.json` | `ready` |

`host/host-bridge-candidate.json` 本轮仍不生成。

## Round 4 Self-Check

Debug 自检：

- 最可能坏的点 1：source ref 无法从 report / graph / localization 回到 package source path。验证：CLI 测试断言 `localization/l10n.csv`、source-map 和 anchor-map 均使用 `source/story.inscape`。
- 最可能坏的点 2：重复导出留下旧 source 或嵌套未知文件。验证：输出目录 guard 递归只允许当前 package-owned 文件，CLI 测试继续断言 `graph/unexpected.json` 会被拒绝。
- 最可能坏的点 3：readiness report 被误写成完整 partner readiness 判断。验证：报告只汇总 artifact checks 和 boundary flags，并明确 `writesHostData = false`、`runtimeIntegration = false`、`previewBridge = false`。
- 未覆盖场景：Round 5 继续补 package CLI smoke、determinism 和 boundary scan；本轮 smoke 仍以 Internal CLI 测试和 samples package export 为主。

架构自检：

- Compiler 仍负责 graph / source location truth，Tooling 负责 package assembly。
- 没有在 CLI、VSCode 或 SelfHostedEditor 复制 package assembly 语义。
- Readiness report 保持静态 package 视角，没有做 partner-specific import 判定。
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
