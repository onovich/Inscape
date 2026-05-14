# Agent 接手指南

状态：基线

最后更新：2026-05-14

本文用于让未来继续维护 Inscape 的 agent 快速恢复项目上下文。它不是替代完整文档，而是入口、索引和工作协议。

## 当前项目快照

Inscape 当前处于第一阶段：DSL 与轻工具链已经形成可运行原型。当前长期架构已经收敛为 Internal 与 ExternalSupport 两层：Internal 包含 `Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer` 与未来 `Runtime`；ExternalSupport 当前主要是 `UnityPlugin` 方向的样例和原型。UnitySample 实验 adapter 继续保留，但只作为 ExternalSupport 过渡样例，不代表最终 Host Bridge 方案。

当前主动重构范围只覆盖 Internal 侧的 `Inscape.Compiler`、`Inscape.Cli`、`src/Internal/VSCode/vscode-inscape` 与测试组织；`src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 视为 ExternalSupport 原型，暂不纳入这一轮内部重构，只保留隔离和回归样例职责。

### 2026-05-11 当前交接结论（最新）

- 2026-05-12 已开始按目录优先蓝图执行实际迁移：目录骨架与规则 README 已提交，Internal 侧 `.NET` 项目已迁入新路径，当前路径为 `src/Internal/Compiler/Inscape.Compiler`、`src/Internal/Tooling`、`src/Internal/Cli/Inscape.Cli`。
- 2026-05-12 已完成 Compiler 项目名、命名空间与入口门面收敛：`src/Internal/Compiler/Inscape.Core/Inscape.Core.csproj` 已迁为 `src/Internal/Compiler/Inscape.Compiler.csproj`，`Inscape.Core.*` 已改为 `Inscape.Compiler.*`，原 `InscapeCore` 门面已改为 `CompilerEntry`。真正执行单文件编译的 `DslScript/Domains/InscapeCompiler` 保持不变。
- 2026-05-12 已同步更新 `Inscape.slnx`、`ProjectReference`、VSCode fallback CLI 项目路径、CLI 命令速查示例和相关文档命令路径。验证通过：`dotnet build Inscape.slnx --no-restore` 与 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。由于项目路径变化，执行过一次 `dotnet restore Inscape.slnx --configfile NuGet.Config` 来刷新项目图缓存。
- 2026-05-12 已迁移 VSCode 前端源码：`tools/vscode-inscape` -> `src/Internal/VSCode/vscode-inscape`。扩展内部仍保留原 npm 包结构，后续再按 provider / command / preview bridge / style / workspace index 深拆。验证入口同步改为 `node --check src\Internal\VSCode\vscode-inscape\extension.js`。
- 2026-05-12 已迁移 Unity 外部支持源码：`src/Inscape.Adapters.UnitySample` -> `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，`tools/unity-bird-importer` -> `src/ExternalSupport/UnityPlugin/unity-bird-importer`。当日 `Inscape.slnx` 已移除 UnitySample 的直接项目条目，但 CLI 与 tests 仍会传递构建该项目；这个遗留点已在 2026-05-13 通过外部支持命令边界拆分解决。
- 2026-05-13 已完成外部支持命令边界拆分：UnitySample 命令迁入 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`，UnitySample 回归测试迁入 `tests/ExternalSupport/UnityPlugin/Inscape.UnitySample.Tests`。`src/Internal/Cli/Inscape.Cli` 与 `tests/Internal/Inscape.Tests` 不再引用 UnitySample，默认 `Inscape.slnx` 构建不再传递构建 UnityPlugin。
- 2026-05-13 已开始整理 Tooling 内部目录：`Inscape.Tooling.csproj` 已提到 `src/Internal/Tooling` 根目录，源码按 `ProjectSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 的 `Domains` / `Models` 目录落位。命名空间暂保留 `Inscape.Tooling`，后续再按业务目录决定是否拆命名空间。
- 2026-05-13 已开始整理 CLI 内部目录：`src/Internal/Cli/Inscape.Cli` 下新增 `Entries`、`Commands`、`Providers`、`ViewModels`，分别承载 `CliCore`、具体命令、命令元数据 provider 和输出 DTO。命名空间暂保留 `Inscape.Cli`。
- 2026-05-13 已开始整理 Internal 测试目录：`tests/Internal/Inscape.Tests` 下新增 `Entries`、`Shared`、`Compiler`、`Cli`、`PreviewLocalization`，先按现有测试文件边界落位，测试 runner 仍保持轻量手写模式。
- 2026-05-13 已开始整理 UnitySample CLI 内部目录：`src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli` 下新增 `Entries` 与 `Commands`，命令仍保持 ExternalSupport 独立验证入口，不进入默认 solution。
- 2026-05-13 已启动 VSCode 拆分主线 A1：`src/Internal/VSCode/vscode-inscape` 下已建立 `ExtensionEntry`、`Commands`、`LanguageFeatures`、`WorkspaceIndex`、`Bridges`、`PreviewWebview`、`Styles`、`Schemas` 目录骨架和规则 README；`extension.js` 尚未拆分。
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
- 2026-05-12 已迁移当前聚合测试项目：`tests/Inscape.Tests` -> `tests/Internal/Inscape.Tests`。这只是测试项目路径进入 Internal 测试树，测试内容尚未按 Compiler / Tooling / Cli / ExternalSupport 拆分。
- 当前分支为 `main...origin/main`。本轮已把目录优先方案正式冻结为文档与 ADR；最新提交请以 `git log --oneline -1` 为准。
- 本轮会话已确认新的重构铁律：先搭目录骨架与 `README.md` 规则文件，再迁大目录路径，再迁 solution / 项目路径，再迁项目名、命名空间和类型名；在此之前，不再把主要重构精力继续放在旧目录里的微观 helper 收口上。
- 本轮会话已将该铁律落入 [目录优先重构蓝图](directory-first-reframe-plan.md) 与 [ADR 0012](adr/0012-directory-first-repository-reframe-order.md)。
- 本轮会话已明确当前最显眼的不符合点已从“大目录不成形 / UnitySample 仍在默认编译链”转为“VSCode 目录骨架已建但 `extension.js` 尚未拆分，Cli / Tooling 命名空间仍未细分，LanguageServer 与 Runtime 仍只有骨架，测试项目仍可继续按更细领域拆分”。
- 本轮会话已确认新的优先级：下一阶段应先做目录骨架与规则文件，再迁大目录路径与 solution 边界；Tooling 上提、VSCode 深拆、LanguageServer 细化与项目名迁移都排在目录外形稳定之后。
- 本轮会话确认新的长期结构：Internal 为 `Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`；ExternalSupport 为 `UnityPlugin`。
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
- 本轮会话已先收口 VSCode 预览定位 selection bridge：原先散在 `src/Internal/VSCode/vscode-inscape/extension.js` 顶层的 pending reveal 状态与相关函数已收为 `PreviewRevealBridge`，使 Ctrl+Click 到预览定位的链路拥有明确 `Bridge` 角色。
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
- 本轮会话已开始迁移 VSCode language features：`DslScriptCompletionProvider`、`DslScriptDefinitionProvider`、`DslScriptReferenceProvider`、`DslScriptHoverProvider` 与 `DslScriptDocumentSymbolProvider` 已进入 `LanguageFeatures`，补全、定义跳转、引用查找、悬浮说明和 outline 逻辑继续复用 `WorkspaceIndex` 中的 node / speaker / host binding / metadata provider 与 preview reveal bridge，不在编辑器层重建编译语义。
- 本轮会话已顺手修复预览定位局部缺陷：`findDialogueSeparatorIndex` 中误残留的 preview reveal 调用与缺失的半角冒号解析已清理，避免说话人行的预览定位在运行时触发异常。
- 本轮会话已继续收敛 CLI 总入口 runner 命名：`CliTopLevelCommandRunner`、`CliSingleFileCommandRunner`、`CliProjectCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`。
- 本轮会话已继续按终局后缀白名单收口 CLI 命令入口：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 以及 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，收敛为 `CliTopLevelCommand`、`CliSingleFileCommand`、`CliProjectCommand` 与 `CliUnitySample*Command`。
- 本轮会话已继续按终局后缀白名单收口 CLI 展示与命令元数据类型：`CliCompileOutput`、`CliProjectCompileOutput` 已分别改为 `CliCompileViewModel`、`CliProjectCompileViewModel`，`CliCommandCatalog` 已改为 `CliCommandProvider`，内部 `CliCommandDefinition` 也已改为 `CliCommandModel`。
- 本轮会话已继续按分层规则上提 CLI 共享预览逻辑：`CliPreviewHtmlRenderer` 已迁入 `Inscape.Tooling` 并改为 `PreviewHtmlRendererDomain`，CLI 侧只保留 preview 命令路由、样式读取与输出适配。
- 本轮会话已继续按 CLI 入口边界收紧编译前置流程：`CliCompilerProject`、`CliCompilerSingleFile` 已退出源码，相关项目/单文件编译前置逻辑分别收回 `CliProjectCommand` 与 `CliSingleFileCommand`。
- 本轮会话已继续收口 UnitySample 项目级命令分支：`CliProjectCommand` 不再直接编排三条 UnitySample 项目级命令，改为委托 `CliUnitySampleProjectCommand`。
- 本轮会话已继续压薄 binding-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 binding template 读取、CSV 输出和诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。
- 本轮会话已继续压薄 role-template 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载 role template 读取、CSV 输出和 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。
- 本轮会话已继续压薄 project-export 项目级命令编排：`CliUnitySampleProjectCommand` 不再直接承载导出参数校验、导出执行和写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。
- 本轮会话确认：VSCode 长期方向是“薄扩展前端 + C# LanguageServer”，而不是继续长期借道 CLI 承载重语义能力。
- 本轮会话确认：Unity 支持不再视为 Internal 五层之一，而视为 ExternalSupport/UnityPlugin；代码可以继续留在当前仓库，但不应进入默认 .NET solution 编译链。

