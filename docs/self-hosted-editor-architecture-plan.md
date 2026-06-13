# 自研编辑器架构方案

状态：草案 + 第一版壳

最后更新：2026-05-24

本文记录 Inscape 自研编辑器的第一版架构定位。它基于当前路线图中的“阶段 2：Tauri 编辑器 Alpha”，并把现有 `Internal / ExternalSupport`、`Layer / Business / Role / File`、命名后缀和目录边界纳入同一套计划。

## 定位

自研编辑器是 Inscape 的第一方作者工作台，但它不进入 `Internal`。

它的默认工作对象也不应是“当前单个脚本文件”，而应是“当前项目工作区”。同一目录或项目清单内的多个 `.inscape` 文件必须共享同一份 workspace 上下文、导航图、诊断图和运行图；跨文件定义、引用、跳转、补全与重命名都应被视为第一优先级能力，而不是等单文件版完成后的附加功能。

长期目录位置：

```text
src/
  ExternalSupport/
    SelfHostedEditor/
```

原因是编辑器客户端会绑定具体桌面壳、前端框架、窗口生命周期、菜单、快捷键、文件对话框、打包与自动更新机制。它是第一方产品形态，但仍是一个宿主客户端。`Internal` 继续承载 Inscape 语义、工具流程、语言服务和运行期契约。

自研编辑器不复用 VSCode 的包结构，也不依赖 `src/ExternalSupport/VSCode` 内部实现。VSCode 与自研编辑器是两个并列宿主：

```text
ExternalSupport/
  VSCode/
  SelfHostedEditor/
  UnityPlugin/
```

## 目标边界

第一版目标不是完整可视化编辑器，而是“能真实工作”的独立 Player + Authoring Shell：

- 打开项目目录或 `.inscape` 文件。
- 通过 `LanguageServer` 获取诊断、补全、大纲、跳转、Hover 和 Host Schema 能力。
- 通过 `Tooling` 获取项目扫描、预览模型、本地化审查报告、HostBinding / HostSchema 共享流程。
- 通过 `Runtime` 运行 Narrative Graph IR，显示当前节点、文本、选项、路径和运行状态。
- 支持本地化 CSV 查看、语言切换、alignment review 展示和源位置跳转。
- 支持统一定位协议：脚本、预览、节点图、CSV 行都能跳回源位置。
- 默认支持类似主流 Markdown 编辑器和 VSCode 预览的双栏布局：左栏为脚本编辑器，右栏为运行 / 效果预览，并支持源文本与预览之间的双向定位。
- 双栏可以随时切换为单栏：仅编写、仅预览、编写 + 预览三种布局模式都应是同一工作台状态的不同呈现，而不是三套互相分裂的页面。
- 书写和阅读体验对标 Notion：正文阅读优先、低干扰、结构清晰，辅助信息安静地贴近文本而不打断写作节奏。
- 编辑体验需要对齐 VSCode 当前能力：跳转定义、引用查找、补全、Hover、错误提示、语义级重命名和诊断定位都应来自同一套 LanguageServer / Tooling 契约。
- 多文件项目是默认前提：工作台应像 C# 项目一样把项目目录视为同一上下文，而不是把每个脚本当作彼此隔离的小世界。

不做的事：

- 不在前端重新实现 DSL parser。
- 不把 Compiler 语义复制到 TypeScript / JavaScript。
- 不直接依赖 VSCode 的 controller、provider 或 QuickPick adapter。
- 不在第一版做完整图编辑器或复杂演出系统。
- 不把节点图永久定义为只读。第一版可以从只读预览起步，但架构必须允许后续节点图成为可编辑视图。
- 不让 Unity / Bird 适配逻辑进入自研编辑器核心。

## 架构分层

```text
SelfHostedEditor
  桌面壳 / Web UI / Monaco / 文件对话框 / 菜单 / 打包
        |
        v
LanguageServer
  高频编辑语义：diagnostics / completion / definition / references / hover / symbols
        |
        v
Compiler
  DSL 与 StoryGraph 语义真相

SelfHostedEditor
        |
        v
Tooling
  项目扫描 / ToolConfig / Preview / Localization / HostSchema / HostBinding

SelfHostedEditor
        |
        v
Runtime
  NarrativeRuntime / 状态 / 输入 / 本地化 / HostBridge 契约
```

### Internal 侧职责

`Compiler`：

- 继续作为 DSL、StoryGraph、Localization、Diagnostics、TextContracts 的语义真相。
- 不依赖自研编辑器、VSCode、Tauri、HTML、Unity 或第三方 UI 包。

`Tooling`：

- 提供共享用例。第一批需要优先对齐自研编辑器的是 `Preview`、`Localization`、`DslScriptSources`、`ToolConfig`、`HostSchema`、`HostBinding`。
- 当前已经下沉的 `LocalizationReviewPresenterModelBuilderDomain` 是正确方向：自研编辑器应消费 presenter model，而不是复刻 VSCode QuickPick 组织逻辑。

`LanguageServer`：

- 成为自研编辑器和 VSCode 的共同编辑语义会话。
- VSCode 已经使用常驻 stdio 会话；自研编辑器第一版也应优先复用这一路线。
- 只有当需要标准 LSP client、跨进程缓存或多宿主增量查询时，再评估是否从现有 stdio protocol 演进为更标准的 LSP transport。

`Runtime`：

