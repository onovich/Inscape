# Agent 接手指南

状态：基线

最后更新：2026-04-30

本文用于让未来继续维护 Inscape 的 agent 快速恢复项目上下文。它不是替代完整文档，而是入口、索引和工作协议。

## 当前项目快照

Inscape 当前处于第一阶段：DSL 与轻工具链已经形成可运行原型，Unity/Bird 适配已有无 Unity 依赖的导出原型。

已经落地：

- 文档体系、ADR、路线图和 TODO。
- C# Compiler Core：解析 `.inscape`、生成 Narrative Graph IR、诊断图结构。
- 图叙事基线：显式节点名、跨文件项目编译、项目内节点名全局唯一、节点内 `@entry` 项目入口，以及项目级 CLI `--entry node.name` 临时入口覆盖。
- 行级锚点：`l1_<fnv1a64-hex>`，不依赖文件路径或绝对行号，检测 `INS040` 锚点碰撞。
- CLI：单文件和项目级 `check`、`diagnose`、`compile`、`preview`。
- HTML 预览：支持单文件/项目级 IR、节点跳转、选择、回环、Restart、Back、路径和锚点显示。
- 本地化：CSV 提取、按旧 CSV 精确继承译文、`current/new/removed` 状态标记。
- VSCode 原型：TextMate 高亮、snippets、诊断桥接、节点补全、角色补全、Outline、跳转定义、引用查找、Hover、本地化导出/更新命令。角色补全会读取 `inscape.config.json` 中的 `bird.roleMap`，并回退扫描工作区已有 speaker。
- Bird/Unity 初步调研：已梳理 `StorySystem`、`TalkingTM`、`L10N_Talking`、`DirectorSystem` 和 `TimelineEffectTM` 的边界，详见 [Bird / Unity 调研记录](bird-unity-research.md)。
- Bird Adapter 原型：`export-bird-role-template` 可从项目对白 speaker 自动生成 `speaker,roleId` 模板，并可通过 `--bird-existing-role-name-csv` 读取 Bird `L10N_RoleName.csv` 自动填入唯一匹配的 `roleId`；`export-bird-binding-template` 可从 Timeline Hook 生成待补全绑定表，并可用 `--bird-existing-timeline-root` 扫描现有 Timeline `.asset` / `.meta` 辅助填入 `timelineId`、Unity guid 和 asset path；`export-bird-project` 可生成 `bird-manifest.json`、`L10N_Talking.csv`、`inscape-bird-l10n-map.csv` 和 `bird-export-report.txt`，支持 `--bird-role-map` 绑定 speaker 到 `roleId`，支持 `--bird-binding-map` 绑定资源 / Timeline 别名到 Bird 与 Unity 坐标，支持 `@timeline alias` / `[timeline: alias]` 导出 `hostHooks`，并支持 `--bird-existing-talking-root` 扫描现有 `talkingId` 避让冲突。Manifest 现在包含 `warnings`，会报告重复 host binding、缺失 Timeline 绑定和无法挂载 hook。详见 [Bird Adapter 原型](bird-adapter.md)。
- 项目配置：CLI 会自动读取项目根目录 `inscape.config.json`，也支持 `--config path`。当前配置只为 Bird 命令提供默认值：`talkingIdStart`、`roleMap`、`bindingMap`、`existingRoleNameCsv`、`existingTimelineRoot`、`existingTalkingRoot`；命令行参数优先级更高。详见 [项目配置草案](project-config.md)。
- Bird 角色绑定审查：`export-bird-role-template` 支持 `--report`，输出 `unique`、`ambiguous`、`missing`、`unscanned` 状态。2026-04-30 用 Bird 当前 `L10N_RoleName.csv` 试跑，当前样例中 `旁白` 为 `ambiguous`，候选 `1050|10001`；`成步堂` 和 `证人` 为 `missing`。因此当前导出的 `bird-roles.csv` 仍全部为空，需要人工补齐或更换测试文本中的角色名。
- Bird L10N 合并预览：`merge-bird-l10n <generated-L10N_Talking.csv> --from <existing-L10N_Talking.csv> --report report.csv -o merged.csv` 已实现。规则是保留 Bird 未涉及行、新增 Inscape 行、源文本未变时保留译文、源文本变化时清空目标语言列并把旧值写入 report。2026-04-29 已用 Bird 当前 `L10N_Talking.csv` 试跑，原表 270 行、合并预览 275 行、报告只包含 5 个 `added` 行，未改动 Bird 正式表。
- Unity Editor Importer 原型：`tools/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs` 可复制到 Bird 项目 `Assets/Editor/`，读取 manifest 并创建 / 更新 `TalkingSO`，将 Timeline Hook 映射为 `TalkingEffectTM.PlayTimeline`；已提供 `Dry Run Import Manifest...` 菜单、`DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine` batchmode 入口。Dry Run 输出创建 / 更新 / 缺失引用计划，报告既有 `TalkingTM` 的字段级变化，并在 manifest 同目录写入带 Inscape 节点、锚点和源位置的 `bird-import-dry-run-report.txt`。真实 Import 可加 `-inscapeApplyAddressables` 显式调用 Bird 现有 `TalkingSO.ApplyAA()`，将资源加入 `TM_Talking` group / label。详见 [Unity Editor Importer 草案](unity-editor-importer.md)。
- Bird 项目 batchmode 试跑：2026-04-29 已在 `D:\UnityProjects\Bird` 通过 Unity 2023.2.22f1 执行 `DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine`。样例 manifest 先计划创建 5 个 `TalkingSO`、0 个 warning、0 个 Timeline Hook；真实 Import 后生成 `Assets/Resources_Runtime/Talking/InscapeGenerated/SO_Talking_Inscape_100000.asset` 到 `SO_Talking_Inscape_100004.asset`。二次 Dry Run 显示 5 个 UPDATE 且 `no field changes detected`。随后试跑 `-inscapeApplyAddressables`，只修改 `Assets/Plugins/UnityPlugin/AddressableAssetsData/AssetGroups/TM_Talking.asset`，新增 5 个 address 为资源简名、label 为 `TM_Talking` 的 entries。Bird 项目当前新增 importer、`.meta`、`InscapeGenerated` 资源并修改 `TM_Talking.asset`，尚未提交。

