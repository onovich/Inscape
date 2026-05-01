# Inscape

内景（Inscape）是一套面向叙事驱动游戏的脚本语言与轻量工具链，重点服务视觉小说、对话驱动剧情和分支叙事原型。它希望让作者更接近自然写作，同时保留工程上可验证、可定位、可自动化的结构。

> 叙事，是意识在数字时空中的精准折射。

## 它适合什么

- 视觉小说、对话驱动剧情、分支叙事原型
- 希望用接近自然语言的方式写脚本
- 需要同时保留跳转结构、调试预览和本地化入口的团队

## 目前能做什么

- 编写 `.inscape` 叙事脚本
- 在 VS Code 中获得高亮、补全、跳转、引用和预览
- 导出调试预览 HTML
- 提取本地化 CSV，并基于旧表更新

## 快速开始

- 语法速查：见 [docs/quick-syntax-guide.md](docs/quick-syntax-guide.md)
- VS Code 工具说明：见 [docs/vscode-tooling.md](docs/vscode-tooling.md)
- CLI 命令速查：见 [docs/cli-command-reference.md](docs/cli-command-reference.md)

如果你只是想快速看一个例子，可以直接打开 [samples/court-loop.inscape](samples/court-loop.inscape)。

## VS Code 体验

- 右上角预览图标：打开或切换预览
- 右上角三横线工具菜单：打开编辑器样式、预览样式、极简语法速查
- 样式文件可独立配置，不必改扩展源码

## 项目状态

当前仍处于原型阶段，但 DSL、CLI、VS Code 扩展与 HTML 预览已经形成一套可运行闭环。

更深入的设计文档、研究记录和路线图请从 [docs/README.md](docs/README.md) 进入。
