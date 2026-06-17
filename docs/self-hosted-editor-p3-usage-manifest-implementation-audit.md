# SelfHostedEditor P3 Usage Manifest Implementation Audit

状态：P3 Round 5 complete

最后更新：2026-06-18

## 结论

P3 Round 5 `inspect-usage-project` 最小实现：PASS。

下一轮允许进入：YES。

下一轮目标：P3 Round 6 `audit-host-integration-project` 最小实现。

## 本轮范围

- 新增 `Internal/Tooling/UsageManifest`，包含 `UsageManifestDomain` 与 `inscape.usage` JSON model。
- 新增 CLI 命令：`inspect-usage-project <root> [--config inscape.config.json] [-o usage.json]`。
- 命令默认写 stdout；传入 `-o` 时写目标 JSON 文件。
- 当前扫描范围限于现有语法：正文 `[]` query interpolation、`@emit` action / legacy event、`@timeline...` hook。
- 结合 Host Schema capability catalog 读取 `queries[]` / `actions[]` / legacy `events[]`，只用参数 `idKind` 推导 `requiredIds`。
- 未知 query / action 会保留为 usage 记录，不导致命令失败。
- `@timeline...` 作为 `usageKind = "host-binding-hook"` 进入 `actions[]`，并生成 `kind = "timeline"` 的 required id。
- 条件语法 context、Runtime State、Host Integration Audit 输出格式不在本轮实现范围。

## 架构复核

- Compiler 未引入 Host Schema、Host Bridge 或 Usage Manifest 依赖。
- Tooling 作为共享用例层持有 usage 扫描与 manifest 生成逻辑。
- CLI 只负责参数、stdout / `-o` 输出和 exit code。
- VSCode 与 SelfHostedEditor 未复制扫描逻辑；后续应消费 Tooling / CLI / LanguageServer 暴露的共享 payload。
- Manifest 只保存 Inscape 可读 ID，不保存 Unity GUID、Bird ID、asset path 或宿主内部 handler。

## 验证

本轮验证命令：

```powershell
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj --no-build -- inspect-usage-project samples -o <temp>\usage.json
```

结果：全部通过。真实 CLI smoke 在 `samples` 上输出 `format=inscape.usage`，并生成 query / action / required id summary。

## 下一步

进入 P3 Round 6：设计并实现 `audit-host-integration-project` 最小审计，输入 Usage Manifest、Host Schema capability catalog 与 Host Bridge binding artifact，输出 missing / unknown / parameter mismatch / bridge binding 对账结果。
