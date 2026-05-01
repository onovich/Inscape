# Agent 接手指南

状态：基线

最后更新：2026-05-01

本文用于让未来继续维护 Inscape 的 agent 快速恢复项目上下文。它不是替代完整文档，而是入口、索引和工作协议。

## 当前项目快照

Inscape 当前处于第一阶段：DSL 与轻工具链已经形成可运行原型，UnitySample 实验 adapter 已从 Core 迁出，用于保留早期 Unity 数据映射 spike，但不是最终 Host Bridge 方案。

### 2026-04-30 GitHub Copilot 接手巡检

- 已按本指南完成接手阅读：`docs/agent-handoff.md`、`docs/todo.md`、`docs/roadmap.md`、`docs/open-questions.md` 和 `docs/code-structure.md`。
- 仓库位于 `main...origin/main`，HEAD 为 `8087d5b feat: 明确 Timeline Hook phase 语义`。
- 当前存在接手前未提交变更：`samples/court-loop.inscape` 修改了一句证人对白并追加文件末尾空行；`tools/vscode-inscape/extension.js` 的 VSCode 交互按用户反馈改为接近 C# 的引用模型：block 标题显示 `N 个引用`，点击打开 References Peek，`-> target` Hover 只做类型说明，speaker 定义缺失时回退到对白引用位置。
- 接手验证通过：`dotnet build Inscape.slnx --no-restore`、`dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build`、`node --check tools\vscode-inscape\extension.js`。
- VSCode 角色名、block 引用计数和 `-> target` 简短 Hover 已按用户最新反馈对齐；Timeline / 资源别名定义跳转、Host Schema 脚本内跳转和变量名追溯仍未实现。
- 2026-05-01 继续修正 VSCode 角色名 Ctrl+Click 范围：不再尝试注册 `DocumentHighlightProvider`，改为在 `language-configuration.json` 的 `wordPattern` 中把全角冒号和常见中文标点作为词边界，使 `旁白：证物袋里只有一枚旧怀表。` 只把 `旁白` 识别为可跳转词。
- 2026-05-01 用户补充新的架构约束：Host Schema 查询可参考 `?hasItem("badge")->node`，但 Inscape 可读 ID 与项目内部 ID 必须通过 Host Bridge 映射；`item` 是抽象叙事概念，不等同业务 Item；下层状态只被上层查询或内部使用，不反向查询上层；Bird 只是 Unity 支持参考需求方，不应绑定 Core、通用 Unity 插件、Addressables 或 ScriptableObject；Timeline Hook 长期应泛化为宿主自定义事件示例；Unity 上层支持层应作为独立插件 / 适配包研究。
- 2026-05-01 已将原 Core 内的固定 Unity 项目适配 spike 迁出为 `src/Inscape.Adapters.UnitySample`，CLI 命令改为 `export-unity-sample-*` / `merge-unity-sample-l10n`。该项目明确标注为实验样例：它硬编码 `talkingId`、`roleId`、`L10N_Talking`、Timeline asset 和 manifest 字段，只用于验证导出 / L10N / hook / 绑定流程，不代表最终 Host Bridge 或通用 Unity Runtime Host。
- 2026-05-01 用户补充 Unity 支持层候选方向：在 Unity 项目的类、字段、方法上加 `[Inscape]` 一类 Attribute，由 Unity 内代码生成脚本扫描并生成待配置桥接表；人工再完成 C# 类名 / 字段名与 Inscape 可读名的映射。拿到数据后上层是直接绑定事件、轮询触发，还是混合模型仍待定，不应提前写死。
- 2026-05-01 已整理 VSCode 扩展发布工作流：扩展改动后不能只重启窗口，必须重新打包并覆盖安装；当前推荐入口是 `tools/vscode-inscape/` 下的 `npm run rebuild:vsix`，细则见 [VSCode 扩展发布工作流](vscode-release-workflow.md)。
- 2026-05-01 VSCode 可玩预览已经落地到 custom editor：默认通过 `Inscape: Open Preview` / `Inscape: Toggle Preview` 在源码右侧打开，预览不再劫持 `.inscape` 源码标签页或 Ctrl+Click 跳转。当前交互是单栏沉浸式阅读体验，支持点击选项推进、无选项时点击正文继续、Back、Restart、diagnostics、源码回跳，以及编辑防抖刷新和保存后立即刷新。
- 2026-05-01 预览链路的关键经验已确认：webview 必须显式启用 scripts；刷新时要保留当前 `{ current, path }` 状态，避免每次回到第一页；CLI 调用应优先复用已构建的 `Inscape.Cli.exe`，其次 `dotnet exec Inscape.Cli.dll`，最后再回退到 `dotnet run --project ...`，否则交互延迟会明显偏高。
- 2026-05-01 VSCode 脚本交互约定已进一步收敛：`@entry`、`@scene`、`@timeline` 等统一视作 `@metadata` 语法层，`[]` 视作宿主绑定 / 行内标签层；二者都应提供 Hover 与可理解的导航，但不要在 VSCode 侧重写 Core 语义。预览中的源码回跳与源码编辑器内的 Ctrl+Click 应保持隔离，不做自动双向同步。
- 2026-05-01 VSCode 双向定位又补了一层：预览里的 `源码` 按钮现在优先复用已打开的源码编辑器，否则新开源码页签；编辑器中的正文 / 选项文本 Ctrl+Click 会打开或刷新预览，并把预览切到包含该文本的节点页面。这个行为属于作者体验层，不改变 DSL 语义或 Core 输出。

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
- UnitySample Adapter 实验样例：`export-unity-sample-role-template`、`export-unity-sample-binding-template`、`export-unity-sample-project` 和 `merge-unity-sample-l10n` 保留早期固定数据结构导出验证。它位于独立项目 `src/Inscape.Adapters.UnitySample`，只引用 `Inscape.Core`，不得反向污染 Core。详见 [UnitySample Adapter 实验样例](unity-sample-adapter.md)。
- 项目配置：CLI 会自动读取项目根目录 `inscape.config.json`，也支持 `--config path`。当前配置为 UnitySample 样例命令提供默认值：`talkingIdStart`、`roleMap`、`bindingMap`、`existingRoleNameCsv`、`existingTimelineRoot`、`existingTalkingRoot`；命令行参数优先级更高。这仍不是最终 Host Bridge。详见 [项目配置草案](project-config.md)。
- 宿主 Schema 草案：新增 `hostSchema` 项目配置字段与 `export-host-schema-template` CLI 命令，用于生成 `inscape.host-schema` JSON 模板，先描述纯查询和宿主事件清单，不改变当前 DSL 解析或 UnitySample 导出行为。VSCode 已提供 `inscape.host.schema.json` / `*.host.schema.json` 的 JSON Schema 校验，以及 `Inscape: Show Host Schema Capabilities` 命令读取并浏览当前 query / event。详见 [宿主 Schema 草案](host-schema.md)。
- Bird 角色绑定审查：`export-bird-role-template` 支持 `--report`，输出 `unique`、`ambiguous`、`missing`、`unscanned` 状态。2026-04-30 用 Bird 当前 `L10N_RoleName.csv` 试跑，当前样例中 `旁白` 为 `ambiguous`，候选 `1050|10001`；`成步堂` 和 `证人` 为 `missing`。因此当前导出的 `bird-roles.csv` 仍全部为空，需要人工补齐或更换测试文本中的角色名。
- Bird L10N 合并预览：`merge-bird-l10n <generated-L10N_Talking.csv> --from <existing-L10N_Talking.csv> --report report.csv -o merged.csv` 已实现。规则是保留 Bird 未涉及行、新增 Inscape 行、源文本未变时保留译文、源文本变化时清空目标语言列并把旧值写入 report。2026-04-29 已用 Bird 当前 `L10N_Talking.csv` 试跑，原表 270 行、合并预览 275 行、报告只包含 5 个 `added` 行，未改动 Bird 正式表。
- Unity Editor Importer 原型：`tools/unity-bird-importer/Editor/InscapeBirdManifestImporter.cs` 可复制到 Bird 项目 `Assets/Editor/`，读取 manifest 并创建 / 更新 `TalkingSO`，将 `phase=talking.exit` 的 Timeline Hook 映射为 `TalkingEffectTM.PlayTimeline`，其他 phase 只报告 unsupported warning 并跳过；已提供 `Dry Run Import Manifest...` 菜单、`DryRunImportManifestFromCommandLine` 和 `ImportManifestFromCommandLine` batchmode 入口。Dry Run 输出创建 / 更新 / 缺失引用计划，报告既有 `TalkingTM` 的字段级变化，并在 manifest 同目录写入带 Inscape 节点、锚点和源位置的 `bird-import-dry-run-report.txt`。真实 Import 可加 `-inscapeApplyAddressables` 显式调用 Bird 现有 `TalkingSO.ApplyAA()`，将资源加入 `TM_Talking` group / label。详见 [Unity Editor Importer 草案](unity-editor-importer.md)。
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
- 用户当前明显不喜欢缩进承载核心语义；`# 标题` + 空行分块已进入候选，但还没有替代现有 `:: node.name`。

