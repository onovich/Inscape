# SelfHostedEditor P3 Usage Manifest Contract Audit

状态：P3 Round 4 complete
日期：2026-06-18

## 结论

```text
P3 Round 4 Usage Manifest contract: PASS
Next round allowed: YES
Next round target: P3 Round 5 inspect-usage-project minimal implementation
```

本轮只定义 `inscape.usage` contract，不实现 CLI，不扫描脚本，不改 Compiler parser，不进入 Host Integration Audit 实现。

## 本轮范围

- 新增 [Usage Manifest Contract](usage-manifest-contract.md)。
- 定义顶层 JSON：`format`、`formatVersion`、`workspace`、`summary`、`queries`、`actions`、`requiredIds`。
- 定义 source location 使用 1-based `line` / `column` / `length`，编辑器显示再转换为 0-based。
- 定义 query usage、action usage、literal argument、context 枚举和 required id 推导。
- 明确 `@timeline...` 作为 `usageKind = "host-binding-hook"`，避免被误报为普通 Host Schema action 缺失。
- 明确 unknown query / action 由 Host Integration Audit 报告，Usage Manifest 不反向生成权威 Host Schema。

## 架构复核

- `Inscape.Compiler` 不读取 Usage Manifest、Host Schema 或 Host Bridge。
- Usage Manifest 归属后续 `Internal/Tooling` 共享流程；CLI 只作为命令入口。
- VSCode / SelfHostedEditor 后续只消费 shared usage / audit payload，不重新扫描或实现 parser。
- Usage `requiredIds` 只保存 Inscape 可读 ID，不保存 Unity GUID、asset path、Addressables key、Bird ID 或宿主内部 ID。
- 本轮没有提前实现 Runtime action dispatcher、完整 Save / Load、Rollback、Trace Replay、Flashback 或 Presentation IR。

## 验证

```powershell
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
```

结果：PASS。

本轮为文档 contract 收口；Round 5 进入 Tooling / CLI 实现时需要继续补 Usage Manifest 专项 Internal tests、CLI stdout / `-o` 验证和 project fixture 覆盖。

## 下一步

进入 P3 Round 5：`inspect-usage-project` 最小实现。

建议实现边界：

- 在 `Internal/Tooling` 增加 Usage Manifest model / domain。
- 在 CLI 增加 `inspect-usage-project <root> [-o usage.json]`。
- 先覆盖当前可执行语法里的 `query-interpolation`、`action-line`、`timeline-hook`；条件 context 在条件 parser 落地后接入。
- 未知 query / action 只记录 usage，不让命令失败。
