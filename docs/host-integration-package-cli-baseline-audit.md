# Host Integration Package CLI Baseline Audit

日期：2026-06-22

状态：Round 1 baseline / command contract；执行指南见 [Host Integration Package CLI Goal 模式执行指南](host-integration-package-cli-goal-mode-execution-guide.md)。

## 结论

Round 1 已确认 `export-host-integration-package-project <workspace> -o <out-dir>` 的命令契约和现有复用面。当前代码只注册命令、help、commands 与 skeleton guard；package assembly 从 Round 2 开始在 `Inscape.Tooling` shared domain 中落地。

本轮没有生成 `manifest.json`，没有复制 source，没有写 package artifact，也没有实现 Host Bridge candidate generator、generated apply、Sinan Runtime Integration、Runtime Preview Bridge、Unity / Host SDK、完整 host save、Rollback / Trace Replay / Flashback、Presentation IR 或 Host Schema action policy 扩张。

## 命令契约

目标命令：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project <workspace> [--config inscape.config.json] -o <out-dir>
```

参数：

- `<workspace>`：项目根目录，必须存在。
- `--config inscape.config.json`：可选，沿用现有项目级命令配置读取规则；相对路径按配置所在目录解析。
- `-o <out-dir>`：必填，表示 package 输出目录。

Round 1 skeleton 行为：

- `commands` 和 `help export-host-integration-package-project` 已能发现命令。
- 缺少 `<workspace>` 时沿用顶层 usage error。
- `<workspace>` 不存在时返回 `3` 并报告 `Project root not found`。
- 缺少 `-o` 时返回 `2` 并报告 `requires -o <out-dir>`。
- `-o` 指向文件时返回 `2`，不尝试覆盖文件。
- `-o` 指向目录路径时，本轮返回 `2` deferred implementation，不创建目录、不写任何文件。

Round 2 起需要固定输出目录策略。推荐：

- 输出目录不存在时创建。
- 输出目录存在且为空时允许写入。
- 输出目录存在且包含非 package-owned 文件时默认拒绝，后续若需要覆盖必须显式参数批准。
- 所有 artifact path 写入 manifest / report 时使用 `/` 分隔的 package-relative path，不暴露本机绝对路径。

## 现有 CLI 分发审计

当前入口：

- `CliCore.Main`：只负责 stdout encoding、顶层命令、项目命令 / 单文件命令分发、通用 `-o` / `--from` 读取。
- `CliTopLevelCommand`：负责 `help`、`commands` 和无 workspace 的顶层命令。
- `CliCommandProvider`：命令目录、category、usage、example、help 文本。
- `CliStoryGraphCommand`：项目级命令分发和当前仍停留在 CLI 层的项目编排。

Round 1 仅在 `CliCommandProvider` 和 `CliStoryGraphCommand` 注册 skeleton。Round 2 不应继续把 package assembly 字符串拼接堆进 `CliStoryGraphCommand`；CLI 入口应只做参数解析、调用 Tooling domain、stdout/stderr 与退出码映射。

## 可复用 Tooling / Compiler 面

Package CLI 应复用这些现有共享能力：

- `DslScriptSourcesLoaderDomain`：项目 `.inscape` 源发现、读取、ignore 规则与 override 口径。
- `ToolConfigReaderDomain`：`inscape.config.json` 读取和 `hostSchema` / `hostBridge` / `nodeMap` / localization line map 解析。
- `StoryGraphCompilerDomain`：Compiler truth，产出 project graph / diagnostics / source spans；package command 不重写 parser 或 graph 语义。
- `UsageManifestDomain`：生成 `usage/usage.json` 的共享 usage model。
- `HostSchemaCapabilityCatalogDomain`：生成 `host/host-schema-capabilities.json` 的 Host Schema capability catalog。
- `HostBindingCapabilityCatalogDomain`：读取 confirmed Host Bridge capability catalog，供 audit 和后续 manifest status 使用。
- `HostIntegrationAuditDomain`：生成 `host/host-integration-audit.json` 的 shared audit model。
- `LocalizationCsvFlowDomain`：生成 `localization/l10n.csv`。
- `LocalizationLineMapReaderDomain` / `LocalizationLineMapRefreshDomain`：后续可为 `localization/anchor-map.json` 和 source-map 提供 line identity signal，但 Round 2 不应强制依赖它。

## 不得复制的语义

- 不在 CLI command handler 中重新扫描 Host Schema JSON shape。
- 不在 CLI command handler 中重新实现 Usage Manifest、Host Integration Audit、Localization anchor 或 Compiler source map 规则。
- 不通过“CLI 调 CLI”的方式拼装 artifact。
- 不让 VSCode / SelfHostedEditor 复制 package assembly 语义；后续宿主 UI 只能消费 shared Tooling output。
- 不把 Sinan / Bird / Unity / Addressables / ScriptableObject 依赖引入 `src/Internal`。

## Required Artifact Contract

本阶段最终 package 至少包含：

```text
manifest.json
source/*.inscape
graph/project-ir.json
usage/usage.json
host/host-schema-capabilities.json
host/host-integration-audit.json
localization/l10n.csv
localization/anchor-map.json
source-map/source-locations.json
reports/readiness-report.json
```

`host/host-bridge-candidate.json` 本阶段不自动生成。若未来允许复制外部 candidate artifact，必须是显式输入、静态复制和 manifest 登记，不得生成候选、不写 confirmed Host Bridge、不写宿主数据。

## Round 1 Self-Check

Debug 自检：

- 命令不存在：已通过 `commands` / `help` 测试覆盖，命令现在可发现。
- 输出目录缺失：skeleton 返回 `2` 并报告 `requires -o <out-dir>`。
- workspace 不存在：沿用项目级命令 `Project root not found`，返回 `3`。
- workspace 有诊断错误：Round 1 只注册 skeleton，Round 3 package assembly 时必须明确是 fail package、blocked report，还是拒绝写出。
- 输出目录覆盖策略：已在本文固定推荐策略，Round 2 writer 必须落实。

架构自检：

- Compiler 仍是 graph/source truth。
- 本轮没有在 CLI 入口复制 parser、graph、usage、audit、localization 或 source-map 语义。
- 后续 package assembly owner 明确为 `Inscape.Tooling` shared domain。
- VSCode / SelfHostedEditor 未新增 package assembly 语义。
- Sinan / Unity / Bird 未进入 `src/Internal`。
- 本轮未引入 forbidden deferred scope。

验证：

- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- `dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands`
- `dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help export-host-integration-package-project`
- `git diff --check`
