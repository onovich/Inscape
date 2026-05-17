# /goal 后续目标计划

状态：执行中

最后更新：2026-05-17

本文把当前剩余工作改写成 `/goal` 目标模式。每个 goal 都应独立完成、自检、验证、提交和推送；不要把多个无关 goal 合进同一提交。

研发期原则：Inscape 当前没有真实用户和已发布契约，不为旧版语法、旧配置或旧实现路径承担兼容成本。legacy / fallback 默认是待删除债务；只有为了短期切换验证才允许临时存在，并且必须在同一计划中写出删除节点。

## 执行规则

每个 goal 开始前：

1. 读取 `docs/agent-handoff.md`、`docs/todo.md` 和本文件。
2. 用 `git -c safe.directory=D:/LabProjects/Inscape status --short --branch` 确认工作区。
3. 只选择一个最小节点推进。

每个 goal 完成前：

1. 对照 [编码与命名规范](coding-conventions.md)、[回归工作流](regression-workflow.md) 和相关 ADR 自检。
2. 更新 `docs/todo.md` 与 `docs/agent-handoff.md`。
3. 运行仓库验证命令。
4. 提交并推送。

## Goal 0：研发期 legacy 清除

状态：执行中，G0.1 / G0.2 / G0.3 / G0.4 / G0.5 已完成。

目标：把已经确认不符合新规范的旧写法和兼容层从主路径移除，让样例、Compiler、VSCode、LanguageServer、Tooling 和文档都只表达当前规范。

产出：

- 主样例和测试改用 `# 标题`。
- Compiler 不再解析 `:: node.name`。
- VSCode 不再高亮、扫描、补全或提供 `:: node.name` snippet。
- legacy `[kind: alias]` / `[timeline: alias]` inline host binding 不再作为当前工具能力。
- `unitySample.roleMap` / `unitySample.bindingMap` 不再作为 Host Bridge fallback。
- 行为文档不再把 legacy 作为仍需维护的产品能力。

小节点：

- [x] G0.1 迁移 `samples/court-loop.inscape` 和内部测试到 `# 标题`，同步所有跳转目标。
- [x] G0.2 移除 Compiler / LanguageServer 对 `:: node.name` 的支持，并更新诊断文案。
- [x] G0.3 移除 VSCode 对 `:: node.name` 的 TextMate、workspace index、snippet 和文档入口。
- [x] G0.4 移除 legacy inline host binding：`[kind: alias]`、`[timeline: alias]`、`[bg: alias]` 等行为和样例。
- [x] G0.5 移除 `unitySample.*` fallback，ExternalSupport 后续只通过明确的 Host Bridge / UnityPlugin 计划推进。
- G0.6 全仓文档清理：当前行为文档只保留新规范；历史背景留在 ADR / 审计文档中。

验收：

- `rg "^::|legacy|Legacy|\\[timeline:" docs src tests samples` 只允许命中历史 ADR / 审计文件或明确的删除计划。
- `check-project samples` 和 VSCode authoring 主路径只展示 `# 标题`、`@` 事件 / 时机、`[]` 查询插值和 `hostBridge`。
- 删除旧行为后完整验证通过。

## Goal 1：stable node id 契约

状态：已完成设计，见 [Stable Node ID Contract](stable-node-id-contract.md)；其中 `:: node.name` 兼容迁移内容在 Goal 0 后只保留为历史背景。

目标：把 [ADR 0013](adr/0013-author-title-and-stable-node-id.md) 落成可实现的数据契约，先不改 parser。

产出：

- stable node id 的生成规则。
- stable node id 与 `# 标题` 的映射落盘位置。
- sidecar / migration table / 可选显式 `@id` 的取舍。
- 删除、恢复、Git 合并和冲突处理策略。

小节点：

- [x] G1.1 设计 stable node id / title map JSON 契约。
- [x] G1.2 设计标题重命名识别流程：source range、相邻文本锚点、旧标题、前后节点关系与人工确认。
- [x] G1.3 设计 `:: node.name` 到 `# 标题` 的迁移策略；Goal 0 后不再保留兼容运行路径。

验收：

- 文档能回答“标题改了，为什么本地化和外部引用不必全断”。
- 文档明确哪些情况自动迁移，哪些情况必须人工确认。

## Goal 2：本地化 diff / alignment 迁移

状态：已完成设计，见 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)。

目标：保护已有好翻译，同时正确揭示新增、删除、改写和歧义文本。

产出：

- `kept`、`new`、`changed`、`removed`、`conflict`、`stale` 状态定义。
- 块内 diff / alignment 规则。
- 重复文本 occurrence 位移处理规则。
- 人工确认报告格式。

小节点：

- [x] G2.1 设计 localization update 的状态机和 CSV / report 字段。
- [x] G2.2 设计 stable node id + line anchor + occurrence + diff 的对齐流程。
- [x] G2.3 设计 CLI `update-l10n` 的兼容迁移计划，不改变当前行为。

验收：

