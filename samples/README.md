# Samples

本目录保存 Inscape DSL 样例。当前主样例 `court-loop.inscape` 已经扩展成一个可完整体验的小型庭审单元，用于同时验证第一版图叙事语法和预览交互：

- 显式节点：`:: court.intro`
- 对白与旁白：`角色：文本`
- 选项：`?` 与 `- 选项 -> 目标节点`
- 回环：节点可以跳回已经访问过的节点
- 项目入口：`@entry`
- 元信息：`@scene court` 暂作为不可执行 metadata 保留
- 宿主事件 / 时机：`@timeline.talking.exit court_intro`
- 查询插值：`[player.name]`、`[itemName]`
- 多阶段推进：案件概要、证言拆解、证物检查、组合反驳、供述与结案
- 可试玩反馈：正确推进分支、错误指控后的回收分支，以及结案后的重开入口

`court-loop.inscape` 是新规范样例：`@` 用于事件、动作、时机和状态变化，`[]` 用于查询、读取和文本插值。

`legacy/` 目录保存旧 inline host binding 写法的参考文本，例如 `[bg: courtroom]`、`[emotion: tense]`。这些文件使用 `.txt` 后缀，避免 `check-project samples` 把 legacy 节点作为当前项目源码一起编译。

`variants/` 目录保存同一剧情的 Yarn-like、Ink-like、Ren'Py-like 风格草案，用于比较语法哲学和映射成本。

运行示例：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli -- check samples\court-loop.inscape
dotnet run --project src\Internal\Cli\Inscape.Cli -- diagnose samples\court-loop.inscape
dotnet run --project src\Internal\Cli\Inscape.Cli -- check-project samples
dotnet run --project src\Internal\Cli\Inscape.Cli -- diagnose-project samples
dotnet run --project src\Internal\Cli\Inscape.Cli -- compile-project samples -o artifacts\samples-project.json
dotnet run --project src\Internal\Cli\Inscape.Cli -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Internal\Cli\Inscape.Cli -- preview-project samples --entry court.cross_exam.loop -o artifacts\samples-project.entry.html
dotnet run --project src\Internal\Cli\Inscape.Cli -- extract-l10n-project samples -o artifacts\l10n.csv
Copy-Item artifacts\l10n.csv artifacts\old-l10n.csv
dotnet run --project src\Internal\Cli\Inscape.Cli -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.updated.csv
dotnet run --project src\Internal\Cli\Inscape.Cli -- compile samples\court-loop.inscape -o artifacts\court-loop.json
dotnet run --project src\Internal\Cli\Inscape.Cli -- preview samples\court-loop.inscape -o artifacts\court-loop.html
```

如需在 VSCode 中验证 `.inscape` 高亮，可从仓库根目录加载本地扩展：

```powershell
code --extensionDevelopmentPath=src\Internal\VSCode\vscode-inscape .
```