## 下一步优先队列

建议优先做小而闭环的任务，不要直接跳到大规模重构。

1. Host Bridge 草案与 UnitySample 生成化：
   - `Inscape.Adapters.UnitySample` 只是实验样例，当前硬编码宿主数据结构不能作为最终方案。
   - 下一步应设计 Host Bridge 配置，把 Inscape 可读 ID 映射到项目内部 ID、资源、事件处理器和查询实现。
   - Unity 支持层候选方向是用 `[Inscape]` Attribute 扫描项目 C# 类型和成员，由 Unity 内代码生成脚本生成待配置桥接表，再人工确认 C# 成员与 Inscape 可读名的映射。
   - 上层拿到 Inscape 事件 / 数据后的消费方式仍待定：可以直接绑定事件，也可以轮询叙事状态，或允许项目选择混合模型。
   - 适配层长期应由 Host Schema / Host Bridge / 代码生成驱动，UnitySample 可保留为 generator 回归样例。
   - 当前样例命令包括 `export-unity-sample-project`、`export-unity-sample-role-template`、`export-unity-sample-binding-template` 和 `merge-unity-sample-l10n`。
   - Timeline Hook 已支持 metadata：`@timeline alias` / `[timeline: alias]` 默认 `talking.exit`，也支持 `@timeline.talking.enter alias`、`@timeline.talking.exit alias`、`@timeline.node.enter alias`、`@timeline.node.exit alias` 和对应 bracket 写法，导出为 manifest `hostHooks`。
   - 后续适配重点：把当前固定 CSV / manifest / L10N 输出抽象为可配置、可生成的桥接流程。

