# Agent 接手指南

状态：基线

最后更新：2026-05-17

本文用于让未来继续维护 Inscape 的 agent 快速恢复项目上下文。它不是替代完整文档，而是入口、索引和工作协议。

## 当前项目快照

Inscape 当前处于第一阶段：DSL 与轻工具链已经形成可运行原型。当前长期架构已经收敛为 Internal 与 ExternalSupport 两层：Internal 包含 `Compiler`、`Tooling`、`Cli`、`LanguageServer` 与未来 `Runtime`；ExternalSupport 包含外部平台支持，例如 `VSCode` 与 `UnityPlugin`。UnitySample 实验 adapter 继续保留，但只作为 ExternalSupport 过渡样例，不代表最终 Host Bridge 方案。

当前主动重构范围覆盖 Internal 侧的 `Inscape.Compiler`、`Inscape.Cli`、`LanguageServer` / `Tooling` 契约，以及 ExternalSupport 侧的 `src/ExternalSupport/VSCode` 编辑器扩展。`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 视为 ExternalSupport 原型，暂不纳入这一轮内部重构，只保留隔离和回归样例职责。

项目级研发认知：当前没有已发布版本和真实用户项目，因此不应为了旧版语法、旧配置或旧工具行为承担兼容成本。任何 legacy / fallback 都默认视为待迁移、待删除的研发债；只有为了短期切换验证才允许临时保留，并且必须同时记录删除节点。

2026-05-17 已完成 Goal 0 研发期 legacy 清除：G0.1 已将主样例 `samples/court-loop.inscape` 从 `:: node.name` 迁到中文 `# 标题`，同步更新所有主样例跳转目标，并将内部测试 fixture 全部迁到 `#` 标题。G0.2 已移除 Compiler / LanguageServer 对 `:: node.name` 的解析和诊断兼容文案；`:: old.node` 当前会作为节点外内容报错，不再创建节点。G0.3 已移除 VSCode 对 `:: node.name` 的 TextMate 高亮、workspace index 扫描、snippet、编辑器样式和当前文档入口。G0.4 已移除 legacy `[kind: alias]` / `[timeline: alias]` inline host binding 的 VSCode 补全、Hover、Ctrl+Click、workspace 扫描、UnitySample bracket timeline 导出和样例文件。G0.5 已移除 VSCode 编辑器扩展作者体验对 `unitySample.roleMap` / `unitySample.bindingMap` 的 fallback；ExternalSupport 的 `unitySample` 字段只保留为样例命令配置入口。G0.6 已清理当前行为文档中的 legacy / compatibility 口径；历史背景只保留在 ADR、审计或迁移说明中。Goal 5 已完成第一轮：VSCode node outline、completion、definition、references、hover 都已切到 LanguageServer 热路径；completion 使用 project probe 支持跨文件与未保存内容，相关 JS node semantic fallback 已删除。2026-05-18 已修正编辑器扩展路径：VSCode 是第一方维护的外部编辑器平台支持，已收敛到 `src/ExternalSupport/VSCode`；`EditorExtensions` 类别层和 `vscode-inscape` 包名目录已删除；VSCode 内部目录命名审计见 [VSCode Directory Naming Audit](vscode-directory-naming-audit.md)。G9.2 已建立 Internal / ExternalSupport 通用模块资源脚本边界计划。下一步建议推进 G9.3：收口 VSCode package 内部资源 / 脚本目录，再回到 Goal 6。

### 2026-05-11 当前交接结论（最新）

