# ADR 0014：第一方工具与资源目录边界

状态：Superseded by [0015：编辑器扩展归属外部支持层](0015-editor-extension-external-support-boundary.md)

日期：2026-05-17

## 背景

当前仓库同时包含 Inscape DSL 的第一方工具链、VSCode 扩展、Unity 外部支持原型，以及若干样式、schema、snippet、图标、模板和打包脚本。随着目录优先重构推进，单纯用 `Internal` / `ExternalSupport` 已不足以回答两个问题：

1. VSCode 扩展究竟是 Inscape 内部产品工具，还是外部支持插件。
2. 一个可独立拆仓的项目内部，代码、资源、脚本应如何分层，避免资源继续混入源码文件。

## 决策

本 ADR 原先判断 VSCode 扩展归属 `src/Internal/VSCode`，理由是它提供 Inscape DSL 的第一方作者体验。这个判断已被 ADR 0015 修正：第一方维护不等于 Internal 归属；VSCode 绑定外部编辑器平台，长期应属于 `ExternalSupport/VSCode`。

`ExternalSupport` 只承载宿主或平台特定支持，例如 UnityPlugin、未来 Bird importer、宿主 adapter、宿主资源扫描和导入流程。判断标准不是“是否是工具”，而是“是否绑定外部宿主生态”。绑定外部宿主的进 `ExternalSupport`；服务 Inscape 自身作者体验的留在 `Internal`。

每个未来可能独立拆仓、拆项目、单独发布或单独交付的模块目录，都可以在模块根内区分代码、资源和开发脚本。这个规则同时适用于 Internal 与 ExternalSupport，但前提必须是“具体模块可能独立”，不是因为它位于某个大层级：

- `Scripts`：长期源码，或宿主生态中约定的源码入口。
- `Resources`：schema、snippet、TextMate grammar、图标、模板、HTML/CSS/JS 模板、示例配置等非编译逻辑资源。
- `Tools` 或 `Scripts/Dev`：打包、安装、生成、迁移等开发脚本。具体命名可以按宿主生态约定调整，但必须在项目 README 中说明。

这个分层发生在“具体模块根”内部，而不是直接在 `Internal` 或 `ExternalSupport` 顶层切 `Scripts` / `Resources`。例如：

- `src/ExternalSupport/VSCode/Resources/...`
- `src/ExternalSupport/VSCode/Scripts/...`
- `src/ExternalSupport/UnityPlugin/<UnityPackage>/Scripts/...`
- `src/ExternalSupport/UnityPlugin/<UnityPackage>/Resources/...`
- `src/Internal/Tooling/Resources/Preview/...`，仅当 Tooling 仍作为一个可能独立交付模块且 Preview 模板需要从 C# 字符串拆出时使用。

不再创建只代表未来规划的空目录。规划可以写入 docs / TODO；目录只有在承载实际代码、资源或规则 README 时才保留。

## 影响

- “当前 VSCode 目录位置不需要迁到 `ExternalSupport`”这一影响项已废弃。当前应迁到 `src/ExternalSupport/VSCode`。
- VSCode npm package 内部后续应逐步把 `media`、`schemas`、`snippets`、`syntaxes` 和打包脚本收敛到明确的资源 / 脚本目录边界。
- `PreviewHtmlRendererDomain` 这类把大段 HTML/CSS/JS 模板嵌在 C# 字符串里的实现，应列为后续资源拆分任务；拆分时必须保持 CLI 单文件运行和 VSCode webview 刷新可用。
- UnityPlugin 下的空规划目录应删除，等真实 Unity 包结构确定后再按该项目自己的 `Scripts` / `Resources` 顶层重新创建。
- Internal / ExternalSupport 的资源脚本拆分计划统一记录在 [Module Resource / Script Boundary Plan](../module-resource-script-boundary-plan.md)。

## 验证

- ADR 0015 明确 VSCode 的外部编辑器支持定位。
- `docs/todo.md` 和 `/goal` 计划记录资源拆分后续项。
- 仓库内不得保留没有文件、没有 README、也没有实际承载内容的规划占位目录。