- 从当前 `NarrativeRuntime` 最小 IR 消费生命周期继续扩展。
- 自研编辑器的 Player 模式直接消费 Runtime，而不是用 HTML Preview 当运行时。
- Runtime 不解析 `.inscape` 源文本，只消费 Compiler / Tooling 产物。
- 当前已新增 `runtime-project` CLI 前置契约：项目编译后由 `NarrativeRuntime` 启动 entry，并输出 `inscape.runtime-state` JSON；也可以通过 `--state` 恢复上一帧状态后执行 `--continue`、`--advance-flow`、`--rewind`、`--rewind-flow` 或 `--choose group option`，供后续 SelfHostedEditor Player 桥接入。
- Runtime 快照现已包含节点内阅读进度：`state.visibleStepCount` 保存当前节点已露出的步骤数，`readingProgress` 暴露内容步数、最大步数、是否还能前进/回退，以及 choice/continue 阶段是否已经出现。这个语义属于共享 Runtime，不属于 SelfHostedEditor 前端。

### ExternalSupport 侧职责

`SelfHostedEditor`：

- 负责桌面壳、Web 前端、Monaco 集成、窗口状态、文件系统权限、用户设置、主题、菜单和打包。
- 负责把 Internal 提供的模型映射成 UI：脚本编辑视图、预览视图、本地化编辑视图、节点图视图、诊断面板、状态监视器。
- 工作台布局需要支持双栏与单栏切换：`write-preview`、`write-only`、`preview-only` 是同一 workspace session 的布局状态；切换布局不能丢失光标、选择、预览位置或当前运行状态。
- 编辑器视觉分为文本层和提示层。文本层承载正文、角色、选项等主要阅读内容；提示层承载节点身份、锚点、line id、跳转目标、状态、候选提示和辅助诊断，默认使用更小字号、更低对比度的淡灰视觉，只在 hover / focus / selection 或可交互状态下增强。
- 写作与阅读体验对标 Notion：正文排版应克制、留白稳定、段落层次清楚；辅助控件和元信息默认退到背景，只有当用户聚焦、悬停或执行操作时才显现更强 affordance。
- 只保留宿主适配逻辑和 UI 交互逻辑。任何可被 VSCode 或未来 Web editor 复用的 report model、view-model、query contract，应优先下沉到 `Tooling` 或 `LanguageServer`。

### Backend / session 边界

当前 `DevScripts` 预览服务器仍是开发宿主，而不是正式 editor backend。它可以提供静态资源、JSON API transport、真实 CLI / LanguageServer / Runtime smoke，以及 bounded runtime / line-map / localization baseline cache；这些 cache 不应被解释为长期 project session。

未来产品化 backend 应按业务窄接口暴露能力，而不是把当前 `/api/*` 机械升级成通用 RPC。三类状态必须分开：

- Editor UI state：active view、layout、hover、filter、overlay、scroll 等，由前端持有。
- Dev-host transport cache：当前 bounded runtime / line-map / localization baseline cache，只服务本地开发和 smoke。
- Backend project session：workspace、document buffers、LanguageServer 会话、Runtime session、line-map sidecar、localization baseline 文件身份和写回状态。

具体 endpoint 迁移表和 session 要求见 [SelfHostedEditor backend migration map](self-hosted-editor-backend-migration-map.md)，长期决策见 [ADR 0018](adr/0018-self-hosted-editor-backend-session-boundary.md)。

`VSCode`：

- 继续作为专业编辑入口和回归验证入口。
- 不因自研编辑器启动而废弃。短期内 VSCode 仍是语言功能和作者体验最快的验证场。

`UnityPlugin`：

- 继续作为 Unity / Bird 外部支持边界。
- 自研编辑器可以读取 Unity / Bird 导出报告和 HostBinding 表，但不直接承载 UnityEngine / UnityEditor 依赖。

## 建议目录

第一版只在准备实现时创建真实目录，不提前创建空目录。目标结构如下：

```text
src/ExternalSupport/SelfHostedEditor/
  README.md
  package.json
  DevScripts/
  Resources/
    Icons/
    Themes/
  Scripts/
    Entries/
      SelfHostedEditorAppEntry.*
    ProjectWorkspace/
      Controllers/
      Models/
    LanguageServer/
      Bridges/
      Models/
    EditorAuthoring/
      Controllers/
      ViewModels/
    WorkspaceLayout/
      Controllers/
      ViewModels/
    Preview/
      Controllers/
      ViewModels/
    Localization/
      Controllers/
      ViewModels/
    StoryGraph/
      Controllers/
      ViewModels/
    Runtime/
      Controllers/
      ViewModels/
    HostSchema/
      Controllers/
      ViewModels/
    HostBinding/
      Controllers/
      ViewModels/
```

命名沿用现有规范：

- `Entry`：桌面 / 前端入口。
- `Controller`：宿主交互编排。
- `Bridge`：跨进程、跨语言或宿主 API 适配。
- `ViewModel` / `Model`：UI 数据模型。
- 避免 `Manager`、`Helper`、`Utils`、`Support`。
- `Resources / Scripts` 只在 `SelfHostedEditor` 这个可独立交付模块根内使用。
- 开发脚本放 `DevScripts`，避免再次混淆 `Scripts` 的源码语义。

如果采用 Tauri，Rust 壳工程可以位于该模块内部的宿主专属目录，但不应把 Inscape 业务语义写入 Rust 壳层。Rust 只负责窗口、文件、进程与系统集成；业务查询仍走 Internal 契约。

## 第一版功能切片

### G-SE-0：文档与决策收口

- 接受 ADR 0017。
- 将本文纳入 `editor-design.md` 和 `todo.md`。
- 明确第一版技术壳：优先 Tauri + Web UI + Monaco；若实际调研发现 Windows 打包或 .NET 进程管理代价过高，再写 ADR 调整。
- 明确跨平台基线：第一优先级支持 Windows 与 macOS；iOS / Android 作为低优先级远期可能性，当前只保留架构余量。

### G-SE-1：Workbench Shell

