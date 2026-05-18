# VSCode Preview Refresh Strategy

状态：决策草案

最后更新：2026-05-18

本文记录 VSCode 预览后续“局部更新”和“全量重渲染”的边界。目标不是让 VSCode 侧重新解释 `.inscape`，而是在继续复用 Compiler / Tooling 输出的前提下，把作者反馈做得更轻、更快、更可预期。

## 背景

当前 VSCode 预览的主路径是：

1. VSCode 收集当前工作区和未保存 buffer override。
2. 调用 Tooling / CLI `preview-project` 生成完整 HTML。
3. webview 载入新 HTML，并通过自身状态保留当前节点、路径和选择历史。

这一模式较稳，因为预览不会在扩展内重写 parser、graph、diagnostics 或 runtime 语义。代价是保存或输入后需要重新生成 HTML。Goal 7 已补上轻量状态提示和刷新版本保护：防抖等待显示“等待刷新...”，实际生成显示“刷新中...”，旧刷新结束不会清掉新一轮状态。

## 原则

- `Inscape.Compiler` 仍是语法、节点、跳转、诊断和 source span 的真相来源。
- `Inscape.Tooling` 仍是 HTML 预览结构和资源模板的真相来源。
- VSCode 可以编排刷新、显示状态、传递源码定位消息和保存 webview 局部 UI 状态。
- VSCode 不应通过 JS 解析 `.inscape` 来判断图结构、节点内容、选项目标、诊断或 source map 是否改变。
- 局部更新只能用于不改变 Compiler / Tooling 语义产物的反馈面，或者使用未来 Tooling / LanguageServer 明确给出的 delta / classification。

## 可以局部更新的内容

这些内容可以直接在 webview 或 VSCode controller 内局部处理：

- 刷新状态：`pending`、`refreshing`、`idle`。
- 源码定位消息：预览点击源码位置、编辑器 selection reveal 到预览当前位置。
- 纯 UI 状态：当前节点、路径历史、按钮可用性、临时 loading / error 视图。
- 已由 Tooling 输出进 HTML 的 token 展示状态，例如 `[]` 查询插值 token 的视觉样式。
- 未来可独立传输的样式变量：只有在 Tooling 把 preview style payload 明确拆成独立数据后，才可考虑用消息更新 CSS 变量，而不是整页重载。

## 必须全量重渲染的内容

以下变化必须继续走 `preview-project` 全量重渲染，除非未来 Tooling / LanguageServer 提供稳定 delta：

- `.inscape` 文本变化导致节点标题、正文、选项、跳转目标、入口或 metadata 变化。
- 诊断变化，包括重复标题、缺失目标、不可达节点、空节点、选项语法等。
- source map / reveal payload 变化。
- 项目文件增删、跨文件跳转变化、工作区配置变化。
- Host Schema / Host Bridge 能力变化。
- 预览 HTML 模板、资源版本或结构变化。
- 任何需要理解 Compiler graph 或 Tooling preview model 的判断。

## 暂不做的事

- 暂不在 VSCode JS 中实现局部 DOM patch 来替换节点正文或选项。
- 暂不让 VSCode 根据文本 diff 自行推断“只改了当前节点”。
- 暂不把 preview refresh classification 做成扩展内规则表。

这些方案都会把语义判断重新塞回编辑器扩展，违背当前分层。若要做更细粒度刷新，应先由 Tooling 或 LanguageServer 输出明确的 refresh classification，例如 `statusOnly`、`styleOnly`、`sameGraphContentChanged`、`graphChanged`、`diagnosticsChanged`。

## 下一步

短期继续保持“全量 HTML 重渲染 + webview 状态保留 + 状态提示 + 版本保护”。Goal 7 后续更适合推进：

1. 验证正文 / 选项文本的 `DefinitionProvider` + selection bridge 交互，确保不回退到 `DocumentLinkProvider`。
2. 设计可选的预览 / 源码同步模式，例如 selection 跟随、点击才同步、关闭同步。
3. 如确实需要进一步降低刷新成本，先在 Tooling / LanguageServer 设计 refresh classification 契约，再让 VSCode 消费。

