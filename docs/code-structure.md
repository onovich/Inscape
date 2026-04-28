# 代码结构规划

状态：基线 + 草案

第一版代码目标是跑通 DSL 到 Narrative Graph IR 的主链路，并为后续 VSCode、HTML 预览和 Unity Adapter 留出边界。

## 当前目录

```text
src/
  Inscape.Core/          DSL 解析、诊断、图模型、哈希与 IR 生成
  Inscape.Cli/           命令行工具：check、compile、preview
tests/
  Inscape.Tests/         无第三方依赖的轻量回归测试
samples/
  court-loop.inscape     图叙事与回环样例
docs/
  code-structure.md      代码结构规划
```

## 分层原则

- `Inscape.Core` 不依赖 Unity、不依赖 VSCode、不依赖 HTML 渲染，也不依赖外部包。
- `Inscape.Cli` 是开发工具层，可以输出 JSON IR 和轻量 HTML 预览。
- VSCode Language Server 后续应复用 `Inscape.Core`，而不是重新实现解析器。
- Unity Adapter 后续应消费 Narrative Graph IR，并决定是否转换为 Bird `Talking/L10N` 数据或直接运行 IR。
- Timeline / DirectorSystem 暂不进入 Core 的第一版模型，先作为后续调研与 Adapter 层问题。

## 第一版 Core 能力

- 解析显式节点：`:: node.name`
- 解析对白与旁白。
- 解析选项组与选项跳转。
- 解析默认跳转：`-> target`
- 保留 `@...` 和 `[...]` 元信息为不可执行 metadata。
- 生成行级稳定 hash。
- 诊断重复节点、缺失目标、空节点、不可达节点和选项语法问题。

## 后续预留目录

```text
src/
  Inscape.LanguageServer/    VSCode LSP，待创建
  Inscape.Preview/           HTML 预览共享包，待创建
  Inscape.UnityAdapter/      Unity/Bird 适配层，待创建
```