- 文档能回答“删一行、加一行、改一行、插入重复行”时翻译如何保留或标记。
- 不允许相似文本自动静默继承翻译；只能作为候选并要求确认。

## Goal 3：`# 标题` 语法第一刀

状态：已完成 Compiler 第一刀；Goal 0 将移除旧 `:: node.name` 兼容路径。

目标：Compiler 支持新块标题，并把旧 `:: node.name` 迁出当前规范。

产出：

- Parser 支持 `# 标题`。
- 项目级标题唯一诊断。
- 标题前缺空行 style hint 的诊断分层设计或实现。
- 测试覆盖中文标题、跨文件重复标题，并删除旧语法兼容测试。

小节点：

- [x] G3.1 增加 parser 测试和语法设计说明，先锁行为。
- [x] G3.2 实现 `# 标题` 解析与 source span。
- [x] G3.3 实现项目级 duplicate title diagnostic。
- [x] G3.4 明确旧 `:: node.name` 的迁移提示；Goal 0 后删除兼容提示和运行支持。

验收：

- 新 `# 中文标题` 样例可编译。
- 手动重名标题会报错。

## Goal 4：VSCode 标题语法体验

状态：已完成新标题体验；Goal 0 将移除旧 `:: node.name` 的 VSCode 兼容入口。

目标：让编辑器体验跟上 `# 标题`，避免 parser 支持但作者体验断层。

产出：

- TextMate 高亮支持 `# 标题`。
- Outline / completion / definition / references 识别标题。
- 新建同名标题时自动生成 `_01`。
- 手动重名通过 diagnostics 显示。

小节点：

- [x] G4.1 更新 TextMate grammar、snippets 和 README。
- [x] G4.2 更新 VSCode workspace index 对标题节点的扫描。
- [x] G4.3 增加创建标题的自动编号命令或补全策略。
- [x] G4.4 做 `.vsix` rebuild / install / Reload Window smoke test。

验收：

- `# 标题` 在 VSCode 中高亮、可补全、可跳转、可被 outline 展示。
- 不回退正文 / 选项文本的 `DefinitionProvider` + selection bridge 体验。

## Goal 5：LanguageServer 接管 VSCode 更多语义能力

状态：暂停继续新增能力，待 Goal 0 清理 legacy / fallback 后再推进。G5.1 document symbols / outline 与 G5.2 node completion 已接入 LanguageServer，但 JS fallback 需重新评估并删除。

目标：把已存在的 LanguageServer probes 接入 VSCode 热路径，逐步降低 JS workspace index 的语义权重。

产出：

- VSCode outline 优先走 LanguageServer。
- VSCode node completion 优先走 LanguageServer。
- 后续 definition / references / hover / CodeLens 逐步迁移。
- 迁移完成的语义能力不再长期保留 JS fallback；如短暂保留，必须有删除节点。

小节点：

- [x] G5.1 接入 document symbols / outline。
- [x] G5.2 接入 node completion。
- G5.3 接入 node definition / references，并删除对应 JS node definition / reference fallback。
- G5.4 接入 node / jump hover，并删除对应 JS node hover fallback。
- G5.5 清理 G5.1 / G5.2 已存在的 JS fallback 或改成明确的错误提示 / output 日志。

验收：

- 每项迁移都有 tests / probe parity 或手动 smoke 记录。
- CLI 不再作为编辑器实时语义能力的主入口。
- VSCode 不再为了旧实现路径长期保留重复语义扫描。

## Goal 6：Host Schema endpoint 收口

目标：减少 VSCode JS 直接读 JSON 的重复逻辑，让 Host Schema capability 复用 Tooling 契约。

产出：

- 评估是否把 `inspect-host-schema-project` 下沉到 LanguageServer。
- VSCode query / event provider 的 endpoint 优先级说明。
- JS direct JSON fallback 删除计划。

小节点：

- G6.1 设计 LanguageServer Host Schema capability endpoint。
- G6.2 VSCode query / event provider 优先调用 LanguageServer。
- G6.3 清理重复 JSON fallback。

验收：

- Host Schema authoring hint 不改变 Compiler 语义。
- endpoint 失败时作者体验有明确错误提示或 output 日志，不回退到旧 JSON 解析实现。

## Goal 7：体验和 ExternalSupport 尾项

目标：处理低风险体验打磨和 Unity / Bird 准备项；Unity 相关仍只做计划与验证，等设计落实后再研发。

产出：

- VSCode 预览更细粒度热刷新和刷新状态提示。
- Bird L10N 格式确认。
- Bird importer 提交策略。
- 真实 Timeline dry run 记录。

小节点：

- G7.1 VSCode 预览未保存内容热刷新和状态提示。
- G7.2 Bird L10N 字段 / 列顺序确认。
- G7.3 Bird importer 与 `InscapeGenerated` 提交策略。
- G7.4 带真实 Timeline 绑定的 Bird Import Dry Run。

验收：

- 不新增 Unity 运行时代码。
- ExternalSupport 仍不进入默认 Internal 编译链。