- 已创建最小 `SelfHostedEditor` 模块。
- 已建立依赖为空的静态工作台壳：Notion-like 写作表面、左栏编辑 / 右栏预览、`write-preview` / `write-only` / `preview-only` 布局切换、提示层弱化显示、本地化视图和节点图视图占位。
- 已将左栏脚本区替换为第一版 Monaco 编辑表面，保留现有预览 / 本地化 / 节点图 / 诊断数据流，先完成“真编辑器表面”替换，再继续接 `LanguageServer`。
- 已新增浏览器文件选择入口，可导入单个 `.inscape` 脚本并刷新编辑区与预览。该入口只是第一版壳的浏览器桥；未来桌面客户端应替换为项目工作区桥。
- 已新增临时 UI-only 脚本模型，让预览、本地化草表和节点图预览消费同一份前端模型；后续需要替换为 `Tooling` / `LanguageServer` / `Runtime` 输出。
- 已把 Preview 正常开发宿主路径的内容来源切到 Compiler project graph：阅读行、元数据、choice prompt、choice option 和 default jump 的 continue 入口来自 `/api/story-graph`，前端 `ScriptDocumentModelBuilder` 只保留为 Compiler bridge 不可用时的离线 fallback。若已返回 `compiler-project` graph 但 `previewLines` 缺失、数量不匹配或 source line 无效，Preview 必须显示 compiler graph contract error，不能用草模正文回退掩盖数据丢失。
- 已新增临时 UI-only 诊断面板，覆盖重复节点、缺失跳转目标和空选项文本，并支持跳回源行；后续需要替换为 `LanguageServer` diagnostics。
- 已接入第一条开发宿主诊断桥：SelfHostedEditor 现在会通过本地预览服务器把当前脚本文本发给 `Inscape.LanguageServer --diagnose-file`，并在失败时回退到 UI-only 草稿诊断；这条桥只是一期开发宿主通道，后续应收敛为正式桌面宿主 / 会话桥。
- 已把诊断贴回 Monaco 编辑表面：当前诊断除了保留底部可点击列表外，也会同步渲染为编辑区内的 Monaco markers，让“错误在哪里”直接出现在写作位置。
- 已把状态栏接到诊断导航：当前底部状态栏会显示当前行、诊断来源和诊断数量，并支持 previous / next problem 导航。
- 已新增安静 loading 状态：默认样例、Monaco、line-map、Compiler graph Preview / Graph、Runtime、diagnostics、outline、本地化和 workspace summary 刷新时都会显示与当前纸面 UI 一致的低干扰加载反馈。
- 已把底部诊断区收成 Problems 面板雏形：当前支持 severity 筛选、每类问题计数和 active-line 高亮，让诊断区更接近真正客户端工作台。
- 已把侧栏 session 信息做成轻量状态面板：当前会显示 file、dirty state、source state、active view、layout mode 和 diagnostics backend，让工作台更像持续可感知的客户端会话。
- 已推进第一轮沉浸式写作表面收口：当前工作台视觉已从偏表单式工具壳收向更安静的 paper-like 写作表面，编辑区、预览区和控制区的留白、字重、层级与交互边框都更强调连续写作体验。
- 已开始第二轮主界面硬重置：主编辑 / 预览双栏正在向 “Inky 的双栏骨架 + Notion 的正文优先层级” 收敛，默认收掉厚重卡片感和常驻标签墙，把 session / outline / diagnostics 等辅助层压回边缘位置，并让说话人名称、选项文本与阅读版心重新成为预览主角。
- 已继续推进 hover-first 的辅助层策略：当前侧栏 session 信息、outline 元信息、预览底部 meta 和 diagnostics 面板都在默认态进一步弱化，只有 hover / focus / active 状态才增强，以减少“表单系统”式常驻解释噪音。
- 已继续推进第三轮纸面收口：当前双栏的版心、留白、分隔和状态层正在继续收敛为更统一的“写作纸面”，侧栏 / 顶栏 / 状态栏进一步退场，右栏标题 / 正文 / choice 的排版关系也继续从“预览面板”往“阅读页”移动。
- 已继续推进侧栏“默认隐身、hover 显形”的目录策略：当前文件名、outline 标题、outline 次信息与侧栏元状态都进一步弱化为 hover-first，避免左侧继续呈现控制台感，并让默认第一眼更集中在双栏正文主舞台。
- 已继续推进“目录化而非按钮化”的边缘层：当前左栏视图切换、文件打开入口与顶栏布局切换都在持续去按钮组气质，目标是把外围控制做成更像安静目录或模式切片，而不是持续提醒用户自己在操作一个复杂应用。
- 已继续推进“顶栏 / 底栏近乎隐身”的边缘策略：当前顶部模式切换、来源提示、底部摘要与问题导航都在进一步降低常态存在感，只在 hover 时增强，避免边缘控制持续切断正文和预览的阅读流。
- 已明确记录当前编辑视图的交互缺陷与目标行为：词级重灰选区应继续减弱；行号改为 hover / active 才显示块内局部数字；标题不显示行号，也不在默认写作表面显示 stable node id；引用候选长期要改成浮层而不是撑开正文；标题 / 正文 / 旁白 / prompt / 选项要形成稳定层级；标题 block 需要 Notion 风格的 hover add / drag affordance。
- 已接入第一条开发宿主 hover 桥：Monaco 编辑区的节点标题与 jump target 现在会通过本地预览服务器调用 `Inscape.LanguageServer --hover-file`；当前只覆盖最值钱的 node / jump 语义悬停，后续再扩范围。
- 已接入第一条开发宿主 definition / references 桥：Monaco 编辑区的节点标题与 jump target 现在会通过本地预览服务器调用 `Inscape.LanguageServer --definition-file` 和 `--references-file`，先在单文件范围内提供 Ctrl/Cmd+Click 与引用查询基础能力。
- 已接入第一条开发宿主 completion 桥：Monaco 编辑区在书写 `-> target` 时会通过本地预览服务器调用 `Inscape.LanguageServer --completion-file` 获取节点名补全；当前先聚焦最有价值的 jump target 场景。
- 已接入第一条开发宿主 outline 桥：侧栏 outline 现在会通过本地预览服务器调用 `Inscape.LanguageServer --document-symbols-file` 获取节点结构，并支持点击跳回源行。
- 已接入第一条开发宿主 story graph 桥：Graph 视图现在会通过本地预览服务器调用现有 CLI `compile-project`，消费紧凑化后的项目 IR 节点与边；choice / default jump 的输出端口来自 Compiler 真实边，拖拽输出端口到输入端仍通过受控文本 patch 回写 `-> target`。
- 已接入第一条 Monaco 语义级重命名雏形：编辑区里的节点标题与 jump target 现在支持 rename provider，并通过受控整文 patch 回写 `# 标题` 与匹配的 `-> 标题` 引用，用于验证“语义改名回写文本真相”的长期边界。
- 已新增节点图受控重命名雏形：节点图触发 rename 后会 patch 文本源中的 `# 标题` 与匹配的 `-> 标题` 引用，用于验证“图编辑回写文本源”的长期边界。
- 已新增本地化会话草稿：本地化视图支持在当前会话内填写译文草稿，并用 `empty` / `draft` 状态区分；当前既可下载浏览器 draft CSV，也可选择真实旧 CSV，经开发宿主 `/api/localization-update` 复用 CLI `update-l10n-project` 导出真实 updated CSV。开发宿主会按 `sessionId` 记住本次选择的 previous CSV，后续 review / update 可复用这份旧表而不反复上传整份 CSV；这份会话 baseline 现在受 dev-host session cache 的 2 小时 idle TTL 和 64 条容量上限保护，并可通过 `/api/session-cache-status` 观察大小与淘汰计数。若浏览器支持 native file handle，打开旧 CSV 后还可把 updated CSV 直接写回原文件；前端只传 session、必要时传 `previousCsv`、以及 anchor-based translation overrides，不自己拼真实 CSV 语义，也不自己重造文件写回语义。
- 已新增宿主侧本地化 review 筛选：`LocalizationEditorController` 会直接消费 shared `presenter.items` 与 draft store，在浏览器里按 `all / actionable / draft / empty / kept / new / changed / conflict / stale / removed` 切换可见行，并显示 `Showing X of Y rows` 摘要；这层只负责可见性，不改 Tooling review 语义。
- 已新增宿主侧 CSV 会话状态与当前筛选范围的一键清草稿：本地化工具栏现在会显示 session override 数、当前 filter 下可见 draft 数，以及 updated CSV 当前为什么不可导出；`Clear visible drafts` 只清宿主侧当前可见的 draft overrides，不改 Tooling presenter 与 shared CSV 语义。
- 已新增 Stable Node Map 显式审查入口：顶栏 `Node Map` 会通过开发宿主 `/api/node-map-review` 运行共享 CLI `update-node-map-project --report`，展示 shared report 的 `new / renamed / manual-review / conflict / missing` 摘要与审查项，支持 source jump，并允许下载生成的 `inscape.node-map.json`。浏览器端不复制 VSCode 的 candidate apply / revert sidecar mutation；candidate apply 语义现已收成 Tooling / CLI 共享契约，后续 SelfHostedEditor 若需要应用候选，应调用共享动作。
- 已新增工作区摘要状态：顶部状态栏显示节点数、本地化行数、译文草稿数和诊断数；后续可替换为真实项目工作区 / LanguageServer / Tooling 汇总。
- 下一步打开真实项目目录。
- 下一步调用 `Tooling` / `Cli` 或 `LanguageServer` 获取项目 IR。
- 下一步用 `Runtime` 显示当前节点、文本、选项、Back / Restart / 路径记录。
- 下一步显示诊断列表和源码位置。