尚未落地：

- Bird 项目新增 importer 与生成资源的提交策略。
- Unity Editor Importer 的字段级 diff UI、选择性合并与回滚能力。
- 资源、Timeline 的宿主绑定配置。
- 正式 Language Server。
- VSCode WebView 预览。
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
- 当前本地化第一版选择 CSV；PO/XLIFF、模糊匹配、人工确认流后续再设计。
- 当前 CSV 格式已能跑通工具链，但用户反馈其生成格式不完全符合预期；这是低优先级认知，后续应结合 Bird 项目的 `L10N` 真实格式再调整。
- Bird 当前运行时的对话文本坐标是 `talkingId + index`，Inscape 的行级 hash 不应被替换，而应通过 Adapter manifest 映射到 Bird 坐标。
- Bird Timeline 是跨 Story、Feeling、Play、Explore 的演出编排层；第一版 DSL 只引用 Timeline，不直接生成 Timeline。
- 最新竞品定位结论：Inscape 的近中期工程参照是 Yarn Spinner，写作与即时预览参照是 Ink/Inky，长期完整 VN 引擎参照是 Ren'Py，编辑器与生产管线参照是 Arcweave / articy:draft。详见 [DSL 生态定位对比](dsl-ecosystem-positioning.md) 和 ADR 0007。
- 最新产品体验结论：Inky 只证明了“边写边玩”的价值，不足以作为 Inscape 编辑器体验上限；后续应更多参考编程编辑器、Notion 和 Medium 的低干扰写作体验，并围绕脚本/节点图/CSV 三视图组织工具。
- 用户当前明显不喜欢缩进承载核心语义；`# 标题` + 空行分块已进入候选，但还没有替代现有 `:: node.name`。

## 下一步优先队列

建议优先做小而闭环的任务，不要直接跳到大规模重构。

1. Bird Unity 项目提交策略与下一层适配：
   - `export-bird-project` 已有最小输出。
   - 角色名到 `roleId` 已支持 CSV 绑定：`--bird-role-map roles.csv`，格式为 `speaker,roleId`。
   - 资源与 Timeline 别名已支持 CSV 绑定：`--bird-binding-map bindings.csv`，格式为 `kind,alias,birdId,unityGuid,addressableKey,assetPath`。
   - 可先运行 `export-bird-binding-template --bird-existing-timeline-root D:\UnityProjects\Bird\Assets\Resources_Runtime\Timeline` 从脚本里已有 Timeline Hook 生成待补全绑定表，并尽量自动填入已有 Timeline 资源坐标。
   - Timeline Hook 已支持 metadata：`@timeline alias` / `[timeline: alias]`，导出为 manifest `hostHooks`。
   - `talkingId` 可通过 `--bird-existing-talking-root` 扫描现有 Talking `.asset` 并避让。
   - Unity Editor Importer 原型已复制到 Bird 的 `Assets/Editor/` 并完成 batchmode Dry Run 与真实 Import。生成资源的 `nextTalking`、选项目标和二次 Dry Run 字段 diff 均通过。下一步需要决定 Bird 仓库是否提交 importer 与 `InscapeGenerated` 资源，或清理试跑资源后只保留 Inscape 侧原型。
   - Addressables 显式开关 `-inscapeApplyAddressables` 已在 Bird 项目内试跑，diff 只包含 `TM_Talking.asset` 新增 5 个 entries。
   - `L10N_Talking.csv` 已有合并预览命令，尚未把 `L10N_Talking.merged.csv` 写回 Bird 正式路径。
   - 后续适配重点：Timeline Hook 带真实绑定的试跑、资源 / Timeline 别名补全，以及是否把项目配置进一步演化为宿主 Schema。

