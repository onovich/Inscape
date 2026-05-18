# /goal 后续目标计划

状态：执行中

最后更新：2026-05-19

## 2026-05-19 更新

- Goal 5 已完成当前阶段收口：VSCode 的 diagnostics、node completion、definition、references、hover、document symbols 与 Host Schema capability 已切到常驻 `LanguageServer` stdio 会话。
- Goal 7 的 `off|click|selection` 真实 VSCode smoke 已通过。
- Goal 11.1 的“LanguageServer 不可用 -> CLI diagnostics fallback”真实 VSCode smoke 已通过。
- 当前下一步优先级回到 Goal 10：`G10.2.3` -> `G10.3` -> `G10.4`。

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

状态：已完成当前阶段。G5.1 到 G5.5 已把 node outline、completion、definition、references、hover 迁到 LanguageServer 热路径，并删除对应 JS node semantic fallback；2026-05-19 又完成常驻会话收口。

目标：把已存在的 LanguageServer probes 接入 VSCode 热路径，逐步降低 JS workspace index 的语义权重。

小节点：

- [x] G5.1 接入 document symbols / outline。
- [x] G5.2 接入 node completion。
- [x] G5.3 接入 node definition / references，并删除对应 JS node definition / reference fallback。
- [x] G5.4 接入 node / jump hover，并删除对应 JS node hover fallback。
- [x] G5.5 清理 G5.1 / G5.2 已存在的 JS fallback，或改成明确的错误提示 / output 日志。
- [x] G5.6 把 diagnostics、node completion、definition、references、hover、document symbols 与 Host Schema capability 从逐次 probe 切到常驻 `LanguageServer` stdio 会话；CLI fallback 仅保留为失败兜底。

验收：

- 每项迁移都有 tests / probe parity 或手动 smoke 记录。
- CLI 不再作为编辑器实时语义能力的主入口。
- VSCode 不再为了旧实现路径长期保留重复语义扫描。

## Goal 6：Host Schema Endpoint 收口

状态：已完成。Host Schema capability 已收口到 LanguageServer / Tooling 契约；VSCode 不再直接解析 Host Schema JSON 作为 query / event fallback。

目标：让 VSCode query / event 作者提示优先走 LanguageServer / Tooling 契约，移除 JS direct JSON fallback。

小节点：

- [x] G6.1 明确 Host Schema capability endpoint 的 LanguageServer / Tooling 数据契约：`LanguageServerEntry --host-schema-capabilities-project <root> [--config path]` 直接复用 `ToolConfigReaderDomain` 与 `HostSchemaCapabilityCatalogDomain`，输出与 CLI endpoint 相同的 `inscape.host-schema.capabilities` payload。
- [x] G6.2 VSCode query interpolation provider 改为消费统一 endpoint：`HostSchemaCapabilityProvider` 已优先调用 LanguageServer `--host-schema-capabilities-project`，再回退 CLI `inspect-host-schema-project`。
- [x] G6.3 VSCode host event provider 改为消费统一 endpoint：`@emit` event completion / hover 与 `[]` query interpolation 共用同一个 LanguageServer-first capability catalog。
- [x] G6.4 删除 JS direct JSON fallback，失败时给出清晰 output 日志。

## Goal 7：预览与作者体验打磨

状态：已启动。`[]` 查询插值在预览窗口中已作为特殊 token 样式显示，VSCode webview 在防抖等待和实际刷新时会显示轻量状态提示；预览刷新已增加版本保护，避免旧刷新覆盖新状态；局部更新 / 全量重渲染边界已记录到 [VSCode Preview Refresh Strategy](vscode-preview-refresh-strategy.md)；正文 / 选项文本的预览定位已增加静态契约检查，防止回退到 `DocumentLinkProvider`。这些都不改变 Compiler / Runtime 语义。

目标：在不新增旧兼容层的前提下，打磨 VSCode 可玩预览、热刷新和源码定位体验。

