# Samples

本目录保存 Inscape DSL 样例。当前样例用于验证第一版图叙事语法：

- 显式节点：`:: court.intro`
- 对白与旁白：`角色：文本`
- 选项：`?` 与 `- 选项 -> 目标节点`
- 回环：节点可以跳回已经访问过的节点
- 元信息：`@scene court` 暂作为不可执行 metadata 保留

运行示例：

```powershell
dotnet run --project src\Inscape.Cli -- check samples\court-loop.inscape
dotnet run --project src\Inscape.Cli -- compile samples\court-loop.inscape -o artifacts\court-loop.json
dotnet run --project src\Inscape.Cli -- preview samples\court-loop.inscape -o artifacts\court-loop.html
```
