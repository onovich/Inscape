# SelfHostedEditor P3 Host Integration Audit

状态：P3 Round 6 complete

最后更新：2026-06-18

## 结论

P3 Round 6 `audit-host-integration-project` 最小实现：PASS。

下一轮允许进入：YES。

下一轮目标：P3 Round 7 condition syntax contract / parser design。

## 本轮范围

- 新增 `Internal/Tooling/HostIntegrationAudit`，输出 `inscape.host-integration.audit` JSON。
- CLI 新增 `audit-host-integration-project <root> [--config inscape.config.json] [-o audit.json]`。
- Audit 在内存中串接 Usage Manifest、Host Schema capability catalog 与 Host Binding capability catalog。
- Host Binding capability catalog 现在读取 Host Bridge `actions[]` / `queries[]` handler 映射名称，并保留 legacy `events[]` 作为迁移输入。
- 当前诊断覆盖：
  - unknown query；
  - unknown action；
  - legacy event usage；
  - 参数数量不匹配；
  - 字面量类型不匹配；
  - missing Host Bridge `ids[]` 映射；
  - missing Host Bridge `actions[]` / `queries[]` handler 映射；
  - Host Schema / Host Bridge 读取错误。
- 命令默认写 stdout；传入 `-o` 时写目标 JSON 文件。

## 非目标

- 不执行 Runtime。
- 不调用宿主 query / action handler。
- 不读取或验证 Unity GUID、Bird ID、asset path 的具体语义。
- 不把 Host Bridge 或 Host Schema 依赖放进 Compiler。
- 不实现条件表达式 parser / IR。

## 架构复核

- Compiler 未引入 Host Schema、Host Bridge、Usage Manifest 或 Host Integration Audit 依赖。
- Tooling 持有跨 Usage / Schema / Bridge 的共享审计逻辑。
- CLI 只负责项目配置、源加载、调用 Tooling、stdout / `-o` 输出和 exit code。
- Host Binding JSON 解析继续集中在 `HostBindingCapabilityCatalogDomain`，避免审计工具另写 Host Bridge reader。
- VSCode 与 SelfHostedEditor 未复制 audit 逻辑；后续应消费共享 payload。

## 验证

本轮验证命令：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git -c safe.directory=D:/LabProjects/Inscape diff --check
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj --no-build -- audit-host-integration-project <temp-workspace> -o <temp>\host-integration-audit.json
```

结果：全部通过。真实 CLI smoke 在临时 workspace 上输出 `format=inscape.host-integration.audit; diagnostics=0; queries=1; actions=1; requiredIds=1`。

## 下一步

进入 P3 Round 7：收口第二版条件语法契约与 parser design，保持 `[]` 为只读 query，`@` 为动作 / 控制移交，不把表达式求值写入 VSCode、SelfHostedEditor 或 CLI。
