# ADR 0014：第一方工具与资源目录边界

状态：Accepted

日期：2026-05-17

## 背景

当前仓库同时包含 Inscape DSL 的第一方工具链、VSCode 扩展、Unity 外部支持原型，以及若干样式、schema、snippet、图标、模板和打包脚本。随着目录优先重构推进，单纯用 `Internal` / `ExternalSupport` 已不足以回答两个问题：

1. VSCode 扩展究竟是 Inscape 内部产品工具，还是外部支持插件。
2. 一个可独立拆仓的项目内部，代码、资源、脚本应如何分层，避免资源继续混入源码文件。

## 决策

VSCode 扩展当前归属 `src/Internal/VSCode`。理由是它提供 Inscape DSL 的第一方作者体验，不绑定 Unity、Bird 或其他宿主项目；它消费 Compiler / Tooling / LanguageServer 契约，是 Inscape toolchain 的前端，而不是某个宿主的适配层。

`ExternalSupport` 只承载宿主或平台特定支持，例如 UnityPlugin、未来 Bird importer、宿主 adapter、宿主资源扫描和导入流程。判断标准不是“是否是工具”，而是“是否绑定外部宿主生态”。绑定外部宿主的进 `ExternalSupport`；服务 Inscape 自身作者体验的留在 `Internal`。

每个未来可能独立拆仓的项目目录，都应在项目根内区分代码、资源和开发脚本：

- `Scripts`：长期源码，或宿主生态中约定的源码入口。
- `Resources`：schema、snippet、TextMate grammar、图标、模板、HTML/CSS/JS 模板、示例配置等非编译逻辑资源。
- `Tools` 或 `Scripts/Dev`：打包、安装、生成、迁移等开发脚本。具体命名可以按宿主生态约定调整，但必须在项目 README 中说明。

这个分层发生在“项目根”内部，而不是直接在 `Internal` 或 `ExternalSupport` 顶层切 `Scripts` / `Resources`。例如：

- `src/Internal/VSCode/vscode-inscape/Resources/...`
- `src/Internal/VSCode/vscode-inscape/Scripts/...`
- `src/ExternalSupport/UnityPlugin/<UnityPackage>/Scripts/...`
- `src/ExternalSupport/UnityPlugin/<UnityPackage>/Resources/...`

不再创建只代表未来规划的空目录。规划可以写入 docs / TODO；目录只有在承载实际代码、资源或规则 README 时才保留。

## 影响

- 当前 VSCode 目录位置不需要迁到 `ExternalSupport`。
- VSCode npm package 内部后续应逐步把 `media`、`schemas`、`snippets`、`syntaxes` 和打包脚本收敛到明确的资源 / 脚本目录边界。
- `PreviewHtmlRendererDomain` 这类把大段 HTML/CSS/JS 模板嵌在 C# 字符串里的实现，应列为后续资源拆分任务；拆分时必须保持 CLI 单文件运行和 VSCode webview 刷新可用。
- UnityPlugin 下的空规划目录应删除，等真实 Unity 包结构确定后再按该项目自己的 `Scripts` / `Resources` 顶层重新创建。

## 验证

- `src/Internal/VSCode` README 明确第一方作者工具定位。
- `docs/todo.md` 和 `/goal` 计划记录资源拆分后续项。
- 仓库内不得保留没有文件、没有 README、也没有实际承载内容的规划占位目录。