- 2026-05-12 已开始按目录优先蓝图执行实际迁移：目录骨架与规则 README 已提交，Internal 侧 `.NET` 项目已迁入新路径，当前 Compiler 项目文件为 `src/Internal/Compiler/Inscape.Compiler.csproj`，Tooling 位于 `src/Internal/Tooling`，Cli 位于 `src/Internal/Cli/Inscape.Cli`。
- 2026-05-12 已完成 Compiler 项目名、命名空间与入口门面收敛：`src/Internal/Compiler/Inscape.Core/Inscape.Core.csproj` 已迁为 `src/Internal/Compiler/Inscape.Compiler.csproj`，`Inscape.Core.*` 已改为 `Inscape.Compiler.*`，原 `InscapeCore` 门面已改为 `CompilerEntry`。2026-05-15 已继续把执行单文件编译的实现收敛为 `DslScript/Domains/DslScriptCompilerDomain`。
- 2026-05-12 已同步更新 `Inscape.slnx`、`ProjectReference`、VSCode fallback CLI 项目路径、CLI 命令速查示例和相关文档命令路径。验证通过：`dotnet build Inscape.slnx --no-restore` 与 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。由于项目路径变化，执行过一次 `dotnet restore Inscape.slnx --configfile NuGet.Config` 来刷新项目图缓存。
- 2026-05-12 已迁移 VSCode 前端源码：`tools/vscode-inscape` -> `src/ExternalSupport/VSCode`。到 2026-05-15，扩展内部已按 `Commands`、`WorkspaceIndex`、`LanguageFeatures`、Preview、`Styles`、`Bridges` 与入口层完成 B 阶段拆分；2026-05-18 入口层目录已从 `ExtensionEntry` 收敛为 `Entries`，预览目录已从 `PreviewWebview` 收敛为 `Preview`。验证入口为 `node --check src\ExternalSupport\VSCode\extension.js`。
- 2026-05-12 已迁移 Unity 外部支持源码：`src/Inscape.Adapters.UnitySample` -> `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，`tools/unity-bird-importer` -> `src/ExternalSupport/UnityPlugin/unity-bird-importer`。当日 `Inscape.slnx` 已移除 UnitySample 的直接项目条目，但 CLI 与 tests 仍会传递构建该项目；这个遗留点已在 2026-05-13 通过外部支持命令边界拆分解决。
- 2026-05-13 已完成外部支持命令边界拆分：UnitySample 命令迁入 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`，UnitySample 回归测试迁入 `tests/ExternalSupport/UnityPlugin/Inscape.UnitySample.Tests`。`src/Internal/Cli/Inscape.Cli` 与 `tests/Internal/Inscape.Tests` 不再引用 UnitySample，默认 `Inscape.slnx` 构建不再传递构建 UnityPlugin。
- 2026-05-13 已开始整理 Tooling 内部目录：`Inscape.Tooling.csproj` 已提到 `src/Internal/Tooling` 根目录，源码按 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 的 `Domains` / `Models` 目录落位。命名空间暂保留 `Inscape.Tooling`，后续再按业务目录决定是否拆命名空间。
- 2026-05-13 已开始整理 CLI 内部目录：`src/Internal/Cli/Inscape.Cli` 下新增 `Entries`、`Commands`、`Providers`、`ViewModels`，分别承载 `CliCore`、具体命令、命令元数据 provider 和输出 DTO。命名空间暂保留 `Inscape.Cli`。
- 2026-05-13 已开始整理 Internal 测试目录：`tests/Internal/Inscape.Tests` 下新增 `Entries`、`Shared`、`Compiler`、`Cli`、`PreviewLocalization`，先按现有测试文件边界落位，测试 runner 仍保持轻量手写模式。
- 2026-05-13 已开始整理 UnitySample CLI 内部目录：`src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli` 下新增 `Entries` 与 `Commands`，命令仍保持 ExternalSupport 独立验证入口，不进入默认 solution。
- 2026-05-13 已启动 VSCode 拆分主线 A1：`src/ExternalSupport/VSCode` 下已建立 `ExtensionEntry`、`Commands`、`LanguageFeatures`、`WorkspaceIndex`、`Bridges`、`PreviewWebview`、`Styles`、`Schemas` 目录骨架和规则 README；`extension.js` 尚未拆分。
- 2026-05-13 已推进 VSCode 拆分 A2.1：`HostSchemaCommand` 已从 `extension.js` 迁入 `Commands/HostSchemaCommand.js`，`extension.js` 通过依赖注入保留原行为。
- 2026-05-13 已推进 VSCode 拆分 A2.2：`EditorAuthoringCommand` 已从 `extension.js` 迁入 `Commands/EditorAuthoringCommand.js`，工具菜单、样式文件和语法速查入口仍由 `extension.js` 注册。
- 2026-05-13 已推进 VSCode 拆分 A2.3：`LocalizationCommand` 已从 `extension.js` 迁入 `Commands/LocalizationCommand.js`，导出 / 更新本地化命令仍由 `extension.js` 注册。
- 2026-05-14 已推进 VSCode 拆分 A2.4：`PreviewCommand` 已从 `extension.js` 迁入 `Commands/PreviewCommand.js`，预览打开 / 切换 / selection reveal 命令仍由 `extension.js` 注册。
- 2026-05-14 已推进 VSCode 拆分 A2.5：`PreviewRevealBridge` 已从 `extension.js` 迁入 `Bridges/PreviewRevealBridge.js`，selection-to-preview reveal 状态不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.6：`DslScriptNodeProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/DslScriptNodeProvider.js`，节点声明、jump 引用、node/jump hover 与导航扫描不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.7：`DslScriptSpeakerProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/DslScriptSpeakerProvider.js`，speaker 扫描、补全、定义、引用与 hover 不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.8：`HostBindingProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/HostBindingProvider.js`，host binding 扫描、补全、定义与 hover 不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.9：`DslScriptMetadataProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/DslScriptMetadataProvider.js`，metadata 引用与 hover 不再由入口文件内联承载；当前 `extension.js` 已无内联 command / bridge / workspace provider 类。
- 2026-05-14 已按命名规范收敛 VSCode 已拆出文件：移除内部默认 `Inscape` 前缀与类型名里的 `Workspace` 前缀，当前已拆出命名为 `HostSchemaCommand`、`EditorAuthoringCommand`、`LocalizationCommand`、`PreviewCommand`、`PreviewRevealBridge`、`DslScriptNodeProvider`、`DslScriptSpeakerProvider`、`HostBindingProvider` 与 `DslScriptMetadataProvider`。
- 2026-05-14 已推进 VSCode 拆分 A3.1：`DslScriptCompletionProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptCompletionProvider.js`，入口文件只负责依赖注入与 VSCode provider 注册。
- 2026-05-14 已推进 VSCode 拆分 A3.2：`DslScriptDefinitionProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptDefinitionProvider.js`，speaker / host binding / metadata / preview reveal / jump target 定义跳转仍复用既有 provider 与 bridge。
- 2026-05-14 已推进 VSCode 拆分 A3.3：`DslScriptReferenceProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptReferenceProvider.js`，speaker 与 node 引用查找继续复用 workspace index。
- 2026-05-14 已推进 VSCode 拆分 A3.4：`DslScriptHoverProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptHoverProvider.js`，speaker / host binding / metadata / node hover 继续复用 workspace index。
- 2026-05-14 已推进 VSCode 拆分 A3.5：`DslScriptDocumentSymbolProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptDocumentSymbolProvider.js`，outline 仍只做当前文档节点扫描。
- 2026-05-14 已推进 VSCode 拆分 A3.6：`DslScriptCodeLensProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptCodeLensProvider.js`，节点入边计数继续复用 workspace index。
- 2026-05-14 已推进 VSCode 拆分 A3.7：`DslScriptDiagnosticModelScheduler` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptDiagnosticModelScheduler.js`；B3.1 LanguageFeatures provider / diagnostics 调度已补齐，`extension.js` 当前只保留注册与依赖注入。
- 2026-05-14 已推进 VSCode 拆分 B3.2.1：`PreviewEditorProvider` 已从 `extension.js` 迁入 `PreviewWebview/PreviewEditorProvider.js`，custom editor 注册仍由入口文件负责。
- 2026-05-14 已推进 VSCode 拆分 B3.2.2：`PreviewHtmlProvider` 已从 `extension.js` 迁入 `PreviewWebview/PreviewHtmlProvider.js`，loading / error HTML 与 HTML escape 不再由入口文件承载。
- 2026-05-14 已推进 VSCode 拆分 B3.2.3：`PreviewRefreshController` 已从 `extension.js` 迁入 `PreviewWebview/PreviewRefreshController.js`，预览刷新 timers、render cache 与 version guard 不再由入口文件承载。
- 2026-05-14 已推进 VSCode 拆分 B3.2.4：`PreviewSourceController` 已从 `extension.js` 迁入 `PreviewWebview/PreviewSourceController.js`，webview openSource 消息、可见编辑器复用与源码 viewColumn 选择不再由入口文件承载。
- 2026-05-14 已推进 VSCode 拆分 B3.2.5：`PreviewInvocationProvider` 已从 `extension.js` 迁入 `PreviewWebview/PreviewInvocationProvider.js`，preview-project 的 CLI executable / assembly / dotnet run fallback 解析不再由入口文件承载。
- 2026-05-15 已推进 VSCode 拆分 B3.3.1：`EditorStyleController` 已从 `extension.js` 迁入 `Styles/EditorStyleController.js`，编辑器样式读取、decoration ranges 与状态清理不再由入口文件承载；默认 editor style 也由 Styles 模块导出供作者命令复用。
- 2026-05-15 已推进 VSCode 拆分 B3.3.2：`StyleDefaults` 已进入 `Styles/StyleDefaults.js`，editor / preview 默认样式不再由 `extension.js` 承载；`EditorAuthoringCommand` 仍通过依赖注入复用默认样式创建配置文件。
- 2026-05-15 已推进 VSCode 拆分 B3.4.1：`ExtensionRegistrationController` 已进入 `ExtensionEntry/ExtensionRegistrationController.js`，`activate()` 中的 VSCode subscription / provider / command / custom editor 注册顺序不再由入口函数内联承载。
- 2026-05-15 已将 B 阶段剩余工作拆成 5 个 TODO 节点：B3.4.2 ExtensionEntry 继续压薄、B3.4.3 diagnostics 调用辅助、B3.4.4 配置与工作区文本读取辅助、B3.4.5 位置与范围辅助、B3.5 B 阶段收口验收；后续每完成一项都要自检命名 / 边界、推送并勾选对应 TODO。
- 2026-05-15 已完成 B3.4.2：`ExtensionLifecycleController` 已进入 `ExtensionEntry/ExtensionLifecycleController.js`，output channel、logging、diagnostics collection 与 diagnostics scheduler 创建不再由 `extension.js` 承载；`activate()` 当前只委托 lifecycle controller。
- 2026-05-15 已完成 B3.4.3：`DslScriptDiagnosticModelController` 已进入 `LanguageFeatures/DslScriptDiagnosticModelController.js`，diagnostics scheduler 依赖的 compiler invocation、diagnostic mapping 与 extension diagnostic 构造不再由 `extension.js` 承载；VSCode 侧仍只消费 CLI / Compiler 输出，不重写 parser 语义。
- 2026-05-15 已完成 B3.4.4：`EditorAuthoringDataProvider` 已进入 `WorkspaceIndex/EditorAuthoringDataProvider.js`，项目配置读取、CSV 解析和 `.inscape` 文本源收集不再由 `extension.js` 承载；类型名未使用 `Helper` / `Support` / 泛 `Workspace*` 前缀。
- 2026-05-15 已完成 B3.4.5：`EditorAuthoringLocationProvider` 已进入 `LanguageFeatures/EditorAuthoringLocationProvider.js`，location/payload/open location、range trim、display path 与 clamp 不再由 `extension.js` 承载；source map / reveal payload 字段语义保持不变。
- 2026-05-15 已完成 B3.5：B1/B2/B3 已按重构计划收口，VSCode extension 拆分父项已勾选；`extension.js` 当前保留 VSCode 注册入口、实例装配和少量入口级 glue，已移除已知 `Helper` / `Support` / `Manager` / `Utils` 弱语义 JS 命名与 `DocumentLinkProvider` 回退风险。下一大节点建议进入 C 系列：统一 source map / reveal payload 数据契约，并为未来 LanguageServer 替换 VSCode 轻量扫描做准备。
- 2026-05-15 已按最新命名口径补做 B 后修复：命名空间不继续细分到目录一一对应，Internal / ExternalSupport 主要由目录区分；Compiler 旧类型名和文件名已收敛为 `DslScriptCompilerDomain`、`DslScriptParserDomain`、`StoryGraphCompilerDomain`、`StoryGraphCompilationValidatorDomain`、`StoryGraphAnchorValidatorDomain`、`DslScriptCompilationResultModel`、`StoryGraphCompilationResultModel`、`DslScriptSourceModel`、`SourceSpanModel` 与 `TextContractStableHashDomain` 等角色后缀命名。
- 2026-05-15 已启动 C 阶段第一小节点：新增 [Source Location Contracts](source-location-contracts.md)，明确 Compiler source location 使用 1-based `line` / `column`，编辑器 reveal location 使用 0-based `line` / `character` / `length`；同时修复 Preview HTML 中 Compiler source -> 编辑器坐标转换，避免源码按钮、metadata 点击、源码侧 reveal 匹配和节点定位继续混用两套坐标。
- 2026-05-15 已推进 C2.1：Preview -> VSCode 的 `openSource` payload 已优先发 `character`，VSCode `PreviewSourceController` 读取 `character` 并保留旧 `column` fallback；Compiler / diagnostics 的 `column` 只在转换边界内使用。
- 2026-05-15 已推进 C2.2：内部测试已覆盖源码按钮、diagnostics 点击、metadata 点击和 VSCode 旧 `column` fallback，防止 reveal payload 再次退回混用字段。
- 2026-05-15 已推进 C2.3：已巡检 VSCode selection reveal、preview reveal、openSource 与 location provider，`column` 仅保留在 Compiler / diagnostic 输入和旧 payload fallback 边界；diagnostic 映射内部变量已改为 editor `character` 语义。
- 2026-05-15 已推进 C1.1：内部测试已覆盖 source map 的节点、metadata、中文对白、选项提示、选项项、默认跳转 source span，以及跨文件缺失目标 diagnostic 的 sourcePath / line / column。
- 2026-05-15 已推进 C3.1：新增 [Workspace Index Contract](workspace-index-contract.md)，定义 VSCode 当前轻量扫描与未来 LanguageServer 可共享的 nodes、node references、speakers、host bindings、metadata、schema capabilities 过渡模型；该模型只承载 authoring hint，不替代 Compiler 语义真相。
- 2026-05-15 已推进 C3.2：VSCode `WorkspaceIndex` provider 输出已非破坏式补齐契约字段：node references 增加 `target`，speakers / host bindings 增加 `sourceKind`，host bindings 增加 `name`，metadata 增加 `key` / `value`。
- 2026-05-15 已推进 C3.3 / C4.1：创建 `src/Internal/LanguageServer/Inscape.LanguageServer.csproj` 并加入 `Inscape.slnx`；当前入口 `LanguageServerEntry --capabilities` 输出基线能力清单，`EditorLocationModel` 对齐 source location / workspace index 的 0-based `line` / `character` / `length` 契约。
- 2026-05-15 已推进 C4.2：新增 `DslScriptDiagnosticProvider`，LanguageServer diagnostics 直接调用 Compiler，并把 Compiler 1-based `line` / `column` 转换为 editor 0-based `line` / `character`；内部测试已覆盖该转换。
- 2026-05-15 已推进 C4.3：新增 `DslScriptDefinitionProvider` 和 `EditorLocationMapperDomain`，LanguageServer definition 第一层直接复用 Compiler node source span 输出 editor location；内部测试已覆盖缩进节点的 0-based location。
- 2026-05-15 已推进 C4.4：新增 `DslScriptReferenceProvider` 与 `DslScriptCompletionProvider`，references / completion 第一层直接读取 Compiler graph 输出；内部测试已覆盖引用定位和节点补全 location。
- 2026-05-15 已推进 C5.1 / C5.2：创建 `src/Internal/Runtime/Inscape.Runtime.csproj` 并加入 `Inscape.slnx`；新增 `NarrativeRuntime` 最小 IR 消费生命周期，支持 `LoadGraph`、`Start`、`Choose`、`Continue`、`Restore`，不解析 `.inscape`，不依赖 VSCode / HTML Preview / UnitySample。
- 2026-05-15 已推进 D1.1 / D1.2：新增 [Core Boundary Audit](core-boundary-audit.md)，确认 Compiler 本体无 Unity、VSCode、HTML、Bird、Addressables、ExternalSupport、Tooling、Cli、LanguageServer 或 Runtime 依赖；Compiler 角色目录与类型后缀符合当前命名规范，命名空间保持 `Inscape.Compiler.*` 粗粒度。
- 2026-05-15 已推进 D2.1：新增 [ExternalSupport Boundary Audit](external-support-boundary-audit.md)，确认 ExternalSupport 未进入默认 solution，Internal 项目未反向引用 UnitySample；`ToolConfigModel.UnitySample` 与 VSCode `UnitySample` 文案被记录为 Host Bridge 契约前的兼容残留。
- 2026-05-15 已推进 D2.2：新增 [Host Bridge Contract](host-bridge-contract.md)，明确 Host Schema 是能力清单、Host Bridge 是 Inscape 可读 ID 到宿主 ID / 资源 / 事件处理器 / 查询实现的映射；该草案可覆盖 UnitySample 当前 role map、binding map 与 timeline hook，但不把 UnitySample 字段升级为 Core 概念。D 阶段第一轮已收口，下一步建议进入 D3：迁移 `ToolConfigModel.UnitySample` 与 VSCode `UnitySample` 文案到通用 `hostBridge` 配置读取与展示。
- 2026-05-16 已推进 D3.1：`ToolConfigModel` 新增通用 `HostBridge` 路径字段，`ToolConfigReaderDomain` 会按配置文件目录归一化 `hostBridge`；`unitySample` 旧字段继续保留作为 ExternalSupport fallback。下一步建议 D3.2：VSCode HostBinding / speaker 展示文案迁到 Host Bridge 口径。
- 2026-05-16 已推进 D3.2：VSCode speaker / host binding provider 迁到 `inscape.config.json` 的 `hostBridge` ids；Goal 0 后已删除旧 `unitySample.roleMap` / `unitySample.bindingMap` fallback。
- 2026-05-16 已推进 E1 / E3：新增 [Regression Workflow](regression-workflow.md)，把节点开始前、行为契约、命名 / 分层自检、验证命令、提交拆分、提交前检查和推送后检查固化为可执行清单。下一步建议 E2：把 VSCode 交互回归清单补进扩展文档。
- 2026-05-16 已推进 E2：`src/ExternalSupport/VSCode/README.md` 新增 `Regression Checklist`，明确改 VSCode 后要 `node --check`、JSON parse、`npm run rebuild:vsix`、安装后 Reload Window，并手动检查正文 / 选项 Ctrl+Click、speaker、host binding、预览源码回跳等交互。
- 2026-05-16 已启动 F 阶段语法收敛：新增 [Authoring Marker Contract](authoring-marker-contract.md)，将 `@` / `[]` 的作者心智模型收敛为 `@` 主要表达事件、动作、时机和状态变化，`[]` 主要表达查询、读取和文本插值。历史 `[timeline: ...]` / `[kind: alias]` inline host binding 写法暂保留为兼容事实，但不再作为新示例和新工具提示的推荐方向。
- 2026-05-16 已推进 F1.2：新增 [Authoring Marker Compatibility Audit](authoring-marker-compatibility-audit.md)，把旧 `[timeline: ...]`、`[kind: alias]`、`[bg]` / `[emotion]` 等残留分为 `compatible`、`migrate-docs`、`migrate-tooling-copy` 与 `defer-behavior`。下一步建议 F1.3：先迁 VSCode hover / completion / README / tooling 文案，保留 legacy 行为 fallback。
- 2026-05-16 已推进 F1.3：VSCode hover / completion 文案和扩展 README / VSCode 工具链文档已迁到 `@timeline...` = host event / timing hook、`[kind: alias]` = legacy inline host binding fallback 的口径；代码扫描、补全、Ctrl+Click 和 UnitySample 兼容行为未改变。下一步建议 F1.4：迁作者语法指南、快速指南和 open questions，把 `[bg]` / `[timeline]` 移入兼容旧写法。
- 2026-05-16 已推进 F1.4：作者语法说明、极简速查、DSL 语言设计草案和 open questions 已迁到 `@` 表达事件 / 动作 / 时机 / 状态变化、`[]` 表达查询 / 读取 / 文本插值的口径；`[bg]`、`[timeline]` 等旧 inline host binding 写法被收束为兼容旧写法。下一步建议 F1.5：评估是否调整 Compiler / VSCode / UnitySample 对 generic `[kind: alias]` 的长期行为。
- 2026-05-16 已推进 F1.5：新增 [Authoring Marker Behavior Decision](authoring-marker-behavior-decision.md)，冻结旧行为边界：Compiler 不解释 generic `[kind: alias]` 宿主语义，UnitySample 只保留 bracket timeline 兼容导出，VSCode 继续把 generic `[kind: alias]` 作为 legacy authoring fallback。下一步建议 F1.6：新增或迁移新规范样例，避免主样例继续把 `[bg]` / `[timeline]` 当推荐写法。
- 2026-05-16 已推进 F1.6：`samples/court-loop.inscape` 已迁为新规范主样例，使用 `@timeline.talking.exit` / `@emit` / `@scene` 表达事件、时机和场景意图，使用 `[player.name]` / `[itemName]` 表达查询插值；旧 inline host binding 文本保存在 `samples/legacy/court-loop-legacy-inline-tags.txt`，不参与项目级编译。下一步建议 F1.7：清理剩余文档里的旧 `bird.*` / `UnitySample` 主口径，把它们收回 Host Bridge / ExternalSupport 兼容说明。
- 2026-05-16 已推进 F1.7：`docs/project-config.md` 与 `docs/vscode-tooling.md` 已把 speaker / binding 提示的主口径迁到 Host Bridge；Goal 0 后，`unitySample.roleMap` / `unitySample.bindingMap` 只作为 ExternalSupport 样例命令输入，不再作为 VSCode 编辑器扩展 fallback。下一步建议 F1.8：设计表达式 / 查询插值第一版语法边界。
- 2026-05-16 已推进 F1.8：新增 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md)，冻结 `[]` 第一版为只读查询 / 文本插值：优先简单路径，不触发事件，不修改状态，不调度资源，不绑定 Unity / 服务端 / 业务 API；函数调用、异步查询、失败策略、本地化占位和预览 fallback 留到后续数据契约。下一步建议 F1.9：设计查询插值与本地化占位符、预览 fallback、Host Schema 提示之间的最小数据契约。
- 2026-05-16 已推进 F1.9：新增 [Query Interpolation Data Contract](query-interpolation-data-contract.md)，定义 `[]` 简单路径插值在本地化、预览 fallback、Host Schema 提示和 Host Bridge 映射之间的最小对象形态与分层诊断：本地化保留占位符，预览无宿主时保留 `[query]` 或使用显式调试假值，Host Schema 只做提示不成为 Compiler 真相，legacy `[kind: alias]` 与新 `query-interpolation` 分开。下一步建议 F1.10：评估 VSCode / LanguageServer 是否先做简单路径提示原型。
- 2026-05-16 已推进 F1.10：新增 [Query Interpolation Tooling Decision](query-interpolation-tooling-decision.md)，结论是先做 VSCode authoring hint 原型：只消费 Host Schema，未知 query 只给提示，不改 Compiler，不改本地化 / 预览输出；LanguageServer 等 VSCode 原型稳定后复用同一 `query-interpolation` 数据契约。下一步建议 F1.11：新增 VSCode query interpolation provider 骨架，先做 Host Schema queries 读取和 `[query.path]` 范围识别，不接 completion / hover。
- 2026-05-16 已推进 F1.11：新增 `src/ExternalSupport/VSCode/WorkspaceIndex/DslScriptQueryInterpolationProvider.js`，可读取当前工作区 Host Schema 的零参数简单 `queries[]`，识别 `[itemName]` / `[player.gold]` 这类简单路径范围，并天然排除带冒号的 legacy `[kind: alias]`；入口已装配 provider，但暂未接入 completion / hover，不改变用户可见行为、Compiler、预览或本地化输出。下一步建议 F1.12：接入 VSCode completion / hover，未知 query 只提示，不改 Compiler。
- 2026-05-16 已推进 F1.12：VSCode completion / Hover 已接入 `[]` 查询插值。`[` / `[partial` 位置会基于 Host Schema 零参数简单 query 补全；`[query.path]` Hover 会展示 `returnType`、`isAsync`、description 和 schema 来源。未知 query 只显示作者提示，不新增 Problems 诊断，不改 Compiler / 本地化 / 预览语义；Goal 0 后，带冒号的旧 `[kind: alias]` 不再作为 Host Bridge 或 query interpolation 主路径。下一步建议 F1.13：评估该原型是否迁入 LanguageServer 或增加 workspace audit。
- 2026-05-16 已推进 F1.13：新增 [Query Interpolation Follow-up Decision](query-interpolation-follow-up-decision.md)，结论是暂不把 `[]` 查询插值立即迁入 LanguageServer，也不新增 Compiler diagnostics；VSCode 原型继续作为反馈面。下一步建议 F1.14：先设计显式 workspace audit 的输出格式和命令入口，保持非阻断、可选、不接默认 Problems。
- 2026-05-16 已推进 F1.14：新增 [Query Interpolation Workspace Audit](query-interpolation-workspace-audit.md)，设计未来 `audit-query-interpolation-project <workspace> [--format json|text]` 与 VSCode 显式命令的输出契约。Audit 使用独立 `inscape.query-interpolation.audit` JSON 格式和 `IQI` code，不接 `diagnose-project`，warning / info 不返回非零退出码。下一步建议 F1.15：评估 Host Schema query 读取逻辑落到 Tooling 还是 LanguageServer。
- 2026-05-16 已推进 F1.15：新增 [Query Interpolation Host Schema Reading Decision](query-interpolation-host-schema-reading-decision.md)，结论是 Host Schema query 读取与归一化应优先落到 `Inscape.Tooling`，CLI audit 和未来 LanguageServer 复用 Tooling 契约；VSCode JS provider 暂保留为 authoring hint 原型，不急于拆迁。Unity / Host Bridge 查询实现仍只保留后续映射需求，不在本节点研发。
- 2026-05-16 已推进 F1.16：`Inscape.Tooling` 新增 Host Schema query reader 与 query interpolation audit domain；Internal CLI 新增显式 `audit-query-interpolation-project <root> [--format json|text] [-o path]`。该命令输出独立 `inscape.query-interpolation.audit` / `IQI` code，不接 `diagnose-project`，不改变 Compiler、本地化或预览语义。
- 2026-05-16 已补齐 F 阶段非 Unity 宿主 API 边界：新增 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)，对比 Yarn / Ink / Ren'Py / Twine 后确认 Inscape 第一阶段采用 Host Schema / Host Bridge / Runtime Host 分层；`[]` 查询插值不允许副作用，事件和状态变化保留给 `@` / Runtime Host；宿主内部 API 不得直接写进 `.inscape`。
- 2026-05-16 已按“Unity 相关只做准备和计划”的约束补齐 F 阶段 Unity Host Bridge 计划：新增 [Unity Host Bridge Preparation Plan](unity-host-bridge-preparation-plan.md)，记录 Attribute 扫描、Host Bridge 到 adapter 生成闭环、UnitySample 回归样例和 hybrid 消费模型；未新增 Unity 代码，未修改 ExternalSupport 行为。
- 2026-05-16 已完成 TODO 账本收口：目录优先、Tooling 第一轮、CLI / VSCode 命名收敛、D3 Host Bridge 迁移与 E 阶段防回归工作流这些父项已按实际完成状态勾选；当前接力优先队列改为 Host Schema query / event 脚本补全与 Hover、VSCode 预览增量体验、LanguageServer outline / hover 范围、本地化模糊匹配、节点迁移策略和块语法收敛。Unity / Bird 相关继续先做准备和计划，不直接研发。
- 2026-05-16 已接入 Host Schema event 脚本作者提示：VSCode 新增 `DslScriptHostEventProvider`，在 `@emit eventName` 位置读取 `hostSchema.events[]` 提供 completion / Hover；未知 event 只显示 authoring hint，不新增 Problems，不改 Compiler。`@timeline...` 走 Host Bridge，因为它是有时机的宿主资源 hook；`[]` query interpolation 仍走现有 query provider。下一步建议评估 VSCode JS provider 是否复用 `Inscape.Tooling` Host Schema reader / audit 契约。
- 2026-05-16 已完成 Host Schema reader 复用评估与 Tooling 补齐：新增 `HostSchemaEventReaderDomain`、`HostSchemaEventCapabilityModel` 与 `HostSchemaEventReadResultModel`，Tooling 现在同时能读取 `queries[]` 与 `events[]` 并保留 1-based source location。VSCode 暂不直接启动 .NET Tooling，避免编辑热路径延迟和发布复杂度；后续建议设计 LanguageServer 或 CLI capability endpoint，让 VSCode 复用 Tooling 契约。
- 2026-05-16 已新增 Host Schema capability endpoint：Internal CLI 新增 `inspect-host-schema-project <root> [-o capabilities.json]`，读取项目 `hostSchema` 并输出 `inscape.host-schema.capabilities`，包含 schema 读取状态、归一化 `queries[]` 与 `events[]`。该命令不编译 `.inscape`，也不扫描脚本文本，目标是给 VSCode / LanguageServer 后续复用 Tooling reader。
- 2026-05-16 已让 VSCode 消费 Host Schema capability endpoint：新增 `HostSchemaCapabilityProvider`，query / event provider 优先调用 `inspect-host-schema-project` 获取 Tooling 归一化后的 `queries[]` / `events[]`，失败时回退直接读取 Host Schema JSON，避免部分构建环境里作者提示完全失效。下一步可评估是否把该 endpoint 下沉到 LanguageServer，并在稳定后移除 JS fallback 重复解析。
- 2026-05-16 已补齐 LanguageServer outline / hover 基线：新增 `DslScriptDocumentSymbolProvider` 与 `DslScriptHoverProvider`，临时 probe 为 `--document-symbols-file <path>` 和 `--hover-file <path> <node|jump> <name>`；数据仍直接来自 Compiler graph / source span，输出 editor 0-based location。下一步建议设计 VSCode 前端切换到 LanguageServer 的接入顺序和 fallback 边界。
- 2026-05-16 已新增 [VSCode LanguageServer Migration Plan](vscode-language-server-migration-plan.md)：明确 VSCode 前端迁移顺序为 diagnostics -> document symbols / node completion -> node definition / references -> node / jump hover -> Host Schema capability endpoint -> full LSP transport；首次接入不得同提交移除 JS fallback，正文 / 选项文本仍保留 `DefinitionProvider` + `PreviewRevealBridge` 交互边界。下一步建议先做 LanguageServer probe parity 测试或项目级 diagnostics endpoint 设计。
- 2026-05-17 已为 LanguageServer 临时 probes 建立入口级 parity 测试：`--diagnose-file`、`--definition-file`、`--references-file`、`--completion-file`、`--document-symbols-file` 与 `--hover-file` 都会校验稳定 JSON format、formatVersion 和关键 editor location 字段。下一步建议设计项目级 diagnostics endpoint，覆盖项目源加载与 unsaved override，并让 VSCode 保留 CLI fallback。
- 2026-05-17 已新增 LanguageServer 项目级 diagnostics endpoint：`LanguageServerEntry --diagnose-project <root> [--entry 标题] [--override source.inscape temp.inscape]` 输出 `inscape.language-server-project-diagnostics`，内部复用 `Inscape.Tooling` 的 `.inscape` source loader 与 `StoryGraphCompilerDomain`，不借道 CLI；测试覆盖跨文件缺失目标和 unsaved override 修复链路。VSCode 还未切换，后续接入时仍需保留 CLI diagnostics fallback。
- 2026-05-17 已让 VSCode diagnostics 先尝试 `Inscape.LanguageServer --diagnose-project`，并保留现有 `inscape.compiler.command` / `inscape.compiler.args` CLI fallback；新增 `inscape.diagnostics.backend` 可切回 `compiler` only。本节点已执行 `npm run rebuild:vsix` 并成功安装 `.vsix`，用户随后反馈 VSCode 里大致过了一眼体验基本 OK；CLI fallback 不可用场景仍未做专项 smoke test，删除 fallback 前必须补。
- 2026-05-17 已冻结节点标题 / stable id 共识并新增 [ADR 0013](adr/0013-author-title-and-stable-node-id.md)：长期块语法转向 `# 标题`，标题是作者主身份且项目内唯一，stable node id 是系统身份；标题前空行只做 style hint，不做编译错误；自动创建同名标题时生成 `_01`，用户手动重名时报 duplicate title diagnostic。后续实现前先设计 stable id 落盘与 `:: node.name` 兼容迁移。
- 2026-05-17 已把后续计划整理为 [/goal 后续目标计划](goal-plan.md)：Goal 1 stable node id 契约、Goal 2 本地化 diff / alignment、Goal 3 `# 标题` 语法第一刀、Goal 4 VSCode 标题体验、Goal 5 LanguageServer 接管 VSCode 语义能力、Goal 6 Host Schema endpoint 收口、Goal 7 体验和 ExternalSupport 尾项。Goal 1 到 Goal 4 已完成；下一步建议从 Goal 5 开始，每个最小节点独立自检、验证、提交和推送。
- 2026-05-17 已完成 Goal 1 设计：新增 [Stable Node ID Contract](stable-node-id-contract.md)，确定第一版使用 `inscape.node-map.json` sidecar 维护 stable node id / title map，默认作者不手写机器 ID；定义了 ID 生成、标题重命名识别、missing / tombstone、Git 合并冲突、显式 `@id` 修复边界，以及 `:: node.name` 到 `# 标题` 的兼容迁移策略。本节点只改文档，不改 parser。
- 2026-05-17 已完成 Goal 2 设计：新增 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)，定义 `kept` / `new` / `changed` / `removed` / `conflict` / `stale` 状态，要求 anchor 精确继承优先，同一 stable node id 内再做 diff / alignment；相似旧译文只能作为候选和 review report，不得静默当作完成译文。CLI 兼容计划优先新增独立 audit / alignment report，不改变当前 `update-l10n` 默认行为。
- 2026-05-17 已完成 Goal 3 Compiler 第一刀：`DslScriptParserDomain` 支持 `# 标题` 节点声明，`DslScriptNodeTitleValidatorDomain` 定义标题合法性；中文标题可作为 `-> 目标标题` 跳转目标。重复标题仍走文档内 `INS003` / 项目级 `INS030` 诊断，标题前缺空行新增 info 级 `INS012` style hint。
- 2026-05-17 已完成 Goal 4 VSCode 标题语法体验：TextMate grammar、snippets、README / tooling 文档已转向 `# 标题`；中文标题可用于 Outline、jump completion、Go to Definition、Find All References、Hover 与 CodeLens；新增 `Inscape: Insert Node Title` 命令，在创建同名标题时自动追加 `_01`。
- 2026-05-17 已推进 Goal 5.1：VSCode `DslScriptDocumentSymbolProvider` 现在优先把当前 document buffer 写入临时文件并调用 `Inscape.LanguageServer --document-symbols-file` 获取 Outline；LanguageServer 失败时回退 JS `DslScriptNodeProvider` 扫描。下一步建议 Goal 5.2：node completion 优先走 LanguageServer，同时保留 JS workspace index fallback。
- 2026-05-17 已推进 Goal 5.2：VSCode `DslScriptCompletionProvider` 在 `->` 跳转目标位置优先调用 `Inscape.LanguageServer --completion-file`，再用 JS workspace node index 补齐跨文件节点；LanguageServer 失败时仍能只靠 JS fallback 提供补全。下一步建议 Goal 5.3：node definition / references 优先走 LanguageServer，同时保留当前 DefinitionProvider / ReferenceProvider 的 JS fallback。
- 2026-05-17 已推进 Goal 5.3：LanguageServer 新增 `--definition-project <root> <title> [--override source temp]` 与 `--references-project <root> <title> [--override source temp]`，复用 `DslScriptSourcesLoaderDomain` 和 `StoryGraphCompilerDomain` 支持跨文件与未保存内容；VSCode node definition / references 已切到该 project navigation，节点语义不再使用 JS node provider fallback。speaker / Host Bridge / metadata / preview reveal 仍保留各自作者体验路径。下一步建议 Goal 5.4：node / jump hover 接入 LanguageServer。
- 2026-05-17 已推进 Goal 5.4：LanguageServer 新增 `--hover-project <root> <node|jump> <title> [--override source temp]`，复用 Tooling source loading 与 Compiler project graph；VSCode node / jump hover 已切到该 project hover，`DslScriptNodeProvider` 不再保存 node hover markdown fallback。speaker、metadata、Host Bridge binding、Host Schema query / event hover 仍保留在 VSCode authoring provider。下一步建议 Goal 5.5：收敛 document symbols / node completion 的既有 JS fallback 边界。
- 2026-05-17 已完成 Goal 5.5：LanguageServer 新增 `--completion-project <root> [--override source temp]`，VSCode node completion 改用项目级 completion，不再用 JS workspace node index 补齐跨文件节点；DocumentSymbolProvider 删除 JS node scanner fallback，LanguageServer 失败时返回空 Outline。下一步建议 Goal 6：Host Schema endpoint 收口到 LanguageServer / Tooling 契约。
- 2026-05-17 已推进预览体验小节点：Preview HTML 会把正文、选项提示和选项文本中的 `[query.path]` 渲染为 `.query-interpolation` token 样式，仍显示原文，不改变 Compiler / Runtime / Host Schema 语义。
- 2026-05-17 已新增 ADR 0015 并修正 ADR 0014：VSCode 是第一方维护的外部编辑器平台支持，不属于 Internal 核心层；当前 package 已迁到 `src/ExternalSupport/VSCode`。未来可能拆仓的项目应在项目根内区分 `Scripts` / `Resources` / 开发脚本边界；空规划目录不再作为完成依据。
- 2026-05-17 已更新研发期兼容原则：项目当前没有真实用户和已发布契约，不再默认维护旧版兼容。`:: node.name`、legacy `[kind: alias]` inline binding、`unitySample.*` fallback、JS semantic fallback 等都应重新梳理为待删除或待收敛任务。下一步优先重排计划并先清 legacy，再继续新增能力。
- 2026-05-12 已迁移当前聚合测试项目：`tests/Inscape.Tests` -> `tests/Internal/Inscape.Tests`。这只是测试项目路径进入 Internal 测试树，测试内容尚未按 Compiler / Tooling / Cli / ExternalSupport 拆分。
- 当前分支为 `main...origin/main`。本轮已把目录优先方案正式冻结为文档与 ADR；最新提交请以 `git log --oneline -1` 为准。
- 本轮会话已确认新的重构铁律：先搭目录骨架与 `README.md` 规则文件，再迁大目录路径，再迁 solution / 项目路径，再迁项目名、命名空间和类型名；在此之前，不再把主要重构精力继续放在旧目录里的微观 helper 收口上。
- 本轮会话已将该铁律落入 [目录优先重构蓝图](directory-first-reframe-plan.md) 与 [ADR 0012](adr/0012-directory-first-repository-reframe-order.md)。
- 本轮会话已明确当前最显眼的不符合点已从“大目录不成形 / UnitySample 仍在默认编译链”转为“VSCode 编辑器扩展归属曾误放 Internal、编辑器扩展还未完全接入 LanguageServer、Tooling 共享流程仍可继续下沉为更窄模块、测试项目仍可继续按更细领域拆分”。
- 本轮会话已确认新的优先级：下一阶段应先做目录骨架与规则文件，再迁大目录路径与 solution 边界；Tooling 上提、VSCode 深拆、LanguageServer 细化与项目名迁移都排在目录外形稳定之后。
- 本轮会话当时曾确认 `VSCode` 位于 Internal；该判断已在 2026-05-17 被 ADR 0015 修正。当前长期结构为：Internal 包含 `Compiler`、`Tooling`、`Cli`、`LanguageServer`、`Runtime`；ExternalSupport 包含 `VSCode` 与 `UnityPlugin`。
- 本轮会话确认：`Inscape.Compiler` 长期可向 `Compiler` 收敛；`Inscape.Cli` 当前同时承载了 `Cli` 与部分 `Tooling`，下一轮重构重点应是先抽出 `Tooling`。
- 本轮会话已完成 Stage 1 的第一刀：新建 `src/Inscape.Tooling/`，迁出 ToolConfig 配置模型与读取/路径归一化逻辑；`Cli` 现在只保留 `--config` 参数解析和错误输出适配。
- 本轮会话已完成 Stage 1 的第二刀：迁出 `.inscape` 项目源发现、排除目录、内容读取与 override 应用逻辑；`Cli` 现在只保留 `--override <source> <content>` 参数解析。
- 本轮会话已完成 Stage 1 的第三刀：迁出 Preview 样式表模型与 JSON 读取逻辑；`Cli` 现在只保留 HTML 渲染与终端输出适配。
- 本轮会话已完成 Stage 1 的第四刀：迁出 Localization CSV 读取、提取与更新流程；`Cli` 现在只保留 `--from` 参数读取和错误输出适配。
- 本轮会话已完成 Stage 1 的第五刀：迁出 HostSchema 模板模型与导出逻辑；`Cli` 顶层命令现在只保留 `-o` 参数读取和输出适配。
- 本轮会话已完成 Stage 1 的第六刀：迁出 HostBinding 绑定表 CSV 读取流程；`Cli` 现在只保留 UnitySample 绑定项适配与参数/错误输出处理。
- 本轮会话已完成 Stage 1 的第七刀：迁出现有角色名 CSV 扫描与歧义收敛流程；`Cli` 现在只保留 UnitySample role template report 输出。
- 本轮会话已完成 Stage 1 的第八刀：迁出 timeline 资产扫描与 alias 归并流程；`Cli` 现在只保留 UnitySample timeline 绑定结果适配。
- 本轮会话已完成 Stage 1 的第九刀：迁出 `speaker -> roleId` 的 role map 读取流程；`Cli` 现在只保留 UnitySample role id 适配。
- 本轮会话已完成 Stage 1 的第十刀：迁出既有 talking 资产扫描与保留 talkingId 收集流程；`Cli` 现在只保留 UnitySample reserved id 适配。
- 本轮会话已继续按 CLI 入口边界收紧 UnitySample 命令实现：binding-template、role-template、project-export 三个命令的单用途读取/适配/写盘/报表辅助已全部内联回各自 `CliUnitySample*Command`，当前 CLI 不再保留独立 `CliUnitySample*Reader/Writer` 辅助类型。
- 本轮会话已继续按显式宿主动作入口规则收紧 UnitySample L10N 合并命令：`merge-unity-sample-l10n` 已从 `CliCore` 私有分支抽为独立 `CliUnitySampleL10nMergeCommand`，`CliCore` 仅保留分发。
- 本轮会话已继续按薄门面规则收紧 `CliCore`：`IsHelp`、`ToCompileViewModel`、`ToProjectCompileViewModel` 与项目命令分发私有包装已收回拥有者文件，`CliCore` 进一步缩到入口分发与跨命令共享输出辅助。
- 本轮会话已先收口 VSCode 预览定位 selection bridge：原先散在 `src/ExternalSupport/VSCode/extension.js` 顶层的 pending reveal 状态与相关函数已收为 `PreviewRevealBridge`，使 Ctrl+Click 到预览定位的链路拥有明确 `Bridge` 角色。
- 本轮会话已继续收口 VSCode 预览命令入口：`openPreview`、`togglePreview`、`revealSelectionInPreview` 及其局部 helper 已收为 `PreviewCommand`，预览命令不再散在 `extension.js` 顶层函数。
- 本轮会话已继续收紧 VSCode preview reveal bridge 边界：光标处 reveal 信息解析、definition link 构造与 reveal range 解析已吸回 `PreviewRevealBridge`，preview reveal 顶层 helper 进一步退出函数区。
- 本轮会话已继续收口 VSCode localization 命令入口：`extractLocalization`、`updateLocalization` 及其局部执行链已收为 `LocalizationCommand`，顶层不再保留独立 localization command helper 串。
- 本轮会话已继续收口 VSCode 工作区工具命令入口：`openToolsMenu`、`openEditorStyle`、`openPreviewStyle`、`openQuickSyntaxGuide` 及其局部样式文件 helper 已收为 `EditorAuthoringCommand`，样式/文档打开流程不再散在顶层函数。
- 本轮会话已继续收口 VSCode host schema 命令入口：`showHostSchemaCapabilities` 及其局部 schema 读取、QuickPick 组装与定位逻辑已收为 `HostSchemaCommand`，host schema 浏览流程不再散在顶层函数。
- 本轮会话已开始收口 VSCode workspace index：节点声明、jump 引用与节点导航这一小片已收为 `DslScriptNodeProvider`，Definition / Reference / CodeLens / jump completion 不再直接依赖散落的 node/jump 顶层 helper。
- 本轮会话已继续收口 VSCode workspace index 的 speaker 子块：角色表读取、工作区 speaker 扫描、speaker completion / definition / reference 已收为 `DslScriptSpeakerProvider`，顶层不再保留独立 speaker helper 串。
- 本轮会话已继续收口 VSCode workspace index 的 host binding 子块：binding map 读取、工作区 hook / inline tag 扫描以及 host binding completion / definition / hover 所需绑定列表已收为 `HostBindingProvider`，顶层不再保留独立 host binding helper 串。
- 本轮会话已继续收口 VSCode workspace index 的 metadata 子块：metadata 位置解析、工作区 metadata 引用扫描与 metadata hover 已收为 `DslScriptMetadataProvider`，顶层不再保留独立 metadata helper 串。
- 本轮会话已继续收紧 VSCode workspace index 的 speaker provider 边界：speaker 位置解析与 hover markdown 已吸回 `DslScriptSpeakerProvider`，Definition / Reference / Hover 不再直接依赖顶层 speaker helper。
- 本轮会话已继续收紧 VSCode workspace index 的 node provider 边界：节点声明 / jump target 位置解析与 node/jump hover markdown 已吸回 `DslScriptNodeProvider`，相关顶层 node/jump helper 已退出函数区。
- 本轮会话已继续收紧 VSCode workspace index 的 host binding provider 边界：host binding 补全上下文与光标位置解析已吸回 `HostBindingProvider`，Completion / Definition / Hover 不再直接依赖顶层 host binding helper。
- 本轮会话已继续收紧 `HostBindingProvider` 的拥有边界：host binding completion / hover / missing-hover markdown 构造已吸回 provider 自身，相关 markdown helper 不再散在顶层函数区。
- 本轮会话已补齐 VSCode language features 拆分：`DslScriptCompletionProvider`、`DslScriptDefinitionProvider`、`DslScriptReferenceProvider`、`DslScriptHoverProvider`、`DslScriptDocumentSymbolProvider`、`DslScriptCodeLensProvider` 与 `DslScriptDiagnosticModelScheduler` 已进入 `LanguageFeatures`，补全、定义跳转、引用查找、悬浮说明、outline、CodeLens 与诊断调度逻辑继续复用 `WorkspaceIndex`、CLI 调用和 preview reveal bridge，不在编辑器层重建编译语义。
- 本轮会话已推进 Preview 拆分：`PreviewEditorProvider`、`PreviewHtmlProvider`、`PreviewInvocationProvider` 已进入 `Preview/Providers`，`PreviewRefreshController` 与 `PreviewSourceController` 已进入 `Preview/Controllers`，入口文件仅保留 custom editor 注册、preview refresh 薄 wrapper 和依赖注入。
- 本轮会话已开始 Styles 拆分：`EditorStyleController` 与 `StyleDefaults` 已进入 `Styles`，入口文件只负责把 VSCode 事件转发给样式 controller，并把默认样式注入作者命令；样式读取、范围扫描、默认样式与 decoration 生命周期由 Styles 层拥有。
- 本轮会话已开始 ExtensionEntry 收口：`ExtensionRegistrationController` 负责 VSCode 注册顺序，`ExtensionLifecycleController` 负责 output/logging/diagnostics lifecycle；`activate()` 当前只委托 lifecycle controller。
- 本轮会话已继续收口 diagnostics 边界：`DslScriptDiagnosticModelController` 负责 VSCode DiagnosticModel 映射与 compiler invocation 适配，`DslScriptDiagnosticModelScheduler` 仍只负责防抖与异步调度。
- 本轮会话已继续收口 authoring 数据来源：`EditorAuthoringDataProvider` 负责配置、CSV 与 `.inscape` 文本源读取，WorkspaceIndex provider 继续只消费注入的数据来源。
- 本轮会话已完成 B 阶段剩余顺序：ExtensionEntry / diagnostics / config-source / location-range 四个实现节点与 B3.5 总验收均已提交并推送；2026-05-18 后续目录收口已将 `ExtensionEntry` 改为 `Entries`。进入 C 阶段前，先按命名规范清理旧类型名、Compiler 角色后缀、Tooling 业务主语和纯规划占位目录。
- 本轮会话已顺手修复预览定位局部缺陷：`findDialogueSeparatorIndex` 中误残留的 preview reveal 调用与缺失的半角冒号解析已清理，避免说话人行的预览定位在运行时触发异常。
- 本轮会话已继续收敛 CLI 总入口 runner 命名：`CliTopLevelCommandRunner`、`CliDslScriptCommandRunner`、`CliStoryGraphCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`。
- 本轮会话已继续按终局后缀白名单收口 CLI 命令入口：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 以及 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，收敛为 `CliTopLevelCommand`、`CliDslScriptCommand`、`CliStoryGraphCommand` 与 `CliUnitySample*Command`。
- 本轮会话已继续按终局后缀白名单收口 CLI 展示与命令元数据类型：`CliCompileOutput`、`CliProjectCompileOutput` 已分别改为 `CliCompileViewModel`、`CliStoryGraphCompileViewModel`，`CliCommandCatalog` 已改为 `CliCommandProvider`，内部 `CliCommandDefinition` 也已改为 `CliCommandModel`。
- 本轮会话已继续按分层规则上提 CLI 共享预览逻辑：`CliPreviewHtmlRenderer` 已迁入 `Inscape.Tooling` 并改为 `PreviewHtmlRendererDomain`，CLI 侧只保留 preview 命令路由、样式读取与输出适配。
- 本轮会话已继续按 CLI 入口边界收紧编译前置流程：`CliCompilerProject`、`CliCompilerSingleFile` 已退出源码，相关项目/单文件编译前置逻辑分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`。
- 本轮会话已继续收口 UnitySample 项目级命令分支：`CliStoryGraphCommand` 不再直接编排三条 UnitySample 项目级命令，改为委托 `CliUnitySampleProjectCommand`。
- 本轮会话已继续压薄 binding-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 binding template 读取、CSV 输出和诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。
- 本轮会话已继续压薄 role-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 role template 读取、CSV 输出和 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。
- 本轮会话已继续压薄 project-export 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载导出参数校验、导出执行和写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。
- 本轮会话确认：VSCode 长期方向是“薄扩展前端 + C# LanguageServer”，而不是继续长期借道 CLI 承载重语义能力。
- 本轮会话确认：Unity 支持不再视为 Internal 五层之一，而视为 ExternalSupport/UnityPlugin；代码可以继续留在当前仓库，但不应进入默认 .NET solution 编译链。

### 2026-05-01 当前交接结论（最新）

- 当前分支为 `main...origin/main`，HEAD 为 `85e870d refactor(cli): extract single-file compiler preflight`；最近连续提交还包括 `056d345 refactor(cli): extract project compiler preflight`、`30fe7d2 refactor(cli): split project config models`、`7c5b602 refactor(cli): align dsl source and preview loaders`。
- 最近一轮 CLI 收口已完成并验证通过：项目/单文件编译前置逻辑已分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`，`CliCore` 仅保留参数分流、共享输出和退出码整合。
- 本轮会话最终确认：不要把下一步重构目标表述成 `InscapeProjectService` / `Workspace` / `ProjectSystem` 一类总服务；长期架构术语优先使用 `Dsl`、`DslSources`、`Config`、`Cli`、`Preview`、`L10n`、`Host` 这些窄职责模块名。
- 本轮会话同时确认新的类型命名方向：参考 Bird 的思路，目录和命名空间优先表达层级与范围，类型名只表达当前模块里的具体主语和角色。`Project`、`SingleFile`、`Workspace` 不再作为类型名前缀的默认选择，`Support` / `Helper` 一类弱语义后缀应优先被拆分。

### 当前确认的模块命名

- `Compiler`：编译期真相层；当前主要由 `Inscape.Compiler` 承载。内部主业务为 `DslScript`、`StoryGraph`、`Localization`。
- `Tooling`：共享用例层；长期用于承接项目扫描、ToolConfig、Preview、Localization、HostSchema、HostBinding 等流程。当前这些流程有相当一部分仍暂住在 `Inscape.Cli`。
- `Tooling` 当前已实际落下一块稳定落点：`ToolConfig` 已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第二块稳定落点：`DslScriptSources` 已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第三块稳定落点：`Preview` 的样式表模型与样式读取已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第四块稳定落点：`Localization` 的 CSV 读取、提取与更新流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第五块稳定落点：`HostSchema` 的模板模型与模板导出逻辑已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第六块稳定落点：`HostBinding` 的绑定表 CSV 读取流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第七块稳定落点：现有角色名 CSV 的扫描与歧义收敛流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第八块稳定落点：timeline 资产扫描与 alias 归并流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第九块稳定落点：`speaker -> roleId` 的 role map 读取流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第十块稳定落点：既有 talking 资产扫描与保留 talkingId 收集流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Cli`：命令行入口层；当前落在 `src/Internal/Cli/Inscape.Cli/{Entries,Commands,Providers,ViewModels}`。
- `Cli` 的 UnitySample 命令辅助已进一步收敛：binding-template、role-template、project-export 的局部读取、适配、报表与写盘逻辑都已收回各自 `CliUnitySample*Command`，当前 CLI 不再保留独立 `CliUnitySample*Reader/Writer` 辅助类型。
- `Cli` 的 UnitySample 项目级命令当前也已形成更清楚的入口边界：`CliStoryGraphCommand` 只做委托，具体三条项目级命令由 `CliUnitySampleProjectCommand` 承载。
- `Cli` 的 binding-template 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体 binding template 读取、主 CSV 输出和诊断输出由 `CliUnitySampleBindingTemplateCommand` 承载。
- `Cli` 的 role-template 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体 role template 读取、主 CSV 输出和 report 输出由 `CliUnitySampleRoleTemplateCommand` 承载。
- `Cli` 的 project-export 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体导出参数校验、导出执行和写盘输出由 `CliUnitySampleProjectExportCommand` 承载。
- `VSCode`：编辑器入口层；当前主要落在 `src/ExternalSupport/VSCode/extension.js`。
- `LanguageServer`：C# 语义服务层；当前已有 `Inscape.LanguageServer` 基线项目，diagnostics / definition / references / completion 第一层已直接复用 Compiler。
- `Runtime`：未来运行期层；当前尚未实现。
- `ExternalSupport/UnityPlugin`：Unity 环境下的外部支持层；当前由 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 作为过渡样例与原型承载。

### 2026-04-30 GitHub Copilot 接手巡检

- 已按本指南完成接手阅读：`docs/agent-handoff.md`、`docs/todo.md`、`docs/roadmap.md`、`docs/open-questions.md` 和 `docs/code-structure.md`。
- 仓库位于 `main...origin/main`，HEAD 为 `8087d5b feat: 明确 Timeline Hook phase 语义`。
- 当前存在接手前未提交变更：`samples/court-loop.inscape` 修改了一句证人对白并追加文件末尾空行；`src/ExternalSupport/VSCode/extension.js` 的 VSCode 交互按用户反馈改为接近 C# 的引用模型：block 标题显示 `N 个引用`，点击打开 References Peek，`-> target` Hover 只做类型说明，speaker 定义缺失时回退到对白引用位置。
- 接手验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\ExternalSupport\VSCode\extension.js`。
- VSCode 角色名、block 引用计数和 `-> target` 简短 Hover 已按用户最新反馈对齐；Timeline / 资源别名定义跳转、Host Schema 脚本内跳转和变量名追溯仍未实现。
- 2026-05-01 继续修正 VSCode 角色名 Ctrl+Click 范围：不再尝试注册 `DocumentHighlightProvider`，改为在 `language-configuration.json` 的 `wordPattern` 中把全角冒号和常见中文标点作为词边界，使 `旁白：证物袋里只有一枚旧怀表。` 只把 `旁白` 识别为可跳转词。
- 2026-05-01 用户补充新的架构约束：Host Schema 查询可参考 `?hasItem("badge")->node`，但 Inscape 可读 ID 与项目内部 ID 必须通过 Host Bridge 映射；`item` 是抽象叙事概念，不等同业务 Item；下层状态只被上层查询或内部使用，不反向查询上层；Bird 只是 Unity 支持参考需求方，不应绑定 Core、通用 Unity 插件、Addressables 或 ScriptableObject；Timeline Hook 长期应泛化为宿主自定义事件示例；Unity 上层支持层应作为独立插件 / 适配包研究。
- 2026-05-01 已将原 Core 内的固定 Unity 项目适配 spike 迁出为 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，CLI 命令改为 `export-unity-sample-*` / `merge-unity-sample-l10n`。该项目明确标注为实验样例：它硬编码 `talkingId`、`roleId`、`L10N_Talking`、Timeline asset 和 manifest 字段，只用于验证导出 / L10N / hook / 绑定流程，不代表最终 Host Bridge 或通用 Unity Runtime Host。
- 2026-05-01 用户补充 Unity 支持层候选方向：在 Unity 项目的类、字段、方法上加 `[Inscape]` 一类 Attribute，由 Unity 内代码生成脚本扫描并生成待配置桥接表；人工再完成 C# 类名 / 字段名与 Inscape 可读名的映射。拿到数据后上层是直接绑定事件、轮询触发，还是混合模型仍待定，不应提前写死。
- 2026-05-01 已整理 VSCode 扩展发布工作流：扩展改动后不能只重启窗口，必须重新打包并覆盖安装；当前推荐入口是 `src/ExternalSupport/VSCode/` 下的 `npm run rebuild:vsix`，细则见 [VSCode 扩展发布工作流](vscode-release-workflow.md)。
- 2026-05-01 VSCode 可玩预览已经落地到 custom editor：默认通过 `Inscape: Open Preview` / `Inscape: Toggle Preview` 在源码右侧打开，预览不再劫持 `.inscape` 源码标签页或 Ctrl+Click 跳转。当前交互是单栏沉浸式阅读体验，支持点击选项推进、无选项时点击正文继续、Back、Restart、diagnostics、源码回跳，以及编辑防抖刷新和保存后立即刷新。
- 2026-05-01 预览链路的关键经验已确认：webview 必须显式启用 scripts；刷新时要保留当前 `{ current, path }` 状态，避免每次回到第一页；CLI 调用应优先复用已构建的 `Inscape.Cli.exe`，其次 `dotnet exec Inscape.Cli.dll`，最后再回退到 `dotnet run --project ...`，否则交互延迟会明显偏高。
- 2026-05-01 VSCode 脚本交互约定已进一步收敛：`@entry`、`@scene`、`@timeline` 等统一视作 `@metadata` 语法层，`[]` 视作宿主绑定 / 行内标签层；二者都应提供 Hover 与可理解的导航，但不要在 VSCode 侧重写 Core 语义。预览中的源码回跳与源码编辑器内的 Ctrl+Click 应保持隔离，不做自动双向同步。
- 2026-05-01 VSCode 双向定位又补了一层：预览里的 `源码` 按钮现在优先复用已打开的源码编辑器，否则新开源码页签；编辑器中的正文 / 选项文本不再使用 `DocumentLinkProvider`，避免整段文本常驻下划线。当前用 `DefinitionProvider` 提供精确 Ctrl+指向链接态，并通过 selection bridge 在 Ctrl+Click 后调用 `inscape.revealInPreview`，继续打开或复用预览并定位到对应页面；`Inscape: Reveal Current Selection In Preview` 作为显式兜底入口保留。这个行为属于作者体验层，不改变 DSL 语义或 Core 输出。

已经落地：

- 文档体系、ADR、路线图和 TODO。
- C# Compiler Core：解析 `.inscape`、生成 Narrative Graph IR、诊断图结构。
- 图叙事基线：显式节点标题、跨文件项目编译、项目内节点标题全局唯一、节点内 `@entry` 项目入口，以及项目级 CLI `--entry 标题` 临时入口覆盖。
- 行级锚点：`l1_<fnv1a64-hex>`，不依赖文件路径或绝对行号，检测 `INS040` 锚点碰撞。
- CLI：单文件和项目级 `check`、`diagnose`、`compile`、`preview`。
- HTML 预览：支持单文件/项目级 IR、节点跳转、选择、回环、Restart、Back、路径和锚点显示。
- 本地化：CSV 提取、按旧 CSV 精确继承译文、`current/new/removed` 状态标记。
- VSCode 原型：TextMate 高亮、snippets、诊断桥接、节点补全、角色补全、宿主绑定别名补全、Outline、跳转定义、引用查找、Hover、block CodeLens、本地化导出/更新命令，以及可玩预览 custom editor。角色补全优先读取 `hostBridge`，无 Host Bridge 时只扫描工作区已有 speaker；角色 Ctrl+Click 会跳到 Host Bridge speaker 行或对白引用位置，Find All References 会列出工作区对白；block 标题 CodeLens 显示 `N 个引用`，用于追溯调用方；宿主绑定提示读取 `hostBridge` 并覆盖 `@timeline ...` / `@timeline.<phase> ...` 位置；预览默认侧边打开，支持源码回跳、Back / Restart、点击正文继续和刷新后保留当前页进度。
- Bird/Unity 初步调研：已梳理 `StorySystem`、`TalkingTM`、`L10N_Talking`、`DirectorSystem` 和 `TimelineEffectTM` 的边界，详见 [Bird / Unity 调研记录](bird-unity-research.md)。
- UnitySample Adapter 实验样例：`export-unity-sample-role-template`、`export-unity-sample-binding-template`、`export-unity-sample-project` 和 `merge-unity-sample-l10n` 保留早期固定数据结构导出验证。适配器位于 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，命令入口位于 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`；它们不得反向污染 Compiler 或 Internal CLI。详见 [UnitySample Adapter 实验样例](unity-sample-adapter.md)。
- 项目配置：CLI 会自动读取项目根目录 `inscape.config.json`，也支持 `--config path`。当前配置为 UnitySample 样例命令提供默认值：`talkingIdStart`、`roleMap`、`bindingMap`、`existingRoleNameCsv`、`existingTimelineRoot`、`existingTalkingRoot`；命令行参数优先级更高。这仍不是最终 Host Bridge。详见 [项目配置草案](project-config.md)。
- 宿主 Schema 草案：新增 `hostSchema` 项目配置字段与 `export-host-schema-template` CLI 命令，用于生成 `inscape.host-schema` JSON 模板，先描述纯查询和宿主事件清单，不改变当前 DSL 解析或 UnitySample 导出行为。VSCode 已提供 `inscape.host.schema.json` / `*.host.schema.json` 的 JSON Schema 校验，以及 `Inscape: Show Host Schema Capabilities` 命令读取并浏览当前 query / event。详见 [宿主 Schema 草案](host-schema.md)。
- Bird 角色绑定审查：`export-bird-role-template` 支持 `--report`，输出 `unique`、`ambiguous`、`missing`、`unscanned` 状态。2026-04-30 用 Bird 当前 `L10N_RoleName.csv` 试跑，当前样例中 `旁白` 为 `ambiguous`，候选 `1050|10001`；`成步堂` 和 `证人` 为 `missing`。因此当前导出的 `bird-roles.csv` 仍全部为空，需要人工补齐或更换测试文本中的角色名。
- Bird L10N 合并预览：`merge-bird-l10n <generated-L10N_Talking.csv> --from <existing-L10N_Talking.csv> --report report.csv -o merged.csv` 已实现。规则是保留 Bird 未涉及行、新增 Inscape 行、源文本未变时保留译文、源文本变化时清空目标语言列并把旧值写入 report。2026-04-29 已用 Bird 当前 `L10N_Talking.csv` 试跑，原表 270 行、合并预览 275 行、报告只包含 5 个 `added` 行，未改动 Bird 正式表。
- Unity Editor Importer 原型：`src/ExternalSupport/UnityPlugin/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs` 可复制到 Bird 项目 `Assets/Editor/`，读取 manifest 并创建 / 更新 `TalkingSO`，将 `phase=talking.exit` 的 Timeline Hook 映射为 `TalkingEffectTM.PlayTimeline`，其他 phase 只报告 unsupported warning 并跳过；已提供 `Dry Run Import Manifest...` 菜单、`DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine` batchmode 入口。Dry Run 输出创建 / 更新 / 缺失引用计划，报告既有 `TalkingTM` 的字段级变化，并在 manifest 同目录写入带 Inscape 节点、锚点和源位置的 `bird-import-dry-run-report.txt`。真实 Import 可加 `-inscapeApplyAddressables` 显式调用 Bird 现有 `TalkingSO.ApplyAA()`，将资源加入 `TM_Talking` group / label。详见 [Unity Editor Importer 草案](unity-editor-importer.md)。
- Bird 项目 batchmode 试跑：2026-04-29 已在 `D:\UnityProjects\Bird` 通过 Unity 2023.2.22f1 执行 `DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine`。样例 manifest 先计划创建 5 个 `TalkingSO`、0 个 warning、0 个 Timeline Hook；真实 Import 后生成 `Assets/Resources_Runtime/Talking/InscapeGenerated/SO_Talking_Inscape_100000.asset` 到 `SO_Talking_Inscape_100004.asset`。二次 Dry Run 显示 5 个 UPDATE 且 `no field changes detected`。随后试跑 `-inscapeApplyAddressables`，只修改 `Assets/Plugins/UnityPlugin/AddressableAssetsData/AssetGroups/TM_Talking.asset`，新增 5 个 address 为资源简名、label 为 `TM_Talking` 的 entries。Bird 项目当前新增 importer、`.meta`、`InscapeGenerated` 资源并修改 `TM_Talking.asset`，尚未提交。

尚未落地：

- Bird 项目新增 importer 与生成资源的提交策略。
- Unity Editor Importer 的字段级 diff UI、选择性合并与回滚能力。
- 资源、Timeline 的宿主绑定配置。
- 正式 Language Server。
- 更细粒度的 VSCode 预览热刷新与状态提示。
- 条件、变量、状态查询、自定义指令。
- 编辑器 Alpha。

## 已确认的关键认知

- 第一阶段的路线是：先 DSL，再游戏引擎支持层，再编辑器，再自研引擎。
- DSL 的第一版不做变量、条件查询和自定义指令。
- DSL 更像服务于数据驱动引擎的数据表达层，不应该直接控制业务实体、服务端或 Unity API。
- 变量与状态查询后续只在 DSL 中表达查询，由宿主层按 Schema 解析和执行。
- Inscape 支持图叙事：节点之间可以是链、树、回环或一般有向图。
- 块级叙事单元必须使用显式节点名；行级文本使用隐式 hash。
- 语法、编辑器交互和 Timeline 边界仍有很多未定内容，不能把草案写成最终规范。
- VSCode 阶段要尽量降低作者记忆压力，提供高亮、补全、诊断和轻量预览。
- HTML 预览是无引擎调试工具，不追求最终视觉表现。
- VSCode 扩展改动想被本机看到，必须重新打包并安装新的 `.vsix`；重启窗口只负责让已安装扩展重新加载。
- 当前本地化第一版选择 CSV；PO/XLIFF、模糊匹配、人工确认流后续再设计。
- 当前 CSV 格式已能跑通工具链，但用户反馈其生成格式不完全符合预期；这是低优先级认知，后续应结合 Bird 项目的 `L10N` 真实格式再调整。
- Bird 当前运行时的对话文本坐标是 `talkingId + index`，Inscape 的行级 hash 不应被替换，而应通过 Adapter manifest 映射到 Bird 坐标。
- Bird Timeline 是跨 Story、Feeling、Play、Explore 的演出编排层；第一版 DSL 只引用 Timeline，不直接生成 Timeline。
- 最新竞品定位结论：Inscape 的近中期工程参照是 Yarn Spinner，写作与即时预览参照是 Ink/Inky，长期完整 VN 引擎参照是 Ren'Py，编辑器与生产管线参照是 Arcweave / articy:draft。详见 [DSL 生态定位对比](dsl-ecosystem-positioning.md) 和 ADR 0007。
- 最新产品体验结论：Inky 只证明了“边写边玩”的价值，不足以作为 Inscape 编辑器体验上限；后续应更多参考编程编辑器、Notion 和 Medium 的低干扰写作体验，并围绕脚本/节点图/CSV 三视图组织工具。
- VSCode 正文 / 选项文本的“默认无下划线，Ctrl+指向才显示链接态”不能靠 `DocumentLinkProvider` + 样式覆盖实现；这一组合会在“永远有下划线”和“永远没下划线”之间反复回归。正文链接态的长期做法已经收敛为：不用 `DocumentLinkProvider`，改用 `DefinitionProvider` 提供精确范围，并通过 selection bridge 恢复 Ctrl+Click 预览定位。详见 ADR 0009。
- 用户当前明显不喜欢缩进承载核心语义；`# 标题` + 空行分块已进入候选，但还没有替代现有 `:: node.name`。
- 用户最新明确判断：`@` 与 `[]` 当前设计尚未收敛，作者侧几乎感受不到稳定差异；这不是理解问题，而是语法职责重叠。后续应把“是否保留两套壳、如何切分语义/时机与资源/别名绑定、是否保留 `@timeline` / `[timeline: ...]` 双写法”提升为近期重点，而不要继续带着模糊心智堆更多宿主功能。
- 用户希望代码组织更接近 Bird 这类游戏项目的可读经验：有清晰入口、生命周期式流程、逻辑与表现分层、数据与逻辑分层、控制与业务分层，并且易于模块化加功能。已新增 [编码与命名规范](coding-conventions.md) 和 [渐进式重构计划](refactoring-plan.md)，后续重构应小步按该规范推进。
- 当前已进一步收敛命名方向：架构文档仍用 `Dsl`、`Config`、`Preview`、`L10n`、`Host` 这类模块术语表达边界；具体类型命名则改为 Bird 风格的“具体主语 + 角色”模型，优先让目录承担层级与范围信息，不再把短层前缀扩张成所有类型的默认命名方式。
- 当前重构边界也已收敛：`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 继续作为实验样例存在，不参与这一轮 CLI / Core / VSCode 的可维护性重构，除非任务明确要求调整其回归样例角色。
- CLI 当前已完成多步低风险瘦身：顶层元命令、单文件命令与项目级命令分支都已从 `CliCore` 主入口中抽离；项目配置、项目源扫描、预览样式等共享流程已上提到 `Inscape.Tooling`，项目/单文件编译前置流程也已分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`。当前下一步的正确方向不是继续扩张 Cli，而是继续按 ADR 0010 和分层规则，把仍然单命令单用途的局部编排收紧到入口，把真正共享的流程继续上提到 `Tooling`。
- 2026-05-11 已开始执行 Tooling 抽取：当时 `CliConfigLoader` / `CliProjectConfig` 已被 `Inscape.Tooling` 内的 ToolConfig 模型与读取逻辑取代，`CliCompilerProject` 与 `CliCompilerSingleFile` 通过 `ToolConfigReaderDomain` 取配置。这一刀通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 Tooling 抽取：当时 `CliDslSourceLoader` 已被 `Inscape.Tooling` 内的 `DslScriptSourcesLoaderDomain` / `DslScriptSourceOverrideModel` 取代，`CliCompilerProject` 只保留 `--override` 参数解释与编排调用。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第三刀：当时 `CliPreviewStyleLoader` / `CliPreviewStyleSheet` 已被 `Inscape.Tooling` 内的 `PreviewStyleReaderDomain` / `PreviewStyleSheetModel` 取代；后续又继续把 `CliPreviewHtmlRenderer` 上提到 `Inscape.Tooling` 内的 `PreviewHtmlRendererDomain`，使 CLI preview 命令只保留路由、样式读取与输出适配。这两步都通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第四刀：当前 `CliCore` 内的本地化 CSV 读取、提取与更新共享辅助已被 `Inscape.Tooling` 内的 `LocalizationCsvFlowDomain` 取代，Cli 命令侧只保留 `--from` 参数读取和错误输出。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第五刀：当前 `CliHostSchemaTemplateWriter` 已被 `Inscape.Tooling` 内的 `HostSchemaTemplateWriterDomain` 取代，`CliTopLevelCommand` 只保留 `-o` 参数读取与输出适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第六刀：当前 `CliUnitySampleSupport` 内的 UnitySample 绑定表 CSV 读取共享流程已被 `Inscape.Tooling` 内的 `HostBindingMapReaderDomain` / `HostBindingMapEntryModel` 取代，Cli 侧只保留把通用绑定项映射到 `UnitySampleHostBinding` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第七刀：当前 `CliUnitySampleSupport` 内的现有角色名 CSV 扫描与歧义收敛流程已被 `Inscape.Tooling` 内的 `RoleNameBindingScanDomain` / `RoleNameBindingScanResultModel` / `RoleNameBindingCandidateModel` 取代，Cli 侧只保留 UnitySample role template report 输出。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第八刀：当前 `CliUnitySampleSupport` 内的 timeline 资产扫描与 alias 归并流程已被 `Inscape.Tooling` 内的 `TimelineAssetBindingScanDomain` / `TimelineAssetBindingModel` 取代，Cli 侧只保留把通用扫描结果映射到 `UnitySampleTimelineAssetBinding` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第九刀：当前 `CliUnitySampleSupport` 内的 `speaker -> roleId` role map 读取流程已被 `Inscape.Tooling` 内的 `RoleMapReaderDomain` 取代，Cli 侧只保留把通用结果映射到 `UnitySampleExportOptions.RoleIdsBySpeaker` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第十刀：当前 `CliUnitySampleSupport` 内的既有 talking 资产扫描与保留 talkingId 收集流程已被 `Inscape.Tooling` 内的 `TalkingIdReservationScanDomain` 取代，Cli 侧只保留把通用结果映射到 `UnitySampleExportOptions.ReservedTalkingIds` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 CLI 收口：当前 `CliUnitySampleSupport` 内的导出目录写盘与 role template report 输出已分别被 `CliUnitySampleExportWriter` 和 `CliUnitySampleRoleTemplateReportWriter` 取代。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行命名收敛：原 `CliUnitySampleSupport` 已退出源码，拆为 `CliUnitySampleExportOptionsReader` 与 `CliUnitySampleTemplateBindingReader` 两个具体 reader。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample binding-template 收口：`CliUnitySampleTemplateBindingReader` 现在只返回 `TimelineAssetBindingModel`，最后一层 UnitySample 类型适配已拆到 `CliUnitySampleBindingTemplateWriter`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 CLI 总入口命名收敛：`CliTopLevelCommandRunner`、`CliDslScriptCommandRunner`、`CliStoryGraphCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore`。
- 2026-05-11 已继续执行 CLI 命令入口终局后缀收敛：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 与 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，改为 `CliTopLevelCommand`、`CliDslScriptCommand`、`CliStoryGraphCommand` 与 `CliUnitySample*Command`。这一刀同样通过了命名规则对照：`Command` 仍属于宿主入口白名单后缀，`Runner` 已退出当前源码。
- 2026-05-11 已继续执行 UnitySample 项目级命令收口：`CliStoryGraphCommand` 当前不再直接编排三条 UnitySample 项目级命令，相关逻辑已迁入 `CliUnitySampleProjectCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample binding-template 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载 binding template 读取、主 CSV 输出与诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。这一刀同样通过了 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj`。
- 2026-05-11 已继续执行 UnitySample role-template 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载 role template 读取、主 CSV 输出与 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample project-export 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载导出参数校验、导出执行与写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj`。

- 2026-05-01 已完成 CLI 项目命令收口：当时项目级命令分发落在 `CliStoryGraphCommand`，共享的“配置读取 + `.inscape` 项目源扫描/读取/override + 项目编译”前置流程收口到 `CliCompilerProject`；其中 DSL 源加载位于 `CliDslSourceLoader`，UnitySample role/binding/export 辅助逻辑位于 `CliUnitySampleSupport`。单文件命令的“输入读取 + 邻近项目配置读取 + 单文件编译”前置流程也收口到 `CliCompilerSingleFile`。`CliCore` 只保留参数分流、共享输出和退出码整合。验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\ExternalSupport\VSCode\extension.js`。这些类型名后来继续按目录优先、主语/角色的方式逐步替换。

- 2026-05-11 认知又补了一层：除了命名模型收敛，长期架构本身也已定稿为 Internal / ExternalSupport 两层。当时曾把 `VSCode` 归入 Internal；2026-05-17 已由 ADR 0015 修正为 ExternalSupport editor extension。当前 Internal 以 `Compiler` / `Tooling` / `Cli` / `LanguageServer` / `Runtime` 组织；ExternalSupport 以 `VSCode` 与 `UnityPlugin` 为核心。详见 ADR 0011、ADR 0015、[代码结构规划](code-structure.md) 和 [编码与命名规范](coding-conventions.md)。

## 本轮踩坑总结

- 这次回归的根因不是颜色配置，而是误把 `DocumentLinkProvider` 当成“可样式化的 Ctrl+Hover 链接态”来用。
- TextMate scope、decorations、`inscape.editor-style.json` 里的 `...TextDecoration` 只适合处理视觉层，不适合修复 provider 语义层误用。
- 以后碰到“常驻下划线 / 链接态消失”这类问题，先查 provider 类型是否选错，再查样式；不要反过来。
- 只要改了 `src/ExternalSupport/VSCode/`，就必须 `npm run rebuild:vsix` 并安装；否则很容易把“旧扩展效果”误判成“新代码回归”。
- 最终稳定方案已经明确分层：`DefinitionProvider` 只负责 Ctrl+指向的瞬时链接态，selection bridge 只负责把 Ctrl+Click 转成 `inscape.revealInPreview`，显式命令只做兜底。
- 如果未来再改正文 / 选项的导航体验，优先在 provider / selection 流程里排查，不要先去改主题、TextMate scope 或样式 JSON。
- 重构时不要把“顺手清理”混进当前节点；`extension.js` 这类大文件只能按 provider / controller / command 等小边界逐次迁移。
- 命名不是装饰，而是规范约束；`Support` / `Helper` / `Manager` 这类弱命名应视为待拆信号，目录承担范围，类型名表达主语和角色。
- 文档口径滞后会直接制造下一轮误判；每个阶段性节点都要同步更新 handoff / TODO，长期规则或方向变化要进入 refactoring plan 或 ADR。

## 下一步优先队列

建议优先做小而闭环的任务，不要直接跳到大规模重构。

1. 当前重构收口（最高优先级）：
   - 先抽出 `Tooling`，把当前 Cli 中的共享流程从命令行入口层移走。
   - C 阶段再建立 `LanguageServer` 基线，让 VSCode 长期走“薄前端 + C# server”方向。
   - VSCode B 阶段拆分已收口；下一步应统一 source map / reveal payload 数据契约，减少 VSCode、CLI、Preview 各自推断。
   - Unity 支持继续留在仓库内，但明确收束到 `ExternalSupport/UnityPlugin`，不进入默认 .NET solution 编译链。
   - 每轮小步重构后同步更新 handoff / todo / refactoring-plan / code-structure / development-plan，避免文档口径再次滞后。

2. `@` / `[]` 语法收敛：
   - 当前作者反馈已经非常明确：这两套语法的职责重叠过高，使用者难以形成稳定心智模型。
   - 当前方向已明确：`@` 主要表达事件 / 动作 / 状态变化，`[]` 主要表达查询 / 读取 / 文本插值；详见 [Authoring Marker Contract](authoring-marker-contract.md)。
   - 下一步需要审计旧 `[timeline: ...]` / `[kind: alias]` 写法，将它们标记为兼容遗留或迁移到 `@timeline.<phase> alias` 等事件写法；不要继续扩大 `[]` 作为资源别名的推荐面。
   - 这项工作优先级高于继续扩展更多宿主标签或事件语法，否则只会扩大歧义面。

3. Host Bridge 草案与 UnitySample 生成化：
   - `Inscape.Adapters.UnitySample` 只是实验样例，当前硬编码宿主数据结构不能作为最终方案。
   - 下一步应设计 Host Bridge 配置，把 Inscape 可读 ID 映射到项目内部 ID、资源、事件处理器和查询实现。
   - Unity 支持层候选方向是用 `[Inscape]` Attribute 扫描项目 C# 类型和成员，由 Unity 内代码生成脚本生成待配置桥接表，再人工确认 C# 成员与 Inscape 可读名的映射。
   - 上层拿到 Inscape 事件 / 数据后的消费方式仍待定：可以直接绑定事件，也可以轮询叙事状态，或允许项目选择混合模型。
   - 适配层长期应由 Host Schema / Host Bridge / 代码生成驱动，UnitySample 可保留为 generator 回归样例。
   - 当前样例命令包括 `export-unity-sample-project`、`export-unity-sample-role-template`、`export-unity-sample-binding-template` 和 `merge-unity-sample-l10n`。
   - Timeline Hook 当前只支持 metadata：`@timeline alias` 默认 `talking.exit`，也支持 `@timeline.talking.enter alias`、`@timeline.talking.exit alias`、`@timeline.node.enter alias`、`@timeline.node.exit alias`，导出为 manifest `hostHooks`。
   - 后续适配重点：把当前固定 CSV / manifest / L10N 输出抽象为可配置、可生成的桥接流程。

4. VSCode 预览增量体验：
   - 预览主流程已经可用，但还可以继续逼近 Markdown / Inky 的“边改边玩”感受。
   - 增量方向包括：更细粒度的未保存内容热刷新、更明确的刷新中 / 诊断中状态提示，以及是否提供可选的预览 / 源码同步模式。
   - 继续保持原则：预览复用 Core / CLI 结果，不在扩展里重写 parser 或运行时语义。

5. 第一版块语法收敛：
   - 当前原型使用 `:: node.name`。
   - 用户偏好更接近 `# 标题` 的写作式块语法，并且不喜欢缩进语义。
   - 需要明确“给人看的标题”和“给机器跳转的标识”是否解耦。

6. Timeline Hook 真实导入验证：
   - Core / manifest 已能表达 `talking.enter`、`talking.exit`、`node.enter`、`node.exit`。
   - 当前 Bird 运行时只安全支持 `talking.exit -> TalkingEffectTM.PlayTimeline`；Unity Importer 对其他 phase 输出 unsupported warning 并跳过。
   - 下一步应使用带真实 Timeline 绑定的样例在 Bird 项目中跑 Dry Run / Import，确认 `talking.exit` 的 effects 字段和 warning 文本。

7. 本地化模糊匹配设计：
   - 在 `update-l10n` 的精确锚点继承之后，增加“疑似改写”候选。
   - 第一版不要自动套用模糊译文，只输出候选给人工确认。

8. 宿主 Schema 接入脚本体验：
   - `export-host-schema-template` 已能生成查询 / 事件清单模板。
   - VSCode 已能校验 host schema JSON，并通过命令面板浏览当前 query / event。
   - 下一步可以等条件 / 事件语法更明确后，把 query / event 接入 `.inscape` 脚本内补全 / Hover。

9. Language Server 设计：
   - 先写能力范围和协议草案，再决定是否创建 `src/Inscape.LanguageServer/`。

10. 共享契约继续收口：
   - 按 [编码与命名规范](coding-conventions.md) 和 [渐进式重构计划](refactoring-plan.md) 小步重构，而不是一次性大清洗。
   - 短期优先统一 source map / reveal payload 等跨 CLI、VSCode、Preview 的共享数据契约。
   - 如未来确需跨工具链统一门面，也只能在上述窄模块稳定后，作为薄组合层引入，而不是反过来吞掉模块边界。

## 文档检索地图

为了减少 token 浪费，按任务读取对应文档：

```text
任务类型                           优先读取
项目快照 / 接手                    docs/agent-handoff.md, docs/todo.md, docs/roadmap.md
设计决策溯源                       docs/adr/README.md, 对应 ADR
DSL 语法                           docs/dsl-syntax-guide.md, docs/dsl-language.md, docs/syntax-comparison.md, docs/open-questions.md
`@` / `[]` 语法分工                 docs/authoring-marker-contract.md, docs/authoring-query-interpolation-contract.md, docs/query-interpolation-data-contract.md, docs/query-interpolation-tooling-decision.md, docs/dsl-syntax-guide.md, docs/dsl-language.md, docs/host-bridge-contract.md
`@` / `[]` 兼容残留审计             docs/authoring-marker-compatibility-audit.md, docs/vscode-tooling.md, src/ExternalSupport/VSCode/README.md
DSL 生态定位 / 竞品对比             docs/dsl-ecosystem-positioning.md, docs/adr/0007-dsl-benchmark-positioning.md
代码结构 / 新模块                  docs/code-structure.md, docs/coding-conventions.md, docs/refactoring-plan.md, src/Inscape.Compiler, src/Inscape.Cli
VSCode 工具                        docs/vscode-tooling.md, src/ExternalSupport/VSCode/README.md, docs/vscode-language-server-migration-plan.md
防回归工作流                       docs/regression-workflow.md, docs/refactoring-plan.md
HTML 预览                          src/Inscape.Tooling/PreviewHtmlRendererDomain.cs, docs/vscode-tooling.md
本地化 / hash                      docs/hash-localization.md, docs/l10n-extraction.md
宿主 Schema / 查询事件             docs/host-schema.md, docs/dsl-language.md, docs/open-questions.md, docs/todo.md
Unity / Host Bridge                docs/unity-sample-adapter.md, docs/project-config.md, docs/runtime-unity.md, docs/architecture.md, docs/todo.md
编辑器阶段                         docs/editor-design.md, docs/roadmap.md
```

不要每次都全量阅读所有文档。先读本指南和 TODO，再按任务进入 1 到 3 个目标文档。

## 工作方法

- 先看 `git status`，确认是否有未提交变更。
- 每轮先读 `docs/agent-handoff.md`、`docs/todo.md` 和目标目录 `README.md`；只在需要时读取 1 到 3 个任务相关文档。
- 从大目标中切一个小节点执行，先明确本轮边界：只搬什么、只改什么、哪些相邻问题留到下一节点。
- 修改设计、语法、IR、本地化、存档或编辑器交互时，同步更新文档；长期决策新增 ADR。
- 保持 `Inscape.Compiler` 不依赖 Unity、VSCode、HTML 或第三方包。
- CLI 可以作为工具层封装 Core，但不要把核心语义只写在 CLI 里。
- VSCode 扩展里可以做轻量行扫描，但语法真相必须来自 Core/CLI。
- 修改后先跑局部静态检查，再运行规定构建和测试；涉及 VSCode 时跑 Node 语法/JSON 检查。
- 提交前看 `git diff --stat` 和关键 diff，确认没有越界改动。
- 每个阶段完成后提交并推送，保持远端可接续；提交粒度优先是一小节点一提交。
- 若改动发生在 `src/ExternalSupport/VSCode/`，默认把“打包 + 安装 + reload”纳入验证流程，而不要把源码修改误认为发布完成。

## 常用命令

在当前 Windows 环境中，Git 需要显式安全目录：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\extension.js
node -e "JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Language/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Syntaxes/inscape.tmLanguage.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Snippets/inscape.code-snippets','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json','utf8')); console.log('json ok')"
```

CLI 样例：

完整清单见 [CLI 命令速查](cli-command-reference.md)。终端内可用：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help preview-project
```

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.csv
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-role-template samples -o config\unity-sample-roles.csv
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-binding-template samples -o config\unity-sample-bindings.csv
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-project samples -o artifacts\unity-sample-export
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-project samples --unity-sample-binding-map config\unity-sample-bindings.csv -o artifacts\unity-sample-export
```

## 已知环境与习惯

- 文档默认中文，文件名英文小写与连字符。
- PowerShell 读取中文文档时使用 `Get-Content -Encoding UTF8`。
- 若 `rg` 在本机不可用或被拒绝执行，使用 `Get-ChildItem` 与 `Select-String` 回退。
- 避免改动 `bin/`、`obj/`、`.git/`、`node_modules/` 和生成物，除非任务明确要求。
- 项目扫描会忽略 `.git`、`bin`、`obj`、`node_modules` 和 `artifacts`。

## 接手时不要误判

- `@entry` 和 CLI `--entry 标题` 临时入口覆盖都已实现；项目配置文件式入口仍未设计。
- 行级 hash 已实现，但节点重命名迁移、显式稳定 ID 和模糊匹配还没做。
- VSCode 原型已经具备很多能力，包括本地化命令，但不是正式 Language Server。
- HTML 预览已经能调试图结构，但不是游戏运行时。
- 本地化旧表更新只做精确锚点继承，不做相似文本自动匹配。
- Timeline/DirectorSystem 的初步边界已记录：第一版只引用 Timeline，不直接生成 Timeline；Hook phase 已有最小语法，但除 `talking.exit` 外仍需运行时或 adapter 语义验证，Presentation IR 边界后续再设计。
- UnitySample 导出样例不生成 Unity `.asset`；它只是当前 adapter / importer 思路的实验输入，不是最终 Host Bridge。