### 2026-05-01 当前交接结论（最新）

- 当前分支为 `main...origin/main`，HEAD 为 `85e870d refactor(cli): extract single-file compiler preflight`；最近连续提交还包括 `056d345 refactor(cli): extract project compiler preflight`、`30fe7d2 refactor(cli): split project config models`、`7c5b602 refactor(cli): align dsl source and preview loaders`。
- 最近一轮 CLI 收口已完成并验证通过：项目/单文件编译前置逻辑已分别收回 `CliProjectCommand` 与 `CliSingleFileCommand`，`CliCore` 仅保留参数分流、共享输出和退出码整合。
- 本轮会话最终确认：不要把下一步重构目标表述成 `InscapeProjectService` / `Workspace` / `ProjectSystem` 一类总服务；长期架构术语优先使用 `Dsl`、`DslSources`、`Config`、`Cli`、`Preview`、`L10n`、`Host` 这些窄职责模块名。
- 本轮会话同时确认新的类型命名方向：参考 Bird 的思路，目录和命名空间优先表达层级与范围，类型名只表达当前模块里的具体主语和角色。`Project`、`SingleFile`、`Workspace` 不再作为类型名前缀的默认选择，`Support` / `Helper` 一类弱语义后缀应优先被拆分。

### 当前确认的模块命名

