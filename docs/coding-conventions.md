# 编码与命名规范

状态：草案

最后更新：2026-05-01

本文用于把 Inscape 的代码组织成更接近游戏项目可读经验的形态：有清晰入口、有生命周期式流程、有稳定数据契约，并且避免工具层、表现层和业务适配层互相污染。

目标不是一次性重命名全仓库，而是为后续小步重构提供判断标准。

## 总体原则

- 先让入口清楚，再让实现细节分散。
- 先定义行为契约，再选择具体 API。
- 先区分数据、逻辑、表现、控制、适配，再决定类名和目录。
- 不为“看起来统一”做大规模机械重命名；每次重构必须保持已有测试和作者体验不回归。
- `Inscape.Core` 是语义真相；CLI、VSCode、Preview、Adapter 都只能消费或编排 Core 能力。

## 分层命名

### Core 层

Core 只表达 DSL、IR、诊断、source map、本地化、图结构等通用能力。

推荐后缀：

- `Compiler`：从源文本或项目源生成编译结果，例如 `InscapeCompiler`、`ProjectCompiler`。
- `Parser`：只负责把文本识别为结构，不做跨文件语义和宿主业务判断。
- `Validator`：检查已经生成的数据结构，输出 diagnostics，不修改模型。
- `Resolver`：把引用、入口、目标、source location 等关系解析成确定结果。
- `Builder`：从中间结构构造 IR、索引或 catalog。
- `Catalog` / `Index`：可查询的数据集合，例如节点索引、本地化条目集合。
- `Result`：一次操作的输出，通常包含数据和 diagnostics。
- `Options`：调用参数，不持有执行逻辑。
- `Context`：一次执行过程中的只读或短生命周期上下文，避免成为全局杂物箱。

避免：

- 在 Core 中使用 `Unity`、`VSCode`、`Html`、`Bird`、`Addressables` 等宿主或表现层词汇。
- 用 `Manager` 包含多个不相干职责。
- 让 `Model` 类反向调用 parser、CLI、文件系统或 VSCode API。

### CLI 层

CLI 是工具编排层，不是语义层。

推荐命名：

- `Command`：一个用户可调用命令的处理单元。
- `CommandOptions`：命令行参数解析后的数据。
- `CommandResult`：命令执行结果和退出码。
- `OutputWriter`：把 Core 结果写成 JSON、CSV、HTML 或报告。
- `ProjectLocator` / `ConfigLoader`：文件系统与配置读取。

约束：

- CLI 可以读写文件、解析参数、选择输出格式。
- CLI 不新增 DSL 语义；如果发现需要新增语义，应回到 Core。
- CLI 中的长 `switch` / `if` 命令分发应逐步收敛为命令表或独立 command 类。

### VSCode / Tooling 层

VSCode 是作者体验层，应按编辑器 API 职责拆分。

推荐后缀：

- `Provider`：对应 VSCode provider，例如 definition、hover、completion、reference。
- `Command`：命令面板、菜单或快捷键动作。
- `Bridge`：连接两个系统的交互，例如 source editor 与 preview webview。
- `WorkspaceIndex`：工作区轻量索引；未来可由 Language Server 替代。
- `DecorationController`：只管理视觉 decorations。
- `PreviewPanel` / `PreviewController`：只管理预览 webview 生命周期。
- `StyleLoader`：只读取和规范化样式配置。

约束：

- Provider 负责“编辑器如何理解当前位置”，Command 负责“用户动作执行什么”，Bridge 负责“两个界面如何同步”。
- 不用样式层修正 provider 语义错误。
- 不在 VSCode 中重写 Core parser；轻量扫描只能作为 authoring hint。

### Preview 层

Preview 是表现和调试层，不是运行时语义源。

推荐命名：

- `Renderer`：把 IR 渲染成 HTML、webview 内容或 UI 数据。
- `Player`：只负责在预览中推进节点、选择、Back、Restart。
- `RevealPayload`：源码与预览互相定位的数据契约。
- `PreviewState`：当前节点、路径、诊断显示状态等。

约束：

- Preview 读取 IR 和 source map，不解析 `.inscape` 源文本。
- Preview 可以模拟阅读流程，但不能定义最终 Runtime Host 的业务语义。

### Adapter / Host 层

Adapter 负责项目绑定，不反向污染 Core。

推荐后缀：

- `Adapter`：把 Inscape 数据映射到某个宿主或样例格式。
- `Importer`：把 Inscape 产物导入宿主项目。
- `Exporter`：把 Inscape 产物导出为外部格式。
- `Bridge`：Inscape 可读 ID 与项目内部 ID、资源、事件、查询之间的映射层。
- `Binding`：单个宿主资源、事件或查询的映射项。
- `Manifest`：跨工具传递的导入 / 导出契约数据。

约束：

- `UnitySample` 和 Bird 只能作为样例或适配包，不应进入 Core 命名。
- Host Bridge 应以数据配置和代码生成驱动，而不是把项目内部 ID 写死在 DSL 或 Core 中。

### Runtime 层（未来）

当 roadmap 进入 Runtime Host 或独立运行时，应引入游戏项目更熟悉的生命周期式入口。

推荐命名：

