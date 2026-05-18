# /goal 后续目标计划

状态：执行中

最后更新：2026-05-17

本文把当前剩余工作写成 `/goal` 目标模式。每个 goal 都应独立完成、自检、验证、提交和推送；不要把多个无关 goal 合进同一提交。

研发期原则：Inscape 当前没有真实用户和已发布契约，不为旧版语法、旧配置或旧实现路径承担兼容成本。legacy / fallback 默认是待删除债务；只有为了短期切换验证才允许临时存在，并且必须在同一计划中写出删除节点。

## 执行规则

每个 goal 开始前：

1. 读取 `docs/agent-handoff.md`、`docs/todo.md` 和本文。
2. 用 `git -c safe.directory=D:/LabProjects/Inscape status --short --branch` 确认工作区。
3. 只选择一个最小节点推进。

每个 goal 完成前：

1. 对照 [编码与命名规范](coding-conventions.md)、[回归工作流](regression-workflow.md) 和相关 ADR 自检。
2. 更新 `docs/todo.md` 与 `docs/agent-handoff.md`。
3. 运行仓库验证命令。
4. 提交并推送。

## Goal 0：研发期 Legacy 清除

状态：已完成。

目标：把已经确认不符合新规范的旧写法和兼容层从主路径移除，让样例、Compiler、VSCode、LanguageServer、Tooling 和文档都只表达当前规范。

产出：

- 主样例和测试改用 `# 标题`。
- Compiler 不再解析 `:: node.name`。
- VSCode 不再高亮、扫描、补全或提供 `:: node.name` snippet。
- legacy `[kind: alias]` / `[timeline: alias]` inline host binding 不再作为当前工具能力。
- `unitySample.roleMap` / `unitySample.bindingMap` 不再作为 Host Bridge fallback。
- 行为文档不再把 legacy 作为仍需维护的产品能力；历史背景只留在 ADR、审计或迁移说明中。

小节点：

- [x] G0.1 迁移 `samples/court-loop.inscape` 和内部测试到 `# 标题`，同步所有跳转目标。
- [x] G0.2 移除 Compiler / LanguageServer 对 `:: node.name` 的支持，并更新诊断文案。
- [x] G0.3 移除 VSCode 对 `:: node.name` 的 TextMate、workspace index、snippet 和文档入口。
- [x] G0.4 移除 legacy inline host binding：`[kind: alias]`、`[timeline: alias]`、`[bg: alias]` 等行为和样例。
- [x] G0.5 移除 `unitySample.*` fallback；ExternalSupport 后续只通过明确的 Host Bridge / UnityPlugin 计划推进。
- [x] G0.6 全仓文档清理：当前行为文档只保留新规范；历史背景留在 ADR / 审计 / 迁移文档中。

验收：

- `check-project samples` 通过。
- VSCode authoring 主路径只展示 `# 标题`、`@` 事件 / 时机、`[]` 查询插值和 `hostBridge`。
- `rg "^::|legacy|Legacy|\\[timeline:" docs src tests samples` 的命中只允许是历史 ADR / 审计 / 迁移说明、研发原则或明确删除计划。
- 删除旧行为后完整验证通过。

## Goal 1：Stable Node ID 契约

状态：已完成设计，见 [Stable Node ID Contract](stable-node-id-contract.md)。

目标：把 [ADR 0013](adr/0013-author-title-and-stable-node-id.md) 落成可实现的数据契约，先不改 parser。

小节点：

- [x] G1.1 设计 stable node id / title map JSON 契约。
- [x] G1.2 设计标题重命名识别流程：source range、相邻文本锚点、旧标题、前后节点关系与人工确认。
- [x] G1.3 设计 `:: node.name` 到 `# 标题` 的离线迁移策略；Goal 0 后不再保留兼容运行路径。

## Goal 2：本地化 Diff / Alignment 迁移

状态：已完成设计，见 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)。

目标：保护已有好翻译，同时正确揭示新增、删除、改写和歧义文本。

小节点：

- [x] G2.1 设计 localization update 的状态机和 CSV / report 字段。
- [x] G2.2 设计 stable node id + line anchor + occurrence + diff 的对齐流程。
- [x] G2.3 设计 CLI `update-l10n` 的迁移计划，不改变当前行为。

## Goal 3：`# 标题` 语法第一刀

状态：已完成。

目标：Compiler 支持新块标题，并把旧 `:: node.name` 迁出当前规范。

小节点：

- [x] G3.1 增加 parser 测试和语法设计说明，先锁行为。
- [x] G3.2 实现 `# 标题` 解析与 source span。
- [x] G3.3 实现项目级 duplicate title diagnostic。
- [x] G3.4 明确旧 `:: node.name` 的离线迁移提示；Goal 0 后删除兼容提示和运行支持。

