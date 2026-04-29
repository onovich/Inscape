# TODO

状态：持续维护

本文件记录已经能执行或需要调研的工作。仍未形成共识的问题放在 [待确认问题](open-questions.md)，已经形成长期决策的问题放在 [ADR](adr/README.md)。

## 接力优先队列

下一位接手者建议按以下顺序推进：

1. 设计资源别名、Timeline 名称到 Bird 整数 ID / Unity 资源引用的绑定方式。
2. 设计 Timeline Hook 的最小表达方式，但只做引用，不把 DSL 变成演出时间轴语言。
3. 设计 Unity Editor Importer：读取 `bird-manifest.json` 并生成或更新 `TalkingSO`。
4. 设计本地化模糊匹配与人工确认报告，不要直接自动复用相似文本译文。
5. 收敛 Language Server 能力范围，再决定是否创建 `src/Inscape.LanguageServer/`。

## 文档与接手效率

- [x] 建立 Agent 接手指南，记录当前快照、检索地图、工作方法和验证命令。
- [x] 建立根目录 `AGENTS.md`，为未来 agent 提供最短入口。
- [ ] 每次完成阶段性提交后，同步更新 [Agent 接手指南](agent-handoff.md) 的当前快照。

## 阶段 1：DSL 与轻工具链

- [x] 准备一个图叙事样例，包含复入、回环和多出口选择。
- [x] 用 Yarn-like、Ink-like、Ren'Py-like、Inscape-like 四种写法重写同一片段，比较阅读感、解析复杂度和 IR 映射成本。
- [x] 定义第一版最小语法：显式节点、对白、旁白、选项、跳转、注释、元信息。
- [x] 定义第一版节点名规范：字符集、层级分隔符和基础诊断。
- [x] 定义第一版跨文件节点唯一性：项目内节点名全局唯一。
- [ ] 定义节点重命名迁移策略。
- [x] 定义并实现行级隐式 hash 的输入、规范化规则、版本号和碰撞处理。
- [x] 实现第一版本地化 CSV 提取，覆盖旁白、对白、选择提示和选择项。
- [x] 实现旧翻译表按锚点精确继承，并标记新增、保留、删除条目。
- [ ] 设计旧翻译表的模糊匹配与人工确认流程。
- [ ] 设计显式稳定 ID 或迁移表，用于处理节点重命名和重复文本插入。
- [x] 设计 Narrative Graph IR 的 JSON 草案。
- [x] 设计源映射格式，覆盖节点、行、选项、跳转和诊断。
- [x] 实现项目级多文件编译与跨文件跳转诊断。
- [x] 设计并实现第一版项目入口声明：节点内 `@entry`。
- [x] 设计并实现项目入口 CLI 覆盖策略：项目级命令支持 `--entry node.name`。

## VSCode 支持

- [x] 设计 `.inscape` 文件扩展名和语言 ID。
- [x] 编写 TextMate 语法高亮草案，弱化元信息并凸显剧情文本。
- [x] 添加基础 snippets：节点、对白、选择组、跳转、元信息、行内标签。
- [x] 添加 VSCode 实时诊断桥接，复用 CLI / `Inscape.Core` 输出。
- [x] 添加工作区节点补全和当前文件 Outline 原型。
- [x] 添加 `-> target` 的 VSCode 跳转定义原型。
- [x] 添加节点声明和 `-> target` 的 VSCode 引用查找原型。
- [x] 添加节点声明和 `-> target` 的 VSCode Hover 摘要。
- [x] 添加 VSCode 命令：导出项目本地化 CSV。
- [x] 添加 VSCode 命令：基于旧 CSV 更新项目本地化表。
- [ ] 设计 Language Server 能力范围：补全、诊断、跳转定义、引用查找、大纲、悬浮说明。
- [ ] 设计补全数据来源：当前文件节点、项目节点、角色表、资源别名、宿主 Schema。
- [x] 定义第一版诊断清单：重复节点、非法节点名、缺失目标、不可达节点、空节点、选项语法问题。

## HTML 调试预览

- [x] 设计无引擎预览的最小 UI：当前节点、文本、选项、路径、诊断和锚点。
- [x] 决定第一版预览载体：CLI 生成静态 HTML；VSCode WebView 后续复用。
- [x] 定义第一版预览输入：读取 Compiler Core 输出的 IR。
- [x] 支持节点回环、重开、返回上一步和路径记录。
- [x] 显示行级 hash 和源位置，方便调试本地化与存档定位。
- [x] 支持项目级 HTML 预览，读取 `compile-project` 同结构的项目 IR。

## Unity / Bird 适配调研

- [x] 梳理 Bird `TalkingTM` 与 Inscape Node/Line/Edge 的字段映射。
- [x] 梳理 Bird `L10N_Talking` 当前 `talkingId + index` 模型与行级 hash 模型的迁移方式。
- [ ] 低优先级：结合 Bird `L10N` 真实格式决定是否调整当前 Inscape CSV 字段和列顺序。
- [x] 调研 `StorySystem` 是否可以直接消费 Narrative Graph IR，而不是必须生成 ScriptableObject。
- [x] 调研 Unity Adapter 输出格式：JSON、二进制、ScriptableObject、CSV，或多格式。
- [x] 深入调研 `DirectorSystem` / `TimelineEffectTM`：判断 Timeline 是外部演出资源、节点 Hook，还是未来 Presentation IR。
- [x] 设计 `bird-manifest.json` 的字段、版本、兼容策略和最小样例。
- [x] 设计 `talkingId` 分配策略第一版：默认从 `100000` 顺序分配，并支持 `--bird-talking-start` 覆盖。
- [ ] 设计 `talkingId` / `timelineId` 自动避让策略，扫描现有 Bird 资源避免冲突。
- [x] 设计并实现角色名到 Bird `roleId` 的第一版 CSV 绑定：`--bird-role-map speaker,roleId`。
- [ ] 设计资源别名、Timeline 名称到 Bird 整数 ID / Unity 资源引用的绑定方式。
- [x] 设计 Bird 兼容 `L10N_Talking.csv` 导出，并保留 Inscape `anchor` 审校表。
- [x] 原型实现 `export-bird-project`：从项目 IR 生成 manifest 与 Bird L10N CSV。
- [ ] 设计 Unity Editor Importer：读取 manifest 并生成或更新 `TalkingSO`，不让 Core 依赖 Unity。
- [ ] 设计 Timeline 引用的第一版最小表达方式，但不让 DSL 直接变成演出时间轴语言。

## 变量与状态查询，第二版前置调研

- [ ] 对比 Yarn、Ink、Ren'Py、Twine 的变量、函数和宿主 API 边界。
- [ ] 设计表达式只表达数据查询的模型，不在 DSL 中绑定具体业务实体或服务端。
- [ ] 设计宿主查询 Schema：谓词名、参数类型、返回类型、同步/异步、错误策略。
- [ ] 明确查询表达式是否允许副作用。当前倾向是不允许。
