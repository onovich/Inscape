# /goal 后续目标计划

状态：执行中

最后更新：2026-05-19

## 2026-05-19 更新

- Goal 5 已完成当前阶段收口：VSCode 的 diagnostics、node completion、definition、references、hover、document symbols 与 Host Schema capability 已切到常驻 `LanguageServer` stdio 会话。
- Goal 7 的 `off|click|selection` 真实 VSCode smoke 已通过。
- Goal 11.1 的“LanguageServer 不可用 -> CLI diagnostics fallback”真实 VSCode smoke 已通过。
- 2026-05-19 用户重测 LanguageServer 编辑体验反馈良好；日志未见 Inscape LanguageServer 崩溃 / stderr。Preview webview CSP 已补，说明当前剩余问题主要在编辑器体验尾项而不是 LanguageServer 主路径稳定性。
- 当前下一步优先级回到 Goal 10：G10.4 与最小 review 输出闭环已完成，下一步可继续细化评分与编辑器 review 展示。
- 2026-05-19 补充结论：VSCode 近期为快速收口 review / preview 体验又出现了一些不够符合重构与命名指南的实现痕迹。后续不能只追功能节点；必须把 VSCode 重构收口重新列回主计划，并把“每完成一个新功能节点后立即做命名 / 分层 /目录自检”纳入默认工作流。
- 2026-05-19 进一步补充：用户明确 `Resources / Scripts` 的真正语义是“独立模块的资源侧 / 代码侧二分”，而不是“源码目录旁边再挂一个开发脚本桶”。这意味着当前 `src/ExternalSupport/VSCode` 里 `Scripts` 只装 package-only 开发脚本、业务源码目录继续与其平级的状态并不符合最终口径；`check-preview-source-sync-modes.js`、`preview-template.html`、`extension.js` 等历史例外命名也需要重新评估终局名称。
- 2026-05-19 进一步补充：`src/ExternalSupport/VSCode/Scripts/Localization` 不应被默认视为长期最终归宿。应把它拆成“宿主适配”与“宿主无关”两部分理解：命令入口、QuickPick、文件对话框、打开报告、源跳转属于 VSCode 适配；alignment review contract、candidate scoring、report model、未来多宿主都会复用的数据组织应继续优先下沉到 `Internal/Tooling`，或在需要编辑器查询能力时进入 `LanguageServer`。
- 2026-05-19 补充实现原则：line identity / line sidecar 方案以 Yarn Spinner 作为重点参考对象；当 Inscape 自己的行级 identity、翻译单元、sidecar 更新规则或 debug 展示策略出现悬而未决的设计点时，优先参考 Yarn Spinner 的显式 line id / 本地化提取工作流，而不是继续扩张 heuristic 猜测方案。

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

状态：进行中。Goal 1 / Goal 2 已完成设计；G10.1 已落首版 sidecar 创建 / 读取 / 更新 / missing / conflict 闭环，G10.2 已补第一版保守自动重命名识别、标题入口接线和人工确认报告，G10.3 已实现本地化 alignment / audit report。

目标：把作者可读标题、系统 stable node id、行级 anchor、occurrence 与 diff 对齐串成可执行工具链，保护节点重命名和本地化旧译文。

小节点：

- [x] G10.1 实现 stable node id sidecar 的创建、读取、更新、删除和冲突处理。
- [~] G10.2 把标题创建 / 重命名流程接入 stable node id 维护；作者仍只写中文标题，机器 ID 由工具维护。当前标题创建、显式更新、自动同步和重命名审查入口都已落地，剩余只需评估是否继续补 multi-apply 或更强的批量审查流。
  - [x] G10.2.1 VSCode 新增显式 `Inscape: Update Stable Node Map` 入口，调用 `update-node-map-project`，并把活动未保存 `.inscape` 文档通过 `--override` 传给 CLI。
  - [x] G10.2.2 标题创建后自动同步 stable node map，插入标题成功后会对当前工作区静默执行一次 `update-node-map-project`，失败时只提示自动同步失败，不回滚插入动作。