- `Compiler`：编译期真相层；当前主要由 `Inscape.Compiler` 承载。内部主业务为 `DslScript`、`StoryGraph`、`Localization`。
- `Tooling`：共享用例层；长期用于承接项目扫描、ToolConfig、Preview、Localization、HostSchema、HostBinding 等流程。当前这些流程有相当一部分仍暂住在 `Inscape.Cli`。
- `Tooling` 当前已实际落下一块稳定落点：`ToolConfig` 已迁入独立项目 `src/Inscape.Tooling/`。
- `Tooling` 当前已实际落下第二块稳定落点：`ProjectSources` 已迁入独立项目 `src/Inscape.Tooling/`。
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
- `Cli` 的 UnitySample 项目级命令当前也已形成更清楚的入口边界：`CliProjectCommand` 只做委托，具体三条项目级命令由 `CliUnitySampleProjectCommand` 承载。
- `Cli` 的 binding-template 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体 binding template 读取、主 CSV 输出和诊断输出由 `CliUnitySampleBindingTemplateCommand` 承载。
- `Cli` 的 role-template 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体 role template 读取、主 CSV 输出和 report 输出由 `CliUnitySampleRoleTemplateCommand` 承载。
- `Cli` 的 project-export 项目级命令当前也已形成更清楚的局部边界：`CliUnitySampleProjectCommand` 只做分派，具体导出参数校验、导出执行和写盘输出由 `CliUnitySampleProjectExportCommand` 承载。
- `VSCode`：编辑器入口层；当前主要落在 `src/Internal/VSCode/vscode-inscape/extension.js`。
- `LanguageServer`：C# 语义服务层；当前尚未创建项目，但已确认长期方向。
- `Runtime`：未来运行期层；当前尚未实现。
- `ExternalSupport/UnityPlugin`：Unity 环境下的外部支持层；当前由 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample` 与 `src/ExternalSupport/UnityPlugin/unity-bird-importer` 作为过渡样例与原型承载。

### 2026-04-30 GitHub Copilot 接手巡检

- 已按本指南完成接手阅读：`docs/agent-handoff.md`、`docs/todo.md`、`docs/roadmap.md`、`docs/open-questions.md` 和 `docs/code-structure.md`。
- 仓库位于 `main...origin/main`，HEAD 为 `8087d5b feat: 明确 Timeline Hook phase 语义`。
- 当前存在接手前未提交变更：`samples/court-loop.inscape` 修改了一句证人对白并追加文件末尾空行；`src/Internal/VSCode/vscode-inscape/extension.js` 的 VSCode 交互按用户反馈改为接近 C# 的引用模型：block 标题显示 `N 个引用`，点击打开 References Peek，`-> target` Hover 只做类型说明，speaker 定义缺失时回退到对白引用位置。
- 接手验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\Internal\VSCode\vscode-inscape\extension.js`。
- VSCode 角色名、block 引用计数和 `-> target` 简短 Hover 已按用户最新反馈对齐；Timeline / 资源别名定义跳转、Host Schema 脚本内跳转和变量名追溯仍未实现。
- 2026-05-01 继续修正 VSCode 角色名 Ctrl+Click 范围：不再尝试注册 `DocumentHighlightProvider`，改为在 `language-configuration.json` 的 `wordPattern` 中把全角冒号和常见中文标点作为词边界，使 `旁白：证物袋里只有一枚旧怀表。` 只把 `旁白` 识别为可跳转词。
- 2026-05-01 用户补充新的架构约束：Host Schema 查询可参考 `?hasItem("badge")->node`，但 Inscape 可读 ID 与项目内部 ID 必须通过 Host Bridge 映射；`item` 是抽象叙事概念，不等同业务 Item；下层状态只被上层查询或内部使用，不反向查询上层；Bird 只是 Unity 支持参考需求方，不应绑定 Core、通用 Unity 插件、Addressables 或 ScriptableObject；Timeline Hook 长期应泛化为宿主自定义事件示例；Unity 上层支持层应作为独立插件 / 适配包研究。
- 2026-05-01 已将原 Core 内的固定 Unity 项目适配 spike 迁出为 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，CLI 命令改为 `export-unity-sample-*` / `merge-unity-sample-l10n`。该项目明确标注为实验样例：它硬编码 `talkingId`、`roleId`、`L10N_Talking`、Timeline asset 和 manifest 字段，只用于验证导出 / L10N / hook / 绑定流程，不代表最终 Host Bridge 或通用 Unity Runtime Host。
- 2026-05-01 用户补充 Unity 支持层候选方向：在 Unity 项目的类、字段、方法上加 `[Inscape]` 一类 Attribute，由 Unity 内代码生成脚本扫描并生成待配置桥接表；人工再完成 C# 类名 / 字段名与 Inscape 可读名的映射。拿到数据后上层是直接绑定事件、轮询触发，还是混合模型仍待定，不应提前写死。
- 2026-05-01 已整理 VSCode 扩展发布工作流：扩展改动后不能只重启窗口，必须重新打包并覆盖安装；当前推荐入口是 `src/Internal/VSCode/vscode-inscape/` 下的 `npm run rebuild:vsix`，细则见 [VSCode 扩展发布工作流](vscode-release-workflow.md)。
- 2026-05-01 VSCode 可玩预览已经落地到 custom editor：默认通过 `Inscape: Open Preview` / `Inscape: Toggle Preview` 在源码右侧打开，预览不再劫持 `.inscape` 源码标签页或 Ctrl+Click 跳转。当前交互是单栏沉浸式阅读体验，支持点击选项推进、无选项时点击正文继续、Back、Restart、diagnostics、源码回跳，以及编辑防抖刷新和保存后立即刷新。
- 2026-05-01 预览链路的关键经验已确认：webview 必须显式启用 scripts；刷新时要保留当前 `{ current, path }` 状态，避免每次回到第一页；CLI 调用应优先复用已构建的 `Inscape.Cli.exe`，其次 `dotnet exec Inscape.Cli.dll`，最后再回退到 `dotnet run --project ...`，否则交互延迟会明显偏高。
- 2026-05-01 VSCode 脚本交互约定已进一步收敛：`@entry`、`@scene`、`@timeline` 等统一视作 `@metadata` 语法层，`[]` 视作宿主绑定 / 行内标签层；二者都应提供 Hover 与可理解的导航，但不要在 VSCode 侧重写 Core 语义。预览中的源码回跳与源码编辑器内的 Ctrl+Click 应保持隔离，不做自动双向同步。
- 2026-05-01 VSCode 双向定位又补了一层：预览里的 `源码` 按钮现在优先复用已打开的源码编辑器，否则新开源码页签；编辑器中的正文 / 选项文本不再使用 `DocumentLinkProvider`，避免整段文本常驻下划线。当前用 `DefinitionProvider` 提供精确 Ctrl+指向链接态，并通过 selection bridge 在 Ctrl+Click 后调用 `inscape.revealInPreview`，继续打开或复用预览并定位到对应页面；`Inscape: Reveal Current Selection In Preview` 作为显式兜底入口保留。这个行为属于作者体验层，不改变 DSL 语义或 Core 输出。