## Goal 4：VSCode 标题语法体验

状态：已完成。

目标：让编辑器体验跟上 `# 标题`，避免 parser 支持但作者体验断层。

小节点：

- [x] G4.1 更新 TextMate grammar、snippets 和 README。
- [x] G4.2 更新 VSCode workspace index 对标题节点的扫描。
- [x] G4.3 增加创建标题的自动编号命令或补全策略。
- [x] G4.4 做 `.vsix` rebuild / install / Reload Window smoke test。

## Goal 5：LanguageServer 接管 VSCode 更多语义能力

状态：已完成第一轮。G5.1 到 G5.5 已把 node outline、completion、definition、references、hover 迁到 LanguageServer 热路径，并删除对应 JS node semantic fallback。

目标：把已存在的 LanguageServer probes 接入 VSCode 热路径，逐步降低 JS workspace index 的语义权重。

小节点：

- [x] G5.1 接入 document symbols / outline。
- [x] G5.2 接入 node completion。
- [x] G5.3 接入 node definition / references，并删除对应 JS node definition / reference fallback。
- [x] G5.4 接入 node / jump hover，并删除对应 JS node hover fallback。
- [x] G5.5 清理 G5.1 / G5.2 已存在的 JS fallback，或改成明确的错误提示 / output 日志。

验收：

- 每项迁移都有 tests / probe parity 或手动 smoke 记录。
- CLI 不再作为编辑器实时语义能力的主入口。
- VSCode 不再为了旧实现路径长期保留重复语义扫描。

## Goal 6：Host Schema Endpoint 收口

状态：待推进。

目标：让 VSCode query / event 作者提示优先走 LanguageServer / Tooling 契约，移除 JS direct JSON fallback。

小节点：

- [ ] G6.1 明确 Host Schema capability endpoint 的 LanguageServer / Tooling 数据契约。
- [ ] G6.2 VSCode query interpolation provider 改为消费统一 endpoint。
- [ ] G6.3 VSCode host event provider 改为消费统一 endpoint。
- [ ] G6.4 删除 JS direct JSON fallback，失败时给出清晰 output 日志。

## Goal 7：预览与作者体验打磨

状态：已启动。`[]` 查询插值在预览窗口中已作为特殊 token 样式显示，但不改变 Compiler / Runtime 语义。

目标：在不新增旧兼容层的前提下，打磨 VSCode 可玩预览、热刷新和源码定位体验。

候选节点：

- 更细粒度的未保存内容热刷新。
- 刷新中状态提示。
- 可选的预览 / 源码同步策略。
- 正文 / 选项文本继续保持 `DefinitionProvider` + selection bridge，不回到 `DocumentLinkProvider`。
- 预览中的 `[]` 查询插值保持原文显示，但使用独立 token 样式，避免和普通字符串混淆。

## Goal 9：项目资源 / 代码分层收口

状态：已启动。VSCode 归属边界已由 ADR 0015 修正，编辑器扩展包已迁入 `src/ExternalSupport/VSCode`；资源 / 脚本边界仍待继续推进。

目标：按 ADR 0014 让未来可能独立拆仓的项目在自身根目录内区分源码、资源和开发脚本，并清理规划占位目录。

小节点：

- [x] G9.0 修正 VSCode 归属边界：作为第一方维护的外部编辑器平台支持迁入 `src/ExternalSupport/VSCode`，清除 `src/Internal/VSCode` 空规划目录，并移除 `EditorExtensions` / `vscode-inscape` 过渡层级。
- [x] G9.1 建立 VSCode 内部目录命名审计，明确哪些目录符合规范、哪些需要继续拆分。
- [ ] G9.2 VSCode package 内部资源目录收口：图标、schema、snippet、TextMate grammar、打包脚本和 README 说明统一到明确资源 / 脚本边界。
- [ ] G9.3 VSCode package 源码目录收口：`ExtensionEntry`、`PreviewWebview`、`LanguageFeatures`、`WorkspaceIndex` 按业务主语 / Role 规则拆分。
- [ ] G9.4 Preview HTML/CSS/JS 模板从 `PreviewHtmlRendererDomain` 的 C# 字符串中拆出为可维护资源，同时保持 CLI / VSCode preview 可用。
- [ ] G9.5 UnityPlugin 真实包结构确定后，再按具体包根建立 `Scripts` / `Resources`；不保留空规划目录。

## Goal 8：Unity / Bird 准备与计划

状态：只做准备和计划，等设计方案落实后再研发。

候选节点：

- Attribute 扫描设计。
- Host Bridge 到 adapter 生成设计。
- Bird importer 提交策略。
- 带真实 Timeline 的 Dry Run 计划。
