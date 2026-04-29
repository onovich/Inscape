# Inscape

内景（Inscape）是一套面向叙事驱动型游戏，尤其是视觉小说的 DSL 与配套开发环境。它把剧本文本、逻辑控制、本地化锚点和运行时指令流放在同一条创作链路里，让创作者尽量接近自然写作，让开发者保留确定、可回溯、可自动化的工程结构。

> 叙事，是意识在数字时空中的精准折射。

## 当前状态

项目处于第一阶段：DSL 与轻工具链已经形成可运行原型，Unity/Bird 适配已有无 Unity 依赖的导出原型。以下方向已经作为项目基线记录：

- 文即代码：剧本行即逻辑行，减少剧本与配置之间的跳转。
- 确定性哈希：解析阶段为文本生成持久化锚点，用于本地化、存档与热重载定位。
- 图叙事优先：块级叙事单元使用显式节点名组织图结构，行级文本使用隐式哈希锚点。
- 单流控制：运行时状态通过单向数据流更新，降低全局单例和隐式副作用。
- 先 Unity，后独立：前期适配 Unity 宿主，后期保留迁移到独立渲染层或 Bevy 等技术栈的空间。

当前已经实现：

- C# Compiler Core：解析 `.inscape`，输出 Narrative Graph IR 与诊断。
- 项目级编译：跨文件节点合并、全局节点唯一性、`@entry` 项目入口、跨文件跳转诊断。
- 项目级入口覆盖：`--entry node.name` 可临时从任意节点编译或预览。
- VSCode 轻工具链：高亮、snippets、诊断桥接、节点补全、Outline、跳转定义、引用查找和 Hover。
- VSCode 本地化命令：导出项目 CSV，基于旧 CSV 更新项目本地化表。
- HTML 调试预览：单文件/项目级预览、节点跳转、选择、回环、路径、Restart/Back 和锚点显示。
- 本地化工具：CSV 提取、旧表按锚点精确继承、`current/new/removed` 状态标记。
- Bird 导出原型：生成 `bird-manifest.json`、Bird 兼容 `L10N_Talking.csv`、锚点映射表和导出报告，支持角色 / 宿主资源绑定 CSV 与 Timeline Hook manifest。

以下内容尚未定稿，需要在后续设计讨论中明确：

- DSL 的完整语法、错误恢复策略和分支表达能力。
- 编辑器的核心交互、调试体验、可视化范围与实时预览协议。
- 哈希锚点的迁移策略，尤其是节点重命名、重复文本插入、文本微调时的对齐规则。
- Unity 版本、解析器方案、运行时管线和插件扩展边界。

## 文档入口

- [文档索引](docs/README.md)
- [Agent 接手指南](docs/agent-handoff.md)
- [项目立项说明](docs/project-brief.md)
- [架构草案](docs/architecture.md)
- [代码结构规划](docs/code-structure.md)
- [DSL 生态定位对比](docs/dsl-ecosystem-positioning.md)
- [语法样例对比](docs/syntax-comparison.md)
- [DSL 语言设计草案](docs/dsl-language.md)
- [VSCode 轻工具链](docs/vscode-tooling.md)
- [编辑器设计草案](docs/editor-design.md)
- [运行时与 Unity 宿主](docs/runtime-unity.md)
- [Bird / Unity 调研记录](docs/bird-unity-research.md)
- [Bird Adapter 原型](docs/bird-adapter.md)
- [Unity Editor Importer 草案](docs/unity-editor-importer.md)
- [哈希锚点与本地化](docs/hash-localization.md)
- [本地化提取](docs/l10n-extraction.md)
- [路线图](docs/roadmap.md)
- [TODO](docs/todo.md)
- [待确认问题](docs/open-questions.md)
- [架构决策记录](docs/adr/README.md)

## 开发入口

当前第一版代码提供 DSL 解析、图 IR 输出、诊断、CLI 和轻量 HTML 预览。

```powershell
dotnet restore src\Inscape.Cli\Inscape.Cli.csproj --configfile NuGet.Config
dotnet restore tests\Inscape.Tests\Inscape.Tests.csproj --configfile NuGet.Config
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check samples\court-loop.inscape
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose samples\court-loop.inscape
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose-project samples
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- compile-project samples -o artifacts\samples-project.json
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples --entry court.cross_exam.loop -o artifacts\samples-project.entry.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
Copy-Item artifacts\l10n.csv artifacts\old-l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.updated.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-binding-template samples -o artifacts\bird-bindings.template.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples -o artifacts\bird-export
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- compile samples\court-loop.inscape -o artifacts\court-loop.json
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview samples\court-loop.inscape -o artifacts\court-loop.html
code --extensionDevelopmentPath=tools\vscode-inscape .
```

## 仓库约定

文档默认使用中文撰写。文件名使用英文小写与连字符，便于跨平台工具链、链接和自动化脚本处理。

项目目前优先沉淀设计文档，不急于锁死实现细节。凡是语法、编辑器交互、运行时协议还没有共识的地方，应明确标注为“待确认”或“候选方案”，避免把早期假设伪装成规范。