### G-SE-2：LanguageServer 会话接入

- 复用现有常驻 stdio 会话协议。
- 已完成 Monaco 基础编辑表面接入；下一步是把 diagnostics、completion、definition、references、hover、document symbols 接到同一会话上。
- 补齐 VSCode 已有体验的自研编辑器等价能力：错误下划线 / Problems 列表、跳转定义、查找引用、Hover、补全和语义级重命名。
- 当前已有 UI-only 诊断面板作为交互占位；接入 LanguageServer 后应保留同一点击定位体验。
- 统一 `EditorLocationModel` 到前端定位模型。

### G-SE-3：三视图骨架

- 脚本编辑视图：Monaco 主编辑区，默认左栏编辑、右栏预览；可切换为仅编写或仅预览。
- 预览视图：运行 / 效果预览，支持从预览定位回脚本源。
- 本地化编辑视图：当前已有从脚本临时提取的草表、会话内译文草稿、真实旧 CSV 选择、dev-host previous CSV session baseline、alignment review presenter 渲染、宿主侧 review 筛选、CSV 会话状态、浏览器 draft CSV 导出、通过共享 CLI 流程导出的真实 updated CSV，以及在 native file handle 可用时把 updated CSV 直接写回已链接旧文件；当前 linked baseline 还会明确显示 `clean / unsaved` 宿主状态。后续继续补审校动作。
- 节点图视图：当前已有从脚本临时提取的结构预览和受控标题重命名雏形；后续模型和交互契约要为“既能编辑也是预览”保留空间。
- 编辑区提示层：节点名、line id、anchor、候选翻译、跳转目标等辅助信息默认弱化显示，只在 hover / focus / selection 或可交互状态下高亮。

节点图视图的长期交互应明确参考 Yarn Spinner Graph View：

- 图默认消费整个 workspace 的节点与边，而不是仅当前单文件。
- 节点卡片允许拖拽改变画布中的视觉位置；该位置应写入 sidecar 或项目级 graph-layout 元数据，而不是污染核心语义。
- 边允许直接改连，用来编辑 jump / option target；但修改必须通过 command / patch 回写文本真相，而不是只改图缓存。
- 图视图与文本视图之间保持双向定位：图到文、文到图都应是一等操作。
- 图视图可以自由，但不能演变成第二份漂移的脚本来源。

