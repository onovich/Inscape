# VSCode LanguageServer Migration Plan

状态：草案

最后更新：2026-05-16

本文定义 VSCode 前端从现有 JS provider 逐步迁到 `Inscape.LanguageServer` 的接入顺序和 fallback 边界。当前节点只做设计，不改变 VSCode 运行行为。

## 背景

`src/Internal/VSCode/vscode-inscape` 当前已经按 `Commands`、`WorkspaceIndex`、`LanguageFeatures`、`PreviewWebview`、`Styles`、`Bridges` 与 `ExtensionEntry` 拆分。它仍然是一个轻量 JS 前端：诊断借道 CLI，节点、speaker、host binding、metadata、Host Schema query / event 等作者提示由扩展侧轻量扫描或 CLI capability endpoint 支撑。

`src/Internal/LanguageServer` 已有第一版 C# 语义基线：diagnostics、definition、references、completion、document symbols、hover 的 probe 都直接复用 `Inscape.Compiler` 输出。它还不是完整 LSP transport，也没有接入 VSCode client。

迁移目标不是一次性删除 JS 逻辑，而是让重语义逐步回到 C# 侧，同时保留可用的作者体验和调试 fallback。

## 原则

- `Inscape.Compiler` 仍是编译语义真相。VSCode 和 LanguageServer 都不能重新实现 parser 语义。
- `LanguageServer` 直接复用 `Compiler` / `Tooling`，不借道 `Cli`，也不创建大而泛的 `ProjectService`。
- VSCode 前端保留 VSCode API、Webview、样式、命令、preview reveal bridge 和用户交互 glue。
- 第一次接入 LanguageServer 时不得同提交移除 JS fallback；删除 fallback 必须有独立节点和回归依据。
- 正文 / 选项文本仍不得回退到 `DocumentLinkProvider`。Ctrl+Hover 链接态继续由 `DefinitionProvider` 路径承担，selection bridge 继续承担预览定位。
- Host Schema query / event 与 Host Bridge binding 是作者提示能力，不是 Compiler diagnostic；未知 query / event 不能因为迁移 LanguageServer 而突然变成默认 Problems。
- 任何涉及真实 VSCode 交互的切换，都要按 `src/Internal/VSCode/vscode-inscape/README.md` 的 Regression Checklist 重建 `.vsix` 并手动 smoke test。

## 接入顺序

### L0：保持现状，建立 probe parity

当前状态。JS provider 继续服务 VSCode，LanguageServer probe 用于 C# 侧语义验证。

下一步可补充 probe parity 测试，让 diagnostics、definition、references、completion、outline、hover 对同一批样例输出稳定结果。

### L1：Diagnostics 优先迁移

先把 diagnostics 从 CLI `diagnose-project` 热路径迁到 LanguageServer 的项目级 diagnostics endpoint 或 LSP diagnostics。

前置条件：

- LanguageServer 支持项目级 source loading 和 unsaved override。
- 输出仍使用 editor 0-based `line` / `character` / `length`。
- VSCode 失败时回退现有 CLI diagnostics。

不在本阶段迁移 preview、selection reveal 或 Host Schema 提示。

### L2：Document symbols 与节点 completion

进度：document symbols / Outline 与 node completion 已完成第一步接入。VSCode 现在会先调用 `Inscape.LanguageServer --document-symbols-file` / `--completion-file`；Outline 失败时回退 JS `DslScriptNodeProvider` 扫描，node completion 会用 JS workspace node index 补齐跨文件节点。

迁移当前文档 outline 和节点跳转补全。这两项主要来自 Compiler graph / source span，风险低，适合做第一批非诊断 authoring feature。

fallback：

- LanguageServer document symbols 失败时回退 JS `DslScriptDocumentSymbolProvider`。
- LanguageServer node completion 失败时回退 JS `DslScriptNodeProvider` 当前工作区索引。

### L3：Node definition / references

迁移节点声明与 `-> target` 的 definition / references。当前进展：已完成。VSCode 通过 `Inscape.LanguageServer --definition-project` / `--references-project` 获取项目级节点导航，支持跨文件和 unsaved override；节点语义不再使用 JS workspace index fallback。

