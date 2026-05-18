# TODO

状态：持续维护

本文件记录已经能执行或需要调研的工作。仍未形成共识的问题放在 [待确认问题](open-questions.md)，已经形成长期决策的问题放在 [ADR](adr/README.md)。

当前目录迁移与不符合项总蓝图见 [目录优先重构蓝图](directory-first-reframe-plan.md)。当前后续执行面板见 [/goal 后续目标计划](goal-plan.md)。

## 接力优先队列

下一位接手者建议按以下顺序推进。已完成的 Goal 0 / 3 / 4 / 5 / 6 / 9 不再放进优先队列，只保留在下方历史账本中。当前剩余事项可以收敛成四组：先补手动 smoke 收口现有体验，再推进 stable id / 本地化主线，然后再挑 Tooling 单点收敛，最后才是 Unity / Bird 的准备项。

1. **先收口现有 VSCode 体验。**
	- **Goal 7 手动 smoke**：补完 `inscape.preview.sourceSyncMode = off|click|selection` 的真实 VSCode 手动 smoke，确认默认值与三种模式交互边界。
	- **Goal 11.1 手动 smoke**：在真实 VSCode 场景里验证“LanguageServer 不可用 -> CLI diagnostics fallback 可用”，补齐 output channel / 体验观察。
	- 这两项都不是新设计，而是把已经落地的功能做真实场景收口；做完后可以更安心地删 fallback 或继续调体验。
2. **再推进 Stable Node ID 主线。**
	- 已完成：ADR 0013、stable node id / title map 契约、`update-node-map-project` sidecar 闭环、保守自动重命名识别、VSCode 显式 `Update Stable Node Map` 入口。
	- 下一步建议顺序：
		- G10.2.2 标题创建后自动同步 stable node map，减少手工维护。
		- G10.2.3 标题重命名的人机确认 / 冲突报告入口。
		- G10.3 本地化 alignment / audit report。
		- G10.4 相似文本只作人工候选，不静默继承旧译文。
3. **把本地化迁移闭环做实。**
	- 已完成：状态机、CSV / report 字段、anchor + occurrence + diff 对齐流程设计。
	- 待做：实现显式 alignment / audit report，保护旧译文，标记 `kept` / `new` / `changed` / `removed` / `conflict` / `stale`。
	- 注意：这条实际上依赖 Goal 10 的 stable node id 维护进一步落地，所以优先级排在 Goal 10 后半段，而不是独立抢跑。
4. **最后再挑 Tooling 单点收敛。**
	- 保持原则：继续落到 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 等窄模块；不要新建泛化 `ProjectService`。
	- 只挑一个仍重复的跨 Cli / VSCode / LanguageServer 流程做小闭环，不把“顺手统一”混进主线节点。
5. **Unity / Bird 只做准备和决策。**
	- 待定：Bird 项目新增 importer 与 `InscapeGenerated` 资源提交策略。
	- 待验证：带真实 Timeline 绑定的 Bird Import Dry Run，确认 `talking.exit` 的 `TalkingEffectTM.PlayTimeline` 落地和其他 phase warning。
	- 低优先级：结合 Bird `L10N` 真实格式决定是否调整 Inscape CSV 字段和列顺序。

## 剩余工作总览

- **当前可直接推进**：
	- Goal 7 手动 smoke。
	- Goal 11.1 手动 smoke。
	- Goal 10.2.2 标题创建后自动同步 stable node map。
- **当前主线研发**：
	- Goal 10.2.3 标题重命名人工确认 / 冲突报告。
	- Goal 10.3 本地化 alignment / audit report。
	- Goal 10.4 相似文本人工候选。
- **低一层优先级但可随时切入**：
	- Tooling 单点收敛。
	- 体验细化后续项。
- **需要用户或宿主侧决策**：
	- Bird importer / `InscapeGenerated` 资源提交策略。
	- 真实 Timeline 样例验证范围。
	- 未来 Unity package 结构。
- **持续规则**：每次阶段性提交后同步更新 [Agent 接手指南](agent-handoff.md)，并按 [回归工作流](regression-workflow.md) 验证、提交、推送。

## 文档与接手效率

- [x] 建立 Agent 接手指南，记录当前快照、检索地图、工作方法和验证命令。
- [x] 建立根目录 `AGENTS.md`，为未来 agent 提供最短入口。
- [x] 完成 GitHub Copilot 接手巡检，记录当前 HEAD、未提交变更和验证结果。
- [x] 沉淀 DSL 生态定位对比，明确 Yarn / Ink / Ren'Py / Arcweave / articy 等方案的分层参照关系。
- [x] 建立 CLI 命令速查清单，并让 CLI 支持 `commands` / `help <command>` 终端查询。
- [x] 将固定 Unity 项目适配 spike 从 `Inscape.Compiler` 迁出为 `Inscape.Adapters.UnitySample` 实验样例，并明确它不是最终 Host Bridge。
- [x] 固化 VSCode 扩展发布工作流，补充 `npm run rebuild:vsix` 与 `.vsix` 安装步骤，避免只改源码不更新到本机扩展。
- [x] 建立编码与命名规范，明确入口、生命周期式方法、数据/逻辑/表现/适配分层和渐进式重构顺序。
- [x] 将命名规范进一步收敛为 Bird 风格的“目录优先 + 主语/角色”模型，并以 ADR 0010 固化范围词与角色词约束。
- [x] 明确 Internal / ExternalSupport 边界，并以 ADR 0011 固化 Tooling 中间层与 UnityPlugin 外部支持层定位。
- [x] 建立渐进式重构计划，按大目标/中目标/小目标安排入口、测试、CLI、VSCode、source map、Host Bridge 和 Runtime 前置设计。
- [x] 建立 [研发计划](development-plan.md)，把 Compiler / Tooling / Cli / VSCode / LanguageServer / ExternalSupport 的推进顺序显式写出。
- [ ] 每次完成阶段性提交后，同步更新 [Agent 接手指南](agent-handoff.md) 的当前快照。（持续规则，不作为一次性完成项）
- [x] 清除研发期 legacy / fallback。
	- [x] 将主样例和内部测试从 `:: node.name` 迁到 `# 标题`。
	- [x] 移除 Compiler / LanguageServer 对 `:: node.name` 的解析和诊断兼容文案。
	- [x] 移除 VSCode 对 `:: node.name` 的扫描、高亮和 snippet。
	- [x] 移除 legacy `[kind: alias]` / `[timeline: alias]` inline host binding 行为、样例和工具提示。
	- [x] 移除 `unitySample.roleMap` / `unitySample.bindingMap` fallback，统一使用 `hostBridge`。
	- [x] 清理当前行为文档中的 legacy / compatibility 口径，只在 ADR 或历史审计文档保留背景。

## 代码质量与渐进式重构

执行顺序和验收标准见 [渐进式重构计划](refactoring-plan.md)。