2. VSCode 预览增量体验：
   - 预览主流程已经可用，但还可以继续逼近 Markdown / Inky 的“边改边玩”感受。
   - 增量方向包括：更细粒度的未保存内容热刷新、更明确的刷新中 / 诊断中状态提示，以及是否提供可选的预览 / 源码同步模式。
   - 继续保持原则：预览复用 Core / CLI 结果，不在扩展里重写 parser 或运行时语义。

3. 第一版块语法收敛：
   - 当前原型使用 `:: node.name`。
   - 用户偏好更接近 `# 标题` 的写作式块语法，并且不喜欢缩进语义。
   - 需要明确“给人看的标题”和“给机器跳转的标识”是否解耦。

4. Timeline Hook 真实导入验证：
   - Core / manifest 已能表达 `talking.enter`、`talking.exit`、`node.enter`、`node.exit`。
   - 当前 Bird 运行时只安全支持 `talking.exit -> TalkingEffectTM.PlayTimeline`；Unity Importer 对其他 phase 输出 unsupported warning 并跳过。
   - 下一步应使用带真实 Timeline 绑定的样例在 Bird 项目中跑 Dry Run / Import，确认 `talking.exit` 的 effects 字段和 warning 文本。

5. 本地化模糊匹配设计：
   - 在 `update-l10n` 的精确锚点继承之后，增加“疑似改写”候选。
   - 第一版不要自动套用模糊译文，只输出候选给人工确认。

6. 宿主 Schema 接入脚本体验：
   - `export-host-schema-template` 已能生成查询 / 事件清单模板。
   - VSCode 已能校验 host schema JSON，并通过命令面板浏览当前 query / event。
   - 下一步可以等条件 / 事件语法更明确后，把 query / event 接入 `.inscape` 脚本内补全 / Hover。

7. Language Server 设计：
   - 先写能力范围和协议草案，再决定是否创建 `src/Inscape.LanguageServer/`。

## 文档检索地图

为了减少 token 浪费，按任务读取对应文档：

```text
任务类型                           优先读取
项目快照 / 接手                    docs/agent-handoff.md, docs/todo.md, docs/roadmap.md
设计决策溯源                       docs/adr/README.md, 对应 ADR
DSL 语法                           docs/dsl-syntax-guide.md, docs/dsl-language.md, docs/syntax-comparison.md, docs/open-questions.md
DSL 生态定位 / 竞品对比             docs/dsl-ecosystem-positioning.md, docs/adr/0007-dsl-benchmark-positioning.md
代码结构 / 新模块                  docs/code-structure.md, src/Inscape.Core, src/Inscape.Cli
VSCode 工具                        docs/vscode-tooling.md, tools/vscode-inscape/README.md
HTML 预览                          src/Inscape.Cli/PreviewHtmlRenderer.cs, docs/vscode-tooling.md
本地化 / hash                      docs/hash-localization.md, docs/l10n-extraction.md
宿主 Schema / 查询事件             docs/host-schema.md, docs/dsl-language.md, docs/open-questions.md, docs/todo.md
Unity / Host Bridge                docs/unity-sample-adapter.md, docs/project-config.md, docs/runtime-unity.md, docs/architecture.md, docs/todo.md
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
- 若改动发生在 `tools/vscode-inscape/`，默认把“打包 + 安装 + reload”纳入验证流程，而不要把源码修改误认为发布完成。

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
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- help export-unity-sample-project
```

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-role-template samples -o config\unity-sample-roles.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-binding-template samples -o config\unity-sample-bindings.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-project samples -o artifacts\unity-sample-export
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-unity-sample-project samples --unity-sample-binding-map config\unity-sample-bindings.csv -o artifacts\unity-sample-export
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