- [x] G10.2.3 标题重命名的人工确认 / 冲突报告入口：`StoryNodeMapUpdateDomain` 现在会输出 `inscape.node-map-update-report`，CLI `update-node-map-project` 新增 `--report`，VSCode 新增显式 `Inscape: Review Stable Node Map Changes`，并在显式 `Update Stable Node Map` 发现 `manual-review` / `conflict` 时给出审查入口。
- [~] G10.2.4 细化标题重命名人工确认流：已补 review item 列表、candidate 跳转和 node map / raw report 打开入口；当前 manual-review 项已支持显式 `Apply candidate stable id`，并会保存 `.review-backup.json` 供 `Revert last applied stable id` 使用，同时已支持 `Preview candidate stable id` 生成 dry-run `.review-preview.json`。下一步可继续评估是否需要 multi-apply。
- [x] G10.3 实现本地化 alignment / audit report，输出 `kept` / `new` / `changed` / `removed` / `conflict` / `stale`。
  - [x] Internal Tooling 新增 `LocalizationAlignmentAuditDomain` 和 `inscape.localization-alignment` JSON report model。
  - [x] Internal CLI 新增显式 `audit-l10n-alignment-project <root> --from old.csv [-o l10n-review.json]`，不改变 `update-l10n-project` 默认行为。
  - [x] Report 只在 `kept` 项写入确认译文；`changed` / `conflict` 只携带旧译文候选并配套 `stale` 旧项。
- [x] G10.4 将相似文本匹配作为人工候选输出，不静默继承旧译文。
  - [x] `LocalizationAlignmentAuditDomain` 现在区分高置信单候选 `changed` 与低置信 / 多候选 `conflict`。
  - [x] report candidate 新增 `reason` 字段，说明候选来自 same stable node、near sequence、near source line 或 shared prefix。
  - [x] 低置信相似文本不再被压成单候选 `changed`，而是保留为人工 `conflict` 审查项。
  - [x] CLI `audit-l10n-alignment-project` 新增 `--format text`；VSCode 新增 `Review Localization Alignment` 命令，先用文件输出方式补最小审查闭环。
  - [x] VSCode 对 json report 补了最小 source jump：生成后可直接弹出 alignment item Quick Pick，并跳回对应源位置。
  - [~] G10.4.1 细化 alignment review Quick Pick：已补 candidate / similarity / reason 的更强摘要展示、candidate 二级跳转，以及 Tooling presenter 提供的 `show-candidate-diff` 二级动作；VSCode 只负责展示该动作和跳转，不重新拼装 diff 语义。下一步可视需要继续评估更强的批量审查或逐项查询能力。
  - [ ] G10.4.2 继续调整 candidate scoring：sequence / context / line anchor 等信号更稳地影响 `changed` 与 `conflict` 分界。

## Goal 11：Fallback 与外部宿主收口

状态：待启动。该目标包含删除 fallback 前的验证，以及 Unity / Bird 外部宿主侧仍需决策的事项。

小节点：

- [x] G11.1 删除 VSCode diagnostics CLI fallback 前，先补 LanguageServer 不可用场景下的 CLI fallback smoke test。
  - [x] 先补静态契约：`npm --prefix src/ExternalSupport/VSCode run check:diagnostics-fallback`，锁住 LanguageServer 失败时转 CLI，以及 `diagnostics.backend=compiler` 直走 CLI。
  - [x] 真实 VSCode 手动 smoke 已通过，确认编辑器内 fallback 体验和 output channel 行为。
- [ ] G11.2 决定 Bird 项目新增 importer 与 `InscapeGenerated` 资源提交策略。
- [ ] G11.3 用带真实 Timeline 绑定的样例执行 Bird Import Dry Run，确认 `talking.exit` 的 `TalkingEffectTM.PlayTimeline` 落地与其他 phase warning。
- [ ] G11.4 低优先级：结合 Bird `L10N` 真实格式决定是否调整 Inscape CSV 字段和列顺序。

## Goal 12：VSCode 体验尾项收口

状态：待启动。LanguageServer 主路径已稳定，当前剩余问题主要是编辑器体验卫生和交互尾项。

目标：收掉不会改变 Compiler / Tooling / LanguageServer 主语义，但会影响日常体验和发布质量的 VSCode 尾项。

小节点：

- [x] G12.1 为 Preview webview 补 CSP，消除 `created a webview without a content security policy` warning，并确保现有 preview 脚本仍可运行。
- [~] G12.2 继续收口正文 / 选项文本 `Ctrl+Hover` 链接态显示稳定性，保持“默认无下划线、Ctrl+指向才显示”。当前已排除 `? ` 与 `- ` 前缀区域进入 transient link range；下一步可继续做人体工学微调和手动 smoke。
- [x] G12.3 已补一次用户视角的 LanguageServer 冷启动 / 热会话体验记录：2026-05-19 用户在预构建产物路径下重测 VSCode 语言能力，主观反馈“体验不错”；日志未见 `LanguageServer session exited ...`、`[LanguageServer stderr] ...` 或 Inscape request failure，说明当前常驻 stdio 会话在已构建产物路径下没有明显慢启动体感。

