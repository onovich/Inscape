# 代码结构规划

状态：执行前冻结

最后更新：2026-05-11

本文记录 Inscape 当前实际结构与目标结构。当前仓库仍处于“编译器 + 轻工具链”阶段，但长期架构已经收敛为：

目录骨架、当前不符合点与迁移顺序的施工真相以 [目录优先重构蓝图](directory-first-reframe-plan.md) 为准。本文更适合作为结构总览与目录索引。

- Internal：`Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`
- ExternalSupport：`UnityPlugin`

## 当前实际目录

```text
src/
  Inscape.Core/                 当前 Compiler 雏形，但尚未迁入 Internal 树
  Inscape.Cli/                  当前 Cli 与部分 Tooling 混合区，但尚未迁入 Internal 树
  Inscape.Tooling/              当前 Tooling 项目，但尚未迁入 Internal 树
  Inscape.Adapters.UnitySample/ 当前 ExternalSupport 原型样例，但仍在默认 solution 中
tests/
  Inscape.Tests/                当前测试项目，尚未镜像 Internal / ExternalSupport
tools/
  vscode-inscape/               当前 VSCode 前端扩展，仍承载长期产品代码
  unity-bird-importer/          当前 Unity 外部导入原型，尚未收束到 ExternalSupport
docs/
  ...
```

## 当前最显眼的不符合点

1. `src/` 仍是旧式项目平铺，尚未落成 `src/Internal` 与 `src/ExternalSupport` 两棵主树。
2. `Inscape.Core` 仍停留在旧路径和旧项目名，Compiler 还不是仓库外形上的可见事实。
3. `Inscape.Adapters.UnitySample` 仍处于默认 .NET solution 编译链，尚未体现 UnityPlugin 外部支持层边界。
4. `tools/vscode-inscape/` 仍承载长期产品代码，VSCode 尚未成为 `src/Internal` 下的正式 Layer。
5. `LanguageServer` 与 `Runtime` 仍只有文档口径，没有目录骨架。
6. `tests/` 尚未镜像 Internal / ExternalSupport，未来会继续滞后于主结构。
7. Layer / Business 目录还没有统一 `README.md` 规则文件，后续重构无法做到“先读目录规则再动手”。

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
    ProjectSources/
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

  VSCode/
    ExtensionEntry/
    LanguageFeatures/
    EditorAuthoring/
    PreviewWebview/

  LanguageServer/
    ServerEntry/
    DslScript/
    StoryGraph/
    HostSchema/

  Runtime/
    StoryRuntime/
    Input/
    Localization/
    HostBridge/

ExternalSupport/
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

- `ProjectSources`
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

### LanguageServer

LanguageServer 是 C# 语义服务层。它长期承担：

- 诊断
- 跳转定义
- 引用查找
- 补全
- source map 相关语义计算

VSCode 长期方向是“薄扩展前端 + C# LanguageServer”，减少对 Cli 进程桥接的依赖。

### Runtime

Runtime 是未来独立运行期层。当前不提前塞进 Compiler。

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

- `src/Inscape.Core/` → 当前 `Compiler` 雏形，下一阶段应先迁到 `src/Internal/Compiler/`
- `src/Inscape.Tooling/` → 当前 `Tooling` 项目，下一阶段应迁到 `src/Internal/Tooling/`
- `src/Inscape.Cli/` → 当前 `Cli` 与 `Tooling` 混合承载区，下一阶段应迁到 `src/Internal/Cli/`
- `tools/vscode-inscape/` → 当前 `VSCode` 前端，下一阶段应迁到 `src/Internal/VSCode/`
- `src/Inscape.Adapters.UnitySample/` → 当前 `ExternalSupport/UnityPlugin` 过渡样例，下一阶段应迁到 `src/ExternalSupport/UnityPlugin/`
- `tools/unity-bird-importer/` → 当前 `ExternalSupport/UnityPlugin` 导入原型，也应跟随迁入 ExternalSupport 目录树

## 命名树速记

```text
Compiler
  DslScript
  StoryGraph
  Localization

Tooling
  ProjectSources
  ToolConfig
  Preview
  Localization
  HostSchema
  HostBinding

Cli
  ConsoleEntry
  Routing

VSCode
  ExtensionEntry
  LanguageFeatures
  EditorAuthoring
  PreviewWebview

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
  UnityPlugin
```

## 重构目标

短期目标不再是继续在旧目录里做零碎收口，而是先完成目录骨架可见化：

1. 让 `src/Internal` 与 `src/ExternalSupport` 先成为仓库事实。
2. 让 `Compiler`、`VSCode`、`LanguageServer`、`UnityPlugin` 都拥有真实目录落点。
3. 让默认 solution 与 ExternalSupport 目录边界保持一致。
4. 在目录稳定后，再继续 Tooling 上提、VSCode 拆分、LanguageServer 建基线和项目名迁移。

详见 [目录优先重构蓝图](directory-first-reframe-plan.md)。