### G-SE-4：本地化审查闭环

- 消费 `LocalizationAlignmentReportModel.Presenter`。
- 在独立编辑器里展示 `kept / new / changed / removed / conflict / stale`。
- 支持候选详情、line identity 摘要、候选源跳转。
- 暂不自动应用候选译文；需要应用功能时，先设计“草稿 CSV 写回”契约。

### G-SE-5：运行状态与时间回放前置

- Runtime 暴露当前节点、当前 line / anchor、历史路径、选择记录、语言和变量快照。
- 编辑器只观察和可视化，不在第一版允许随意改写运行状态。
- 随机数、异步资源和 HostBridge 副作用先作为待确认问题记录。

## 与现有计划的关系

自研编辑器不是替代当前主线，而是把现有主线组织成更明确的产品闭环：

- Stable Node ID 与 line sidecar：为节点图、CSV 视图、定位和本地化审查提供身份基础。
- Localization alignment：成为 CSV 视图和审查面板的第一批生产能力。
- VSCode 重构守规：继续作为宿主适配层拆分样板，避免自研编辑器复制同样的 command / UI 过厚问题。
- Tooling 单点收敛：自研编辑器会放大跨宿主复用需求，因此凡是 VSCode 与 SelfHostedEditor 都需要的 view-model / report contract，应优先下沉。
- Runtime：从“存在最小生命周期”推进为自研 Player 的真实执行基础。

## 最新补充

