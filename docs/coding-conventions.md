# 编码与命名规范

状态：草案

最后更新：2026-05-11

本文用于把 Inscape 的代码组织成可推理、可迁移、可演进的结构。当前长期目标已经收敛为：

- Internal：`Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`
- ExternalSupport：`UnityPlugin`

命名的首要目标不是“整齐”，而是让陌生维护者只看目录和类型名，就能推断代码在哪一层、属于哪个大业务、扮演什么角色。

## 总体原则

- 目录和命名空间先表达层级与业务。
- 类型名只表达业务主语、二级限定和角色。
- `Config` 作为后缀家族存在，不作为一级业务主语。
- `Domain` 是静态逻辑层的终局后缀。
- `Model` / `ViewModel` 是数据结构后缀。
- `Reader` / `Writer` / `Parser` / `Compiler` / `Resolver` / `Validator` 等作为准后缀，通常放在 `Domain` 前。
- `Command` 只用于显式宿主动作入口；内部持续执行模型优先使用 `TaskModel` / `ActionModel`。
- `Support` / `Helper` / `Manager` / `Utils` 一类弱语义命名默认视为待拆分信号。

## 架构层级

### Internal

- `Compiler`：编译期真相层。只承载 DSLScript、StoryGraph、Localization 与诊断契约，不碰文件系统、命令行、VSCode 或 Unity API。
- `Tooling`：共享用例层。承载项目扫描、配置读取、预览构建、本地化流程、HostSchema / HostBinding 流程等，可被 Cli、VSCode 和未来外部支持复用。
- `Cli`：命令行入口层。只负责 argv、stdout/stderr、退出码、命令目录和对 Tooling 的调用。
- `VSCode`：编辑器入口层。负责 VSCode API、前端交互、Webview、样式和轻量客户端逻辑。
- `LanguageServer`：C# 语义服务层。长期承担诊断、跳转、引用、补全、source map 等重语义能力。
- `Runtime`：未来运行期层。只在进入真正运行时后承载 `System`、`Context`、`Events` 等长期状态与执行模型。

### ExternalSupport

- `UnityPlugin`：Unity 环境下的外部支持层。负责 Unity 内的特性扫描、桥接应用、资产填写与导入流程。它可以与本仓库同存，但不应进入默认 .NET solution 编译链。

## 大业务主语

以下一级主语用于表达系统级业务边界：

- `DslScript`
- `StoryGraph`
- `Localization`
- `Preview`
- `ToolConfig`
- `HostSchema`
- `HostBinding`
- `EditorAuthoring`
- `UnityPlugin` 仅限 `ExternalSupport`

这些词不是“层”。层级进目录，业务主语进类型名。

## 二级限定词

以下词只能作为一级主语后的限定，不作为系统级主语起点：

- `Node`
- `Choice`
- `Entry`
- `Diagnostic`
- `SourceMap`
- `Reveal`
- `Selection`
- `Style`
- `RoleMap`
- `BindingMap`
- `Timeline`
- `Csv`
- `Html`
- `Json`
- `Template`
- `Manifest`
- `Index`

例如：

- `StoryGraphEntryResolverDomain`
- `LocalizationCsvReaderDomain`
- `PreviewRevealBridge`
- `HostSchemaTemplateModel`

而不是：

- `EntryResolver`
- `CsvReader`
- `RoleMap` 作为一级业务目录

## 终局后缀

### 通用角色后缀

- `Domain`
- `Model`
- `ViewModel`
- `Controller`
- `Bridge`
- `Context`
- `Events`
- `Factory`

### 宿主入口专用后缀

- `Command`
- `Provider`
- `Entry`
- 历史薄门面可暂保留 `Core`，但新类型优先使用 `Entry`

### 运行期专用后缀

- `System`

## 准后缀

以下词不作为终局后缀使用，而是作为 `Domain` 前的动作限定：

