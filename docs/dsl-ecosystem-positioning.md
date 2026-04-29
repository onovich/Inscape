# DSL 生态定位对比

状态：草案

最后更新：2026-04-29

本文记录 Inscape 与主流叙事 DSL / 视觉小说工具链的定位对比。它不是竞品清单，而是为后续语法、工具链、Unity/Bird 适配和编辑器设计提供取舍坐标。

## 当前结论

Inscape 最接近的现有方案不是单一产品，而是一组分层参照：

```text
近中期工程定位      Yarn Spinner
写作与预览体验      Ink / Inky
长期 VN 引擎目标    Ren'Py
编辑器与生产管线    Arcweave / articy:draft
图结构原型心智      Twine
Web/自研引擎参照    Narrat
选择叙事参考        ChoiceScript
```

一句话归纳：

> Inscape 应采用 Yarn Spinner 级别的工程化叙事 DSL 位置，吸收 Ink/Inky 的写作流畅度，以 Ren'Py 作为长期完整 VN 引擎参照，并用 Arcweave / articy 的生产管线意识约束编辑器设计。

Inscape 需要刻意保留的差异是：它不是单纯的对话播放脚本，也不是一开始就绑定具体引擎语义的 VN 语言，而是“面向数据驱动宿主的叙事编译链”。行级隐式 hash、本地化对齐、存档回放和宿主 Adapter 是核心差异化能力。

## 对比维度

| 维度 | Inscape 当前倾向 |
| --- | --- |
| 叙事结构 | 显式节点构成有向图，允许链、树、回环和复入 |
| 写作体验 | 剧情文本优先，结构信息可被 VSCode 高亮弱化 |
| 行级身份 | 源文本不写显式 line id，编译期生成隐式 hash anchor |
| 引擎耦合 | Core 输出纯数据 IR；Unity/Bird、自研引擎均通过 Adapter 接入 |
| 条件与变量 | 第一版不做；第二版只表达查询，由宿主 Schema 解释 |
| 预览 | DSL 阶段提供 HTML / VSCode 轻预览，不追求最终演出表现 |
| 本地化 | 反向提取 + hash anchor + 宿主坐标映射 |
| 编辑器 | 后续目标是 Notion 式结构管理 + Inky 式边写边预览 |

## Yarn Spinner

相似点：

- 都采用节点、行、选项、跳转、命令等叙事构件。
- 都服务 Unity 等游戏引擎，并重视 VSCode 工具链。
- 都把本地化看作叙事工程的一等流程。
- Yarn 的节点图、补全、实时预览和 Unity 本地化流程，非常接近 Inscape 第一阶段到第二阶段的工程目标。

关键差异：

- Yarn 使用源文件中的 line tag 作为本地化 ID；Inscape 当前坚持行级隐式 hash，避免把稳定 key 噪声写进剧本文本。
- Yarn 语言内置变量、控制流、命令和函数；Inscape 第一版不做变量和自定义指令，第二版也倾向只表达数据查询，把执行交给宿主。
- Yarn 更像“可运行叙事脚本 + Dialogue Runner”；Inscape 更像“叙事源文本 -> Narrative Graph IR -> 宿主 Adapter”的编译链。
- Yarn 的 `<<command>>` 风格工程边界清晰，但会增加文本噪声；Inscape 后续设计命令 / hook 时应先证明必要性。

设计启发：

- VSCode 阶段应继续补足正式 Language Server、项目级补全、图视图和 WebView 预览。
- 本地化流程要保留“可导出、可回填、可审校”的工程闭环。
- 如果引入宿主 hook，应保持声明式引用，而不是让 DSL 直接调用宿主 API。

## Ink / Inky

相似点：

- 都强调创作者写作心流，文本优先，符号尽量少。
- 都适合高分支、可回环的互动叙事。
- Inky 的“边写边玩”体验与 Inscape 第一阶段后期的 HTML / VSCode 预览目标高度相似。
- Ink 核心用 C# 编写，对 Unity 集成友好，这与 Inscape Core 的技术路线相近。

关键差异：

