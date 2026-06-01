# 代码结构规划

状态：目录迁移进行中

最后更新：2026-05-13

本文记录 Inscape 当前实际结构与目标结构。当前仓库仍处于“编译器 + 轻工具链”阶段，但长期架构已经收敛为：

目录骨架、当前不符合点与迁移顺序的施工真相以 [目录优先重构蓝图](directory-first-reframe-plan.md) 为准。本文更适合作为结构总览与目录索引。

- Internal：`Compiler`、`Tooling`、`Cli`、`LanguageServer`、`Runtime`
- ExternalSupport：`VSCode`、`SelfHostedEditor`、`UnityPlugin`

## 当前实际目录

```text
src/
  Internal/
    Compiler/
      Inscape.Compiler/         当前 Compiler 项目，已迁入 Internal 路径并改项目名
    Tooling/
      Inscape.Tooling.csproj    当前 Tooling 项目文件
      DslScriptSources/           项目源发现、读取、排除与 override
      ToolConfig/               工具配置模型与读取
      Preview/                  预览渲染与预览样式读取
      Localization/             工具链本地化 CSV 流程
      HostSchema/               宿主 schema 模板导出
      HostBinding/              宿主绑定表、角色名和宿主资产扫描
    Cli/
      Inscape.Cli/              当前 Cli 项目，已按 Entries / Commands / Providers / ViewModels 初步分目录
    LanguageServer/             当前 LanguageServer 基线项目，已接入 diagnostics / definition / references / completion 第一层
    Runtime/                    当前 Runtime 基线项目，已建立 NarrativeRuntime 最小 IR 消费生命周期
  ExternalSupport/
    VSCode/                     当前 VSCode 前端扩展，已按 Entries / DslScript / EditorAuthoring / HostBinding / HostSchema / Localization / Preview 等业务目录收敛
    SelfHostedEditor/           自研编辑器宿主客户端第一版壳，详见 self-hosted-editor-architecture-plan.md
    UnityPlugin/
      Inscape.Adapters.UnitySample/ 当前 UnitySample 外部支持样例，已迁入 ExternalSupport 路径
      Inscape.UnitySample.Cli/      UnitySample 样例命令入口，已按 Entries / Commands 初步分目录，不进入默认 solution
      unity-bird-importer/          当前 Unity 外部导入原型，已迁入 ExternalSupport 路径
tests/
  Internal/
    Inscape.Tests/              当前聚合测试项目，已按 Entries / Shared / Compiler / Cli / PreviewLocalization 初步分目录
  ExternalSupport/
    UnityPlugin/
      Inscape.UnitySample.Tests/    UnitySample 外部支持回归测试，不进入默认 solution
docs/
  ...
```

## 当前最显眼的不符合点

1. `src/Internal` 与 `src/ExternalSupport` 骨架已建立，Internal 核心项目、VSCode 编辑器扩展和 Unity 原型均已迁入当前目标路径。
2. `Inscape.Compiler` 项目名、命名空间与入口门面已完成迁移，源码已按业务角色分组；后续继续整理 Tooling / Cli / editor extension 的内部目录。
3. `Inscape.Adapters.UnitySample`、`Inscape.UnitySample.Cli` 与 `Inscape.UnitySample.Tests` 均已位于 ExternalSupport，并已退出默认 `Inscape.slnx` 编译链；需要回归时单独构建 / 运行外部支持测试项目。
4. `src/ExternalSupport/VSCode/` 已成为 VSCode 前端源码位置，且入口层已收敛到 `Entries`，预览层已收敛到 `Preview`，DslScript 作者体验已收敛到 `DslScript`，作者工具通用 provider / controller / command / model 已收敛到 `EditorAuthoring`，HostBinding / HostSchema 作者提示已收敛到各自业务目录，Localization 命令入口已收敛到 `Localization`；根级 `Commands` 已删除，资源已收敛到 `Resources`。
5. `LanguageServer` 与 `Runtime` 已从纯目录骨架推进为可构建基线项目；后续重点是让编辑器扩展逐步接入 LanguageServer，并继续扩展 Runtime Host / HostBridge 设计。
6. `tests/Internal/Inscape.Tests` 仍是聚合测试项目，但已按现有文件边界初步拆入 `Entries`、`Shared`、`Compiler`、`Cli`、`PreviewLocalization`；后续可继续把 Tooling、Preview、Localization 分成更细项目或目录。
7. Layer / Business 目录已有统一 `README.md` 规则文件，后续迁移仍需补齐具体代码落位。