已经落地：

- 文档体系、ADR、路线图和 TODO。
- C# Compiler Core：解析 `.inscape`、生成 Narrative Graph IR、诊断图结构。
- 图叙事基线：显式节点名、跨文件项目编译、项目内节点名全局唯一、节点内 `@entry` 项目入口，以及项目级 CLI `--entry node.name` 临时入口覆盖。
- 行级锚点：`l1_<fnv1a64-hex>`，不依赖文件路径或绝对行号，检测 `INS040` 锚点碰撞。
- CLI：单文件和项目级 `check`、`diagnose`、`compile`、`preview`。
- HTML 预览：支持单文件/项目级 IR、节点跳转、选择、回环、Restart、Back、路径和锚点显示。
- 本地化：CSV 提取、按旧 CSV 精确继承译文、`current/new/removed` 状态标记。
- VSCode 原型：TextMate 高亮、snippets、诊断桥接、节点补全、角色补全、宿主绑定别名补全、Outline、跳转定义、引用查找、Hover、block CodeLens、本地化导出/更新命令，以及可玩预览 custom editor。角色补全会读取 `inscape.config.json` 中的 `unitySample.roleMap`，并回退扫描工作区已有 speaker；角色 Ctrl+Click 会跳到 role map 对应行，Find All References 会列出工作区对白；block 标题 CodeLens 显示 `N 个引用`，用于追溯调用方；宿主绑定提示会读取 `unitySample.bindingMap`，覆盖 `@timeline ...` 和 `[kind: ...]` 位置；预览默认侧边打开，支持源码回跳、Back / Restart、点击正文继续和刷新后保留当前页进度。
- Bird/Unity 初步调研：已梳理 `StorySystem`、`TalkingTM`、`L10N_Talking`、`DirectorSystem` 和 `TimelineEffectTM` 的边界，详见 [Bird / Unity 调研记录](bird-unity-research.md)。
- UnitySample Adapter 实验样例：`export-unity-sample-role-template`、`export-unity-sample-binding-template`、`export-unity-sample-project` 和 `merge-unity-sample-l10n` 保留早期固定数据结构导出验证。适配器位于 `src/ExternalSupport/UnityPlugin/Inscape.Adapters.UnitySample`，命令入口位于 `src/ExternalSupport/UnityPlugin/Inscape.UnitySample.Cli`；它们不得反向污染 Compiler 或 Internal CLI。详见 [UnitySample Adapter 实验样例](unity-sample-adapter.md)。
- 项目配置：CLI 会自动读取项目根目录 `inscape.config.json`，也支持 `--config path`。当前配置为 UnitySample 样例命令提供默认值：`talkingIdStart`、`roleMap`、`bindingMap`、`existingRoleNameCsv`、`existingTimelineRoot`、`existingTalkingRoot`；命令行参数优先级更高。这仍不是最终 Host Bridge。详见 [项目配置草案](project-config.md)。
- 宿主 Schema 草案：新增 `hostSchema` 项目配置字段与 `export-host-schema-template` CLI 命令，用于生成 `inscape.host-schema` JSON 模板，先描述纯查询和宿主事件清单，不改变当前 DSL 解析或 UnitySample 导出行为。VSCode 已提供 `inscape.host.schema.json` / `*.host.schema.json` 的 JSON Schema 校验，以及 `Inscape: Show Host Schema Capabilities` 命令读取并浏览当前 query / event。详见 [宿主 Schema 草案](host-schema.md)。
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
- CLI 当前已完成多步低风险瘦身：顶层元命令、单文件命令与项目级命令分支都已从 `CliCore` 主入口中抽离；项目配置、项目源扫描、预览样式等共享流程已上提到 `Inscape.Tooling`，项目/单文件编译前置流程也已分别收回 `CliProjectCommand` 与 `CliSingleFileCommand`。当前下一步的正确方向不是继续扩张 Cli，而是继续按 ADR 0010 和分层规则，把仍然单命令单用途的局部编排收紧到入口，把真正共享的流程继续上提到 `Tooling`。
- 2026-05-11 已开始执行 Tooling 抽取：当时 `CliConfigLoader` / `CliProjectConfig` 已被 `Inscape.Tooling` 内的 ToolConfig 模型与读取逻辑取代，`CliCompilerProject` 与 `CliCompilerSingleFile` 通过 `ToolConfigReaderDomain` 取配置。这一刀通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 Tooling 抽取：当时 `CliDslSourceLoader` 已被 `Inscape.Tooling` 内的 `ProjectSourcesLoaderDomain` / `ProjectSourceOverrideModel` 取代，`CliCompilerProject` 只保留 `--override` 参数解释与编排调用。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
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
- 2026-05-11 已继续执行 CLI 总入口命名收敛：`CliTopLevelCommandRunner`、`CliSingleFileCommandRunner`、`CliProjectCommandRunner` 已分别改为 `CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore`。
- 2026-05-11 已继续执行 CLI 命令入口终局后缀收敛：`CliCommandTopLevelRunner`、`CliCommandSingleFileRunner`、`CliCommandProjectRunner` 与 `CliUnitySample*CommandRunner` 已统一去掉 `Runner`，改为 `CliTopLevelCommand`、`CliSingleFileCommand`、`CliProjectCommand` 与 `CliUnitySample*Command`。这一刀同样通过了命名规则对照：`Command` 仍属于宿主入口白名单后缀，`Runner` 已退出当前源码。
- 2026-05-11 已继续执行 UnitySample 项目级命令收口：`CliProjectCommand` 当前不再直接编排三条 UnitySample 项目级命令，相关逻辑已迁入 `CliUnitySampleProjectCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample binding-template 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载 binding template 读取、主 CSV 输出与诊断输出，相关逻辑已迁入 `CliUnitySampleBindingTemplateCommand`。这一刀同样通过了 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj`。
- 2026-05-11 已继续执行 UnitySample role-template 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载 role template 读取、主 CSV 输出与 report 输出，相关逻辑已迁入 `CliUnitySampleRoleTemplateCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`。
- 2026-05-11 已继续执行 UnitySample project-export 项目级命令收口：`CliUnitySampleProjectCommand` 当前不再直接承载导出参数校验、导出执行与写盘输出，相关逻辑已迁入 `CliUnitySampleProjectExportCommand`。这一刀同样通过了 `dotnet build Inscape.slnx --no-restore` 和 `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj`。