## Goal 13：VSCode 重构守规与节点后自检

状态：进行中。近期 VSCode 代码虽然功能持续推进，但部分新实现已经再次逼近“先能跑、后补结构”的滑坡；当前已把重构收口和节点后自检重新提到显式计划层，并补了第一版可执行结构检查。

目标：确保 `src/ExternalSupport/VSCode` 后续新增功能不再持续侵蚀目录主语、角色边界、命名规则和入口薄层约束；每个功能节点完成后都必须做一轮最小结构自检。

小节点：

- [~] G13.1 做一次 VSCode 现状命名 / 分层巡检：首轮已确认 `EditorAuthoringCommand` 与 `LocalizationCommand` 最近都再次吸收了 report review UI、二级 Quick Pick、source jump 和 CLI invocation 编排，单文件角色继续膨胀；`extension.js` 也出现重复注入 `openLocation` / `locationFromPayload` 的装配重复。下一步要把这些问题拆成可执行收口节点，而不是只停留在审计结论。
- [x] G13.2 把 VSCode 重构收口重新列回近期主 TODO：当前 `docs/todo.md` 已把 VSCode 重构守规列为近期队列，并明确每个 VSCode 功能节点后都要同步评估 glue 膨胀、跨业务拼装或命名倒退。
- [x] G13.3 固化“节点完成后立即自检”的工作流：`docs/regression-workflow.md` 已记录固定流程，要求检查命名、目录、入口厚度、跨层依赖、是否把可复用语义留在 VSCode；G13.4 又补了可执行 `check:structure` 入口。
- [x] G13.4 为 VSCode 包补更明确的结构自检脚本或 checklist：已新增 `npm --prefix src/ExternalSupport/VSCode run check:structure`，检查 `Scripts` 顶层业务目录、Role 目录、文件 / class 角色后缀，以及 `Helper` / `Support` / `Manager` / `Utils` 等弱命名，避免只靠人工记忆判断结构回退。
- [x] G13.5 重审 VSCode `Resources / Scripts` 终局结构：已先把当前 package-local 开发脚本桶从 `Scripts` 改名为过渡性 `DevScripts`，避免与最终 `Scripts` 代码侧父层语义冲突；当前 `Scripts/` 下已承接 `ExtensionManifestEntry.js`、`Entries/`、`DslScript/`、`Localization/`、`Preview/`、`EditorAuthoring/`、`HostSchema/`、`HostBinding/`，manifest、README、验证命令和主要测试路径已同步更新。
- [~] G13.6 清理 VSCode 当前命名例外：第一轮已完成 `extension.js` -> `Scripts/ExtensionManifestEntry.js`、`preview-template.html` -> `PreviewHtmlDocumentTemplate.html`、`assert-preview-navigation-contract.js` -> `PreviewNavigationContractCheck.js`、`check-preview-source-sync-modes.js` -> `PreviewSourceSyncContractCheck.js`，并把新命名法补进规范；当前又同步了 `AGENTS.md`、handoff、README 与回归流程里的当前验证入口，避免继续指向旧 `Internal/VSCode/vscode-inscape` 或根级 `extension.js` 路径。下一步继续清点剩余历史名并配合 G13.5 目录重排统一收口。
- [ ] G13.7 明确 Localization 分层终局：`VSCode/Localization` 只保留宿主适配壳；凡是别的宿主或自研编辑器也会需要的 review contract、candidate scoring、report view-model 组织，应优先评估下沉到 `Tooling` 或 `LanguageServer`。

## Goal 14：Localization line identity / sidecar

状态：进行中。方案已确定参考 Yarn Spinner：每个对话块内部按语义行维护稳定 line id，默认不展示，只在 debug 模式 hover 暴露；diff 只服务显式“刷新本地化行状态”动作，不服务实时编辑同步。

目标：让本地化刷新依赖显式行 identity，而不是文本相似度猜测；作者平时不感知 line id，进入调试或翻译刷新时才看到变化结果。

小节点：