小节点：

- [x] 未保存内容热刷新版本保护：取消被保存 / 显式刷新取代的 pending timer，并避免旧刷新完成时清掉新一轮状态。
- [x] 防抖等待 / 刷新中状态提示。
- [x] 局部更新策略：VSCode 只局部处理状态、源码定位和纯 UI 状态；涉及 graph、diagnostics、source map、节点内容或 Host Schema / Host Bridge 能力变化时继续全量重渲染。
- [x] 正文 / 选项文本继续保持 `DefinitionProvider` + selection bridge，不回到 `DocumentLinkProvider`；VSCode package 已增加静态契约检查。
- [x] 预览中的 `[]` 查询插值保持原文显示，但使用独立 token 样式，避免和普通字符串混淆。
- [x] 可选的预览 / 源码同步策略第一版：`inscape.preview.sourceSyncMode = off|click|selection`，默认 `click` 保持现有行为，`selection` 只驱动已打开预览。
- [x] 可选的预览 / 源码同步策略自动化自检：新增脚本覆盖 `off` / `click` / `selection` 的关键边界。
- [x] 可选的预览 / 源码同步策略手动 smoke 入口收口：新增脚本统一生成临时工作区与模式设置，避免交互回归只靠记忆执行。
- [x] 可选的预览 / 源码同步策略收口：真实 VSCode 手动 smoke 已通过，确认三种模式的交互边界与默认值。

## Goal 10：Stable ID 与本地化迁移落地

状态：进行中。Goal 1 / Goal 2 已完成设计；G10.1 已落首版 sidecar 创建 / 读取 / 更新 / missing / conflict 闭环，G10.2 已补第一版保守自动重命名识别，但标题入口接线、人工确认和本地化 alignment report 仍待实现。

目标：把作者可读标题、系统 stable node id、行级 anchor、occurrence 与 diff 对齐串成可执行工具链，保护节点重命名和本地化旧译文。

小节点：

- [x] G10.1 实现 stable node id sidecar 的创建、读取、更新、删除和冲突处理。
- [ ] G10.2 把标题创建 / 重命名流程接入 stable node id 维护；作者仍只写中文标题，机器 ID 由工具维护。
  - [x] G10.2.1 VSCode 新增显式 `Inscape: Update Stable Node Map` 入口，调用 `update-node-map-project`，并把活动未保存 `.inscape` 文档通过 `--override` 传给 CLI。
  - [x] G10.2.2 标题创建后自动同步 stable node map，插入标题成功后会对当前工作区静默执行一次 `update-node-map-project`，失败时只提示自动同步失败，不回滚插入动作。
  - [ ] G10.2.3 标题重命名的人工确认 / 冲突报告入口。
- [ ] G10.3 实现本地化 alignment / audit report，输出 `kept` / `new` / `changed` / `removed` / `conflict` / `stale`。
- [ ] G10.4 将相似文本匹配作为人工候选输出，不静默继承旧译文。

## Goal 11：Fallback 与外部宿主收口

状态：待启动。该目标包含删除 fallback 前的验证，以及 Unity / Bird 外部宿主侧仍需决策的事项。

小节点：

- [x] G11.1 删除 VSCode diagnostics CLI fallback 前，先补 LanguageServer 不可用场景下的 CLI fallback smoke test。
  - [x] 先补静态契约：`npm --prefix src/ExternalSupport/VSCode run check:diagnostics-fallback`，锁住 LanguageServer 失败时转 CLI，以及 `diagnostics.backend=compiler` 直走 CLI。
  - [x] 真实 VSCode 手动 smoke 已通过，确认编辑器内 fallback 体验和 output channel 行为。
- [ ] G11.2 决定 Bird 项目新增 importer 与 `InscapeGenerated` 资源提交策略。
- [ ] G11.3 用带真实 Timeline 绑定的样例执行 Bird Import Dry Run，确认 `talking.exit` 的 `TalkingEffectTM.PlayTimeline` 落地与其他 phase warning。
- [ ] G11.4 低优先级：结合 Bird `L10N` 真实格式决定是否调整 Inscape CSV 字段和列顺序。