- 2026-05-01 已完成 CLI 项目命令收口：当时项目级命令分发落在 `CliProjectCommand`，共享的“配置读取 + `.inscape` 项目源扫描/读取/override + 项目编译”前置流程收口到 `CliCompilerProject`；其中 DSL 源加载位于 `CliDslSourceLoader`，UnitySample role/binding/export 辅助逻辑位于 `CliUnitySampleSupport`。单文件命令的“输入读取 + 邻近项目配置读取 + 单文件编译”前置流程也收口到 `CliCompilerSingleFile`。`CliCore` 只保留参数分流、共享输出和退出码整合。验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check src\Internal\VSCode\vscode-inscape\extension.js`。这些类型名后来继续按目录优先、主语/角色的方式逐步替换。

- 2026-05-11 认知又补了一层：除了命名模型收敛，长期架构本身也已定稿为 Internal / ExternalSupport 两层。Internal 以 `Compiler` / `Tooling` / `Cli` / `VSCode` / `LanguageServer` / `Runtime` 组织；ExternalSupport 当前以 `UnityPlugin` 为核心。详见 ADR 0011、[代码结构规划](code-structure.md) 和 [编码与命名规范](coding-conventions.md)。

## 本轮踩坑总结

- 这次回归的根因不是颜色配置，而是误把 `DocumentLinkProvider` 当成“可样式化的 Ctrl+Hover 链接态”来用。
- TextMate scope、decorations、`inscape.editor-style.json` 里的 `...TextDecoration` 只适合处理视觉层，不适合修复 provider 语义层误用。
- 以后碰到“常驻下划线 / 链接态消失”这类问题，先查 provider 类型是否选错，再查样式；不要反过来。
- 只要改了 `src/Internal/VSCode/vscode-inscape/`，就必须 `npm run rebuild:vsix` 并安装；否则很容易把“旧扩展效果”误判成“新代码回归”。
- 最终稳定方案已经明确分层：`DefinitionProvider` 只负责 Ctrl+指向的瞬时链接态，selection bridge 只负责把 Ctrl+Click 转成 `inscape.revealInPreview`，显式命令只做兜底。
- 如果未来再改正文 / 选项的导航体验，优先在 provider / selection 流程里排查，不要先去改主题、TextMate scope 或样式 JSON。

## 下一步优先队列

建议优先做小而闭环的任务，不要直接跳到大规模重构。

1. 当前重构收口（最高优先级）：
   - 先抽出 `Tooling`，把当前 Cli 中的共享流程从命令行入口层移走。
   - 建立 `LanguageServer` 基线，让 VSCode 长期走“薄前端 + C# server”方向。
   - VSCode 继续按 provider / command / preview bridge / style / workspace index 拆分 `extension.js`。
   - Unity 支持继续留在仓库内，但明确收束到 `ExternalSupport/UnityPlugin`，不进入默认 .NET solution 编译链。
   - 每轮小步重构后同步更新 handoff / todo / refactoring-plan / code-structure / development-plan，避免文档口径再次滞后。

2. `@` / `[]` 语法收敛：
   - 当前作者反馈已经非常明确：这两套语法的职责重叠过高，使用者难以形成稳定心智模型。
   - 下一步需要明确：`@` 是否保留为纯 metadata / 时机声明，`[]` 是否保留为纯 `kind:alias` 宿主绑定；`@timeline ...` 与 `[timeline: ...]` 是否保留双写法，还是收敛到单一表达。
   - 这项工作优先级高于继续扩展更多宿主标签或事件语法，否则只会扩大歧义面。

3. Host Bridge 草案与 UnitySample 生成化：
   - `Inscape.Adapters.UnitySample` 只是实验样例，当前硬编码宿主数据结构不能作为最终方案。
   - 下一步应设计 Host Bridge 配置，把 Inscape 可读 ID 映射到项目内部 ID、资源、事件处理器和查询实现。
   - Unity 支持层候选方向是用 `[Inscape]` Attribute 扫描项目 C# 类型和成员，由 Unity 内代码生成脚本生成待配置桥接表，再人工确认 C# 成员与 Inscape 可读名的映射。
   - 上层拿到 Inscape 事件 / 数据后的消费方式仍待定：可以直接绑定事件，也可以轮询叙事状态，或允许项目选择混合模型。
   - 适配层长期应由 Host Schema / Host Bridge / 代码生成驱动，UnitySample 可保留为 generator 回归样例。
   - 当前样例命令包括 `export-unity-sample-project`、`export-unity-sample-role-template`、`export-unity-sample-binding-template` 和 `merge-unity-sample-l10n`。
   - Timeline Hook 已支持 metadata：`@timeline alias` / `[timeline: alias]` 默认 `talking.exit`，也支持 `@timeline.talking.enter alias`、`@timeline.talking.exit alias`、`@timeline.node.enter alias`、`@timeline.node.exit alias` 和对应 bracket 写法，导出为 manifest `hostHooks`。
   - 后续适配重点：把当前固定 CSV / manifest / L10N 输出抽象为可配置、可生成的桥接流程。

4. VSCode 预览增量体验：
   - 预览主流程已经可用，但还可以继续逼近 Markdown / Inky 的“边改边玩”感受。
   - 增量方向包括：更细粒度的未保存内容热刷新、更明确的刷新中 / 诊断中状态提示，以及是否提供可选的预览 / 源码同步模式。
   - 继续保持原则：预览复用 Core / CLI 结果，不在扩展里重写 parser 或运行时语义。

5. 第一版块语法收敛：
   - 当前原型使用 `:: node.name`。
   - 用户偏好更接近 `# 标题` 的写作式块语法，并且不喜欢缩进语义。
   - 需要明确“给人看的标题”和“给机器跳转的标识”是否解耦。