- Ink 的文本流和选择层级非常优雅，但工程级资源绑定、本地化锚点、宿主数据映射不是它最主要的设计中心。
- Ink 可以把变量、条件和逻辑写进故事内部；Inscape 需要更强的数据边界，避免 DSL 直接变成业务逻辑容器。
- Inscape 的显式节点名承担图导航、存档、定位和宿主映射职责，不能完全追求 Ink 的连续文本感。

设计启发：

- 结构符号应少而稳定，例如 `:: node`、`? prompt`、`- option -> target`、`-> target`。
- 预览工具要优先缩短“修改文本 -> 看到叙事路径变化”的反馈周期。
- 后续编辑器可以参考 Inky 的即时体验，但必须额外提供项目资产、定位、审校和 Adapter 视图。

## Ren'Py

相似点：

- 都面向视觉小说和叙事驱动游戏。
- 都需要对白、旁白、菜单、跳转、本地化、存档和演出表达。
- Inscape 第四阶段自研引擎可以把 Ren'Py 作为完整 VN 引擎标杆。

关键差异：

- Ren'Py 是完整游戏引擎和运行时语言，包含显示图片、音频、转场、UI、Python 语句等能力。
- Inscape 第一阶段不应复制 Ren'Py 的引擎语义，否则会过早绑定演出层和业务层。
- Ren'Py 的优势在“从脚本直接做成游戏”；Inscape 当前优势应在“将剧本稳定编译成可被不同宿主消费的数据”。

设计启发：

- 自研引擎阶段需要补齐 Ren'Py 已经成熟的工程面：资源、转场、历史、回滚、存档、设置、构建和分发。
- DSL 第一版只保留与叙事图和文本身份相关的能力，把视觉演出放到 Timeline hook / Presentation IR 的后续设计中。

## Twine / SugarCube

相似点：

- passage/node 图非常贴近用户对“图叙事”的直觉。
- 非线性结构、回环、复入、多出口选择都很自然。
- 浏览器预览和快速原型体验值得借鉴。

关键差异：

- Twine 更偏视觉化创作和浏览器互动小说；Inscape 需要更强的源码管理、编译产物、宿主 Adapter 和本地化锚点。
- SugarCube 的宏能力很强，但宏很容易把 DSL 推向宿主逻辑混杂。
- Inscape 的节点名和行 hash 必须能支撑工业管线，而不仅是原型播放。

设计启发：

- 后续图视图可以用 Twine 心智：节点是可浏览、可定位、可跳转的叙事单元。
- 第一版 DSL 不应引入通用宏系统；自定义能力应等宿主 Schema 和 Adapter 边界清晰后再设计。

## ChoiceScript

相似点：

- 文本优先，语法简单，选择驱动叙事清晰。
- 适合参考“低记忆负担”的语法设计。

关键差异：

- ChoiceScript 更偏选择小说和属性数值叙事，图结构与引擎适配不是核心。
- 它的 stat / condition 心智适合第二版变量调研，但不适合作为 Inscape 的主定位。

设计启发：

- 后续状态查询语法应保持简单可读，避免把表达式做成完整编程语言。

## Narrat

相似点：

- 面向叙事 RPG，可发布 Web / Desktop。
- 支持脚本、配置、本地化、热重载和插件。
- 对 Inscape 第四阶段自研引擎和“Live-Director”热更新方向有参考价值。

关键差异：

- Narrat 是一套可直接做游戏的 Web/Desktop 引擎；Inscape 目前首先是 DSL + 编译链 + 宿主适配。
- Narrat 的配置和内置系统更完整；Inscape 现在不应在 DSL 阶段抢先引入完整 RPG 系统。

设计启发：

- 自研引擎阶段可以参考其热重载、配置、插件、本地化和 Web/Desktop 分发能力。
- 第一阶段 HTML 预览只做叙事调试，不要被完整游戏 UI 需求拉偏。

## Arcweave / articy:draft

相似点：

- 都重视节点图、可视化编辑、团队协作、引擎集成、导出和本地化。
- 它们更接近 Inscape 第三阶段编辑器和生产管线目标，而不是第一阶段 DSL。

关键差异：

- Arcweave / articy 是视觉化生产平台；Inscape 先从纯文本 DSL 和 Git 友好的文件体系开始。
- Inscape 的优势应是文本可读、可 diff、可由 CI 编译验证，同时后续编辑器建立在同一套 IR 上。
- 商业工具通常以平台为中心；Inscape 应保持 Core 与宿主、编辑器、渲染层解耦。

