# ADR 0015：编辑器扩展归属外部支持层

状态：Accepted

日期：2026-05-17

## 背景

ADR 0014 曾把 VSCode 扩展判断为 Internal 第一方作者工具。这一判断混淆了“第一方维护”和“Internal 核心归属”。

VSCode 扩展确实由 Inscape 第一方维护，也直接服务 `.inscape` 作者体验；但它绑定 VSCode 这个外部编辑器平台，包含 VSCode extension manifest、TextMate grammar、VSCode webview、命令注册、图标、VSIX 打包和安装流程。未来如果出现自研编辑器、JetBrains 插件、Web 编辑器或其他编辑器支持，VSCode 用户和自研编辑器用户可能完全不同。

如果保持 `src/Internal/VSCode`，未来拆仓或发布自研编辑器时会让核心工具链继续拖着 VSCode 支持代码。这不符合“Internal 保持 Inscape 核心产品契约，ExternalSupport 承载外部平台集成”的长期边界。

## 决策

VSCode 扩展归属 `src/ExternalSupport/EditorExtensions/VSCode/vscode-inscape`。

`ExternalSupport` 不只表示游戏宿主如 Unity / Bird，也表示外部平台集成。编辑器扩展属于外部平台支持模块，尽管它可以由 Inscape 第一方维护。

Internal 仍保留这些核心层：

- `Compiler`
- `Tooling`
- `Cli`
- `LanguageServer`
- `Runtime`

编辑器扩展可以依赖 Internal contracts，但不得成为 DSL 语义真相。VSCode、未来自研编辑器、JetBrains、Web editor 等都应通过 Compiler / Tooling / LanguageServer / Runtime contracts 取数，而不是互相依赖。

## 判断标准

- 绑定外部编辑器 SDK、插件 manifest、打包格式或 UI 生命周期的代码，进入 `ExternalSupport/EditorExtensions/<EditorName>`。
- 不绑定具体外部编辑器，只提供 Inscape 协议、语义、运行时、数据契约或可复用工具链的代码，留在 `Internal`。
- “第一方维护”不是进入 `Internal` 的充分条件。
- “服务作者体验”也不是进入 `Internal` 的充分条件；关键是是否绑定外部平台。

## 影响

- 旧 `tools/vscode-inscape` 或 `src/Internal/VSCode/vscode-inscape` 残留迁移到 `src/ExternalSupport/EditorExtensions/VSCode/vscode-inscape`。
- 文档、测试和验证命令中的 VSCode 路径同步改到新位置。
- `src/Internal/VSCode` 下的空规划目录不再保留。
- 后续如果做自研编辑器，应建立独立项目，不复用 VSCode package 内部结构；共享能力应下沉到 Internal 的 LanguageServer / Tooling / Runtime contracts。

## 验证

- 仓库中没有空的 `src/Internal/VSCode` 规划目录。
- VSCode 扩展仍能 `node --check`、JSON parse、`npm run rebuild:vsix`。
- Compiler / Tooling / LanguageServer / Runtime 不依赖 VSCode 扩展项目。
