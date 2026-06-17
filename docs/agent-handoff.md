# Agent 接手指南

状态：P3 Round 10 Runtime query provider and internal facts design complete

最后更新：2026-06-18

本文用于让未来继续维护 Inscape 的 agent 快速恢复项目上下文。它不是替代完整文档，而是入口、索引和工作协议。

## 当前项目快照

### 2026-06-18 SelfHostedEditor P3 Round 10 Runtime query provider / internal facts 快照

P3 Round 10 已完成 Runtime query provider 与内部叙事事实第一刀，不宣称 P3 完成。

- 实现审计见 [SelfHostedEditor P3 Runtime Query Provider Audit](self-hosted-editor-p3-runtime-query-provider-audit.md)。
- `Internal/Runtime/HostBridge` 新增 query provider 最小 contract：`Delegate` 是正式宿主接入主路径，`Mock` 服务编辑器预览 / 测试 / CI，`Recorded` 服务调试复现 / Trace Replay。
- `NarrativeRuntimeQueryProviderDomain` 优先解析 Inscape 内部叙事事实，再按 provider kind 解析 delegate / mock / recorded；没有新增 snapshot 生产主链路。
- `NarrativeRuntimeStateModel` 新增 `Facts`，记录 visited node / visit count、seen line anchors 与 choice history。
- `NarrativeRuntime` 现在在进入节点、显示正文、选择选项时记录内部 facts。
- 内部 query 第一刀支持 `current_node()`、`previous_node()`、`visited(nodeId)`、`visit_count(nodeId)`、`seen(lineId)`、`choice_made(choiceId)`、`choice_count(choiceId)` 和 `last_choice(nodeId)`。
- 本轮未实现条件 Runtime 求值、query receipt 持久化、action dispatcher、完整 Save / Load、Rollback、Trace Replay、Flashback 或用户自定义内部变量系统。
- 下一轮进入 P3 Round 11：Runtime State 最小模型与 `ValidateStateAgainstCurrentScript` shape。

### 2026-06-18 SelfHostedEditor P3 Round 9 条件表达式消费快照

P3 Round 9 已完成 condition expression Tooling / LanguageServer / Editor consumption 第一刀，不宣称 P3 完成。

- 实现审计见 [SelfHostedEditor P3 Condition Consumption Audit](self-hosted-editor-p3-condition-consumption-audit.md)。
- `Internal/Tooling/UsageManifest` 现在复用 Compiler 条件 IR，从选项条件抽取 `choice-condition` query usage，从条件跳转抽取 `conditional-jump` query usage。
- 条件 query call / path 进入 `inscape.usage` 的 `queries[]`；Host Schema 参数 metadata 继续用于 `arguments[].name` 与 `requiredIds` 推导。
- 文本插值扫描器会跳过条件行开头的 `[...]`，避免把条件误记为 `query-interpolation`。
- LanguageServer diagnostics 继续透传 Compiler 条件诊断；Internal tests、VSCode `check:semantic-parity` 与 SelfHostedEditor `check:semantic-parity-http` 均覆盖 `INS061`。
- VSCode semantic parity 静态断言 ExternalSupport editor runtime 没有新增独立 condition expression parser。
- 本轮未实现 Runtime 条件求值、Preview / Runtime 条件选项过滤、条件 query completion / hover、Runtime State、Save / Load 或 query receipt。
- P3 Round 10 已在后续快照完成 Runtime query provider 与内部叙事事实第一刀；下一步进入 Runtime State 最小模型。

### 2026-06-18 SelfHostedEditor P3 Round 8 条件语法 Compiler / IR 快照

P3 Round 8 已完成 condition syntax Compiler / IR minimal implementation，不宣称 P3 完成。

- 实现审计见 [SelfHostedEditor P3 Condition Syntax Implementation Audit](self-hosted-editor-p3-condition-syntax-implementation-audit.md)，契约仍见 [Condition Syntax Contract](condition-syntax-contract.md)。
- `Inscape.Compiler` 新增 `DslScriptCondition*` parser / IR models；条件表达式只进入 IR，不执行 query。
- 选项条件 `- [condition] option text -> target` 解析为 `DslScriptChoiceOptionModel.Condition`，对应 choice edge 也保留同一 condition。
- 条件跳转 `? [condition] -> target` 解析为 `DslScriptConditionalJumpModel`，并生成 `StoryGraphEdgeKindModel.Conditional` edge。
- fallback `-> target` 继续复用现有 default jump / default edge；条件跳转组缺 fallback 时产生 `INS061`。
- 本轮新增 diagnostics 覆盖 empty condition、missing `]`、unexpected / trailing token、unsupported operator、array/list、assignment、call argument、unclosed string、action marker、conditional jump missing target / fallback。
- Compiler 仍不读取 Host Schema / Host Bridge；unknown query、参数数量 / 类型 mismatch 和 missing bridge binding 继续留给 Usage Manifest / Host Integration Audit 后续对账。
- 该轮未实现 Runtime 条件求值、Preview / Runtime 条件选项过滤或 Runtime State；Usage Manifest 条件扫描和 LanguageServer / editor parity 已在 Round 9 补齐。
- 下一轮进入 P3 Round 9：condition expression Tooling / LanguageServer / Editor consumption，重点是从 Compiler IR 抽取 `choice-condition` / `conditional-jump` usage，并证明编辑器宿主不复制 parser。

### 2026-06-18 SelfHostedEditor P3 Round 7 条件语法契约快照

P3 Round 7 已完成 condition syntax contract / parser design，不宣称 P3 完成。

- 契约见 [Condition Syntax Contract](condition-syntax-contract.md)，审计产物见 [SelfHostedEditor P3 Condition Syntax Contract Audit](self-hosted-editor-p3-condition-syntax-contract-audit.md)。
- 第一刀作者语法固定为选项条件 `- [condition] option text -> target`、条件跳转 `? [condition] -> target` 和 fallback `-> target`。
- `? text` 仍是选项提示；只有 `?` 后第一个非空白字符为 `[` 时才进入条件跳转解析。
- 条件表达式第一版支持 `and`、`or`、`not`、括号、标量比较、字符串、数字、bool、query path 与 query call。
- 不支持数组、列表、数学表达式、字符串拼接、赋值、`await`、action、任意成员调用、节点入口条件、行级条件或条件块。
- Compiler 后续负责条件 parser / IR / diagnostics；VSCode、SelfHostedEditor 与 CLI 不应复制条件 parser。
- Host Schema / Host Bridge 仍不进入 Compiler；unknown query / 参数对账 / bridge 缺失继续由 Usage Manifest 与 Host Integration Audit 后续处理。
- P3 Round 8 已在后续快照完成 condition syntax Compiler / IR minimal implementation；下一步进入 Tooling / LanguageServer / Editor consumption。

### 2026-06-18 SelfHostedEditor P3 Round 6 Host Integration Audit 快照

P3 Round 6 已完成 `audit-host-integration-project` 最小实现，不宣称 P3 完成。

- 实现审计见 [SelfHostedEditor P3 Host Integration Audit](self-hosted-editor-p3-host-integration-audit.md)。
- 新增 `Internal/Tooling/HostIntegrationAudit`，输出 `inscape.host-integration.audit` JSON。
- CLI 新增 `audit-host-integration-project <root> [--config inscape.config.json] [-o audit.json]`；未传 `-o` 时写 stdout，传入 `-o` 时写文件。
- Audit 串接 Usage Manifest、Host Schema capability catalog 与 Host Binding capability catalog，报告 unknown query / action、legacy event usage、参数数量 / 字面量类型不匹配、missing Host Bridge `ids[]`、missing Host Bridge `actions[]` / `queries[]` handler。
- Host Binding capability catalog 现在读取 Host Bridge `actions[]`、`queries[]` 与迁移期 legacy `events[]` handler 名称；编辑器宿主仍应消费共享 capability，不应自行解析 Host Bridge JSON。
- 本轮未实现条件 parser / IR、Runtime State、Runtime handler 执行、Save / Load 或完整回放。
- P3 Round 7 已在后续快照完成 condition syntax contract / parser design；下一步进入 Compiler / IR 最小实现。

### 2026-06-18 SelfHostedEditor P3 Round 5 inspect-usage-project 快照

P3 Round 5 已完成 `inspect-usage-project` 最小实现，不宣称 P3 完成。

- 实现审计见 [SelfHostedEditor P3 Usage Manifest Implementation Audit](self-hosted-editor-p3-usage-manifest-implementation-audit.md)；契约仍见 [Usage Manifest Contract](usage-manifest-contract.md)。
- 新增 `Internal/Tooling/UsageManifest`，由 `UsageManifestDomain` 与 manifest models 负责共享扫描和 `inscape.usage` payload 生成。
- CLI 新增 `inspect-usage-project <root> [--config inscape.config.json] [-o usage.json]`；未传 `-o` 时写 stdout，传入 `-o` 时写文件。
- 当前扫描现有语法：简单 `[]` query interpolation、`@emit` action / legacy event、`@timeline...` hook。
- 命令读取 Host Schema capability catalog 只用于参数 `idKind` 推导 `requiredIds`；未知 query / action 会记录为 usage，不导致命令失败。
- 本轮未实现条件 parser context、Runtime State、Host Integration Audit 或 Host Bridge 对账；P3 Round 6 已在后续快照补齐最小 audit。
- P3 Round 6 已在后续快照完成 `audit-host-integration-project` 最小实现。

### 2026-06-18 SelfHostedEditor P3 Round 4 Usage Manifest contract 快照

P3 Round 4 已完成 Usage / Requirement Manifest contract 收口，不宣称 P3 完成。

- 契约见 [Usage Manifest Contract](usage-manifest-contract.md)，审计产物见 [SelfHostedEditor P3 Usage Manifest Contract Audit](self-hosted-editor-p3-usage-manifest-contract-audit.md)。
- Usage Manifest 格式名固定为 `inscape.usage`，顶层包含 `workspace`、`summary`、`queries`、`actions` 与 `requiredIds`；source location 沿用 Tooling / Compiler 的 1-based `line` / `column` / `length`。
- Usage Manifest 是剧本需求清单，不是 Host Schema、Host Bridge 或 Runtime 执行输入；unknown query / action 交给 Host Integration Audit 报告，不反向生成权威 Host Schema。
- `@timeline...` 在 usage 中记录为 `usageKind = "host-binding-hook"`，优先对账 Host Bridge 的 timeline id，而不是误报为缺失 Host Schema action。
- 本轮未实现 CLI、未扫描脚本、未改 Compiler parser。P3 Round 5 已在后续快照完成 `inspect-usage-project` 最小实现。

### 2026-06-18 SelfHostedEditor P3 Round 3 Host Schema action consumption 快照

P3 Round 3 已完成 Host Schema `actions[]` consumption 兼容收口，不宣称 P3 完成。

- 审计产物见 [SelfHostedEditor P3 Host Schema Compatibility Audit](self-hosted-editor-p3-host-schema-compatibility-audit.md)。
- Tooling 新增 `HostSchemaActionReaderDomain`，`HostSchemaCapabilityCatalogDomain` 现在统一输出 `queries[]`、`actions[]` 与 deprecated legacy `events[]`。
- CLI `inspect-host-schema-project` 与 LanguageServer `--host-schema-capabilities-project` 继续输出 `inscape.host-schema.capabilities`，当前 payload 区分 query、action 和 legacy event。
- VSCode `Inscape: Show Host Schema Capabilities`、`[]` query hints 与 `@emit` authoring hints 只消费 shared capability catalog；`@emit` 优先使用 `actions[]`，同名 legacy event 会被 action 覆盖。
- SelfHostedEditor Host Schema bridge、Host workbench view、completion 和 hover 同样消费 shared LanguageServer capability catalog，不在浏览器侧解析 Host Schema JSON。
- 下一轮进入 P3 Round 4：Usage Manifest contract。不要把 Usage Manifest 当成权威 Host Schema，也不要把 Host Bridge 映射、Unity/Bird ID 或 Runtime 语义塞进 Compiler。

### 2026-06-18 SelfHostedEditor P3 Round 2 Host Schema v2 快照

P3 Round 2 已完成 Host Schema v2 最小契约收口，不宣布 P3 完成。

- 审计产物见 [SelfHostedEditor P3 Host Schema v2 Contract Audit](self-hosted-editor-p3-host-schema-v2-contract-audit.md)。
- Host Schema 统一能力清单口径已落到文档、模板与 JSON Schema：`queries[]` 表达只读查询，`actions[]` 表达宿主动作；Action Schema 不作为独立系统存在。
- `export-host-schema-template` 现在生成 `queries[]` / `actions[]` 示例，不再生成 legacy `events[]`；示例参数带 `idKind`，但不包含 Unity GUID、asset path、Addressables key、Bird ID 或具体项目 ID。
- VSCode bundled JSON Schema 现在校验 `actions[].mode = fire | wait | handoff`、`parameters[].idKind`、`queries[].parameters` 与 `number` 类型；legacy `events[]` 仍被接受并标记 deprecated。
- 当前可执行 capability consumption 仍保留 `events[]`：Tooling `HostSchemaEventReaderDomain`、`inspect-host-schema-project`、LanguageServer `--host-schema-capabilities-project`、VSCode / SelfHostedEditor Host capability UI 暂不在 Round 2 迁移，以免静默破坏现有链路。
- 下一轮进入 P3 Round 3：补 Tooling action reader / CLI / LanguageServer / VSCode / SelfHostedEditor 的 `actions[]` 兼容消费，同时继续保留 legacy `events[]` 输入路径。

### 2026-06-18 SelfHostedEditor P3 Round 1 基线审计快照

P3 第一刀已完成 Round 1 baseline audit，不宣布 P3 完成。

- 审计产物见 [SelfHostedEditor P3 Baseline Audit](self-hosted-editor-p3-baseline-audit.md)。
- 当前可执行 Host Schema 链路仍是 `queries[]` + `events[]`：Tooling reader、`inspect-host-schema-project`、LanguageServer `--host-schema-capabilities-project`、VSCode / SelfHostedEditor Host capability UI 都仍消费 `events[]`。
- P3 目标口径已由 ADR 0021 收敛为统一 `queries[]` + `actions[]`；下一轮必须先做 Host Schema v2 最小契约与 `events[] -> actions[]` 兼容策略，再改 Tooling / CLI / LanguageServer / editor host。
- Usage / Requirement Manifest 与 Host Integration Audit 当时尚无 CLI 入口；当前 P3 Round 5 已实现 `inspect-usage-project`，P3 Round 6 已实现 `audit-host-integration-project`。
- 条件语法尚未进入 Compiler parser / IR；当前 `[]` 文本插值仍只支持简单 path，P3 条件表达式不得污染第一版文本插值契约。
- 当前 `runtime-project` / `NarrativeRuntimeStateModel` 是 Player snapshot 链路，不是 P3 正式最小 Runtime State；`ExportState` / `ImportState` / `ValidateStateAgainstCurrentScript` 与 narrative facts 仍待 Round 10-11。
- 下一轮进入 P3 Round 2：Host Schema v2 minimum contract，优先定义 `actions[]` 字段、legacy `events[]` projection、JSON schema / template / tests 的最小闭环。

### 2026-06-18 P3 第二版语法 / Runtime 前置讨论快照

P3 仍处于设计阶段，但已有一组可落实结论已沉淀到文档。完整讨论脉络见 [P3 Runtime / Language Discussion Memory](p3-runtime-language-discussion-memory.md)，后续 session 若需要恢复“为什么这么定”，应先读该文，再读正式 contract 文档：

- P3 执行指南见 [P3 第二版语法 / Runtime / 宿主能力 Goal 模式执行指南](self-hosted-editor-p3-goal-mode-execution-guide.md)：总轮数上限 16 轮，主线第 1-12 轮，缓冲第 13-15 轮，第 16 轮最终验证。
- 长期边界见 [ADR 0021：P3 Runtime 与宿主能力边界](adr/0021-p3-runtime-and-host-capability-boundary.md)。
- 查询 / 动作边界见 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)：`[]` 只读且无副作用；`@` 负责动作 / 事件 / 状态变化；条件表达式支持基础布尔逻辑、括号、标量比较、字符串、数字和 bool，暂不支持数组、列表或复杂表达式。
- Host Schema 是统一能力清单，包含 `queries[]` 与 `actions[]`；Action Schema 不是独立系统。Usage Manifest 是机器可读的剧本需求清单，不作为宿主能力真相。
- 查询来源口径：正式运行优先 delegate query；mock / recorded values 服务编辑器预览、测试、CI 和调试复现；snapshot 不作为每帧同步主链路，只保留为低优先级实现细节。
- Inscape 可以保存和查询内部叙事运行事实，例如 visited / seen / last_choice / Log / rollback 栈；背包、任务、好感度、战斗结果等业务玩法状态默认由宿主管。
- Runtime / 存档 / Timeline 边界见 [运行时与 Unity 宿主](runtime-unity.md)：正式项目中宿主存档是权威，Inscape state 是宿主存档子状态；Log、Save / Load、Rollback、Trace Replay、Flashback Playback 已拆开命名；Timeline / 剧情 / 玩法系统按“同一段情节只有一个导演”交接控制权。
- P3 之后阶段口径已确认：P4 先做 Runtime 可玩化，P5 再做 SelfHostedEditor Runtime authoring / 产品化接入，P6 做 Unity / Host SDK 第一版，P7 做 Rollback / Trace / 高级运行时调试，P8 再讨论 Presentation IR / 跨引擎 / 独立 Runtime。
- P4 边界已确认：纳入 Runtime MVP、delegate query、action dispatcher、Log / Backlog、普通 Save / Load 子状态 blob 与 editor preview 测试存档；不纳入纯 Inscape 完整存档产品、完整 Rollback、Trace Replay、Flashback Playback。
- 后续未决项已收敛到 [待确认问题](open-questions.md) 与 [TODO](todo.md) 的 P3 / P4 段，重点是条件语法 parser / IR、Runtime State 最小 model / smoke、P4 Runtime MVP 样例、query receipt 粒度和 action pending / resume payload。

### 2026-06-17 SelfHostedEditor P2.5 Final Validation 快照

P2.5 Host Schema / Host Bridge 与 Unity-Bird 适配收口已完成最终验证，结论为 PASS；P3 entry allowed: YES。

- 最终验收产物见 [SelfHostedEditor P2.5 Final Validation Report](self-hosted-editor-p2-5-final-validation-report.md)。
- P2.5 已完成：Bird 提交策略、真实 Timeline 绑定导出、Bird Unity Import Dry Run、Bird L10N 格式决策、Host Schema / Host Bridge 边界收口，以及 Unity/Bird ExternalSupport 边界复核。
- 最终验证矩阵通过：`.NET build`、Internal tests、UnitySample tests / builds、VSCode manifest / structure / semantic parity、SelfHostedEditor syntax / structure / model / Host Schema HTTP / Host Binding HTTP / semantic parity HTTP、边界 grep 和 `git diff --check`。
- Bird dry-run 最新通过日志为 `artifacts/bird-trial/unity-dry-run-p2-5-phases-fixed-rerun.log`，报告为 `artifacts/bird-trial/phase-export/bird-import-dry-run-report.txt`；Bird 工作树未留下 P2.5 importer、`.meta`、`InscapeGenerated`、Addressables 或正式 L10N 写入。
- 下一轮候选目标可以进入 P3 第二版语法 / Runtime / 扩展能力调研，但必须作为新阶段开启，不得把 Unity / Bird 假设回灌到 `Internal`。

### 2026-06-17 SelfHostedEditor P2.5 Round 6 边界收口快照

P2.5 Round 6 已完成 Host Bridge / ExternalSupport 边界收口；随后最终验证已宣布 P2.5 PASS。

- 审计产物见 [SelfHostedEditor P2.5 Boundary Closure Audit](self-hosted-editor-p2-5-boundary-closure-audit.md)。
- Host Schema / Host Bridge 口径已同步：Schema 是能力清单，Bridge / adapter artifact 才携带 Unity GUID、asset path、Addressables key、Bird ID 和 handler / query implementation 映射。
- 当前可执行 Unity/Bird 导出入口已统一记录为 ExternalSupport `export-unity-sample-*`，历史 `export-bird-*` 仅保留早期原型语境。
- UnityPlugin 仍不是通用 Unity package；Bird importer 保持 `unity-bird-importer/` 原型形态，不创建顶层 `Scripts` / `Resources`。
- 下一轮进入最终验证与 P2.5 PASS/FAIL 收口；P3 只有在最终矩阵通过后才允许启动。

### 2026-06-17 SelfHostedEditor P2.5 Round 5 Bird L10N 决策快照

P2.5 Round 5 已完成 Bird L10N 格式决策，不宣布 P2.5 完成。

- 决策产物见 [SelfHostedEditor P2.5 Bird L10N Format Decision](self-hosted-editor-p2-5-bird-l10n-format-decision.md)。
- 当前 Bird `L10N_Talking.csv` 表头为 `ID,Desc,ZH_CN,EN_US`，runtime 支持 `<pr>` 拆段；选项文本走独立 `L10N_TalkingOption`，坐标是 `talkingId + optionIndex`。
- UnitySample / Bird-compatible adapter 输出仍是早期 `ID,ZH_CN,EN_US,ES_ES` 草案，后续应在 ExternalSupport adapter / merge preview 层支持 `Desc`、项目语言列和 `L10N_TalkingOption`，不改变 Inscape 通用 localization CSV。
- 本轮 merge preview 只写 ignored `artifacts/bird-trial/phase-export/L10N_Talking.p2-5.*`，未改动 Bird 正式 L10N。
- 下一轮进入 P2.5 Round 6：Host Bridge / ExternalSupport 边界收口与最终前验证。

### 2026-06-17 SelfHostedEditor P2.5 Round 4 Bird Dry Run 快照

P2.5 Round 4 已完成真实 Bird Unity Import Dry Run，不宣布 P2.5 完成。

- 审计产物见 [SelfHostedEditor P2.5 Bird Dry Run Audit](self-hosted-editor-p2-5-bird-dry-run-audit.md)。
- 当前 Bird API 已迁到 `TalkingSO.TalkingId` / `TimelineSO.TimelineId` 文件名解析属性，`TalkingTM` 不再保存 `talkingId`、`roleId`、`textAnchorIndex` 或选项文本；Bird importer 已在 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 内最小适配。
- Unity batchmode Dry Run 使用 `artifacts/bird-trial/phase-export/bird-manifest-p2-5-phases.json` 成功生成 report：4 个 timeline hooks，`talking.exit` RESOLVE 到 `Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset`，3 个非支持 phase 明确 `UNSUPPORTED_PHASE`，`unresolved timeline hooks: 0`。
- Dry Run 后清理了临时 `Assets/Editor` importer / `.meta`，没有创建 `InscapeGenerated`，没有改 Addressables 或 Bird 正式 `L10N_Talking.csv`；Bird 工作树仍只剩进入前已有的两处字体 fallback 资产改动。
- 下一轮进入 P2.5 Round 5：Bird L10N 真实格式决策，默认不改变通用 Inscape localization CSV contract。

### 2026-06-17 SelfHostedEditor P2.5 Round 3 Timeline 导出链路快照

P2.5 Round 3 已完成真实 Timeline 绑定导出链路，不宣布 P2.5 完成。

- 审计产物见 [SelfHostedEditor P2.5 Timeline Export Audit](self-hosted-editor-p2-5-timeline-export-audit.md)。
- 当前可执行导出入口是 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli` 的 `export-unity-sample-*`，不是历史 `export-bird-*`；这保持 adapter 位于 ExternalSupport，不进入 Internal CLI。
- `samples/court-loop.inscape` 的 `@timeline.talking.exit court_intro` 已导出为 1 个 hostHook，绑定真实 Bird Timeline GUID `b07842ff2fa161e459e024dc1a9fae7f` 与 `Assets/Resources_Runtime/Timeline/SO_Timeline_0001.asset`。
- 为 Round 4 unsupported phase 验证，ignored `artifacts/bird-trial/timeline-phase-fixture/phase-fixture.inscape` 生成 4 个 hook：`node.enter`、`talking.exit`、`talking.enter`、`node.exit`；兼容 manifest 位于 `artifacts/bird-trial/phase-export/bird-manifest-p2-5-phases.json`。
- 下一轮进入 P2.5 Round 4：临时复制 importer 到 Bird，执行 Unity batchmode Dry Run，跑完清理临时 importer / `.meta` 并核对 Bird git status。

### 2026-06-17 SelfHostedEditor P2.5 Round 2 Bird 提交策略快照

P2.5 Round 2 已完成 Bird 提交策略与试跑边界，不宣布 P2.5 完成。

- 策略产物见 [SelfHostedEditor P2.5 Bird Commit Strategy](self-hosted-editor-p2-5-bird-commit-strategy.md)。
- 当前 Bird 仓库只有两处字体 fallback 资产改动；`Assets/Editor/InscapeBirdManifestImporter.cs` 与 `Assets/Resources_Runtime/Talking/InscapeGenerated/` 均不存在。
- P2.5 Dry Run 允许临时复制 importer 到 Bird `Assets/Editor/` 并在结束后清理；P2.5 不提交 Bird 文件、不执行真实 Import、不使用 `-inscapeApplyAddressables`、不覆盖 Bird 正式 `L10N_Talking.csv`。
- 后续真实 Import / Addressables 变更必须另行确认，并应分别成组审查，不与 importer 或 dry-run report 混在一起。
- 下一轮进入 P2.5 Round 3：重新生成带真实 Timeline 绑定的 Bird manifest，优先复用 `samples/court-loop.inscape` 的 `@timeline.talking.exit court_intro`。

### 2026-06-17 SelfHostedEditor P2.5 Round 1 基线审计快照

P2.5 Host Schema / Host Bridge 与 Unity-Bird 适配收口已完成 Round 1 基线审计，不宣布 P2.5 完成。

- 审计产物见 [SelfHostedEditor P2.5 Baseline Audit](self-hosted-editor-p2-5-baseline-audit.md)。
- P2 PASS 入口条件已确认：`docs/self-hosted-editor-p2-final-validation-report.md` 记录 `P2 stable identity / localization review: PASS` 与 Post-P2 host integration work allowed。
- Bird / Unity 环境可用：`D:\UnityProjects\Bird` 与 `D:\UnityEditors\Unity 2023.2.22f1\Editor\Unity.exe` 均存在；Bird 仓库当前已有两处字体 fallback 资产改动，且当前没有 importer 或 `InscapeGenerated` 资源。
- 架构边界复核通过：Host Schema 仍是能力清单，Host Bridge 仍是 Inscape 可读 ID 到宿主 ID / 资源 / handler / query implementation 的映射层；Unity / Bird 相关实现仍留在 `ExternalSupport` 或外部 Bird 项目。
- 下一轮进入 P2.5 Round 2：Bird importer / `.meta` / `InscapeGenerated` / Addressables / dry-run report 提交策略与试跑边界；不执行真实 Import。

### 2026-06-17 SelfHostedEditor P2 Final Validation 快照

P2 stable identity / localization review 已完成最终验证，结论为 PASS；Post-P2 host integration work allowed: YES。

- 最终验收产物见 [SelfHostedEditor P2 Final Validation Report](self-hosted-editor-p2-final-validation-report.md)。
- Round 14 全量验证通过：`.NET build`、Internal tests、VSCode manifest / structure / semantic parity、SelfHostedEditor syntax / structure / model、localization review/update direct + HTTP、line-map direct + HTTP、node-map direct + HTTP、semantic parity HTTP、workbench integration HTTP、`git diff --check`。
- P2 验收结论：localization review/productization、line identity、stable node map review/apply、localization update safety、VSCode/SelfHostedEditor shared-boundary parity 均已闭环；P2 不实现 batch / multi-apply，后续若重启必须先补共享 batch contract。
- 后续可以进入 P2.5 Host Schema / Host Bridge / Unity-Bird，但必须继续保持 `Internal` 语义真相、`ExternalSupport` 宿主适配、Bird L10N / Host Config / Inscape localization CSV 模型分离。
- 下一轮候选目标：开启 P2.5 前先重读 Host Schema / Host Bridge / Unity-Bird 相关合同与 TODO，确认第一刀只做低风险验证或决策，不把 Unity/Bird 依赖引入 `Internal`。

### 2026-06-17 SelfHostedEditor P2 Round 13 文档与 ADR 收口快照

P2 Round 13 已完成文档、契约和接力入口收口；随后 Round 14 已完成最终验证并宣布 P2 PASS。

- 审计产物见 [SelfHostedEditor P2 Documentation And ADR Closure Audit](self-hosted-editor-p2-doc-adr-closure-audit.md)。
- P1.5 文档收口方案已标记 PASS：`P1.5 long-lived LanguageServer: PASS`，`P2 stable identity / localization review entry allowed: YES`；旧的 packaged LanguageServer artifact 与 fallback 阻塞口径未再命中当前文档。
- 本轮不新增 ADR：P2 仍落在 ADR 0013 / 0017 / 0018 / 0019 / 0020 的既有决策内；长期变化已同步到 stable node id、localization diff alignment 与 l10n extraction contract 文档。
- 后续 Host Schema / Host Bridge / Unity-Bird 已满足入口条件，可以作为 P2.5 启动；仍不得把 Host integration 或 P3 内容回灌到 P2。

### 2026-06-17 SelfHostedEditor P2 Round 12 工作台集成 Smoke 快照

P2 Round 12 已完成 workbench integration smoke 收口，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Workbench Integration Smoke Audit](self-hosted-editor-p2-workbench-integration-smoke-audit.md)。
- 新增 `npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http`，在同一个 dev-host HTTP server 中串起 localization review / update、line-map refresh、stable node map review / apply。
- 该 smoke 覆盖工作台需要的 success / empty / error / status payload：hosted empty localization review、missing baseline update error、session baseline update success、line-map session id 保留、node-map dry-run/apply result、backup metadata、recovery hint 与 session cache non-content status。
- 架构边界未改变：localization update、line-map refresh、stable node map review/apply 仍分别复用 shared Tooling / CLI；SelfHostedEditor 只验证 bridge payload 与 UI 可消费状态，不重建 scoring、migration 或 apply 语义。
- 下一轮进入 P2 Round 13：文档与 ADR 收口；重点清理状态口径、验证入口和后续 Host Schema / Host Bridge / Unity-Bird 的开启条件。

### 2026-06-17 SelfHostedEditor P2 Round 11 Localization Update Safety 快照

P2 Round 11 已完成 localization update safety 收口，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Localization Update Safety Audit](self-hosted-editor-p2-localization-update-safety-audit.md)。
- `Internal/Tooling` 的 previous localization CSV 读取入口现在会拒绝缺少 `anchor` 与 `translation` header 的 CSV；误把 host config CSV 传给 `update-l10n-project --from` 时不会生成伪 updated localization CSV。
- SelfHostedEditor `/api/localization-update` 仍只调用共享 CLI `update-l10n-project`，并在 compact payload 中暴露 `safety` 摘要：`generatedBy`、`writesWorkspaceFile: false`、backup `not-written-by-dev-host`、CSV byte length、override count 与恢复提示。
- direct / HTTP localization update smoke 已覆盖真实旧 CSV + anchor override、session baseline 复用、host config CSV 拒绝；Internal CLI test 覆盖同一共享 guard。
- VSCode `check:semantic-parity` 继续确认 VSCode localization update 只走 shared CLI，不混入 SelfHostedEditor file-handle / draft CSV builder；SelfHostedEditor bridge 只通过 backend workflow service 调 update command。
- 下一轮进入 P2 Round 12：工作台集成 Smoke；重点串起 localization review/update、line map、node map review/apply 的真实工作流，并修 UI loading / error / empty / success report 断点。

### 2026-06-17 SelfHostedEditor P2 Round 10 Batch Review / Multi-Apply 决策快照

P2 Round 10 已完成 batch review / multi-apply 决策，不宣布 P2 完成。

- 决策产物见 [SelfHostedEditor P2 Batch Review / Multi-Apply Decision](self-hosted-editor-p2-batch-multi-apply-decision.md)。
- P2 不实现 batch review / multi-apply；保留并验收当前逐个 manual-review candidate 的可审计闭环：`Preview Apply` dry-run、`Apply` -> `Confirm Apply`、desktop 写回前 backup、dev-host download-ready。
- 原因：当前共享契约只有单候选 apply result / backup / recovery metadata；若在宿主侧循环调用，会把 batch 语义、失败恢复和 candidate selection 策略复制进 VSCode 或 SelfHostedEditor。
- 新增回归护栏：VSCode `check:semantic-parity` 会拒绝 VSCode / SelfHostedEditor node-map UI 或 bridge 中出现 `Apply All`、bulk、batch、multi-apply 类入口，防止 P2 混入半成品批量写回。
- 开放问题：P2 后若重新评估 batch review / multi-apply，必须先设计共享 Tooling / CLI batch dry-run / result / rollback contract，只允许用户显式选择 candidates，不允许一键全量静默 apply。
- 下一轮进入 P2 Round 11：Localization Update Safety；重点确认 localization CSV update 只经受控 shared contract 执行，并继续保持 localization CSV 与 host config CSV 的 UI model 分离。

### 2026-06-17 SelfHostedEditor P2 Round 9 VSCode Parity 与共享边界快照

P2 Round 9 已完成 VSCode / SelfHostedEditor P2 语义消费边界复核，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 VSCode Parity Boundary Audit](self-hosted-editor-p2-vscode-parity-boundary-audit.md)。
- VSCode stable node map 路径继续只调用共享 CLI：`update-node-map-project` 与 `apply-node-map-candidate-project`；VSCode 自己只保留 Quick Pick、`.review-backup.json` / revert 等宿主体验，不依赖 SelfHostedEditor desktop-only `stable-node-map.write-sidecar` 或 `workspace.write-back-backup`。
- VSCode localization review/update/line identity 继续通过 `audit-l10n-alignment-project`、`update-l10n-project` 与 `refresh-l10n-line-map-project`；Quick Pick 只展示 shared `signals` / `actionStatus`，不重算 candidate similarity、rank penalty 或排序。
- SelfHostedEditor 继续通过 backend service / transport command 消费 shared payload；dev-host route map 不暴露真实 sidecar write-back，Electron desktop 写回仍必须先 `workspace.write-back-backup` 再 `stable-node-map.write-sidecar`。
- `npm --prefix src\ExternalSupport\VSCode run check:semantic-parity` 已补入 P2 静态边界断言，和 SelfHostedEditor `check:semantic-parity-http` 分别守住 VSCode provider parity 与 SelfHostedEditor dev-host authoring parity。
- 下一轮进入 P2 Round 10：Batch Review / Multi-Apply 决策；重点是决定是否需要进入 P2，默认不扩大自动 apply 范围，若做也只能是可 dry-run、可审计、可备份/撤回的 selected candidates 小闭环。

### 2026-06-17 SelfHostedEditor P2 Round 8 Stable Node Map UI 闭环快照

P2 Round 8 已完成 stable node map manual-review apply 的 UI / workspace write-back 闭环，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Stable Node Map UI Closure Audit](self-hosted-editor-p2-stable-node-map-ui-closure-audit.md)。
- SelfHostedEditor node-map review UI 现在把 `Apply` 拆成 `Apply` -> `Confirm Apply` 两步；第一次点击只显示确认，不触发 real apply。
- `Preview Apply` 仍是 dry-run + preview download，不调用 backup 或真实 sidecar write。
- 新增 desktop-only `stable-node-map.write-sidecar` command，通过 preload whitelist / IPC / `ElectronWorkspaceSessionStore` 写回 `**/inscape.node-map.json`，结果 text-free。
- Confirm apply 后先调用 `workspace.write-back-backup`，至少成功复制一个 node-map sidecar 备份后才写入 workspace sidecar；备份或写入失败时 UI 只显示 download-ready / write-back failed，不误报 workspace applied。
- dev-host HTTP 路径仍无 sidecar write route，保持 downloadable payload 语义；真实 workspace write-back 仅属于 Electron desktop backend。
- 下一轮进入 P2 Round 9：VSCode Parity 与共享边界；重点确认 VSCode / SelfHostedEditor 都只消费 shared Tooling / CLI contract，不在宿主端重复实现 stable identity 或 localization semantics。

### 2026-06-17 SelfHostedEditor P2 Round 7 Stable Node Map Contract 加固快照

P2 Round 7 已完成 stable node map review/apply contract 加固，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Stable Node Map Contract Audit](self-hosted-editor-p2-stable-node-map-contract-audit.md)。
- `Internal/Tooling` 现在为 manual-review candidate 输出共享 `evidence` 与 `applyPreview`：候选证据来自评分过程，apply preview 明确 `removedStableId -> appliedStableId`、候选标题、结果标题、previousTitles 与是否移除候选 entry。
- `StoryNodeMapReviewActionDomain` / `StoryNodeMapReviewCandidateApplyResultModel` 现在输出 `inscape.node-map-candidate-apply-result`，包含 dry-run/apply mode、`writesNodeMap`、`changePreview`、`backup` metadata 与 `recoveryHint`。
- CLI `apply-node-map-candidate-project` 新增 `--result <json>`；stdout 仍保持写出路径，dry-run 写 preview sidecar + result，apply 写 node-map sidecar + result。
- SelfHostedEditor `/api/node-map-apply` 读取 CLI result 并只做 compact：payload 暴露 `changePreview`、`backup`、`recoveryHint` 与 result metadata；浏览器 UI 只显示共享字段，不推断候选语义，也不直接改写工作区 sidecar。
- Direct / HTTP / model / Internal tests 已覆盖 candidate evidence、apply preview、dry-run result、apply result、backup metadata 与 recovery hint。
- 下一轮进入 P2 Round 8：Stable Node Map UI 闭环；重点是真实 workspace write-back 与 downloadable payload 的状态区分、接入 `workspace.write-back-backup`、人工确认与错误恢复，不提前扩展 batch/multi-apply 或 Host integration。

### 2026-06-17 SelfHostedEditor P2 Round 6 Stable Node Map 当前链路审计快照

P2 Round 6 已完成 stable node map review/apply 当前链路审计，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Stable Node Map Chain Audit](self-hosted-editor-p2-stable-node-map-chain-audit.md)。
- 当前 review/apply 语义仍在 `Internal/Tooling`：`StoryNodeMapUpdateDomain` 生成 `renamed / new / missing / conflict / manual-review` report，`StoryNodeMapReviewActionDomain` 执行 selected candidate apply。
- CLI `update-node-map-project --report` 与 `apply-node-map-candidate-project` 仍是 shared 命令入口；dry-run 写 `inscape.node-map-candidate-preview.json`，apply 写 `inscape.node-map.json`。
- SelfHostedEditor `/api/node-map-review` / `/api/node-map-apply` 只做 dev-host bridge 与 compact payload；浏览器 UI 只显示 report、source jump、dry-run preview download 和 downloadable sidecar payload，不直接改写工作区 sidecar。
- Direct / HTTP smoke 已新增 path 分离断言，UI contract 已确认 `Preview Apply` 发出 dry-run、`Apply` 发出 real apply。
- 当前缺口已明确留给 Round 7/8：apply result contract 需要 backup metadata / recovery hint / richer conflict evidence，桌面真实写回需要接入 `workspace.write-back-backup`，并区分 download-only payload 与 real write-back success。
- 下一轮进入 P2 Round 7：Stable Node Map Contract 加固；重点是 conflict report、dry-run/apply result、backup metadata 与 recovery hint，不提前做 batch/multi-apply 或 Host integration。

### 2026-06-17 SelfHostedEditor P2 Round 5 Localization Review UI 快照

P2 Round 5 已完成 localization review UI 产品化第一刀，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Localization Review UI Audit](self-hosted-editor-p2-localization-review-ui-audit.md)。
- SelfHostedEditor localization review row 现在显示 compact audit chips：current line identity、review risk/candidate count，以及候选 action 的 shared similarity / rank penalty / reason / candidate line identity。
- Diff 仍通过 Tooling presenter `show-candidate-diff.detail` 展开；浏览器只显示 shared diff，不重建 diff 或 candidate order。
- 真实 in-app browser 检查发现并修复了 dev-host HTTP transport 默认 `fetch` 绑定丢失的问题；`SelfHostedEditorHttpBackendTransport` 现在用 `fetchImpl.call(globalThis, ...)`，hosted review 不再因 `Illegal invocation` fallback。
- Debug 自检覆盖 clear match（真实 `court-loop` 170 rows）、similar candidate（model fixture `Match 0.950` / `Rank 2` / `Reason same-stable-node`）与 ambiguous candidate（model fixture `conflict/choose-candidate` / `Candidates 2` / `Rank 4` / `Candidate drift`）。
- 下一轮进入 P2 Round 6：Stable Node Map 当前链路审计；重点是 dry-run、apply、冲突报告、备份/恢复路径与缺口清单。

### 2026-06-17 SelfHostedEditor P2 Round 4 Review Presenter 形状收敛快照

P2 Round 4 已完成 review presenter shape 收敛，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Review Presenter Shape Audit](self-hosted-editor-p2-review-presenter-shape-audit.md)。
- `Internal/Tooling` 的 localization review presenter 现在通过 shared `signals` 表达 review status、candidate count、similarity、rank penalty、reason、current/candidate line identity 与 risk/warning。
- SelfHostedEditor compact localization review payload 继续保留 row 的 `lineId`、`lineFingerprint`、`lineIdentityStatus`，item 级只携带 high-risk signals，`open-candidate` action 携带 structured candidate signals；普通 item detail 已压缩以控制 payload。
- VSCode QuickPick 与 SelfHostedEditor table tooltip 都消费 shared `signals`，不解析旧 status 文本，也不计算 candidate ranking。
- 真实 `court-loop` review payload 当前为 231521 bytes，低于 240000 bytes 上限；direct / HTTP localization review smoke 均通过。
- 下一轮进入 P2 Round 5：SelfHostedEditor Localization Review UI；重点是把 candidate diff、rank reason、line identity、conflict/risk 状态产品化为可读 UI 审计信息，并进行人工 clear match / similar candidate / ambiguous candidate 检查。

### 2026-06-17 SelfHostedEditor P2 Round 3 Line Identity 信号加固快照

P2 Round 3 已完成 line identity signal 加固，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Line Identity Signal Audit](self-hosted-editor-p2-line-identity-signal-audit.md)。
- SelfHostedEditor compact localization review payload 现在保留 shared `item.lineId`、`item.lineFingerprint`、`item.lineIdentityStatus`，并在 `open-candidate` action 上保留 Tooling 生成的 `actionStatus`。
- Candidate action 的 `actionStatus` 来自 `LocalizationReviewPresenterModelBuilderDomain`，包含 shared similarity / rank penalty / reason / line identity 摘要；SelfHostedEditor 只透传并用于 tooltip，不计算候选排序。
- Diff action 继续保留 shared `detail`，避免重复携带 actionStatus / summary 导致 payload 超限；真实 `court-loop` review payload 当前为 238738 bytes，仍低于 240000 bytes 上限。
- 新增/更新 contract smoke：payload bridge、model contract、localization review direct / HTTP smoke 都守住 candidate rank / identity status 不丢失。
- 下一轮进入 P2 Round 4：Review Presenter 形状收敛；重点是把 candidate / diff / rank / identity / risk 信号收敛成更稳定的共享 presenter contract，并做 VSCode / SelfHostedEditor parity 检查。

### 2026-06-17 SelfHostedEditor P2 Round 2 Localization Scoring 契约审计快照

P2 Round 2 已完成 localization candidate scoring 契约审计，不宣布 P2 完成。

- 审计产物见 [SelfHostedEditor P2 Localization Scoring Audit](self-hosted-editor-p2-localization-scoring-audit.md)。
- 当前证据显示 `LocalizationAlignmentAuditDomain` 仍是 candidate similarity、rank penalty、reason、line identity 与候选排序的共享真相。
- 相似文本不会静默复用旧译文：只有 `kept / confirmed` 会填入 previous translation；`changed` / `conflict` 当前 item 保持空 translation，旧译文只作为 candidate 暴露给人工 review。
- 现有 Internal tests 已覆盖 confirmed translation、changed candidate 不继承、low-confidence conflict、same-line rewrite、exact line identity priority、context / keyword / neighbor / local context ranking reason；本轮未新增重复测试。
- SelfHostedEditor 只消费 shared presenter items/actions 并渲染 Current / Candidate / Diff，不计算 similarity、rank penalty 或候选排序。
- 下一轮进入 P2 Round 3：Line Identity 信号加固；继续检查 line id、fingerprint、local context、rank penalty 与 diff detail 的可审计展示。

### 2026-06-17 SelfHostedEditor P2 Round 1 基线审计快照

P2 stable identity / localization review 主线已开始，当前只完成基线审计，不宣布 P2 完成。

- 基线产物见 [SelfHostedEditor P2 Baseline Audit](self-hosted-editor-p2-baseline-audit.md)。
- 已验证 SelfHostedEditor `check:syntax` / `check:structure` / `check:model` / `check:localization-review` / `check:line-map` / `check:node-map`。
- 当前证据显示 localization alignment scoring、line identity、stable node map review/apply 的核心语义位于 `Internal/Tooling` 与共享 CLI；SelfHostedEditor 仍只做 bridge / UI / confirmation。
- 主要缺口：localization scoring 专项审计、review UI 结构化审计展示、line identity risk 可读性、stable node map apply backup/recovery metadata、batch/multi-apply 决策、VSCode parity 与最终验证。
- 下一轮进入 P2 Round 2：Localization Scoring 契约审计；不得提前进入 P2.5 Host Schema / Host Bridge / Unity-Bird 或 P3。

### 2026-06-17 SelfHostedEditor P1.5 文档收口快照

SelfHostedEditor desktop backend v0 与 P1.5 workspace-scoped long-lived LanguageServer 已完成收口，当前文档口径统一为 `P1.5 long-lived LanguageServer: PASS` 与 `P2 stable identity / localization review entry allowed: YES`。本次只做文档同步，不启动 P2 行为。

- P1.5 packaged build 已打入 `Inscape.LanguageServer` artifact，路径为 `resources/language-server`；packaged resolver 使用该 resource artifact，不再依赖源码树。
- `smoke:desktop-package-language` 覆盖真实 packaged app + real long-lived LanguageServer path，验证 diagnostics / completions / definition / references / hover / document symbols 六类 authoring endpoint。
- `check:electron-language-fallback` 已覆盖同一 LanguageServer artifact 上的 `process-per-request` fallback；fallback/health/restart/documentRevisionLag 等状态保持 text-free。
- 当前剩余项只属于 hardening 与后续 P2 主线，不再阻塞 P1.5 验收。

### 2026-06-16 SelfHostedEditor P1 Round 1 基线审计快照

P1 已从 P0 验收后进入 desktop backend v0 执行线；当前完成的是 Round 1 基线审计，未改产品行为。

- P1 执行主线见 [SelfHostedEditor P1 40 轮内执行方案](self-hosted-editor-p1-40-round-execution-plan.md)，自检清单见 [SelfHostedEditor P1 自检文档](self-hosted-editor-p1-self-check.md)，本轮启动提示见 [SelfHostedEditor P1 Executor Prompt](self-hosted-editor-p1-executor-prompt.md)。
- 启动基线已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`、VSCode `check:semantic-parity`、`dotnet build Inscape.slnx --no-restore`、Internal tests。
- 现有 `EditorBackendClient` 已经支持 transport 注入，默认使用 `SelfHostedEditorHttpBackendTransport`；feature bridge 通过 `languageSession`、`runtimeSession`、`localizationSession`、`lineIdentitySession`、`stableNodeMap`、`hostCapabilities`、`storyGraph` 与 `projectSession` 这类业务入口调用 backend。
- 当前 transport 契约仍是 `postJson(path, payload)`，`/api/*` path 集中在 `EditorBackendClient` 内部；后续 Round 3 / Round 4 要把它收敛为可替换的 editor command / 业务窄接口，而不是暴露 generic RPC 给 feature controller。
- dev HTTP route、handler、temporary workspace 与 smoke 仍集中在 `DevScripts`，它们是开发宿主 transport，不是产品 backend API。
- Round 1 没有进入 Electron/preload、`DocumentBufferStore`、workspace file IO、autosave/recovery 或 P1.5 full long-lived LanguageServer。下一步按计划进入 Round 2：embedded backend v0 model contract。