- 2026-05-24 接手重点：当前 SelfHostedEditor 主线已从纯 UI 原型推进到“逐步接真实 Internal 契约”。下一位 Agent 应优先保持这条方向：任何编辑语义、line identity、本地化审查、运行状态都应来自 `LanguageServer` / `Tooling` / `Runtime`，不要把 `ScriptDocumentModelBuilder` 扩写成事实 parser。
- 默认样例已改为本地 preview server 读取真实文件 `samples/court-loop.inscape`；入口脚本不再保留任何硬编码脚本文本 fallback。用户可通过打开其他 workspace 替换默认样例，真实文件不可读时工作台应显示加载失败。
- Graph 连线当前已改为真实端口锚点：渲染节点后读取 DOM 输出端口和输入端口中心绘制 SVG 曲线；输出端口拖到输入端口会 retarget 对应 `choice / jump`，拖到非输入端口会通过受控文本 patch 断开连接。SVG 连线层已固定在画布和节点卡片之间，输入端口命中也包含吸附热区，避免视觉边被遮挡或手动连线释放后消失。后续重点转为 graph layout sidecar、画布缩放/平移、端口状态反馈和连接合法性，而不是继续修估算坐标。
- Graph 面板会在切换可见或 resize 后重新计算端口位置并刷新 SVG path，避免隐藏视图初次渲染时读不到真实 DOM 尺寸而呈现为“有节点无连线”。
- Graph 视图已从固定宽板推进到可平移 / 缩放视口：空白处拖拽移动画布，滚轮按指针位置缩放，左上角有 zoom in / out / reset 控制。节点拖拽和连线绘制使用 graph-space 坐标，避免缩放后编辑行为错位。Graph 激活时工作台布局会切为紧凑单面板，让画布吃满主体可用空间，而不是继承 Script 双栏页面的宽留白。
- Graph 回环降噪已采用视图层 reference projection：当边的目标节点在布局顺序上不晚于 source，或该边加入显示图后会闭合成环时，显示层在 source 右侧局部 return lane 生成 reference-only 节点承接该边，而不是把回环线拉回真实目标或统一拉到整图最右侧。reference 节点是快捷方式 / 引用，不是 Compiler 节点副本；它只接受输入、没有输出、不可重命名，点击仍定位真实目标，手动连到 reference 时仍回写真实目标标题；hover 到 reference 时会轻微标出 source 与真实 target。
- Script / Preview 对 `@` 元数据和 `[]` 查询插值已有第一版作者体验样式：`@...` 在编辑器中弱化，在预览中转为不显示 `@` 的淡蓝灰 tag；`[query]` 以低对比 inline token 区分。中文标点不应触发 Monaco 的 ambiguous character 提示。
- Preview 当前按活动源码行所属 block 渲染，definition navigation / source focus 可以切换预览 block；编辑器滚动与预览滚动保持独立，不再通过外层 workbench 共享滚动。Script 视图 Ctrl/Cmd + Click 会显式走 source selection 管线，让编辑器光标和 Preview block 同步跳到 definition 位置，避免只更新 Preview。
- Preview 阅读表面不显示总行数 meta；行数、诊断来源等 session/debug 信息应归入 workspace 状态区或诊断区，而不是混进正文阅读面。
- Preview 阅读模式新增 Static / Flow 切换：Static 一次性展示当前 block；Flow 从标题开始，点击预览区逐行放出正文，新出现的 speaker 快速淡入，正文使用打字机效果；正文结束后一次性展示全部选项，并把选项文本与目标标题一起呈现。`@` 标签不消耗 Flow 点击：开头标签随标题出现，正文后的标签随该句完成后出现。Flow 的滚轮导航只在 `.story-preview` 自身已经滚到顶部或底部时接管：向上滚轮按阈值撤回上一步，向下滚轮按阈值快进一步；选项可见时向下快进无效。当前内容模型已开始消费 Compiler project graph，Runtime 侧已有 `runtime-project` snapshot 契约；但阅读进度、当前节点推进和选项选择仍是前端 presenter 状态，后续 Runtime Player 接入时应映射到运行时状态。
- SelfHostedEditor 已新增 Runtime 开发宿主桥：`/api/runtime-state` 调用 `runtime-project` 并把 started snapshot 显示到 session 状态；`/api/runtime-action` 可以把 restored state 的 `continue` / `choose` 动作转发给同一个 CLI 契约。Runtime snapshot 会话记忆现在受 dev-host session cache 的 2 小时 idle TTL 和 64 条容量上限保护，并通过 `/api/session-cache-status` 暴露非内容状态。它证明 UI 可以消费 Runtime 输出，但 Preview 还没有改为 Runtime Player 状态，桌面端也还不是长生命周期 Player 会话。
- Runtime 最小生命周期现已继续补到 `rewind`：共享层会依据 `state.path` 回退一个已访问节点，开发宿主与 SelfHostedEditor 只负责透传这个动作并显示轻量 path / Back 控件，不在浏览器里另建一份节点历史真相。
- 2026-06-02 当前状态：SelfHostedEditor L10N 视图已补上“真实旧 CSV 选择 + 真实 updated CSV 导出 / 直接替换”，并继续把 linked baseline 的宿主状态说清楚。共享层 / CLI 新增 `--translation-overrides`，允许在 `update-l10n` / `update-l10n-project` 前按 anchor 吃掉前端草稿覆盖；开发宿主 `/api/localization-review` 与 `/api/localization-update` 现在按 `sessionId` 记住 previous CSV baseline，前端只在旧 CSV 新增或变化时重传，后续可只传 session 与 translation overrides，由 CLI 继续产出真实 updated CSV。`LocalizationEditorController` 现在会显示 review baseline、读取真实旧 CSV、保留 session draft overrides、按状态筛选当前可见 review 行、显示当前 override / 可见 draft / 导出 readiness 状态，并在浏览器支持 native file handle 时把 updated CSV 直接写回已链接旧文件；linked baseline 会根据当前 anchor 草稿切换 `linked clean` / `linked N unsaved`，`Replace previous CSV` 也只在确实有未保存 linked 草稿时可用；不支持 native file handle 时仍保留浏览器下载导出。该链路已补 `check:model`、`check:localization-update` 与 `check:localization-update-http` 回归，保持“共享语义留在 Internal / CLI，消费端只做薄适配”。
- 2026-06-13 当前状态：SelfHostedEditor dev-host session cache 已补生命周期边界。Runtime snapshot、line-map sidecar、localization baseline 三类会话记忆统一走 `SelfHostedEditorSessionBridge` 的 bounded cache，默认 2 小时 idle TTL、每类最多 64 条 session；`/api/session-cache-status`、`check:session-cache` 与 `check:session-cache-http` 只暴露 session id、大小、age/idle 和淘汰计数，不暴露缓存内容本体。该层仍只属于开发宿主生命周期，不改变 Runtime、Tooling、LanguageServer 或 CLI 的语义 contract。
- 2026-06-13 当前状态：SelfHostedEditor 已具备 dev-host mode 的 `project-session` 状态词汇和 `language-session-request` 请求词汇。前端共享 `EditorBackendClient.sessionId`，Runtime / line-map / localization 使用同一个 session id；sidebar session panel 显示 backend mode 与 session id。LanguageServer 请求统一带 session id、active document path、document revision 与 query envelope，但底层默认仍是 process-per-request。可选 `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` spike 只覆盖 diagnostics / documentSymbols，并且失败会回退。Preview / StoryGraph / Localization 的 draft fallback 已明确为 offline/unavailable 状态，不再伪装成 hosted 成功路径。
- 2026-06-13 当前状态：SelfHostedEditor dev-host process bridge 已补失败可观测性。CLI / LanguageServer 子进程成功时仍返回完整 stdout/stderr 供现有 JSON 解析；失败、spawn error 或 timeout 时统一变成 structured process error，只带 exit code / signal / timedOut / duration 与截断后的 stdout/stderr preview，避免 HTTP 错误返回无界子进程输出。
- 2026-06-13 当前状态：SelfHostedEditor model contract check 已从单个大文件拆成 `DevScripts/ModelContracts/` 下的能力分组，`check:model` 仍是统一入口。后续新增断言应优先放进对应分组，而不是重新塞回组合入口。
- 2026-06-13 当前状态：SelfHostedEditor package scripts 已把过长的 `check:syntax` 与 `check:model` 命令沉到 `DevScripts/SelfHostedEditorSyntaxContractCheck.js` 与 `DevScripts/SelfHostedEditorModelContractSuite.js`。npm 命令名保持不变，syntax 入口递归覆盖 `Scripts/` 与 `DevScripts/` 下的 JavaScript 文件，避免 package.json 重新成为维护瓶颈。
- 2026-06-13 当前状态：SelfHostedEditor static asset bridge 已收紧为允许前缀模型，只暴露 `Resources/`、`Scripts/`、Monaco loader subtree 与 `samples/`；`DevScripts/`、`package.json` 和未知扩展不会作为静态资源返回。Workbench HTML 响应补上 no-store、nosniff、same-origin CORP 与 CSP，并由 `check:static-assets` / `check:static-assets-http` 覆盖直连与真实 HTTP 路径。
- Script 编辑器左侧行号 / line id 提示轨道应保持在 Monaco 内容坐标系里：提示轨道本身不加独立上下 padding，行提示按 Monaco 运行时 line height 建立高度，并通过 `getTopForLineNumber()` 定位。这样长行折行后，下一条逻辑行的行号仍跟随该行首字，而不是紧贴上一条视觉行。
- Script 行号轨道已继续收口：写作表面关闭 Monaco 顶部滚动阴影，行号轨道不暴露横向滚动条；hover 整条 hint line 只显示块内行号，只有 hover 行号数字区域才会以稳定 id 替换块内行号显示。稳定 id 展示时去掉 `line_` 前缀，并提供小复制按钮复制完整去前缀后的 id；未追踪行继续保持安静。
- Script 写作表面关闭 Monaco sticky scroll；节点标题、prompt / choice 标题等结构行不应置顶，而应像普通文本一样自然滚出视口，避免顶部重影与层级错乱。
- Script 语义样式开关已修正：`Syntax` 按钮现在有可见 pressed/off 状态，Monaco 使用 inline decorations 控制标题、对白、旁白、prompt、choice 的文本风格，并用 overlay decorations 控制当前 block 背景。该开关仍只影响表示层，不改变 DSL 语义。
- refs overlay 已改为锚点定位：由标题左侧 refs 按钮传入点击 rect，overlay 在 `.editor-frame` 内按 block 位置打开并随滚动重定位。
- 左侧栏 Files / Outline 已改成可折叠、内部滚动的面板：两者共享侧栏中段可用高度，Files 折叠向上收为顶部标题行，Outline 折叠向下收为底部标题行，避免长 outline 撑破侧栏。
- Files 面板采用和 Outline 一致的紧凑列表布局，内容不足时保持顶部小块列表，不把单个文件项拉伸成填满面板的大卡片。
- line identity 已接入真实 Tooling sidecar 刷新：`SelfHostedEditorLineMapBridge` 调用开发宿主 `/api/line-map-refresh`，宿主运行 `refresh-l10n-line-map-project` 并返回 line-map；开发宿主现在按 `sessionId` 记住上一轮 line-map，前端默认只传 session，不再每轮上传整份 existing sidecar，显式 `existingLineMap` 仍作为兼容 fallback；这份 sidecar 会话记忆现在有 2 小时 idle TTL、64 条容量上限和 `/api/session-cache-status` 状态观测；稳定 `line_...` 迁移仍交给 Tooling。对白、prompt、choice 显示真实 line id，跳转等非本地化身份行不显示身份文本。开发宿主读取 Tooling 生成的 JSON 文件时会剥离 UTF-8 BOM，避免 `JSON.parse` 失败导致前端静默退回 `provider: unavailable`。
- 行号数字区域 hover 只在 Tooling 提供可用 `line_...` 时显示稳定身份；整条 hint line hover 仍只显示块内行号。`@`、跳转、旁白等未追踪行不显示 `not tracked` / `line id not loaded` 占位。line-map 适配器兼容 camelCase / PascalCase JSON 字段，避免拿到真实 sidecar 却映射不到。hint rail DOM 渲染已纳入 `SelfHostedEditorModelContractCheck`，覆盖 `.has-stable-id`、`.hint-stable-id` 与复制控件输出。
- 仍需替换：`ScriptDocumentModelBuilder` 继续是 UI-only 草模，但 Graph 与 Preview 的正常服务路径已开始消费 Compiler project graph；诊断 marker 仍主要贴活动文件；Stable Node Map 已能通过 shared CLI report 查看、跳转、下载生成 sidecar，并通过共享 Tooling / CLI 契约完成 manual-review candidate apply；L10N 视图虽然已经接上真实旧 CSV 选择、review presenter、宿主侧筛选、CSV 会话状态、previous CSV session baseline、真实 updated CSV 导出、native file handle 条件下的直接文件替换，以及 linked baseline 的 clean / unsaved 宿主状态，但批量审校仍未完成；Preview 虽已把当前节点、首次 player 选点、choice / continue、节点级历史回退与节点内 Flow 步进接到 Runtime，但当前仍不是桌面端长生命周期 Runtime Player，会话边界还在开发宿主 + CLI 临时 workspace 这一层；Graph 位置仍是 session memory。后续每次迭代应尽量挑一个窄消费者替换为 Internal 输出，而不是在前端草模上继续叠语义。