6. Timeline Hook 真实导入验证：
   - Core / manifest 已能表达 `talking.enter`、`talking.exit`、`node.enter`、`node.exit`。
   - 当前 Bird 运行时只安全支持 `talking.exit -> TalkingEffectTM.PlayTimeline`；Unity Importer 对其他 phase 输出 unsupported warning 并跳过。
   - 下一步应使用带真实 Timeline 绑定的样例在 Bird 项目中跑 Dry Run / Import，确认 `talking.exit` 的 effects 字段和 warning 文本。

7. 本地化模糊匹配设计：
   - 在 `update-l10n` 的精确锚点继承之后，增加“疑似改写”候选。
   - 第一版不要自动套用模糊译文，只输出候选给人工确认。

8. 宿主 Schema 接入脚本体验：
   - `export-host-schema-template` 已能生成查询 / 事件清单模板。
   - VSCode 已能校验 host schema JSON，并通过命令面板浏览当前 query / event。
   - 下一步可以等条件 / 事件语法更明确后，把 query / event 接入 `.inscape` 脚本内补全 / Hover。

9. Language Server 设计：
   - 先写能力范围和协议草案，再决定是否创建 `src/Inscape.LanguageServer/`。

10. 共享契约继续收口：
   - 按 [编码与命名规范](coding-conventions.md) 和 [渐进式重构计划](refactoring-plan.md) 小步重构，而不是一次性大清洗。
   - 短期优先统一 source map / reveal payload 等跨 CLI、VSCode、Preview 的共享数据契约。
   - 如未来确需跨工具链统一门面，也只能在上述窄模块稳定后，作为薄组合层引入，而不是反过来吞掉模块边界。