### 2026-06-16 SelfHostedEditor P1 Round 2 model contract 快照

P1 Round 2 已完成 embedded backend v0 model contract，仍未接 Electron 或真实文件 IO。

- 新增 `EditorBackendDesktopSessionModel`，覆盖 `embedded-desktop` project session、DocumentBuffer、workspace file boundary、save status、recovery status 与 settings summary。
- 新增 `check:desktop-backend`，并接入 `check:model`；`check:structure` 已守住新增 model 和 contract check。
- DocumentBuffer model 可以持有当前 text，但 project session status 只暴露 summary；contract 明确断言不泄露 document text 或 recovery text。
- workspace file boundary guard 当前允许 `.inscape`、localization CSV、node-map sidecar、line-map sidecar、`.inscape-workspace/recovery|backups|cache` 与 `assets/`，并拒绝空路径、绝对路径、`..` 越界和未白名单写回。
- defaults 保持 P1 边界：autosave / backup 默认开启，资源默认复制进 `assets/`，language session 默认仍是 `process-per-request`，没有默认启用 P1.5 full long-lived LanguageServer。
- Round 2 验证已通过：SelfHostedEditor `check:desktop-backend` / `check:syntax` / `check:model` / `check:structure`。下一步进入 Round 3：抽出更明确的 `EditorBackendTransport` contract，保留 HTTP dev host 默认路径。

### 2026-06-16 SelfHostedEditor P1 Round 3 transport 快照

P1 Round 3 已完成 command-based `EditorBackendTransport` 抽出，HTTP dev host 仍是默认 transport。

- 新增 `EditorBackendTransportCommand` catalog，覆盖 language、host capability、story graph、runtime、line identity、localization、stable node map 与 project session status commands。
- `EditorBackendClient` 现在只调用 `transport.invoke(command, payload)`，不再保存 `/api/*` route；feature bridge 仍只看到业务入口。
- `SelfHostedEditorHttpBackendTransport` 负责 command -> dev-host `/api/*` route 映射；`/api/*` 现在是 HTTP adapter 细节，不是产品 backend contract。
- 新增 `check:backend-transport` 并接入 `check:model`；`check:structure` 已守住 `EditorBackendClient` 不得重新包含 `/api/*`。
- Round 3 验证已通过：SelfHostedEditor `check:backend-transport` / `check:syntax` / `check:model` / `check:structure` / `check:semantic-parity-http`。下一步进入 Round 4：业务窄接口 adapter。

### 2026-06-16 SelfHostedEditor P1 Round 4 services 快照

P1 Round 4 已完成 UI 侧业务窄接口 adapter，仍未接 Electron 或真实文件 IO。

- 新增 `EditorBackendServiceRegistry`，从 `EditorBackendClient` 派生 `ProjectSessionService`、`DocumentBufferStore`、`LanguageSessionClient`、`HostCapabilityClient`、`StoryGraphClient`、`RuntimeSessionClient`、`LineIdentitySessionClient`、`LocalizationWorkflowClient`、`StableNodeMapClient` 与 `BackendDiagnosticsService`。
- Service object 只暴露业务方法，不暴露 `invoke`、`request`、`postJson` 或底层 `backendClient`。
- `SelfHostedEditorFeatureBootstrapper` 现在创建服务集合并向 Bridge 注入具体能力；feature Bridge 不再 import / new `EditorBackendClient`。
- `SelfHostedEditorWorkbenchRenderController` 只依赖 `ProjectSessionService.status()` 刷新 session 状态。
- 新增 `check:backend-services` 并接入 `check:model`；`check:structure` 已守住 service registry 与 Bridge narrow dependency。
- Round 4 验证已通过：SelfHostedEditor `check:backend-services` / `check:syntax` / `check:model` / `check:structure` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`dotnet build Inscape.slnx --no-restore` 与 Internal tests。下一步进入 Round 5：fake embedded transport harness，证明 UI service layer 不依赖 HTTP path。

### 2026-06-16 SelfHostedEditor P1 Round 5 fake embedded transport 快照

P1 Round 5 已完成 fake embedded transport / direct harness，仍未接 Electron、preload 或真实文件 IO。

- 新增 `SelfHostedEditorFakeEmbeddedTransport`，只实现 command-based `invoke(command, payload)`，不包含 `/api/*` route、`fetch()` 或 `postJson`。
- 新增 `check:fake-embedded-transport`，通过 fake direct transport 驱动真实 `EditorBackendClient`、`EditorBackendServiceRegistry`、diagnostics / runtime / localization Bridge 与 project session status。
- contract 验证 UI service layer 的 direct path 调用记录只包含 `EditorBackendTransportCommand`，不包含 dev-host route，并继续断言 project session status 不泄露 workspace document text。
- `check:model` 与 `check:structure` 已纳入 fake embedded transport guard。
- Round 5 验证已通过：SelfHostedEditor `check:fake-embedded-transport` / `check:syntax` / `check:model` / `check:structure` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 6：structure guard 第一刀。

### 2026-06-16 SelfHostedEditor P1 Round 6 structure guard 快照

P1 Round 6 已完成 structure guard 第一刀，仍未接 Electron 工程骨架。

- `check:structure` 现在禁止生产 `Scripts/` 除 `EditorBackendTransport` command catalog 外出现 dev-host `/api/*` route 字符串。
- `check:structure` 现在禁止 renderer `Scripts/` 直接 import Node / Electron runtime、`ipcRenderer`、`contextBridge`、`BrowserWindow` 或 `child_process`；Monaco AMD loader 仍可用。
- `check:structure` 现在守住 backend access：生产 `Scripts/` 只有 `EditorBackendClient` 与 `EditorBackendServiceRegistry` 可接触完整 backend client，transport 细节必须留在 client / adapter 内。
- Round 6 验证已通过：SelfHostedEditor `check:structure` / `check:syntax` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 7：Electron 工程骨架，并保持 dev host 默认路径不变。

### 2026-06-16 SelfHostedEditor P1 Round 7 Electron skeleton 快照

P1 Round 7 已完成 Electron main / preload / app entry 骨架，尚未新增 Electron 依赖、启动脚本、IPC 或文件 IO。

- 新增 `Desktop/ElectronMain.js`，定义 BrowserWindow skeleton，默认 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，并指向现有 Workbench HTML 与 `ElectronPreload.js`。
- 新增 `Desktop/ElectronPreload.js`，只通过 `contextBridge` 暴露静态 `inscapeSelfHostedEditor` capability summary；当轮明确 `embeddedBackend: false` 与 `workspaceFileSystem: false`。
- 新增 `Desktop/ElectronAppEntry.js`，记录 Electron shell 与现有 renderer app entry / workbench document 的关系。
- 新增 `check:electron-shell` 并接入 `check:model`；`check:syntax` 现在覆盖 `Desktop/`。
- Round 7 验证已通过：SelfHostedEditor `check:electron-shell` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 8：BrowserWindow 安全配置 contract 加固。

### 2026-06-16 SelfHostedEditor P1 Round 8 BrowserWindow security 快照

P1 Round 8 已完成 BrowserWindow 安全配置加固，仍未新增 IPC、文件 IO 或 Electron 启动脚本。

- `ElectronMain` 新增 `buildSelfHostedEditorBrowserWindowOptions()`，集中定义 BrowserWindow 安全默认。
- `webPreferences` 显式设置 `contextIsolation: true`、`nodeIntegration: false`、`nodeIntegrationInSubFrames: false`、`nodeIntegrationInWorker: false`、`sandbox: true`、`webSecurity: true`、`allowRunningInsecureContent: false` 与 `webviewTag: false`。
- 新增 `applySelfHostedEditorWindowSecurity()`，默认阻止新窗口并限制 navigation 到 `file:`。
- `check:electron-shell` 已覆盖上述安全字段和 window-open / navigation handler。
- Round 8 验证已通过：SelfHostedEditor `check:electron-shell` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 9：preload public API 白名单边界。

### 2026-06-16 SelfHostedEditor P1 Round 9 preload API 快照

P1 Round 9 已完成 preload public API 白名单，仍未接 `ipcRenderer`、真实 command 执行或 workspace 文件 IO。

- 新增 `Desktop/ElectronPreloadApi.js`，集中定义 `inscapeSelfHostedEditor` preload API 名称、capabilities 与 editor command 白名单。
- command 白名单当前覆盖 project session、document buffer 与 workspace 打开 / 列表等受控 command 名称；不暴露 generic `invoke` / `send` / `request`。
- `ElectronPreload.js` 只负责 `contextBridge.exposeInMainWorld()` 暴露冻结 API object。
- `check:electron-shell` 现在验证 command 唯一性、capability 默认值和无 IPC / HTTP route / generic request surface。
- Round 9 验证已通过：SelfHostedEditor `check:electron-shell` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 10：embedded invoke transport skeleton。

### 2026-06-16 SelfHostedEditor P1 Round 10 preload transport 快照

P1 Round 10 已完成 desktop preload transport skeleton，仍未接真实 IPC 或 workspace 文件系统。

- 新增 `SelfHostedEditorPreloadBackendTransport`，把 `EditorBackendTransportCommand` 映射到 preload API typed namespace 方法。
- `EditorBackendClient` 默认 transport 现在会检测 `globalThis.inscapeSelfHostedEditor`；Electron/preload 环境使用 preload transport，普通 dev browser 继续 HTTP transport。
- `ElectronPreloadApi` typed namespace 覆盖现有 language / host / graph / runtime / line / localization / node-map / project session commands，并预留 document buffer / workspace command；默认 handler 未接线时显式报错。
- 新增 `check:preload-transport` 并接入 `check:model`；该检查验证 desktop default path 与 dev HTTP fallback path。
- Round 10 验证已通过：SelfHostedEditor `check:preload-transport` / `check:electron-shell` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 11：preload / IPC validation skeleton。

### 2026-06-16 SelfHostedEditor P1 Round 11 preload validation 快照

P1 Round 11 已完成 preload command / payload validation skeleton，仍未接真实 IPC channel。

- `ElectronPreloadApi` 新增 `validateSelfHostedEditorPreloadCommandPayload(command, payload)`；未知 command 会被拒绝。
- 每个 preload command 维护 top-level payload key 白名单；payload 必须是普通 object，数组和多余字段会被拒绝。
- typed preload command handler 在调用 handler 前统一执行 validator；未接线 handler 仍显式报错。
- `check:preload-transport` 覆盖 unknown command 与非法 payload key；`check:electron-shell` 覆盖 validator 存在且无 generic request surface。
- Round 11 验证已通过：SelfHostedEditor `check:preload-transport` / `check:electron-shell` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 12：Electron 边界 contract 收束。

### 2026-06-16 SelfHostedEditor P1 Round 12 Electron boundary 快照

P1 Round 12 已完成 Electron / preload / renderer / desktop transport 边界 contract，仍未接真实 IPC 或文件 IO。

- 新增 `check:electron-boundary` 并接入 `check:model` / `check:structure`。
- contract 扫描 renderer `Scripts/`：禁止直接 import Electron / Node runtime、使用 `ipcRenderer`，并继续禁止非 transport catalog 文件知道 `/api/*`。
- contract 验证 preload 只使用 `contextBridge`，不使用 `ipcRenderer`、`node:fs` 或 `child_process`。
- contract 验证 preload API 不暴露 `invoke` / `send` / `request` / `readFile` / `writeFile` / `runCommand` 等 generic/system surface。
- contract 验证 preload command whitelist 覆盖当前 `EditorBackendTransportCommand`，并且 preload transport 可处理所有当前 backend command。
- Round 12 验证已通过：SelfHostedEditor `check:electron-boundary` / `check:preload-transport` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 13：workspace path guard。

### 2026-06-16 SelfHostedEditor P1 Round 13 workspace path guard 快照

P1 Round 13 已完成 backend workspace path guard contract，仍未接真实文件 IO、open workspace folder 或 autosave / recovery。

- 新增 `EditorBackendWorkspacePathModel`，集中归一化 workspace root、workspace-relative path 与 resolved path 摘要。
- path guard 拒绝空路径、Windows / POSIX / UNC / URI-like 绝对路径、`..` 越界、`.` segment、null byte 与解析后不在 workspace root 下的路径。
- `EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary()` 现在先通过 workspace path guard，再执行既有写回白名单；boundary 输出包含 `workspaceRoot`、`resolvedWorkspacePath`、`withinWorkspace` 与嵌入的 `pathBoundary`。
- 新增 `check:workspace-fs` 并接入 `check:model`；`check:structure` 已守住新增 model / contract 文件与 package script。
- Round 13 验证已通过：SelfHostedEditor `check:workspace-fs` / `check:desktop-backend` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 14：写回白名单。

### 2026-06-16 SelfHostedEditor P1 Round 14 write target whitelist 快照

P1 Round 14 已完成 workspace 写回白名单 catalog / decision contract，仍未接真实文件 IO、保存、backup 或 recovery 写盘。

- 新增 `EditorBackendWorkspaceWriteTargetModel`，集中定义允许写回的 target kind 与 path rule catalog。
- 白名单显式覆盖 `.inscape` 文档、localization CSV、`inscape.node-map.json`、`inscape.line-map.json`、`.inscape-workspace/recovery/**`、`.inscape-workspace/backups/**`、`.inscape-workspace/cache/**` 与 `assets/**`。
- `EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary()` 现在先执行 workspace path guard，再调用 write target policy；boundary 输出嵌入 `writeTarget` decision。
- `check:workspace-fs` 覆盖 write target catalog、允许目标、未白名单目标，以及目录本身不能作为文件写回目标。
- Round 14 验证已通过：SelfHostedEditor `check:workspace-fs` / `check:desktop-backend` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 15：open workspace folder。

### 2026-06-16 SelfHostedEditor P1 Round 15 open workspace folder 快照

P1 Round 15 已完成 open workspace folder model / contract，仍未接真实文件选择器、磁盘扫描或 ProjectSession lifecycle。

- 新增 `EditorBackendWorkspaceFolderModel`，定义 workspace open decision、workspace folder summary 与 workspace document summary。
- open decision 只接受 `directory`，拒绝正式单文件模式并返回 `single-file-mode-rejected`；空 workspace root 返回 `workspace-root-required`。
- workspace folder summary 可列出多个 `.inscape` 文档、设置 active document，并在 active path 缺失时回落到第一个有效文档。
- document list 只接受 workspace-relative `.inscape` 文件；非 `.inscape` 候选和路径越界候选进入 `rejectedDocuments`，且 summary 不暴露 document text。
- Round 15 验证已通过：SelfHostedEditor `check:workspace-fs` / `check:desktop-backend` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 16：ProjectSession lifecycle。

### 2026-06-16 SelfHostedEditor P1 Round 16 ProjectSession lifecycle 快照

P1 Round 16 已完成一个窗口一个 active project session 的 lifecycle status contract，仍未实现 session restore、多窗口共享或 workspace 切换清理。

- 新增 `EditorBackendProjectSessionLifecycleModel`，定义 `inscape.self-hosted-editor.project-session-lifecycle` status shape。
- `EditorBackendDesktopSessionModel.buildProjectSession()` 返回 `lifecycle` 摘要，包含 `ownership: "single-window-active-session"`、`windowId`、`sessionId`、`workspaceRoot`、`activeRelativePath`、`documentCount`、`revision` 与 `mode: "embedded-desktop"`。
- workspace summary 同步暴露 normalized `workspaceRoot`，仍只返回 document summaries，不泄露 document text、recovery text、CSV、line-map 或 Runtime snapshot。
- `check:desktop-backend` 覆盖 lifecycle shape、window id normalization、workspace root、active document、document count、revision 与 embedded mode。
- Round 16 验证已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 17：close / switch workspace cleanup。

### 2026-06-16 SelfHostedEditor P1 Round 17 cleanup summary 快照

P1 Round 17 已完成 close / switch workspace cleanup summary contract，仍未执行真实进程清理、磁盘删除、session restore 或多窗口共享。

- 新增 `EditorBackendWorkspaceSessionCleanupModel`，定义 `inscape.self-hosted-editor.workspace-session-cleanup` status shape。
- cleanup summary 支持 `close-workspace` / `switch-workspace` operation，并列出需要清理的 `language-session`、`runtime-session`、`line-identity-session`、`localization-session` 与 `temporary-workspace` target。
- cleanup summary 只暴露 `runtimeSnapshots`、`lineMapSidecars`、`localizationBaselines`、`temporaryWorkspaceFiles` 计数和 target kind / action，不暴露 Runtime snapshot、line-map、CSV baseline 或临时文件内容。
- `EditorBackendDesktopSessionModel.buildWorkspaceSessionCleanupSummary()` 作为 desktop backend model 入口；`check:desktop-backend` 覆盖 cleanup shape、target、计数与 payload exposure flag。
- Round 17 验证已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity`，`.NET build` 与 Internal tests。下一步进入 Round 18：session panel / status 接入。

### 2026-06-16 SelfHostedEditor P1 Round 18 session panel status 快照

P1 Round 18 已完成 session panel / status 接入，仍未接真实 Electron IPC、真实文件 IO、保存恢复或 P1.5 long-lived LanguageServer 默认启用。

- 新增 `ProjectWorkspaceSessionStatusModelBuilder`，定义 `inscape.self-hosted-editor.workspace-session-panel-status` UI-safe panel status shape。
- `SelfHostedEditorWorkbenchRenderController` 通过该模型投影 workspace / layout / ProjectSession / Runtime snapshot 摘要；render controller 不再自行拼 backend/session/runtime 标签。
- `ProjectWorkspaceSessionController` 现在显示 workspace revision、language mode、Runtime 当前状态、Runtime store、line identity 与 localization 子状态。
- `SelfHostedEditorWorkbenchIntegrationContractCheck` 覆盖 dev-host status 与 `embedded-desktop` status 的 panel 投影，并断言不暴露 document text、CSV、line-map 或 Runtime snapshot 内容。
- Round 18 验证已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `node --check ExtensionManifestEntry.js` / `check:structure`，`.NET build` 与 Internal tests。下一步进入 Round 19：DocumentBufferStore v0。

### 2026-06-16 SelfHostedEditor P1 Round 19 DocumentBuffer model 快照

P1 Round 19 已完成 DocumentBuffer 独立 model 抽出，仍未实现 list / get / update / active document、真实文件 IO 或 authoring / Preview buffer 接入。

- 新增 `EditorBackendDocumentBufferModel`，定义 `inscape.self-hosted-editor.document-buffer` shape。
- buffer 记录 `relativePath`、`text`、`diskTextHash`、`revision`、`dirty`、`existsOnDisk`、`lastLoadedUtc` 与 `active`。
- `EditorBackendDesktopSessionModel.buildDocumentBuffer()` / `buildDocumentBufferSummary()` 复用独立 DocumentBuffer model。
- `DocumentBufferStore.buildBuffer()` / `buildSummary()` 直接复用 `EditorBackendDocumentBufferModel`；workspace boundary、save、recovery、settings 仍由 desktop session model 暂时承接。
- `check:desktop-backend` 覆盖 direct DocumentBuffer model 与 desktop session 组合路径，summary 继续禁止暴露 document text。
- Round 19 当前已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:desktop-backend` / `check:backend-services` / `check:model`。下一步进入 Round 20：list / get / update / active document。

### 2026-06-16 SelfHostedEditor P1 Round 20 DocumentBufferStore operations 快照

P1 Round 20 已完成 DocumentBufferStore 纯 model 操作 contract，仍未接真实文件 IO、authoring / Preview buffer 输入或 Round 21 stale guard。

- 新增 `EditorBackendDocumentBufferStoreModel`，定义 `inscape.self-hosted-editor.document-buffer-store` 与 `document-buffer-list` shape。
- store 可持有多个 document buffer、session id、workspace name、active relative path、document count 与 store revision。
- `listDocuments()` 返回 text-free summaries，并明确 `payloadContentExposed: false`。
- `getDocument()` 按 relative path 返回单个 buffer；这是明确 document read path，可以携带 text。
- `updateDocument()` 更新 text、标记 dirty，并把 document / store revision 推进到当前 store 之后；旧 revision stale guard 留给 Round 21。
- `setActiveDocument()` 切换 active document；缺失文档返回 `document-not-found`。
- `DocumentBufferStore` 窄服务已暴露 `buildStore`、`listDocuments`、`getDocument`、`updateDocument` 与 `setActiveDocument`。
- Round 20 当前已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:desktop-backend` / `check:backend-services` / `check:model`。下一步进入 Round 21：baseRevision 与 stale guard。

### 2026-06-16 SelfHostedEditor P1 Round 21 stale update guard 快照

P1 Round 21 已完成 `updateDocument()` baseRevision / stale guard，仍未接真实 debounce、authoring endpoint、workspace snapshot builder 或文件 IO。

- `EditorBackendDocumentBufferStoreModel.updateDocument()` 接受 `baseRevision`。
- 当 `baseRevision` 与当前 document revision 不一致时，返回 `stale-document-revision`。
- stale rejection 返回 `baseRevision`、`currentRevision` 与 text-free document summary，不回显被拒绝的新文本，也不暴露当前 document text。
- 正常 update 继续推进 document / store revision，保持 revision 只增不倒退。
- `check:desktop-backend` 与 `check:backend-services` 均覆盖正常 baseRevision update 与 stale update rejected。
- Round 21 当前已通过：SelfHostedEditor `check:syntax` / `check:desktop-backend` / `check:backend-services` / `check:model`。下一步进入 Round 22：workspace snapshot builder。

### 2026-06-16 SelfHostedEditor P1 Round 22 workspace snapshot builder 快照

P1 Round 22 已完成 workspace snapshot builder，仍未把 authoring endpoint、Preview 或 Runtime 改为消费 backend buffer。

- 新增 `EditorBackendWorkspaceSnapshotModel`，定义 `inscape.self-hosted-editor.workspace-snapshot` shape。
- snapshot 从 `EditorBackendDocumentBufferStoreModel` 构建，包含 session id、workspace name、active path、store revision、active document revision、document count 与 documents。
- snapshot documents 携带 `relativePath`、text、revision、dirty、existsOnDisk、lastLoadedUtc 与 active flag，是明确的 backend request payload。
- snapshot 标记 `payloadContentExposed: true`，区别于 text-free status / list summary。
- 新增 `buildActiveDocumentRequest()`，从 snapshot 导出 active document text、active relative path、document revision 与 workspace。
- `DocumentBufferStore` 窄服务已暴露 `buildWorkspaceSnapshot()` 与 `buildActiveDocumentRequest()`。
- Round 22 当前已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:desktop-backend` / `check:backend-services` / `check:model`。下一步进入 Round 23：authoring endpoint 接入 buffer。

### 2026-06-16 SelfHostedEditor P1 Round 23 authoring endpoint buffer 接入快照

P1 Round 23 已完成 LanguageServer-backed authoring bridge 的 backend snapshot 接入，仍未默认启用 P1.5 long-lived LanguageServer，也未改变 dev-host `/api/*` route 或 shared response shape。

