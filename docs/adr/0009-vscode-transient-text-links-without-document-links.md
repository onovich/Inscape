# 0009：VSCode 正文链接态不用 DocumentLinkProvider

状态：Accepted

日期：2026-05-01

## 背景

Inscape 的 VSCode 原型希望让正文、旁白、选项提示和选项文本具备一种低干扰的“可跳转”体验：

- 平时不高亮、不显示下划线。
- 按住 Ctrl 并把鼠标指向文本时，才显示链接态。
- 作者仍然可以从这些文本快速切到预览或相关上下文。

实现过程中曾多次尝试把 `DocumentLinkProvider` 用在正文、选项标题和选项文本上，再配合 TextMate scope、decorations 或样式文件去“压掉”它的默认视觉表现。

这些尝试反复导致两类回归：

1. 整段文本常驻下划线。
2. 为了压掉常驻下划线，又把链接态一并压没，导致永远没有下划线或交互消失。

问题的根因不是单纯“颜色或 CSS 没调好”，而是把 `DocumentLinkProvider` 用在了一个并不适合的交互目标上。

## 决定

对于 `.inscape` 编辑器中的正文、旁白、选项提示和选项文本：

1. 不使用 `DocumentLinkProvider` 提供链接态。
2. 使用 `DefinitionProvider` 返回精确文本范围，让 VSCode 只在 Ctrl+指向时显示原生链接态。
3. `DefinitionProvider` 的目标保持为当前文档的精确范围，用于维持 VSCode 原生 Ctrl+指向链接态。
4. 扩展在 `onDidChangeTextEditorSelection` 中识别刚刚由正文 / 选项 `DefinitionProvider` 产生的 Ctrl+Click 选择事件，再调用 `inscape.revealInPreview` 打开或复用预览并定位到对应文本。
5. 从文本打开或刷新预览的动作，同时保留显式命令入口作为兜底：
   - `Inscape: Reveal Current Selection In Preview`
   - 工具菜单中的“在预览中定位当前文本”
6. 不再尝试通过 TextMate scope、editor decorations 或 `...TextDecoration` 样式字段去覆盖 `DocumentLinkProvider` 的默认渲染。

## 原因

### 1. `DocumentLinkProvider` 的职责不匹配

`DocumentLinkProvider` 更适合“这个范围本身就是链接”的场景，例如 URL、文件路径、外部资源引用。

而 Inscape 的正文和选项文本不是长期可见的链接文本，它们需要的是“按需显现的导航 affordance”。把两者混为一谈，会让 VSCode 按 editor link 的方式持续渲染这些文本。

### 2. 样式覆盖无法稳定修正语义层误用

后续尝试通过以下手段修正常驻下划线，都被证明不稳定：

- 调整 TextMate scope
- 用 decorations 改颜色或 `textDecoration`
- 在 `inscape.editor-style.json` 里写 `...TextDecoration: none`
- 懒解析 document links

这些办法最多只能“碰巧”压掉某一层视觉效果，但会顺带破坏 Ctrl+Hover 链接态，或者在不同文本类别上表现不一致。

### 3. `DefinitionProvider` 更接近目标交互

正文和选项文本真正需要的，不是“它们本身是链接”，而是“它们在 Ctrl+指向时可导航”。

`DefinitionProvider` 天然更适合这类编程式导航体验，也和本项目里节点跳转、speaker 跳转、宿主绑定跳转的整体模型更一致。对于正文 / 选项文本，它负责提供 Ctrl+指向的链接态；Ctrl+Click 后的预览定位动作由 selection bridge 触发，从而不引入 document link 的常驻下划线。

## 影响

正面影响：

- 默认状态不再出现正文、选项文本的常驻下划线。
- Ctrl+指向态恢复为低干扰、按需显现。
- 文本样式和文本交互解耦，不再互相打架。
- 后续维护者更容易定位问题：导航问题看 provider，样式问题看 decorations / theme。

代价与边界：

- 正文 / 选项文本到预览的跳转不再依赖 `DocumentLinkProvider` 的命令 URI 路径，而是通过 `DefinitionProvider` 记录 pending reveal，再由 selection bridge 触发。
- 显式预览定位命令仍然保留，作为键盘流和菜单兜底入口。

## 禁忌

未来若再次需要“正文 / 选项文本可导航”，不要再做以下事情：

1. 不要重新给这些文本注册 `DocumentLinkProvider`。
2. 不要试图用 `textDecoration: none` 去修复 `DocumentLinkProvider` 的常驻下划线。
3. 不要把 TextMate scope 颜色问题误诊成链接态问题。
4. 不要在未重装 `.vsix` 的情况下判断“修复已生效”。

## 验证清单

每次修改正文链接态相关逻辑后，都至少验证：

1. 默认状态下，正文、选项提示、选项文本没有常驻下划线。
2. 按住 Ctrl 并把鼠标指向这些文本时，才出现链接态。
3. Ctrl+Click 正文、选项提示、选项文本会打开或复用预览，并定位到对应页面。
4. speaker、`-> target`、宿主绑定等已有导航能力没有回归。
5. 已重新执行 `npm run rebuild:vsix` 并覆盖安装扩展。

## 关联文件

- [tools/vscode-inscape/extension.js](../../tools/vscode-inscape/extension.js)
- [docs/vscode-tooling.md](../vscode-tooling.md)
- [docs/agent-handoff.md](../agent-handoff.md)
