# TODO

状态：持续维护

本文件记录已经能执行或需要调研的工作。仍未形成共识的问题放在 [待确认问题](open-questions.md)，已经形成长期决策的问题放在 [ADR](adr/README.md)。

## 接力优先队列

下一位接手者建议按以下顺序推进：

1. 执行当前重构收口计划（最高优先级）：按最新确认的 Internal / ExternalSupport 边界推进，而不是再引入笼统的 `InscapeProjectService` / `Workspace` / `ProjectSystem` 大层。
	- CLI 继续从 `CliCore` 抽离剩余共享辅助，保持入口只做参数分流、命令路由、退出码与通用输出。
	- 先把当前 `Inscape.Cli` 中的共享流程上提为 `Tooling`，让 `Cli` 回到命令行入口层。
	- 提前规划并建立 `LanguageServer`，让 VSCode 长期走“薄前端 + C# server”路线。
	- VSCode 按 `provider / command / preview bridge / style / workspace index` 拆分 `tools/vscode-inscape/extension.js`，避免继续堆单文件入口。
	- Unity 支持明确收束为 `ExternalSupport/UnityPlugin`，继续留在仓库内，但不进入默认 .NET solution 编译链。
	- 具体类型命名按 ADR 0010 收敛为“目录先表达层级与范围，类型名只表达具体业务主语 + 限定 + 角色”；优先清理 `Project*` / `SingleFile*` 前导范围词，以及 `Support` / `Helper` 弱语义后缀。
	- 每完成一轮小步重构，都同步更新 `docs/agent-handoff.md`、`docs/refactoring-plan.md`、`docs/code-structure.md`、[研发计划](development-plan.md) 和本 TODO，避免再次积累陈旧口径。
2. 收敛 `@` 与 `[]` 的语法分工：当前两套提示语法的职责重叠过高，作者心智不稳定；需要明确二者是否保留并存、如何区分“语义/时机”与“资源/别名绑定”，以及 `@timeline ...` / `[timeline: ...]` 是否还应继续双写法共存。
3. 设计 Host Bridge 草案：解决 Inscape 可读 ID 与项目内部 ID / 资源 / 事件处理器的映射，不被 UnitySample、Addressables 或 ScriptableObject 绑定。
4. 调研 Unity `[Inscape]` Attribute 扫描与 Unity 内代码生成：生成待配置桥接表，再由人工完成 C# 成员与 Inscape 名称映射。
5. 继续打磨 VSCode 可玩预览：补未保存内容的更细粒度热刷新、刷新中状态提示，以及可选的预览 / 源码同步策略。
	- 正文 / 选项文本不再用 `DocumentLinkProvider`，因为它会导致整段文本常驻下划线；当前用 `DefinitionProvider` 恢复“默认无下划线、Ctrl+指向才显示链接态”的编辑体验，并通过 selection bridge 在 Ctrl+Click 后执行预览定位，显式命令仅作为兜底。
6. 将 `Inscape.Adapters.UnitySample` 作为实验样例继续隔离，后续验证它能否由 Host Bridge 配置和代码生成替代。
7. 决定 Bird 项目内 importer 与生成的 `InscapeGenerated` 资源是否提交，或先清理后保留 Inscape 侧原型。
8. 设计本地化模糊匹配与人工确认报告，不要直接自动复用相似文本译文。
9. 收敛第一版块语法：继续使用 `:: node.name`，还是转向 `# 标题` + 空行分块。

## 文档与接手效率

- [x] 建立 Agent 接手指南，记录当前快照、检索地图、工作方法和验证命令。
- [x] 建立根目录 `AGENTS.md`，为未来 agent 提供最短入口。
- [x] 完成 GitHub Copilot 接手巡检，记录当前 HEAD、未提交变更和验证结果。
- [x] 沉淀 DSL 生态定位对比，明确 Yarn / Ink / Ren'Py / Arcweave / articy 等方案的分层参照关系。
- [x] 建立 CLI 命令速查清单，并让 CLI 支持 `commands` / `help <command>` 终端查询。
- [x] 将固定 Unity 项目适配 spike 从 `Inscape.Core` 迁出为 `Inscape.Adapters.UnitySample` 实验样例，并明确它不是最终 Host Bridge。
- [x] 固化 VSCode 扩展发布工作流，补充 `npm run rebuild:vsix` 与 `.vsix` 安装步骤，避免只改源码不更新到本机扩展。
- [x] 建立编码与命名规范，明确入口、生命周期式方法、数据/逻辑/表现/适配分层和渐进式重构顺序。
- [x] 将命名规范进一步收敛为 Bird 风格的“目录优先 + 主语/角色”模型，并以 ADR 0010 固化范围词与角色词约束。
- [x] 明确 Internal / ExternalSupport 边界，并以 ADR 0011 固化 Tooling 中间层与 UnityPlugin 外部支持层定位。
- [x] 建立渐进式重构计划，按大目标/中目标/小目标安排入口、测试、CLI、VSCode、source map、Host Bridge 和 Runtime 前置设计。
- [x] 建立 [研发计划](development-plan.md)，把 Compiler / Tooling / Cli / VSCode / LanguageServer / ExternalSupport 的推进顺序显式写出。
- [ ] 每次完成阶段性提交后，同步更新 [Agent 接手指南](agent-handoff.md) 的当前快照。

