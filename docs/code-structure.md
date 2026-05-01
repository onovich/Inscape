# 代码结构规划

状态：基线 + 草案

第一版代码目标是跑通 DSL 到 Narrative Graph IR 的主链路，并为后续 VSCode、HTML 预览和 Unity Adapter 留出边界。

具体命名、入口、生命周期式方法和渐进式重构规则见 [编码与命名规范](coding-conventions.md)。后续重构应先对齐该规范，再做小步、可验证的代码移动或重命名。

## 当前目录

```text
src/
  Inscape.Core/          DSL 解析、诊断、图模型、哈希、IR 生成与本地化提取
    Analysis/            图校验、项目级校验、锚点碰撞诊断
    Compilation/         单文件与项目级编译入口
    Diagnostics/         诊断模型
    Localization/        CSV 提取、读取、写入与旧表合并
    Model/               Narrative Graph IR 数据模型
    Parsing/             第一版手写解析器与节点命名规则
    Text/                稳定 hash 与文本规范化
  Inscape.Adapters.UnitySample/
                         实验性 Unity 样例 adapter，保留固定宿主数据结构 spike，不是最终 Host Bridge
  Inscape.Cli/           命令行工具：check、diagnose、compile、preview、l10n 与项目级命令
tests/
  Inscape.Tests/         无第三方依赖的轻量回归测试
samples/
  court-loop.inscape     图叙事与回环样例
tools/
  vscode-inscape/        VSCode 轻量语言扩展：高亮、诊断桥接、补全、snippets
  unity-bird-importer/   可复制到 Bird Unity 项目的 Editor Importer 原型
docs/
  code-structure.md      代码结构规划
```

## 分层原则

- `Inscape.Core` 不依赖 Unity、不依赖 VSCode、不依赖 HTML 渲染，也不依赖外部包。
- `Inscape.Cli` 是开发工具层，可以输出单文件 JSON IR、项目级 JSON IR、项目级诊断 JSON、单文件/项目级轻量 HTML 预览，以及本地化 CSV。
- `tools/vscode-inscape` 可以承载 VSCode 写作体验代码，但语法诊断必须通过 `Inscape.Core` 或 CLI 桥接获得。
- VSCode Language Server 后续应复用 `Inscape.Core`，而不是重新实现解析器。
- Unity Adapter 后续应消费 Narrative Graph IR，并通过 Host Schema / Host Bridge / 代码生成适配项目自己的数据结构；`Inscape.Adapters.UnitySample` 只是实验样例。
- Timeline / DirectorSystem 暂不进入 Core 的第一版模型，先作为后续调研与 Adapter 层问题。

## 入口与可读性方向

当前项目仍处于编译器 + 工具链阶段，因此没有游戏项目式的统一主循环。现有入口分散为：Core 编译入口、CLI 命令入口、VSCode 扩展入口和 HTML 预览入口。

为了让代码更接近游戏项目中的“主入口 + 生命周期”阅读习惯，后续应逐步补齐两个应用层入口：

- `InscapeProjectService`：统一项目加载、编译、诊断、索引、本地化和 source map 查询，供 CLI、VSCode 和未来 Language Server 复用。
- `NarrativeRuntime`：进入 Runtime Host 阶段后再引入，负责从 IR 启动故事、进入节点、继续、选择、回退、重启、派发宿主事件和存档恢复。

短期不要为了形式统一给 Core 增加 runtime loop；Core 仍然只负责编译和数据契约。

## 第一版 Core 能力

- 解析显式节点：`:: node.name`
- 解析对白与旁白。
- 解析选项组与选项跳转。
- 解析默认跳转：`-> target`
- 保留 `@...` 和 `[...]` 元信息为不可执行 metadata。
- 生成行级稳定 hash。
- 诊断重复节点、非法节点名、缺失目标、空节点、不可达节点和选项语法问题。
- 项目级编译合并多个 `.inscape` 文件，第一版要求节点名在项目内全局唯一，并通过 `@entry` 标记项目入口。
- 提取本地化 CSV，并按旧 CSV 中的 `anchor` 精确继承译文。

## 当前 CLI 能力

```text
单文件：
  check
  diagnose
  compile
  preview
  extract-l10n
  update-l10n

项目级：
  check-project
  diagnose-project
  compile-project
  preview-project
  extract-l10n-project
  update-l10n-project
  export-unity-sample-binding-template
  export-unity-sample-role-template
  export-unity-sample-project
  merge-unity-sample-l10n
```

项目级命令支持 `--entry node.name` 临时覆盖项目入口，用于从任意节点编译、诊断和预览。它不修改源文件中的 `@entry`。

`export-unity-sample-binding-template` 会扫描项目内 Timeline Hook，生成 `--unity-sample-binding-map` 模板；可用 `--unity-sample-existing-timeline-root` 扫描样例 Timeline `.asset` 与 `.meta`，辅助填入样例 ID、Unity guid 和 asset path。

`export-unity-sample-project` 会输出 `unity-sample-manifest.json`、`L10N_Talking.csv`、`inscape-unity-sample-l10n-map.csv` 和 `unity-sample-export-report.txt`。它保留一套硬编码宿主数据形状，用于验证 adapter 流程和未来生成器测试；不要把它当成最终 Host Bridge 契约。

项目级 UnitySample 命令会自动读取项目根目录的 `inscape.config.json` 中的 `unitySample` 配置，用于提供 `roleMap`、`bindingMap`、`existingRoleNameCsv`、`existingTimelineRoot`、`existingTalkingRoot` 和 `talkingIdStart` 默认值。命令行参数仍可覆盖配置值。配置读取暂放在 CLI 层，避免 `Inscape.Core` 过早承担工程环境路径管理。

`tools/unity-bird-importer` 提供 Unity Editor Importer 原型脚本。该脚本不进入 .NET solution；使用时复制到 Bird 项目的 `Assets/Editor/`，读取 `bird-manifest.json` 并生成或更新 `TalkingSO`。

项目级扫描会忽略 `.git`、`bin`、`obj`、`node_modules` 和 `artifacts`。VSCode 诊断桥接依赖 `diagnose-project --override source temp`，未来 WebView 和本地化命令也应优先复用项目级 CLI。

## 后续预留目录

```text
src/
  Inscape.LanguageServer/    VSCode LSP，待创建
  Inscape.Preview/           HTML 预览共享包，待创建
  Inscape.UnityAdapter/      Unity/Bird 适配层，待创建
```