- references 候选默认不应依赖 Monaco inline peek；主路线是自定义 overlay，覆盖正文上方而不改变排版流。
- 文件导入入口已进入 workspace 第一版：允许一次导入同目录多份 `.inscape`，并把当前文件、相对路径、workspace 名称与文件数纳入编辑会话状态。
- 侧栏 workspace 文件列表已补第一版：导入多份 `.inscape` 后可在同一写作会话中直接切换活动脚本，编辑区、预览、outline、诊断与 workspace session 会随活动文件刷新；该列表只承担宿主导航，不引入前端语义解析真相。
- workspace 语义探测已推进到第二步：SelfHostedEditor 发给开发宿主的 diagnostics / completion / definition / references / hover 查询现在会附带当前 workspace 文档清单与活动文件相对路径，并优先改走 `LanguageServer` 的 project 级 probe；当前诊断仍只贴回活动文件，真正的多文件 Problems、跨文件 rename 与长期会话缓存仍待后续阶段继续接入。
- references overlay 已开始承担跨文件导航职责：候选项会显示 `relative/path.inscape:Lxx` 这类来源标签与引用行正文预览，并允许在 overlay 中切换到同一 workspace 的其他脚本文档，而不是继续依赖会撑开正文排版的 inline peek。
- 稳定身份显示已定为 sidecar 驱动：正文行的 stable line id 来自 localization line sidecar；标题的 stable node id 属于内部语义与维护流程，不进入默认写作表面。SelfHostedEditor 当前已通过开发宿主桥调用既有 Tooling/CLI `refresh-l10n-line-map-project`，在临时 workspace 中生成真实 line-map 并映射回 Script 行提示；开发宿主按 `sessionId` 保存上一轮 line-map，前端只在兜底时显式上传 previous sidecar，让 Tooling 负责跨编辑迁移稳定 `line_...`；对白、prompt 和 choice 等翻译单元显示真实 `line_...`，跳转等非本地化身份行显示 `not tracked`，避免把 source line、block-local line number 或临时 hash 误当稳定身份。
- 标题 hover 控件的基础交互已经进入可用雏形：新增 block、引用浮层、语义改名和拖拽重排都在同一条轻量操作轨上；语义改名不应使用浏览器系统 prompt，而应使用与写作表面一致的自绘轻浮层，并且必须走 Monaco edit / undo stack，让 `Ctrl+Z` 可以撤销；拖拽重排只移动文本 block 的显示顺序，不隐式改写跳转边。拖拽实现不应只依赖浏览器原生 HTML drag，SelfHostedEditor 需要使用按纵向位置命中最近标题的 pointer-drag 来保证桌面壳和 Monaco 覆盖层里的真实手感。
- 第一眼视觉正在按“桌面写作客户端”方向收口：侧栏承担 workspace / outline，而不是窄工具条；主写作区和预览区使用干净文档面，减少表单感与调试面板感；预览排版优先阅读节奏，不再使用过大的展示字号和过深的装饰背景。
- 默认写作/阅读状态应继续降噪：状态栏、诊断区、workspace summary、本地化表格与节点图都应作为辅助面退后；只有 hover、focus、筛选、诊断导航或切换视图时才增强。
- 写作/阅读字体基线优先对标 Notion：默认使用系统 sans，减少装饰性 serif 带来的“网页展示/小说海报”感；语义层级主要通过字重、透明度、轻微灰阶和 hover affordance 表达，而不是大字号和高饱和色块。
- 标题 hover 操作轨应包含新增、引用、语义改名与拖拽重排；其中语义改名必须复用现有 node rename patch / LanguageServer 语义，而不是只改标题文本。
- Graph 视图长期继续对标 Yarn Spinner：当前第一版视觉已转向节点画布、点阵背景与曲线连线，并已支持节点在当前会话内自由拖拽且连线跟随刷新。下一步要补画布缩放/平移、graph layout sidecar 与图中改连 patch，而不是回退到普通卡片列表。
- Graph 视图已继续向 Blueprint / Shader Graph 式端口表达收口：点击节点或具体出口只同步源码定位，不再自动切回 Script 视图；卡片显示输入端口和按顺序编号的输出行，每个 choice / jump 对应一个输出端口。连线现在以真实 DOM 端口中心为锚点，从输出端口连接到目标节点输入端口，不再依赖布局估算；输出端口可拖到目标节点输入端口以 retarget 对应 choice / jump，拖到任何非输入端口区域则断开该边，并通过受控文本 patch 回写 `-> target`。后续仍需继续细化连接合法性反馈、画布缩放/平移与 graph layout sidecar。
- Graph 输出行 hover 已补第一版局部读边反馈：source 节点、当前显示目标节点和对应 SVG path 会被轻微标出，用于在密集图中逐条理解连接关系；边匹配同时兼容 Compiler project graph edge 的 `sourceTitle` / `targetTitle` 与离线 outgoing row 的 `nodeTitle` / `target`，并会在 SVG edge layer 刷新后恢复当前 hover 高亮；该反馈不改变 selection，也不参与 Compiler graph truth。
- Graph 模型来源已开始替换 UI-only 草模：正常本地服务路径下，Graph 通过 `/api/story-graph` 消费 `compile-project` 的真实项目节点和边；`ScriptDocumentModelBuilder` 只保留为直接打开 HTML 或开发宿主不可用时的离线 fallback。后续仍需把 graph layout sidecar、跨文件图编辑回写和连接合法性反馈继续接到真实工作区契约。
- Script 视图新增全局 semantic styling 开关：开启时标题、正文、对白、prompt、choice 与当前光标所在 block 使用低对比语义样式和浅色块强调；关闭时回到更接近纯文本写作表面。该开关只控制 Monaco 表示层，不改变 DSL 语义。
- SelfHostedEditor 默认样例在本地预览服务器下只读取 `samples/court-loop.inscape` 这个真实 `.inscape` 文件；直接打开 HTML 或静态服务器不可用时不再回退到入口脚本内的内置脚本文本。
- Preview 阅读面板已移除 hover 时重复出现 speaker 的行为，保留正文内 speaker 标记作为唯一提示，避免 hover 状态产生冗余信息。
- Script 标题左侧引用浮层已从“路径 + 单行”改为更接近 VSCode references 的信息组织：每项展示 `choice -> target` / `Jump -> target` 摘要，并附带引用行前后上下文与命中高亮；浮层会跟随所点击 block 的引用计数位置打开，并在滚动时继续贴近对应标题；UI 仍保持 SelfHostedEditor 的浅纸面风格，不显示完整文件路径。