## 代码质量与渐进式重构

执行顺序和验收标准见 [渐进式重构计划](refactoring-plan.md)。

- [x] 按 [编码与命名规范](coding-conventions.md) 拆分测试文件，降低 `tests/Inscape.Tests/TestCore.cs` 的阅读成本，但不改变测试语义。
- [x] 按 command 职责拆分 CLI 入口，避免 `src/Inscape.Cli/CliCore.cs` 继续承担过多命令分发和业务编排；已完成配置读取、顶层元命令、单文件命令和项目级命令分支拆分，项目 `.inscape` 源扫描/读取/override、预览样式读取等共享流程也已上提到 `Inscape.Tooling`，`CliCore` 仅保留入口分发与共享基础输出辅助，单文件/项目编译前置流程当前已分别收回 `CliSingleFileCommand` 与 `CliProjectCommand`。
	- [x] 已继续收口 UnitySample 命令输出职责：将导出目录写盘拆到 `CliUnitySampleExportWriter`，将 role template report 输出拆到 `CliUnitySampleRoleTemplateReportWriter`，`CliUnitySampleSupport` 不再混放输出 writer。
	- [x] 已继续收口 UnitySample 项目级命令分支：`CliProjectCommand` 不再直接编排 `export-unity-sample-binding-template`、`export-unity-sample-role-template`、`export-unity-sample-project`，改为委托 `CliUnitySampleProjectCommand`。
- [ ] 抽出 `Tooling` 中间层：优先上提项目扫描、配置读取、预览构建、本地化流程、HostSchema / HostBinding 流程，降低 `Cli` 的共享业务负担。
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
- [ ] 按 ADR 0010 整理 CLI 与 VSCode 命名：优先消除 `Support` / `Helper` 弱语义命名，并逐步把 `Project` / `SingleFile` 这类范围词从类型名前缀移到目录、命名空间或主语后的限定词。
	- [x] 已先收敛 CLI 总入口 runner 命名：`CliTopLevelCommandRunner`、`CliSingleFileCommandRunner`、`CliProjectCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`，将范围词后移到 `Command` 主语之后。
	- [x] 已继续按终局后缀白名单收口 CLI 命令入口：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 以及 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，收敛为 `CliTopLevelCommand`、`CliSingleFileCommand`、`CliProjectCommand` 与 `CliUnitySample*Command`。
	- [x] 已继续按终局后缀白名单收口 CLI 展示与命令元数据类型：`CliCompileOutput`、`CliProjectCompileOutput` 已分别改为 `CliCompileViewModel`、`CliProjectCompileViewModel`，`CliCommandCatalog` 已改为 `CliCommandProvider`，内部 `CliCommandDefinition` 也已改为 `CliCommandModel`。
	- [x] 已继续按分层规则上提 CLI 共享预览逻辑：`CliPreviewHtmlRenderer` 已迁入 `Inscape.Tooling` 并改为 `PreviewHtmlRendererDomain`，CLI 侧只保留 preview 命令路由、样式读取与输出适配。
	- [x] 已继续按 CLI 入口边界收紧编译前置流程：`CliCompilerProject`、`CliCompilerSingleFile` 已退出源码，相关项目/单文件编译前置逻辑分别收回 `CliProjectCommand` 与 `CliSingleFileCommand`，CLI 不再保留独立 compiler helper。
	- [x] 已先处理 UnitySample 命令侧的弱语义命名：`CliUnitySampleSupport` 已退出源码，拆为 `CliUnitySampleExportOptionsReader` 与 `CliUnitySampleTemplateBindingReader`。
	- [x] 已继续收敛 binding-template 命令的适配边界：`CliUnitySampleTemplateBindingReader` 现在只返回 `TimelineAssetBindingModel`，最后一层 UnitySample 类型适配已拆到 `CliUnitySampleBindingTemplateWriter`。
	- [x] 已继续压薄 binding-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 binding template 读取、CSV 输出和诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。
	- [x] 已继续压薄 role-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 role template 读取、CSV 输出和 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。
	- [x] 已继续压薄 project-export 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载导出参数校验、导出执行和写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。
	- [x] 已继续按 CLI 入口边界收紧 UnitySample 命令实现：binding-template、role-template、project-export 三个命令的单用途读取/适配/写盘/报表辅助已全部内联回各自 `CliUnitySample*Command`，当前 CLI 不再保留独立 `CliUnitySample*Reader/Writer` 辅助类型。
	- [x] 已继续按显式宿主动作入口规则收紧 UnitySample L10N 合并命令：`merge-unity-sample-l10n` 已从 `CliCore` 私有分支抽为独立 `CliUnitySampleL10nMergeCommand`，`CliCore` 仅保留分发。
	- [x] 已继续按薄门面规则收紧 `CliCore`：`IsHelp`、`ToCompileViewModel`、`ToProjectCompileViewModel` 与项目命令分发私有包装已收回拥有者文件，`CliCore` 进一步缩到入口分发与跨命令共享输出辅助。