- 新增 `LanguageServerAuthoringRequestModel`，统一把 content-bearing workspace snapshot 投影为 authoring request。
- diagnostics / completions / definition / references / hover / documentSymbols 六个 bridge 新增 `workspaceSnapshotProvider`。
- snapshot 存在时，六个 bridge 使用 snapshot active document 的 `scriptText`、`activeRelativePath`、`documentRevision` 与 workspace；旧 `workspaceContextProvider` 仅 fallback。
- `SelfHostedEditorFeatureBootstrapper` 通过 `DocumentBufferStore` 从当前 workspace context 构建 backend workspace snapshot，并注入六个 authoring bridge。
- `check:backend-services` 覆盖六个 authoring bridge 的 snapshot 优先级，并断言旧 workspace context 文本不会在 snapshot 存在时进入 payload。
- Round 23 当前已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:backend-services` / `check:model` / `check:semantic-parity-http`。下一步进入 Round 24：Preview / Runtime 接入 buffer。

### 2026-06-16 SelfHostedEditor P1 Round 24 Preview / Runtime buffer 接入快照

P1 Round 24 已完成 Preview 依赖的 StoryGraph bridge 与 Runtime bridge 的 backend snapshot 接入，仍未改变 dev-host `/api/*` route、Compiler / Runtime shared payload shape，也未把 Preview 或 Runtime 语义复制进 EditorBackend。

- 新增 `EditorBackendWorkspaceRequestModel`，把 backend snapshot active document 投影为 shared request 的 `scriptText`、`workspace`、`activeRelativePath` 与 `documentRevision`；`LanguageServerAuthoringRequestModel` 也复用该投影。
- `SelfHostedEditorStoryGraphBridge` 与 `SelfHostedEditorRuntimeBridge` 新增 `workspaceSnapshotProvider`；有 snapshot 时优先使用 backend buffer active document，旧 workspace context 仅 fallback。
- Runtime start / step 继续保留 `sessionId`、`action` 与 `runtimeState` fallback；Preview choice click invariant 没有改动。
- `check:backend-services` 覆盖 StoryGraph / Runtime 的 snapshot 优先级，并断言旧 workspace context 文本不会在 snapshot 存在时进入 payload。
- Round 24 当前已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:backend-services` / `check:runtime` / `check:runtime-http` / `check:model` / `check:semantic-parity-http`。下一步进入 Round 25：Save command skeleton。

### 2026-06-16 SelfHostedEditor P1 Round 25 Save command skeleton 快照

P1 Round 25 已完成手动 Save 命令契约的第一刀：Save 入口走 backend buffer-store / transport / preload 白名单，不暴露通用文件写 API；本轮仍不声称真实 Electron 文件 IO、autosave debounce、flush 或 recovery 已完成。

- `EditorBackendDocumentBufferStoreModel.saveDocument()` / `saveAll()` 返回 text-free save result，覆盖 saved / error status、`savedRevision`、baseRevision stale guard、workspace boundary 与 write target。
- `DocumentBufferStore` 窄服务新增 async `saveDocument` / `saveAll` command 入口，以及纯模型 `saveDocumentToStore` / `saveAllToStore` helper。
- `EditorBackendClient.documentBuffer.*`、`EditorBackendTransportCommand`、preload command whitelist、preload transport 与 `SelfHostedEditorFakeEmbeddedTransport` 已接入 `document-buffer.save` / `document-buffer.save-all`。
- 契约检查覆盖 Save 成功、stale revision、非白名单写回拒绝、Save All、payload 白名单和结果不泄露 buffer text。
- Round 25 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 26：dirty state / saved revision。

### 2026-06-16 SelfHostedEditor P1 Round 26 dirty state / saved revision 快照

P1 Round 26 已把 DocumentBuffer clean baseline 显式化：edit 推进 dirty + revision 时保留 `lastSavedRevision`，save 成功后刷新 baseline；磁盘 hash 偏离会进入可见 `disk-conflict` error。本轮仍未实现真实 Electron 文件 IO、autosave debounce、flush 或 recovery。

- `EditorBackendDocumentBufferModel` 新增 `lastSavedRevision`；clean buffer 默认以当前 revision 作为 saved baseline，dirty buffer 保留既有 baseline。
- `EditorBackendDocumentBufferStoreModel.updateDocument()` 保留 saved baseline；`saveDocument()` / `saveAll()` 成功后把 summary 标 clean，并把 `lastSavedRevision` 更新到 saved revision。
- `saveDocument()` 支持 `observedDiskTextHash` / `currentDiskTextHash` 与 buffer `diskTextHash` 对比；不一致时返回 text-free `disk-conflict`、`error` save status 和 hash 摘要。
- Round 26 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 27：backend autosave debounce。

### 2026-06-16 SelfHostedEditor P1 Round 27 backend autosave debounce 快照

P1 Round 27 已建立 backend autosave idle-debounce 的计划模型。它只生成 text-free autosave save request，不启动真实 timer、不写盘，也不实现 flush / recovery。

- `EditorBackendDocumentBufferStoreModel.buildAutosavePlan()` 返回 `inscape.self-hosted-editor.document-buffer-autosave-plan`。
- plan 读取 `autosaveEnabled`、`debounceMs`、`idleElapsedMs` 与 `pendingWrites`；autosave 开启且 idle 超过 debounce 后才为 dirty `.inscape` 生成 save request。
- save request 使用当前最新 `baseRevision` / `documentRevision`；旧 pending write 低于当前 revision 时进入 `stale-autosave-revision` skippedWrites。
- autosave disabled / debounce waiting 都有显式 skipped reason；plan / store summary 不暴露 buffer text。
- Round 27 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 28：flush rules。

### 2026-06-16 SelfHostedEditor P1 Round 28 flush rules 快照

P1 Round 28 已建立 flush lifecycle 守门 contract。它只生成 text-free flush plan，不执行真实文件 IO，也不实现 recovery snapshot。

- `EditorBackendDocumentBufferStoreModel.buildFlushPlan()` 返回 `inscape.self-hosted-editor.document-buffer-flush-plan`。
- plan 覆盖 `manual-save`、`close-window`、`switch-workspace`、`app-exit` 四类 trigger；dirty document 会生成使用当前最新 `baseRevision` / `documentRevision` 的 flush request。
- flush request 继续走 workspace file boundary / write target catalog；非白名单目标进入 `blockingIssues`，UI state 为 `flush-blocked-visible`。
- save failure 可通过 `saveResults` 进入 `visibleFailures`，UI state 为 `save-error-visible` 且 `requiresUserAction`，从 contract 层阻止静默关闭 / 切换 / 退出。
- plan / failure summary 不暴露 buffer text，也不回显 arbitrary error payload。
- Round 28 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 29：recovery snapshot。

### 2026-06-16 SelfHostedEditor P1 Round 29 recovery snapshot 快照

P1 Round 29 已建立 recovery snapshot write payload 与 cleanup request contract。本轮只生成 backend 持久化载荷，不执行真实文件 IO，也不实现下次打开 workspace 的扫描 / 恢复 UI。

- `EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan()` 返回 `inscape.self-hosted-editor.document-buffer-recovery-snapshot-plan`。
- dirty buffer 会生成 `inscape.self-hosted-editor.document-buffer-recovery-snapshot` write payload，包含 relative path、revision、disk mtime、snapshot mtime、content hash 和文本；`payloadContentExposed` 明确为 true。
- snapshot path 形如 `.inscape-workspace/recovery/story/opening.inscape.snapshot.json`，继续通过 workspace file boundary / write target catalog 判定为 `recovery-snapshot`。
- `recoveryStatus` 和 cleanup request 仍是 text-free；save success / `savedRelativePaths` 生成 `saved-document-recovery-cleanup` request。
- Round 29 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 30：recovery UI。

### 2026-06-16 SelfHostedEditor P1 Round 30 recovery UI 快照

P1 Round 30 已建立 recovery UI/status/action contract。本轮只把 ProjectSession recovery summary 投影到 session panel，不扫描磁盘、不删除 snapshot、不执行恢复写回。

- `ProjectWorkspaceSessionStatusModelBuilder` 新增 `recoveryLabel`、`recoveryFileLabel`、`recoveryItemCount` 和 text-free `recoveryItems`。
- session panel 渲染 Recovery / Recoverable，显示可恢复文件名。
- `buildRecoveryActionRequest()` 返回 `inscape.self-hosted-editor.workspace-recovery-action-request`，覆盖 restore / discard / later。
- restore 标记 `requiresWriteBack`，discard 标记 `suppressFuturePrompt`，later 标记 `keepsSnapshot`。
- Workbench integration contract 覆盖 dev-host / embedded recovery status、panel display、action request 和 no-text projection。
- Round 30 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 31：`.inscape-workspace/` 策略。

### 2026-06-16 SelfHostedEditor P1 Round 31 `.inscape-workspace/` 策略快照

P1 Round 31 已建立 workspace 内部目录策略 contract。本轮只生成 discovery / creation / gitignore plan，不执行真实 mkdir，也不写 `.gitignore`。

- `EditorBackendWorkspaceFolderModel.buildInternalWorkspacePlan()` 返回 `inscape.self-hosted-editor.workspace-internal-directory-plan`。
- plan 固定列出 `.inscape-workspace/recovery`、`.inscape-workspace/backups`、`.inscape-workspace/cache`。
- 三类目录都标记为 non-project-truth、默认 git ignored；cache 额外标记 `recreatable: true`。
- existing relative paths 可让已存在目录不再 `createRequired`；缺失目录会计划创建。
- `.gitignore` plan 默认建议追加 `.inscape-workspace/`；已有该条目时 action 为 `none`。
- Round 31 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 32：write-back backup。

### 2026-06-17 SelfHostedEditor P1 Round 32 write-back backup 快照

P1 Round 32 已建立 CSV / node-map / line-map 写回前 backup plan contract。本轮只生成 text-free backup / cleanup plan，不执行真实文件复制或删除。

- 新增 `EditorBackendWorkspaceBackupPlanModel.buildPlan()`，返回 `inscape.self-hosted-editor.workspace-backup-plan`。
- backup source 只覆盖 localization CSV、`inscape.node-map.json`、`inscape.line-map.json`；`.inscape` 正文继续由 autosave / recovery 保护。
- backup path 形如 `.inscape-workspace/backups/localization/zh-cn.csv.<timestamp>.bak`，继续由 workspace file boundary / write target catalog 判定为 `backup-artifact`。
- backup 默认启用；禁用时进入 `backup-disabled` skippedWrites。
- retention policy 为 `count-and-age`，支持 retention limit / days，并可从 existing backups 生成 text-free cleanup candidates。
- `DocumentBufferStore` 窄服务新增 `buildBackupPlan()` helper。
- Round 32 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 33：assets import policy。

### 2026-06-17 SelfHostedEditor P1 Round 33 assets import policy 快照

P1 Round 33 已建立外部资源导入 plan contract。本轮只生成 text-free asset copy plan，不执行真实文件复制、不接文件选择器、不写项目文件。

- 新增 `EditorBackendWorkspaceAssetImportPlanModel.buildPlan()`，返回 `inscape.self-hosted-editor.workspace-asset-import-plan`。
- 图片、音频、CSV 默认复制到 `assets/images/`、`assets/audio/`、`assets/data/`；未知扩展进入 `asset-extension-not-supported` skip。
- plan 输出不持久化 workspace 外绝对路径，只保留 source name / source reference id，并标记 `externalPathPersisted: false`。
- 目标路径继续走 workspace file boundary / write target catalog；`assets/**` 写目标优先于扩展名规则，确保 `assets/data/*.csv` 是 `asset-copy` 而不是 localization CSV。
- `DocumentBufferStore` 窄服务新增 `buildAssetImportPlan()` helper。
- Round 33 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 34：settings 分层。

### 2026-06-17 SelfHostedEditor P1 Round 34 settings 分层快照

P1 Round 34 已建立 settings schema contract。本轮只定义 schema / defaults / summary 归一化，不实现设置页、不写真实配置文件、不接 settings persistence。

- 新增 `EditorBackendSettingsSchemaModel.buildSchema()`，返回 `inscape.self-hosted-editor.settings-schema`。
- settings defaults 集中在 `EditorBackendSettingsDefaults`；`EditorBackendDesktopSessionModel.buildSettingsSummary()` 改为复用同一份默认值和归一化逻辑。
- global scope 标记为 `user-preference`，覆盖 autosave、backup retention days / limit、default asset directory、theme。
- workspace scope 标记为 `project-behavior`，覆盖 backup enabled、entry title、export profile、Git checkpoint policy、resource directory、resource import policy。
- `reference-external` 可被显式表达，但 P1 schema 的 supported values 仍只有 `copy-into-workspace`；资源目录继续限制到 workspace `assets/**`。
- `DocumentBufferStore` 窄服务新增 `buildSettingsSchema()` helper。
- Round 34 当前已通过：SelfHostedEditor `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 35：v0 最小闭环 smoke。

### 2026-06-17 SelfHostedEditor P1 Round 35 v0 最小闭环 smoke 快照

P1 Round 35 已新增 desktop v0 contract smoke。本轮只组合已完成 backend contracts，不启动 Electron、不做真实文件 IO、不生成 Windows package。

- 新增 `DevScripts/SelfHostedEditorDesktopV0Smoke.js` 与 npm script `smoke:desktop`。
- smoke 覆盖 directory workspace open、`.inscape` 文件列表、非脚本文件拒绝、DocumentBuffer edit、autosave ready、manual Save、recovery snapshot plan。
- smoke 覆盖 ProjectSession text-free status 与 content-bearing backend workspace snapshot 的边界。
- smoke 驱动 diagnostics / completion bridges，验证请求优先使用 backend snapshot 而不是 legacy workspace context。
- smoke 驱动 Runtime bridge `choose` action，覆盖 Preview choice click 的 backend payload。
- `check:structure` 已守住 `smoke:desktop` script 与文件存在性。
- Round 35 当前已通过：SelfHostedEditor `smoke:desktop` / `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步进入 Round 36：Windows internal package v0 / 等价本机启动 smoke。

### 2026-06-17 SelfHostedEditor P1 Round 36 startup smoke 快照

P1 Round 36 已完成等价本机启动 smoke。本轮没有生成 Windows installer，也没有新增 Electron runtime / builder 依赖。

- 新增 `DevScripts/SelfHostedEditorDesktopStartupSmoke.js` 与 npm script `smoke:desktop-startup`。
- startup smoke 验证 package / lockfile、Electron app entry、Workbench entry、Electron autostart guard、preload whitelist API。
- startup smoke 记录当前 readiness：`electronRuntimeAvailable: false`、`windowsPackageGenerated: false`，known limitations 包含 `electron-runtime-not-installed` 与 `windows-package-not-generated`。
- startup smoke 复用 `smoke:desktop`，证明本机 contract 闭环仍可运行。
- `check:structure` 已守住 `smoke:desktop-startup` script 与文件存在性。
- Round 36 当前已通过：SelfHostedEditor `smoke:desktop-startup` / `smoke:desktop` / `check:desktop-backend` / `check:workspace-fs` / `check:backend-services` / `check:backend-transport` / `check:preload-transport` / `check:fake-embedded-transport` / `check:electron-boundary` / `check:runtime` / `check:runtime-http` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。后续若继续产品化，应进入真实 Electron runtime / Windows package / GUI smoke，而不是再扩 contract。

### 2026-06-17 SelfHostedEditor P1 Round 37 Electron runtime smoke 快照

P1 Round 37 已补真实 Electron runtime 与启动入口 smoke。本轮仍不生成 Windows installer，不打开 GUI，不接真实 IPC / workspace 文件 IO。

- `SelfHostedEditor` package 新增 Electron dev dependency，并新增 `start:desktop` 指向 `Desktop/ElectronMain.js`。
- 新增 `DevScripts/SelfHostedEditorDesktopRuntimeSmoke.js` 与 npm script `smoke:desktop-runtime`：先运行 Electron CLI `--version`，再启动受保护 runtime probe。
- 新增 `DevScripts/SelfHostedEditorElectronRuntimeProbe.js`：在真实 Electron main process 中以 `SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART=false` 加载 `Desktop/ElectronMain.js`，验证 BrowserWindow 安全默认、preload 路径和 navigation guard 后退出；不创建窗口、不读写 workspace。
- `smoke:desktop-startup` 现在串起 runtime smoke 与 `smoke:desktop`；readiness 为 `electronRuntimeAvailable: true`、`desktopRuntimeSmoke: true`、`windowsPackageGenerated: false`，known limitations 只保留 `windows-package-not-generated`。
- `check:structure` 已守住 `smoke:desktop-runtime`、runtime probe 与 `start:desktop` 入口。
- 依赖安全观察：`npm audit` 当前报告 `monaco-editor` 依赖链中的 `dompurify` advisory；npm 的自动修复会降到 `monaco-editor@0.53.0` 且为 breaking change，本轮未混入强制降级。
- Round 37 当前已通过：SelfHostedEditor `smoke:desktop-runtime` / `smoke:desktop-startup` / `smoke:desktop` / `check:electron-shell` / `check:electron-boundary` / `check:preload-transport` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。后续应补 Windows package script / package smoke 或真实 workspace IO，不要进入 P1.5。

### 2026-06-17 SelfHostedEditor P1 Round 38 package config 快照

P1 Round 38 已补 Windows package script 与 electron-builder config contract。本轮没有运行真实 packaging，也没有提交构建产物。

- `SelfHostedEditor` package 新增 `main: "Desktop/ElectronMain.js"`、electron-builder dev dependency、`package:windows` 和 build config。
- build config 使用 `appId: dev.inscape.self-hosted-editor`、`productName: Inscape SelfHostedEditor`、`asar: true`、`dist` 输出目录，以及 Windows `dir` x64 target。
- package files 白名单只包含 `Desktop/`、`Resources/`、`Scripts/`、`package.json` 与 `node_modules/monaco-editor/**/*`；`DevScripts/` 不作为产品文件打包。
- 新增 `DevScripts/SelfHostedEditorDesktopPackageContractCheck.js` 与 npm script `check:desktop-package`，验证 package entry、electron-builder 依赖、lockfile range、files 白名单、Windows target 与 artifact readiness。
- `smoke:desktop-startup` 现在串起 package contract、runtime smoke 与 `smoke:desktop`；readiness 记录 `windowsPackageScriptAvailable: true`，但 artifact 未生成时仍保留 `windows-package-not-generated`。
- Round 38 当前已通过：SelfHostedEditor `check:desktop-package` / `smoke:desktop-runtime` / `smoke:desktop-startup` / `smoke:desktop` / `check:electron-shell` / `check:electron-boundary` / `check:preload-transport` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步应运行真实 `package:windows` 并补 artifact smoke，或推进真实 workspace IO。

### 2026-06-17 SelfHostedEditor P1 Round 39 package artifact smoke 快照

P1 Round 39 已运行真实 Windows unpacked package build，并补 package artifact smoke。本轮仍没有做 GUI 打开 workspace / 编辑保存 / recovery 提示 smoke。

- `npm --prefix src\ExternalSupport\SelfHostedEditor run package:windows` 已成功生成 `dist\win-unpacked\Inscape SelfHostedEditor.exe` 与 `resources\app.asar`。
- 新增 `DevScripts/SelfHostedEditorDesktopPackageSmoke.js` 与 npm script `smoke:desktop-package`。
- package smoke 复用 package readiness，要求 artifact 已生成，并验证 exe、`app.asar`、`builder-debug.yml` 与 package files 白名单痕迹。
- `check:structure` 现在忽略 `dist/` 构建输出，避免把 Chromium license 等打包产物当源码编码扫描。
- package 输出约 425MB，保持为 ignored local output，不提交。
- Round 39 当前已通过：SelfHostedEditor `package:windows` / `smoke:desktop-package` / `check:desktop-package` / `smoke:desktop-runtime` / `smoke:desktop-startup` / `smoke:desktop` / `check:electron-shell` / `check:electron-boundary` / `check:preload-transport` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。下一步应补真实 GUI/workspace/save/recovery smoke 或推进真实 workspace IO。

### 2026-06-17 SelfHostedEditor P1 Round 40 packaged app protocol 快照

P1 Round 40 已补 packaged Electron app 的资源加载 guard。Workbench 绝对 `/Resources`、`/Scripts`、`/node_modules`、`/samples` 路径不再依赖 `file://` 根目录。

- `ElectronMain` 新增 `inscape-self-hosted-editor://app/` app protocol、workbench URL builder、协议注册与路径解析函数。
- BrowserWindow 改为 `loadURL(buildSelfHostedEditorWorkbenchUrl())`；navigation 只允许同一 app protocol host，不再允许任意 `file:` navigation。
- 协议解析只允许 `Resources/`、`Scripts/`、`node_modules/monaco-editor/` 与 `samples/`；`DevScripts/`、traversal 与非 app host 被拒绝。
- package build config 新增 `extraResources`，把 repo `samples/` 复制到 packaged resources；并固定 `electronDist: node_modules/electron/dist`，让 package build 复用本地 Electron runtime。package contract 和 artifact smoke 都验证该配置/产物。
- runtime probe 覆盖 workbench URL、style/script/sample path、DevScripts 拒绝和 traversal 拒绝；Electron shell contract 守住 app protocol 与 `loadURL`，防止回退 `loadFile`。
- Round 40 当前已通过：SelfHostedEditor `package:windows` / `smoke:desktop-package` / `check:desktop-package` / `smoke:desktop-runtime` / `smoke:desktop-startup` / `smoke:desktop` / `check:electron-shell` / `check:electron-boundary` / `check:preload-transport` / `check:syntax` / `check:structure` / `check:model` / `check:semantic-parity-http`，VSCode `check:semantic-parity` / `check:structure`，`node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`，`git diff --check`，`.NET build` 与 Internal tests。后续仍需要真实 GUI 打开 workspace / 编辑保存 / recovery 提示 smoke；不要仅凭 artifact smoke 宣布交互闭环完成。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron IPC 快照

P1 40 轮计划完成后，继续补上了真实 Electron preload -> main 的固定 command channel 第一刀。本轮仍不做 workspace 文件 IO，不打开 GUI，也不进入 P1.5 long-lived LanguageServer。

- 新增 `Desktop/ElectronIpcContract.js`，固定 IPC channel 为 `inscape.self-hosted-editor.backend.invoke`，preload 不暴露 generic invoke / send / request。
- 新增 `Desktop/ElectronBackendCommandDispatcher.js` 与 `Desktop/ElectronBackendIpc.js`。main process 只在固定 channel 上接收白名单 editor command，并复用既有 preload payload validator；未知 command 会显式拒绝，已接入 store 但缺少实际 handler 的路径会显式失败。
- `project-session.status` 是当前唯一 main-process handler，会返回 `embedded-desktop` ProjectSession 摘要；status transport 仍不上传 workspace text，真实 workspace 状态要等 main 持有 ProjectSession / DocumentBufferStore 后再填充。
- 新增 `check:electron-ipc`，并更新 `check:electron-shell` / `check:electron-boundary` / runtime probe：现在允许 preload 内部使用固定 `ipcRenderer.invoke`，仍禁止 renderer 直接 IPC、Node/fs/shell、preload generic/system API 和 dev-host `/api/*` 泄漏到 Electron main/preload。
- 本轮当前已通过：SelfHostedEditor `check:electron-ipc` / `check:electron-shell` / `check:electron-boundary` / `check:preload-transport` / `check:syntax` / `check:structure` / `check:model` / `smoke:desktop-runtime`。后续优先推进真实 Electron workspace open / file IO，再做 GUI edit-save-recovery smoke。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron workspace open/read 快照

固定 IPC channel 之后，本轮把 Electron main process 推进到真实 workspace open / read buffer 的局部闭环；当轮仍不做真实保存写盘、autosave flush、recovery restore/discard/later 或 P1.5 long-lived LanguageServer。

- 新增 `Desktop/ElectronWorkspaceSessionStore.js`。main process 持有单窗口 workspace session，open folder 只接受目录，递归扫描真实 `.inscape` 文件，忽略 `.inscape-workspace/`、`node_modules`、`dist` 等非项目 truth 目录，并把磁盘正文读入 `DocumentBufferStore`。
- `EditorBackendTransportCommand` / preload transport / `EditorBackendClient` / `EditorBackendServiceRegistry` 新增 `workspace.open-folder` 与 `workspace.list-files` 的窄接口；这些 command 没有 dev-host `/api/*` route，HTTP transport 误用会显式失败。
- Electron dispatcher 现在接线 `workspace.open-folder`、`workspace.list-files`、`document-buffer.list`、`document-buffer.read`、`document-buffer.update-draft` 与 `project-session.status`。open/list/status/update 响应保持 text-free；只有显式 `document-buffer.read` 返回请求文档正文。
- 新增 `check:electron-workspace`，创建临时真实 workspace 验证目录打开、`.inscape` 列表、非脚本过滤、internal workspace 忽略、read buffer、路径穿越拒绝、单文件模式拒绝和 dirty status 摘要。`check:electron-shell` / `check:electron-boundary` / `check:backend-transport` / `check:backend-services` / `check:preload-transport` / `check:structure` 已同步该边界。
- 该段的下一步（`document-buffer.save` / `save-all` 真实磁盘写回、disk conflict / stale revision）已由后续 save/write-back 快照完成；close/switch/app-exit flush 与 GUI edit-save-recovery smoke 仍待后续。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron save/write-back 快照

在真实 workspace open/read 后，本轮继续把 `document-buffer.save` / `save-all` 接到 Electron main process 的真实磁盘写回；仍不做 idle autosave timer、close/switch/app-exit flush、recovery snapshot 写入 / 扫描 / 恢复 UI 或 P1.5 long-lived LanguageServer。

- `ElectronWorkspaceSessionStore` 现在处理 `document-buffer.save` 与 `document-buffer.save-all`：保存前复用 workspace path guard / write target whitelist / `baseRevision` guard，读取当前磁盘 hash，写入当前 backend buffer 文本，并刷新 `diskTextHash`、`lastSavedRevision` 与 dirty summary。
- save/save-all 响应保持 text-free；只有 main process 内部 buffer 和磁盘写入包含正文。`document-buffer.read` 仍是唯一显式正文读取响应。
- 新增 `check:electron-workspace` 断言：手动 save 写回真实临时 workspace 文件、save-all 写回剩余 dirty 文件、stale save 被拒绝、disk conflict 不覆盖外部磁盘变更、所有 save/status 响应不泄露 draft text。
- `SelfHostedEditorPreloadCapabilities.workspaceFileSystem` 从 `read-buffer-session` 提升为 `read-write-buffer-session`，但这只表示 open/read/write buffer 局部闭环；recovery snapshot IO 已由下一段补上，idle autosave、close/switch/app-exit flush、recovery actions 和 GUI smoke 仍未完成。
- 下一步应接 autosave idle debounce 到真实 save、manual save/close/switch/app-exit flush 规则，以及 restore / discard / later UI smoke。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron recovery snapshot IO 快照

在真实 workspace open/read/write 后，本轮把 recovery snapshot 的最小真实 IO 闭环接入 Electron main process；仍不做 idle autosave timer、close/switch/app-exit flush、restore / discard / later 操作 UI、GUI smoke 或 P1.5 long-lived LanguageServer。

- `ElectronWorkspaceSessionStore.updateDraft()` 成功更新 dirty buffer 后，会通过既有 `EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan()` 生成 snapshot，并写入 `.inscape-workspace/recovery/<relative>.snapshot.json`；snapshot 文件包含可恢复正文，但 update/status 响应保持 text-free。
- open workspace 时会扫描 `.inscape-workspace/recovery/**/*.snapshot.json` 并投影为 ProjectSession `recoveryStatus`；扫描会跳过越界或路径不匹配的 snapshot，避免把篡改过的 relative path 放入 UI 状态。
- manual `document-buffer.save` / `save-all` 成功后会删除对应 recovery snapshot，并刷新 ProjectSession `recoveryStatus`。
- `check:electron-workspace` 现在覆盖：dirty edit 写入真实 recovery snapshot、snapshot 文件包含 draft text、ProjectSession recovery status 不泄露正文、保存后 cleanup、disk conflict 后 snapshot 保留、重开 workspace 可扫描 recovery，以及篡改 snapshot path 被跳过。
- 下一步应把 idle autosave timer 和 close/switch/app-exit flush 接到真实 save 路径，再补 restore / discard / later 操作与 GUI edit-save-recovery smoke。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron autosave/flush 执行快照

在 recovery snapshot IO 之后，本轮把既有 autosave / flush plan 接到 Electron main process session store 的真实 save 路径；仍不新增 renderer command，不挂真实 idle timer / window close / app exit lifecycle，也不做 restore / discard / later 或 GUI smoke。

- `ElectronWorkspaceSessionStore.runAutosave()` 复用 `EditorBackendDocumentBufferStoreModel.buildAutosavePlan()`；debounce 未满足时返回 text-free no-op，ready 时只保存最新 dirty revision，并通过既有 `saveDocument()` 写盘与清理 recovery snapshot。
- `ElectronWorkspaceSessionStore.flushDirtyDocuments()` 复用 `buildFlushPlan()`；可接收 `manual-save`、`close-window`、`switch-workspace`、`app-exit` trigger，按 flush request 走真实 save 路径，再返回初始 plan、final plan、save results 与 text-free summary。
- `check:electron-workspace` 现在覆盖 waiting autosave 不写盘且保留 snapshot、ready autosave 写盘并清理 snapshot、`app-exit` flush 写盘并清理 snapshot、autosave / flush 响应不泄露正文。
- 下一步应把这些 helper 挂到真实 idle timer、Electron close/switch/app-exit lifecycle，再补 recovery restore / discard / later 和 GUI edit-save-recovery smoke。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron lifecycle autosave/flush 快照

在 autosave / flush execution helper 之后，本轮把 helper 挂到真实 Electron main-process lifecycle；renderer API 和 preload whitelist 不扩大，仍不做 recovery restore / discard / later 操作和 GUI smoke。

- 新增 `ElectronWorkspaceLifecycle`，持有与 IPC 共享的 `ElectronWorkspaceSessionStore`；Electron main 启动 idle autosave timer，并把 BrowserWindow close 与 app `before-quit` 接到 lifecycle flush。
- `ElectronWorkspaceSessionStore` 现在记录 dirty draft 的 main-process idle timestamp；`runAutosave()` 未显式传 `idleElapsedMs` 时会按该时间计算 debounce，ready 后走真实 `saveDocument()` 写盘并清理 recovery snapshot。
- 再次 `openFolder()` 会先以 `switch-workspace` trigger flush 当前 dirty workspace；flush blocked 时不会切换 workspace。
- 新增 `check:electron-lifecycle`，覆盖 timer 注册、waiting / ready autosave、close-window flush、switch-workspace flush、app-exit flush、timer cleanup 和 text-free lifecycle status；`check:model` 与 `check:structure` 已纳入该检查。
- 下一步应补 recovery restore / discard / later 的真实 IO 与 UI 操作，并做 GUI edit-save-recovery smoke。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron recovery actions IO 快照

在 lifecycle autosave/flush 之后，本轮把 recovery restore / discard / later 从 action request contract 接到 Electron main process 真实 IO；仍不做 GUI edit-save-recovery smoke，也不扩大 renderer 的通用 IPC/Node 能力。

- 新增 desktop-only transport commands：`recovery.restore`、`recovery.discard`、`recovery.later`。它们进入 preload whitelist / `EditorBackendClient.recovery.*` / Electron dispatcher，但不映射 dev-host `/api/*` route。
- `ElectronWorkspaceSessionStore.restoreRecoverySnapshot()` 会读取并校验 `.inscape-workspace/recovery/<relative>.snapshot.json` 的 relative path / content hash / text payload，把 snapshot 正文写回 `.inscape` 文件，刷新 buffer summary，并删除 snapshot。
- `discardRecoverySnapshot()` 删除 snapshot 并刷新 text-free recovery status；`markRecoverySnapshotLater()` 只在当前 session status 标为 `later`，保留 snapshot 供后续提示。
- `check:electron-workspace` 现在覆盖 restore 写盘且响应不泄露 snapshot text、restore 后 cleanup、later 保留 snapshot、discard 删除 snapshot、recovery action response text-free。`check:backend-transport` / `check:preload-transport` / `check:electron-shell` 同步覆盖新 command 面。
- 后续已完成真实 GUI edit-save-recovery smoke、diagnostics / completions 使用恢复后当前 buffer 的验证，以及真实 GUI / packaged Preview 渲染、choice click 与 source reveal 断言；下一步应转向 P1.5 workspace-scoped long-lived LanguageServer 或其余 language action 的同源状态验证。

### 2026-06-17 SelfHostedEditor P1 post-40 Electron GUI recovery smoke 快照

本轮新增 `smoke:desktop-gui-recovery`，用真实 Electron BrowserWindow 加载 Workbench/app protocol/preload，并通过 renderer 可见的 `window.inscapeSelfHostedEditor` 窄 API 走 preload -> IPC -> main 的产品路径；后续已把 diagnostics / completions current-buffer GUI 验证补入同一 smoke。

- 真实 GUI smoke 覆盖：open folder、显式 read、dirty edit、manual save 写盘、idle autosave 写盘、recovery snapshot 发现、restore 写回磁盘、diagnostics / completions 从 restore 后当前 buffer 构建请求、Preview 默认样例渲染、Preview choice click 推进到目标 block 并 reveal editor source line、later 保留 snapshot、discard 删除 snapshot，且 open/save/recovery/language action 响应不泄露正文。
- 该轮同时发现并修复真实 preload 启动问题：sandboxed Electron preload 不能直接加载 ESM `ElectronPreload.js`，实际 BrowserWindow 改为加载 `ElectronPreload.cjs`；`ElectronPreloadApi.js` 继续作为 ESM contract/API 定义，contracts 同步覆盖 CJS preload path。
- 当前 Electron dispatcher 已将六个 language-session command 接到 main-process `ElectronWorkspaceSessionStore` 的当前 `DocumentBufferStore` snapshot；本轮 GUI smoke 只实证 diagnostics / completions。下一步若继续 P1.5，应推进 workspace-scoped long-lived LanguageServer，并补 definition / references / hover / documentSymbols 的同源状态验证。

### 2026-06-17 SelfHostedEditor P1 post-40 Windows packaged GUI smoke 快照

本轮新增 `smoke:desktop-package-gui`，在 `package:windows` 生成 `dist/win-unpacked/Inscape SelfHostedEditor.exe` 后，直接运行 packaged exe，而不是 Electron dev binary 或 artifact-only smoke。

- packaged app 通过 `SELF_HOSTED_EDITOR_ELECTRON_PACKAGED_GUI_SMOKE=true` 进入受保护 smoke path；正常启动不会触发。smoke path 仍加载 packaged Workbench / app protocol / sandbox preload，通过 renderer preload API 打开临时 workspace、read、edit、manual Save 写盘、recovery restore 写盘，并验证 diagnostics / completions 使用 restore 后当前 buffer；同一 smoke 也验证 packaged Preview 渲染默认样例、choice click 推进到 `证物桌`，以及 editor active source line reveal。
- `Desktop/ElectronPackagedGuiSmoke.js` 只在 explicit env guard 下运行；它不认识 `/api/*` 或 localhost，也不向 renderer 暴露 Node/fs/shell。结果通过临时 JSON result file 回传给 `DevScripts/SelfHostedEditorDesktopPackageGuiSmoke.js`。
- 本轮当前已通过：`package:windows`、`smoke:desktop-package-gui`、`smoke:desktop-package`、`check:desktop-package`、`smoke:desktop-gui-recovery`、Electron shell / boundary / IPC / workspace / lifecycle contracts、SelfHostedEditor syntax / structure / model、VSCode parity / structure、`.NET build` 与 Internal tests。下一步仍不应默认进入 P1.5，除非明确开始 workspace-scoped long-lived LanguageServer 里程碑。

### 2026-06-17 SelfHostedEditor P1 post-40 write-back backup IO 快照

本轮新增 desktop-only `workspace.write-back-backup` command，把 Round 32 的 backup plan 推进到 Electron main process 真实 IO。