- `NarrativeRuntime`：运行时总入口，加载 IR 并持有执行状态。
- `StoryPlayer`：推进当前叙事流。
- `RuntimeContext`：运行时依赖、宿主查询、事件发送、资源访问上下文。
- `RuntimeState`：可存档、可回放的叙事状态。
- `HostEventDispatcher`：把 Inscape 事件派发给宿主。
- `StateStore` / `Reducer`：集中管理状态变更。

推荐生命周期方法：

```text
Initialize()
LoadProject() / LoadGraph()
Start(entry)
EnterNode(nodeId)
Continue()
Choose(optionId)
ExitNode(nodeId)
DispatchHostEvent(event)
SaveState()
RestoreState(snapshot)
Dispose()
```

约束：

- 不在 Core 编译阶段引入 runtime loop。
- Runtime 只消费 IR，不直接解析脚本。
- 状态变更集中进入 store / reducer，不允许任意系统直接改写运行时状态。

## 入口命名

为了让代码更接近游戏项目的“主入口 + 生命周期”阅读习惯，后续建议逐步补齐以下应用层入口：

```text
InscapeProjectService
  LoadProject()
  Compile()
  Diagnose()
  BuildIndex()
  ExtractLocalization()
  UpdateLocalization()

InscapePreviewService
  BuildPreview()
  RevealSource()
  RevealPreview()

NarrativeRuntime
  Initialize()
  Start()
  Continue()
  Choose()
  Back()
  Restart()
  Dispose()
```

短期优先补 `InscapeProjectService`，用于统一 CLI、VSCode、未来 Language Server 对项目编译、诊断、索引和本地化的调用方式。中长期再补 `NarrativeRuntime`，用于 Unity Runtime Host 和独立编辑器实时预览。

## 数据与逻辑分层

数据类应尽量保持可序列化、可比较、可缓存：

- `NarrativeDocument`
- `NarrativeNode`
- `NarrativeLine`
- `NarrativeChoice`
- `NarrativeEdge`
- `Diagnostic`
- `SourceLocation`
- `LocalizationEntry`
- `HostBinding`
- `PreviewState`

逻辑类应使用动词或职责后缀：

- `Parse...`
- `Compile...`
- `Validate...`
- `Resolve...`
- `Build...`
- `Render...`
- `Export...`
- `Import...`
- `Merge...`

判断标准：如果一个类既保存长期数据，又读文件、调用 CLI、更新 UI、派发事件，基本就应该拆分。

## 控制与业务分层

控制层负责流程编排，业务适配层负责宿主语义，二者不要混在一起。

- `Controller` / `Service`：可以编排多个步骤，但不应知道 Bird 具体字段。
- `Adapter` / `Bridge`：可以知道 UnitySample 或 Bird 绑定格式，但不应重新解释 DSL。
- `Renderer`：可以决定显示方式，但不应决定节点是否有效。
- `Provider`：可以决定编辑器当前位置提供什么体验，但不应修改编译结果。

## C# 命名规范

- 类型、方法、属性、公共字段使用 `PascalCase`。
- 局部变量、参数使用 `camelCase`，避免单字母变量。
- 私有字段如确需字段化，使用 `_camelCase`。
- 异步方法以 `Async` 结尾。
- 布尔属性或方法使用 `Is`、`Has`、`Can`、`Should` 开头。
- 集合命名使用复数或语义集合名，例如 `nodes`、`diagnostics`、`entries`、`nodeIndex`。
- 文件名与主要 public 类型同名。
- 一个文件优先承载一个主要类型；测试辅助类型可例外。

## JavaScript / VSCode 命名规范

- 函数和变量使用 `camelCase`。
- 类和构造函数使用 `PascalCase`。
- 常量使用 `UPPER_SNAKE_CASE` 仅限真正全局常量；普通不可变局部仍用 `camelCase`。
- VSCode 命令 ID 使用 `inscape.<verb><Object>`，例如 `inscape.openPreview`、`inscape.revealInPreview`。
- Provider 类以 `Inscape...Provider` 命名。
- Bridge / Controller / Loader 按职责命名，不用 `helper`、`util` 承载核心流程。

## 测试命名规范

当前测试是无第三方依赖的轻量 runner，后续可按领域拆分文件，但测试名应继续保持行为描述：

```text
ProjectCompilerResolvesCrossFileTargets
CliDiagnoseProjectAppliesOverride
PreviewRevealKeepsSourceLocation
UnitySampleExporterReportsUnresolvedHostHooks
```

原则：

- 测试名描述行为，不描述实现细节。
- 新功能必须补“新增行为 + 旧行为不回归”的测试或手测清单。
- 编辑器交互无法自动化时，应在文档中记录可重复手测步骤。

## 渐进式重构顺序

1. 先建立规范和文档索引，不改行为。
2. 拆分测试文件，降低阅读门槛。
3. 拆分 CLI command 分发，避免 `Program.cs` 继续膨胀。
4. 拆分 VSCode extension：providers、commands、preview bridge、style、workspace index。
5. 引入 `InscapeProjectService`，统一 CLI / VSCode / Language Server 的项目级调用。
6. 统一 source map / reveal payload，支撑预览、诊断、跳转、本地化和未来编辑器三视图。
7. 设计 Host Bridge 数据模型，用配置和代码生成逐步替代 UnitySample 硬编码。
8. 进入 Runtime Host 阶段后，再引入 `NarrativeRuntime` 和生命周期式执行模型。

每一步都应该是可验证、可回滚的小提交，不应把“重命名、移动文件、改行为”混在同一次提交里。