## 文档检索地图

为了减少 token 浪费，按任务读取对应文档：

```text
任务类型                           优先读取
项目快照 / 接手                    docs/agent-handoff.md, docs/todo.md, docs/roadmap.md
设计决策溯源                       docs/adr/README.md, 对应 ADR
DSL 语法                           docs/dsl-syntax-guide.md, docs/dsl-language.md, docs/syntax-comparison.md, docs/open-questions.md
DSL 生态定位 / 竞品对比             docs/dsl-ecosystem-positioning.md, docs/adr/0007-dsl-benchmark-positioning.md
代码结构 / 新模块                  docs/code-structure.md, docs/coding-conventions.md, docs/refactoring-plan.md, src/Inscape.Compiler, src/Inscape.Cli
VSCode 工具                        docs/vscode-tooling.md, src/Internal/VSCode/vscode-inscape/README.md
HTML 预览                          src/Inscape.Tooling/PreviewHtmlRendererDomain.cs, docs/vscode-tooling.md
本地化 / hash                      docs/hash-localization.md, docs/l10n-extraction.md
宿主 Schema / 查询事件             docs/host-schema.md, docs/dsl-language.md, docs/open-questions.md, docs/todo.md
Unity / Host Bridge                docs/unity-sample-adapter.md, docs/project-config.md, docs/runtime-unity.md, docs/architecture.md, docs/todo.md
编辑器阶段                         docs/editor-design.md, docs/roadmap.md
```

