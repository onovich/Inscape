# UnitySample Adapter 实验样例

状态：实验样例

最后更新：2026-05-01

本文记录 `Inscape.Adapters.UnitySample` 的定位。它是从早期 Unity 项目适配 spike 中拆出的样例 adapter，用于保留当前验证过的导出、L10N、宿主绑定和 hook 流程，但不代表最终可复用的 Unity 桥接方案。

## 定位

`Inscape.Adapters.UnitySample` 只用于验证这些问题：

- Project IR 能否转换成宿主可消费的 manifest。
- 角色名、资源别名、Timeline / 宿主事件别名能否通过绑定表解析。
- 本地化导出、锚点映射和旧表合并是否能形成审查流程。
- 宿主 hook 的 phase、目标 talking 和缺失绑定 warning 是否足够支撑后续 importer 试验。

它不应该被视为：

- `Inscape.Core` 的一部分。
- 通用 Unity Runtime Host。
- 最终 Host Bridge 格式。
- 对任意项目数据结构都可直接复用的 adapter。

## 为什么不是最终方案

当前样例仍硬编码了一套宿主侧数据形状，例如：

- `talkingId` / `roleId`。
- `L10N_Talking.csv`。
- `unitySampleId` / `unityGuid` / `addressableKey` / `assetPath` 绑定表。
- Timeline asset 扫描规则。
- `unity-sample-manifest.json` 的具体字段。

真实项目可能使用完全不同的 ID、资源系统、对话结构、本地化表、事件处理器或运行时数据格式。因此这些类型只能作为 adapter 需求样本和测试夹具，不能成为 Inscape 的通用桥接契约。

## 长期方向

长期方案应拆成三层：

1. Host Schema：声明项目提供哪些查询、事件、资源类型和参数。
2. Host Bridge：把 Inscape 可读 ID 映射到项目内部 ID、资源坐标、事件处理器和查询实现。
3. Adapter Generator：根据 schema / bridge / 项目约定生成或配置具体 adapter，而不是手写固定数据结构。

UnitySample 后续可以继续保留为 generator 的回归样例：当 Host Bridge 草案成形后，用它验证“同样的输出能否由配置和代码生成得到”。

## 当前 CLI

当前样例命令使用小写连字符命名：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-role-template samples -o config\unity-sample-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-binding-template samples -o config\unity-sample-bindings.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-project samples --unity-sample-role-map config\unity-sample-roles.csv --unity-sample-binding-map config\unity-sample-bindings.csv -o artifacts\unity-sample-export
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- merge-unity-sample-l10n artifacts\unity-sample-export\L10N_Talking.csv --from existing-L10N_Talking.csv --report artifacts\unity-sample-export\L10N_Talking.merge-report.csv -o artifacts\unity-sample-export\L10N_Talking.merged.csv
```

输出文件：

```text
unity-sample-manifest.json
L10N_Talking.csv
inscape-unity-sample-l10n-map.csv
unity-sample-export-report.txt
```
