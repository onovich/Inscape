# Module Resource / Script Boundary Plan

状态：执行中

日期：2026-05-18

## 目标

`Resources` / `Scripts` 不是 `Internal` 或 `ExternalSupport` 顶层的通用分类桶。它们只在“未来可能独立拆仓库、拆项目、单独发布或单独交付”的模块根内出现。

这个规则同时适用于 Internal 与 ExternalSupport：

- Internal 模块如果未来可能单独发布或拆项目，可以在该模块根内拆 `Resources` / `Scripts`。
- ExternalSupport 模块如果绑定外部平台、宿主插件或可单独交付，也可以在该模块根内拆 `Resources` / `Scripts`。

## 判断标准

只有满足以下任一条件，才考虑在模块根内建立 `Resources` / `Scripts`：

- 模块未来可能独立拆仓。
- 模块未来可能成为独立项目、包、插件或可发布产物。
- 模块存在大量非源码资源，例如 schema、snippet、grammar、图标、模板、示例配置、HTML/CSS/JS 模板。
- 模块存在打包、安装、生成、迁移等开发脚本，且这些脚本只服务该模块。

不满足这些条件时，继续使用现有业务 / Role 目录，不为了整齐提前创建资源桶。

## Internal 侧计划

### `src/Internal/Tooling`

当前 `Tooling` 是共享用例层，仍作为单一项目根维护。Preview HTML/CSS/JS 模板已经从 `PreviewHtmlRendererDomain` 的 C# 字符串中拆出，落在 Tooling 项目根内：

```text
src/Internal/Tooling/
  Resources/
    Preview/
      preview-template.html
      preview.css
      preview.js
```

该目录存在的依据是：Preview 静态模板属于 CLI / VSCode / future LanguageServer 共享的 Tooling 交付资源，而不是 C# 语义代码。如果未来 `Preview` 从 Tooling 中拆成独立项目，再在独立 `Preview` 项目根内建立 `Resources` 并迁移这些文件。

### `src/Internal/LanguageServer`

当前不创建 `Resources` / `Scripts`。LanguageServer 仍是 C# 语义服务基线，暂无独立模板资源或模块脚本。

### `src/Internal/Runtime`

当前不创建 `Resources` / `Scripts`。Runtime 仍是最小运行期状态机基线，没有真实运行宿主和资源交付形态前不扩张。

### `src/Internal/Cli`

当前不创建 `Resources` / `Scripts`。CLI 只负责命令行入口和输出适配；脚本仍应留在仓库 `tools/` 或具体可独立模块根内。

## ExternalSupport 侧计划

### `src/ExternalSupport/VSCode`

VSCode 是可独立发布的 extension package，应在自身模块根内拆分：

```text
src/ExternalSupport/VSCode/
  Resources/
    Media/
    Schemas/
    Snippets/
    Syntaxes/
  Scripts/
  ...
```

`package.json` 中的资源路径必须同步更新。

### `src/ExternalSupport/UnityPlugin`

UnityPlugin 下每个未来可独立交付的 Unity package 应在自己的包根内拆分 `Scripts` / `Resources`。不要在 `src/ExternalSupport/UnityPlugin` 顶层建立通用资源桶。

UnitySample 当前仍是实验样例，下一轮应先明确它是继续作为 `UnitySample` 独立样例模块，还是被替换为真实 Unity package。确定前只做命名和结构计划，不做 Unity 功能研发。

### `src/ExternalSupport/UnityPlugin/unity-bird-importer`

当前是旧实验目录。后续先做命名和位置计划，若保留为独立工具或 Unity package，再在其模块根内决定 `Scripts` / `Resources`。

## 禁止事项

- 不创建 `src/Internal/Resources`。
- 不创建 `src/Internal/Scripts`。
- 不创建 `src/ExternalSupport/Resources`。
- 不创建 `src/ExternalSupport/Scripts`。
- 不为了未来规划创建空的 `Resources` / `Scripts`。
- 不把可共享语义代码藏进 `Resources` 或 `Scripts`。

## 验收

- `Resources` 和 `Scripts` 只出现在具体可独立模块根内。
- 每个出现 `Resources` / `Scripts` 的模块 README 都说明拆分依据。
- 所有 package manifest、测试路径和验证命令同步更新。
- 空目录检查通过。