## Goal 9：项目资源 / 代码分层收口

状态：已完成当前轮。VSCode 归属边界已由 ADR 0015 修正，编辑器扩展包已迁入 `src/ExternalSupport/VSCode`；VSCode package 资源 / 脚本边界已收口，Preview HTML/CSS/JS 模板已拆入 Tooling `Resources/Preview`；UnityPlugin 已冻结包边界计划，真实 Unity package 未确定前不创建空 `Scripts` / `Resources`。

目标：按 ADR 0014 让未来可能独立拆仓、拆项目、单独发布或单独交付的 Internal / ExternalSupport 模块在自身根目录内区分源码、资源和开发脚本，并清理规划占位目录。

小节点：

- [x] G9.0 修正 VSCode 归属边界：作为第一方维护的外部编辑器平台支持迁入 `src/ExternalSupport/VSCode`，清除 `src/Internal/VSCode` 空规划目录，并移除 `EditorExtensions` / `vscode-inscape` 过渡层级。
- [x] G9.1 建立 VSCode 内部目录命名审计，明确哪些目录符合规范、哪些需要继续拆分。
- [x] G9.2 建立 Internal / ExternalSupport 通用模块资源脚本边界计划，明确只有可独立模块根内才允许 `Resources` / `Scripts`。
- [x] G9.3 VSCode package 内部资源目录收口：图标、schema、snippet、TextMate grammar、语言配置、打包脚本和 README 说明统一到明确资源 / 脚本边界。
- [x] G9.4 VSCode package 源码目录收口：`ExtensionEntry` 已收敛到 `Entries`，`PreviewWebview` 已收敛到 `Preview`，DslScript providers / diagnostics 已收敛到 `DslScript`，EditorAuthoring providers / commands 已收敛到 `EditorAuthoring`，Preview / HostSchema / Localization commands 已收敛到各自业务目录，HostBinding / HostSchema providers 已收敛到各自业务目录，`Commands` / `LanguageFeatures` / `WorkspaceIndex` 过渡目录已删除；命名规范尾部自检已完成。
  - [x] G9.4.1 `PreviewRevealBridge` 迁入 `Preview/Bridges`，删除根级 `Bridges` 目录。
  - [x] G9.4.2 审视 `Styles`：已迁入 `EditorAuthoring` / `Preview`，删除根级 `Styles` 目录。
  - [x] G9.4.3 审视根级 `Commands`：已按业务迁入 `EditorAuthoring` / `Preview` / `HostSchema` / `Localization` 的 `Commands` 目录，删除根级 `Commands`。
  - [x] G9.4.4 审视 `StyleDefaults.js` 等无规范后缀文件名：已拆为 `EditorAuthoringStyleDefaultsModel` 与 `PreviewStyleDefaultsModel`。
  - [x] G9.4.5 明确 `extension.js` 是 VSCode manifest main 入口例外，并在 README / 审计中记录。
- [x] G9.5 Preview HTML/CSS/JS 模板从 `PreviewHtmlRendererDomain` 的 C# 字符串中拆出为可维护资源，同时保持 CLI / VSCode preview 可用。
- [x] G9.6 UnityPlugin 包边界计划：真实包结构确定后，再按具体包根建立 `Scripts` / `Resources`；当前只记录 `UnitySample`、`UnitySample.Cli` 与 `unity-bird-importer` 的定位，不保留空规划目录。

## Goal 8：Unity / Bird 准备与计划

状态：只做准备和计划，等设计方案落实后再研发。

候选节点：

- Attribute 扫描设计。
- Host Bridge 到 adapter 生成设计。
- Bird importer 提交策略。
- 带真实 Timeline 的 Dry Run 计划。
