# Agent 接手指南

状态：基线

最后更新：2026-04-29

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
- VSCode 原型：TextMate 高亮、snippets、诊断桥接、节点补全、Outline、跳转定义、引用查找、Hover、本地化导出/更新命令。
- Bird/Unity 初步调研：已梳理 `StorySystem`、`TalkingTM`、`L10N_Talking`、`DirectorSystem` 和 `TimelineEffectTM` 的边界，详见 [Bird / Unity 调研记录](bird-unity-research.md)。
- Bird Adapter 原型：`export-bird-project` 可生成 `bird-manifest.json`、`L10N_Talking.csv` 和 `inscape-bird-l10n-map.csv`，详见 [Bird Adapter 原型](bird-adapter.md)。

尚未落地：

- Unity/Bird Adapter。
- Unity Editor Importer。
- 角色、资源、Timeline 的宿主绑定配置。
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

## 下一步优先队列

建议优先做小而闭环的任务，不要直接跳到大规模重构。

1. Bird 宿主绑定设计：
   - `export-bird-project` 已有最小输出。
   - 下一步需要角色名到 `roleId`、资源别名到 Unity 资源、Timeline 名称到 `timelineId` 的绑定 Schema。
   - 还需要扫描现有 Bird 资源，避免生成的 `talkingId` 与已有 `TalkingSO` 冲突。

2. Timeline Hook 最小表达：
   - 只做 Timeline 引用和节点 Hook 草案。
   - 不把第一版 DSL 扩张为完整演出时间轴语言。

3. 本地化模糊匹配设计：
   - 在 `update-l10n` 的精确锚点继承之后，增加“疑似改写”候选。
   - 第一版不要自动套用模糊译文，只输出候选给人工确认。

4. Language Server 设计：
   - 先写能力范围和协议草案，再决定是否创建 `src/Inscape.LanguageServer/`。

## 文档检索地图

为了减少 token 浪费，按任务读取对应文档：

```text
任务类型                           优先读取
项目快照 / 接手                    docs/agent-handoff.md, docs/todo.md, docs/roadmap.md
设计决策溯源                       docs/adr/README.md, 对应 ADR
DSL 语法                           docs/dsl-language.md, docs/syntax-comparison.md, docs/open-questions.md
代码结构 / 新模块                  docs/code-structure.md, src/Inscape.Core, src/Inscape.Cli
VSCode 工具                        docs/vscode-tooling.md, tools/vscode-inscape/README.md
HTML 预览                          src/Inscape.Cli/PreviewHtmlRenderer.cs, docs/vscode-tooling.md
本地化 / hash                      docs/hash-localization.md, docs/l10n-extraction.md
Unity / Bird                       docs/bird-adapter.md, docs/bird-unity-research.md, docs/runtime-unity.md, docs/architecture.md, docs/todo.md
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

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- check-project samples
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project samples -o artifacts\samples-project.html
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\old-l10n.csv -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- export-bird-project samples -o artifacts\bird-export
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