2. 第一版块语法收敛：
   - 当前原型使用 `:: node.name`。
   - 用户偏好更接近 `# 标题` 的写作式块语法，并且不喜欢缩进语义。
   - 需要明确“给人看的标题”和“给机器跳转的标识”是否解耦。

3. Timeline Hook phase 设计：
   - 当前 Bird 运行时只在 talking exit 应用 `TalkingEffectTM.PlayTimeline`，所以原型 manifest 使用 `phase=talking.exit`。
   - 后续要确认是否需要 node enter/exit 或 talking enter phase，不要仓促扩展成完整演出时间轴语言。

4. 本地化模糊匹配设计：
   - 在 `update-l10n` 的精确锚点继承之后，增加“疑似改写”候选。
   - 第一版不要自动套用模糊译文，只输出候选给人工确认。

5. Language Server 设计：
   - 先写能力范围和协议草案，再决定是否创建 `src/Inscape.LanguageServer/`。

## 文档检索地图

为了减少 token 浪费，按任务读取对应文档：

```text
任务类型                           优先读取
项目快照 / 接手                    docs/agent-handoff.md, docs/todo.md, docs/roadmap.md
设计决策溯源                       docs/adr/README.md, 对应 ADR
DSL 语法                           docs/dsl-language.md, docs/syntax-comparison.md, docs/open-questions.md
DSL 生态定位 / 竞品对比             docs/dsl-ecosystem-positioning.md, docs/adr/0007-dsl-benchmark-positioning.md
代码结构 / 新模块                  docs/code-structure.md, src/Inscape.Core, src/Inscape.Cli
VSCode 工具                        docs/vscode-tooling.md, tools/vscode-inscape/README.md
HTML 预览                          src/Inscape.Cli/PreviewHtmlRenderer.cs, docs/vscode-tooling.md
本地化 / hash                      docs/hash-localization.md, docs/l10n-extraction.md
Unity / Bird                       docs/bird-adapter.md, docs/project-config.md, docs/unity-editor-importer.md, docs/bird-unity-research.md, docs/runtime-unity.md, docs/architecture.md, docs/todo.md
编辑器阶段                         docs/editor-design.md, docs/roadmap.md
```

不要每次都全量阅读所有文档。先读本指南和 TODO，再按任务进入 1 到 3 个目标文档。

## 工作方法

- 先看 `git status`，确认是否有未提交变更。
- 修改设计、语法、IR、本地化、存档或编辑器交互时，同步更新文档；长期决策新增 ADR。
- 保持 `Inscape.Core` 不依赖 Unity、VSCode、HTML 或第三方包。
- CLI 可以作为工具层封装 Core，但不要把核心语义只写在 CLI 里。
- VSCode 扩展里可以做轻量行扫描，但语法真相必须来自 Core/CLI。
- 修改后至少运行构建和测试；涉及 VSCode 时跑 Node 语法/JSON 检查。
- 每个阶段完成后提交并推送，保持远端可接续。

## 常用命令

在当前 Windows 环境中，Git 需要显式安全目录：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -12
```

验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check tools\vscode-inscape\extension.js
node -e "JSON.parse(require('fs').readFileSync('tools/vscode-inscape/package.json','utf8')); JSON.parse(require('fs').readFileSync('tools/vscode-inscape/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('tools/vscode-inscape/syntaxes/inscape.tmLanguage.json','utf8')); console.log('json ok')"
```

CLI 样例：

完整清单见 [CLI 命令速查](cli-command-reference.md)。终端内可用：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- help export-bird-project
```

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples -o config\bird-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-role-template samples --bird-existing-role-name-csv D:\UnityProjects\Bird\Assets\Resources_Runtime\Localization\L10N_RoleName.csv -o config\bird-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples -o artifacts\bird-export
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples --bird-binding-map config\bird-bindings.csv -o artifacts\bird-export
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
- Timeline/DirectorSystem 的初步边界已记录：第一版只引用 Timeline，不直接生成 Timeline；后续仍要设计 Hook 语法和 Presentation IR 边界。
- Bird 导出原型不生成 Unity `.asset`；它只是 Unity Editor Importer 的输入。