保留边界：

- 正文 / 选项文本到预览定位仍由 VSCode `PreviewRevealBridge` 承担。
- speaker、host binding、metadata 的导航暂不并入本节点。

### L4：Node / jump hover

进度：已完成。VSCode node declaration 与 jump target Hover 现在通过 `Inscape.LanguageServer --hover-project <root> <node|jump> <name> [--override source temp]` 获取项目级结果，支持跨文件与未保存内容；`DslScriptNodeProvider` 已删除对应 JS node hover markdown fallback。

保留在 VSCode / Tooling 侧的 hover：

- speaker hover
- metadata hover
- Host Bridge binding hover
- Host Schema query interpolation hover
- Host Schema event hover

这些能力依赖 Host Bridge / Host Schema authoring contracts，等 Tooling 契约稳定后再进入 LanguageServer。

### L5：Host Schema capability endpoint 收口

当前 VSCode query / event provider 优先调用 CLI `inspect-host-schema-project`，失败时直接读 JSON。长期目标是让 LanguageServer 复用 `Inscape.Tooling` 的 Host Schema reader，并向 VSCode 暴露同一 capability view。

迁移顺序：

1. LanguageServer 增加 Host Schema capability endpoint 或 LSP request。
2. VSCode query / event provider 优先调用 LanguageServer。
3. 失败时回退 CLI `inspect-host-schema-project`。
4. 再失败时暂时回退 JS direct JSON reader。
5. 只有在 packaged server、扩展开发 host、本仓库打开和普通项目打开四种场景都通过 smoke test 后，才单独移除 direct JSON fallback。

### L6：完整 LSP transport

probe parity 稳定后再引入完整 LSP transport。Transport 本身是通信层，不应成为新业务层；业务仍落在 `DslScript`、`StoryGraph`、`HostSchema` 等窄 provider / model 中。

## Fallback Matrix

| Feature | 首选来源 | 第一 fallback | 最后一层 fallback |
| --- | --- | --- | --- |
| Diagnostics | LanguageServer project diagnostics | CLI `diagnose-project` | VSCode extension diagnostic |
| Node completion | LanguageServer node completion | JS `DslScriptNodeProvider` | 无补全但不报错 |
| Document symbols | LanguageServer document symbols | JS `DslScriptDocumentSymbolProvider` | 空 outline |
| Node definition / references | LanguageServer graph provider | JS node provider | VSCode 默认无结果 |
| Node / jump hover | LanguageServer project hover | 无 JS node hover fallback | 无 hover |
| Text-to-preview reveal | VSCode `DefinitionProvider` + `PreviewRevealBridge` | 显式 `Inscape: Open Preview` / reveal 命令 | 无预览定位但源码可编辑 |
| Speaker authoring | VSCode / future LanguageServer Host Bridge provider | Host Bridge speaker ids | workspace dialogue scan |
| Host binding authoring | VSCode / future LanguageServer Host Bridge provider | Host Bridge bindings | workspace occurrence |
| Host Schema query / event | future LanguageServer HostSchema endpoint | CLI `inspect-host-schema-project` | direct JSON reader |
| Preview rendering | VSCode preview + CLI `preview-project` | CLI executable / DLL / `dotnet run` fallback | error HTML with diagnostics |

## 删除 fallback 的条件

删除任何 JS fallback 前，必须满足：

- 对应 LanguageServer 能力有内部测试覆盖。
- VSCode client 切换有可重复静态检查和手动 smoke checklist。
- `docs/todo.md` 明确记录删除节点，不能和首次接入混在同一提交。
- 失败场景仍有用户可理解的 output channel 日志或非阻断提示。
- 不改变 Compiler diagnostic 语义，不把 authoring hint 升级为默认 error。

## 下一步

建议下一节点先做 `LanguageServer` probe parity 测试或 diagnostics 项目级 endpoint 设计；不要直接改 VSCode provider 热路径。Diagnostics 是第一批接入目标，因为它最接近 Compiler 真相，也最容易保留 CLI fallback。
