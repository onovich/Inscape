# 待确认问题

状态：持续维护

最后更新：2026-05-17

这里记录当前仍值得讨论的问题。已经解决的问题应更新对应文档，必要时新增 ADR。

## 最高优先级

1. DSL 的最小可用语法还剩哪些未定边界？
   - 已确认第一版需要显式节点、对白、旁白、选项、跳转、注释和元信息；变量、条件查询和自定义指令延后。
   - 已确认长期块语法为 `# 标题`；标题是作者主身份且项目内唯一，stable node id 是系统身份。标题前空行是版式建议，不是 parser 语义。详见 [ADR 0013](adr/0013-author-title-and-stable-node-id.md)。
2. `@` 与 `[]` 如何分工？
   - 已确认当前方向：`@` 主要表达事件 / 动作 / 时机 / 状态变化，`[]` 主要表达查询 / 读取 / 文本插值。
   - 详见 [Authoring Marker Contract](authoring-marker-contract.md)、[Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md) 与 [Query Interpolation Data Contract](query-interpolation-data-contract.md)。
   - Goal 0 后，旧 `[timeline: ...]`、`[bg: ...]`、`[kind: alias]` 不再是当前主路径；如果需要处理旧文件，应通过离线迁移或历史审计文档说明。
3. 节点重命名、重复文本插入和文本微调如何迁移锚点？
   - 第一版 `line-v1` 已确认不依赖文件路径和绝对行号，并通过 `occurrence` 区分同节点重复文本。
   - 节点重命名不直接依赖标题文本本身，应通过 stable node id 维持身份。
   - 剩余实现问题是 stable id 的落盘、标题重命名识别、重复文本前插入相同文本、文本轻微改写时如何对齐。详见 [Stable Node ID Contract](stable-node-id-contract.md) 与 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)。
4. 编辑器主交互是文本优先，还是文本与图双主视图？
   - 当前倾向是“脚本主视图 + 节点图 / CSV 辅助视图”。
   - 图视图和 CSV 视图后续都可能成为一等工作台，但不应抢在 DSL 和语义契约稳定前扩大范围。
5. Unity 目标版本到底是什么？
   - 当前材料同时出现 Unity 6 与 2023 LTS，需要统一表达和兼容策略。
6. Bird Adapter 的第一版输出协议是什么？
   - 第一版优先映射 Talking / L10N，Timeline 只做外部引用；manifest、ID 分配、角色 / 资源绑定和 Unity Editor Importer 已有原型。
   - 仍需确认 Bird 项目内提交策略与真实导入边界。Bird 只是参考适配器，不应决定通用 Unity 支持层边界。
7. Host Bridge 如何设计？
   - 需要解决 Inscape 可读 ID 与项目内部 ID 不一致的问题，例如 `hasItem("badge")` 在项目中可能对应整数、枚举、GUID 或服务器主键。
   - 需要明确哪些内容属于 Host Schema 能力清单，哪些属于资源 / 对象 / 事件处理器映射，哪些可以通过代码生成或项目扫描自动生成。
   - 需要保证 Inscape 下层状态只被上层查询或内部使用，不反向查询上层业务。

## 语法设计

- 角色名和对白分隔符是否兼容中英文冒号。
- 旁白是否允许裸文本。
- 缩进是否有语义；当前倾向是不让缩进承载核心语义。
- `# 标题` 已作为长期块语法方向；标题前空行只做 style hint，不做编译错误。仍需确认空白台词或空白段落如何显式表示。
- 第一版暂不设计条件块；第二版需要确认表达式和宿主查询 Schema。
- 条件表达式候选可类似 `?hasItem("badge")->node`，但参数 ID 必须允许通过 Host Bridge 映射到项目内部编码。
- 选项语法如何兼顾阅读和结构化。
- 查询插值是否支持函数参数、命名参数或格式化参数。
- 第一版暂不支持作者自定义标签；旧 `[kind: alias]` 不升级为新推荐语义。
- 是否需要宏或模板。
- 跨文件结构如何组织章节、场景和跳转。

## 编译器

- Antlr4 和 Superpower 谁更适合第一版。
- 错误恢复需要做到什么程度。
- IR 使用 JSON、MessagePack、ScriptableObject，还是多格式输出。
- 源映射格式如何继续演进。
- 编译器是否以库优先，CLI 作为薄封装。

## 编辑器

- 实时解析频率如何控制。
- VSCode 语言服务优先使用 TextMate + LSP，还是继续保留轻量 TextMate 高亮与 Compiler/LanguageServer 诊断。
- HTML 调试预览是独立静态网页、VSCode WebView，还是两者共用同一渲染包。
- 逻辑图是否可编辑。
- 节点图如何可视化条件边、回环、复入和双向导航，而不让视图迅速失控。
- CSV 视图的边界是什么：只管本地化，还是允许承载部分配置维护；当前倾向是分开。
- 是否需要“点击预览中的角色 / 事件 / 节点，回跳代码”的统一定位协议。
- 预览端不在线时如何退化。
- 热重载 Patch 的最小协议是什么。
- 状态监视器是否允许修改变量。
- Time Travel 是否是阶段 2 必须功能，还是探索功能。

## 运行时

- Command Pipeline 是否足够，是否需要 ECS。
- 存档是否记录完整 Action 日志。
- 随机数和异步加载如何保证可回放。
- 自定义指令如何注册、验证和调试；第一版暂不做。
- 第二版查询回调方案更适合哪种模型：底层回调、宿主注册 Schema、轮询读取状态，还是混合方案。
- 宿主事件清单是否由编译器 / 烘焙器自动生成，而不是人工维护。
- 是否需要一定程度的代码生成，把 DSL 用到的 query / event 注册到宿主层。
- Unity 支持层是否采用 `[Inscape]` 一类 C# Attribute 扫描项目类型和字段，并在 Unity 内生成待配置 Host Bridge 表。
- Inscape 事件数据到达 Unity 上层后，应直接绑定事件回调、由上层轮询叙事状态，还是支持二者混合；目前不应写死为通用运行时模型。
- Unity Addressables 不应作为第一版强依赖；需研究 Unity 插件如何适配不同项目的资源管理方案。
- Timeline 第一版作为外部资源引用，Hook phase 已支持 `talking.enter` / `talking.exit` / `node.enter` / `node.exit`；长期更通用模型可能是宿主自定义事件，而不是内建 Timeline 机制。
- Bird 的 `talkingId` / `timelineId` 如何分配，是否需要项目级 ID 范围。
- 角色名、资源别名和 Timeline 名称如何绑定到宿主 ID 或 Unity 资源引用。
- Unity 上层支持层是否应作为独立插件项目，以及如何通过配置、智能识别、Attribute 扫描或代码生成匹配不同项目已有代码结构。

## 本地化

- 第一版默认 CSV，PO/XLIFF 后续再评估。
- 本地化 CSV 与宿主配置 CSV 的边界、目录结构和命名规范如何确定。
- 重复文本是否共享译文。
- 文本轻微修改时如何继承旧译文；当前 `update-l10n` 只按 `anchor` 精确继承。
- 当源文本变化时，当前翻译列是否应清空；当前倾向是清空当前表项，但保留旧版 CSV 供追溯与参考。
- 文件改名和章节移动已通过 `line-v1` 避免路径和绝对行号漂移，但节点重命名仍需 stable node id 参与。
- 是否需要翻译上下文字段，例如角色、场景、前后句。