## 待确认问题

- Tauri 是否仍是第一版最合适壳，还是应评估 Avalonia / Electron / WebView2。
- Tauri / Web UI 方案在 Windows 与 macOS 上的打包、自动更新、签名和本机文件权限成本；移动端暂不进入第一版验证。
- 自研编辑器是否直接启动 `LanguageServer --stdio`，还是引入统一 Editor Backend 进程。
- Monaco 是否能完整覆盖 VSCode 当前 `.inscape` 体验中的 semantic rename、references、diagnostics 和 hover 交互；若不能，需明确补齐策略或替代方案。
- CSV 视图是否只承载本地化，还是扩展到 HostBinding / RoleMap / Resource binding；当前倾向是界面模型分开。
- 节点图可编辑时的真相边界：文本源仍应是主真相，节点图编辑需要通过受控 command / patch 回写文本或 sidecar，而不是维护第二份漂移结构。
- 是否需要将 HTML Preview 的 presenter model 与 Runtime Player model 做一次明确分层，避免预览模板成为运行时 API。
- 本地化候选应用到 CSV 的写回规则、冲突处理和审计记录。

## 验证方式

自研编辑器实现开始后，每个节点至少验证：

- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- SelfHostedEditor 自身的结构检查、类型检查和打包检查
- LanguageServer 冷启动 / 热会话 smoke
- 打开 `samples` 项目并完成脚本 -> 预览 -> CSV / 本地化审查 -> 源位置跳转闭环