- `EditorBackendTransportCommand.WorkspaceWriteBackBackup`、preload whitelist、`EditorBackendClient.workspace.writeBackBackup()`、`WorkspaceSessionClient.writeBackBackup()` 和 Electron dispatcher 已对齐；该 command 不映射 dev-host `/api/*` route。
- `ElectronWorkspaceSessionStore.runWriteBackBackup()` 会扫描 `.inscape-workspace/backups/`，复用 `EditorBackendWorkspaceBackupPlanModel` 为 localization CSV、`inscape.node-map.json`、`inscape.line-map.json` 生成 text-free backup plan，复制源文件到 `.inscape-workspace/backups/`，并删除 retention cleanup candidates。
- `check:electron-workspace` 覆盖三类真实复制、旧 backup 清理、disabled backup skip、unsupported `.inscape` skip、desktop-only route 和 text-free response；`check:backend-services`、`check:backend-transport`、`check:preload-transport`、`check:electron-shell`、fake embedded transport 也已同步。
- 真实 GUI / packaged Preview 断言已在后续 P1 post-40 Preview smoke 中完成；不要把它误写成 P1.5 long-lived LanguageServer。

### 2026-06-17 SelfHostedEditor P1 post-40 GUI Preview smoke 快照

本轮把 `smoke:desktop-gui-recovery` 与 `smoke:desktop-package-gui` 扩展为真实 GUI Preview smoke。新增共享 `ElectronGuiPreviewSmokeAssertions`，只通过真实 renderer DOM 与应用自身的编辑器 active source line 状态观察行为，不让 renderer 获得 Node/fs/shell。

- Preview smoke 会等待 Workbench 完成首轮 handler 注册，再读取 `.story-preview` 的 provider / title / choice DOM，确认默认 `samples/court-loop.inscape` 已渲染 `法庭开场`。
- smoke 点击真实 Preview choice `查看证物`，确认 reading Preview 进入 `证物桌`，并通过 `.script-editor[data-active-source-line]` 验证 editor reveal 到目标标题 source line。
- `EditorSurfaceController` 现在在编辑器容器上同步 `data-active-source-line`，这是 UI 状态暴露，不改变 Compiler / LanguageServer / Runtime / Tooling 语义边界。

### 2026-06-17 SelfHostedEditor P1 post-40 npm audit 快照

本轮收口 SelfHostedEditor `monaco-editor` / `dompurify` npm audit advisory，不进入 P1.5，也不改变 EditorBackend / preload / renderer 架构。

- 本地 `npm audit` 报告风险来自 `monaco-editor@0.55.1` 间接锁定的 `dompurify@3.2.7`；`npm audit fix --force` 会降级到 `monaco-editor@0.53.0`，因此没有采用该 breaking-change 路线。
- `src/ExternalSupport/SelfHostedEditor/package.json` 新增 npm `overrides`，将间接 `dompurify` 解析到 `3.4.10`；`monaco-editor` 保持 `0.55.1`。
- `npm audit` 已清零；后续 GUI / packaged smoke 继续作为 Monaco/Electron 实际可用性验证。下一步可开始 P1.5 workspace-scoped long-lived LanguageServer，仍需保持 shared payload shape 与 VSCode semantic parity。

### 2026-06-17 SelfHostedEditor P1.5 long-lived LanguageServer 第一刀

本轮开始 P1.5：真实 Electron app 默认由 main process 管理 workspace-scoped `Inscape.LanguageServer --stdio` session；测试和 packaged GUI smoke 仍可用 `languageSessionHandlers` 注入 fake handler，避免把 packaged artifact 问题混入当前 contract。

- 新增 `Desktop/ElectronLanguageServerSessionBridge.js`，负责启动/复用/停止 stdio LanguageServer、LSP framing、临时 active-buffer override 文件、health / lastError / documentRevisionLag 摘要。它只转发 shared LanguageServer request，不复制 Compiler / Tooling / Runtime 语义。
- `ElectronWorkspaceSessionStore` 在 workspace 成功打开后 ensure long-lived session；dirty buffer revision 会更新 revision lag，六个 language command 都用当前 `DocumentBufferStore` snapshot 进入同一个 bridge。diagnostics / completions / definition / references / hover 通过 `overrideSourcePath` / `overrideContentPath` 读当前 active buffer；documentSymbols 通过临时 active file 调 stdio 并把 symbol sourcePath 映射回原 workspace path。
- workspace switch 会 dispose 旧 session 并启动新 session；close-window / app-exit 成功 flush 后 lifecycle 调用 `sessionStore.dispose()`。ProjectSession status 现在能表达 `languageSession.kind: "long-lived"`、`health`、`lastError` 和 `documentRevisionLag`，不暴露正文。
- 新增 `check:electron-language-session`，真实拉起 `Inscape.LanguageServer --stdio`，覆盖 workspace open 启动、dirty buffer override、六类 authoring endpoint、同进程复用、revision lag 清零、workspace switch 替换进程和 dispose 停进程。
- 第二刀补充：ProjectSession status 现在还包含 `restartCount`；`check:electron-language-session` 会模拟协议错误，确认 status 进入 `health: "error"`、`lastError.code: "language-server-protocol-error"`，且下一次 language request 会启动 replacement process 并恢复 `health: "ready"`。
- 第三刀补充：`check:electron-workspace` 现在断言 Electron language payload 仍携带 `inscape.self-hosted-editor.language-session-request` envelope 与 shared query kind；SelfHostedEditor HTTP semantic parity 与 VSCode semantic parity 继续通过。
- 第四刀补充：Windows `package:windows` 现在会把 `Inscape.LanguageServer` runtime 复制到 packaged `resources/language-server`；Electron packaged resolver 只从该资源目录启动 bundled artifact，不回退源码目录。新增 `check:electron-language-artifact` 覆盖 dev build、dev project、packaged exe/dll 与 packaged missing resolver contract；`smoke:desktop-package` 会断言 generated package 内存在 LanguageServer dll/exe/runtimeconfig。
- 第五刀补充：新增 `smoke:desktop-package-language`，启动 generated packaged exe 且不注入 fake language handler，验证 packaged app 内的 `long-lived` status、`packaged-*` artifact、dirty buffer override，以及 diagnostics / completions / definition / references / hover / documentSymbols 六类 endpoint。
- 第六刀补充：新增 `check:electron-language-fallback`，覆盖 bad protocol、timeout、start-exit 三类 long-lived 失败会降级到同一 `Inscape.LanguageServer` artifact 的一次性 CLI 请求；missing packaged artifact 会进入明确 `health: "unavailable"`，并暴露 text-free `fallbackKind` / `fallbackCount` / `fallbackReason` 摘要。fallback 仍只复用 LanguageServer CLI，不把 Compiler / Tooling 语义复制进 EditorBackend。
- P1.5 final validation 已通过：SelfHostedEditor `check:syntax` / `check:structure` / `check:model` / `check:language-session` / `check:electron-language-artifact` / `check:electron-language-fallback` / `check:electron-language-session` / `check:electron-workspace` / `check:electron-lifecycle` / `check:semantic-parity-http` / `check:runtime-http` / `check:references-http` / line-map / localization / node-map / session-cache / host capability / static asset HTTP smokes，Windows `package:windows` + `smoke:desktop-package` / `smoke:desktop-package-gui` / `smoke:desktop-package-language`，VSCode `node --check` / `check:structure` / `check:semantic-parity`，`.NET build`，Internal tests，`npm audit --audit-level=moderate` 与 `git diff --check`。
- 已知剩余风险：P1.5 本轮收口未进入 P2 stable identity / localization，也未做 RuntimeSession long-lived、sidecar daemon、多窗口共享 LS、VSCode 连接 SelfHostedEditor backend 或任何 Compiler / Tooling 语义复制。

### 2026-06-17 SelfHostedEditor P1 post-40 assets import IO 快照

本轮新增 desktop-only `workspace.import-assets` command，把 Round 33 的 asset import plan 推进到 Electron main process 真实 IO。

- `EditorBackendTransportCommand.WorkspaceImportAssets`、preload whitelist、`EditorBackendClient.workspace.importAssets()`、`WorkspaceSessionClient.importAssets()` 和 Electron dispatcher 已对齐；该 command 不映射 dev-host `/api/*` route。
- renderer payload 只允许 `dialogTitle` / `workspaceId`，不会传入 workspace 外 source path；真实外部路径由 Electron main process 原生多文件选择器或测试注入 selector 临时持有。
- `ElectronWorkspaceSessionStore.importAssets()` 会扫描 workspace 内既有 `assets/**`，复用 `EditorBackendWorkspaceAssetImportPlanModel` 生成 text-free copy plan，并复制图片 / 音频 / CSV 到 workspace `assets/images|audio|data`；重名目标走 `-1` suffix，unsupported extension 进入 skip。
- `check:electron-workspace` 覆盖真实 image/audio/CSV 复制、重名避让、unsupported skip、取消导入、缺失源失败不留下目标文件、desktop-only route 和 response 不持久化外部路径；`check:backend-services`、`check:backend-transport`、`check:preload-transport`、`check:electron-shell`、fake embedded transport 也已同步。

### 2026-06-14 SelfHostedEditor desktop backend v0 决策快照

本轮已采纳 [ADR 0019](adr/0019-self-hosted-editor-embedded-backend-v0.md)：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend，而不是独立 sidecar daemon。

- backend 是 SelfHostedEditor 的编辑器应用后端 / 宿主编排层，不是 Inscape 底层业务 backend。
- v0 优先服务一个 SelfHostedEditor 桌面窗口和一个 active project session。
- backend owns editor session and resource orchestration；`Compiler` / `LanguageServer` / `Tooling` / `Runtime` 继续 owns semantic truth。
- v0 不做多窗口共享、后台 daemon、跨重启 session restore、VSCode 复用同一 backend 进程或 localhost 产品 API。
- 用户已确认 LanguageServer long-lived 很重要；它不是 desktop backend v0 的阻塞项，但必须作为 v0 后关键下一步显式推进，不能被当成普通性能优化长期搁置。
- 代码组织仍要保留可 sidecar 化边界：UI 只依赖 `EditorBackendClient` 与业务窄接口，transport 可替换。
- 实施计划见 [SelfHostedEditor desktop backend v0 实施计划](self-hosted-editor-desktop-backend-v0-plan.md)；进入 v0 前的 current-stage P0 收口已完成，留痕见 [SelfHostedEditor 当前阶段 100% 收口推进计划](self-hosted-editor-current-stage-100-plan.md) 与 [SelfHostedEditor P0 12 轮内执行方案](self-hosted-editor-p0-12-round-execution-plan.md)。

### 2026-06-14 SelfHostedEditor shell / workspace / save 决策快照

本轮已采纳 [ADR 0020](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)：

- desktop shell v0 采用 Electron；Tauri 后续可重新评估，WebView2 / Avalonia 暂不进入 v0。
- 项目入口只提供打开目录，不提供正式打开单文件功能。
- 一个窗口一个 workspace folder；workspace 是目录，支持多个 `.inscape` 文件。
- 默认自动保存；UI 与 embedded backend 都持有未保存内容，backend 是 session truth。
- Electron renderer 只通过 preload 白名单 editor command 访问 backend，不直接访问 Node / 文件系统 / shell。
- 文件读写由 backend 统一执行 workspace 文件系统边界检查，拒绝 workspace 外路径和未列入白名单的写回目标。
- autosave 采用 debounce：UI 合并文本同步，backend 合并磁盘写入，并在手动保存 / 关闭窗口 / 切换 workspace 时 flush 最新 buffer。
- 崩溃恢复依赖磁盘 recovery snapshot。
- localization CSV、node-map sidecar、line-map sidecar 写回前默认自动备份，设置项可调整或关闭。
- Git 作为可选增强，不作为基础备份 / 恢复机制。
- v0 先做单窗口；后续多窗口时每个窗口独立 backend / ProjectSession，不共享 session。
- 外部资源默认复制进 workspace，不长期引用 workspace 外路径。
- recovery / backup / cache 使用 workspace 内部目录 `.inscape-workspace/`。
- `.inscape-workspace/` 默认不进 Git；若未来存放项目级可复现配置，必须拆出明确可提交部分。
- 保留手动 Save 作为立即 flush，UI 显示保存状态；autosave 默认开启，可设置关闭。
- v0 最小可用闭环：打开目录、文件列表、编辑、autosave、手动 Save、recovery、基础诊断 / 补全和 Preview。
- 外部资源默认进入 `assets/`，后续可细分 `assets/images/`、`assets/audio/`。
- recovery UI 列出可恢复文件，并提供恢复、丢弃、稍后处理。
- v0 可以先提供最小设置页；若设置页暂缓，也必须先保留稳定配置结构，避免默认值散落硬编码。
- v0 首发 Windows 内部可用版；签名、自动更新、安装器体验和 macOS 后置。
- 设置分层：UI 主题、autosave、backup 保留偏全局；项目入口、资源路径、导出配置、Git/checkpoint 策略偏 workspace / project。

### 2026-06-15 SelfHostedEditor P0 current-stage readiness 收口快照

本轮已完成进入 desktop backend v0 前的 current-stage P0 收口：

