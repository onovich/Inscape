# 0007：采用分层竞品参照定位 DSL 与工具链

状态：Accepted

日期：2026-04-29

## 背景

Inscape 的路线是先 DSL，再游戏引擎支持层，再编辑器，再自研引擎。当前第一阶段已经形成可运行 DSL 原型，但语法、Timeline 边界、变量查询和未来编辑器形态仍未完全定型。

如果只说“对标 Yarn / Ink / Ren'Py”，容易混淆不同阶段的目标：Yarn 更接近工程化叙事 DSL，Ink/Inky 更接近写作和即时预览体验，Ren'Py 是完整 VN 引擎，Arcweave / articy 更像编辑器和生产管线平台。

## 决定

Inscape 采用分层竞品参照：

- Yarn Spinner 是近中期工程定位的第一参照。
- Ink / Inky 是写作体验和轻量预览的第一参照。
- Ren'Py 是长期自研 VN 引擎阶段的第一参照。
- Arcweave / articy:draft 是编辑器、协作、本地化和生产管线的关键参照。
- Twine、Narrat、ChoiceScript 作为图结构原型、自研 Web/Desktop 引擎、低复杂度选择叙事的辅助参照。

同时明确 Inscape 的差异化定位：

- Inscape 是面向数据驱动宿主的叙事编译链。
- 源文本应保持剧情阅读优先，不把本地化 line id、Unity ID 或宿主类型直接写进剧情行。
- 块级叙事单元使用显式节点名，行级文本使用隐式 hash anchor。
- 第一版不引入变量、条件和自定义指令；后续状态查询也只表达查询意图，由宿主 Schema 解释。

## 原因

- Yarn Spinner 证明了节点 DSL、Unity 集成、VSCode 工具、本地化导出和运行时对话系统可以形成成熟工程闭环。
- Ink/Inky 证明了互动叙事写作工具可以保持低符号噪声和即时反馈。
- Ren'Py 证明了视觉小说引擎需要的不只是脚本，还包括完整运行时、资源、UI、存档、回滚、构建和分发。
- Arcweave / articy 提醒我们编辑器阶段必须包含资源、审校、本地化、导出和团队管线，而不只是一个文本编辑器。
- Inscape 的核心目标是将叙事源文本稳定编译为 IR 和宿主数据，必须避免过早把 DSL 设计成某个具体运行时的命令语言。

## 影响

- 语法设计优先保持文本可读、图结构明确和宿主无关。
- VSCode 工具链应继续向补全、诊断、跳转、图视图和预览方向推进。
- Unity/Bird Adapter 应通过 manifest / binding / importer 消费 IR，不让 Core 依赖 Unity 类型。
- Timeline 第一版只做引用和 hook，不直接生成完整演出时间轴。
- 编辑器阶段应在 Inky 式即时体验之外，额外设计资产、本地化、审校、导出和 Adapter 视图。

## 后续验证

- 在 `docs/dsl-ecosystem-positioning.md` 中持续维护详细竞品差异。
- 设计 Timeline hook 时，检查是否仍保持宿主引用而非宿主调用。
- 设计 Language Server 时，优先覆盖 Yarn/Inky 已证明有价值的编辑反馈。
- 设计编辑器 Alpha 时，加入生产管线视图，而不是只做文本编辑体验。