## 目标结构

```text
Internal/
  Compiler/
    DslScript/
    StoryGraph/
    Localization/
    Diagnostics/
    TextContracts/

  Tooling/
    DslScriptSources/
    ToolConfig/
    Preview/
    Localization/
    HostSchema/
    HostBinding/
    EditorAuthoring/

  Cli/
    ConsoleEntry/
    Routing/
    DslScript/
    StoryGraph/
    Localization/
    HostSchema/
    HostBinding/

  LanguageServer/
    ServerEntry/
    DslScript/
    StoryGraph/
    HostSchema/
    HostBinding/

  Runtime/
    StoryRuntime/
    Input/
    Localization/
    HostBridge/

ExternalSupport/
  VSCode/
  SelfHostedEditor/
    Scripts/
      Entries/
      ProjectWorkspace/
      LanguageServer/
      EditorAuthoring/
      Preview/
      Localization/
      StoryGraph/
      Runtime/
      HostSchema/
      HostBinding/

  UnityPlugin/
    PluginEntry/
    ScriptImport/
    AttributeScan/
    HostBinding/
    AssetConfigure/
    ImportFlow/
```

## 层级职责

### Compiler

Compiler 是语义真相层。它只表达这些业务：

- `DslScript`
- `StoryGraph`
- `Localization`
- `Diagnostics`
- `TextContracts`

它不依赖：

- 文件系统项目扫描
- 命令行参数
- VSCode API
- UnityEngine / UnityEditor
- HTML / WebView 容器

### Tooling

Tooling 是共享用例层。它承接当前大量暂住在 `Inscape.Cli` 中的项目扫描、配置读取、预览构建、模板导出和报告生成流程。

它拥有这些大业务：

- `DslScriptSources`
- `ToolConfig`
- `Preview`
- `Localization`
- `HostSchema`
- `HostBinding`

它可以调用 `Compiler`，也可以被 `Cli`、`VSCode`、`LanguageServer` 和未来外部支持复用。

### Cli

Cli 是命令行入口层。它不是共享业务真相层。

它只负责：

- argv
- stdout / stderr
- 退出码
- 命令目录与路由
- 调用 Tooling

当前 `Inscape.Cli` 仍混有一部分 Tooling 逻辑，这正是接下来重构的重点。

### VSCode

VSCode 是编辑器入口层。它负责：

- VSCode API
- 命令面板
- Webview 容器
- 轻前端交互

重语义能力长期迁移到 `LanguageServer`，而不是继续在前端或 Cli 里重复实现。

### SelfHostedEditor

SelfHostedEditor 是计划中的自研编辑器宿主客户端，归属 `ExternalSupport`。它负责桌面壳、Web UI、Monaco 集成、文件对话框、菜单、打包和轻量宿主交互。

它不作为语义真相层。编辑语义复用 `LanguageServer`，项目扫描、本地化审查、预览模型、HostSchema / HostBinding 等共享流程复用 `Tooling`，剧情运行和状态观察复用 `Runtime`。

自研编辑器不复用 VSCode package 内部结构；两个编辑器宿主共享 Internal 契约，而不是共享彼此的 UI 代码。详见 [自研编辑器架构方案](self-hosted-editor-architecture-plan.md) 与 [ADR 0017](adr/0017-self-hosted-editor-external-support-boundary.md)。

### LanguageServer

LanguageServer 是 C# 语义服务层。它长期承担：