设计启发：

- 编辑器阶段要考虑资产库、评论、审校状态、本地化上下文、导出记录和图调试，而不只是好看的文本编辑器。
- 生产管线需要保留 JSON / CSV / manifest 等中间产物，方便进入 Unity/Bird 或未来自研引擎。

## 相似度排序

| 排名 | 方案 | 与 Inscape 的关系 | 主要理由 |
| --- | --- | --- | --- |
| 1 | Yarn Spinner | 最近的近中期工程参照 | DSL + Unity + VSCode + 本地化 + 节点图 |
| 2 | Ink / Inky | 最近的写作体验参照 | 文本流畅、即时预览、C# core |
| 3 | Arcweave / articy:draft | 最近的未来编辑器与管线参照 | 图编辑、团队、导出、本地化、引擎集成 |
| 4 | Ren'Py | 最近的长期完整 VN 引擎参照 | 完整运行时、VN 生态、构建分发 |
| 5 | Twine / SugarCube | 图叙事和浏览器原型参照 | passage 图、低成本预览 |
| 6 | Narrat | 自研 Web/Desktop 引擎参照 | 热重载、插件、配置、发布 |
| 7 | ChoiceScript | 选择叙事与变量简洁性参照 | 低复杂度文本选择模型 |

## 对 Inscape 语法设计的影响

当前应继续坚持：

- 块级使用显式节点名，行级使用隐式 hash。
- 节点之间构成有向图，不限制成树或线性链。
- 源文本尽量保持剧本可读，不把本地化 key、宿主 ID、Unity 类型直接写进对白旁边。
- 第一版不做变量、条件和自定义指令。
- 第二版即使引入状态查询，也只表达“查询意图”，不绑定具体实体、服务端、Unity API 或副作用。

需要继续调研的语法问题：

- Timeline hook 应使用行内标签、块级 metadata，还是独立 hook 行。
- 资源别名应属于 DSL、项目配置，还是宿主绑定文件。
- 宿主 query schema 如何让 VSCode 补全、诊断和 Hover 能读到。
- 节点重命名如何保持存档、本地化和外部引用迁移。
- 是否需要显式稳定 node id，还是节点名本身足以承担块级身份。

## 对路线图的影响

阶段 1 应优先补齐：

- DSL 语法定位文档和未定项清单。
- Language Server 范围草案。
- VSCode WebView 预览方案。
- 节点重命名 / 迁移表 / 本地化模糊匹配设计。

阶段 2 应优先补齐：

- Unity/Bird Adapter 的宿主绑定 Schema。
- Timeline hook 最小表达。
- Unity Editor Importer，从 manifest 生成或更新 `TalkingSO`。

阶段 3 应优先参考：

- Inky 的即时预览。
- Yarn VSCode 的图视图、补全和诊断。
- Arcweave / articy 的生产管线、审校、本地化和资源上下文。

阶段 4 应优先参考：

- Ren'Py 的完整 VN 运行时能力。
- Narrat 的 Web/Desktop、自定义配置、热重载和插件能力。

## 参考源

- [Yarn Spinner: Learn the Yarn Language](https://yarnspinner.dev/docs-beta/yarn/)
- [Yarn Spinner: Localisation and Assets](https://yarnspinner.dev/docs-beta/unity/assets-and-localization/)
- [Ink GitHub](https://github.com/inkle/ink)
- [Inky GitHub](https://github.com/inkle/inky)
- [Ren'Py documentation](https://www.renpy.org/doc/html/)
- [Ren'Py translation documentation](https://www.renpy.org/doc/html/translation.html)
- [Twine Cookbook: Passages](https://www.twinery.org/cookbook/introduction/passages.html)
- [ChoiceScript Introduction](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/)
- [Narrat Documentation](https://docs.narrat.dev/)
- [Arcweave Features](https://arcweave.com/features)
- [Arcweave Unity Integration](https://docs.arcweave.com/integrations/unity)
- [articy:draft Localization](https://www.articy.com/help/adx/Localization_WhatsThis.html)