- [ ] 按 provider / command / preview bridge / style / workspace index 拆分 VSCode extension，保持现有作者体验不回归。
	- [x] 已先收口预览定位 selection bridge：原先散在 `extension.js` 顶层的 pending reveal 状态与相关函数已收为 `InscapePreviewRevealBridge`，使预览定位的 Ctrl+Click 链路拥有明确 `Bridge` 角色。
	- [x] 已继续收口预览命令入口：`openPreview`、`togglePreview`、`revealSelectionInPreview` 及其局部 helper 已收为 `InscapePreviewCommand`，预览命令不再散在 `extension.js` 顶层函数。
	- [x] 已继续收口 localization 命令入口：`extractLocalization`、`updateLocalization` 及其局部执行链已收为 `InscapeLocalizationCommand`，顶层不再保留独立 localization command helper 串。
- [ ] 创建 `Inscape.LanguageServer` 基线项目，先迁移诊断与定义跳转，再迁移引用、补全与 source map 相关语义能力。
- [ ] 将 Cli、VSCode 和未来 LanguageServer 共享的项目级流程继续拆成显式职责模块，优先落到 `Tooling` 的 `ProjectSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 等模块；如未来确需统一门面，也应建立在这些模块之上，而不是先造一个大而泛的 `ProjectService`。
- [ ] 统一 source map / reveal payload 数据契约，支撑预览、诊断、跳转、本地化和未来编辑器三视图。
- [ ] Runtime Host 阶段再引入 `NarrativeRuntime`，采用生命周期式执行模型，不提前把 runtime loop 放进 Core 编译层。
- [ ] 保持 `src/Inscape.Adapters.UnitySample` 与 `tools/unity-bird-importer` 作为 ExternalSupport 过渡样例，暂不纳入 Internal 主动重构范围；只在 Host Bridge / UnityPlugin 设计阶段把它们当验证样本使用。

## 阶段 1：DSL 与轻工具链

- [x] 准备一个图叙事样例，包含复入、回环和多出口选择。
- [x] 用 Yarn-like、Ink-like、Ren'Py-like、Inscape-like 四种写法重写同一片段，比较阅读感、解析复杂度和 IR 映射成本。
- [x] 再次对比 Yarn Spinner、Ink/Inky、Ren'Py、Twine、ChoiceScript、Narrat、Arcweave 和 articy:draft，明确 Inscape 最接近 Yarn 的工程定位、Ink/Inky 的写作体验和 Ren'Py 的长期引擎目标。
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
- [x] 接入 `bird.bindingMap` 的宿主绑定别名补全和 Hover，覆盖 `@timeline ...` 与 `[kind: ...]` 位置。
- [x] 添加对白 speaker 的 Go to Definition 与 Find All References，连接脚本对白和 `bird.roleMap`。
- [x] 修正 VSCode `wordPattern`，把全角冒号和常见中文标点视为词边界，避免 Ctrl+Click 角色名时把整行对白标为可跳转范围。
- [x] 添加 block 级 CodeLens 双向导航：`入边` 追溯调用方，`出边` 跳转被调用方。
- [x] 为宿主 Schema 文件提供 VSCode JSON Schema 校验，并增加命令查看当前 query / event 清单。
- [x] 实现 VSCode 编辑器内可玩预览视图第一版，复用 CLI / Core 的项目级编译结果，并支持源码侧边打开、选项点击、正文点击继续、Back、Restart、源码回跳、编辑防抖刷新和保存后自动刷新。
- [x] 修正 VSCode 预览体验关键问题：custom editor 改为 `option` 避免劫持源码标签页；webview 显式启用 scripts；刷新尽量保留当前页进度；CLI 调用优先已构建可执行文件 / 程序集，减少等待时间。
- [x] 为编辑器语法配色与预览 UI 提供独立样式配置文件，允许开发者通过 `inscape.config.json` 指向简洁 JSON 样式表并在本机快速调参。
- [ ] 为 VSCode 预览补充更细粒度的未保存内容热刷新、局部更新与状态提示。
- [ ] 继续验证正文 / 选项文本的 `DefinitionProvider` 链接态与 selection bridge 是否稳定满足“默认无下划线、Ctrl+指向才显示链接态、Ctrl+Click 复用预览定位”；若后续调整实现，仍需保持这一交互不回退到 `DocumentLinkProvider`。
- [ ] 设计并实现 C# Language Server 第一版能力范围：诊断、跳转定义、引用查找、补全、大纲、悬浮说明。
- [x] 设计补全数据来源：当前文件节点、项目节点、角色表、宿主绑定表、宿主 Schema 查询 / 事件清单。
- [ ] 将 `hostSchema` 中的查询 / 事件清单接入 `.inscape` 脚本补全与 Hover，但不改变当前 DSL 编译语义。
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
- [x] 实现 `talkingId` 自动避让策略第一版：`--bird-existing-talking-root` 扫描现有 `.asset` 的 `talkingId:`。
- [x] 设计并实现角色名到 Bird `roleId` 的第一版 CSV 绑定：`--bird-role-map speaker,roleId`。
- [x] 增加 `export-bird-role-template`，从项目对白 speaker 自动生成待补全的 `speaker,roleId` 模板。
- [x] 为 `export-bird-role-template` 增加 `--bird-existing-role-name-csv`，读取 Bird `L10N_RoleName.csv` 自动填入唯一匹配的 `roleId`。
- [x] 设计并实现资源别名、Timeline 名称到 Bird 整数 ID / Unity 资源引用的第一版 CSV 绑定：`--bird-binding-map kind,alias,birdId,unityGuid,addressableKey,assetPath`。
- [x] 增加 `export-bird-binding-template`，从项目内 Timeline Hook 生成待补全的 Bird 绑定表模板。
- [x] 为 `export-bird-binding-template` 增加 `--bird-existing-timeline-root`，扫描现有 Bird Timeline `.asset` / `.meta` 辅助填表。
- [x] 结合 `docs/dsl-ecosystem-positioning.md` 设计并实现 Timeline hook 原型：`@timeline alias` / `[timeline: alias]` 及显式 phase 写法只表达宿主引用，不引入通用命令宏系统。
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

- [ ] 对比 Yarn、Ink、Ren'Py、Twine 的变量、函数和宿主 API 边界。
- [ ] 设计表达式只表达数据查询的模型，不在 DSL 中绑定具体业务实体或服务端。
- [x] 设计宿主查询 Schema 草案：谓词名、参数类型、返回类型、同步/异步、事件清单和副作用边界。
- [x] 明确 Host Schema / Host Bridge 边界：Inscape 内 ID 可读且抽象，项目内部 ID、资源坐标和事件处理器由桥接层映射。
- [ ] 设计 Host Bridge 配置草案，覆盖 Inscape ID 到项目 ID、资源引用、宿主事件处理器和查询实现的映射。
- [ ] 调研 Unity `[Inscape]` Attribute 扫描和 Unity Editor 代码生成流程，生成待配置 Host Bridge 表并保留人工确认步骤。
- [ ] 设计 Host Bridge 到 adapter 代码生成的最小闭环，用 UnitySample 当前输出作为回归样例，逐步替代硬编码样例结构。
- [ ] 明确 Unity 上层消费事件数据的模型：直接事件绑定、轮询叙事状态，还是混合模式。
- [ ] 明确查询表达式是否允许副作用。当前倾向是不允许。
- [ ] 设计宿主查询 / 回调 / 事件清单的注册或代码生成策略，避免 DSL 直接控制反转进业务层。