- 诊断
- 跳转定义
- 引用查找
- 补全
- source map 相关语义计算
- HostSchema / HostBinding 作者能力清单

VSCode 长期方向是“薄扩展前端 + C# LanguageServer”，减少对 Cli 进程桥接的依赖。

当前 `Inscape.LanguageServer` 已进入默认 solution，第一层能力直接复用 Compiler：diagnostics、definition、references 和 completion。位置输出遵守 [Source Location Contracts](source-location-contracts.md) 与 [Workspace Index Contract](workspace-index-contract.md)。

### Runtime

Runtime 是未来独立运行期层。当前 `Inscape.Runtime` 已进入默认 solution，`NarrativeRuntime` 只消费 Compiler graph，不解析 `.inscape` 源文本，也不依赖 VSCode / HTML Preview / UnitySample。

### ExternalSupport / UnityPlugin

UnityPlugin 不属于 Internal 五层之一。它是 Unity 环境下的外部支持层。

当前仓库可以保留：

- 协议
- 样例导出工件
- 回归素材
- 外部导入原型

但 UnityPlugin 本体不应进入默认 .NET solution 编译链。它更适合作为：

- `tools/` 下独立支持目录
- 独立 Unity package
- 未来独立仓库

## 当前代码映射

- `src/Internal/Compiler/Inscape.Compiler.csproj` + `src/Internal/Compiler/{DslScript,StoryGraph,Localization,Diagnostics,TextContracts}/` → 当前 `Compiler` 项目，项目名、命名空间与旧类型名已完成收敛
- `src/Internal/Tooling/Inscape.Tooling.csproj` + `src/Internal/Tooling/{DslScriptSources,ToolConfig,Preview,Localization,HostSchema,HostBinding}/` → 当前 `Tooling` 项目，已开始按 Business / Role 目录落位
- `src/Internal/Cli/Inscape.Cli/{Entries,Commands,Providers,ViewModels}/` → 当前 `Cli` 项目，已按入口、命令、命令元数据和输出 DTO 初步分目录
- `src/ExternalSupport/VSCode/` → 当前 `VSCode` 前端，后续继续按 VSCode Layer 规则拆分
- `src/ExternalSupport/SelfHostedEditor/` → 自研编辑器宿主目录；当前已有依赖为空的静态工作台壳，后续接入 Monaco / LanguageServer / Runtime
- `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample/` → 当前 `ExternalSupport/UnityPlugin` 过渡样例，下一阶段应迁到 `src/ExternalSupport/UnityPlugin/`
- `src/ExternalSupport/UnityPlugin/unity-bird-importer/` → 当前 `ExternalSupport/UnityPlugin` 导入原型，也应跟随迁入 ExternalSupport 目录树

## 命名树速记

```text
Compiler
  DslScript
  StoryGraph
  Localization

Tooling
  DslScriptSources
  ToolConfig
  Preview
  Localization
  HostSchema
  HostBinding

Cli
  ConsoleEntry
  Routing

VSCode
  Entries
  DslScript
    Providers
    Controllers
  EditorAuthoring
    Providers
  HostBinding
    Providers
  HostSchema
    Providers
  Preview
    Providers
    Controllers

LanguageServer
  ServerEntry
  DslScript
  StoryGraph
  HostSchema

Runtime
  StoryRuntime
  Input
  Localization
  HostBridge

ExternalSupport
  SelfHostedEditor
  UnityPlugin
```

## 重构目标

短期目标不再是继续在旧目录里做零碎收口，而是先完成目录骨架可见化：

1. 让 `src/Internal` 与 `src/ExternalSupport` 先成为仓库事实。
2. 让 `Compiler`、`VSCode`、`LanguageServer`、`UnityPlugin` 都拥有真实目录落点。
3. 让默认 solution 与 ExternalSupport 目录边界保持一致。
4. 在目录稳定后，再继续 Tooling 上提、VSCode 拆分、LanguageServer 建基线和项目名迁移。

详见 [目录优先重构蓝图](directory-first-reframe-plan.md)。