- [x] 按目录优先铁律重构仓库骨架，让架构成果先在路径与 solution 边界上可见。
	- [x] 已完成文档冻结：新增 [目录优先重构蓝图](directory-first-reframe-plan.md)，并以 [ADR 0012](adr/0012-directory-first-repository-reframe-order.md) 固化“先目录、后改名”的顺序。
	- [x] 创建 `src/Internal`、`src/ExternalSupport`、`tests/Internal`、`tests/ExternalSupport` 及其已承载源码的 Layer / Business 目录，并为稳定目录补 `README.md` 规则文件。
	- [x] 清理纯规划占位目录，避免把 C 阶段的 LanguageServer / Runtime 和未来外部支持结构误当成 B 阶段成果。
	- [x] 将 `Inscape.Compiler`、`Inscape.Tooling`、`Inscape.Cli`、VSCode 前端与 Unity 原型迁入新目录树。
		- [x] 已先迁入 Internal 侧 `.NET` 项目路径：`Inscape.Compiler` -> `src/Internal/Compiler/Inscape.Compiler.csproj`，`Inscape.Tooling` -> `src/Internal/Tooling`，`Inscape.Cli` -> `src/Internal/Cli/Inscape.Cli`；Compiler 项目名、命名空间和旧类型名均已完成收敛。
		- [x] 已迁入 VSCode 前端路径：`src/ExternalSupport/VSCode`；VSCode 作为外部编辑器平台支持直接归属 ExternalSupport / VSCode，不再保留 `EditorExtensions` 类别层或 `vscode-inscape` 包名目录，后续再做资源 / 脚本边界收口。
		- [x] 已建立 VSCode 内部目录命名审计，确认 `LanguageFeatures`、`WorkspaceIndex`、`PreviewWebview`、`ExtensionEntry` 和小写资源 / 脚本目录需要后续继续收敛。
		- [x] 已迁入 Unity 外部支持路径：`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer`。
	- [x] 更新 `Inscape.slnx` 与 `ProjectReference`，并把 UnityPlugin 相关项目移出默认 .NET solution 编译链。
		- [x] 已从 `Inscape.slnx` 直接项目清单移除 UnitySample。
		- [x] 已将 UnitySample 命令迁入 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`，并将 UnitySample 回归测试迁入 `tests/ExternalSupport/UnityPlugin/Inscape.UnitySample.Tests`；Internal CLI / Internal tests 不再引用 UnitySample，默认 solution 编译链已退出 UnityPlugin。
		- [x] 已将 UnitySample CLI 内部整理为 `Entries` / `Commands`，避免 ExternalSupport 命令入口继续平铺。
	- [x] 已将当前聚合测试项目迁入 `tests/Internal/Inscape.Tests`；后续再按 Compiler / Tooling / Cli / ExternalSupport 拆成更细测试边界。
	- [x] 在路径稳定后，再执行 Compiler 项目名、命名空间和类型名迁移。
		- [x] 已完成 Compiler 项目目录与 `.csproj` 改名：`Inscape.Core` -> `Inscape.Compiler`。
		- [x] 已完成 Compiler 命名空间迁移：`Inscape.Core.*` -> `Inscape.Compiler.*`。
		- [x] 已将 Compiler 门面类型 `InscapeCore` 收敛为 `CompilerEntry`。
		- [x] 已按角色后缀收敛 Compiler 旧类型名：`InscapeParser` / `InscapeCompiler` / `ProjectCompiler` / `GraphValidator` / `AnchorValidator` 等已改为 `DslScript*Domain`、`StoryGraph*Domain`、`*Model` 命名；命名空间仍保持 `Inscape.Compiler.*` 适度粗粒度。

- [x] 按 [编码与命名规范](coding-conventions.md) 拆分测试文件，降低 `tests/Internal/Inscape.Tests/TestCore.cs` 的阅读成本，但不改变测试语义。
	- [x] 已将 `tests/Internal/Inscape.Tests` 初步整理为 `Entries`、`Shared`、`Compiler`、`Cli`、`PreviewLocalization` 目录，保持原有轻量测试 runner 不变。
- [x] 按 command 职责拆分 CLI 入口，避免 `src/Inscape.Cli/CliCore.cs` 继续承担过多命令分发和业务编排；已完成配置读取、顶层元命令、单文件命令和项目级命令分支拆分，项目 `.inscape` 源扫描/读取/override、预览样式读取等共享流程也已上提到 `Inscape.Tooling`，`CliCore` 仅保留入口分发与共享基础输出辅助，单文件/项目编译前置流程当前已分别收回 `CliDslScriptCommand` 与 `CliStoryGraphCommand`。
	- [x] 已将 `src/Internal/Cli/Inscape.Cli` 内部整理为 `Entries`、`Commands`、`Providers`、`ViewModels` 目录，分别承载入口、具体命令、命令元数据和输出 DTO。
	- [x] 已继续收口 UnitySample 命令输出职责：将导出目录写盘拆到 `CliUnitySampleExportWriter`，将 role template report 输出拆到 `CliUnitySampleRoleTemplateReportWriter`，`CliUnitySampleSupport` 不再混放输出 writer。
	- [x] 已继续收口 UnitySample 项目级命令分支：`CliStoryGraphCommand` 不再直接编排 `export-unity-sample-binding-template`、`export-unity-sample-role-template`、`export-unity-sample-project`，改为委托 `CliUnitySampleProjectCommand`。
	- [x] 已将 UnitySample 命令从 Internal CLI 迁入 ExternalSupport 独立 CLI，`CliStoryGraphCommand` 与 `CliCore` 不再分发 UnitySample 命令。
- [x] 抽出 `Tooling` 中间层第一轮：项目扫描、配置读取、预览构建、本地化流程、HostSchema / HostBinding 流程已从 `Cli` 上提到窄职责模块，`Cli` 保持入口、参数和输出适配。
	- [x] 已将 `Inscape.Tooling.csproj` 提到 `src/Internal/Tooling` 根目录，并把源码按 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 的 `Domains` / `Models` 目录落位；命名空间暂保留 `Inscape.Tooling`。
	- [x] 已完成第一刀：创建 `src/Inscape.Tooling/`，将 ToolConfig 配置模型与读取/路径归一化逻辑迁出 `Inscape.Cli`，`Cli` 仅保留 `--config` 参数解析和错误输出适配。
	- [x] 已完成第二刀：将 `.inscape` 项目源发现、目录排除、内容读取与 override 应用逻辑迁出 `Inscape.Cli`，`Cli` 仅保留 `--override <source> <content>` 参数解析。
	- [x] 已完成第三刀：将 Preview 样式表模型与 JSON 读取逻辑迁出 `Inscape.Cli`，`Cli` 仅保留 HTML 渲染与终端输出适配。
	- [x] 已完成第四刀：将 Localization CSV 读取、提取与更新流程迁出 `Inscape.Cli`，`Cli` 仅保留 `--from` 参数读取和错误输出适配。
	- [x] 已完成第五刀：将 HostSchema 模板模型与导出逻辑迁出 `Inscape.Cli`，`Cli` 顶层命令仅保留 `-o` 参数读取和输出适配。
	- [x] 已完成第六刀：将 HostBinding 绑定表 CSV 读取流程迁出 `Inscape.Cli`，`Cli` 仅保留 UnitySample 绑定项适配与参数/错误输出处理。
	- [x] 已完成第七刀：将现有角色名 CSV 扫描与歧义收敛流程迁出 `Inscape.Cli`，`Cli` 仅保留 UnitySample role template report 输出。
	- [x] 已完成第八刀：将 timeline 资产扫描与 alias 归并流程迁出 `Inscape.Cli`，`Cli` 仅保留 UnitySample timeline 绑定结果适配。
	- [x] 已完成第九刀：将 `speaker -> roleId` 的 role map 读取流程迁出 `Inscape.Cli`，`Cli` 仅保留 UnitySample role id 适配。
	- [x] 已完成第十刀：将既有 talking 资产扫描与保留 talkingId 收集流程迁出 `Inscape.Cli`，`Cli` 仅保留 UnitySample reserved id 适配。
- [x] 按 ADR 0010 整理 CLI 与 VSCode 命名：优先消除 `Support` / `Helper` 弱语义命名，并逐步把 `Project` / `SingleFile` 这类范围词从类型名前缀移到目录、命名空间或主语后的限定词。
	- [x] 已先收敛 CLI 总入口 runner 命名：`CliTopLevelCommandRunner`、`CliDslScriptCommandRunner`、`CliStoryGraphCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`，将范围词后移到 `Command` 主语之后。
	- [x] 已继续按终局后缀白名单收口 CLI 命令入口：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 以及 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，收敛为 `CliTopLevelCommand`、`CliDslScriptCommand`、`CliStoryGraphCommand` 与 `CliUnitySample*Command`。
	- [x] 已继续按终局后缀白名单收口 CLI 展示与命令元数据类型：`CliCompileOutput`、`CliProjectCompileOutput` 已分别改为 `CliCompileViewModel`、`CliStoryGraphCompileViewModel`，`CliCommandCatalog` 已改为 `CliCommandProvider`，内部 `CliCommandDefinition` 也已改为 `CliCommandModel`。
	- [x] 已继续按分层规则上提 CLI 共享预览逻辑：`CliPreviewHtmlRenderer` 已迁入 `Inscape.Tooling` 并改为 `PreviewHtmlRendererDomain`，CLI 侧只保留 preview 命令路由、样式读取与输出适配。
	- [x] 已继续按 CLI 入口边界收紧编译前置流程：`CliCompilerProject`、`CliCompilerSingleFile` 已退出源码，相关项目/单文件编译前置逻辑分别收回 `CliStoryGraphCommand` 与 `CliDslScriptCommand`，CLI 不再保留独立 compiler helper。
	- [x] 已先处理 UnitySample 命令侧的弱语义命名：`CliUnitySampleSupport` 已退出源码，拆为 `CliUnitySampleExportOptionsReader` 与 `CliUnitySampleTemplateBindingReader`。
	- [x] 已继续收敛 binding-template 命令的适配边界：`CliUnitySampleTemplateBindingReader` 现在只返回 `TimelineAssetBindingModel`，最后一层 UnitySample 类型适配已拆到 `CliUnitySampleBindingTemplateWriter`。
	- [x] 已继续压薄 binding-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 binding template 读取、CSV 输出和诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。
	- [x] 已继续压薄 role-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 role template 读取、CSV 输出和 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。
	- [x] 已继续压薄 project-export 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载导出参数校验、导出执行和写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。
	- [x] 已继续按 CLI 入口边界收紧 UnitySample 命令实现：binding-template、role-template、project-export 三个命令的单用途读取/适配/写盘/报表辅助已全部内联回各自 `CliUnitySample*Command`，当前 CLI 不再保留独立 `CliUnitySample*Reader/Writer` 辅助类型。
	- [x] 已继续按显式宿主动作入口规则收紧 UnitySample L10N 合并命令：`merge-unity-sample-l10n` 已从 `CliCore` 私有分支抽为独立 `CliUnitySampleL10nMergeCommand`，`CliCore` 仅保留分发。
	- [x] 已继续按薄门面规则收紧 `CliCore`：`IsHelp`、`ToCompileViewModel`、`ToProjectCompileViewModel` 与项目命令分发私有包装已收回拥有者文件，`CliCore` 进一步缩到入口分发与跨命令共享输出辅助。
- [x] 按 provider / command / preview bridge / style / workspace index 拆分 VSCode extension：在 VSCode 正式迁入 `src/ExternalSupport/VSCode` 后继续执行，保持现有作者体验不回归。
	- [x] 已将 B 阶段剩余工作拆成 4 个实现节点与 1 个收口节点；后续每完成一项都要自检命名 / 边界、推送并勾选对应 TODO。
	- [x] 已建立 VSCode 拆分骨架：入口层、`Commands`、`LanguageFeatures`、`WorkspaceIndex`、`Bridges`、Preview、`Styles`、`Schemas`，并补齐目录规则 README；后续开始从 `extension.js` 逐类迁移。2026-05-18 入口层目录已从 `ExtensionEntry` 收敛到 `Entries`，`PreviewWebview` 已收敛到 `Preview`。
	- [x] 已迁出第一条 VSCode command：`HostSchemaCommand` 当前位于 `HostSchema/Commands/HostSchemaCommand.js`，`extension.js` 只保留实例化与注册。
	- [x] 已迁出第二条 VSCode command：`EditorAuthoringCommand` 当前位于 `EditorAuthoring/Commands/EditorAuthoringCommand.js`，样式与工具菜单行为保持不变。
	- [x] 已迁出第三条 VSCode command：`LocalizationCommand` 当前位于 `Localization/Commands/LocalizationCommand.js`，本地化导出 / 更新行为保持不变。
	- [x] 已迁出第四条 VSCode command：`PreviewCommand` 当前位于 `Preview/Commands/PreviewCommand.js`，预览打开 / 切换 / selection reveal 行为保持不变。
	- [x] 已先收口预览定位 selection bridge：原先散在 `extension.js` 顶层的 pending reveal 状态与相关函数已收为 `PreviewRevealBridge`，使预览定位的 Ctrl+Click 链路拥有明确 `Bridge` 角色。
	- [x] 已迁出第一条 VSCode bridge：`PreviewRevealBridge` 当前位于 `Preview/Bridges/PreviewRevealBridge.js`，入口文件只保留实例化和事件/命令注册。
	- [x] 已继续收口预览命令入口：`openPreview`、`togglePreview`、`revealSelectionInPreview` 及其局部 helper 已收为 `PreviewCommand`，预览命令不再散在 `extension.js` 顶层函数。
	- [x] 已继续收紧 preview reveal bridge 边界：光标处 reveal 信息解析、definition link 构造与 reveal range 解析已吸回 `PreviewRevealBridge`，preview reveal 顶层 helper 进一步退出函数区。
	- [x] 已继续收口 localization 命令入口：`extractLocalization`、`updateLocalization` 及其局部执行链已收为 `LocalizationCommand`，顶层不再保留独立 localization command helper 串。
	- [x] 已继续收口工作区工具命令入口：`openToolsMenu`、`openEditorStyle`、`openPreviewStyle`、`openQuickSyntaxGuide` 及其局部样式文件 helper 已收为 `EditorAuthoringCommand`，样式/文档打开流程不再散在顶层函数。
	- [x] 已继续收口 host schema 命令入口：`showHostSchemaCapabilities` 及其局部 schema 读取、QuickPick 组装与定位逻辑已收为 `HostSchemaCommand`，host schema 浏览流程不再散在顶层函数。
	- [x] 已开始收口 workspace index：节点声明、jump 引用与节点导航这一小片已收为 `DslScriptNodeProvider`，Definition / Reference / CodeLens / jump completion 不再直接依赖散落的 node/jump 顶层 helper。
	- [x] 已迁出第一条 workspace index provider：`DslScriptNodeProvider` 当前位于 `DslScript/Providers/DslScriptNodeProvider.js`，入口文件只保留实例化和 VSCode provider 注册。
	- [x] 已继续收口 workspace index 的 speaker 子块：角色表读取、工作区 speaker 扫描、speaker completion / definition / reference 已收为 `DslScriptSpeakerProvider`，顶层不再保留独立 speaker helper 串。
	- [x] 已迁出第二条 workspace index provider：`DslScriptSpeakerProvider` 当前位于 `DslScript/Providers/DslScriptSpeakerProvider.js`，入口文件只保留实例化和 VSCode provider 注册。
	- [x] 已继续收口 workspace index 的 host binding 子块：binding map 读取、工作区 hook / inline tag 扫描以及 host binding completion / definition / hover 所需绑定列表已收为 `HostBindingProvider`，顶层不再保留独立 host binding helper 串。
	- [x] 已迁出第三条 workspace index provider：`HostBindingProvider` 当前位于 `HostBinding/Providers/HostBindingProvider.js`，入口文件只保留实例化和 VSCode provider 注册。
	- [x] 已继续收口 workspace index 的 metadata 子块：metadata 位置解析、工作区 metadata 引用扫描与 metadata hover 已收为 `DslScriptMetadataProvider`，顶层不再保留独立 metadata helper 串。
	- [x] 已迁出第四条 workspace index provider：`DslScriptMetadataProvider` 当前位于 `DslScript/Providers/DslScriptMetadataProvider.js`，入口文件只保留实例化和 VSCode provider 注册。
	- [x] 已继续收紧 workspace index 的 speaker provider 边界：speaker 位置解析与 hover markdown 已吸回 `DslScriptSpeakerProvider`，Definition / Reference / Hover 不再直接依赖顶层 speaker helper。
	- [x] 已继续收紧 workspace index 的 node provider 边界：节点声明 / jump target 位置解析与 node/jump hover markdown 已吸回 `DslScriptNodeProvider`，相关顶层 node/jump helper 已退出函数区。
	- [x] 已继续收紧 workspace index 的 host binding provider 边界：host binding 补全上下文与光标位置解析已吸回 `HostBindingProvider`，Completion / Definition / Hover 不再直接依赖顶层 host binding helper。
	- [x] 已继续收紧 host binding provider 拥有边界：host binding completion / hover / missing-hover markdown 构造已吸回 `HostBindingProvider`，相关 markdown helper 不再散在顶层函数区。
	- [x] 已按命名规范收敛已拆出的 VSCode 文件与类型名：移除内部默认 `Inscape` 前缀和类型名里的 `Workspace` 前缀，让目录承担范围，类型名表达主语与角色。
	- [x] 已迁出第一条 language feature provider：`DslScriptCompletionProvider` 当前位于 `DslScript/Providers/DslScriptCompletionProvider.js`，入口文件只保留依赖注入和 VSCode provider 注册。
	- [x] 已迁出第二条 language feature provider：`DslScriptDefinitionProvider` 当前位于 `DslScript/Providers/DslScriptDefinitionProvider.js`，定义跳转仍复用 DslScript provider 与 preview reveal bridge。
	- [x] 已迁出第三条 language feature provider：`DslScriptReferenceProvider` 当前位于 `DslScript/Providers/DslScriptReferenceProvider.js`，引用查找仍复用 DslScript provider。
	- [x] 已迁出第四条 language feature provider：`DslScriptHoverProvider` 当前位于 `DslScript/Providers/DslScriptHoverProvider.js`，悬浮说明仍复用 DslScript provider。
	- [x] 已迁出第五条 language feature provider：`DslScriptDocumentSymbolProvider` 当前位于 `DslScript/Providers/DslScriptDocumentSymbolProvider.js`，outline 仍只做当前文档节点扫描。
	- [x] 已迁出第六条 language feature provider：`DslScriptCodeLensProvider` 当前位于 `DslScript/Providers/DslScriptCodeLensProvider.js`，节点入边计数仍复用 DslScript provider。
	- [x] 已迁出 diagnostics 调度：`DslScriptDiagnosticScheduler` 当前位于 `DslScript/Controllers/DslScriptDiagnosticScheduler.js`，入口文件只保留诊断集合创建和调度注册。
	- [x] 已完成 Preview 拆分：`PreviewEditorProvider` 进入 `Preview/Providers/PreviewEditorProvider.js`，入口文件只保留 custom editor 注册和依赖注入。
	- [x] 已迁出 preview HTML provider：`PreviewHtmlProvider` 进入 `Preview/Providers/PreviewHtmlProvider.js`，loading / error HTML 不再由入口文件承载。
	- [x] 已迁出 preview refresh controller：`PreviewRefreshController` 进入 `Preview/Controllers/PreviewRefreshController.js`，刷新定时器、渲染缓存与版本保护不再由入口文件承载。
	- [x] 已迁出 preview source controller：`PreviewSourceController` 进入 `Preview/Controllers/PreviewSourceController.js`，webview 源码回跳与 viewColumn 选择不再由入口文件承载。
	- [x] 已迁出 preview invocation provider：`PreviewInvocationProvider` 进入 `Preview/Providers/PreviewInvocationProvider.js`，preview-project 的 CLI fallback 解析不再由入口文件承载。
	- [x] 已完成 editor authoring style 拆分：`EditorAuthoringStyleController` 当前位于 `EditorAuthoring/Controllers/EditorAuthoringStyleController.js`，编辑器样式读取、decoration ranges 与状态清理不再由入口文件承载。
	- [x] 已迁出 VSCode 样式默认值：editor 默认样式位于 `EditorAuthoring/Models/EditorAuthoringStyleDefaultsModel.js`，preview 默认样式位于 `Preview/Models/PreviewStyleDefaultsModel.js`，editor / preview 默认样式不再由入口文件承载。
	- [x] 已开始 ExtensionEntry 收口：`ExtensionRegistrationController` 进入 `ExtensionEntry/ExtensionRegistrationController.js`，VSCode subscription / provider / command / custom editor 注册顺序不再由 `activate()` 内联承载。
	- [x] B3.4.2 继续压薄 ExtensionEntry：把 output channel / logging / diagnostics scheduler 创建收进 `ExtensionEntry`，让 `extension.js` 更接近纯入口；自检命名需符合 `Entry` / `Controller` 角色边界，不把功能行为塞回入口层。
	- [x] B3.4.3 收口 diagnostics 调用辅助：将 diagnostics scheduler 依赖的 CLI invocation、临时文件、diagnostic mapping 辅助从 `extension.js` 迁入 `LanguageFeatures` 或更合适的窄模块；自检不得让 VSCode 重写 parser 语义。
	- [x] B3.4.4 收口配置与工作区文本读取辅助：将 `readProjectConfig`、CSV 读取、workspace text source 收集等轻量 authoring 数据来源从入口文件移出；自检类型名避免 `Helper` / `Support` / 泛 `Workspace*` 前缀。
	- [x] B3.4.5 收口位置与范围辅助：将 `createLocation`、payload/open location、`trimRange`、display path 等编辑器定位适配从入口文件移出；自检不改变 source map / reveal payload 语义。
	- [x] B3.5 B 阶段收口验收：对照 [渐进式重构计划](refactoring-plan.md) 与 [编码与命名规范](coding-conventions.md) 巡检 B1/B2/B3，确认 `extension.js` 已是注册入口而不是逻辑实现，跑完整验证并勾选 VSCode extension 拆分父项。
	- [x] 已顺手修复预览定位局部缺陷：`findDialogueSeparatorIndex` 中误残留的 preview reveal 调用与缺失的半角冒号解析已清理，避免说话人行的预览定位在运行时触发异常。
- [x] C 阶段创建 `Inscape.LanguageServer` 基线项目，先迁移诊断与定义跳转，再迁移引用、补全与 source map 相关语义能力。
	- [x] C4.1 已创建 `src/Internal/LanguageServer/Inscape.LanguageServer.csproj`，加入 `Inscape.slnx`，并提供可运行 `LanguageServerEntry --capabilities` 基线入口。
	- [x] C4.2 迁移 diagnostics 能力的第一层：`DslScriptDiagnosticProvider` 直接调用 Compiler，并把 Compiler 1-based `line` / `column` 转换为编辑器 0-based `line` / `character`。
	- [x] C4.3 迁移 definition 的第一层：`DslScriptDefinitionProvider` 直接复用 Compiler source span，并通过 `EditorLocationMapperDomain` 输出 editor location。
	- [x] C4.4 迁移 references / completion 的第一层：`DslScriptReferenceProvider` 和 `DslScriptCompletionProvider` 直接读取 Compiler graph 输出。
- [ ] 继续收敛 Cli、VSCode 和未来 LanguageServer 共享的项目级流程：优先落到 `Tooling` 的 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 等窄模块；如未来确需统一门面，也应建立在这些模块之上，而不是先造一个大而泛的 `ProjectService`。
- [x] 建立 workspace index 过渡模型，承接 VSCode 当前轻量扫描并为未来 LanguageServer 留出替换来源。
	- [x] C3.1 已建立 [Workspace Index Contract](workspace-index-contract.md)，定义 nodes、node references、speakers、host bindings、metadata、schema capabilities 与统一 0-based 编辑器位置对象。
	- [x] C3.2 对齐现有 VSCode `WorkspaceIndex` provider 输出字段：node references 补 `target`，speakers / host bindings 补 `sourceKind`，host bindings 补 `name`，metadata 补 `key` / `value`。
	- [x] C3.3 将 LanguageServer 基线读取/输出设计对齐 workspace index 契约：`EditorLocationModel` 使用 0-based `line` / `character` / `length`，能力入口显式引用 source location 与 workspace index 契约文档。
- [x] 统一 source map / reveal payload 数据契约，支撑预览、诊断、跳转、本地化和未来编辑器三视图。（B 阶段完成后的推荐大节点）
	- [x] 已建立 [Source Location Contracts](source-location-contracts.md)，明确 Compiler source location 使用 1-based `line` / `column`，编辑器 reveal payload 使用 0-based `line` / `character` / `length`。
	- [x] 已先修复 Preview HTML 的 Compiler source -> 编辑器坐标转换，让源码按钮、metadata 点击、源码侧 reveal 匹配与节点定位不再直接混用 Compiler 的 1-based 坐标。
	- [x] C2.1 将 Preview -> VSCode 的历史兼容 `column` 字段迁到 `character`，VSCode 侧保留读取 `column` 的 fallback。
	- [x] C2.2 收敛 reveal payload 的测试覆盖：源码按钮、diagnostics 点击、metadata 点击与旧 `column` fallback 都已有回归约束。
	- [x] C2.3 对照 source location 契约巡检 VSCode selection reveal、preview reveal、openSource 和 location provider 的字段命名；`column` 仅保留在 Compiler / diagnostic 输入和旧 payload fallback 边界。
	- [x] C1.1 为中文对白、选项、metadata、diagnostics 和跨文件 source map 增加测试样例。
- [x] Runtime Host 阶段再引入 `NarrativeRuntime`，采用生命周期式执行模型，不提前把 runtime loop 放进 Core 编译层。
	- [x] C5.1 已创建 `src/Internal/Runtime/Inscape.Runtime.csproj` 并加入 `Inscape.slnx`。
	- [x] C5.2 已建立 `NarrativeRuntime` 最小 IR 消费生命周期：`LoadGraph`、`Start`、`Choose`、`Continue`、`Restore`；Runtime 不解析 `.inscape`，不依赖 VSCode / HTML Preview / UnitySample。
- [x] 保持 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 作为 ExternalSupport 过渡样例，暂不纳入 Internal 主动重构范围；只在 Host Bridge / UnityPlugin 设计阶段把它们当验证样本使用。
- [x] 完成 D 阶段 Core 干净与 Host Bridge 隔离收口。
	- [x] D1.1 Compiler 依赖巡检：确认 `Inscape.Compiler` 不依赖 Unity、VSCode、HTML、Bird、Addressables、ExternalSupport、Tooling、Cli、LanguageServer 或 Runtime；详见 [Core Boundary Audit](core-boundary-audit.md)。
	- [x] D1.2 Compiler 角色目录与命名自检：对照命名规范检查 `Model` / `Parsing` / `Analysis` / `Localization` 角色边界，并修正文档过期口径。
	- [x] D2.1 ExternalSupport 隔离自检：确认 UnitySample / importer 仍只在 ExternalSupport 路径与独立测试链路中出现，不反向污染 Internal；详见 [ExternalSupport Boundary Audit](external-support-boundary-audit.md)。
	- [x] D2.2 Host Bridge 契约草案：定义可表达 UnitySample 当前能力、但不被 UnitySample 限死的配置模型；详见 [Host Bridge Contract](host-bridge-contract.md)。
	- [x] D3 后续迁移：把 VSCode `UnitySample` fallback 迁到通用 `hostBridge` 配置读取与展示；ExternalSupport 的 `unitySample` 字段只作为样例命令配置入口。
		- [x] D3.1 ToolConfig 支持通用 `hostBridge` 路径读取与归一化，ExternalSupport 的 `unitySample` 配置继续隔离在样例命令中。
		- [x] D3.2 VSCode HostBinding / speaker 展示和读取迁到 Host Bridge 口径，不再读取 UnitySample fallback。
- [x] 完成 E 阶段防回归工作流固化。
	- [x] E1/E3 建立 [Regression Workflow](regression-workflow.md)：固化节点开始前、行为契约、命名 / 分层自检、验证命令、提交拆分、提交前检查和推送后检查。
	- [x] E2 固化 VSCode 交互回归清单到扩展文档，并明确 `.vsix` 重建 / 安装 / reload 边界。

## 阶段 1：DSL 与轻工具链

- [x] 准备一个图叙事样例，包含复入、回环和多出口选择。
- [x] 用 Yarn-like、Ink-like、Ren'Py-like、Inscape-like 四种写法重写同一片段，比较阅读感、解析复杂度和 IR 映射成本。
- [x] 再次对比 Yarn Spinner、Ink/Inky、Ren'Py、Twine、ChoiceScript、Narrat、Arcweave 和 articy:draft，明确 Inscape 最接近 Yarn 的工程定位、Ink/Inky 的写作体验和 Ren'Py 的长期引擎目标。
- [x] 定义第一版最小语法：显式节点、对白、旁白、选项、跳转、注释、元信息。
- [x] 定义第一版节点名规范：字符集、层级分隔符和基础诊断。
- [x] 定义第一版跨文件节点唯一性：项目内节点名全局唯一。
- [x] 定义节点重命名迁移策略。
	- [x] 冻结作者标题与 stable node id 分离的长期决策；详见 [ADR 0013](adr/0013-author-title-and-stable-node-id.md)。
	- [x] 设计 stable node id 的落盘位置：sidecar 索引、迁移表，或必要时显式 `@id`；详见 [Stable Node ID Contract](stable-node-id-contract.md)。
	- [x] 设计标题重命名识别流程：source range、相邻文本锚点、旧标题、前后节点关系与人工确认；详见 [Stable Node ID Contract](stable-node-id-contract.md)。
- [ ] 实现 stable node id sidecar 与标题重命名迁移流程。
	- [x] VSCode 新增显式 `Inscape: Update Stable Node Map` 命令，调用 `update-node-map-project` 并把活动未保存文档通过 `--override` 传给 CLI。
- [x] 定义并实现行级隐式 hash 的输入、规范化规则、版本号和碰撞处理。
- [x] 实现第一版本地化 CSV 提取，覆盖旁白、对白、选择提示和选择项。
- [x] 实现旧翻译表按锚点精确继承，并标记新增、保留、删除条目。
- [x] 设计旧翻译表的模糊匹配与人工确认流程；详见 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)。
- [x] 设计显式稳定 ID 或迁移表，用于处理节点重命名和重复文本插入。
	- [x] 决定标题不作为长期机器 ID，stable node id 由系统维护；标题仍是作者可见主身份。
	- [x] 定义 stable node id / title map 的 JSON 契约和冲突解决策略；详见 [Stable Node ID Contract](stable-node-id-contract.md)。
- [ ] 实现本地化 alignment / audit report，用 stable node id、line anchor、occurrence 与 diff 保护已有译文。
- [x] 设计 Narrative Graph IR 的 JSON 草案。
- [x] 设计源映射格式，覆盖节点、行、选项、跳转和诊断。
- [x] 实现项目级多文件编译与跨文件跳转诊断。
- [x] 设计并实现第一版项目入口声明：节点内 `@entry`。
- [x] 设计并实现项目入口 CLI 覆盖策略：项目级命令支持 `--entry 标题`。

## VSCode 支持

- [x] 设计 `.inscape` 文件扩展名和语言 ID。
- [x] 编写 TextMate 语法高亮草案，弱化元信息并凸显剧情文本。
- [x] 添加基础 snippets：节点、对白、选择组、跳转、元信息、行内标签。
- [x] 添加 VSCode 实时诊断桥接，复用 CLI / `Inscape.Compiler` 输出。
- [x] 添加工作区节点补全和当前文件 Outline 原型。
- [x] 添加 `-> target` 的 VSCode 跳转定义原型。
- [x] 添加节点声明和 `-> target` 的 VSCode 引用查找原型。
- [x] 添加节点声明和 `-> target` 的 VSCode Hover 摘要。
- [x] 添加 VSCode 命令：导出项目本地化 CSV。
- [x] 添加 VSCode 命令：基于旧 CSV 更新项目本地化表。
- [x] 接入 Host Bridge 的宿主绑定别名补全和 Hover，覆盖 `@timeline ...` 位置；legacy `[kind: ...]` inline host binding 入口已在 Goal 0 移除。
- [x] 添加对白 speaker 的 Go to Definition 与 Find All References，优先连接 Host Bridge speaker，回退脚本对白引用。
- [x] 修正 VSCode `wordPattern`，把全角冒号和常见中文标点视为词边界，避免 Ctrl+Click 角色名时把整行对白标为可跳转范围。
- [x] 添加 block 级 CodeLens 双向导航：`入边` 追溯调用方，`出边` 跳转被调用方。
- [x] 为宿主 Schema 文件提供 VSCode JSON Schema 校验，并增加命令查看当前 query / event 清单。
- [x] 实现 VSCode 编辑器内可玩预览视图第一版，复用 CLI / Core 的项目级编译结果，并支持源码侧边打开、选项点击、正文点击继续、Back、Restart、源码回跳、编辑防抖刷新和保存后自动刷新。
- [x] 修正 VSCode 预览体验关键问题：custom editor 改为 `option` 避免劫持源码标签页；webview 显式启用 scripts；刷新尽量保留当前页进度；CLI 调用优先已构建可执行文件 / 程序集，减少等待时间。
- [x] 为编辑器语法配色与预览 UI 提供独立样式配置文件，允许开发者通过 `inscape.config.json` 指向简洁 JSON 样式表并在本机快速调参。
- [ ] 为 VSCode 预览补充更细粒度的未保存内容热刷新、局部更新、状态提示与可选源码同步策略。
	- [x] 预览 webview 在防抖等待和刷新时显示轻量“等待刷新...” / “刷新中...”状态，不改变故事状态、路径或 Compiler 输出。
	- [x] 未保存内容热刷新增加版本保护：保存或显式刷新会取消已挂起的 debounce timer，旧刷新完成不会清掉新一轮状态。
	- [x] 继续细化局部更新策略：详见 [VSCode Preview Refresh Strategy](vscode-preview-refresh-strategy.md)，VSCode 暂只局部处理状态、源码定位和纯 UI 状态，语义相关变化继续全量重渲染。
	- [x] 设计并实现第一版可选预览 / 源码同步模式：`inscape.preview.sourceSyncMode = off|click|selection`，默认 `click` 保持现有行为，`selection` 只驱动已打开预览。
	- [x] 新增自动化自检：`npm --prefix src/ExternalSupport/VSCode run check:preview-source-sync`，覆盖 `off` / `click` / `selection` 的关键边界。
	- [x] 新增可重复手动 smoke 入口：`npm --prefix src/ExternalSupport/VSCode run smoke:preview-source-sync -- -Mode <off|click|selection>`，统一生成临时工作区和模式设置。
	- [ ] 补一次 VSCode 手动 smoke，确认 `off` / `click` / `selection` 三种模式的交互边界符合预期。
- [x] 继续验证正文 / 选项文本的 `DefinitionProvider` 链接态与 selection bridge 是否稳定满足“默认无下划线、Ctrl+指向才显示链接态、Ctrl+Click 复用预览定位”；已新增 VSCode package 静态契约检查 `npm --prefix src/ExternalSupport/VSCode run check:preview-navigation`，防止回退到 `DocumentLinkProvider` 或断开 selection bridge。手动 UI smoke 仍按 VSCode README 执行。
- [x] 补齐 C# Language Server 第一版能力范围：diagnostics、definition、references、completion、outline、hover 都已有基线 probe。
- [x] 设计 VSCode 前端何时从 JS provider 切到 LanguageServer，并保留哪些 fallback 边界；详见 [VSCode LanguageServer Migration Plan](vscode-language-server-migration-plan.md)。
- [x] 为 LanguageServer diagnostics / definition / references / completion / outline / hover 建立 probe parity 测试，作为 VSCode client 切换前置条件。
- [x] 设计并实现 LanguageServer 项目级 diagnostics endpoint：`--diagnose-project <root> [--entry 标题] [--override source.inscape temp.inscape]`，覆盖 unsaved override；VSCode 仍保留 CLI diagnostics fallback。
- [x] 让 VSCode diagnostics 优先调用 LanguageServer project diagnostics probe，并保留现有 CLI `diagnose-project` fallback。
- [x] 对 VSCode LanguageServer diagnostics 接入执行 `.vsix` rebuild / install，并由用户粗测 VSCode 体验基本 OK。
- [x] 让 VSCode document symbols / Outline 优先调用 LanguageServer `--document-symbols-file` probe，并保留 JS `DslScriptNodeProvider` fallback。
- [x] 让 VSCode node completion 优先调用 LanguageServer `--completion-file` probe，并保留 JS workspace node fallback 补齐跨文件节点。
- [x] 让 VSCode node definition / references 调用 LanguageServer project navigation：新增 `--definition-project` / `--references-project`，支持跨文件和 unsaved override，并删除对应 JS node definition / reference semantic fallback。
- [ ] 若后续准备删除 CLI fallback，先补一次 LanguageServer 不可用场景下的 CLI diagnostics fallback 专项 smoke test。
- [x] 新增 diagnostics fallback 静态契约：`npm --prefix src/ExternalSupport/VSCode run check:diagnostics-fallback`，覆盖“LanguageServer 失败 -> CLI diagnose-project 成功”与 `diagnostics.backend=compiler` 跳过 LanguageServer。
- [x] 设计补全数据来源：当前文件节点、项目节点、角色表、宿主绑定表、宿主 Schema 查询 / 事件清单。
- [x] 将 `hostSchema` 中的事件清单接入 `.inscape` 脚本补全与 Hover，不改变当前 DSL 编译语义。
- [x] 评估 VSCode JS query / event provider 是否应复用 `Inscape.Tooling` Host Schema reader / audit 契约：结论是 Tooling 先补齐 event reader，VSCode 暂保留轻量 JS reader；后续通过 LanguageServer 或显式 CLI capability endpoint 复用 Tooling，避免直接从扩展热路径启动 .NET。
- [x] 设计并实现 Host Schema capability endpoint：Internal CLI 新增 `inspect-host-schema-project <root> [-o capabilities.json]`，输出 `inscape.host-schema.capabilities`，供 VSCode / LanguageServer 后续复用 Tooling reader。
- [x] 让 VSCode 消费 Host Schema capability endpoint / Tooling 契约：query / event provider 优先调用 `inspect-host-schema-project`，失败时回退直接 JSON 读取。
- [x] 按 [VSCode LanguageServer Migration Plan](vscode-language-server-migration-plan.md) 完成 Host Schema capability endpoint 收口：LanguageServer `--host-schema-capabilities-project` 已复用 Tooling 契约，VSCode query / event provider 已优先调用 LanguageServer，失败后回退 CLI，JS provider 的重复 JSON fallback 已移除并改为 output 日志。
- [x] 定义第一版诊断清单：重复节点、非法节点名、缺失目标、不可达节点、空节点、选项语法问题。
- [x] Compiler 支持 `# 标题`：当前已移除 `:: node.name` 兼容路径，新增标题唯一诊断、标题前缺空行 info 级 style hint，并覆盖中文标题跳转测试。
- [x] VSCode 标题语法体验：TextMate 高亮、snippets、Outline / completion / definition / references 识别标题，以及 `Inscape: Insert Node Title` 命令在创建同名标题时自动生成 `_01` 编号。

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
- [x] 实现 `talkingId` 自动避让策略第一版：`--bird-existing-talking-root` 扫描现有 `.asset` 的 `talkingId:`。
- [x] 设计并实现角色名到 Bird `roleId` 的第一版 CSV 绑定：`--bird-role-map speaker,roleId`。
- [x] 增加 `export-bird-role-template`，从项目对白 speaker 自动生成待补全的 `speaker,roleId` 模板。
- [x] 为 `export-bird-role-template` 增加 `--bird-existing-role-name-csv`，读取 Bird `L10N_RoleName.csv` 自动填入唯一匹配的 `roleId`。
- [x] 设计并实现资源别名、Timeline 名称到 Bird 整数 ID / Unity 资源引用的第一版 CSV 绑定：`--bird-binding-map kind,alias,birdId,unityGuid,addressableKey,assetPath`。
- [x] 增加 `export-bird-binding-template`，从项目内 Timeline Hook 生成待补全的 Bird 绑定表模板。
- [x] 为 `export-bird-binding-template` 增加 `--bird-existing-timeline-root`，扫描现有 Bird Timeline `.asset` / `.meta` 辅助填表。
- [x] 结合 `docs/dsl-ecosystem-positioning.md` 设计并实现 Timeline hook 原型；当前主路径使用 `@timeline alias` / `@timeline.<phase> alias` 表达宿主引用，不引入通用命令宏系统。
- [x] 为 Bird 导出增加 `bird-export-report.txt` 与 manifest `warnings`，暴露重复 host binding、缺失 Timeline 绑定和无法挂载 hook 等问题。
- [x] 设计 Bird 兼容 `L10N_Talking.csv` 导出，并保留 Inscape `anchor` 审校表。
- [x] 原型实现 `export-bird-project`：从项目 IR 生成 manifest 与 Bird L10N CSV。
- [x] 设计 Unity Editor Importer 原型：读取 manifest 并生成或更新 `TalkingSO`，不让 Core 依赖 Unity。
- [x] 为 Unity Editor Importer 原型增加 Dry Run 报告，先输出创建 / 更新 / 缺失引用计划，不修改 `.asset`。
- [x] 为 Unity Editor Importer Dry Run 增加独立报告文件 `bird-import-dry-run-report.txt`，便于试跑后留痕审查。
- [x] 为 Unity Editor Importer Dry Run 报告补充 Inscape `node`、`kind`、`anchor`、`source` 等追溯信息。
- [x] 为 Unity Editor Importer Dry Run 报告补充字段级文本 diff，覆盖 `roleId`、`nextTalking`、`textAnchorIndex`、`textDisplayType` 和选项变化。
- [x] 为 Unity Editor Importer Dry Run 增加 batchmode 命令行入口，便于本地自动化和未来 CI。
- [x] 为 Unity Editor Importer 增加真实 Import 的 batchmode 命令行入口，复用无弹窗导入核心。
- [x] 为 Unity Editor Importer 增加显式 Addressables 开关，调用 Bird 现有 `TalkingSO.ApplyAA()` 设置 `TM_Talking` group / label。
- [x] 在 Bird Unity 项目内执行 batchmode Dry Run，并记录创建计划、日志风险和当前未改动 `.asset` 的边界。
- [x] 在 Bird Unity 项目内执行真实 Import，生成 5 个 `TalkingSO`，并用二次 Dry Run 验证字段无差异。
- [x] 在 Bird Unity 项目内试跑 `-inscapeApplyAddressables`，确认只修改 `TM_Talking.asset` 并新增 5 个 `TM_Talking` entries。
- [ ] 决定 Bird 项目新增 importer 与 `InscapeGenerated` 资源的提交策略。
- [x] 设计并实现 `merge-bird-l10n` 合并预览命令，避免覆盖 Bird 现有人工译文。
- [x] 用 Bird 当前 `L10N_Talking.csv` 试跑合并预览，确认只追加 5 个新增行并生成审查报告。
- [x] 为 `export-bird-role-template` 增加 `--report` 审查报告，区分唯一匹配、歧义、缺失和未扫描状态。
- [x] 用 Bird 当前 `L10N_RoleName.csv` 试跑角色报告，确认 `旁白` 为歧义、`成步堂` 和 `证人` 缺失。
- [x] 增加 `inscape.config.json` 项目配置草案，让 Bird 命令读取角色表、绑定表、现有 Bird 资源路径和 `talkingId` 起点默认值。
- [x] 为项目配置读取增加测试，确认相对路径和命令行覆盖边界。
- [x] 将角色绑定信息接入 VSCode 补全和 Hover，减少写作阶段记忆压力。
- [x] 设计 Timeline 引用的第一版最小表达方式，但不让 DSL 直接变成演出时间轴语言。
- [x] 明确并实现 Timeline Hook phase 第一版：默认 `talking.exit`，可显式表达 `talking.enter`、`talking.exit`、`node.enter`、`node.exit`；Bird Importer 暂只落地 `talking.exit`。
- [ ] 用带真实 Timeline 绑定的样例再次执行 Bird Import Dry Run，确认 `talking.exit` 的 `TalkingEffectTM.PlayTimeline` 落地与其他 phase warning。

