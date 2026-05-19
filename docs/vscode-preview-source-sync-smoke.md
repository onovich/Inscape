# VSCode Preview Source Sync Smoke

状态：执行中

最后更新：2026-05-18

本文收口 Goal 7 里 `inscape.preview.sourceSyncMode = off|click|selection` 的手动 smoke。它只描述 VSCode 交互验证，不改变 Compiler、Tooling、LanguageServer 或 Runtime 行为。

## 适用范围

- `src/ExternalSupport/VSCode/Scripts/Preview/**`
- `src/ExternalSupport/VSCode/Scripts/DslScript/**`
- `src/ExternalSupport/VSCode/Scripts/ExtensionManifestEntry.js`
- `src/ExternalSupport/VSCode/package.json`

只要这些区域涉及正文 / 选项文本的预览定位、selection bridge、source sync mode、webview revealSource 消息或预览打开策略，就应重跑这份 smoke。

## 准备步骤

先按扩展标准流程重建并安装 `.vsix`：

```powershell
cd src\ExternalSupport\VSCode
npm run rebuild:vsix
```

安装后，在仓库根目录执行对应模式的 smoke 启动脚本：

```powershell
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode off
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode click
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode selection
```

每次只跑一种模式，并在进入下一种模式前关闭前一个 smoke VSCode 窗口。这个脚本是用来给单模式创建独立工作区的，不是让一个窗口连续切三次模式。

脚本会：

- 生成临时 `.code-workspace` 文件；
- 把 `inscape.preview.sourceSyncMode` 写成目标模式；
- 打开仓库工作区并定位到 `samples/court-loop.inscape`；
- 在终端打印本轮应检查的交互结果。

如果只想检查脚本参数和临时工作区生成，不实际打开 VSCode：

```powershell
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode click -NoOpen
```

## 手动检查

### `off`

1. 打开 `samples/court-loop.inscape`。
2. 确保预览尚未被 Ctrl+Click 文本自动拉起。
3. 对正文 / 选项文本执行 Ctrl+Hover、Ctrl+Click。

预期：

- 文本不应通过 Ctrl+Click 触发预览 reveal。
- 显式命令 `Inscape: Reveal Current Selection In Preview` 仍然可用。
- `-> target` 的定义跳转不受影响。

### `click`

1. 打开预览。
2. 对正文 / 选项文本执行 Ctrl+Hover、Ctrl+Click。
3. 随意移动普通光标或改变选区，但不执行 Ctrl+Click。

预期：

- Ctrl+Hover 才出现瞬时链接态。
- Ctrl+Click 会复用预览并定位到匹配内容。
- 对于 `- 选项 -> 目标标题` 这种行，可点击的“预览定位区域”是 `->` 之前的选项文本；而 `->` 之后的目标标题区域仍然是 Go to Definition。
- 单纯移动光标或改变选区，不应让预览自动跟随。
- 不应因为普通选区变化而隐式打开新预览面板。

### `selection`

1. 先手动打开预览。
2. 在源码编辑器里，用鼠标拖选、`Shift + 方向键`，或直接把光标点到不同的对白 / 旁白 / 选项文本上，让当前选区或光标落到另一段文本内。
3. 观察预览是否只做轻量定位，而不是重建页面。

预期：

- 这里的 selection 指的是 `.inscape` 源码编辑器里的文本选区，不是预览面板中的点击交互。
- 已打开预览会跟随当前源码选区轻量定位。
- 选区变化不应隐式打开预览面板。
- 选区变化不应触发整页重渲染，也不应重新走一轮“等待刷新...” / “刷新中...”。
- `Ctrl+Click` 仍可继续显式 reveal。

## 记录要求

如果当前环境无法实际点击验证，结论必须明确写成：

```text
已完成静态检查、脚本化 smoke 入口和 .vsix 重建安装；
本轮未执行真实 VSCode 手动点击 smoke。
```

如果实际完成了三种模式的点击检查，应在 `docs/agent-handoff.md` 与 `docs/todo.md` 同步记录日期、模式和结果。
