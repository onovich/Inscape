# SelfHostedEditor P3 Host Schema Compatibility Audit

状态：P3 Round 3 complete
日期：2026-06-18

## 结论

```text
P3 Round 3 Host Schema Tooling / CLI / LanguageServer compatibility: PASS
Next round allowed: YES
Next round target: P3 Round 4 Usage Manifest contract
```

本轮把 Host Schema capability consumption 从 legacy `events[]` 主路径迁到 P3 `actions[]` 主路径，同时保留 `events[]` 作为 deprecated 兼容输入。该收口不改变 Compiler 语义，不实现 Runtime action dispatcher，也不把 Host Bridge、Unity、Bird 或具体项目 ID 放进 `Internal`。

## 本轮范围

- 新增 `HostSchemaActionReaderDomain`，读取 `actions[]`、归一化 `mode` / `idKind` / parameters / source location，并去重同名 action。
- `HostSchemaCapabilityCatalogDomain` 统一组合 `queries[]`、`actions[]`、legacy `events[]`，供 CLI、LanguageServer、VSCode 和 SelfHostedEditor 复用。
- CLI `inspect-host-schema-project` 和 LanguageServer `--host-schema-capabilities-project` 继续输出 `inscape.host-schema.capabilities`，payload 明确区分 query、action 和 legacy event。
- VSCode `Inscape: Show Host Schema Capabilities`、`[]` query hints 和 `@emit` hints 消费 shared capability catalog，不在 JS 侧解析 Host Schema JSON；`@emit` 优先使用 `actions[]`，legacy event 仅作兼容候选。
- SelfHostedEditor Host Schema bridge、Host workbench view、completion 和 hover 消费同一 LanguageServer capability catalog；浏览器侧只做 model mapping 和 UI rendering。

## Legacy 兼容

- `events[]` 仍由 `HostSchemaEventReaderDomain` 读取，并在 capability payload 中标记 `isLegacy: true`。
- VSCode / SelfHostedEditor 在 `@emit` completion / hover 中显示 legacy event，但文案明确提示新 P3 能力应写入 `actions[]`。
- 如果 `actions[]` 和 `events[]` 有同名项，编辑器候选以 action 为准，避免旧事件覆盖新动作。

## 架构复核

- `Inscape.Compiler` 未依赖 Host Schema，也未新增 Unity / VSCode / HTML / third-party 依赖。
- Host Schema reader 和 capability catalog 留在 `Internal/Tooling`；CLI 与 LanguageServer 只做入口和输出适配。
- VSCode 与 SelfHostedEditor 不重复实现 schema reader，不直接解析 Host Schema JSON；它们只消费 shared capability payload。
- Host Bridge 继续承担 Inscape 可读 ID 到宿主 ID / 资源 / handler / query implementation 的映射；Host Schema 不承载 Unity GUID、asset path、Addressables key、Bird ID 或具体业务 ID。

## 验证

```powershell
dotnet build Inscape.slnx --no-restore
```

结果：PASS，0 warnings / 0 errors。

```powershell
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

结果：PASS，覆盖 action reader、legacy event marker、CLI capability JSON 和 LanguageServer Host Schema capability payload。

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

结果：PASS。

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

结果：PASS。`check:structure` 仍报告既有 SelfHostedEditor hard-coded color token hardening 提示，但命令退出码为 0，非本轮阻塞项。

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj --no-build -- inspect-host-schema-project <temp-workspace>
```

结果：PASS，真实 CLI payload 同时包含 `queries=1`、`actions=1`、`legacyEvents=1`，且 legacy event 输出 `isLegacy: true`。

```powershell
git -c safe.directory=D:/LabProjects/Inscape diff --check
```

结果：PASS。

## 下一步

进入 P3 Round 4：Usage Manifest contract。下一轮应只定义脚本需求清单的最小 contract，不把 Usage Manifest 当成权威 Host Schema，不提前实现完整 Host Integration Audit、Runtime action dispatcher、Save / Load、Rollback、Trace Replay 或 Flashback。