## 变量与状态查询，第二版前置调研

- [x] 对比 Yarn、Ink、Ren'Py、Twine 的变量、函数和宿主 API 边界，明确 Inscape 第一阶段采用 Host Schema / Host Bridge / Runtime Host 分层，不把宿主 API 直接暴露给 DSL；详见 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)。
- [x] F1.1 冻结 `@` / `[]` 作者心智模型：`@` 负责事件 / 动作 / 状态变化，`[]` 负责查询 / 读取 / 文本插值；详见 [Authoring Marker Contract](authoring-marker-contract.md)。
- [x] F1.2 审计历史文档、样例、VSCode 提示和 UnitySample 回归中 `[timeline: ...]` / `[kind: alias]` 的残留；详见 [Authoring Marker Compatibility Audit](authoring-marker-compatibility-audit.md)。
- [x] F1.3 将 VSCode hover / completion 文案迁到 `@` 事件、`[]` 查询口径。
- [x] F1.4 将作者语法指南、快速指南和 open questions 迁到 `@` 事件、`[]` 查询口径。
- [x] F1.5 评估并确认 Goal 0 删除 generic `[kind: alias]` 主路径；历史决策见 [Authoring Marker Behavior Decision](authoring-marker-behavior-decision.md)。
- [x] F1.6 新增或迁移新规范样例：用 `@timeline.<phase>` 表达事件 / 时机，用 `[player.name]` / `[itemName]` 表达查询插值。
- [x] F1.7 清理剩余文档里的旧阶段叙述：把过时的 `bird.*` / `UnitySample` 主口径迁到 Host Bridge / ExternalSupport 说明。
- [x] F1.8 设计表达式 / 查询插值的第一版语法边界：只读取数据，不触发事件，不绑定具体业务实体或服务端；详见 [Authoring Query Interpolation Contract](authoring-query-interpolation-contract.md)。
- [x] F1.9 设计查询插值与本地化占位符、预览 fallback、Host Schema 提示之间的最小数据契约，不急于改 Compiler 语义；详见 [Query Interpolation Data Contract](query-interpolation-data-contract.md)。
- [x] F1.10 评估是否先在 VSCode / LanguageServer 做 `[]` 简单路径的提示原型：结论是先做 VSCode authoring hint 原型，LanguageServer 后续复用数据契约；详见 [Query Interpolation Tooling Decision](query-interpolation-tooling-decision.md)。
- [x] F1.11 新增 VSCode query interpolation provider 骨架：读取 Host Schema queries，识别简单 `[query.path]` 范围，排除历史 `[kind: alias]`，暂不接入 completion / hover。
- [x] F1.12 接入 VSCode `[]` 查询插值 completion / hover：已知 query 显示 returnType / isAsync / description，未知 query 只给提示，不改 Compiler。
- [x] F1.13 评估 `[]` 查询插值原型是否迁入 LanguageServer 或增加 workspace audit：结论是暂不迁 LanguageServer、不新增 Compiler 诊断，下一步优先设计显式 workspace audit；详见 [Query Interpolation Follow-up Decision](query-interpolation-follow-up-decision.md)。
- [x] F1.14 设计 query interpolation workspace audit 输出格式和命令入口，先文档化，不实现默认 Problems；详见 [Query Interpolation Workspace Audit](query-interpolation-workspace-audit.md)。
- [x] F1.15 评估 Host Schema query 读取逻辑应落到 Tooling 还是 LanguageServer：结论是优先落到 `Inscape.Tooling`，LanguageServer 后续复用 Tooling 契约；详见 [Query Interpolation Host Schema Reading Decision](query-interpolation-host-schema-reading-decision.md)。
- [x] F1.16 实现 Host Schema query reader 与显式 `audit-query-interpolation-project` CLI：输出独立 `inscape.query-interpolation.audit`，不接默认 Problems，不改 Compiler。
- [x] 设计宿主查询 Schema 草案：谓词名、参数类型、返回类型、同步/异步、事件清单和副作用边界。
- [x] 明确 Host Schema / Host Bridge 边界：Inscape 内 ID 可读且抽象，项目内部 ID、资源坐标和事件处理器由桥接层映射。
- [x] 设计 Host Bridge 配置草案，覆盖 Inscape ID 到项目 ID、资源引用、宿主事件处理器和查询实现的映射。
- [x] 调研 Unity `[Inscape]` Attribute 扫描和 Unity Editor 代码生成流程，生成待配置 Host Bridge 表并保留人工确认步骤；当前只完成准备计划，不进入研发实现，详见 [Unity Host Bridge Preparation Plan](unity-host-bridge-preparation-plan.md)。
- [x] 设计 Host Bridge 到 adapter 代码生成的最小闭环，用 UnitySample 当前输出作为回归样例，逐步替代硬编码样例结构；当前只完成准备计划，不进入研发实现，详见 [Unity Host Bridge Preparation Plan](unity-host-bridge-preparation-plan.md)。
- [x] 明确 Unity 上层消费事件数据的模型：短期以 hybrid 作为设计假设，明确事件 hook 与状态轮询边界；当前只完成准备计划，不进入研发实现，详见 [Unity Host Bridge Preparation Plan](unity-host-bridge-preparation-plan.md)。
- [x] 明确查询表达式是否允许副作用：第一版 `[]` 查询插值不允许副作用，事件和状态变化保留给 `@` / Runtime Host；详见 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)。
- [x] 设计宿主查询 / 回调 / 事件清单的注册或代码生成策略，避免 DSL 直接控制反转进业务层；详见 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)。