- [~] G14.1 第一版 line sidecar 数据结构与 refresh domain：已新增 `LocalizationLineMapModel`、`LocalizationLineMapRefreshDomain`、reader/writer 草案，并按保守规则处理改字/插行/删行/简单拆并。当前回归测试已覆盖：改字、中间插行、中间删行、拆行保留首行 id、并行保留首行 id、重复句邻接修改、复杂替换按 remove/add 处理。下一步再评估是否需要更强的重复句 disambiguation。
- [~] G14.2 VSCode 显式刷新命令：已接入 `refresh-l10n-line-map-project` CLI/命令入口，并补了第一版 `Show Summary` 提示，让作者在刷新后直接看到 changed / added / removed 统计；当前又补了 `Show Details`，能按 block/change 摘要查看细项，并已支持直接跳到对应 source 行。CLI `--report` 现在也会输出完整 refresh result（lineMap/report/status），方便后续本地化模块直接消费。下一步再评估是否需要更强的 block 级审查流。
- [x] G14.3 debug 模式：已在 `preview.sourceSyncMode` 新增 `debug` 值，并接入 `LocalizationLineMapDebugController` 读取 line sidecar；hover debug 信息现在显示 `blockId / lineId / lineNumber / kind`，并在存在 speaker 时显示 `speaker`；缓存现在按 sidecar mtime/size 失效，缺失文件不再永久缓存，刷新或恢复后能读到最新 line map。
- [~] G14.4 sidecar 持久化闭环：当前已补 `inscape.line-map.json` reader/writer、CLI `refresh-l10n-line-map-project`、VSCode `Refresh Localization Line State` 命令、`Show Summary`/`Show Details` 提示，以及 `localization.lineMap` 配置路径解析。最新一刀已补 writer `.backup` 快照、`Restore Backup` 恢复入口与 `LastSourceFingerprint` 漂移指纹基础字段；drift 检测现在也已进入 refresh result/status 与 VSCode 显式决策流（Continue / Show Details / Restore Backup / Cancel），并附带操作建议。下一步继续补更细的本地化模块消费方式。
  - [~] G13.7.1 首轮盘点已完成：
    - `LocalizationCommand` 目前主要是 VSCode 宿主适配：工作区选择、文件对话框、格式选择、CLI invocation、成功提示、报告文件打开。
    - `LocalizationReviewController` 目前仍直接依赖 VSCode QuickPick 与 source jump，但其承载的 `report -> item list -> candidate action list -> location` 交互骨架已经是跨宿主可复用概念。
    - `LocalizationAlignmentAuditDomain`、`LocalizationAlignmentReportModel`、candidate scoring、status/review 状态机已经正确位于 `Internal/Tooling`。
  - [x] G13.7.2 下一步评估从 VSCode 下沉的第一批目标：report item / candidate action 的 presenter model 组织已从 VSCode 下沉到 `Internal/Tooling/Localization/LocalizationReviewPresenterModelBuilderDomain`，并挂入 `LocalizationAlignmentReportModel.Presenter`。当前 VSCode 只保留 `Scripts/Localization/Controllers/LocalizationReviewController` 作为宿主交互壳，以及 `Scripts/Localization/ViewModels/LocalizationReviewQuickPickAdapter` 作为 QuickPick 标签映射层。
  - [x] G13.7.3 Localization review 查询能力决策：当前不补 `LanguageServer` 逐项查询 API。第一版继续由 CLI / Tooling 产出完整 `inscape.localization-alignment` JSON report 与 `Presenter`，各宿主只消费完整 report；只有未来出现“编辑器需要按 item / candidate 增量查询、跨文件长会话缓存或多宿主共享交互状态”时，再把查询能力补进 `LanguageServer`，避免过早扩张 LS API。

建议拆分顺序：

- [~] G13.1.a 收 `LocalizationCommand`：已新增 `LocalizationReviewController`，把 review report 读取 / Quick Pick 呈现 / candidate 二级动作从命令入口类中拆出；下一步可继续看 CLI invocation 相关重复是否还值得再收一层。
- [~] G13.1.b 收 `EditorAuthoringCommand`：已新增 `StoryNodeMapReviewController`，把 stable node map review item / action UI 从工具菜单与 node map 命令入口类中拆出；下一步可继续看 node map CLI invocation / 成功提示分发是否还值得再收一层。
- [x] G13.1.a / G13.1.b 后续轻量收口：`LocalizationCommand` 与 `EditorAuthoringCommand` 现在都把 success action 分发单独收成 `handleSuccessSelection` / `handleNodeMapSelection`，避免 CLI invocation、提示弹窗和 review / open file 路由继续糊在同一方法里。

Goal 10 后续细化：