- CSS / style structure warning 清零：`SelfHostedEditorEditorAuthoring.css`、`SelfHostedEditorPreview.css`、`SelfHostedEditorStoryGraph.css` 的 feature hard-coded colors 已迁到 `SelfHostedEditorBase.css` tokens，`check:style-structure` 不再输出可消除 warning。
- Workspace Summary 已关闭 `migration-target` 口径：hosted Compiler graph + hosted localization presenter inputs 完整时走 `provider: "shared"` normal path；只有 hosted inputs 不完整时才进入 `workspace-summary-status` draft fallback。
- `ScriptDocumentFallbackPolicy` 当前只保留 `offline-only` 与 `temporary-hosted-fallback` 两类 reason；model contract 明确断言 fallback catalog 不再有 current-stage `migration-target`。
- Preview / StoryGraph / Localization / Outline 的 provider-aware contract 已补强：malformed shared payload 显示显式错误，空 hosted localization presenter 保持 hosted empty state，Outline malformed symbols 显示 LanguageServer error。
- `project-session` status 仍是 dev-host mode 迁移词汇，但现在会报告 language mode 与 supported endpoints；默认六个 authoring endpoint 都是 `process-per-request`，`SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 仅覆盖 diagnostics / documentSymbols，其余四个 endpoint 保持 process-per-request fallback。
- Workbench 集成 contract 覆盖 default sample 静态加载、hosted summary、Runtime/Compiler Preview provider、Compiler Graph provider、Localization 空 hosted review、Outline error 与 Preview choice click invariant。
- 当前阶段仍不做 Electron shell、正式 embedded EditorBackend、持久化 `DocumentBufferStore`、默认 full long-lived LanguageServer、跨重启 session restore 或多窗口 session ownership；这些进入 P1 / P1.5。

### 2026-06-13 SelfHostedEditor long-lived backend / fallback 收口快照

本轮 `docs/self-hosted-editor-long-lived-backend-plan.md` 已用 10 轮完成：

- Workspace Summary 正常路径已改为 hosted/shared summary；draft summary 只作为 hosted inputs 不完整时的 fallback。
- Outline、Preview、StoryGraph、Localization 都已把正常 hosted 路径和 draft/offline fallback 明确分开；malformed shared payload 不再被草模掩盖。
- Localization hosted review 只消费 Tooling `presenter.items`，空 hosted presenter 保持空 hosted 状态；review-unavailable 才进入 draft table fallback，draft fallback 下禁用真实 updated CSV export / replace。
- `EditorBackendClient.projectSession.status()` 现在投影 `inscape.self-hosted-editor.project-session`，明确 `mode: "dev-host"`、共享 project session id、workspace request snapshot 计数 / active path / revision，以及 LanguageServer `process-per-request`、Runtime / line-map / localization `bounded-cache` 子 session。
- `EditorBackendClient.languageSession.*` 已统一包 `inscape.self-hosted-editor.language-session-request`，再展开成当前 dev-host `/api/*` 兼容 payload；底层默认仍是 process-per-request。
- 可选 spike：设置 `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 后，dev host 会对 diagnostics / documentSymbols 尝试复用 `Inscape.LanguageServer --stdio`，失败回退到原 helper，默认路径不变。
- 第 9/10 轮只做跨阶段验收、文档收口和最终审计；SelfHostedEditor / VSCode / Internal 验证矩阵已通过，未发现需要继续扩大 backend scope 的阻塞问题。

继续接手时优先不要把 dev host 改成正式 desktop backend；若要推进产品化 backend，应从正式 project session / workspace buffer / long-lived LanguageServer ownership 重新开独立计划。

### 2026-05-24 SelfHostedEditor 接手快照

当前用户主线是继续推进自研编辑器体验，并逐步用真实 Internal 契约替换前端临时方案。下一位 Agent 最快接手路径：

1. 先读 `docs/self-hosted-editor-architecture-plan.md` 与 `src/ExternalSupport/SelfHostedEditor/README.md`。
2. 重点看 `src/ExternalSupport/SelfHostedEditor/Scripts/Entries/SelfHostedEditorAppEntry.js`、`StoryGraph/Controllers/StoryGraphPreviewController.js`、`EditorAuthoring/Controllers/EditorSurfaceController.js`、`LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js`、`ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js`。
3. 本地预览服务当前为 `http://127.0.0.1:5178/`，若未运行则用 `npm --prefix src\ExternalSupport\SelfHostedEditor run start`。
4. 最近验证已通过：`npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`、`check:structure`、`check:model`、`check:host-schema-http`、`check:host-binding-http`、`dotnet build Inscape.slnx --no-restore`。

2026-06-01 最新接手状态：

- VSCode / SelfHostedEditor parity 盘点已落到 `docs/vscode-self-hosted-editor-parity.md`。Graph 设计优化与 Unity / Bird 继续低优先级，VSCode 与 SelfHostedEditor 重点按作者功能 parity 补齐。
- SelfHostedEditor 已通过开发宿主复用 `LanguageServer --host-schema-capabilities-project`，补齐 `[query]` 与 `@emit` 的 completion / hover；新增 `check:host-schema` 与 `check:host-schema-http` 守住直连 helper 和真实 HTTP。
- Host Bridge 作者提示已从 VSCode 私有 JSON 解析上提到共享能力：`LanguageServer --host-binding-capabilities-project` 现在输出 `inscape.host-binding.capabilities`，Tooling 汇总 Host Bridge 配置行与 workspace 编译出的 speaker / `@timeline` 出现位置。
- SelfHostedEditor 已消费 `/api/host-binding-capabilities`，补齐 speaker 与 `@timeline` 的 completion / hover / navigation；新增 `check:host-binding` 与 `check:host-binding-http`。speaker definition / references 和 `@timeline` Ctrl+Click 现在走同一 Host Binding capability，前端只做 Monaco target 识别与 source reveal。
- SelfHostedEditor 已新增 `/api/node-map-review` 与顶栏 `Node Map` 入口：开发宿主运行共享 CLI `update-node-map-project --report`，返回 compact `inscape.self-hosted-editor.node-map-review`，前端展示 shared report 摘要和 item / candidate source jump，并可下载生成的 `inscape.node-map.json`。新增 `check:node-map` 与 `check:node-map-http` 守住直连 helper 和真实 HTTP；candidate apply 语义已下沉为 Tooling / CLI `apply-node-map-candidate-project`。dev-host 路径保持可下载 payload，Electron desktop 路径在二次确认和备份后写回 node-map sidecar。
- SelfHostedEditor L10N 表格已消费 Tooling presenter 的 review actions：`/api/localization-review` compact payload 保留 `open-current` / `open-candidate` / `show-candidate-diff`，前端行内提供 Current / Candidate / Diff 动作，分别跳当前行、跳候选来源和展开候选 diff。这里仍只做宿主 UI 与 source reveal，不重算 alignment、候选评分或 CSV 语义；`check:model`、`check:localization-review`、`check:localization-review-http` 已覆盖 actions 传输与交互。
- SelfHostedEditor 已新增 `Host` 视图作为 VSCode `Show Host Schema Capabilities` 的业务等价入口：它同时消费 Host Schema 与 Host Binding shared capability catalog，展示 query / action / legacy event / speaker / timeline binding，并可跳到 schema、bridge 或脚本来源。前端只调用既有 bridge，不解析 Host Schema / Host Bridge JSON；`check:model`、`check:structure`、`check:host-schema-http`、`check:host-binding-http` 已覆盖入口与 transport。
- 2026-06-02 最新：SelfHostedEditor refs overlay 已完成 VSCode CodeLens / References Peek 的业务等价验证第一刀。`/api/references` 继续调用 `LanguageServer --references-project`，但现在会把 dev-host 临时目录 sourcePath 转回 workspace 相对路径；新增 `check:references` 与 `check:references-http`，覆盖跨文件引用、当前未保存 draft 参与、引用数量和真实 HTTP transport。UI 不复制 CodeLens，守同一组引用结果和 source jump。
- 2026-06-02 最新：SelfHostedEditor 新增 `check:semantic-parity-http`，用真实 HTTP 请求一次性守 diagnostics、completion、definition、references、hover、outline 六个 LanguageServer-backed 作者能力入口。该 smoke 覆盖当前 draft、跨文件节点、缺失目标诊断和 workspace-relative sourcePath；宿主层只做 payload 路径归一化与 transport，不新增语义真相。
- 2026-06-02 最新：VSCode 新增 `check:semantic-parity`，复用同一组 current-draft / cross-file fixture，经由 VSCode diagnostics、completion、definition、references、hover、outline provider 层消费真实 `LanguageServer` 会话结果。VSCode 侧同步补了临时 override sourcePath 与 workspace-relative sourcePath 的路径还原；这仍只是宿主路径适配，不在 VSCode 里重写语义。
- 2026-06-17 更新：Stable Node Map manual-review candidate apply 已从 VSCode 私有 JS mutation 下沉到 `Internal/Tooling`，并通过 CLI `apply-node-map-candidate-project` 暴露 dry-run / apply result。VSCode review UI 只负责 Quick Pick、调用共享命令、`.review-backup.json` 与 revert 文件恢复；SelfHostedEditor dev-host 路径仍只生成可下载 sidecar payload，Electron desktop 路径则要求 `Confirm Apply`，先调用 `workspace.write-back-backup`，再通过 desktop-only `stable-node-map.write-sidecar` 写回真实 node-map sidecar。
- 2026-06-02 最新：VSCode 本地化 review -> update 核心闭环已补齐。`Review Localization Alignment` 写出报告后的成功动作现在提供 `Update CSV`，复用本次 review 已选择的旧 CSV，再调用共享 `update-l10n-project` 生成 updated CSV；VSCode 仍只做命令式宿主 glue，不接管 CSV 合并、alignment 或候选评分语义。
- 2026-06-02 最新：Editor Backend 会话边界第一刀已落在 Runtime dev-host。`/api/runtime-state` 会按 `sessionId` 记住最新 compact Runtime snapshot，`/api/runtime-action` 可只带 `sessionId + action` 推进服务端会话；显式 `runtimeState` 仍保留为兼容 fallback。前端 Runtime bridge 不再默认每次 action 都上传整份 state，`check:runtime-http` 已覆盖真实 HTTP session 推进。这仍只是宿主会话状态，不改变共享 `Runtime` / CLI 剧情推进语义，也还不是正式桌面长驻 Runtime 进程。
- 2026-06-02 最新：Editor Backend 会话边界第二刀已落在 line-map dev-host。`/api/line-map-refresh` 会按 `sessionId` 记住最新 Tooling line sidecar，前端 `SelfHostedEditorLineMapBridge` 默认只传 `sessionId + script/workspace`，显式 `existingLineMap` 保留为兼容 fallback；新增 `check:line-map` 与 `check:line-map-http` 覆盖直连和真实 HTTP session 继承。这仍只是宿主缓存上一轮 sidecar，不改变共享 `refresh-l10n-line-map-project` 的稳定行身份迁移语义。
- 2026-06-02 最新：Editor Backend 会话边界第三刀已落在 localization baseline/update dev-host。`/api/localization-review` 会按 `sessionId` 记住作者本次选过的 previous CSV，后续 `/api/localization-review` 与 `/api/localization-update` 可只带 session 复用这份旧表；前端 `SelfHostedEditorLocalizationReviewBridge` 默认只在旧 CSV 新增或变化时重传，失败时仍会用显式 `previousCsv` 兜底。`check:localization-update` 与 `check:localization-update-http` 已覆盖 request seeding、session review reuse 和 session update reuse。这仍只是宿主会话记忆，不改变 Tooling / CLI 的 alignment、candidate scoring、override application 或 CSV 生成语义。
- 2026-06-13 最新：10 轮重构第 1 轮完成 SelfHostedEditor dev-host HTTP body 边界硬化。`SelfHostedEditorHttpBridge` 现在对 JSON request body 使用 4 MB 默认上限，超限会返回 413 JSON error，而不是继续累积无界请求体；新增 `check:http-bridge`，并接入 `check:model` 与 `check:syntax`。这只加固宿主 transport，不改变 LanguageServer / Tooling / Runtime / CLI 的成功 payload 或语义契约。
- 2026-06-13 最新：10 轮重构第 2 轮完成 SelfHostedEditor dev-host API handler 收口。`StartSelfHostedEditorPreview.js` 现在只装配 `createSelfHostedEditorApiHandlers()`，具体 POST body 读取、response/error 写回、session fallback payload 整理迁到 `SelfHostedEditorApiHandlerBridge.js`；已跑 `check:semantic-parity-http`、`check:runtime-http`、`check:line-map-http`、`check:localization-update-http`、`check:node-map-http`、`check:host-binding-http`。这仍只移动宿主 HTTP glue，不改变任何 API 成功 payload shape。
- 2026-06-13 最新：10 轮重构第 3 轮完成 SelfHostedEditor dev-host session cache 生命周期边界。`SelfHostedEditorSessionBridge` 现在对 Runtime snapshot、line-map sidecar、localization baseline 三类会话记忆统一使用 bounded cache：默认 2 小时 idle TTL、每类最多 64 条 session，过期和容量淘汰都有计数；新增 `/api/session-cache-status`、`check:session-cache` 与 `check:session-cache-http`，状态只包含 session id、大小、idle/age 和淘汰计数，不暴露缓存的 Runtime / line-map / CSV 内容本体。下一轮可继续第 4 轮 process bridge 错误输出截断、状态表达和超时可观测性复查。
- 2026-06-13 最新：10 轮重构第 4 轮完成 SelfHostedEditor dev-host process bridge 错误边界复查。`SelfHostedEditorProcessBridge` 对非零退出、spawn error 和 timeout 统一抛出 `SelfHostedEditorProcessCommandError`，message 与 details 只保留截断后的 stdout/stderr preview，同时带 exit code / signal / timedOut / duration；`writeJsonErrorResponse` 会保留普通 `error` 字段并在存在时透出 structured details。新增 `check:process-bridge` 并接入 `check:model` / `check:syntax`。下一轮可继续第 5 轮拆分 `SelfHostedEditorModelContractCheck.js`。
- 2026-06-13 最新：10 轮重构第 5 轮完成 SelfHostedEditor model contract 拆分。`SelfHostedEditorModelContractCheck.js` 现在只是 8 行顺序入口，具体断言迁入 `DevScripts/ModelContracts/`：model shape、host capability、story graph、localization、node-map、preview/runtime 和 shared fake DOM harness；`check:model` 命令保持原入口，`check:syntax` 与 `check:structure` 已纳入这些新模块。
- 2026-06-13 最新：10 轮重构第 6 轮完成 C# preview/localization 测试拆分。`TestPreviewLocalization.cs` 已按 Preview contract、Localization CLI、Localization alignment、Localization line-map、VSCode localization contract 和 shared assertions 拆成多个 partial `TestCore` 文件；`tests/Internal/Inscape.Tests/Entries/TestCore.cs` 的测试注册入口保持不变，已通过 `dotnet build Inscape.slnx --no-restore` 与 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-06-13 最新：10 轮重构第 7 轮完成 SelfHostedEditor package 检查入口收口。`check:syntax` 现在只委托 `DevScripts/SelfHostedEditorSyntaxContractCheck.js`，由该入口递归 `node --check` `Scripts/` 与 `DevScripts/` 下的 JavaScript；`check:model` 委托 `DevScripts/SelfHostedEditorModelContractSuite.js` 串起既有 model / HTTP bridge / process bridge / session cache contract。npm 命令名保持不变，`SelfHostedEditorStructureContractCheck.js` 已守住这两个委托关系。
- 2026-06-13 最新：10 轮重构第 8 轮完成 SelfHostedEditor static asset / CSP 边界硬化。静态桥现在只允许 `Resources/`、`Scripts/`、Monaco loader subtree 与 `samples/`，拒绝 `DevScripts/`、`package.json` 和未知扩展；Workbench HTML 响应带 no-store、nosniff、same-origin CORP 与 CSP。新增 `check:static-assets` 与真实 HTTP `check:static-assets-http`。下一轮可继续第 9 轮 VSCode / SelfHostedEditor 宿主层语义回流巡检。
- 2026-06-13 最新：10 轮重构第 9 轮完成 VSCode / SelfHostedEditor 宿主层语义回流巡检第一刀。SelfHostedEditor dev server 现在通过 `SelfHostedEditorPayloadBridge` 统一做 compact payload 与 sourcePath 归一化，`StartSelfHostedEditorPreview.js` 只保留临时 workspace、CLI / LanguageServer / Runtime 调用和 route 装配；新增 `check:payload-bridge` 并接入 `check:model`，守住 localization `presenter.items`、node-map `report.items`、Runtime session id 与 shared review action keys 不被宿主层改名或重造。下一轮可进入第 10 轮总体验收与文档收口。
- 2026-06-13 最新：10 轮重构第 10 轮完成总体验收与文档收口。本轮额外跑过 SelfHostedEditor HTTP smoke：semantic parity、Runtime、localization review/update、node-map、static assets、session cache、line-map、Host Schema、Host Binding、references；随后用 `tools\CommitAndPushInscape.cmd` 跑完整提交前验证。10 轮完成后，SelfHostedEditor dev-host 的主要剩余风险不再是无界 transport / process / cache / static asset / payload bridge，而是 UI-only draft fallback、临时 workspace 驱动的长会话模型，以及未来 desktop backend 尚未落地。
- 2026-06-13 最新：SelfHostedEditor 下一阶段 10 轮目标已启动。第 1 轮先验证并推送已有 controller / fallback / backend 边界基线，避免后续工作叠在未提交大改上；提交为 `cfa9a08 refactor: split self hosted editor controllers`，额外通过 semantic parity、Runtime、Localization review/update、Node Map、static assets、session cache、line-map、Host Schema、Host Binding、references HTTP smoke。
- 2026-06-13 最新：下一阶段第 2 轮冻结 backend 迁移实施 checklist。`docs/self-hosted-editor-backend-migration-map.md` 现在为 17 个 `/api/*` endpoint 标出 `implementationPhase`，并明确下一步 `EditorBackendClient` 只是业务窄接口 adapter，第一版仍调用现有 dev-host route，不表示正式 backend 或通用 RPC。
- 2026-06-13 最新：下一阶段第 3 轮新增 `Scripts/Backend` 业务目录和 frontend-facing `EditorBackendClient` 第一版。client 目前只提供业务窄入口并通过 `SelfHostedEditorHttpBackendTransport` 调用现有 dev-host `/api/*`，`diagnostics.sessionStatus()` 会把 `/api/session-cache-status` 投影成最小 `inscape.self-hosted-editor.backend-session-status`，不暴露缓存内容。当前尚未迁移各 bridge 调用点，下一轮优先迁 Runtime、line-map、localization 这三类 session 意味最强的 bridge。
- 2026-06-13 最新：下一阶段第 4 轮已把 `SelfHostedEditorRuntimeBridge`、`SelfHostedEditorLineMapBridge`、`SelfHostedEditorLocalizationReviewBridge` 迁到 `EditorBackendClient`。三者仍保持原有 UI-facing 方法、session id、兼容 fallback 和成功 payload，但不再直接 `fetch("/api/...")`；structure check 已守住这三条 session bridge 必须走 backend client。下一轮可迁 LanguageServer-backed authoring endpoints：diagnostics、hover、definition、references、completion、document symbols。
- 2026-06-13 最新：下一阶段第 5 轮已把 Diagnostics、Completion、Definition、Hover、References、DocumentSymbols bridge 迁到 `EditorBackendClient.languageSession`。这些 bridge 仍只做 mapper/fallback 薄适配，`check:semantic-parity-http`、`check:references-http` 与 VSCode `check:semantic-parity` 已通过。下一轮可迁 Host Schema、Host Binding、StoryGraph 和 Node Map 这类 remaining frontend bridge，或转入 CSS inventory，按计划不要把 CSS 拆分混进同一提交。
- 2026-06-13 最新：下一阶段第 6 轮已把 Host Schema、Host Binding、StoryGraph、Stable Node Map bridge 迁到 `EditorBackendClient`。`Scripts/` 下现在由 structure check 全局禁止直接 `fetch("/api/...")`，前端控制器和业务 bridge 不再关心 dev-host endpoint 细节；只有 backend client/transport 承担 route 适配。下一轮建议进入 CSS inventory / layer 边界，先不要继续扩大 backend 语义。
- 2026-06-13 最新：下一阶段第 7 轮已建立 CSS inventory 和 `check:style-structure`。`docs/self-hosted-editor-css-architecture.md` 记录当前 CSS owner / line baseline / target；`check:structure` 现在会同时跑 style structure contract。当前两个 legacy CSS 文件仍高于 450 行目标：WorkspaceLayout 722 行、EditorAuthoring 659 行，但检查会阻止它们继续增长。下一轮优先拆 WorkspaceLayout。
- 2026-06-13 最新：下一阶段第 8 轮已拆 WorkspaceLayout CSS ownership。新增 `SelfHostedEditorSidebar.css` 与 `SelfHostedEditorTopbar.css`，`SelfHostedEditorWorkspaceLayout.css` 降到 233 行并只保留 shared shell / workspace / pane / summary / responsive shell。CSS style structure、static assets direct/HTTP 和 model contract 已通过。下一轮优先拆 `SelfHostedEditorEditorAuthoring.css`，它仍是 659 行的唯一 legacy CSS owner。
- 2026-06-13 最新：下一阶段第 9 轮已拆 EditorAuthoring CSS ownership。新增 `SelfHostedEditorLineHintRail.css`、`SelfHostedEditorReferenceOverlay.css` 与 `SelfHostedEditorAuthoringDecorations.css`，`SelfHostedEditorEditorAuthoring.css` 降到 229 行并只保留 editor frame / rename dialog / Monaco hover / suggest widget shell。CSS structure contract 已守住新 import 顺序、feature owner 与 forbidden absorption；下一轮优先进入 fallback reason 分级与可见降级状态，不要再把 CSS 拆分混进同一提交。
- 2026-06-13 最新：下一阶段第 10 轮已完成 draft fallback reason 分级第一刀。当时 `ScriptDocumentFallbackPolicy` 使用 `offline-only` / `temporary-hosted-fallback` / `migration-target` 三层分类，并把 `workspace-summary-status` 标记为迁移目标；2026-06-15 P0 收口已关闭该 migration-target 口径，当前 Summary hosted aggregation 是 current-stage normal path，draft summary 只作为 hosted inputs unavailable fallback。后续若继续收窄 fallback，应优先替换仍需产品化 backend / long-lived session 承担的正常路径，而不是扩展 `ScriptDocumentModelBuilder`。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 1 轮完成 StoryGraph rendering 边界拆分。`StoryGraphPreviewController.js` 从 1025 行降到 824 行，新增 `StoryGraphNodeRenderer` 承担节点卡片、端口和输出行 DOM 创建，新增 `StoryGraphEdgeRenderer` 承担 SVG edge layer / path 创建；controller 仍负责 layout、reference projection、viewport、drag / retarget 和 hover 编排。改动前已跑 SelfHostedEditor 全套轻量基线；改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。下一轮应继续拆 StoryGraph interaction / viewport，不改变 Compiler graph truth、reference node view-only 语义或 edge retarget patch contract。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 2 轮完成 StoryGraph viewport 边界拆分。新增 `StoryGraphViewportController` 承担 viewport DOM、pan / zoom / reset、transform 应用、graph-space 坐标换算和 node position 读取；`StoryGraphPreviewController.js` 从 824 行降到 662 行。controller 仍保留 node drag、connection drag / retarget、hover highlight、layout 和 reference projection。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。下一轮应继续拆 StoryGraph interaction / geometry。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 3 轮完成 StoryGraph interaction / geometry 拆分。新增 `StoryGraphInteractionController` 管理 node drag、connection drag / retarget、connection target hit test 和 preview path，新增 `StoryGraphPortGeometryModelBuilder` 管理端口中心与连接曲线路径；`StoryGraphPreviewController.js` 从 662 行降到 472 行，达到阶段 1 的 350 到 500 行目标。reference projection / layout 仍留在 controller 作为当前编排职责。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。下一轮可进入 Preview controller 拆分。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 4 轮完成 Preview controller 拆分第一刀。新增 `PreviewCompilerGraphContractGuard` 承担 compiler graph preview line 契约守卫，新增 `PreviewRuntimePreferenceModelBuilder` 承担 Runtime snapshot 优先级判断和 snapshot 到 reading preview model 的映射；`PreviewPanelController.js` 从 1002 行降到 811 行，阶段 2 尚未达到 350 到 500 行目标。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:runtime-http`、`check:semantic-parity-http`。下一轮继续拆 Preview DOM renderer、interaction controller 或 Flow presenter。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 5 轮完成 Preview controller 目标区间收口。新增 `PreviewBlockRenderer`、`PreviewChoiceRenderer` 与 `PreviewFlowStatePresenter`，把正文 / metadata / query token / typewriter DOM、choice list DOM 与 Flow 可见行状态移出；`PreviewPanelController.js` 从 811 行降到 478 行，达到阶段 2 的 350 到 500 行目标。保留 `normalizeChoiceGroups`、`getVisibleLines`、`clearTypewriterTimer` 薄代理以兼容 model contract。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:runtime-http`、`check:semantic-parity-http`。下一轮可进入 AppEntry composition root 收口。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 6 轮完成 AppEntry composition root 收口。新增 `SelfHostedEditorDomBindings`、`SelfHostedEditorFeatureBootstrapper`、`SelfHostedEditorWorkbenchRenderController`、`SelfHostedEditorNodeRenameDialog` 与 `ScriptBlockEditPatchBuilder`；`SelfHostedEditorAppEntry.js` 从 793 行降到 331 行，达到阶段 3 的 200 到 350 行目标。入口保留 `main()`、启动顺序、全局错误处理和事件订阅，DOM 查询、feature 创建、workspace context provider 装配、workbench render 状态与脚本块 patch 已移出。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:semantic-parity-http`、`check:runtime-http`、`check:static-assets-http`。下一轮进入 UI-only fallback 使用面压缩。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 7 轮完成 UI-only fallback 使用面第一轮压缩。新增 `ScriptDocumentFallbackPolicy`，生产代码现在必须用登记 reason 才能触达 `ScriptDocumentModelBuilder`；当前 reason 覆盖 EditorAuthoring / Workspace Summary 的 offline-only UI convenience，以及 Preview / StoryGraph / Localization / Diagnostics / DocumentSymbols 的 hosted bridge unavailable fallback。`SelfHostedEditorStructureContractCheck.js` 会拦截新的直接 builder import，`SelfHostedEditorModelShapeContractCheck.js` 覆盖 reason catalog 和缺 reason 抛错；README 已记录 fallback policy 边界。改动后通过 `check:syntax`、`check:structure`、`check:model`。下一轮进入 Localization controller 轻量化。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 8 轮完成 Localization controller 轻量化。新增 `LocalizationTableRenderer`、`LocalizationCsvFileController`、`LocalizationVisibleRowsModelBuilder`、`LocalizationReviewRowsModelBuilder` 与 `LocalizationExportReadinessModelBuilder`，把表格 DOM / review action UI、previous CSV file handle / updated CSV IO、visible row filter、Presenter row 映射和 export / replace readiness 移出；`LocalizationEditorController.js` 从 823 行降到 432 行，达到阶段 5 的 300 到 450 行目标。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:localization-review-http`、`check:localization-update-http`。下一轮进入 EditorSurface controller 轻量化，优先保持 Monaco authoring、stable line id 和 source selection 行为不变。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 9 轮完成 EditorSurface controller 轻量化。新增 `EditorLineHintController` 与 `EditorSemanticDecorationController`，把 hint rail DOM、stable id hover / copy、title add / rename / refs button、block reorder drag visual state，以及 Monaco semantic / active block decorations 移出；`EditorSurfaceController.js` 从 819 行降到 407 行，达到阶段 6 的 350 到 500 行目标。改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:references-http`、`check:line-map-http`、`check:semantic-parity-http`。下一轮进入产品化 backend 准备，重点梳理 dev-host `/api/*`、session cache 与 future backend project session 边界，不提前引入大框架。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 10 轮完成产品化 backend 准备。新增 `docs/self-hosted-editor-backend-migration-map.md`，逐项映射 17 个 `/api/*` endpoint 到未来业务窄接口，并区分 Editor UI state、dev-host transport cache、backend project session 与 shared semantic truth；新增 ADR 0018，明确 future backend 不采用通用 RPC，不把 dev-host bounded cache 当正式 project session。`docs/self-hosted-editor-architecture-plan.md` 已链接 migration map 与 ADR。改动后通过 `check:syntax`、`check:structure`、`check:model`。下一轮进入总体验收，按 refactoring plan 的阶段性大验收矩阵跑完整验证并审计终局判断标准。
- 2026-06-13 最新：14 轮以内 UI controller 重构第 11 轮完成总体验收并收口。完整验证已通过 .NET build、Internal tests、VSCode manifest / structure / semantic parity，以及 SelfHostedEditor syntax、structure、model、semantic parity HTTP、Runtime、Localization review/update、Node Map、static assets、session cache、line-map、Host Schema、Host Binding、references HTTP smoke。终局审计确认最大 controller 为 `PreviewPanelController.js` 483 行，`Scripts/` 下没有超过 500 行的 JS；生产路径只通过 `ScriptDocumentFallbackPolicy` 使用 `ScriptDocumentModelBuilder`；backend migration map 覆盖 dev-host 17/17 个 `/api/*` endpoint。14 轮目标已用 11 轮完成，后续不需要继续围绕本批 controller 拆分，优先转向产品化 backend / desktop project session 或新的作者体验需求。

2026-05-26 本会话交接状态：

- 已完成并推送一次文档队列收口：提交 `f43ac69 docs: organize current todo queue`。该提交把 `docs/todo.md` 的当前执行顺序改为 SelfHostedEditor 优先，并明确下一步按 L10N presenter、Runtime Player、Editor Backend 会话边界、Graph sidecar / 交互的顺序推进；同时移除了 `agent-handoff` 中“SelfHostedEditor 仍未跟踪”的过期提示。
- 当前工作树这轮新增的是 Runtime dev-host 回归护栏：`StartSelfHostedEditorPreview.js` 现在导出 Runtime 直连 helper，`SelfHostedEditorRuntimeSmoke.js` / `SelfHostedEditorRuntimeHttpSmoke.js` 分别覆盖直连与真实 HTTP 的 `choose` / `continue` 链路，`package.json` 与相关文档也已同步更新。
- 已新增开发宿主 `/api/localization-review`：它在临时 workspace 中先跑 `update-node-map-project`，再用传入的 `previousCsv` 或即时 `extract-l10n-project` 输出作为旧表，最后跑 `audit-l10n-alignment-project --from <csv>`。当前返回 `inscape.self-hosted-editor.localization-review` 的精简 UI 契约，但仍保持通用层已有的 `presenter.items` 形状，只裁掉浏览器暂时不需要的完整 audit report 和冗余字段。这条路径仍复用 Tooling / CLI 的 alignment 与 presenter，不在前端复制候选评分或 review 语义。
- 已新增前端 `SelfHostedEditorLocalizationReviewBridge`，并让 `LocalizationEditorController.render()` 变成 async：正常 hosted 路径会优先渲染 `report.presenter.items`，表格新增 `Review` 列，状态 pill 使用 Tooling report 的 `kept / new / changed / conflict / stale / removed` 等状态；如果 bridge 不可用或 presenter 为空，仍回退旧的 `ScriptDocumentModelBuilder` session draft 行。该回退只能作为离线 / 开发宿主不可用 fallback，不能被当成真实 L10N 语义。
- 已补一处 dev server 输入健壮性：所有 POST API 的 request body 现在通过 `parseJsonRequestBody()` 解析，统一剥离 UTF-8 BOM。这个问题是做真实 `/api/localization-review` smoke 时发现的：PowerShell `Set-Content -Encoding UTF8` 生成的 JSON 带 BOM，原先 `JSON.parse(body || "{}")` 会直接 500。
- 已跑过并通过：`npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`、`npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure`、`npm --prefix src\ExternalSupport\SelfHostedEditor run check:model`。`check:model` 曾因新增测试放在 fake DOM 类定义之前失败，已把测试移动到 `FakeElement` 初始化之后并通过。
- 已做过一次真实 CLI 拆分 smoke：在临时目录中分别运行 `update-node-map-project`、`extract-l10n-project -o old.csv`、`audit-l10n-alignment-project --from old.csv` 均快速通过，说明 CLI 侧不是阻塞点。
- 已新增 `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review`。它直接导入 `StartSelfHostedEditorPreview.js` 里的本地化 review 路径，对 `samples/court-loop.inscape` 执行完整 dev-host 逻辑，不依赖本机先拉起 HTTP server；当前 smoke 结果为 170 items、约 94 KB payload、约 558ms。
- 已新增 `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http`。它在同一 Node 进程里启动 preview dev server 实例，再真实 POST `/api/localization-review`，把完整 `court-loop` 样例的 HTTP 传输层也纳入回归；当前结果为 170 items、约 94 KB payload、约 590ms。
- 已补上 SelfHostedEditor L10N 第一条真实写回链路：共享层 / CLI 新增 `--translation-overrides`，允许在 `update-l10n` / `update-l10n-project` 前按 anchor 应用前端草稿覆盖；开发宿主新增 `/api/localization-update`，前端只传 `previousCsv + translationOverrides`，继续由 CLI 生成真实 updated CSV，不在浏览器里重造 CSV 语义。
- 已补上前端“真实旧 CSV 选择 + 真实 updated CSV 导出”薄适配：`LocalizationEditorController` 现在会显示 review baseline、读取旧 CSV、保留 session draft overrides，并通过 `SelfHostedEditorLocalizationReviewBridge.exportUpdatedLocalizationCsv()` 下载真实 updated CSV；draft CSV 导出仍保留给纯会话草稿场景。
- 已补上前端 L10N 表格的宿主侧 review 筛选：`LocalizationEditorController` 现在支持按 `all / actionable / draft / empty / kept / new / changed / conflict / stale / removed` 切换当前可见行，并显示 `Showing X of Y rows` 摘要。这个筛选只影响浏览器可见性，继续直接消费 shared `presenter.items` 与 draft store，不在前端重算 review 语义。
- 已补上前端 L10N 的 CSV 会话状态与当前筛选范围的一键清草稿：工作台现在会显示 session override 数、当前筛选下可见 draft 数，以及 updated CSV 当前为什么不可导出；并支持只清掉当前 filter 下可见的 draft overrides。这个动作只操作宿主侧 `LocalizationDraftStore`，不改 shared review presenter 与 CLI updated CSV 语义。
- 已补上前端 L10N 的直接文件替换边界：若浏览器支持 native file handle，`Open previous CSV` 会优先链接真实旧 CSV 文件，工具栏新增 `Replace previous CSV`，通过既有 `/api/localization-update` 生成真实 updated CSV 后直接写回原文件；写回成功后会清掉当前 session draft overrides，并以写回后的 CSV 重新渲染 review baseline。若 native file handle 不可用，则继续保留旧的“文件输入 + 浏览器下载”路径，不在前端模拟文件写回。
- 已继续收口 linked baseline 的已保存/未保存宿主状态：当前 `LocalizationEditorController` 会根据 anchor draft overrides 数量把 baseline 状态显示为 `linked clean` 或 `linked N unsaved`，并让 `Replace previous CSV` 只在真的存在未保存 linked 草稿时可用。这里仍只是在宿主层表达“文件有没有待写回的草稿”，不改 shared review presenter，也不改 CLI update 语义。
- 已新增 `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update` 与 `check:localization-update-http`。前者直连 dev-host helper，后者真实 POST `/api/localization-update`，两者都验证“真实旧 CSV + anchor overrides -> 真实 updated CSV”闭环。
- 已新增 `npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime` 与 `check:runtime-http`。它们分别覆盖 Runtime dev-host 直连路径与真实 HTTP transport，验证 compact Runtime payload 以及恢复 state 后的 `advance-flow` / `rewind-flow` / `choose` / `continue` / `rewind` 推进，不再只靠 session 面板的人工观察来判断 Runtime bridge 是否还活着。
- 已推进 Preview Runtime Player 第一小刀：阅读面板中的 choice / continue 点击现在会在“当前预览节点 === 最新 Runtime snapshot 当前节点”时优先走 `/api/runtime-action` 的 `choose` / `continue`，成功后直接用返回 snapshot 重绘阅读面并把编辑器定位到 Runtime 当前节点；若 Runtime 不可用或当前预览节点与 snapshot 脱节，仍回退为原来的 source-only 导航。这样先把最值钱的点击链路接到真实 Runtime，上游初始节点选择和 Flow 步进仍保持 presenter 状态，留给下一刀继续替换。
- 已继续推进 Preview Runtime Player 第二小刀：普通 renderWorkbench 刷新时，只要当前编辑光标仍位于最新 Runtime snapshot 的当前节点中，阅读面板就优先继续渲染这个 Runtime 当前节点，而不是退回 compiler graph 的 presenter 节点。这样可以把“当前节点是谁”这层真相也挂到 Runtime 上，减少一刷新就掉回前端 presenter 的情况；但初始 player 选点、Flow 历史与步骤计数仍未接入 Runtime。
- 已继续推进 Preview Runtime Player 第三小刀：当新文档刚打开、工作台还没建立 presenter 当前节点、并且当前光标还停在文件顶部起步位置时，阅读面板会直接用最新 Runtime snapshot 的当前节点作为第一次 player 选点，而不是默认拿第一个脚本节点当开场。这样 Runtime entry 真相终于接到了首次阅读落点；当前还没接上的只剩 Flow 历史与步骤计数。
- 已继续推进 Preview Runtime Player 第四小刀：Runtime 共享层现已新增 `rewind`，开发宿主 `/api/runtime-action` 与 SelfHostedEditor Runtime bridge 会原样透传它。阅读面板会显示轻量 Runtime path，并在 path 长度大于 1 时给出 Runtime-backed `Back` 按钮，点击后回退到上一个已访问节点并直接用返回 snapshot 重绘。这样“读过哪些节点、退回到哪一步”也开始挂到 Runtime 真相上；当前还没接上的主要只剩节点内 Flow 步进与步骤计数。
- 已继续推进 Preview Runtime Player 第五小刀：节点内 Flow 步进现已开始挂到共享 Runtime。`NarrativeRuntime` 新增 `VisibleStepCount` 与 `ReadingProgress`，CLI `runtime-project` / 开发宿主 `/api/runtime-action` 新增 `advance-flow` / `rewind-flow`，SelfHostedEditor Preview 在 Runtime 可用时只透传这些动作并消费返回 snapshot，不再把“当前节点内读到第几步”继续保存在浏览器私有 presenter 里。现阶段仍保留本地 Flow fallback，只在 Runtime 不可用时使用。
- HTTP smoke 当前结论：用 `curl --noproxy "*"`、无 BOM JSON、最小脚本 `# Opening / Narrator: Hello` 直接 POST `/api/localization-review` 已成功返回 presenter；PowerShell `Invoke-RestMethod` 曾因本机代理路径超时，不要把它误判为服务端阻塞。后续复查显示完整 `samples/court-loop.inscape` 的底层 CLI 链路并不慢：临时 workspace 下 `update-node-map-project`、`extract-l10n-project`、`audit-l10n-alignment-project` 合计约 10 秒，因此当前更值得怀疑的是 HTTP 客户端、响应体积或 dev-host 传输层，而不是 Tooling 算法本身。此前测试端口 `5182`、`5183`、`5184`、`5185`、`5187` 的残留监听已复查并清理。
- 交接时如果继续本节点，建议第一件事执行：`npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`、`check:structure`、`check:model`、`check:localization-review-http`、`check:localization-update-http`。P2 Round 10 已把 L10N 批量审校 / multi-apply 后置到 P2 之后；若继续本线，下一刀更适合转向 localization update safety 或 Runtime 长会话边界。

已完成的关键收口：

- 默认样例已改为通过本地 preview server 读取真实文件 `samples/court-loop.inscape`；入口脚本不再保留任何硬编码脚本文本。若未通过本地服务打开、或真实样例文件读取失败，工作台应显示加载失败，而不是伪造脚本文本。
- Graph 视图继续对齐 Blueprint / Shader Graph 端口交互：点击节点或出口不自动切回 Script；卡片主体可拖拽；每条 choice / jump 有输出端口；连线现在读取真实 DOM 端口中心，从输出端口连到目标节点输入端口，不再用布局估算坐标；拖拽输出端口到输入端口会 retarget，拖到非输入端口区域会断开，并通过受控文本 patch 回写 `-> target`。最近已补 SVG 层级和输入端口吸附热区，避免真实边被节点卡片遮住或手动连线释放后消失。
- Graph 输出行 hover 会轻微标出 source 节点、当前显示目标节点和对应 SVG 线条，方便在密集连线中逐条读边；当前匹配兼容 Compiler project graph edge 的 `sourceTitle` / `targetTitle` 与离线 outgoing row 的 `nodeTitle` / `target`，并会在 SVG edge layer 刷新后恢复当前 hover 高亮；该反馈只属于显示层，不改变 selection，也不切换视图。
- Graph 面板已补隐藏渲染后的重算逻辑：切到 Graph 视图或面板 resize 后会重新读取端口位置并刷新 SVG path，避免面板隐藏时 `getBoundingClientRect()` 为 0 导致真实边存在但画面无连线。
- Graph 视图已从固定宽板改为可平移 / 缩放视口：空白处拖拽移动画布，滚轮按指针位置缩放，左上角提供 zoom in / out / reset 控制。节点拖拽、连线预览和 SVG path 均已转为 graph-space 坐标，缩放后仍应可编辑。Graph 激活时根节点会标记当前 view，CSS 将主体区切到紧凑单面板布局，让画布吃满可用空间，不再继承 Script 视图的大版心留白。
- Graph 回环边当前通过视图层 reference projection 降噪：如果目标节点在布局顺序上不晚于 source，或一条边加入显示图后会闭合成环，边会改接到 source 右侧局部 return lane 中的 reference-only 节点，而不是统一拉到整图最右侧。reference 节点只接受输入、没有输出、不可重命名，点击仍跳真实目标；hover 到 reference 时会轻微标出 source 与真实 target。这是显示层 shortcut，不改变 Compiler graph truth。
- Graph 模型来源已完成第一刀替换：正常本地服务路径会通过 `/api/story-graph` 调用现有 CLI `compile-project`，消费 Compiler project IR 中真实的 choice / default jump 边；`ScriptDocumentModelBuilder` 只作为直接打开 HTML 或开发宿主不可用时的离线 fallback。
- Preview 内容模型也已完成第一刀替换：正常本地服务路径会消费同一份 Compiler project graph，阅读行、元数据、choice prompt、choice option 与 default jump continue 入口都来自 `/api/story-graph` 输出；`ScriptDocumentModelBuilder` 只作为 Compiler bridge 不可用时的离线 fallback。注意：如果已经拿到 `compiler-project` graph，但节点 `previewLines` 缺失、数量与 Compiler lines 不一致，或 source line 无效，Preview 必须显示 compiler graph contract error，不能回退到同标题草模正文掩盖事故。
- Runtime Player 接入前置契约已完成第一刀：新增 `runtime-project` CLI 命令，项目编译后由 `NarrativeRuntime` 启动 entry，并输出 `inscape.runtime-state` JSON；下一步 SelfHostedEditor 应通过开发宿主桥消费这个运行态，而不是在前端模拟当前节点。
- SelfHostedEditor 已新增 `/api/runtime-state` 与 `SelfHostedEditorRuntimeBridge`，当前会通过临时 workspace 调用 `runtime-project`，并把 Runtime 当前 entry 节点显示到左下 session 状态。`runtime-project` 现在也支持 `--state` 后接 `--continue` 或 `--choose group option`，开发宿主 `/api/runtime-action` 会把这些动作转发给 CLI 后返回新 snapshot；Preview 还没有消费这个 Player action 状态。
- Runtime 这条线现在已有明确回归护栏：`check:runtime` 直接验证 `runtime-project` 桥的 compact payload、相对 sourcePath 与 `Opening -> Witness -> End` 的 `choose -> continue` 状态链；`check:runtime-http` 额外验证 `/api/runtime-state` 与 `/api/runtime-action` 的真实请求往返。下一步若接 Preview Runtime Player，应直接复用这组契约，不要再在前端补一套新的运行时真相。
- Script / Preview 语义样式已继续收口：`@...` 元数据在 Script 高亮模式下弱化，在 Preview 中隐藏 `@` 并展示成不可点击、不可选中的淡蓝灰 tag；`[query]` 在两侧都有轻量差异化 token 样式。Monaco 写作表面已关闭 Unicode ambiguous character 警告，中文标点不应再被误报为源码混淆风险。
- Preview 当前会按活动源码行所在 block 渲染 Compiler graph 内容；编辑器 definition navigation 或其他源码定位进入新 block 时会切换预览 block，但编辑器滚动和预览滚动保持独立，不做滚动同步。外层 workbench body 不应再作为双栏共享滚动面。
- SelfHostedEditor 当前已有安静 loading 状态，覆盖默认样例、Monaco、line-map、Compiler graph Preview / Graph、Runtime、diagnostics、outline、本地化和 workspace summary 刷新过程；不要回退成全屏遮罩或高饱和 spinner。
- SelfHostedEditor dev host 的 CLI / LanguageServer / Runtime 桥必须保持 UTF-8 输出链路：.NET 入口设置 UTF-8 stdout，Node 侧必须累积 stdout/stderr Buffer 后一次性 UTF-8 解码，不能逐 chunk `String(chunk)`，否则中文 JSON 会在 Windows 子进程输出中变成乱码。
- Preview 阅读表面不再显示总行数 meta；这类 session/debug 信息应留在 workspace 状态区，不进入正文阅读面。
- Preview 现在有 `Static` / `Flow` 阅读模式：Static 是完整 block 一次性展示；Flow 从标题开始，点击预览区逐行放出正文，新出现的 speaker 快速淡入，正文使用打字机效果；正文结束后一次性显示全部选项，并在 flow 下默认显示选项目标标题。`@` 标签不消耗 Flow 点击：开头标签随标题出现，正文后的标签随该句完成后出现。Flow 滚轮导航只在预览面板自身滚到顶部 / 底部后接管：向上按阈值撤回上一步，向下按阈值快进一步；选项可见时禁止向下快进。该状态仍是前端 presenter 状态，不是 Runtime state。
- 根布局现在是固定视口内应用：`body` 不滚动，Script 编辑器由 Monaco 内部滚动，Preview 由 `.story-preview` 独立滚动。不要把 `workbench-body` 重新改成共享页面滚动，也不要让 `height: 100%` 依赖不稳定的 `min-height` 链路。
- Script 写作表面已关闭 Monaco sticky scroll；节点标题、prompt / choice 标题等结构行应像普通文本一样滚出视口，不要重新启用置顶结构行，否则会在顶部产生重影 / 错层。
- Script 视图 Ctrl/Cmd + Click 节点标题或跳转目标时会显式走 source selection 管线，编辑器光标与预览 block 都会跳到 definition 位置；不要退回到只依赖 Monaco 内建同文件 goto，否则可能出现 Preview 跳转但编辑器不移动。
- Script 编辑器左侧行号 / line id 提示轨道现在完全跟随 Monaco 内容坐标：`.hint-rail` 不再有独立上下 padding，`EditorSurfaceController.renderHints()` 用 Monaco 运行时 line height 和 `getTopForLineNumber()` 定位。后续不要重新给 hint rail 加垂直 padding，否则折行后的行号会再次与对应行首错位。
- Script 行号轨道已继续收口：写作表面关闭 Monaco 顶部滚动阴影，`.hint-rail` 不再暴露横向滚动条；hover 整条 hint line 只显示块内行号，只有 hover 行号数字区域才会用稳定 id 替换行号显示。稳定 id 显示时去掉 `line_` 前缀，并带一个小复制按钮复制完整去前缀后的 id。`SelfHostedEditorModelContractCheck` 已覆盖 line-map -> authoring model -> hint rail DOM 的 stable id 渲染链路。
- 本地 preview server 对静态资源已返回 `Cache-Control: no-store`；若仍看到 `Opening / Evidence / Witness`，优先确认浏览器是否连接到旧服务或需要强制刷新。
- Script 引用浮层不再固定左上角：标题左侧 refs 按钮会把点击锚点传给 overlay，浮层跟随所点击 block 的位置，并在滚动时继续贴近该标题；列表展示 `choice -> target` / `Jump -> target` 摘要、上下文和命中高亮，不显示完整路径。
- 左侧栏 Files / Outline 面板共享侧栏可用高度，内容过长时各自内部滚动；两个面板都有折叠按钮。Files 折叠后只留顶部标题行，Outline 折叠后只留底部标题行。
- Files 面板当前使用和 Outline 一致的紧凑列表布局，内容不足时保持顶部小块列表；不要让 grid item 拉伸成填满面板的大卡片。
- 左下角 workspace/session 信息现在在所有视图下保持常态可读，不再依赖侧栏 hover 才显形；后续不要把 `.sidebar-meta` 重新降成极低 opacity，否则不同视图下会因鼠标落点不同出现文字清晰度不一致。
- Script `Syntax` 开关已从“状态切换但视觉不明显”修成真实表现：按钮有 pressed/off 状态，Monaco decorations 改为 inline text style + overlay background，标题、对白、旁白、prompt、choice 与当前 block 会得到安静的语义样式。
- 行级稳定身份不再是纯前端占位：新增 `SelfHostedEditorLineMapBridge`，开发宿主暴露 `/api/line-map-refresh`，通过现有 Internal CLI/Tooling `refresh-l10n-line-map-project` 在临时 workspace 中生成真实 line-map；开发宿主现在按 `sessionId` 记住上一轮 line-map，前端默认不再每轮上传整份 sidecar，但仍可用显式 `existingLineMap` 兜底，让 Tooling 负责迁移稳定 `line_...`。对白、prompt、choice 等本地化身份行显示真实 `line_...`，跳转等非本地化身份行不显示身份文本，不要伪造稳定 id。
- 行号 hover 的稳定身份文本现在只在 status 为 `available` 时显示；`@`、跳转、旁白等未追踪行直接省略身份文本，不显示 `not tracked` / `line id not loaded` 占位。`ScriptLineIdentityModelBuilder` 已兼容 camelCase / PascalCase line-map JSON 字段。开发宿主读取 Tooling 生成的 `inscape.line-map.json` / refresh report 时必须剥离 UTF-8 BOM；否则 Node 端 `JSON.parse` 会失败，前端会静默回到 `provider: unavailable`，表现为 hover 行号永远只显示块内行号。

仍是临时或下一步应替换的部分：

- `ScriptDocumentModelBuilder` 仍是前端 UI-only 草模，用于离线 fallback、本地化草表和部分提示层；Graph 与 Preview 的正常服务路径已消费 Compiler project graph。长期应继续用 `Tooling` / `LanguageServer` / `Runtime` 输出替换，而不是扩写 parser 语义。
- 诊断虽已优先走 LanguageServer project probe，但当前仍只把 diagnostics marker 贴回活动文件；真正的多文件 Problems、跨文件 rename、长期会话缓存和桌面后端进程仍待补。
- Graph 节点位置仍是会话内 `savedPositions`，尚未写入 graph layout sidecar；画布缩放/平移、连接合法性反馈、端口命中高亮仍可继续细化。
- line-map bridge 当前仍走开发预览服务器 + CLI 临时 workspace，是正确复用 Tooling 语义的第一步；现在已经有第一层 `sessionId` sidecar 记忆，但未来桌面客户端仍应改为正式 Editor Backend / Tooling 会话桥，而不是每轮通过 HTTP dev server 启动 CLI。
- L10N 视图已接入真实 alignment review presenter，并已补上真实旧 CSV 选择、宿主侧 review 筛选、更清楚的 CSV 会话状态、linked baseline 的 clean / unsaved 宿主状态，以及真实 updated CSV 导出 / native file handle 直写：`/api/localization-review` 负责 review presenter，`/api/localization-update` 负责把旧 CSV 与 draft overrides 交回 CLI 产出 updated CSV，宿主层只在可用时负责把结果写回已链接文件。P2 Round 10 已决定不在本阶段补批量审校动作，后续若重启应先补共享 batch contract。
- Preview 内容已来自 Compiler project graph；当 Runtime 可用时，节点内 Static / Flow 进度也开始消费 Runtime 阅读状态。当前 Runtime dev-host 已有第一层 `sessionId` 状态边界；仍未落地的是桌面端真正长生命周期 Runtime 进程，以及 Runtime 不可用时如何继续缩小本地 fallback 面积。
- `runtime-project` / `/api/runtime-state` / `/api/runtime-action` 现已覆盖 Start、`advance-flow` / `rewind-flow` / `continue` / `rewind` / `choose` 的最小 action 契约；HTTP dev-host 可以按 `sessionId` 记住最新 compact snapshot，Preview 的节点内 Flow 进度在 Runtime 可用时已受 Runtime state 驱动，但正式桌面端 Runtime 会话仍未落地。

当前工作树提示：最近一次复查时 `git -c safe.directory=D:/LabProjects/Inscape status --short --branch` 为干净状态。新 Agent 仍应在提交前重新执行 status，确认没有用户未提交改动；若出现未跟踪或未提交文件，只能按任务边界处理，不要回滚用户已有文档和样例改动。

### 2026-05-19 最新收口

- SelfHostedEditor 主界面已确认需要按“硬重置”路线继续推进：用户明确给出当前壳的主观评分远低于 VSCode / Inky / Notion，并补充了多张对标截图。后续接手时，不要再把“功能链完整”误判成“值得体验”；在主编辑 / 预览双栏的沉浸式写作体验过线前，优先级应放在视觉层级、默认可见性和版心构图收口，而不是继续堆新视图或新功能。
- SelfHostedEditor 的 workspace 底座已从“多文件导入”推进到“多文件语义探测”第一版：开发宿主桥现在会把 workspace 文档清单与活动文件相对路径一起发给 diagnostics / completion / definition / references / hover 查询，并优先改走 `LanguageServer` project probe；当前仍只把诊断贴回活动文件，跨文件 rename、真正的多文件 Problems 与长期桌面会话桥仍待后续接力。
- SelfHostedEditor 的 references 交互当前已明确不能回退到 inline peek：现状是自定义 overlay，会显示跨文件来源标签并可切换到同一 workspace 的其他脚本；后续继续沿这条线完善，而不是重新接受会改排版流的候选面板。
- Goal 7 的 `off|click|selection` 真实 VSCode smoke 已通过。
- Goal 11.1 的“LanguageServer 不可用 -> CLI diagnostics fallback”真实 VSCode smoke 已通过。
- VSCode 的 diagnostics、node completion、definition、references、hover、document symbols 与 Host Schema capability 已切到常驻 `LanguageServer` stdio 会话；CLI fallback 继续保留，但不再是常态热路径。
- Goal 10.3 / G10.4 第一版都已落地：`LocalizationAlignmentAuditDomain` 现已支持 `inscape.localization-alignment` JSON report、高置信单候选 `changed`、低置信 / 并列候选 `conflict`，并为候选附带 `reason` 说明；CLI 继续通过显式 `audit-l10n-alignment-project <root> --from old.csv [-o l10n-review.json]` 输出，不改变 `update-l10n-project` 默认行为。
- Localization review 展示已补最小闭环：`audit-l10n-alignment-project` 新增 `--format text`，VSCode 新增显式 `Inscape: Review Localization Alignment` 命令，Tools Menu 也增加“审查本地化对齐候选”，可直接生成 text / json 审查报告并打开输出文件；如果输出 json，完成后还能直接弹出 Quick Pick 审查项并跳回源位置。
- Localization review Quick Pick 已继续细化：主列表现在会带 `status / review / translation / source / candidate summary`，选中后还能继续在二级 Quick Pick 里比较候选并直接跳到 candidate 源位置；当前 Tooling presenter 会为超过两个的候选摘要显示 `+N more`，标题里的 candidate count 也已按单复数显示，并提供 `show-candidate-diff` 二级动作，用 current / previous / translation / reason 摘要辅助人工审查，VSCode 只负责显示动作。
- Stable node map review 也已补最小交互闭环：`Review Stable Node Map Changes` 不再只有原始 JSON 报告文件，现可弹出 review item 列表，并继续跳到当前标题、候选标题，或打开 node map / raw report。
- Stable node map review 现在又补了一刀可操作闭环：manual-review 候选已支持显式 `Apply candidate stable id`，可直接把选中的旧 stable id 应用回 node map，并移除对应的重复临时项；同时会保存 `.review-backup.json`，支持 `Revert last applied stable id` 回退上一次应用结果，也已支持 `Preview candidate stable id` 生成 dry-run `.review-preview.json`。
- 2026-05-19 用户重新体验了 VSCode LanguageServer 主路径，主观反馈“体验不错”；预构建产物路径下的冷启动 / 热会话都没有明显卡顿，日志里也未出现 `LanguageServer session exited ...`、`[LanguageServer stderr] ...` 或 Inscape request failure，说明当前常驻 stdio 会话基本稳定。Preview webview CSP 已补到 fallback 页面和主预览模板；当前 Inscape 侧剩余体验尾项主要回到 `Ctrl+Hover` 下划线显示稳定性。其他大量 warning 基本来自 Copilot / Git / C# 等外部扩展，不应误判为 Inscape 语义热路径问题。
- `Ctrl+Hover` 体验已继续收口一刀：正文 / 选项文本的 transient link range 现在更严格排除了 `? ` 与 `- ` 前缀，避免选择提示 / 选项前缀区域也进入链接态；后续只剩更细的人体工学验证，而不再是明显范围错误。
- 2026-05-19 用户追加指出：VSCode 最近新功能虽然可用，但部分实现已经再次偏离重构 / 命名指南。后续接手时不要只盯功能 TODO；必须把 VSCode 重构守规重新列回近期计划，并把“每完成一个新功能节点就做命名 / 分层 / 入口厚度自检”当成默认工作流。
- 2026-05-19 用户进一步澄清了 `Resources / Scripts` 语义：它们的前提是模块足够独立；一旦采用这对目录，`Scripts` 应是代码侧父层，与 `Resources` 对偶，而不是只放 package-only 开发脚本。按这个口径，当前 `src/ExternalSupport/VSCode` 里业务源码仍与 `Scripts` 平级的状态属于待迁移结构债。命名例外第一轮也已启动收口：`extension.js` -> `Scripts/ExtensionManifestEntry.js`，`preview-template.html` -> `PreviewHtmlDocumentTemplate.html`，`assert-preview-navigation-contract.js` -> `PreviewNavigationContractCheck.js`，`check-preview-source-sync-modes.js` -> `PreviewSourceSyncContractCheck.js`。后续还需继续做 VSCode 目录重排并同步所有引用路径。
- G13.5 目录迁移已进入真实执行：当前 `Scripts/` 下已承接 `ExtensionManifestEntry.js`、`Entries/`、`DslScript/`、`Localization/`、`Preview/`、`EditorAuthoring/`、`HostSchema/`、`HostBinding/`；`DevScripts/` 继续只保留 package-local 开发脚本，避免误占最终 `Scripts` 语义位。
- 2026-05-19 还补了一条 Localization 分层判断：`src/ExternalSupport/VSCode/Scripts/Localization` 当前可以保留，但只能作为宿主适配壳理解，不能默认视为长期最终归宿。命令入口、QuickPick、文件对话框、打开报告、源跳转属于 VSCode 适配；alignment review contract、candidate scoring、report model / view-model 组织如果将来别的宿主也会需要，应继续优先评估下沉到 `Internal/Tooling`，或在需要编辑器查询能力时进入 `LanguageServer`。
- 2026-05-19 还补了一条 line identity 实现原则：后续行级 sidecar / line stable id 方案以 Yarn Spinner 作为重点参考对象；当 Inscape 自己的拆行、并行、刷新 diff、debug 展示或翻译单元 identity 规则出现悬而未决的设计点时，优先参考 Yarn Spinner 的显式 line id / 本地化工作流。
- 2026-05-19 line sidecar 主线已启动第一版实现：Tooling 已新增 `LocalizationLineMapModel`、`LocalizationLineMapRefreshDomain` 与 reader/writer 草案；VSCode 已接入 `refresh-l10n-line-map-project` 命令入口，并在 `preview.sourceSyncMode` 新增 `debug` 值。当前 debug hover 已通过 `LocalizationLineMapDebugController` 接入真实 `blockId / lineId / lineNumber / kind` sidecar 信息，并在存在 speaker 时显示 `speaker`；debug hover 缓存现在按 sidecar mtime/size 失效，缺失文件不再永久缓存，刷新或恢复 sidecar 后可读到最新数据。刷新命令也已补第一版 `Show Summary`，能直接提示 changed / added / removed 统计，并新增 `Show Details` 查看 block/change 摘要且支持直接跳到对应 source 行。当前规则回归已覆盖中间插删行、拆行保留首行 id、并行保留首行 id、重复句邻接修改、复杂替换按 remove/add 处理，并已支持通过 `localization.lineMap` 配置 sidecar 路径、writer `.backup` 快照、`Restore Backup` 恢复入口与 `LastSourceFingerprint` 漂移字段。drift 检测现在也已进入 refresh result/status 与 VSCode 显式决策流（Continue / Show Details / Restore Backup / Cancel），并附带操作建议；CLI `--report` 也已输出完整 refresh result，方便本地化模块后续直接消费。下一步重点回到本地化模块消费整合。
- 2026-05-19 Goal 15 第一版已完成：`audit-l10n-alignment-project` 会读取 `localization.lineMap` / 默认 `inscape.line-map.json`，在 line sidecar 可用且未 drift 时把 `lineId` / line fingerprint / block-local line order 作为候选评分信号；JSON / text report 现在会输出顶层 `lineIdentity` 状态以及 item / candidate 的 `lineId`、`lineFingerprint`、`lineIdentityStatus`。缺失 sidecar 保持旧行为；旧格式无 `LastSourceFingerprint` 标为 `legacy`；stale sidecar 标为 `drift` 且不参与评分。
- 2026-05-19 首轮 Localization 盘点已补结论：`LocalizationCommand` 目前仍主要是 VSCode 宿主适配，可暂留 VSCode；`LocalizationReviewController` 虽然还直接依赖 QuickPick 和 source jump，但其中 `report -> item list -> candidate action list -> jump` 的交互骨架已经接近跨宿主契约。当前已继续推进：presenter model 组织已下沉到 `Internal/Tooling/Localization/LocalizationReviewPresenterModelBuilderDomain` 并挂入 `LocalizationAlignmentReportModel.Presenter`，VSCode 侧仅保留 `Scripts/Localization/Controllers/LocalizationReviewController` 作为宿主交互壳，以及 `Scripts/Localization/ViewModels/LocalizationReviewQuickPickAdapter` 作为 QuickPick 标签映射层。`LocalizationAlignmentAuditDomain`、`LocalizationAlignmentReportModel`、candidate scoring 与状态机已位于 `Internal/Tooling`，这条边界目前判断正确。
- Localization review 查询能力当前不进入 `LanguageServer`：第一版继续由 CLI / Tooling 产出完整 alignment report 与 `Presenter`，宿主消费完整 report。只有未来需要 item / candidate 增量查询、长会话缓存或多宿主共享交互状态时，再扩 `LanguageServer` API。
- G10.4.2 也已开始继续细化：当前 candidate scoring 在相似度并列时，会先比较 ranking penalty（sequence / source line 距离信号），再比较 sequence distance，减少“文本相似但上下文更远”的旧译文排到前面的情况；第二轮又补了 context shape（首词 / 末词 / token 数）信号，第三轮再补 keyword fingerprint（长度 >= 4 的 token 集），第四轮继续补了 neighbor shape（首词 / 第二词 / 末词）与回归测试，第五轮又补了同节点前后翻译单元 local context fingerprint 与 `same-local-context` reason，第六轮再把轻微改写的前后文识别为 `near-local-context`，第七轮让 `same-line-id` 收敛同窗口内的近似文本候选，第八轮允许精确 line id 在文本大改时仍保留人工审查候选，第九轮让精确 line id 在排序上优先于纯文本相似度，第十轮把 `rankPenalty` 输出到 JSON / text report candidate，第十一轮又把 `rankPenalty` 接入 Tooling presenter 的 candidate summary / action status / diff detail，第十二轮把 current / candidate `lineId` 接入 Tooling presenter 的 item / candidate / diff detail，第十三轮让 presenter 同步显示 `lineIdentityStatus`（例如 `available` / `missing`），第十四轮再把 line fingerprint 以短 `fp` 摘要接入 review detail，第十五轮把有 line id 的候选身份摘要接入 action status，第十六轮把 current / previous line identity 摘要接入 diff action summary，方便人工审查同时看到身份信号和排序依据，而不改变自动继承边界。
- 2026-05-19 首轮 VSCode 巡检已确认几个具体风险：`EditorAuthoringCommand` 与 `LocalizationCommand` 最近都再次吸收了 report review UI、二级 Quick Pick、source jump 和 CLI invocation 编排，单文件角色变宽；`Scripts/ExtensionManifestEntry.js` 也出现重复注入 `openLocation` / `locationFromPayload` 的装配重复。当前已完成三刀加一层轻量收口：`LocalizationCommand` 的 review UI 已拆到 `LocalizationReviewController`，stable node map review UI 已拆到 `StoryNodeMapReviewController`，`Scripts/ExtensionManifestEntry.js` 里的 location / open file glue 已开始收成共享注入块，两个 command 的 success action 分发也分别收成 `handleSuccessSelection` / `handleNodeMapSelection`。后续建议继续防止 command 入口层重新吸回更多流程，并持续防止组合根参数表横向膨胀。
- VSCode 节点后结构自检已有第一版脚本：`npm --prefix src/ExternalSupport/VSCode run check:structure` 会检查 `Scripts` 顶层业务目录、Role 目录、文件 / class 角色后缀，以及 `Helper` / `Support` / `Manager` / `Utils` 等弱命名。后续如发现新的结构回退模式，应优先扩展该脚本或明确记录豁免，而不是只靠人工记忆。
- 当前主线优先级可继续细化 Goal 10：下一步更适合做候选评分 / review 展示细化，而不是回退到自动继承旧译文。
- 低优先级体验尾项：编辑区选项文字 `Ctrl+Hover` 的可点击下划线显示仍不稳定，但 `Ctrl+Click` 行为符合预期；`selection` 模式只驱动“已打开预览”的轻量跟随，不主动弹出新预览面板。

Inscape 当前处于第一阶段：DSL 与轻工具链已经形成可运行原型。当前长期架构已经收敛为 Internal 与 ExternalSupport 两层：Internal 包含 `Compiler`、`Tooling`、`Cli`、`LanguageServer` 与未来 `Runtime`；ExternalSupport 包含外部平台支持，例如 `VSCode` 与 `UnityPlugin`。UnitySample 实验 adapter 继续保留，但只作为 ExternalSupport 过渡样例，不代表最终 Host Bridge 方案。

当前主动重构范围覆盖 Internal 侧的 `Inscape.Compiler`、`Inscape.Cli`、`LanguageServer` / `Tooling` 契约，以及 ExternalSupport 侧的 `src/ExternalSupport/VSCode` 编辑器扩展。`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 视为 ExternalSupport 原型，暂不纳入这一轮内部重构，只保留隔离和回归样例职责。

项目级研发认知：当前没有已发布版本和真实用户项目，因此不应为了旧版语法、旧配置或旧工具行为承担兼容成本。任何 legacy / fallback 都默认视为待迁移、待删除的研发债；只有为了短期切换验证才允许临时保留，并且必须同时记录删除节点。

2026-05-17 已完成 Goal 0 研发期 legacy 清除：G0.1 已将主样例 `samples/court-loop.inscape` 从 `:: node.name` 迁到中文 `# 标题`，同步更新所有主样例跳转目标，并将内部测试 fixture 全部迁到 `#` 标题。G0.2 已移除 Compiler / LanguageServer 对 `:: node.name` 的解析和诊断兼容文案；`:: old.node` 当前会作为节点外内容报错，不再创建节点。G0.3 已移除 VSCode 对 `:: node.name` 的 TextMate 高亮、workspace index 扫描、snippet、编辑器样式和当前文档入口。G0.4 已移除 legacy `[kind: alias]` / `[timeline: alias]` inline host binding 的 VSCode 补全、Hover、Ctrl+Click、workspace 扫描、UnitySample bracket timeline 导出和样例文件。G0.5 已移除 VSCode 编辑器扩展作者体验对 `unitySample.roleMap` / `unitySample.bindingMap` 的 fallback；ExternalSupport 的 `unitySample` 字段只保留为样例命令配置入口。G0.6 已清理当前行为文档中的 legacy / compatibility 口径；历史背景只保留在 ADR、审计或迁移说明中。Goal 5 已完成当前阶段：VSCode node outline、completion、definition、references、hover、document symbols 与 Host Schema capability 已切到 LanguageServer 语义热路径，并在 2026-05-19 收口为常驻 `LanguageServer` stdio 会话；CLI fallback 只保留为失败兜底。2026-05-18 已修正编辑器扩展路径：VSCode 是第一方维护的外部编辑器平台支持，已收敛到 `src/ExternalSupport/VSCode`；`EditorExtensions` 类别层和 `vscode-inscape` 包名目录已删除；VSCode 内部目录命名审计见 [VSCode Directory Naming Audit](vscode-directory-naming-audit.md)。G9.2 已建立 Internal / ExternalSupport 通用模块资源脚本边界计划。G9.3 / G9.4 已收口 VSCode package 的资源、脚本和源码目录命名。G9.5 已将 Tooling Preview HTML/CSS/JS 模板从 `PreviewHtmlRendererDomain` 的 C# 字符串中拆到 `src/Internal/Tooling/Resources/Preview`，renderer 只负责注入 JSON 与样式变量。G9.6 已新增 [UnityPlugin Package Boundary Plan](unity-plugin-package-boundary-plan.md)，冻结当前 UnityPlugin 边界：`Inscape.Adapters.UnitySample` 是 .NET sample adapter，`Inscape.UnitySample.Cli` 是样例命令入口，`unity-bird-importer` 是 Bird Editor importer 原型；真实 Unity package 确定前不创建空 `Scripts` / `Resources`。Goal 7 已补刷新状态、版本保护、局部更新边界、预览定位契约检查和第一版可选同步模式：VSCode preview 在防抖等待和实际刷新时 webview 显示轻量“等待刷新...” / “刷新中...”提示；保存或显式刷新会取消已挂起的 debounce timer，旧刷新完成不会清掉新一轮状态；[VSCode Preview Refresh Strategy](vscode-preview-refresh-strategy.md) 明确 VSCode 只局部处理状态、源码定位和纯 UI 状态，涉及 graph、diagnostics、source map、节点内容或 Host Schema / Host Bridge 能力变化时继续全量重渲染；VSCode package 新增 `check:preview-navigation` 静态契约检查，防止正文 / 选项文本回退到 `DocumentLinkProvider` 或断开 `DefinitionProvider` + selection bridge；`inscape.preview.sourceSyncMode` 新增 `off|click|selection` 三种模式，默认 `click` 保持现有 Ctrl+Click / 显式命令定位，`selection` 只驱动已打开预览；同时新增 `check:preview-source-sync` 自动化自检，覆盖三种模式的关键边界，并补了可重复手动 smoke 入口 `smoke:preview-source-sync` 与 [VSCode Preview Source Sync Smoke](vscode-preview-source-sync-smoke.md)。2026-05-19 又根据真实手动 smoke 反馈补了一刀：choice 行的预览 reveal 命中区扩大到 `->` 之前整段可见选项文本，但 reveal payload 仍锚定到修剪后的正文起点；smoke 启动脚本改为 `--new-window`，并在文档里明确“每次只跑一种模式、关闭前一个 smoke 窗口”以及“selection 指源码编辑器里的文本选区，不是预览面板点击”。Goal 7 的真实 VSCode smoke 与 Goal 11.1 的“LanguageServer 不可用 -> CLI diagnostics fallback”真实 VSCode smoke 也都已在 2026-05-19 收口完成。Goal 10.2.3 也已在同日完成：`StoryNodeMapUpdateDomain` 会输出 `inscape.node-map-update-report`；CLI `update-node-map-project` 新增 `--report`；VSCode 新增显式 `Inscape: Review Stable Node Map Changes`，并在显式 `Update Stable Node Map` 发现 `manual-review` / `conflict` 时给出审查入口。Goal 10.3 / G10.4 第一版也已完成，下一步建议继续 G10.4.2 candidate scoring 与 Goal 14 line sidecar 的本地化模块消费整合。

### 2026-05-11 当前交接结论（最新）

- 2026-05-12 已开始按目录优先蓝图执行实际迁移：目录骨架与规则 README 已提交，Internal 侧 `.NET` 项目已迁入新路径，当前 Compiler 项目文件为 `src/Internal/Compiler/Inscape.Compiler.csproj`，Tooling 位于 `src/Internal/Tooling`，Cli 位于 `src/Internal/Cli/Inscape.Cli`。
- 2026-05-12 已完成 Compiler 项目名、命名空间与入口门面收敛：`src/Internal/Compiler/Inscape.Core/Inscape.Core.csproj` 已迁为 `src/Internal/Compiler/Inscape.Compiler.csproj`，`Inscape.Core.*` 已改为 `Inscape.Compiler.*`，原 `InscapeCore` 门面已改为 `CompilerEntry`。2026-05-15 已继续把执行单文件编译的实现收敛为 `DslScript/Domains/DslScriptCompilerDomain`。
- 2026-05-12 已同步更新 `Inscape.slnx`、`ProjectReference`、VSCode fallback CLI 项目路径、CLI 命令速查示例和相关文档命令路径。验证通过：`dotnet build Inscape.slnx --no-restore` 与 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。由于项目路径变化，执行过一次 `dotnet restore Inscape.slnx --configfile NuGet.Config` 来刷新项目图缓存。
- 2026-05-12 已迁移 VSCode 前端源码：`tools/vscode-inscape` -> `src/ExternalSupport/VSCode`。到 2026-05-15，扩展内部已完成 B 阶段拆分；2026-05-18 入口层目录已从 `ExtensionEntry` 收敛为 `Entries`，预览目录已从 `PreviewWebview` 收敛为 `Preview`，DslScript providers / diagnostics 已从 `LanguageFeatures` 与 `WorkspaceIndex` 收敛到 `DslScript`，EditorAuthoring providers 已收敛到 `EditorAuthoring`，HostBinding / HostSchema providers 已收敛到各自业务目录；`LanguageFeatures` / `WorkspaceIndex` 过渡目录已删除。当前验证入口为 `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`。
- 2026-05-12 已迁移 Unity 外部支持源码：`src/Inscape.Adapters.UnitySample` -> `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，`tools/unity-bird-importer` -> `src/ExternalSupport/UnityPlugin/unity-bird-importer`。当日 `Inscape.slnx` 已移除 UnitySample 的直接项目条目，但 CLI 与 tests 仍会传递构建该项目；这个遗留点已在 2026-05-13 通过外部支持命令边界拆分解决。
- 2026-05-13 已完成外部支持命令边界拆分：UnitySample 命令迁入 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`，UnitySample 回归测试迁入 `tests/ExternalSupport/UnityPlugin/Inscape.UnitySample.Tests`。`src/Internal/Cli/Inscape.Cli` 与 `tests/Internal/Inscape.Tests` 不再引用 UnitySample，默认 `Inscape.slnx` 构建不再传递构建 UnityPlugin。
- 2026-05-13 已开始整理 Tooling 内部目录：`Inscape.Tooling.csproj` 已提到 `src/Internal/Tooling` 根目录，源码按 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 的 `Domains` / `Models` 目录落位。命名空间暂保留 `Inscape.Tooling`，后续再按业务目录决定是否拆命名空间。
- 2026-05-13 已开始整理 CLI 内部目录：`src/Internal/Cli/Inscape.Cli` 下新增 `Entries`、`Commands`、`Providers`、`ViewModels`，分别承载 `CliCore`、具体命令、命令元数据 provider 和输出 DTO。命名空间暂保留 `Inscape.Cli`。
- 2026-05-13 已开始整理 Internal 测试目录：`tests/Internal/Inscape.Tests` 下新增 `Entries`、`Shared`、`Compiler`、`Cli`、`PreviewLocalization`，先按现有测试文件边界落位，测试 runner 仍保持轻量手写模式。
- 2026-05-13 已开始整理 UnitySample CLI 内部目录：`src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli` 下新增 `Entries` 与 `Commands`，命令仍保持 ExternalSupport 独立验证入口，不进入默认 solution。
- 2026-05-13 已启动 VSCode 拆分主线 A1：`src/ExternalSupport/VSCode` 下已建立 `ExtensionEntry`、`Commands`、`LanguageFeatures`、`WorkspaceIndex`、`Bridges`、`PreviewWebview`、`Styles`、`Schemas` 目录骨架和规则 README；`extension.js` 尚未拆分。
- 2026-05-13 已推进 VSCode 拆分 A2.1：`HostSchemaCommand` 已从 `extension.js` 迁入 `Commands/HostSchemaCommand.js`，`extension.js` 通过依赖注入保留原行为。
- 2026-05-13 已推进 VSCode 拆分 A2.2：`EditorAuthoringCommand` 已从 `extension.js` 迁入 `Commands/EditorAuthoringCommand.js`，工具菜单、样式文件和语法速查入口仍由 `extension.js` 注册。
- 2026-05-13 已推进 VSCode 拆分 A2.3：`LocalizationCommand` 已从 `extension.js` 迁入 `Commands/LocalizationCommand.js`，导出 / 更新本地化命令仍由 `extension.js` 注册。
- 2026-05-14 已推进 VSCode 拆分 A2.4：`PreviewCommand` 已从 `extension.js` 迁入 `Commands/PreviewCommand.js`，预览打开 / 切换 / selection reveal 命令仍由 `extension.js` 注册。
- 2026-05-14 已推进 VSCode 拆分 A2.5：`PreviewRevealBridge` 已从 `extension.js` 迁入 `Bridges/PreviewRevealBridge.js`，selection-to-preview reveal 状态不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.6：`DslScriptNodeProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/DslScriptNodeProvider.js`，节点声明、jump 引用、node/jump hover 与导航扫描不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.7：`DslScriptSpeakerProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/DslScriptSpeakerProvider.js`，speaker 扫描、补全、定义、引用与 hover 不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.8：`HostBindingProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/HostBindingProvider.js`，host binding 扫描、补全、定义与 hover 不再由入口文件内联承载。
- 2026-05-14 已推进 VSCode 拆分 A2.9：`DslScriptMetadataProvider` 已从 `extension.js` 迁入 `WorkspaceIndex/DslScriptMetadataProvider.js`，metadata 引用与 hover 不再由入口文件内联承载；当前 `extension.js` 已无内联 command / bridge / workspace provider 类。
- 2026-05-14 已按命名规范收敛 VSCode 已拆出文件：移除内部默认 `Inscape` 前缀与类型名里的 `Workspace` 前缀，当前已拆出命名为 `HostSchemaCommand`、`EditorAuthoringCommand`、`LocalizationCommand`、`PreviewCommand`、`PreviewRevealBridge`、`DslScriptNodeProvider`、`DslScriptSpeakerProvider`、`HostBindingProvider` 与 `DslScriptMetadataProvider`。
- 2026-05-14 已推进 VSCode 拆分 A3.1：`DslScriptCompletionProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptCompletionProvider.js`，入口文件只负责依赖注入与 VSCode provider 注册。
- 2026-05-14 已推进 VSCode 拆分 A3.2：`DslScriptDefinitionProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptDefinitionProvider.js`，speaker / host binding / metadata / preview reveal / jump target 定义跳转仍复用既有 provider 与 bridge。
- 2026-05-14 已推进 VSCode 拆分 A3.3：`DslScriptReferenceProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptReferenceProvider.js`，speaker 与 node 引用查找继续复用 workspace index。
- 2026-05-14 已推进 VSCode 拆分 A3.4：`DslScriptHoverProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptHoverProvider.js`，speaker / host binding / metadata / node hover 继续复用 workspace index。
- 2026-05-14 已推进 VSCode 拆分 A3.5：`DslScriptDocumentSymbolProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptDocumentSymbolProvider.js`，outline 仍只做当前文档节点扫描。
- 2026-05-14 已推进 VSCode 拆分 A3.6：`DslScriptCodeLensProvider` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptCodeLensProvider.js`，节点入边计数继续复用 workspace index。
- 2026-05-14 已推进 VSCode 拆分 A3.7：`DslScriptDiagnosticModelScheduler` 已从 `extension.js` 迁入 `LanguageFeatures/DslScriptDiagnosticModelScheduler.js`；B3.1 LanguageFeatures provider / diagnostics 调度已补齐，`extension.js` 当前只保留注册与依赖注入。
- 2026-05-14 已推进 VSCode 拆分 B3.2.1：`PreviewEditorProvider` 已从 `extension.js` 迁入 `PreviewWebview/PreviewEditorProvider.js`，custom editor 注册仍由入口文件负责。
- 2026-05-14 已推进 VSCode 拆分 B3.2.2：`PreviewHtmlProvider` 已从 `extension.js` 迁入 `PreviewWebview/PreviewHtmlProvider.js`，loading / error HTML 与 HTML escape 不再由入口文件承载。
- 2026-05-14 已推进 VSCode 拆分 B3.2.3：`PreviewRefreshController` 已从 `extension.js` 迁入 `PreviewWebview/PreviewRefreshController.js`，预览刷新 timers、render cache 与 version guard 不再由入口文件承载。
- 2026-05-14 已推进 VSCode 拆分 B3.2.4：`PreviewSourceController` 已从 `extension.js` 迁入 `PreviewWebview/PreviewSourceController.js`，webview openSource 消息、可见编辑器复用与源码 viewColumn 选择不再由入口文件承载。
- 2026-05-14 已推进 VSCode 拆分 B3.2.5：`PreviewInvocationProvider` 已从 `extension.js` 迁入 `PreviewWebview/PreviewInvocationProvider.js`，preview-project 的 CLI executable / assembly / dotnet run fallback 解析不再由入口文件承载。
- 2026-05-15 已推进 VSCode 拆分 B3.3.1：`EditorStyleController` 已从 `extension.js` 迁入 `Styles/EditorStyleController.js`，编辑器样式读取、decoration ranges 与状态清理不再由入口文件承载；默认 editor style 也由 Styles 模块导出供作者命令复用。
- 2026-05-15 已推进 VSCode 拆分 B3.3.2：`StyleDefaults` 已进入 `Styles/StyleDefaults.js`，editor / preview 默认样式不再由 `extension.js` 承载；`EditorAuthoringCommand` 仍通过依赖注入复用默认样式创建配置文件。
- 2026-05-15 已推进 VSCode 拆分 B3.4.1：`ExtensionRegistrationController` 已进入 `ExtensionEntry/ExtensionRegistrationController.js`，`activate()` 中的 VSCode subscription / provider / command / custom editor 注册顺序不再由入口函数内联承载。
- 2026-05-15 已将 B 阶段剩余工作拆成 5 个 TODO 节点：B3.4.2 ExtensionEntry 继续压薄、B3.4.3 diagnostics 调用辅助、B3.4.4 配置与工作区文本读取辅助、B3.4.5 位置与范围辅助、B3.5 B 阶段收口验收；后续每完成一项都要自检命名 / 边界、推送并勾选对应 TODO。
- 2026-05-15 已完成 B3.4.2：`ExtensionLifecycleController` 已进入 `ExtensionEntry/ExtensionLifecycleController.js`，output channel、logging、diagnostics collection 与 diagnostics scheduler 创建不再由 `extension.js` 承载；`activate()` 当前只委托 lifecycle controller。
- 2026-05-15 已完成 B3.4.3：`DslScriptDiagnosticModelController` 已进入 `LanguageFeatures/DslScriptDiagnosticModelController.js`，diagnostics scheduler 依赖的 compiler invocation、diagnostic mapping 与 extension diagnostic 构造不再由 `extension.js` 承载；VSCode 侧仍只消费 CLI / Compiler 输出，不重写 parser 语义。
- 2026-05-15 已完成 B3.4.4：`EditorAuthoringDataProvider` 已进入 `WorkspaceIndex/EditorAuthoringDataProvider.js`，项目配置读取、CSV 解析和 `.inscape` 文本源收集不再由 `extension.js` 承载；类型名未使用 `Helper` / `Support` / 泛 `Workspace*` 前缀。
- 2026-05-15 已完成 B3.4.5：`EditorAuthoringLocationProvider` 已进入 `LanguageFeatures/EditorAuthoringLocationProvider.js`，location/payload/open location、range trim、display path 与 clamp 不再由 `extension.js` 承载；source map / reveal payload 字段语义保持不变。
- 2026-05-15 已完成 B3.5：B1/B2/B3 已按重构计划收口，VSCode extension 拆分父项已勾选；`extension.js` 当前保留 VSCode 注册入口、实例装配和少量入口级 glue，已移除已知 `Helper` / `Support` / `Manager` / `Utils` 弱语义 JS 命名与 `DocumentLinkProvider` 回退风险。下一大节点建议进入 C 系列：统一 source map / reveal payload 数据契约，并为未来 LanguageServer 替换 VSCode 轻量扫描做准备。
- 2026-05-15 已按最新命名口径补做 B 后修复：命名空间不继续细分到目录一一对应，Internal / ExternalSupport 主要由目录区分；Compiler 旧类型名和文件名已收敛为 `DslScriptCompilerDomain`、`DslScriptParserDomain`、`StoryGraphCompilerDomain`、`StoryGraphCompilationValidatorDomain`、`StoryGraphAnchorValidatorDomain`、`DslScriptCompilationResultModel`、`StoryGraphCompilationResultModel`、`DslScriptSourceModel`、`SourceSpanModel` 与 `TextContractStableHashDomain` 等角色后缀命名。
- 2026-05-15 已启动 C 阶段第一小节点：新增 [Source Location Contracts](source-location-contracts.md)，明确 Compiler source location 使用 1-based `line` / `column`，编辑器 reveal location 使用 0-based `line` / `character` / `length`；同时修复 Preview HTML 中 Compiler source -> 编辑器坐标转换，避免源码按钮、metadata 点击、源码侧 reveal 匹配和节点定位继续混用两套坐标。
- 2026-05-15 已推进 C2.1：Preview -> VSCode 的 `openSource` payload 已优先发 `character`，VSCode `PreviewSourceController` 读取 `character` 并保留旧 `column` fallback；Compiler / diagnostics 的 `column` 只在转换边界内使用。
- 2026-05-15 已推进 C2.2：内部测试已覆盖源码按钮、diagnostics 点击、metadata 点击和 VSCode 旧 `column` fallback，防止 reveal payload 再次退回混用字段。
- 2026-05-15 已推进 C2.3：已巡检 VSCode selection reveal、preview reveal、openSource 与 location provider，`column` 仅保留在 Compiler / diagnostic 输入和旧 payload fallback 边界；diagnostic 映射内部变量已改为 editor `character` 语义。
- 2026-05-15 已推进 C1.1：内部测试已覆盖 source map 的节点、metadata、中文对白、选项提示、选项项、默认跳转 source span，以及跨文件缺失目标 diagnostic 的 sourcePath / line / column。
- 2026-05-15 已推进 C3.1：新增 [Workspace Index Contract](workspace-index-contract.md)，定义 VSCode 当前轻量扫描与未来 LanguageServer 可共享的 nodes、node references、speakers、host bindings、metadata、schema capabilities 过渡模型；该模型只承载 authoring hint，不替代 Compiler 语义真相。
- 2026-05-15 已推进 C3.2：VSCode `WorkspaceIndex` provider 输出已非破坏式补齐契约字段：node references 增加 `target`，speakers / host bindings 增加 `sourceKind`，host bindings 增加 `name`，metadata 增加 `key` / `value`。
- 2026-05-15 已推进 C3.3 / C4.1：创建 `src/Internal/LanguageServer/Inscape.LanguageServer.csproj` 并加入 `Inscape.slnx`；当前入口 `LanguageServerEntry --capabilities` 输出基线能力清单，`EditorLocationModel` 对齐 source location / workspace index 的 0-based `line` / `character` / `length` 契约。
- 2026-05-15 已推进 C4.2：新增 `DslScriptDiagnosticProvider`，LanguageServer diagnostics 直接调用 Compiler，并把 Compiler 1-based `line` / `column` 转换为 editor 0-based `line` / `character`；内部测试已覆盖该转换。
- 2026-05-15 已推进 C4.3：新增 `DslScriptDefinitionProvider` 和 `EditorLocationMapperDomain`，LanguageServer definition 第一层直接复用 Compiler node source span 输出 editor location；内部测试已覆盖缩进节点的 0-based location。
- 2026-05-15 已推进 C4.4：新增 `DslScriptReferenceProvider` 与 `DslScriptCompletionProvider`，references / completion 第一层直接读取 Compiler graph 输出；内部测试已覆盖引用定位和节点补全 location。
- 2026-05-15 已推进 C5.1 / C5.2：创建 `src/Internal/Runtime/Inscape.Runtime.csproj` 并加入 `Inscape.slnx`；新增 `NarrativeRuntime` 最小 IR 消费生命周期，支持 `LoadGraph`、`Start`、`Choose`、`Continue`、`Restore`，不解析 `.inscape`，不依赖 VSCode / HTML Preview / UnitySample。
- 2026-05-15 已推进 D1.1 / D1.2：新增 [Core Boundary Audit](core-boundary-audit.md)，确认 Compiler 本体无 Unity、VSCode、HTML、Bird、Addressables、ExternalSupport、Tooling、Cli、LanguageServer 或 Runtime 依赖；Compiler 角色目录与类型后缀符合当前命名规范，命名空间保持 `Inscape.Compiler.*` 粗粒度。
- 2026-05-15 已推进 D2.1：新增 [ExternalSupport Boundary Audit](external-support-boundary-audit.md)，确认 ExternalSupport 未进入默认 solution，Internal 项目未反向引用 UnitySample；`ToolConfigModel.UnitySample` 与 VSCode `UnitySample` 文案被记录为 Host Bridge 契约前的兼容残留。
- 2026-05-15 已推进 D2.2：新增 [Host Bridge Contract](host-bridge-contract.md)，明确 Host Schema 是能力清单、Host Bridge 是 Inscape 可读 ID 到宿主 ID / 资源 / 事件处理器 / 查询实现的映射；该草案可覆盖 UnitySample 当前 role map、binding map 与 timeline hook，但不把 UnitySample 字段升级为 Core 概念。D 阶段第一轮已收口，下一步建议进入 D3：迁移 `ToolConfigModel.UnitySample` 与 VSCode `UnitySample` 文案到通用 `hostBridge` 配置读取与展示。
- 2026-05-16 已推进 D3.1：`ToolConfigModel` 新增通用 `HostBridge` 路径字段，`ToolConfigReaderDomain` 会按配置文件目录归一化 `hostBridge`；`unitySample` 旧字段继续保留作为 ExternalSupport fallback。下一步建议 D3.2：VSCode HostBinding / speaker 展示文案迁到 Host Bridge 口径。
- 2026-05-16 已推进 D3.2：VSCode speaker / host binding provider 迁到 `inscape.config.json` 的 `hostBridge` ids；Goal 0 后已删除旧 `unitySample.roleMap` / `unitySample.bindingMap` fallback。
- 2026-05-16 已推进 E1 / E3：新增 [Regression Workflow](regression-workflow.md)，把节点开始前、行为契约、命名 / 分层自检、验证命令、提交拆分、提交前检查和推送后检查固化为可执行清单。下一步建议 E2：把 VSCode 交互回归清单补进扩展文档。
- 2026-05-16 已推进 E2：`src/ExternalSupport/VSCode/README.md` 新增 `Regression Checklist`，明确改 VSCode 后要 `node --check`、JSON parse、`npm run rebuild:vsix`、安装后 Reload Window，并手动检查正文 / 选项 Ctrl+Click、speaker、host binding、预览源码回跳等交互。
- 2026-05-16 已启动 F 阶段语法收敛：新增 [Authoring Marker Contract](authoring-marker-contract.md)，将 `@` / `[]` 的作者心智模型收敛为 `@` 主要表达事件、动作、时机和状态变化，`[]` 主要表达查询、读取和文本插值。历史 `[timeline: ...]` / `[kind: alias]` inline host binding 写法暂保留为兼容事实，但不再作为新示例和新工具提示的推荐方向。
- 2026-05-16 已推进 F1.2：新增 [Authoring Marker Compatibility Audit](authoring-marker-compatibility-audit.md)，把旧 `[timeline: ...]`、`[kind: alias]`、`[bg]` / `[emotion]` 等残留分为 `compatible`、`migrate-docs`、`migrate-tooling-copy` 与 `defer-behavior`。下一步建议 F1.3：先迁 VSCode hover / completion / README / tooling 文案，保留 legacy 行为 fallback。
- 2026-05-16 已推进 F1.3：VSCode hover / completion 文案和扩展 README / VSCode 工具链文档已迁到 `@timeline...` = host event / timing hook、`[kind: alias]` = legacy inline host binding fallback 的口径；代码扫描、补全、Ctrl+Click 和 UnitySample 兼容行为未改变。下一步建议 F1.4：迁作者语法指南、快速指南和 open questions，把 `[bg]` / `[timeline]` 移入兼容旧写法。
- 2026-05-16 已推进 F1.4：作者语法说明、极简速查、DSL 语言设计草案和 open questions 已迁到 `@` 表达事件 / 动作 / 时机 / 状态变化、`[]` 表达查询 / 读取 / 文本插值的口径；`[bg]`、`[timeline]` 等旧 inline host binding 写法被收束为兼容旧写法。下一步建议 F1.5：评估是否调整 Compiler / VSCode / UnitySample 对 generic `[kind: alias]` 的长期行为。
- 2026-05-16 已推进 F1.5：新增 [Authoring Marker Behavior Decision](authoring-marker-behavior-decision.md)，冻结旧行为边界：Compiler 不解释 generic `[kind: alias]` 宿主语义，UnitySample 只保留 bracket timeline 兼容导出，VSCode 继续把 generic `[kind: alias]` 作为 legacy authoring fallback。下一步建议 F1.6：新增或迁移新规范样例，避免主样例继续把 `[bg]` / `[timeline]` 当推荐写法。
- 2026-05-16 已推进 F1.6：`samples/court-loop.inscape` 已迁为新规范主样例，使用 `@timeline.talking.exit` / `@emit` / `@scene` 表达事件、时机和场景意图，使用 `[player.name]` / `[itemName]` 表达查询插值；旧 inline host binding 文本保存在 `samples/legacy/court-loop-legacy-inline-tags.txt`，不参与项目级编译。下一步建议 F1.7：清理剩余文档里的旧 `bird.*` / `UnitySample` 主口径，把它们收回 Host Bridge / ExternalSupport 兼容说明。
- 2026-05-16 已推进 F1.7：`docs/project-config.md` 与 `docs/vscode-tooling.md` 已把 speaker / binding 提示的主口径迁到 Host Bridge；Goal 0 后，`unitySample.roleMap` / `unitySample.bindingMap` 只作为 ExternalSupport 样例命令输入，不再作为 VSCode 编辑器扩展 fallback。下一步建议 F1.8：设计表达式 / 查询插值第一版语法边界。
- 2026-05-16 已推进 F1.8：新增 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md)，冻结 `[]` 第一版为只读查询 / 文本插值：优先简单路径，不触发事件，不修改状态，不调度资源，不绑定 Unity / 服务端 / 业务 API；函数调用、异步查询、失败策略、本地化占位和预览 fallback 留到后续数据契约。下一步建议 F1.9：设计查询插值与本地化占位符、预览 fallback、Host Schema 提示之间的最小数据契约。
- 2026-05-16 已推进 F1.9：新增 [Query Interpolation Data Contract](query-interpolation-data-contract.md)，定义 `[]` 简单路径插值在本地化、预览 fallback、Host Schema 提示和 Host Bridge 映射之间的最小对象形态与分层诊断：本地化保留占位符，预览无宿主时保留 `[query]` 或使用显式调试假值，Host Schema 只做提示不成为 Compiler 真相，legacy `[kind: alias]` 与新 `query-interpolation` 分开。下一步建议 F1.10：评估 VSCode / LanguageServer 是否先做简单路径提示原型。
- 2026-05-16 已推进 F1.10：新增 [Query Interpolation Tooling Decision](query-interpolation-tooling-decision.md)，结论是先做 VSCode authoring hint 原型：只消费 Host Schema，未知 query 只给提示，不改 Compiler，不改本地化 / 预览输出；LanguageServer 等 VSCode 原型稳定后复用同一 `query-interpolation` 数据契约。下一步建议 F1.11：新增 VSCode query interpolation provider 骨架，先做 Host Schema queries 读取和 `[query.path]` 范围识别，不接 completion / hover。
- 2026-05-16 已推进 F1.11：新增 `src/ExternalSupport/VSCode/WorkspaceIndex/DslScriptQueryInterpolationProvider.js`，可读取当前工作区 Host Schema 的零参数简单 `queries[]`，识别 `[itemName]` / `[player.gold]` 这类简单路径范围，并天然排除带冒号的 legacy `[kind: alias]`；入口已装配 provider，但暂未接入 completion / hover，不改变用户可见行为、Compiler、预览或本地化输出。下一步建议 F1.12：接入 VSCode completion / hover，未知 query 只提示，不改 Compiler。
- 2026-05-16 已推进 F1.12：VSCode completion / Hover 已接入 `[]` 查询插值。`[` / `[partial` 位置会基于 Host Schema 零参数简单 query 补全；`[query.path]` Hover 会展示 `returnType`、`isAsync`、description 和 schema 来源。未知 query 只显示作者提示，不新增 Problems 诊断，不改 Compiler / 本地化 / 预览语义；Goal 0 后，带冒号的旧 `[kind: alias]` 不再作为 Host Bridge 或 query interpolation 主路径。下一步建议 F1.13：评估该原型是否迁入 LanguageServer 或增加 workspace audit。
- 2026-05-16 已推进 F1.13：新增 [Query Interpolation Follow-up Decision](query-interpolation-follow-up-decision.md)，结论是暂不把 `[]` 查询插值立即迁入 LanguageServer，也不新增 Compiler diagnostics；VSCode 原型继续作为反馈面。下一步建议 F1.14：先设计显式 workspace audit 的输出格式和命令入口，保持非阻断、可选、不接默认 Problems。
- 2026-05-16 已推进 F1.14：新增 [Query Interpolation Workspace Audit](query-interpolation-workspace-audit.md)，设计未来 `audit-query-interpolation-project <workspace> [--format json|text]` 与 VSCode 显式命令的输出契约。Audit 使用独立 `inscape.query-interpolation.audit` JSON 格式和 `IQI` code，不接 `diagnose-project`，warning / info 不返回非零退出码。下一步建议 F1.15：评估 Host Schema query 读取逻辑落到 Tooling 还是 LanguageServer。
- 2026-05-16 已推进 F1.15：新增 [Query Interpolation Host Schema Reading Decision](query-interpolation-host-schema-reading-decision.md)，结论是 Host Schema query 读取与归一化应优先落到 `Inscape.Tooling`，CLI audit 和未来 LanguageServer 复用 Tooling 契约；VSCode JS provider 暂保留为 authoring hint 原型，不急于拆迁。Unity / Host Bridge 查询实现仍只保留后续映射需求，不在本节点研发。
- 2026-05-16 已推进 F1.16：`Inscape.Tooling` 新增 Host Schema query reader 与 query interpolation audit domain；Internal CLI 新增显式 `audit-query-interpolation-project <root> [--format json|text] [-o path]`。该命令输出独立 `inscape.query-interpolation.audit` / `IQI` code，不接 `diagnose-project`，不改变 Compiler、本地化或预览语义。
- 2026-05-16 已补齐 F 阶段非 Unity 宿主 API 边界：新增 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)，对比 Yarn / Ink / Ren'Py / Twine 后确认 Inscape 第一阶段采用 Host Schema / Host Bridge / Runtime Host 分层；`[]` 查询插值不允许副作用，事件和状态变化保留给 `@` / Runtime Host；宿主内部 API 不得直接写进 `.inscape`。
- 2026-05-16 已按“Unity 相关只做准备和计划”的约束补齐 F 阶段 Unity Host Bridge 计划：新增 [Unity Host Bridge Preparation Plan](unity-host-bridge-preparation-plan.md)，记录 Attribute 扫描、Host Bridge 到 adapter 生成闭环、UnitySample 回归样例和 hybrid 消费模型；未新增 Unity 代码，未修改 ExternalSupport 行为。
- 2026-05-16 已完成 TODO 账本收口：目录优先、Tooling 第一轮、CLI / VSCode 命名收敛、D3 Host Bridge 迁移与 E 阶段防回归工作流这些父项已按实际完成状态勾选；当前接力优先队列改为 Host Schema query / event 脚本补全与 Hover、VSCode 预览增量体验、LanguageServer outline / hover 范围、本地化模糊匹配、节点迁移策略和块语法收敛。Unity / Bird 相关继续先做准备和计划，不直接研发。
- 2026-05-16 已接入 Host Schema event 脚本作者提示：VSCode 新增 `DslScriptHostEventProvider`，在 `@emit eventName` 位置读取 `hostSchema.events[]` 提供 completion / Hover；未知 event 只显示 authoring hint，不新增 Problems，不改 Compiler。`@timeline...` 走 Host Bridge，因为它是有时机的宿主资源 hook；`[]` query interpolation 仍走现有 query provider。下一步建议评估 VSCode JS provider 是否复用 `Inscape.Tooling` Host Schema reader / audit 契约。
- 2026-05-16 已完成 Host Schema reader 复用评估与 Tooling 补齐：新增 `HostSchemaEventReaderDomain`、`HostSchemaEventCapabilityModel` 与 `HostSchemaEventReadResultModel`，Tooling 现在同时能读取 `queries[]` 与 `events[]` 并保留 1-based source location。VSCode 暂不直接启动 .NET Tooling，避免编辑热路径延迟和发布复杂度；后续建议设计 LanguageServer 或 CLI capability endpoint，让 VSCode 复用 Tooling 契约。
- 2026-05-16 已新增 Host Schema capability endpoint：Internal CLI 新增 `inspect-host-schema-project <root> [-o capabilities.json]`，读取项目 `hostSchema` 并输出 `inscape.host-schema.capabilities`，包含 schema 读取状态、归一化 `queries[]` 与 `events[]`。该命令不编译 `.inscape`，也不扫描脚本文本，目标是给 VSCode / LanguageServer 后续复用 Tooling reader。
- 2026-05-16 已让 VSCode 消费 Host Schema capability endpoint：新增 `HostSchemaCapabilityProvider`，query / event provider 优先调用 `inspect-host-schema-project` 获取 Tooling 归一化后的 `queries[]` / `events[]`，失败时回退直接读取 Host Schema JSON，避免部分构建环境里作者提示完全失效。下一步可评估是否把该 endpoint 下沉到 LanguageServer，并在稳定后移除 JS fallback 重复解析。
- 2026-05-16 已补齐 LanguageServer outline / hover 基线：新增 `DslScriptDocumentSymbolProvider` 与 `DslScriptHoverProvider`，临时 probe 为 `--document-symbols-file <path>` 和 `--hover-file <path> <node|jump> <name>`；数据仍直接来自 Compiler graph / source span，输出 editor 0-based location。下一步建议设计 VSCode 前端切换到 LanguageServer 的接入顺序和 fallback 边界。
- 2026-05-16 已新增 [VSCode LanguageServer Migration Plan](vscode-language-server-migration-plan.md)：明确 VSCode 前端迁移顺序为 diagnostics -> document symbols / node completion -> node definition / references -> node / jump hover -> Host Schema capability endpoint -> full LSP transport；首次接入不得同提交移除 JS fallback，正文 / 选项文本仍保留 `DefinitionProvider` + `PreviewRevealBridge` 交互边界。下一步建议先做 LanguageServer probe parity 测试或项目级 diagnostics endpoint 设计。
- 2026-05-17 已为 LanguageServer 临时 probes 建立入口级 parity 测试：`--diagnose-file`、`--definition-file`、`--references-file`、`--completion-file`、`--document-symbols-file` 与 `--hover-file` 都会校验稳定 JSON format、formatVersion 和关键 editor location 字段。下一步建议设计项目级 diagnostics endpoint，覆盖项目源加载与 unsaved override，并让 VSCode 保留 CLI fallback。
- 2026-05-17 已新增 LanguageServer 项目级 diagnostics endpoint：`LanguageServerEntry --diagnose-project <root> [--entry 标题] [--override source.inscape temp.inscape]` 输出 `inscape.language-server-project-diagnostics`，内部复用 `Inscape.Tooling` 的 `.inscape` source loader 与 `StoryGraphCompilerDomain`，不借道 CLI；测试覆盖跨文件缺失目标和 unsaved override 修复链路。VSCode 还未切换，后续接入时仍需保留 CLI diagnostics fallback。
- 2026-05-17 已让 VSCode diagnostics 先尝试 `Inscape.LanguageServer --diagnose-project`，并保留现有 `inscape.compiler.command` / `inscape.compiler.args` CLI fallback；新增 `inscape.diagnostics.backend` 可切回 `compiler` only。本节点已执行 `npm run rebuild:vsix` 并成功安装 `.vsix`，用户随后反馈 VSCode 里大致过了一眼体验基本 OK；CLI fallback 不可用场景仍未做专项 smoke test，删除 fallback 前必须补。
- 2026-05-17 已冻结节点标题 / stable id 共识并新增 [ADR 0013](adr/0013-author-title-and-stable-node-id.md)：长期块语法转向 `# 标题`，标题是作者主身份且项目内唯一，stable node id 是系统身份；标题前空行只做 style hint，不做编译错误；自动创建同名标题时生成 `_01`，用户手动重名时报 duplicate title diagnostic。后续实现前先设计 stable id 落盘与 `:: node.name` 兼容迁移。
- 2026-05-17 已把后续计划整理为 [/goal 后续目标计划](goal-plan.md)：Goal 1 stable node id 契约、Goal 2 本地化 diff / alignment、Goal 3 `# 标题` 语法第一刀、Goal 4 VSCode 标题体验、Goal 5 LanguageServer 接管 VSCode 语义能力、Goal 6 Host Schema endpoint 收口、Goal 7 体验和 ExternalSupport 尾项。Goal 1 到 Goal 4 已完成；下一步建议从 Goal 5 开始，每个最小节点独立自检、验证、提交和推送。
- 2026-05-17 已完成 Goal 1 设计：新增 [Stable Node ID Contract](stable-node-id-contract.md)，确定第一版使用 `inscape.node-map.json` sidecar 维护 stable node id / title map，默认作者不手写机器 ID；定义了 ID 生成、标题重命名识别、missing / tombstone、Git 合并冲突、显式 `@id` 修复边界，以及 `:: node.name` 到 `# 标题` 的兼容迁移策略。本节点只改文档，不改 parser。
- 2026-05-19 已推进 Goal 10.1：`Inscape.Tooling` 新增 `StoryNodeMap` 读写 / 路径解析 / 更新 domain，`ToolConfigModel` 新增 `nodeMap` 配置，Internal CLI 新增 `update-node-map-project <root> [--config path] [-o path]`。第一版按当前标题精确命中复用 stable node id，把消失节点标为 `missing`，把 sidecar 内重复 `id` / `title` 标为 `conflict`，并落盘 source/content/neighbor 指纹与 line anchor samples。下一步建议进入 G10.2：把标题创建 / 重命名流程真正接到 stable node id 维护。
- 2026-05-19 已继续推进 Goal 10.2 的第一小步：`StoryNodeMapUpdateDomain` 现在会在标题未命中时，用 `sourcePath` + content fingerprint + neighbor fingerprint + line anchor overlap + 行号距离做“保守自动重命名识别”。当候选唯一时复用旧 stable node id，并把旧标题写入 `previousTitles`；候选不唯一时宁可放弃自动识别，保留“旧节点 missing + 新节点新 id”。下一步建议继续 G10.2：把 VSCode 标题创建 / 重命名入口与人工确认流接进来。
- 2026-05-19 已继续推进 Goal 10.2 的第二小步：VSCode 新增显式 `Inscape: Update Stable Node Map` 命令，位于 `EditorAuthoringCommand`，会调用 Internal CLI `update-node-map-project <workspace>`，并把活动未保存 `.inscape` 文档通过 `--override` 传给 CLI。当前这一步只打通显式 sidecar 维护入口，不会在插入标题后自动同步，也还没有重命名人工确认 UI。下一步建议继续 G10.2：补标题创建后的自动同步，或单独切人工确认 / 冲突报告入口。
- 2026-05-19 已继续推进 Goal 10.2 的第三小步：VSCode `Inscape: Insert Node Title` 现在会在插入成功后，对当前工作区静默执行一次 `update-node-map-project`。如果当前文档尚未保存，会继续通过 `--override` 把编辑器内容传给 CLI；如果自动同步失败，只提示 warning，不回滚标题插入。这样标题创建和 stable node map 维护已经形成第一版自动闭环。下一步建议继续 G10.2：单独实现标题重命名的人机确认 / 冲突报告入口。
- 2026-05-19 已完成 Goal 10.2.3：`StoryNodeMapUpdateDomain` 新增 `UpdateWithReport`，会输出 `inscape.node-map-update-report`，列出 `renamed`、`new`、`missing`、`conflict` 与 `manual-review` 项；CLI `update-node-map-project` 新增 `--report` 写出审查报告；VSCode 新增显式 `Inscape: Review Stable Node Map Changes` 命令，并在显式 `Update Stable Node Map` 发现 `manual-review` / `conflict` 时给出 `Open Review` 入口。下一步建议转入 G10.3：本地化 alignment / audit report。
- 2026-05-17 已完成 Goal 2 设计：新增 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)，定义 `kept` / `new` / `changed` / `removed` / `conflict` / `stale` 状态，要求 anchor 精确继承优先，同一 stable node id 内再做 diff / alignment；相似旧译文只能作为候选和 review report，不得静默当作完成译文。CLI 兼容计划优先新增独立 audit / alignment report，不改变当前 `update-l10n` 默认行为。
- 2026-05-17 已完成 Goal 3 Compiler 第一刀：`DslScriptParserDomain` 支持 `# 标题` 节点声明，`DslScriptNodeTitleValidatorDomain` 定义标题合法性；中文标题可作为 `-> 目标标题` 跳转目标。重复标题仍走文档内 `INS003` / 项目级 `INS030` 诊断，标题前缺空行新增 info 级 `INS012` style hint。
- 2026-05-17 已完成 Goal 4 VSCode 标题语法体验：TextMate grammar、snippets、README / tooling 文档已转向 `# 标题`；中文标题可用于 Outline、jump completion、Go to Definition、Find All References、Hover 与 CodeLens；新增 `Inscape: Insert Node Title` 命令，在创建同名标题时自动追加 `_01`。
- 2026-05-17 已推进 Goal 5.1：VSCode `DslScriptDocumentSymbolProvider` 现在优先把当前 document buffer 写入临时文件并调用 `Inscape.LanguageServer --document-symbols-file` 获取 Outline；LanguageServer 失败时回退 JS `DslScriptNodeProvider` 扫描。下一步建议 Goal 5.2：node completion 优先走 LanguageServer，同时保留 JS workspace index fallback。
- 2026-05-17 已推进 Goal 5.2：VSCode `DslScriptCompletionProvider` 在 `->` 跳转目标位置优先调用 `Inscape.LanguageServer --completion-file`，再用 JS workspace node index 补齐跨文件节点；LanguageServer 失败时仍能只靠 JS fallback 提供补全。下一步建议 Goal 5.3：node definition / references 优先走 LanguageServer，同时保留当前 DefinitionProvider / ReferenceProvider 的 JS fallback。
- 2026-05-17 已推进 Goal 5.3：LanguageServer 新增 `--definition-project <root> <title> [--override source temp]` 与 `--references-project <root> <title> [--override source temp]`，复用 `DslScriptSourcesLoaderDomain` 和 `StoryGraphCompilerDomain` 支持跨文件与未保存内容；VSCode node definition / references 已切到该 project navigation，节点语义不再使用 JS node provider fallback。speaker / Host Bridge / metadata / preview reveal 仍保留各自作者体验路径。下一步建议 Goal 5.4：node / jump hover 接入 LanguageServer。
- 2026-05-17 已推进 Goal 5.4：LanguageServer 新增 `--hover-project <root> <node|jump> <title> [--override source temp]`，复用 Tooling source loading 与 Compiler project graph；VSCode node / jump hover 已切到该 project hover，`DslScriptNodeProvider` 不再保存 node hover markdown fallback。speaker、metadata、Host Bridge binding、Host Schema query / event hover 仍保留在 VSCode authoring provider。下一步建议 Goal 5.5：收敛 document symbols / node completion 的既有 JS fallback 边界。
- 2026-05-17 已完成 Goal 5.5：LanguageServer 新增 `--completion-project <root> [--override source temp]`，VSCode node completion 改用项目级 completion，不再用 JS workspace node index 补齐跨文件节点；DocumentSymbolProvider 删除 JS node scanner fallback，LanguageServer 失败时返回空 Outline。下一步建议 Goal 6：Host Schema endpoint 收口到 LanguageServer / Tooling 契约。
- 2026-05-18 已推进 Goal 6.1：LanguageServer 新增 `--host-schema-capabilities-project <root> [--config path]` probe，直接复用 `ToolConfigReaderDomain` 与 `HostSchemaCapabilityCatalogDomain`，输出与 CLI `inspect-host-schema-project` 相同的 `inscape.host-schema.capabilities` payload。下一步建议 G6.2 / G6.3：VSCode query interpolation provider 与 host event provider 优先调用 LanguageServer，再保留 CLI fallback。
- 2026-05-18 已推进 Goal 6.2 / G6.3：VSCode `HostSchemaCapabilityProvider` 已改为优先调用 LanguageServer `--host-schema-capabilities-project`，失败后回退 CLI `inspect-host-schema-project`；`[]` query interpolation 与 `@emit` host event provider 共用该 capability catalog。
- 2026-05-18 已完成 Goal 6.4：`DslScriptQueryInterpolationProvider` 与 `DslScriptHostEventProvider` 不再直接读取 Host Schema JSON；Host Schema capability 只通过 LanguageServer 优先、CLI fallback 的 shared catalog 进入 VSCode。LanguageServer / CLI 均失败时由 `HostSchemaCapabilityProvider` 写入 output channel 日志，作者提示为空但不改变 Compiler 诊断语义。
- 2026-05-17 已推进预览体验小节点：Preview HTML 会把正文、选项提示和选项文本中的 `[query.path]` 渲染为 `.query-interpolation` token 样式，仍显示原文，不改变 Compiler / Runtime / Host Schema 语义。
- 2026-05-17 已新增 ADR 0015 并修正 ADR 0014：VSCode 是第一方维护的外部编辑器平台支持，不属于 Internal 核心层；当前 package 已迁到 `src/ExternalSupport/VSCode`。未来可能拆仓的项目应在项目根内区分 `Scripts` / `Resources` / 开发脚本边界；空规划目录不再作为完成依据。
- 2026-05-17 已更新研发期兼容原则：项目当前没有真实用户和已发布契约，不再默认维护旧版兼容。`:: node.name`、legacy `[kind: alias]` inline binding、`unitySample.*` fallback、JS semantic fallback 等都应重新梳理为待删除或待收敛任务。下一步优先重排计划并先清 legacy，再继续新增能力。
- 2026-05-12 已迁移当前聚合测试项目：`tests/Inscape.Tests` -> `tests/Internal/Inscape.Tests`。这只是测试项目路径进入 Internal 测试树，测试内容尚未按 Compiler / Tooling / Cli / ExternalSupport 拆分。
- 当前分支为 `main...origin/main`。本轮已把目录优先方案正式冻结为文档与 ADR；最新提交请以 `git log --oneline -1` 为准。
- 本轮会话已确认新的重构铁律：先搭目录骨架与 `README.md` 规则文件，再迁大目录路径，再迁 solution / 项目路径，再迁项目名、命名空间和类型名；在此之前，不再把主要重构精力继续放在旧目录里的微观 helper 收口上。
- 本轮会话已将该铁律落入 [目录优先重构蓝图](directory-first-reframe-plan.md) 与 [ADR 0012](adr/0012-directory-first-repository-reframe-order.md)。
- 本轮会话已明确当前最显眼的不符合点已从“大目录不成形 / UnitySample 仍在默认编译链”转为“VSCode 编辑器扩展归属曾误放 Internal、编辑器扩展还未完全接入 LanguageServer、Tooling 共享流程仍可继续下沉为更窄模块、测试项目仍可继续按更细领域拆分”。
- 本轮会话已确认新的优先级：下一阶段应先做目录骨架与规则文件，再迁大目录路径与 solution 边界；Tooling 上提、VSCode 深拆、LanguageServer 细化与项目名迁移都排在目录外形稳定之后。
- 本轮会话当时曾确认 `VSCode` 位于 Internal；该判断已在 2026-05-17 被 ADR 0015 修正。当前长期结构为：Internal 包含 `Compiler`、`Tooling`、`Cli`、`LanguageServer`、`Runtime`；ExternalSupport 包含 `VSCode` 与 `UnityPlugin`。
- 本轮会话确认：`Inscape.Compiler` 长期可向 `Compiler` 收敛；`Inscape.Cli` 当前同时承载了 `Cli` 与部分 `Tooling`，下一轮重构重点应是先抽出 `Tooling`。
- 本轮会话已完成 Stage 1 的第一刀：新建 `src/Inscape.Tooling/`，迁出 ToolConfig 配置模型与读取/路径归一化逻辑；`Cli` 现在只保留 `--config` 参数解析和错误输出适配。
- 本轮会话已完成 Stage 1 的第二刀：迁出 `.inscape` 项目源发现、排除目录、内容读取与 override 应用逻辑；`Cli` 现在只保留 `--override <source> <content>` 参数解析。
- 本轮会话已完成 Stage 1 的第三刀：迁出 Preview 样式表模型与 JSON 读取逻辑；`Cli` 现在只保留 HTML 渲染与终端输出适配。
- 本轮会话已完成 Stage 1 的第四刀：迁出 Localization CSV 读取、提取与更新流程；`Cli` 现在只保留 `--from` 参数读取和错误输出适配。
- 本轮会话已完成 Stage 1 的第五刀：迁出 HostSchema 模板模型与导出逻辑；`Cli` 顶层命令现在只保留 `-o` 参数读取和输出适配。
- 本轮会话已完成 Stage 1 的第六刀：迁出 HostBinding 绑定表 CSV 读取流程；`Cli` 现在只保留 UnitySample 绑定项适配与参数/错误输出处理。
- 本轮会话已完成 Stage 1 的第七刀：迁出现有角色名 CSV 扫描与歧义收敛流程；`Cli` 现在只保留 UnitySample role template report 输出。
- 本轮会话已完成 Stage 1 的第八刀：迁出 timeline 资产扫描与 alias 归并流程；`Cli` 现在只保留 UnitySample timeline 绑定结果适配。
- 本轮会话已完成 Stage 1 的第九刀：迁出 `speaker -> roleId` 的 role map 读取流程；`Cli` 现在只保留 UnitySample role id 适配。
- 本轮会话已完成 Stage 1 的第十刀：迁出既有 talking 资产扫描与保留 talkingId 收集流程；`Cli` 现在只保留 UnitySample reserved id 适配。
- 本轮会话已继续按 CLI 入口边界收紧 UnitySample 命令实现：binding-template、role-template、project-export 三个命令的单用途读取/适配/写盘/报表辅助已全部内联回各自 `CliUnitySample*Command`，当前 CLI 不再保留独立 `CliUnitySample*Reader/Writer` 辅助类型。
- 本轮会话已继续按显式宿主动作入口规则收紧 UnitySample L10N 合并命令：`merge-unity-sample-l10n` 已从 `CliCore` 私有分支抽为独立 `CliUnitySampleL10nMergeCommand`，`CliCore` 仅保留分发。
- 本轮会话已继续按薄门面规则收紧 `CliCore`：`IsHelp`、`ToCompileViewModel`、`ToProjectCompileViewModel` 与项目命令分发私有包装已收回拥有者文件，`CliCore` 进一步缩到入口分发与跨命令共享输出辅助。
- 本轮会话已先收口 VSCode 预览定位 selection bridge：原先散在 `src/ExternalSupport/VSCode/extension.js` 顶层的 pending reveal 状态与相关函数已收为 `PreviewRevealBridge`，使 Ctrl+Click 到预览定位的链路拥有明确 `Bridge` 角色。
- 本轮会话已继续收口 VSCode 预览命令入口：`openPreview`、`togglePreview`、`revealSelectionInPreview` 及其局部 helper 已收为 `PreviewCommand`，预览命令不再散在 `extension.js` 顶层函数。
- 本轮会话已继续收紧 VSCode preview reveal bridge 边界：光标处 reveal 信息解析、definition link 构造与 reveal range 解析已吸回 `PreviewRevealBridge`，preview reveal 顶层 helper 进一步退出函数区。
- 本轮会话已继续收口 VSCode localization 命令入口：`extractLocalization`、`updateLocalization` 及其局部执行链已收为 `LocalizationCommand`，顶层不再保留独立 localization command helper 串。
- 本轮会话已继续收口 VSCode 工作区工具命令入口：`openToolsMenu`、`openEditorStyle`、`openPreviewStyle`、`openQuickSyntaxGuide` 及其局部样式文件 helper 已收为 `EditorAuthoringCommand`，样式/文档打开流程不再散在顶层函数。
- 本轮会话已继续收口 VSCode host schema 命令入口：`showHostSchemaCapabilities` 及其局部 schema 读取、QuickPick 组装与定位逻辑已收为 `HostSchemaCommand`，host schema 浏览流程不再散在顶层函数。
- 本轮会话已开始收口 VSCode workspace index：节点声明、jump 引用与节点导航这一小片已收为 `DslScriptNodeProvider`，Definition / Reference / CodeLens / jump completion 不再直接依赖散落的 node/jump 顶层 helper。
- 本轮会话已继续收口 VSCode workspace index 的 speaker 子块：角色表读取、工作区 speaker 扫描、speaker completion / definition / reference 已收为 `DslScriptSpeakerProvider`，顶层不再保留独立 speaker helper 串。
- 本轮会话已继续收口 VSCode workspace index 的 host binding 子块：binding map 读取、工作区 hook / inline tag 扫描以及 host binding completion / definition / hover 所需绑定列表已收为 `HostBindingProvider`，顶层不再保留独立 host binding helper 串。
- 本轮会话已继续收口 VSCode workspace index 的 metadata 子块：metadata 位置解析、工作区 metadata 引用扫描与 metadata hover 已收为 `DslScriptMetadataProvider`，顶层不再保留独立 metadata helper 串。
- 本轮会话已继续收紧 VSCode workspace index 的 speaker provider 边界：speaker 位置解析与 hover markdown 已吸回 `DslScriptSpeakerProvider`，Definition / Reference / Hover 不再直接依赖顶层 speaker helper。
- 本轮会话已继续收紧 VSCode workspace index 的 node provider 边界：节点声明 / jump target 位置解析与 node/jump hover markdown 已吸回 `DslScriptNodeProvider`，相关顶层 node/jump helper 已退出函数区。
- 本轮会话已继续收紧 VSCode workspace index 的 host binding provider 边界：host binding 补全上下文与光标位置解析已吸回 `HostBindingProvider`，Completion / Definition / Hover 不再直接依赖顶层 host binding helper。
- 本轮会话已继续收紧 `HostBindingProvider` 的拥有边界：host binding completion / hover / missing-hover markdown 构造已吸回 provider 自身，相关 markdown helper 不再散在顶层函数区。
- 本轮会话已补齐 VSCode DslScript 拆分：`DslScriptCompletionProvider`、`DslScriptDefinitionProvider`、`DslScriptReferenceProvider`、`DslScriptHoverProvider`、`DslScriptDocumentSymbolProvider`、`DslScriptCodeLensProvider` 与 DslScript authoring hint providers 当前已进入 `Scripts/DslScript/Providers`，诊断调度与映射进入 `Scripts/DslScript/Controllers`，补全、定义跳转、引用查找、悬浮说明、outline、CodeLens 与诊断调度逻辑继续复用 CLI / LanguageServer 调用和 preview reveal bridge，不在编辑器层重建编译语义。
- 本轮会话已推进 Preview 拆分：`PreviewEditorProvider`、`PreviewHtmlProvider`、`PreviewInvocationProvider` 已进入 `Scripts/Preview/Providers`，`PreviewRefreshController` 与 `PreviewSourceController` 已进入 `Scripts/Preview/Controllers`，入口文件仅保留 custom editor 注册、preview refresh 薄 wrapper 和依赖注入。
- 本轮会话已完成 Styles 收口：`EditorAuthoringStyleController` 位于 `Scripts/EditorAuthoring/Controllers`，editor 默认样式位于 `Scripts/EditorAuthoring/Models/EditorAuthoringStyleDefaultsModel.js`，preview 默认样式位于 `Scripts/Preview/Models/PreviewStyleDefaultsModel.js`；根级 `Styles` 目录已删除。
- 本轮会话已完成根级 Commands 收口：`EditorAuthoringCommand`、`PreviewCommand`、`HostSchemaCommand`、`LocalizationCommand` 已分别归入各自业务目录的 `Commands` 角色目录；根级 `Commands` 目录已删除。
- 本轮会话已记录 `extension.js` 的唯一根级源码例外：它是 VSCode `package.json` manifest main 入口，只允许承载 activation、依赖装配和注册 glue。
- 本轮会话已开始 ExtensionEntry 收口：`ExtensionRegistrationController` 负责 VSCode 注册顺序，`ExtensionLifecycleController` 负责 output/logging/diagnostics lifecycle；`activate()` 当前只委托 lifecycle controller。
- 本轮会话已继续收口 diagnostics 边界：`DslScriptDiagnosticController` 负责 VSCode Diagnostic 映射与 compiler invocation 适配，`DslScriptDiagnosticScheduler` 仍只负责防抖与异步调度。
- 本轮会话已继续收口 authoring 数据来源：`EditorAuthoringDataProvider` 当前位于 `Scripts/EditorAuthoring/Providers`，负责配置、CSV 与 `.inscape` 文本源读取，其他 provider 继续只消费注入的数据来源。
- 本轮会话已完成 B 阶段剩余顺序：ExtensionEntry / diagnostics / config-source / location-range 四个实现节点与 B3.5 总验收均已提交并推送；2026-05-18 后续目录收口已将 `ExtensionEntry` 改为 `Entries`。进入 C 阶段前，先按命名规范清理旧类型名、Compiler 角色后缀、Tooling 业务主语和纯规划占位目录。
- 本轮会话已顺手修复预览定位局部缺陷：`findDialogueSeparatorIndex` 中误残留的 preview reveal 调用与缺失的半角冒号解析已清理，避免说话人行的预览定位在运行时触发异常。
- 本轮会话已继续收敛 CLI 总入口 runner 命名：`CliTopLevelCommandRunner`、`CliDslScriptCommandRunner`、`CliStoryGraphCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`。
- 本轮会话已继续按终局后缀白名单收口 CLI 命令入口：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 以及 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，收敛为 `CliTopLevelCommand`、`CliDslScriptCommand`、`CliStoryGraphCommand` 与 `CliUnitySample*Command`。
- 本轮会话已继续按终局后缀白名单收口 CLI 展示与命令元数据类型：`CliCompileOutput`、`CliProjectCompileOutput` 已分别改为 `CliCompileViewModel`、`CliStoryGraphCompileViewModel`，`CliCommandCatalog` 已改为 `CliCommandProvider`，内部 `CliCommandDefinition` 也已改为 `CliCommandModel`。
- 本轮会话已继续按分层规则上提 CLI 共享预览逻辑：`CliPreviewHtmlRenderer` 已迁入 `Inscape.Tooling` 并改为 `PreviewHtmlRendererDomain`，CLI 侧只保留 preview 命令路由、样式读取与输出适配。
- 本轮会话已继续按 CLI 入口边界收紧编译前置流程：`CliCompilerProject`、`CliCompilerSingleFile` 已退出源码，相关项目/单文件编译前置逻辑分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`。
- 本轮会话已继续收口 UnitySample 项目级命令分支：`CliStoryGraphCommand` 不再直接编排三条 UnitySample 项目级命令，改为委托 `CliUnitySampleProjectCommand`。
- 本轮会话已继续压薄 binding-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 binding template 读取、CSV 输出和诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。
- 本轮会话已继续压薄 role-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 role template 读取、CSV 输出和 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。
- 本轮会话已继续压薄 project-export 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载导出参数校验、导出执行和写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。
- 本轮会话确认：VSCode 长期方向是“薄扩展前端 + C# LanguageServer”，而不是继续长期借道 CLI 承载重语义能力。
- 本轮会话确认：Unity 支持不再视为 Internal 五层之一，而视为 ExternalSupport/UnityPlugin；代码可以继续留在当前仓库，但不应进入默认 .NET solution 编译链。

### 2026-05-01 当前交接结论（最新）

- 当前分支为 `main...origin/main`，HEAD 为 `85e870d refactor(cli): extract single-file compiler preflight`；最近连续提交还包括 `056d345 refactor(cli): extract project compiler preflight`、`30fe7d2 refactor(cli): split project config models`、`7c5b602 refactor(cli): align dsl source and preview loaders`。
- 最近一轮 CLI 收口已完成并验证通过：项目/单文件编译前置逻辑已分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`，`CliCore` 仅保留参数分流、共享输出和退出码整合。
- 本轮会话最终确认：不要把下一步重构目标表述成 `InscapeProjectService` / `Workspace` / `ProjectSystem` 一类总服务；长期架构术语优先使用 `Dsl`、`DslSources`、`Config`、`Cli`、`Preview`、`L10n`、`Host` 这些窄职责模块名。
- 本轮会话同时确认新的类型命名方向：参考 Bird 的思路，目录和命名空间优先表达层级与范围，类型名只表达当前模块里的具体主语和角色。`Project`、`SingleFile`、`Workspace` 不再作为类型名前缀的默认选择，`Support` / `Helper` 一类弱语义后缀应优先被拆分。

### 当前确认的模块命名

- `Compiler`：编译期真相层；当前主要由 `Inscape.Compiler` 承载。内部主业务为 `DslScript`、`StoryGraph`、`Localization`。
- `Tooling`：共享用例层；长期用于承接项目扫描、ToolConfig、Preview、Localization、HostSchema、HostBinding 等流程。当前这些流程有相当一部分仍暂住在 `Inscape.Cli`。
- `Tooling` 当前已实际落下一块稳定落点：`ToolConfig` 已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第二块稳定落点：`DslScriptSources` 已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第三块稳定落点：`Preview` 的样式表模型与样式读取已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第四块稳定落点：`Localization` 的 CSV 读取、提取与更新流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第五块稳定落点：`HostSchema` 的模板模型与模板导出逻辑已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第六块稳定落点：`HostBinding` 的绑定表 CSV 读取流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第七块稳定落点：现有角色名 CSV 的扫描与歧义收敛流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第八块稳定落点：timeline 资产扫描与 alias 归并流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第九块稳定落点：`speaker -> roleId` 的 role map 读取流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第十块稳定落点：既有 talking 资产扫描与保留 talkingId 收集流程已迁入独立项目 `src/Inscape.Tooling/`。
- `Cli`：命令行入口层；当前落在 `src/Internal/Cli/Inscape.Cli/{Entries,Commands,Providers,ViewModels}`。
- `Cli` 的 UnitySample 命令辅助已进一步收敛：binding-template、role-template、project-export 的局部读取、适配、报表与写盘逻辑都已收回各自 `CliUnitySample*Command`，当前 CLI 不再保留独立 `CliUnitySample*Reader/Writer` 辅助类型。
- `Cli` 的 UnitySample 项目级命令当前也已形成更清楚的入口边界：`CliStoryGraphCommand` 只做委托，具体三条项目级命令由 `CliUnitySampleProjectCommand` 承载。
- `Cli` 的 binding-template 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体 binding template 读取、主 CSV 输出和诊断输出由 `CliUnitySampleBindingTemplateCommand` 承载。
- `Cli` 的 role-template 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体 role template 读取、主 CSV 输出和 report 输出由 `CliUnitySampleRoleTemplateCommand` 承载。
- `Cli` 的 project-export 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体导出参数校验、导出执行和写盘输出由 `CliUnitySampleProjectExportCommand` 承载。
- `VSCode`：编辑器入口层；当前主要落在 `src/ExternalSupport/VSCode/extension.js`。
- `LanguageServer`：C# 语义服务层；当前已有 `Inscape.LanguageServer` 基线项目，diagnostics / definition / references / completion 第一层已直接复用 Compiler。
- `Runtime`：未来运行期层；当前尚未实现。
- `ExternalSupport/UnityPlugin`：Unity 环境下的外部支持层；当前由 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 作为过渡样例与原型承载。

### 2026-04-30 GitHub Copilot 接手巡检

- 已按本指南完成接手阅读：`docs/agent-handoff.md`、`docs/todo.md`、`docs/roadmap.md`、`docs/open-questions.md` 和 `docs/code-structure.md`。
- 仓库位于 `main...origin/main`，HEAD 为 `8087d5b feat: 明确 Timeline Hook phase 语义`。
- 当前存在接手前未提交变更：`samples/court-loop.inscape` 修改了一句证人对白并追加文件末尾空行；`src/ExternalSupport/VSCode/extension.js` 的 VSCode 交互按用户反馈改为接近 C# 的引用模型：block 标题显示 `N 个引用`，点击打开 References Peek，`-> target` Hover 只做类型说明，speaker 定义缺失时回退到对白引用位置。
- 当时接手验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\ExternalSupport\VSCode\extension.js`；当前 VSCode 入口已迁为 `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`。
- VSCode 角色名、block 引用计数和 `-> target` 简短 Hover 已按用户最新反馈对齐；Timeline / 资源别名定义跳转、Host Schema 脚本内跳转和变量名追溯仍未实现。
- 2026-05-01 继续修正 VSCode 角色名 Ctrl+Click 范围：不再尝试注册 `DocumentHighlightProvider`，改为在 `language-configuration.json` 的 `wordPattern` 中把全角冒号和常见中文标点作为词边界，使 `旁白：证物袋里只有一枚旧怀表。` 只把 `旁白` 识别为可跳转词。
- 2026-05-01 用户补充新的架构约束：Host Schema 查询可参考 `?hasItem("badge")->node`，但 Inscape 可读 ID 与项目内部 ID 必须通过 Host Bridge 映射；`item` 是抽象叙事概念，不等同业务 Item；下层状态只被上层查询或内部使用，不反向查询上层；Bird 只是 Unity 支持参考需求方，不应绑定 Core、通用 Unity 插件、Addressables 或 ScriptableObject；Timeline Hook 长期应泛化为宿主自定义事件示例；Unity 上层支持层应作为独立插件 / 适配包研究。
- 2026-05-01 已将原 Core 内的固定 Unity 项目适配 spike 迁出为 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，CLI 命令改为 `export-unity-sample-*` / `merge-unity-sample-l10n`。该项目明确标注为实验样例：它硬编码 `talkingId`、`roleId`、`L10N_Talking`、Timeline asset 和 manifest 字段，只用于验证导出 / L10N / hook / 绑定流程，不代表最终 Host Bridge 或通用 Unity Runtime Host。
- 2026-05-01 用户补充 Unity 支持层候选方向：在 Unity 项目的类、字段、方法上加 `[Inscape]` 一类 Attribute，由 Unity 内代码生成脚本扫描并生成待配置桥接表；人工再完成 C# 类名 / 字段名与 Inscape 可读名的映射。拿到数据后上层是直接绑定事件、轮询触发，还是混合模型仍待定，不应提前写死。
- 2026-05-01 已整理 VSCode 扩展发布工作流：扩展改动后不能只重启窗口，必须重新打包并覆盖安装；当前推荐入口是 `src/ExternalSupport/VSCode/` 下的 `npm run rebuild:vsix`，细则见 [VSCode 扩展发布工作流](vscode-release-workflow.md)。
- 2026-05-01 VSCode 可玩预览已经落地到 custom editor：默认通过 `Inscape: Open Preview` / `Inscape: Toggle Preview` 在源码右侧打开，预览不再劫持 `.inscape` 源码标签页或 Ctrl+Click 跳转。当前交互是单栏沉浸式阅读体验，支持点击选项推进、无选项时点击正文继续、Back、Restart、diagnostics、源码回跳，以及编辑防抖刷新和保存后立即刷新。
- 2026-05-01 预览链路的关键经验已确认：webview 必须显式启用 scripts；刷新时要保留当前 `{ current, path }` 状态，避免每次回到第一页；CLI 调用应优先复用已构建的 `Inscape.Cli.exe`，其次 `dotnet exec Inscape.Cli.dll`，最后再回退到 `dotnet run --project ...`，否则交互延迟会明显偏高。
- 2026-05-01 VSCode 脚本交互约定已进一步收敛：`@entry`、`@scene`、`@timeline` 等统一视作 `@metadata` 语法层，`[]` 视作宿主绑定 / 行内标签层；二者都应提供 Hover 与可理解的导航，但不要在 VSCode 侧重写 Core 语义。预览中的源码回跳与源码编辑器内的 Ctrl+Click 应保持隔离，不做自动双向同步。
- 2026-05-01 VSCode 双向定位又补了一层：预览里的 `源码` 按钮现在优先复用已打开的源码编辑器，否则新开源码页签；编辑器中的正文 / 选项文本不再使用 `DocumentLinkProvider`，避免整段文本常驻下划线。当前用 `DefinitionProvider` 提供精确 Ctrl+指向链接态，并通过 selection bridge 在 Ctrl+Click 后调用 `inscape.revealInPreview`，继续打开或复用预览并定位到对应页面；`Inscape: Reveal Current Selection In Preview` 作为显式兜底入口保留。这个行为属于作者体验层，不改变 DSL 语义或 Core 输出。

已经落地：

- 文档体系、ADR、路线图和 TODO。
- C# Compiler Core：解析 `.inscape`、生成 Narrative Graph IR、诊断图结构。
- 图叙事基线：显式节点标题、跨文件项目编译、项目内节点标题全局唯一、节点内 `@entry` 项目入口，以及项目级 CLI `--entry 标题` 临时入口覆盖。
- 行级锚点：`l1_<fnv1a64-hex>`，不依赖文件路径或绝对行号，检测 `INS040` 锚点碰撞。
- CLI：单文件和项目级 `check`、`diagnose`、`compile`、`preview`。
- HTML 预览：支持单文件/项目级 IR、节点跳转、选择、回环、Restart、Back、路径和锚点显示。
- 本地化：CSV 提取、按旧 CSV 精确继承译文、`current/new/removed` 状态标记。
- VSCode 原型：TextMate 高亮、snippets、诊断桥接、节点补全、角色补全、宿主绑定别名补全、Outline、跳转定义、引用查找、Hover、block CodeLens、本地化导出/更新命令，以及可玩预览 custom editor。角色补全优先读取 `hostBridge`，无 Host Bridge 时只扫描工作区已有 speaker；角色 Ctrl+Click 会跳到 Host Bridge speaker 行或对白引用位置，Find All References 会列出工作区对白；block 标题 CodeLens 显示 `N 个引用`，用于追溯调用方；宿主绑定提示读取 `hostBridge` 并覆盖 `@timeline ...` / `@timeline.<phase> ...` 位置；预览默认侧边打开，支持源码回跳、Back / Restart、点击正文继续和刷新后保留当前页进度。
- Bird/Unity 初步调研：已梳理 `StorySystem`、`TalkingTM`、`L10N_Talking`、`DirectorSystem` 和 `TimelineEffectTM` 的边界，详见 [Bird / Unity 调研记录](bird-unity-research.md)。
- UnitySample Adapter 实验样例：`export-unity-sample-role-template`、`export-unity-sample-binding-template`、`export-unity-sample-project` 和 `merge-unity-sample-l10n` 保留早期固定数据结构导出验证。适配器位于 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，命令入口位于 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`；它们不得反向污染 Compiler 或 Internal CLI。详见 [UnitySample Adapter 实验样例](unity-sample-adapter.md)。
- 项目配置：CLI 会自动读取项目根目录 `inscape.config.json`，也支持 `--config path`。当前配置为 UnitySample 样例命令提供默认值：`talkingIdStart`、`roleMap`、`bindingMap`、`existingRoleNameCsv`、`existingTimelineRoot`、`existingTalkingRoot`；命令行参数优先级更高。这仍不是最终 Host Bridge。详见 [项目配置草案](project-config.md)。
- 宿主 Schema 草案：新增 `hostSchema` 项目配置字段与 `export-host-schema-template` CLI 命令，用于生成 `inscape.host-schema` JSON 模板，描述纯查询和宿主动作清单，不改变当前 DSL 解析或 UnitySample 导出行为。VSCode 已提供 `inscape.host.schema.json` / `*.host.schema.json` 的 JSON Schema 校验，以及 `Inscape: Show Host Schema Capabilities` 命令读取并浏览当前 query / action / legacy event。详见 [宿主 Schema 草案](host-schema.md)。
- Bird 角色绑定审查：`export-bird-role-template` 支持 `--report`，输出 `unique`、`ambiguous`、`missing`、`unscanned` 状态。2026-04-30 用 Bird 当前 `L10N_RoleName.csv` 试跑，当前样例中 `旁白` 为 `ambiguous`，候选 `1050|10001`；`成步堂` 和 `证人` 为 `missing`。因此当前导出的 `bird-roles.csv` 仍全部为空，需要人工补齐或更换测试文本中的角色名。
- Bird L10N 合并预览：`merge-bird-l10n <generated-L10N_Talking.csv> --from <existing-L10N_Talking.csv> --report report.csv -o merged.csv` 已实现。规则是保留 Bird 未涉及行、新增 Inscape 行、源文本未变时保留译文、源文本变化时清空目标语言列并把旧值写入 report。2026-04-29 已用 Bird 当前 `L10N_Talking.csv` 试跑，原表 270 行、合并预览 275 行、报告只包含 5 个 `added` 行，未改动 Bird 正式表。
- Unity Editor Importer 原型：`src/ExternalSupport/UnityPlugin/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs` 可复制到 Bird 项目 `Assets/Editor/`，读取 manifest 并创建 / 更新 `TalkingSO`，将 `phase=talking.exit` 的 Timeline Hook 映射为 `TalkingEffectTM.PlayTimeline`，其他 phase 只报告 unsupported warning 并跳过；已提供 `Dry Run Import Manifest...` 菜单、`DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine` batchmode 入口。Dry Run 输出创建 / 更新 / 缺失引用计划，报告既有 `TalkingTM` 的字段级变化，并在 manifest 同目录写入带 Inscape 节点、锚点和源位置的 `bird-import-dry-run-report.txt`。真实 Import 可加 `-inscapeApplyAddressables` 显式调用 Bird 现有 `TalkingSO.ApplyAA()`，将资源加入 `TM_Talking` group / label。详见 [Unity Editor Importer 草案](unity-editor-importer.md)。
- Bird 项目 batchmode 试跑：2026-04-29 已在 `D:\UnityProjects\Bird` 通过 Unity 2023.2.22f1 执行 `DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine`。样例 manifest 先计划创建 5 个 `TalkingSO`、0 个 warning、0 个 Timeline Hook；真实 Import 后生成 `Assets/Resources_Runtime/Talking/InscapeGenerated/SO_Talking_Inscape_100000.asset` 到 `SO_Talking_Inscape_100004.asset`。二次 Dry Run 显示 5 个 UPDATE 且 `no field changes detected`。随后试跑 `-inscapeApplyAddressables`，只修改 `Assets/Plugins/UnityPlugin/AddressableAssetsData/AssetGroups/TM_Talking.asset`，新增 5 个 address 为资源简名、label 为 `TM_Talking` 的 entries。Bird 项目当前新增 importer、`.meta`、`InscapeGenerated` 资源并修改 `TM_Talking.asset`，尚未提交。

尚未落地：

- Bird 项目新增 importer 与生成资源的提交策略。
- Unity Editor Importer 的字段级 diff UI、选择性合并与回滚能力。
- 资源、Timeline 的宿主绑定配置。
- 正式 Language Server。
- 更细粒度的 VSCode 预览热刷新与状态提示。
- 条件、变量、状态查询、自定义指令。
- 编辑器 Alpha。

## 已确认的关键认知

- 第一阶段的路线是：先 DSL，再游戏引擎支持层，再编辑器，再自研引擎。
- DSL 的第一版不做变量、条件查询和自定义指令。
- DSL 更像服务于数据驱动引擎的数据表达层，不应该直接控制业务实体、服务端或 Unity API。
- 变量与状态查询后续只在 DSL 中表达查询，由宿主层按 Schema 解析和执行。
- Inscape 支持图叙事：节点之间可以是链、树、回环或一般有向图。
- 块级叙事单元必须使用显式节点名；行级文本使用隐式 hash。
- 语法、编辑器交互和 Timeline 边界仍有很多未定内容，不能把草案写成最终规范。
- VSCode 阶段要尽量降低作者记忆压力，提供高亮、补全、诊断和轻量预览。
- HTML 预览是无引擎调试工具，不追求最终视觉表现。
- VSCode 扩展改动想被本机看到，必须重新打包并安装新的 `.vsix`；重启窗口只负责让已安装扩展重新加载。
- 当前本地化第一版选择 CSV；PO/XLIFF、模糊匹配、人工确认流后续再设计。
- 当前 CSV 格式已能跑通工具链，但用户反馈其生成格式不完全符合预期；这是低优先级认知，后续应结合 Bird 项目的 `L10N` 真实格式再调整。
- Bird 当前运行时的对话文本坐标是 `talkingId + index`，Inscape 的行级 hash 不应被替换，而应通过 Adapter manifest 映射到 Bird 坐标。
- Bird Timeline 是跨 Story、Feeling、Play、Explore 的演出编排层；第一版 DSL 只引用 Timeline，不直接生成 Timeline。
- 最新竞品定位结论：Inscape 的近中期工程参照是 Yarn Spinner，写作与即时预览参照是 Ink/Inky，长期完整 VN 引擎参照是 Ren'Py，编辑器与生产管线参照是 Arcweave / articy:draft。详见 [DSL 生态定位对比](dsl-ecosystem-positioning.md) 和 ADR 0007。
- 最新产品体验结论：Inky 只证明了“边写边玩”的价值，不足以作为 Inscape 编辑器体验上限；后续应更多参考编程编辑器、Notion 和 Medium 的低干扰写作体验，并围绕脚本/节点图/CSV 三视图组织工具。
- VSCode 正文 / 选项文本的“默认无下划线，Ctrl+指向才显示链接态”不能靠 `DocumentLinkProvider` + 样式覆盖实现；这一组合会在“永远有下划线”和“永远没下划线”之间反复回归。正文链接态的长期做法已经收敛为：不用 `DocumentLinkProvider`，改用 `DefinitionProvider` 提供精确范围，并通过 selection bridge 恢复 Ctrl+Click 预览定位。详见 ADR 0009。
- 用户当前明显不喜欢缩进承载核心语义；`# 标题` + 空行分块已进入候选，但还没有替代现有 `:: node.name`。
- 用户最新明确判断：`@` 与 `[]` 当前设计尚未收敛，作者侧几乎感受不到稳定差异；这不是理解问题，而是语法职责重叠。后续应把“是否保留两套壳、如何切分语义/时机与资源/别名绑定、是否保留 `@timeline` / `[timeline: ...]` 双写法”提升为近期重点，而不要继续带着模糊心智堆更多宿主功能。
- 用户希望代码组织更接近 Bird 这类游戏项目的可读经验：有清晰入口、生命周期式流程、逻辑与表现分层、数据与逻辑分层、控制与业务分层，并且易于模块化加功能。已新增 [编码与命名规范](coding-conventions.md) 和 [渐进式重构计划](refactoring-plan.md)，后续重构应小步按该规范推进。
- 当前已进一步收敛命名方向：架构文档仍用 `Dsl`、`Config`、`Preview`、`L10n`、`Host` 这类模块术语表达边界；具体类型命名则改为 Bird 风格的“具体主语 + 角色”模型，优先让目录承担层级与范围信息，不再把短层前缀扩张成所有类型的默认命名方式。
- 当前重构边界也已收敛：`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 继续作为实验样例存在，不参与这一轮 CLI / Core / VSCode 的可维护性重构，除非任务明确要求调整其回归样例角色。
- CLI 当前已完成多步低风险瘦身：顶层元命令、单文件命令与项目级命令分支都已从 `CliCore` 主入口中抽离；项目配置、项目源扫描、预览样式等共享流程已上提到 `Inscape.Tooling`，项目/单文件编译前置流程也已分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`。当前下一步的正确方向不是继续扩张 Cli，而是继续按 ADR 0010 和分层规则，把仍然单命令单用途的局部编排收紧到入口，把真正共享的流程继续上提到 `Tooling`。
- 2026-05-11 已开始执行 Tooling 抽取：当时 `CliConfigLoader` / `CliProjectConfig` 已被 `Inscape.Tooling` 内的 ToolConfig 模型与读取逻辑取代，`CliCompilerProject` 与 `CliCompilerSingleFile` 通过 `ToolConfigReaderDomain` 取配置。这一刀通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 Tooling 抽取：当时 `CliDslSourceLoader` 已被 `Inscape.Tooling` 内的 `DslScriptSourcesLoaderDomain` / `DslScriptSourceOverrideModel` 取代，`CliCompilerProject` 只保留 `--override` 参数解释与编排调用。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第三刀：当时 `CliPreviewStyleLoader` / `CliPreviewStyleSheet` 已被 `Inscape.Tooling` 内的 `PreviewStyleReaderDomain` / `PreviewStyleSheetModel` 取代；后续又继续把 `CliPreviewHtmlRenderer` 上提到 `Inscape.Tooling` 内的 `PreviewHtmlRendererDomain`，使 CLI preview 命令只保留路由、样式读取与输出适配。这两步都通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第四刀：当前 `CliCore` 内的本地化 CSV 读取、提取与更新共享辅助已被 `Inscape.Tooling` 内的 `LocalizationCsvFlowDomain` 取代，Cli 命令侧只保留 `--from` 参数读取和错误输出。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第五刀：当前 `CliHostSchemaTemplateWriter` 已被 `Inscape.Tooling` 内的 `HostSchemaTemplateWriterDomain` 取代，`CliTopLevelCommand` 只保留 `-o` 参数读取与输出适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第六刀：当前 `CliUnitySampleSupport` 内的 UnitySample 绑定表 CSV 读取共享流程已被 `Inscape.Tooling` 内的 `HostBindingMapReaderDomain` / `HostBindingMapEntryModel` 取代，Cli 侧只保留把通用绑定项映射到 `UnitySampleHostBinding` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第七刀：当前 `CliUnitySampleSupport` 内的现有角色名 CSV 扫描与歧义收敛流程已被 `Inscape.Tooling` 内的 `RoleNameBindingScanDomain` / `RoleNameBindingScanResultModel` / `RoleNameBindingCandidateModel` 取代，Cli 侧只保留 UnitySample role template report 输出。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第八刀：当前 `CliUnitySampleSupport` 内的 timeline 资产扫描与 alias 归并流程已被 `Inscape.Tooling` 内的 `TimelineAssetBindingScanDomain` / `TimelineAssetBindingModel` 取代，Cli 侧只保留把通用扫描结果映射到 `UnitySampleTimelineAssetBinding` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第九刀：当前 `CliUnitySampleSupport` 内的 `speaker -> roleId` role map 读取流程已被 `Inscape.Tooling` 内的 `RoleMapReaderDomain` 取代，Cli 侧只保留把通用结果映射到 `UnitySampleExportOptions.RoleIdsBySpeaker` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行第十刀：当前 `CliUnitySampleSupport` 内的既有 talking 资产扫描与保留 talkingId 收集流程已被 `Inscape.Tooling` 内的 `TalkingIdReservationScanDomain` 取代，Cli 侧只保留把通用结果映射到 `UnitySampleExportOptions.ReservedTalkingIds` 的适配。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 CLI 收口：当前 `CliUnitySampleSupport` 内的导出目录写盘与 role template report 输出已分别被 `CliUnitySampleExportWriter` 和 `CliUnitySampleRoleTemplateReportWriter` 取代。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行命名收敛：原 `CliUnitySampleSupport` 已退出源码，拆为 `CliUnitySampleExportOptionsReader` 与 `CliUnitySampleTemplateBindingReader` 两个具体 reader。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample binding-template 收口：`CliUnitySampleTemplateBindingReader` 现在只返回 `TimelineAssetBindingModel`，最后一层 UnitySample 类型适配已拆到 `CliUnitySampleBindingTemplateWriter`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 CLI 总入口命名收敛：`CliTopLevelCommandRunner`、`CliDslScriptCommandRunner`、`CliStoryGraphCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore`。
- 2026-05-11 已继续执行 CLI 命令入口终局后缀收敛：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 与 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，改为 `CliTopLevelCommand`、`CliDslScriptCommand`、`CliStoryGraphCommand` 与 `CliUnitySample*Command`。这一刀同样通过了命名规则对照：`Command` 仍属于宿主入口白名单后缀，`Runner` 已退出当前源码。
- 2026-05-11 已继续执行 UnitySample 项目级命令收口：`CliStoryGraphCommand` 当前不再直接编排三条 UnitySample 项目级命令，相关逻辑已迁入 `CliUnitySampleProjectCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample binding-template 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载 binding template 读取、主 CSV 输出与诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。这一刀同样通过了 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj`。
- 2026-05-11 已继续执行 UnitySample role-template 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载 role template 读取、主 CSV 输出与 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample project-export 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载导出参数校验、导出执行与写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj`。

- 2026-05-01 已完成 CLI 项目命令收口：当时项目级命令分发落在 `CliStoryGraphCommand`，共享的“配置读取 + `.inscape` 项目源扫描/读取/override + 项目编译”前置流程收口到 `CliCompilerProject`；其中 DSL 源加载位于 `CliDslSourceLoader`，UnitySample role/binding/export 辅助逻辑位于 `CliUnitySampleSupport`。单文件命令的“输入读取 + 邻近项目配置读取 + 单文件编译”前置流程也收口到 `CliCompilerSingleFile`。`CliCore` 只保留参数分流、共享输出和退出码整合。当时验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\ExternalSupport\VSCode\extension.js`。这些类型名和验证入口后来继续按目录优先、主语/角色的方式逐步替换。

- 2026-05-11 认知又补了一层：除了命名模型收敛，长期架构本身也已定稿为 Internal / ExternalSupport 两层。当时曾把 `VSCode` 归入 Internal；2026-05-17 已由 ADR 0015 修正为 ExternalSupport editor extension。当前 Internal 以 `Compiler` / `Tooling` / `Cli` / `LanguageServer` / `Runtime` 组织；ExternalSupport 以 `VSCode` 与 `UnityPlugin` 为核心。详见 ADR 0011、ADR 0015、[代码结构规划](code-structure.md) 和 [编码与命名规范](coding-conventions.md)。

## 本轮踩坑总结

- 这次回归的根因不是颜色配置，而是误把 `DocumentLinkProvider` 当成“可样式化的 Ctrl+Hover 链接态”来用。
- TextMate scope、decorations、`inscape.editor-style.json` 里的 `...TextDecoration` 只适合处理视觉层，不适合修复 provider 语义层误用。
- 以后碰到“常驻下划线 / 链接态消失”这类问题，先查 provider 类型是否选错，再查样式；不要反过来。
- 只要改了 `src/ExternalSupport/VSCode/`，就必须 `npm run rebuild:vsix` 并安装；否则很容易把“旧扩展效果”误判成“新代码回归”。
- 最终稳定方案已经明确分层：`DefinitionProvider` 只负责 Ctrl+指向的瞬时链接态，selection bridge 只负责把 Ctrl+Click 转成 `inscape.revealInPreview`，显式命令只做兜底。
- 如果未来再改正文 / 选项的导航体验，优先在 provider / selection 流程里排查，不要先去改主题、TextMate scope 或样式 JSON。
- 重构时不要把“顺手清理”混进当前节点；`extension.js` 这类大文件只能按 provider / controller / command 等小边界逐次迁移。
- 命名不是装饰，而是规范约束；`Support` / `Helper` / `Manager` 这类弱命名应视为待拆信号，目录承担范围，类型名表达主语和角色。
- 文档口径滞后会直接制造下一轮误判；每个阶段性节点都要同步更新 handoff / TODO，长期规则或方向变化要进入 refactoring plan 或 ADR。

## 下一步优先队列

建议优先做小而闭环的任务，不要直接跳到大规模重构。

1. 继续推进 P3 Round 11 Runtime State 最小模型。
   - 从 [SelfHostedEditor P3 Runtime Query Provider Audit](self-hosted-editor-p3-runtime-query-provider-audit.md)、[运行时与 Unity 宿主](runtime-unity.md) 和 ADR 0021 接上。
   - 优先实现 `format`、`runtimeVersion`、`scriptVersion`、`position`、`flow`、`facts`、`random`、`host.checkpointId` 与 `ValidateStateAgainstCurrentScript` 的 compatible / migratable / incompatible shape。

2. 继续推进 Stable Node ID / 本地化主线。
   - ADR 0013、sidecar 闭环、保守自动重命名识别、VSCode 显式 `Update Stable Node Map` 入口、插入标题后的自动同步、标题重命名人工确认 / 冲突报告、本地化 alignment / audit report，以及相似文本人工候选第一版都已落地。
   - 下一步建议细化候选评分和 review 展示，而不是扩展自动继承范围。

3. 本地化 Diff / Alignment 后续。
   - 状态机、CSV / report 字段、anchor + occurrence + diff 对齐流程已经完成设计，显式 `audit-l10n-alignment-project` 已落地。
   - 当前实现已把更宽松的相似文本匹配限制在人工候选 / review report，不进入默认 `update-l10n` 确认译文；Goal 15 第一版已把 line sidecar refresh result / status / line id 信息接入 alignment audit；candidate diff 也已作为 Tooling presenter 的二级动作进入 review。后续可以继续评估更强的 line identity 迁移契约或编辑器 review UI；批量审查已在 P2 Round 10 后置到 P2 之后。

4. VSCode 重构守规继续收口。
   - 每完成一个 VSCode 功能节点后，立即做命名 / 分层 / 目录 / 入口厚度自检。
   - 对 Localization 尤其要继续区分宿主适配壳与宿主无关契约，避免 command 入口重新吸收 review UI 或可复用语义。

5. Tooling 共享流程继续收敛。
   - 继续落到 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 等窄模块。
   - 不要新建泛化 `ProjectService`；如果要做，先挑一个仍重复的跨 Cli / VSCode / LanguageServer 流程做小闭环。

6. Unity / Bird 只做准备和决策，暂不扩研发。
   - 待定：Bird 项目新增 importer 与 `InscapeGenerated` 资源提交策略。
   - 待验证：带真实 Timeline 绑定的 Bird Import Dry Run，确认 `talking.exit` 的 `TalkingEffectTM.PlayTimeline` 落地和其他 phase warning。
   - 低优先级：结合 Bird `L10N` 真实格式决定是否调整 Inscape CSV 字段和列顺序。

## 文档检索地图

为了减少 token 浪费，按任务读取对应文档：

```text
任务类型                           优先读取
项目快照 / 接手                    docs/agent-handoff.md, docs/todo.md, docs/roadmap.md
设计决策溯源                       docs/adr/README.md, 对应 ADR
DSL 语法                           docs/dsl-syntax-guide.md, docs/dsl-language.md, docs/syntax-comparison.md, docs/open-questions.md
`@` / `[]` 语法分工                 docs/authoring-marker-contract.md, docs/authoring-query-interpolation-contract.md, docs/query-interpolation-data-contract.md, docs/query-interpolation-tooling-decision.md, docs/dsl-syntax-guide.md, docs/dsl-language.md, docs/host-bridge-contract.md
`@` / `[]` 兼容残留审计             docs/authoring-marker-compatibility-audit.md, docs/vscode-tooling.md, src/ExternalSupport/VSCode/README.md
DSL 生态定位 / 竞品对比             docs/dsl-ecosystem-positioning.md, docs/adr/0007-dsl-benchmark-positioning.md
代码结构 / 新模块                  docs/code-structure.md, docs/coding-conventions.md, docs/refactoring-plan.md, src/Inscape.Compiler, src/Inscape.Cli
VSCode 工具                        docs/vscode-tooling.md, src/ExternalSupport/VSCode/README.md, docs/vscode-language-server-migration-plan.md
防回归工作流                       docs/regression-workflow.md, docs/refactoring-plan.md
HTML 预览                          src/Inscape.Tooling/PreviewHtmlRendererDomain.cs, docs/vscode-tooling.md
本地化 / hash                      docs/hash-localization.md, docs/l10n-extraction.md
宿主 Schema / 查询事件             docs/host-schema.md, docs/usage-manifest-contract.md, docs/condition-syntax-contract.md, docs/host-query-event-registration-strategy.md, docs/dsl-language.md, docs/open-questions.md, docs/todo.md
Unity / Host Bridge                docs/unity-sample-adapter.md, docs/project-config.md, docs/runtime-unity.md, docs/architecture.md, docs/todo.md
编辑器阶段                         docs/editor-design.md, docs/roadmap.md
```

不要每次都全量阅读所有文档。先读本指南和 TODO，再按任务进入 1 到 3 个目标文档。

## 工作方法

- 先看 `git status`，确认是否有未提交变更。
- 每轮先读 `docs/agent-handoff.md`、`docs/todo.md` 和目标目录 `README.md`；只在需要时读取 1 到 3 个任务相关文档。
- 从大目标中切一个小节点执行，先明确本轮边界：只搬什么、只改什么、哪些相邻问题留到下一节点。
- 修改设计、语法、IR、本地化、存档或编辑器交互时，同步更新文档；长期决策新增 ADR。
- 保持 `Inscape.Compiler` 不依赖 Unity、VSCode、HTML 或第三方包。
- CLI 可以作为工具层封装 Core，但不要把核心语义只写在 CLI 里。
- VSCode 扩展里可以做轻量行扫描，但语法真相必须来自 Core/CLI。
- 修改后先跑局部静态检查，再运行规定构建和测试；涉及 VSCode 时跑 Node 语法/JSON 检查。
- 提交前看 `git diff --stat` 和关键 diff，确认没有越界改动。
- 每个阶段完成后提交并推送，保持远端可接续；提交粒度优先是一小节点一提交。
- 若改动发生在 `src/ExternalSupport/VSCode/`，默认把“打包 + 安装 + reload”纳入验证流程，而不要把源码修改误认为发布完成。

## 常用命令

在当前 Windows 环境中，Git 需要显式安全目录：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

若用户明确要求“提交并推送”且当前任务边界清楚，可优先使用仓库脚本：

```powershell
tools\CommitAndPushInscape.cmd "commit message"
```

本机 Codex skill `inscape-git-push` 也记录了同一流程，供后续线程减少重复 git 操作上下文。

验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-build
npm --prefix src\ExternalSupport\VSCode run check:structure
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
node -e "JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Language/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Syntaxes/inscape.tmLanguage.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Snippets/inscape.code-snippets','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json','utf8')); console.log('json ok')"
```

CLI 样例：

完整清单见 [CLI 命令速查](cli-command-reference.md)。终端内可用：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help preview-project
```

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.csv
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-role-template samples -o config\unity-sample-roles.csv
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-binding-template samples -o config\unity-sample-bindings.csv
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-project samples -o artifacts\unity-sample-export
dotnet run --project src\ExternalSupport\UnityPlugin\Inscape.UnitySample.Cli\Inscape.UnitySample.Cli.csproj -- export-unity-sample-project samples --unity-sample-binding-map config\unity-sample-bindings.csv -o artifacts\unity-sample-export
```

## 已知环境与习惯

- 文档默认中文，文件名英文小写与连字符。
- PowerShell 读取中文文档时使用 `Get-Content -Encoding UTF8`。
- 若 `rg` 在本机不可用或被拒绝执行，使用 `Get-ChildItem` 与 `Select-String` 回退。
- 避免改动 `bin/`、`obj/`、`.git/`、`node_modules/` 和生成物，除非任务明确要求。
- 项目扫描会忽略 `.git`、`bin`、`obj`、`node_modules` 和 `artifacts`。

## 接手时不要误判

- `@entry` 和 CLI `--entry 标题` 临时入口覆盖都已实现；项目配置文件式入口仍未设计。
- 行级 hash 已实现，但节点重命名迁移、显式稳定 ID 和模糊匹配还没做。
- VSCode 原型已经具备很多能力，包括本地化命令，但不是正式 Language Server。
- HTML 预览已经能调试图结构，但不是游戏运行时。
- 本地化旧表更新只做精确锚点继承，不做相似文本自动匹配。
- Timeline/DirectorSystem 的初步边界已记录：第一版只引用 Timeline，不直接生成 Timeline；Hook phase 已有最小语法，但除 `talking.exit` 外仍需运行时或 adapter 语义验证，Presentation IR 边界后续再设计。
- UnitySample 导出样例不生成 Unity `.asset`；它只是当前 adapter / importer 思路的实验输入，不是最终 Host Bridge。