- `Parser`
- `Compiler`
- `Validator`
- `Resolver`
- `Reader`
- `Writer`
- `Loader`
- `Scanner`
- `Exporter`
- `Importer`
- `Renderer`
- `Merger`
- `Builder`

推荐：

- `DslScriptParserDomain`
- `StoryGraphCompilerDomain`
- `ToolConfigReaderDomain`
- `LocalizationMergerDomain`

不推荐：

- `DslScriptParser`
- `LocalizationWriter`
- `StoryGraphCompiler`

## 层内命名规则

### Compiler

- 允许主语：`DslScript`、`StoryGraph`、`Localization`、`Diagnostics`、`TextContracts`
- 终局后缀以 `Domain`、`Model` 为主
- 准后缀常用：`Parser`、`Compiler`、`Validator`、`Resolver`、`Builder`
- 不出现 Unity、VSCode、Cli、Html、Bird 等宿主词

### Tooling

- 允许主语：`ProjectSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding`
- 终局后缀以 `Domain`、`Model`、`ViewModel`、`Controller` 为主
- 这里拥有共享流程，不拥有编译期真相

### Cli

- 只承载命令行入口与路由
- 允许后缀：`Entry`、`Command`、`Controller`
- 共享流程若能脱离终端运行，应优先上提到 `Tooling`

### VSCode

- 允许主语：`EditorAuthoring`、`Preview`、`DslScript`、`HostSchema`、`HostBinding`
- 允许后缀：`Provider`、`Bridge`、`Controller`、`ViewModel`、`Command`
- 重语义能力长期迁移到 `LanguageServer`

### LanguageServer

- 允许主语：`DslScript`、`StoryGraph`、`HostSchema`
- 允许后缀：`Entry`、`Controller`、`Provider`、`Model`
- 它直接调用 `Compiler` / `Tooling`，而不是借道 `Cli`

### Runtime

- 允许主语：`StoryRuntime`、`Localization`、`Input`、`HostBridge`
- 允许后缀：`System`、`Context`、`Events`、`Model`、`Domain`
- Runtime 不反向承载编译期逻辑

### ExternalSupport / UnityPlugin

- 主语固定为 `UnityPlugin`
- 允许终局后缀：`Entry`、`Controller`、`Model`、`Events`、`Factory`、`Domain`
- 允许二级限定：`Attribute`、`ScriptImport`、`HostBinding`、`AssetConfigure`、`ImportFlow`
- 它可以依赖 UnityEngine / UnityEditor，因此不应进入默认 .NET solution 编译链

## 标准命名公式

```text
<Layer>/<Business>/<Subject><Qualifier><Role>
```

示例：

- `Compiler/DslScript/DslScriptParserDomain`
- `Compiler/StoryGraph/StoryGraphEntryResolverDomain`
- `Tooling/Preview/PreviewFlowController`
- `Cli/Localization/LocalizationExportCommand`
- `VSCode/Preview/PreviewRevealBridge`
- `LanguageServer/DslScript/DslScriptCompletionProvider`
- `ExternalSupport/UnityPlugin/UnityPluginAssetConfigureController`

## 命名禁忌

- 不用 `Project` / `SingleFile` / `Workspace` 作为类型名前缀
- 不用 `Support` / `Helper` / `Manager` / `Utils` 作为长期命名
- 不用 `Business` 作为大业务统一后缀
- 不把层级词直接塞进普通类型名，例如 `LocalizationVSCodeController`

## 迁移指针

- `Inscape.Core` 长期可改名为 `Inscape.Compiler`
- 当前 `Inscape.Cli` 中大量共享流程会逐步上提为 `Inscape.Tooling`
- `tools/vscode-inscape` 长期会拆为薄扩展前端与 `Inscape.LanguageServer`
- 当前 `UnitySample` / `unity-bird-importer` 属于 `ExternalSupport/UnityPlugin` 的过渡素材，而不是内部五层的一部分
