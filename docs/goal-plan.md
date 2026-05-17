# /goal 后续目标计划

状态：执行中

最后更新：2026-05-17

本文把当前剩余工作改写成 `/goal` 目标模式。每个 goal 都应独立完成、自检、验证、提交和推送；不要把多个无关 goal 合进同一提交。

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

## Goal 1：stable node id 契约

状态：已完成设计，见 [Stable Node ID Contract](stable-node-id-contract.md)。

目标：把 [ADR 0013](adr/0013-author-title-and-stable-node-id.md) 落成可实现的数据契约，先不改 parser。

产出：

- stable node id 的生成规则。
- stable node id 与 `# 标题` 的映射落盘位置。
- sidecar / migration table / 可选显式 `@id` 的取舍。
- 删除、恢复、Git 合并和冲突处理策略。

小节点：

- [x] G1.1 设计 stable node id / title map JSON 契约。
- [x] G1.2 设计标题重命名识别流程：source range、相邻文本锚点、旧标题、前后节点关系与人工确认。
- [x] G1.3 设计 `:: node.name` 到 `# 标题` 的兼容迁移策略。

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

状态：已完成 Compiler 第一刀；VSCode authoring 体验见 Goal 4。

目标：Compiler 支持新块标题，同时保留旧 `:: node.name` 兼容路径。

产出：

- Parser 支持 `# 标题`。
- 项目级标题唯一诊断。
- 标题前缺空行 style hint 的诊断分层设计或实现。
- 测试覆盖中文标题、跨文件重复标题、旧语法兼容。

小节点：

- [x] G3.1 增加 parser 测试和语法设计说明，先锁行为。
- [x] G3.2 实现 `# 标题` 解析与 source span。
- [x] G3.3 实现项目级 duplicate title diagnostic。
- [x] G3.4 明确旧 `:: node.name` 的兼容 warning / 迁移提示节奏。

验收：

- 旧样例继续编译。
- 新 `# 中文标题` 样例可编译。
- 手动重名标题会报错。

## Goal 4：VSCode 标题语法体验

目标：让编辑器体验跟上 `# 标题`，避免 parser 支持但作者体验断层。

产出：

- TextMate 高亮支持 `# 标题`。
- Outline / completion / definition / references 识别标题。
- 新建同名标题时自动生成 `_01`。
- 手动重名通过 diagnostics 显示。

小节点：

- G4.1 更新 TextMate grammar、snippets 和 README。
- G4.2 更新 VSCode workspace index 对标题节点的扫描。
- G4.3 增加创建标题的自动编号命令或补全策略。
- G4.4 做 `.vsix` rebuild / install / Reload Window smoke test。

验收：

- `# 标题` 在 VSCode 中高亮、可补全、可跳转、可被 outline 展示。
- 不回退正文 / 选项文本的 `DefinitionProvider` + selection bridge 体验。

## Goal 5：LanguageServer 接管 VSCode 更多语义能力

目标：把已存在的 LanguageServer probes 接入 VSCode 热路径，逐步降低 JS workspace index 的语义权重。

产出：

- VSCode outline 优先走 LanguageServer。
- VSCode node completion 优先走 LanguageServer。
- 后续 definition / references / hover / CodeLens 逐步迁移。
- 每一步保留 JS fallback。

小节点：

- G5.1 接入 document symbols / outline。
- G5.2 接入 node completion。
- G5.3 接入 node definition / references。
- G5.4 接入 node / jump hover。
- G5.5 删除 fallback 前补专项 smoke test，不和首次接入混提交。

验收：

- 每项迁移都有 tests / probe parity 或手动 smoke 记录。
- CLI 不再作为编辑器实时语义能力的主入口。

## Goal 6：Host Schema endpoint 收口

目标：减少 VSCode JS 直接读 JSON 的重复逻辑，让 Host Schema capability 复用 Tooling 契约。

产出：

- 评估是否把 `inspect-host-schema-project` 下沉到 LanguageServer。
- VSCode query / event provider 的 endpoint 优先级说明。
- JS direct JSON fallback 删除或保留条件。

小节点：

- G6.1 设计 LanguageServer Host Schema capability endpoint。
- G6.2 VSCode query / event provider 优先调用 LanguageServer。
- G6.3 在 smoke 通过后清理重复 JSON fallback。

验收：

- Host Schema authoring hint 不改变 Compiler 语义。
- endpoint 失败时作者体验有明确降级路径。

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