- [~] G10.4.2 candidate scoring 细化：已补第一轮 tie-break 收口，当前会在相似度并列时优先比较 ranking penalty（sequence / source line 距离），再比较 sequence distance，减少“文本相似但上下文更远”的旧译文排到前面的情况。第二轮已把 context shape（首词 / 末词 / token 数）并入 penalty 与 reason，第三轮又补了 keyword fingerprint（长度 >= 4 的 token 集）信号与回归测试，第四轮继续补了 neighbor shape（首词 / 第二词 / 末词）信号，第五轮又补了同节点前后翻译单元的 local context fingerprint 与 `same-local-context` reason，第六轮把轻微改写的前后文纳入 `near-local-context`，第七轮让 `same-line-id` 可以收敛同窗口内的近似文本候选，第八轮允许精确 line id 在文本大改时仍保留人工审查候选，第九轮让精确 line id 在排序上优先于纯文本相似度，进一步压低“候选文本相似但所处局部语义块不同”的误排。后续可继续评估是否需要跨节点或跨文件的更强上下文约束。
- [~] G13.1.c 收 `extension.js` 装配重复：已把 `openLocation` / `locationFromPayload` 收成共享 `locationServices` 注入块，并把文件打开 glue 收成 `openFileInEditor`；下一步可继续评估是否要把更多 VSCode 共享依赖按组合根分组，而不是让 `extension.js` 参数表重新横向扩张。

## Goal 15：本地化 line sidecar 消费闭环

状态：已完成第一版。Goal 14 已经把 line sidecar 的数据结构、refresh、debug hover、报告详情、backup / restore 与 drift status 打通；本目标已把这些结果接入 `audit-l10n-alignment-project` 的 alignment 判断和 report 输出。后续如果要继续扩展，应优先评估更强的 line identity 多版本迁移契约，而不是继续堆 VSCode 局部提示。

目标：让 `audit-l10n-alignment-project` / 未来可选本地化更新流程优先利用 line sidecar 的 `blockId / lineId / fingerprint / refresh status`，把 line identity 从调试信息提升为迁移判断依据；同时保持相似文本只作为人工候选，不回到静默继承旧译文。

边界：

- 不改变 `update-l10n-project` 默认确认译文行为。
- 不把 VSCode QuickPick 交互模型下沉到 Compiler。
- 不让 `Inscape.Compiler` 依赖 line sidecar writer、VSCode 或本地文件布局。
- 不一次性设计完整翻译管理系统；只打通 line sidecar -> alignment audit / review 的最小闭环。

小节点：

- [x] G15.1 定义本地化 alignment 如何读取 line sidecar：CLI audit 会按 `localization.lineMap` / 默认 `inscape.line-map.json` 读取；缺失 sidecar 保持旧行为，旧格式无 `LastSourceFingerprint` 标记为 `legacy`，stale sidecar 标记为 `drift` 且不参与评分。
- [x] G15.2 扩展 `LocalizationAlignmentAuditDomain` 的候选信号：在 stable node id 与文本/sequence/context 信号之外，引入 `lineId` / line fingerprint / block-local line order 作为可解释 ranking reason，当前 reason 会记录 `same-line-id` / `near-line-order`。
- [x] G15.3 更新 JSON / text report：report 顶层新增 `lineIdentity` 状态，item / candidate 暴露 `lineId`、`lineFingerprint` 与 `lineIdentityStatus`，text report 也会展示 line identity 摘要。
- [x] G15.4 补 CLI 验证样例：已覆盖 refresh line map -> 改写文本 -> 再 refresh -> audit alignment 的 available 路径，以及未 refresh 时的 drift 路径。
- [x] G15.5 收口 VSCode 宿主适配：VSCode 不重新拼装 line identity 语义，继续消费 Tooling / CLI 输出的 report 与 presenter 字段。
- [x] G15.6 文档收口：同步 `docs/todo.md`、`docs/agent-handoff.md` 与本目标状态；当前第一版没有新增长期语义分歧，暂不新增 ADR。

验收：

- 没有 line sidecar 时，现有 alignment audit 行为保持可用。
- 有 line sidecar 且未 drift 时，候选排序和 reason 能体现 line identity 信号。
- 有 drift 时，report 清晰提示身份依据降级或要求先 refresh，不静默使用可疑 sidecar。
- `dotnet build Inscape.slnx --no-restore` 与内部测试通过；涉及 VSCode 入口时继续跑 Node 语法检查。

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