不要每次都全量阅读所有文档。先读本指南和 TODO，再按任务进入 1 到 3 个目标文档。

## 工作方法

- 先看 `git status`，确认是否有未提交变更。
- 修改设计、语法、IR、本地化、存档或编辑器交互时，同步更新文档；长期决策新增 ADR。
- 保持 `Inscape.Compiler` 不依赖 Unity、VSCode、HTML 或第三方包。
- CLI 可以作为工具层封装 Core，但不要把核心语义只写在 CLI 里。
- VSCode 扩展里可以做轻量行扫描，但语法真相必须来自 Core/CLI。
- 修改后至少运行构建和测试；涉及 VSCode 时跑 Node 语法/JSON 检查。
- 每个阶段完成后提交并推送，保持远端可接续。
- 若改动发生在 `src/Internal/VSCode/vscode-inscape/`，默认把“打包 + 安装 + reload”纳入验证流程，而不要把源码修改误认为发布完成。

## 常用命令

在当前 Windows 环境中，Git 需要显式安全目录：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-build
node --check src\Internal\VSCode\vscode-inscape\extension.js
node -e "JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/syntaxes/inscape.tmLanguage.json','utf8')); console.log('json ok')"
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

- `@entry` 和 CLI `--entry node.name` 临时入口覆盖都已实现；项目配置文件式入口仍未设计。
- 行级 hash 已实现，但节点重命名迁移、显式稳定 ID 和模糊匹配还没做。
- VSCode 原型已经具备很多能力，包括本地化命令，但不是正式 Language Server。
- HTML 预览已经能调试图结构，但不是游戏运行时。
- 本地化旧表更新只做精确锚点继承，不做相似文本自动匹配。
- Timeline/DirectorSystem 的初步边界已记录：第一版只引用 Timeline，不直接生成 Timeline；Hook phase 已有最小语法，但除 `talking.exit` 外仍需运行时或 adapter 语义验证，Presentation IR 边界后续再设计。
- UnitySample 导出样例不生成 Unity `.asset`；它只是当前 adapter / importer 思路的实验输入，不是最终 Host Bridge。
