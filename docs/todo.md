# TODO

状态：持续维护

SelfHostedEditor regression invariant: Preview choice clicks must advance the reading Preview to the target block and reveal the target block title in the editor. Compiler-project Preview data must never silently lose `previewLines`: if a returned Compiler graph has source lines but missing or mismatched `previewLines`, Preview must report a compiler graph contract error instead of falling back to the UI-only draft model. `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model` covers both invariants so future Runtime / navigation work does not regress them.

本仓库提交推送可优先使用 `tools\CommitAndPushInscape.cmd "commit message"`；本机 Codex skill `inscape-git-push` 记录了同一流程，供后续线程减少重复 git 操作上下文。

本文件记录已经能执行或需要调研的工作。仍未形成共识的问题放在 [待确认问题](open-questions.md)，已经形成长期决策的问题放在 [ADR](adr/README.md)。

当前目录迁移与不符合项总蓝图见 [目录优先重构蓝图](directory-first-reframe-plan.md)。当前后续执行面板见 [/goal 后续目标计划](goal-plan.md)。

## 2026-06-13 SelfHostedEditor 下一阶段 10 轮执行状态

- [x] 第 1 轮：收口并推送当前 SelfHostedEditor controller / fallback / backend 边界基线。该轮把已有未提交改动先验证并推送，避免下一阶段 backend client / CSS / fallback 工作继续叠在脏工作树上。额外通过 SelfHostedEditor HTTP smoke：semantic parity、Runtime、Localization review/update、Node Map、static assets、session cache、line-map、Host Schema、Host Binding、references；随后通过 `tools\CommitAndPushInscape.cmd "refactor: split self hosted editor controllers"` 完成提交前验证、提交和推送。
- [x] 第 2 轮：冻结 backend 迁移实施 checklist。`docs/self-hosted-editor-backend-migration-map.md` 的 17 个 `/api/*` endpoint 已增加 `implementationPhase`，并明确这些 phase 只是下一阶段施工顺序；`src/ExternalSupport/SelfHostedEditor/README.md` 已补充 `EditorBackendClient` 第一版仍只调用现有 dev-host `/api/*`，不能被误读为正式 backend 或通用 RPC。
- [x] 第 3 轮：新增 frontend-facing backend client adapter 骨架。新增 `Scripts/Backend/Clients/EditorBackendClient.js`、`SelfHostedEditorHttpBackendTransport.js` 与 `Scripts/Backend/Models/EditorBackendSessionStatusModel.js`；client 只暴露 `languageSession`、`hostCapabilities`、`storyGraph`、`runtimeSession`、`lineIdentitySession`、`localizationSession`、`stableNodeMap`、`diagnostics.sessionStatus()` 等业务窄入口，不暴露 public generic request。`check:structure` 已把 `Backend` 目录纳入允许业务目录，`check:model` 覆盖 route mapping 与 dev-host session status 投影。

## 2026-06-13 SelfHostedEditor UI controller 重构执行状态

- [x] 第 1 轮：StoryGraph rendering 边界拆分。新增 `Scripts/StoryGraph/Renderers/StoryGraphNodeRenderer.js` 与 `Scripts/StoryGraph/Renderers/StoryGraphEdgeRenderer.js`，把节点卡片 / 输出行 DOM 和 SVG edge layer / path 创建从 `StoryGraphPreviewController.js` 移出；controller 从 1025 行降到 824 行。`StoryGraphPreviewController` 仍保留 layout、reference projection、viewport、drag / retarget、hover 高亮编排，下一轮继续拆 `StoryGraphInteractionController` / `StoryGraphViewportController` 或 geometry model。已跑基线全套 SelfHostedEditor HTTP smoke，并在改动后通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。
- [x] 第 2 轮：隔离 StoryGraph viewport controller。新增 `Scripts/StoryGraph/Controllers/StoryGraphViewportController.js`，集中 graph viewport 创建、pan / zoom / reset、transform 应用、graph-space 坐标换算和 node position 读取；`StoryGraphPreviewController.js` 从 824 行降到 662 行。controller 仍保留 node drag、connection drag / retarget、hover highlight、layout 和 reference projection，下一轮继续拆 interaction / geometry。已通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。
- [x] 第 3 轮：隔离 StoryGraph interaction / geometry。新增 `Scripts/StoryGraph/Controllers/StoryGraphInteractionController.js` 和 `Scripts/StoryGraph/Models/StoryGraphPortGeometryModelBuilder.js`，把 node drag、connection drag / retarget、connection target hit test、preview path、端口中心和连接曲线路径从 `StoryGraphPreviewController.js` 移出；controller 从 662 行降到 472 行，达到阶段 1 的 350 到 500 行目标。reference projection / layout 仍留在 controller 作为当前 feature orchestration，可后续按需要再拆。已通过 `check:syntax`、`check:structure`、`check:model`、`check:node-map-http`、`check:semantic-parity-http`。
- [x] 第 4 轮：进入 Preview controller 拆分第一刀。新增 `Scripts/Preview/Models/PreviewCompilerGraphContractGuard.js` 与 `Scripts/Preview/Models/PreviewRuntimePreferenceModelBuilder.js`，把 compiler graph preview line 契约守卫、Runtime snapshot 偏好判断、Runtime snapshot 到 reading preview model 的映射从 `PreviewPanelController.js` 移出；controller 从 1002 行降到 811 行。Compiler graph contract error 仍不会被 draft fallback 掩盖，Runtime-backed choice / continue / rewind / Flow snapshot 映射保持不变。已通过 `check:syntax`、`check:structure`、`check:model`、`check:runtime-http`、`check:semantic-parity-http`。
- [x] 第 5 轮：完成 Preview controller 拆分目标区间。新增 `Scripts/Preview/Renderers/PreviewBlockRenderer.js`、`Scripts/Preview/Renderers/PreviewChoiceRenderer.js` 与 `Scripts/Preview/Models/PreviewFlowStatePresenter.js`，把正文 / metadata / query token / typewriter DOM、choice list DOM 与 Flow 可见行状态从 `PreviewPanelController.js` 移出；controller 从 811 行降到 478 行，达到阶段 2 的 350 到 500 行目标。保留 `normalizeChoiceGroups`、`getVisibleLines`、`clearTypewriterTimer` 薄代理以兼容既有 model contract。已通过 `check:syntax`、`check:structure`、`check:model`、`check:runtime-http`、`check:semantic-parity-http`。
- [x] 第 6 轮：完成 AppEntry composition root 收口。新增 `Scripts/Entries/SelfHostedEditorDomBindings.js`、`Scripts/Entries/SelfHostedEditorFeatureBootstrapper.js`、`Scripts/Entries/SelfHostedEditorWorkbenchRenderController.js`、`Scripts/Entries/SelfHostedEditorNodeRenameDialog.js` 与 `Scripts/ProjectWorkspace/Models/ScriptBlockEditPatchBuilder.js`，把 DOM 查询、feature controller / bridge 创建、workspace context provider 装配、Workbench render 状态、rename dialog 和脚本块文本 patch 从 `SelfHostedEditorAppEntry.js` 移出；入口从 793 行降到 331 行，达到阶段 3 的 200 到 350 行目标。已通过 `check:syntax`、`check:structure`、`check:model`、`check:semantic-parity-http`、`check:runtime-http`、`check:static-assets-http`。
- [x] 第 7 轮：完成 UI-only fallback 使用面第一轮压缩。新增 `Scripts/ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js`，所有生产路径不再直接 import `ScriptDocumentModelBuilder`，而是通过登记 reason 调用；当前 reason 覆盖 EditorAuthoring / Workspace Summary 的 offline-only UI convenience，以及 Preview / StoryGraph / Localization / Diagnostics / DocumentSymbols 的 hosted bridge unavailable fallback。`check:structure` 会拦截新的直接 builder import，`check:model` 覆盖 reason catalog 和缺 reason 抛错，Preview malformed compiler graph 仍保持 explicit contract error 而不落回 draft fallback。README 已补 fallback policy 边界。已通过 `check:syntax`、`check:structure`、`check:model`。
- [x] 第 8 轮：完成 Localization controller 轻量化。新增 `Scripts/Localization/Renderers/LocalizationTableRenderer.js`、`Scripts/Localization/Controllers/LocalizationCsvFileController.js`、`Scripts/Localization/Models/LocalizationVisibleRowsModelBuilder.js`、`LocalizationReviewRowsModelBuilder.js` 与 `LocalizationExportReadinessModelBuilder.js`，把 review table DOM、previous CSV file handle / updated CSV IO、Presenter row 映射、filter visible rows 和 export / replace readiness 从 `LocalizationEditorController.js` 移出；controller 从 823 行降到 432 行，达到阶段 5 的 300 到 450 行目标。Tooling presenter review action、draft filter、updated CSV、replace linked baseline 行为保持不变。已通过 `check:syntax`、`check:structure`、`check:model`、`check:localization-review-http`、`check:localization-update-http`。
- [x] 第 9 轮：完成 EditorSurface controller 轻量化。新增 `Scripts/EditorAuthoring/Controllers/EditorLineHintController.js` 与 `EditorSemanticDecorationController.js`，把 hint rail DOM、stable id hover / copy、title add / rename / refs button、block reorder drag visual state，以及 Monaco semantic / active block decorations 从 `EditorSurfaceController.js` 移出；controller 从 819 行降到 407 行，达到阶段 6 的 350 到 500 行目标。Monaco authoring、stable line id、references source selection 与 semantic styling 行为保持不变。已通过 `check:syntax`、`check:structure`、`check:model`、`check:references-http`、`check:line-map-http`、`check:semantic-parity-http`。
- [x] 第 10 轮：完成产品化 backend 准备。新增 `docs/self-hosted-editor-backend-migration-map.md`，逐项梳理当前 17 个 `/api/*` endpoint 的 dev-host 行为、未来 backend service、状态分类和迁移要求；新增 `docs/adr/0018-self-hosted-editor-backend-session-boundary.md`，明确未来 backend 使用业务窄接口，不把 `/api/*` 机械升级为通用 RPC，并区分 Editor UI state、dev-host transport cache 与 backend project session。已同步 `docs/self-hosted-editor-architecture-plan.md` 与 ADR 索引；当前 dev host 不改成复杂 backend 框架。已通过 `check:syntax`、`check:structure`、`check:model`。
- [x] 第 11 轮：完成 SelfHostedEditor UI controller 重构总体验收，14 轮以内目标以 11 轮收口。完整验证已通过：`dotnet build Inscape.slnx --no-restore`、Internal tests、VSCode manifest `node --check`、VSCode `check:structure` / `check:semantic-parity`，以及 SelfHostedEditor `check:syntax`、`check:structure`、`check:model`、`check:semantic-parity-http`、`check:runtime-http`、`check:localization-review-http`、`check:localization-update-http`、`check:node-map-http`、`check:static-assets-http`、`check:session-cache-http`、`check:line-map-http`、`check:host-schema-http`、`check:host-binding-http`、`check:references-http`。审计结果：最大 controller 为 `PreviewPanelController.js` 483 行，`Scripts/` 下没有超过 500 行的 JS；生产代码只通过 `ScriptDocumentFallbackPolicy` 触达 `ScriptDocumentModelBuilder`；backend migration map 覆盖 17/17 个 `/api/*` route；ADR / architecture plan / handoff 已同步。

## 2026-06-13 10 轮重构执行状态

- [x] 第 1 轮：SelfHostedEditor dev-host HTTP JSON body size limit。`SelfHostedEditorHttpBridge` 默认限制请求体为 4 MB，超限返回 413 JSON error；新增 `check:http-bridge` 并接入 `check:model` / `check:syntax`。本轮只加固宿主 transport 边界，不改变 shared LanguageServer / Tooling / Runtime / CLI 成功 payload。
- [x] 第 2 轮：继续把 SelfHostedEditor dev host 的 API handler 从组合根拆到更窄的业务 bridge / controller。`StartSelfHostedEditorPreview.js` 现在只装配 API handler services，request parsing / response writing / session payload normalization 迁入 `SelfHostedEditorApiHandlerBridge.js`；HTTP smoke 覆盖 semantic parity、Runtime、line-map、localization update、node-map 与 Host Binding。
- [x] 第 3 轮：为 session cache 补 TTL / 容量上限 / 可观测状态，覆盖 Runtime、line-map、localization baseline 三类会话记忆。`SelfHostedEditorSessionBridge` 现在统一维护三类 bounded cache，默认 2 小时 idle TTL、每类 64 条 session 上限；新增 `/api/session-cache-status`、`check:session-cache` 与 `check:session-cache-http`，只暴露数量、大小、淘汰计数和 session id，不暴露 Runtime / line-map / CSV 内容本体。
- [x] 第 4 轮：补 process bridge 的错误输出截断、状态表达和超时可观测性复查。`SelfHostedEditorProcessBridge` 现在把非零退出、spawn error 和 timeout 收成 `SelfHostedEditorProcessCommandError`，包含 exit code / signal / timedOut / duration 与截断后的 stdout/stderr preview；HTTP error response 会透出可选 structured details。新增 `check:process-bridge` 并接入 `check:model` / `check:syntax`。
- [x] 第 5 轮：拆分 `SelfHostedEditorModelContractCheck.js`，按 model shape、preview、story graph、runtime、localization、host capability 分组。入口文件现在只顺序加载 `DevScripts/ModelContracts/*ContractCheck.js`，断言分到 model shape、host capability、story graph、localization、node-map、preview/runtime 和 shared harness；`check:model` 入口保持不变，`check:syntax` / `check:structure` 已纳入新目录。
- [x] 第 6 轮：拆分超大的本地化 / preview C# 测试文件，保持测试入口不变。`TestPreviewLocalization.cs` 现已按 Preview contract、Localization CLI、Localization alignment、Localization line-map、VSCode localization contract 和 shared assertions 分成多个 partial `TestCore` 文件；`tests/Internal/Inscape.Tests/Entries/TestCore.cs` 的测试注册入口不变。
- [x] 第 7 轮：把过长的 SelfHostedEditor package 检查命令沉到独立 DevScripts 入口，避免 package script 成为维护瓶颈。`check:syntax` 现在委托 `SelfHostedEditorSyntaxContractCheck.js` 递归检查 `Scripts/` / `DevScripts/` 下的 JS 文件；`check:model` 委托 `SelfHostedEditorModelContractSuite.js` 串起既有 model / HTTP / process / session-cache contract。
- [x] 第 8 轮：复查 static asset / MIME / cache policy / CSP 边界，只做宿主安全硬化。`SelfHostedEditorStaticAssetBridge` 现在只允许 `Resources/`、`Scripts/`、Monaco loader subtree 与 `samples/`，拒绝 `DevScripts/`、`package.json` 和未知扩展；Workbench HTML 响应带 no-store、nosniff、same-origin CORP 与 CSP。新增 `check:static-assets` 与 `check:static-assets-http`。
- [x] 第 9 轮：VSCode / SelfHostedEditor 宿主层语义回流巡检，修正仍在宿主层重复组织 shared presenter / payload truth 的点。`StartSelfHostedEditorPreview.js` 不再内联 story graph / runtime / localization review / node-map compact payload 与 sourcePath 归一化，相关传输修剪集中到 `SelfHostedEditorPayloadBridge`；新增 `check:payload-bridge` 并接入 `check:model` / `check:structure`，守住 `presenter.items`、`report.items` 与 shared action keys 不被宿主层重命名。
- [x] 第 10 轮：总体验收，跑完整验证、整理剩余风险、更新 handoff / TODO / refactoring standard。阶段验收已覆盖 SelfHostedEditor 常规 contract、主要 HTTP smoke、.NET build / Internal tests、VSCode semantic parity / structure 与 diff whitespace；剩余风险主要是 UI-only `ScriptDocumentModelBuilder` fallback、dev-host 仍通过临时 workspace 重建部分长会话、Monaco 相关 CSP 仍保留受控 `unsafe-*` 兼容项。

## 2026-05-24 SelfHostedEditor 接力优先事项

- 当前用户主线：继续推进自研编辑器体验，并用真实 `LanguageServer` / `Tooling` / `Runtime` 契约替换 UI-only 临时层。接手时优先读 `docs/self-hosted-editor-architecture-plan.md` 与 `src/ExternalSupport/SelfHostedEditor/README.md`。
- 已完成：默认样例只加载真实文件 `samples/court-loop.inscape`；入口脚本已移除硬编码脚本文本，真实文件不可读时显示加载失败而不是伪造脚本文本。
- 已完成：Graph 连线改为真实端口中心绘制，从输出端口到目标输入端口；输出端口拖到输入端口会 retarget，拖到非输入端口会断开；节点选择和重命名后保持 Graph 视图。已补 SVG 层级和输入端口吸附热区，避免连线被节点卡片遮住或拖拽释放后因命中太窄而消失。
- 已完成：Graph 输出行 hover 会轻微标出 source 节点、当前显示目标节点和对应 SVG 线条，让密集图里可以逐条读边；该匹配同时兼容 Compiler project graph edge 的 `sourceTitle` / `targetTitle` 与离线 outgoing row 的 `nodeTitle` / `target`，并会在 SVG edge layer 刷新后恢复当前 hover 高亮；该反馈不改变 selection，也不会自动切换视图。
- 已完成：Graph 面板在隐藏状态渲染后会在可见 / resize 时重新计算端口位置，避免 `getBoundingClientRect()` 读到 0 尺寸导致真实边数据存在但画面无连线。
- 已完成：Graph 视图已从固定宽板改为可平移 / 缩放视口；空白处拖拽移动画布，滚轮按指针位置缩放，左上角提供 zoom in / out / reset 控制。节点拖拽和连线绘制已改用 graph-space 坐标，缩放后仍保持可编辑。Graph 激活时工作区会切换为紧凑的单面板布局，让画布吃满可用主体空间，而不是沿用 Script 双栏的大留白。
- 已完成：Graph 回环边改为视图层 reference projection。目标节点在布局顺序上不晚于 source、或加入显示图后会闭合成环的边，不再向左/向上连回真实节点，而是接到 source 右侧局部 return lane 中的 reference-only 节点；reference 节点只接受输入、没有输出、不可重命名，点击仍跳真实目标，手动连到它时回写真实目标标题。hover 到 reference 时会轻微标出 source 与真实 target，帮助理解替身关系。这一版让回环边保持短的向右连接，减少跨画布回拉线。
- 已完成：Script 语义样式继续收口，`@...` 元数据在代码高亮模式下弱化显示，`[query]` 使用安静的 query token 样式；Monaco 的 Unicode ambiguous character 提示已在自研写作面关闭，避免中文标点被误报为源码混淆风险。
- 已完成：Preview 侧 `@...` 元数据不再显示 `@` 字符，改为不可点击、不可选中的淡蓝灰圆角 tag；`[query]` 也有轻量 inline token 样式。
- 已完成：Preview 不再固定显示首个 block；编辑器 definition navigation 或源码定位落到其他 block 时，预览会切到该 block，但不会跟随编辑器滚动位置一起滚动。
- 已完成：Preview 阅读表面移除总行数 meta 文本；行数这类 session/debug 信息应留在 workspace 状态区，不进入正文阅读面。
- 已完成：Preview 增加 `Static` / `Flow` 阅读模式切换。Static 保持当前完整 block 展示；Flow 从标题开始，点击预览区逐行放出正文，新出现的 speaker 快速淡入，正文使用打字机效果；正文结束后一次性显示全部选项，并同时显示选项文本与目标标题。`@` 标签不消耗 Flow 点击：开头标签随标题出现，正文后的标签随该句完成后出现。Flow 滚轮导航只在预览面板自身滚到顶部 / 底部后接管：向上按阈值撤回上一步，向下按阈值快进一步；选项可见时禁止向下快进。
- 已完成：Script 视图 Ctrl/Cmd + Click 节点标题或跳转目标时会显式走 source selection 管线，编辑器光标与预览 block 都会跳到 definition 位置，避免只更新 Preview 而编辑器不移动。
- 已完成：Script 编辑器和 Preview 滚动容器已拆开；外层 workbench 不再作为共享滚动面，Monaco 上下滚动不应带动右侧预览栏。
- 已完成：Script 写作表面关闭 Monaco sticky scroll；节点标题、prompt / choice 标题等结构行不再在滚动时置顶，避免顶部重影和正文错层。
- 已完成：根布局固定为视口内应用，页面本身不滚动；Script 编辑器继续由 Monaco 内部滚动，Preview 由 `.story-preview` 独立滚动。Ctrl/Cmd + Click definition navigation 会阻止默认点击流程抢回光标，避免 Preview 跳转但编辑器不移动。
- 已完成：Script refs overlay 会跟随点击的 block 锚点，不再固定在左上；候选展示上下文与命中高亮。
- 已完成：左侧栏 Files / Outline 面板改为共享侧栏可用高度并各自内部滚动；两个面板都支持折叠，Files 向上折叠为顶部标题行，Outline 向下折叠为底部标题行。
- 已完成：Files 面板改为和 Outline 一样的紧凑列表布局，内容不足时保持顶部小块列表，不再把单个文件项拉伸成大卡片。
- 已完成：左下角 workspace/session 信息在所有视图下统一为常态可读样式，不再依赖侧栏 hover 才变清楚；hover 只保留轻微增强。
- 已完成：`Syntax` 开关已有真实视觉状态，并通过 Monaco inline decorations / overlay decorations 区分标题、对白、旁白、prompt、choice 和当前 block。
- 已完成：SelfHostedEditor 已通过开发宿主桥复用 `refresh-l10n-line-map-project`，让 Script 行 id 来自真实 Tooling line-map；上一轮 line-map 会作为下一轮 existing sidecar 输入，避免每次刷新重建稳定 id；非本地化身份行显示 `not tracked`。
- 已完成：Script 行号 hover 只在 Tooling 提供可用 `line_...` 时显示稳定 id；`@`、跳转、旁白等未追踪身份行不再显示 `not tracked` 或 `line id not loaded` 占位。line-map 适配器兼容 camelCase / PascalCase JSON 字段。开发宿主读取 Tooling 生成的 `inscape.line-map.json` / refresh report 时会剥离 UTF-8 BOM，避免 `JSON.parse` 失败后前端静默退回 `provider: unavailable`。
- 已完成：Script 行号轨道继续收口：Monaco 顶部滚动阴影已在写作表面关闭，行号轨道不再暴露横向滚动条；hover 整条 hint line 只显示块内行号，只有 hover 行号数字区域才会用稳定 id 替换行号显示。稳定 id 显示时会去掉 `line_` 前缀，并提供一个小复制按钮复制完整去前缀后的 id。`check:model` 已覆盖 stable id 从 line-map 映射到 authoring model，并确认 hint rail DOM 渲染 `.has-stable-id` / `.hint-stable-id` / copy control。
- 已完成：Graph 模型正常服务路径已改为通过 `/api/story-graph` 调用现有 CLI `compile-project`，消费真实 Compiler project IR 的节点和 choice / default jump 边；前端草模只保留为离线 fallback，端口拖拽继续通过受控文本 patch 回写 `-> target`。
- 已完成：SelfHostedEditor 预览服务静态资源响应已加 `Cache-Control: no-store`，避免本地迭代时浏览器继续使用含旧硬编码样例 / 旧 Graph 逻辑的缓存 bundle。
- 已完成：Script 编辑器左侧行号 / line id 提示轨道重新对齐 Monaco 内容坐标系；提示轨道不再拥有独立上下 padding，每行提示使用 Monaco 运行时 line height，避免长行折行后后续行号与对应行首错位。
- 已完成：SelfHostedEditor 增加安静 loading 状态，覆盖默认样例、Monaco、line-map、Compiler graph Preview / Graph、Runtime、diagnostics、outline、本地化和 workspace summary 刷新过程。
- 已推进：Preview 内容模型完成第一刀替换，正常服务路径现在消费 `/api/story-graph` 的 Compiler project graph，阅读行、元数据、choice prompt、choice option 与 default jump continue 入口不再从前端源码草模推断；`ScriptDocumentModelBuilder` 只保留为服务不可用时的离线 fallback。若已返回 `compiler-project` graph 但节点 `previewLines` 缺失或与 Compiler lines 数量不一致，Preview 必须显示 compiler graph contract error，不能按标题回退到前端草模正文。
- 已推进：Runtime Player 接入前置契约完成第一刀，新增 `runtime-project` CLI 命令，项目编译后由 `NarrativeRuntime` 启动 entry，并输出 `inscape.runtime-state` JSON；后续 SelfHostedEditor 应消费这个运行态，而不是在前端模拟当前节点。
- 已推进：SelfHostedEditor 新增开发宿主 `/api/runtime-state` 与 `SelfHostedEditorRuntimeBridge`，当前会把 Runtime entry snapshot 显示到 session 状态；`runtime-project` CLI 和 `/api/runtime-action` 已能在恢复上一帧 state 后执行 `continue` / `choose` 并输出新 snapshot。Preview 还没有消费这个 Player action 状态。
- 已推进：Preview Runtime Player 第一小刀已经接上真实 action 链路。当前阅读面板里的 choice / continue 点击，在预览节点与最新 Runtime snapshot 当前节点一致时，会优先调用 `/api/runtime-action` 的 `choose` / `continue`，成功后直接用返回 snapshot 重绘阅读面并把编辑器定位到 Runtime 当前节点；当 Runtime 不可用或预览节点与 snapshot 脱节时，仍回退 source-only 导航。这样先替换最直接的“点击推进”路径，而不在前端再造一套运行时语义。
- 已推进：Preview Runtime Player 第二小刀已经把“当前节点”也接到 Runtime。现在普通 renderWorkbench 刷新时，只要当前编辑光标仍位于最新 Runtime snapshot 的当前节点里，阅读面板就优先继续显示该 Runtime 当前节点，而不是一刷新就掉回 compiler graph 的 presenter 节点。当前还没接上的部分是：首次 player 选点、Flow 的步进历史、以及更完整的 Runtime path 驱动显示。
- 已推进：Preview Runtime Player 第三小刀已经把“首次 player 选点”也接到 Runtime。现在新文档刚打开、工作台还没建立 presenter 当前节点、并且光标还停在文件顶部起步位置时，阅读面板会直接从 Runtime 当前节点起步，而不是先假设第一个脚本节点就是 player 开场。当前还没接上的部分是：Flow 的步进历史、步骤计数，以及更完整的 Runtime path 驱动显示。
- 已推进：Preview Runtime Player 第四小刀已经把“节点级历史回退”也接到 Runtime。Runtime 共享层新增 `rewind`，SelfHostedEditor 阅读面会显示轻量 Runtime path，并在 path 长度大于 1 时给出 Runtime-backed `Back` 按钮；点击后通过 `/api/runtime-action` 回退到上一个已访问节点并直接用返回 snapshot 重绘。当前还没接上的部分主要剩：节点内 Flow 的步进历史与步骤计数。
- 已推进：Preview Runtime Player 第五小刀已经把“节点内 Flow 步进”也接到 Runtime。`NarrativeRuntime` 现已输出 `state.visibleStepCount` 与 `readingProgress`，开发宿主 `/api/runtime-action` 与 SelfHostedEditor Runtime bridge 也已支持 `advance-flow` / `rewind-flow`；Preview 在 Runtime 可用时只透传动作并消费返回 snapshot，不再把节点内步进真相单独留在浏览器里。当前本地 Flow presenter 只作为 Runtime 不可用时的 fallback。
- 已新增 `check:runtime` 与 `check:runtime-http`：前者直接导入 SelfHostedEditor preview dev script，验证 compact Runtime payload 与 `choose -> continue` 状态推进；后者在同一 Node 进程里启动 preview dev server，再真实请求 `/api/runtime-state` 与 `/api/runtime-action`，把 Runtime transport 这一层也纳入稳定回归入口。
- 2026-05-28 已完成：SelfHostedEditor L10N 视图已从“只有 session draft CSV”推进到“真实旧 CSV 选择 + 真实 updated CSV 导出”第一刀。共享层 / CLI 新增 `--translation-overrides`，开发宿主新增 `/api/localization-update`，前端只传 `previousCsv + anchor-based translation overrides`，不在浏览器里自己拼真实 CSV。当前用户既可以继续导出轻量 draft CSV，也可以选择真实旧 CSV 后导出真实 updated CSV。
- 2026-05-28 已完成：SelfHostedEditor L10N 视图已补一层宿主侧 review 筛选，不改共享 review 语义。`LocalizationEditorController` 现在支持按 `all / actionable / draft / empty / kept / new / changed / conflict / stale / removed` 切换可见行，并显示当前 `Showing X of Y rows` 摘要；筛选只作用于浏览器可见性，不改变 Tooling presenter、draft overrides 或 updated CSV 导出链路。
- 2026-05-28 已完成：SelfHostedEditor L10N 视图已补一层更清楚的 CSV 会话状态与当前筛选范围的一键清草稿。当前会显示 session override 数、当前筛选下可见 draft 数，以及 updated CSV 为什么还不能导出；同时支持只清掉当前 filter 下可见的 draft overrides，不影响 review presenter 或真实 updated CSV 语义。
- 2026-05-29 已完成：SelfHostedEditor L10N 视图已补上“直接替换旧 CSV 文件”这一刀。若浏览器支持 native file handle，`Open previous CSV` 会优先链接真实旧 CSV，`Replace previous CSV` 会通过既有 `/api/localization-update` 生成真实 updated CSV 并直接写回原文件；宿主层只负责文件句柄与写回，CSV 语义仍留在 shared CLI。若 native file handle 不可用，则继续保留浏览器下载路径，不在前端模拟写文件。
- 2026-05-29 已完成：SelfHostedEditor L10N 视图已继续补清楚 linked baseline 的已保存/未保存状态。当前会把已链接旧 CSV 标成 `linked clean` 或 `linked N unsaved`，并让 `Replace previous CSV` 只在确实存在未保存 linked 草稿时可用；这一步仍只属于宿主层状态表达，不改 shared review presenter 和 CLI update 语义。
- 已新增 `check:localization-review` dev-host smoke：它直接导入 SelfHostedEditor preview dev script，对 `samples/court-loop.inscape` 执行完整本地化 review 路径，不依赖先拉起本地 HTTP server。当前结果为 170 items、约 94 KB payload、约 558ms，可作为后续 `/api/localization-review` 收口的稳定回归入口。
- 已新增 `check:localization-review-http`：它在同一 Node 进程里启动 SelfHostedEditor preview dev server，再真实请求 `/api/localization-review`，补上 HTTP transport 这一层的稳定回归入口。
- 已新增 `check:localization-update` 与 `check:localization-update-http`：它们分别覆盖 `/api/localization-update` 的直连 helper 与真实 HTTP transport，验证“真实旧 CSV + draft overrides -> 真实 updated CSV”这条写回链路。
- 2026-06-01 已完成：SelfHostedEditor L10N review actions parity 第一刀。`/api/localization-review` 的 compact presenter payload 现在保留 Tooling 生成的 `open-current` / `open-candidate` / `show-candidate-diff` actions；表格行内提供 Current / Candidate / Diff 动作，可跳当前行、候选旧文本来源并展开候选 diff。浏览器端只做展示和 source reveal，不重算 alignment、候选评分或 CSV 更新语义；`check:model`、`check:localization-review`、`check:localization-review-http` 已覆盖 actions 传输和交互。
- 2026-06-01 已完成：SelfHostedEditor Host capability 查看入口。左侧新增 `Host` 视图，复用既有 `/api/host-schema-capabilities` 与 `/api/host-binding-capabilities`，展示 query、event、speaker、timeline binding 清单，并可跳到 schema / bridge / script 来源。前端只消费共享 capability catalog，不解析 Host Schema / Host Bridge JSON；`check:model`、`check:structure`、`check:host-schema-http`、`check:host-binding-http` 已覆盖入口、来源跳转与 transport。
- 2026-06-02 已完成：SelfHostedEditor refs overlay 与 VSCode CodeLens / References Peek 的业务等价验证第一刀。`/api/references` 继续复用 `LanguageServer --references-project`，并把 dev-host 临时目录 sourcePath 还原为 workspace 相对路径；新增 `check:references` 与 `check:references-http`，覆盖跨文件引用、当前 draft 未保存内容、引用数量和 HTTP transport。自研编辑器不复制 CodeLens UI，只守同一组引用结果与 source jump 能力。
- 2026-06-02 已完成：SelfHostedEditor 语义 parity HTTP smoke 第一刀。新增 `check:semantic-parity-http`，用同一个临时 workspace 真实请求 diagnostics、completion、definition、references、hover、outline 六个 LanguageServer-backed dev-host 入口，覆盖当前 draft、跨文件节点、缺失目标诊断和 workspace-relative sourcePath。此项只守 transport / adapter，不在宿主层新增语义判断。
- 2026-06-02 已完成：VSCode 语义 parity provider contract 第一刀。新增 `check:semantic-parity`，使用与 SelfHostedEditor 语义 smoke 同一组 current draft / cross-file fixture，通过 VSCode diagnostics、completion、definition、references、hover、outline provider 层消费真实 `LanguageServer` 会话结果；同时补上 VSCode 宿主层对临时 override sourcePath 与 workspace-relative sourcePath 的路径还原，避免把临时文件当作作者源码位置。
- 2026-06-02 已完成：VSCode 本地化 review -> update 核心闭环。`Inscape: Review Localization Alignment` 写出 report 后会提供 `Update CSV` 成功动作，复用本次 review 已选择的 previous CSV，再调用共享 `update-l10n-project` 生成 updated CSV。VSCode 只做文件对话框与命令调度，不吸收 CSV 合并、alignment 或候选评分语义。
- 2026-06-02 已完成：SelfHostedEditor Stable Node Map manual-review apply/dry-run 核心闭环。`Node Map` review 面板现在给候选提供 `Preview Apply` / `Apply`，开发宿主新增 `/api/node-map-apply` 并调用共享 `apply-node-map-candidate-project`；浏览器只更新可下载的 node map payload，不在前端改写 sidecar。`check:node-map` 与 `check:node-map-http` 已覆盖 direct helper 与真实 HTTP 的 review + candidate apply。
- 2026-06-02 已完成：Editor Backend 会话边界第一刀落在 Runtime dev-host。`/api/runtime-state` 现在按 `sessionId` 记住最新 compact Runtime snapshot，`/api/runtime-action` 可只带 `sessionId + action` 推进服务端会话，显式 `runtimeState` 仍作为兼容 fallback。前端 Runtime bridge 不再默认每次 action 都上传整份 Runtime state；`check:runtime-http` 已覆盖不带 `runtimeState` 的真实 HTTP session 推进。这仍只是宿主会话状态，不改变 `Runtime` / CLI 的剧情推进语义。
- 2026-06-02 已完成：Editor Backend 会话边界第二刀落在 line-map dev-host。`/api/line-map-refresh` 现在按 `sessionId` 记住最新 Tooling line sidecar，前端默认只传 `sessionId + script/workspace`，不再每轮上传整份 `existingLineMap`；显式 `existingLineMap` 仍作为兼容 fallback。新增 `check:line-map` 与 `check:line-map-http` 覆盖直连和真实 HTTP 的 session 继承，证明第二次刷新不带 `existingLineMap` 也能保住已有稳定 line id。这仍只是宿主会话缓存，不改变 `refresh-l10n-line-map-project` 的行身份迁移语义。
- 2026-06-02 已完成：Editor Backend 会话边界第三刀落在 localization baseline/update dev-host。`/api/localization-review` 会按 `sessionId` 记住作者本次选过的 previous CSV，后续 review / update 可只传 `sessionId + script/workspace + overrides` 复用这份旧表；显式 `previousCsv` 仍作为兼容 fallback 和重新选择旧表的入口。新增的 `check:localization-update` 与 `check:localization-update-http` 已覆盖 request seeding、session review reuse 和 session update reuse。这仍只是宿主记住“这次会话选的是哪份旧 CSV”，不改变 `audit-l10n-alignment-project` 或 `update-l10n-project` 的 alignment、候选评分、覆盖应用与 CSV 生成语义。
- 2026-06-13 已完成：SelfHostedEditor dev-host HTTP request body 第一轮硬化。`readJsonRequestBody()` 现在默认限制 JSON request body 为 4 MB，超限返回 413 JSON error；`check:http-bridge` 覆盖 BOM 剥离、超限 typed error 和 HTTP error status，并已接入 `check:model`。
- 当前执行顺序（2026-06-01）：
	1. 先巩固最近 SelfHostedEditor 回归边界：Preview 不得静默丢 `previewLines`，UTF-8 桥接不得再产生中文乱码，Flow 的 typewriter / wheel / `@` 标签行为和 loading 状态都要由 `check:model` / `check:structure` 继续守住。
	2. 第一实施节点继续留在 L10N 视图：review actions parity 已完成；下一刀若继续本线，应评估批量审校动作，但仍不要把真实 CSV 语义搬回浏览器。
	3. 第二实施节点再推进 Preview Runtime Player：Runtime smoke 现在已经守住 `/api/runtime-state` / `/api/runtime-action` 的 compact payload，以及 `advance-flow` / `rewind-flow` / `choose` / `continue` / `rewind` 契约；Runtime dev-host 已有第一层 `sessionId` 状态边界，下一刀更适合继续缩小 Runtime 不可用时的本地 fallback，或把其它 dev-host 桥继续收向更接近桌面客户端的会话模型，而不是重新扩展前端 presenter 状态机。
	4. 第三实施节点对齐 VSCode 与 SelfHostedEditor 的作者功能：先按 [VSCode / SelfHostedEditor 功能对齐盘点](vscode-self-hosted-editor-parity.md) 确认 diagnostics、completion、definition、references、hover、outline、本地化 review、stable node map、Host Schema / Host Bridge 提示等能力差异，再补高频作者入口。2026-06-01 已补 SelfHostedEditor `[query]` / `@emit` 的 Host Schema completion / hover、speaker / `@timeline` 的 Host Binding completion / hover / navigation、`Node Map` 稳定节点表 update / review 入口、L10N review actions parity，以及 Host Schema / Host Binding capability 查看视图；2026-06-02 已确认 refs overlay 作为 CodeLens / References Peek 的业务等价入口，并用 direct / HTTP smoke 守跨文件与未保存 draft；同日新增 SelfHostedEditor `check:semantic-parity-http` 与 VSCode `check:semantic-parity`，共同覆盖 diagnostics、completion、definition、references、hover、outline 六个作者语义入口；VSCode 侧也已补上本地化 review 后复用同一 previous CSV 继续 update 的命令式闭环；SelfHostedEditor 侧已补 Stable Node Map manual-review apply/dry-run，复用共享 CLI 并只更新可下载 sidecar payload。上述能力都走共享 LanguageServer capability 或 CLI / Tooling 契约。
	5. 第四实施节点整理 Editor Backend 会话边界：Runtime、line-map、localization baseline/update 已完成第一层 `sessionId` 状态边界；后续继续把 LanguageServer 与 workspace 这些开发服务器 + CLI 临时 workspace 桥逐步收成更接近桌面客户端的会话模型。短期可保留 HTTP dev bridge，但前端不得新增语义真相。
	6. Graph 视图设计优化暂时降级：现有端口连线、retarget、reference projection、缩放 / 平移和 Compiler graph 来源只守回归，不再把 graph layout sidecar 或交互设计作为近期主线。
	7. Unity / Bird 支持继续低优先级：只保留 importer 提交策略、真实 Timeline 绑定 Dry Run、Bird L10N 格式决策等准备项，不抢 SelfHostedEditor / VSCode parity 主线。
- 验证入口：`npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`、`check:structure`、`check:model`、`check:host-schema`、`check:host-schema-http`、`check:host-binding`、`check:host-binding-http`、`check:semantic-parity-http`、`check:references`、`check:references-http`、`check:node-map`、`check:node-map-http`，VSCode `check:semantic-parity`，以及 `dotnet build Inscape.slnx --no-restore`。最近一轮这些验证均已通过。

## 2026-05-19 最新收口

- Goal 7 的 `inscape.preview.sourceSyncMode = off|click|selection` 真实 VSCode smoke 已通过。
- Goal 11.1 的“LanguageServer 不可用 -> CLI diagnostics fallback”真实 VSCode smoke 已通过。
- VSCode 的 diagnostics、node completion、definition、references、hover、document symbols 与 Host Schema capability 已切到常驻 `LanguageServer` stdio 会话；CLI fallback 继续保留，但不再是常态热路径。
- 2026-05-19 用户重测 LanguageServer 体验反馈良好；预构建产物路径下的冷启动 / 热会话体感均无明显卡顿，日志未见 Inscape LanguageServer 崩溃或 stderr。Preview webview CSP 已补到 fallback 页面和主预览模板；`Ctrl+Hover` 链接态范围也已继续收口一刀，当前剩余尾项更偏人体工学微调。
- 2026-05-19 新增流程约束：用户指出 VSCode 近期实现再次出现不够符合重构 / 命名指南的写法。后续必须把 VSCode 重构收口重新列回计划，并把“每完成一个新功能节点就做一轮命名 / 分层 / 入口厚度自检”当作默认工作流，而不是可选项。
- 2026-05-19 新增目录边界澄清：用户明确 `Resources` / `Scripts` 的前提是模块足够独立；一旦采用这对目录，`Scripts` 应是代码侧父层，与 `Resources` 对偶，而不是只放 package-only 开发脚本。当前 VSCode 已先把开发脚本桶改成过渡性 `DevScripts`，避免继续误占 `Scripts` 语义位；但业务源码目录仍与其平级，完整 `Resources / Scripts` 终局结构仍待迁移。首批命名例外也已开始收口：`Scripts/ExtensionManifestEntry.js`、`PreviewHtmlDocumentTemplate.html`、`PreviewNavigationContractCheck.js`、`PreviewSourceSyncContractCheck.js` 已替换掉历史名。
- 2026-05-19 新增 Localization 分层判断：`VSCode/Scripts/Localization` 当前仍可保留，但只能把它视为宿主适配层；凡是未来别的宿主、自研编辑器也会需要的 review contract、candidate scoring、report model / view-model 组织，都不应默认留在 VSCode，而应优先评估下沉到 `Internal/Tooling` 或在需要编辑器查询能力时进入 `LanguageServer`。
- 2026-05-19 新增 line identity 设计原则：Inscape 行级 stable identity / sidecar 方案优先参考 Yarn Spinner 的 line id 思路；如遇到拆行、并行、刷新 diff、debug 展示等悬而未决点，先参考 Yarn Spinner 的显式 identity + 提取/同步工作流，而不是回退到更重的 heuristic 猜测。
- 2026-05-19 新增 line sidecar 主线：当前已起第一版 `LocalizationLineMapModel` / `LocalizationLineMapRefreshDomain`，并接上 `refresh-l10n-line-map-project` 命令入口与 `debug` 模式配置；hover 现在也已接入 `LocalizationLineMapDebugController`，能显示真实 `blockId / lineId / lineNumber / kind`，并在存在 speaker 时显示 `speaker`，且缓存会按 sidecar mtime/size 失效，刷新或恢复后 hover 不再读旧数据。第一版刷新命令还补了 `Show Summary`，能直接提示 changed / added / removed 统计，并已新增 `Show Details` 查看 block/change 摘要且支持跳到对应 source 行；规则回归已覆盖中间插删行、拆行保留首行 id、并行保留首行 id、重复句邻接修改、复杂替换按 remove/add 处理，同时已补 `localization.lineMap` 配置路径解析、writer `.backup` 快照、`Restore Backup` 恢复入口与 `LastSourceFingerprint` 漂移字段。drift 检测现在也已进入 refresh result/status 与 VSCode 显式决策流（Continue / Show Details / Restore Backup / Cancel），并附带操作建议；CLI `--report` 也已输出完整 refresh result，方便本地化模块后续直接消费。下一步重点回到本地化模块消费整合。
- 2026-05-19 Goal 15 第一版已完成：`audit-l10n-alignment-project` 现在会读取 `localization.lineMap` / 默认 `inscape.line-map.json`，在 sidecar 可用且未 drift 时把 `lineId` / line fingerprint / block-local line order 作为候选评分信号，并在 JSON / text report 中输出 line identity 状态与候选摘要；缺失 sidecar 保持旧行为，legacy / drift sidecar 只报告状态，不参与评分。
- 当前最值得继续推进的主线已经回到 Goal 10：G10.3 / G10.4、最小 review 输出闭环和 json report source jump 都已落地；最新一刀已给 localization review 补 `show-candidate-diff` 二级动作，由 Tooling presenter 生成 current / previous / translation / reason 摘要，VSCode 只展示宿主交互。下一步可继续细化本地化候选评分和编辑器 review 体验。
- 低优先级体验尾项：编辑区选项文字 `Ctrl+Hover` 的可点击下划线显示仍不稳定，但 `Ctrl+Click` 行为符合预期；`selection` 模式只驱动“已打开预览”的轻量跟随，不主动弹出新预览面板。

## 接力优先队列

下一位接手者建议按以下顺序推进。已完成的 Goal 0 / 3 / 4 / 5 / 6 / 7 / 9 / 11.1 不再放进优先队列，只保留在下方历史账本中。当前实际用户主线已经切到 SelfHostedEditor，因此本队列按“先稳住自研编辑器真实契约，再对齐 VSCode / SelfHostedEditor 作者功能，再推进可复用的本地化 / stable identity 能力”的顺序执行。Graph 设计优化与 Unity / Bird 支持明确降为低优先级；VSCode 不只做重构守规，还要与 SelfHostedEditor 做功能 parity 盘点，避免两边作者体验长期分叉。

1. **再推进 Stable Node ID 主线。**
	- 已完成：ADR 0013、stable node id / title map 契约、`update-node-map-project` sidecar 闭环、保守自动重命名识别、VSCode 显式 `Update Stable Node Map` 入口、插入标题后的自动同步、`inscape.node-map-update-report` 审查报告、CLI `--report`、VSCode `Review Stable Node Map Changes` 入口。
	- 下一步建议顺序：
		- 已推进：标题重命名审查已有 review item 列表、candidate 跳转、node map / raw report 入口，以及 manual-review 项的显式 `Apply candidate stable id`；candidate apply 语义已下沉到 Tooling / CLI `apply-node-map-candidate-project`。VSCode 只做 Quick Pick、dry-run 调用、`.review-backup.json` 与 `Revert last applied stable id` 文件恢复；SelfHostedEditor 通过 `/api/node-map-apply` 复用同一命令，浏览器阶段只更新可下载 sidecar payload。下一步可再评估 multi-apply 或桌面壳真实写盘/revert。
		- 已完成：G10.3 本地化 alignment / audit report。
		- 已完成：G10.4 相似文本只作人工候选，不静默继承旧译文。
2. **把本地化迁移闭环做实。**
	- 已完成：状态机、CSV / report 字段、anchor + occurrence + diff 对齐流程设计。
	- 已完成：显式 alignment / audit report，保护旧译文，标记 `kept` / `new` / `changed` / `removed` / `conflict` / `stale`。
	- 下一步建议顺序：
		- 细化候选评分：sequence / context / line anchor 权重继续校准，减少“该 changed 还是 conflict”的灰区。
		- 已推进：Quick Pick 已补主项摘要、candidate 二级跳转，以及 presenter 驱动的 candidate diff / secondary action；当前主项候选摘要也会在超过两个候选时显示 `+N more`，标题 candidate count 已按单复数显示。下一步可继续评估是否需要更强的批量审查或逐项查询能力。
		- 已完成 Goal 15 第一版：line sidecar refresh result / status / line id 信息已接入本地化 alignment audit，后续只需继续评估更强的 line identity 迁移契约或 report 体验。
		- 再评估是否给 `update-l10n-project` 增加可选 `--alignment-report`，但默认行为仍不应自动继承相似旧译文。
	- 注意：这条实际上依赖 Goal 10 的 stable node id 维护进一步落地，所以优先级排在 Goal 10 后半段，而不是独立抢跑。
3. **把 VSCode 重构守规重新列回近期计划。**
	- 先做一次最近新增代码巡检：重点看 `EditorAuthoring`、`Localization`、`Preview` 近期节点是否又引入了不够稳的 glue、跨业务拼装、命名倒退或入口增厚。
	- 后续每个 VSCode 功能节点完成后，立即补一轮命名 / 分层 / 目录 / 入口厚度自检；不能等到堆出下一轮大清理。
	- 已推进：VSCode 包新增 `npm --prefix src/ExternalSupport/VSCode run check:structure`，自动检查 `Scripts` 顶层业务目录、Role 目录、文件 / class 角色后缀和弱命名，作为节点后结构自检的可执行入口。
	- 如果发现某段 VSCode 逻辑本质上是可复用语义，而不是平台适配，应优先评估下沉到 `Tooling` 或 `LanguageServer`。
	- 对 `Localization` 尤其要做这一步：命令入口、QuickPick、文件对话框、打开报告、源跳转留在 VSCode；alignment review contract、candidate scoring、report model / view-model 组织优先评估下沉。
	- 2026-05-19 首轮 Localization 盘点结果：
		- `LocalizationCommand` 仍主要是 VSCode 宿主适配，可暂留 VSCode。
		- `LocalizationReviewController` 里 `report -> item list -> candidate action list -> jump` 的交互骨架已经接近跨宿主契约；当前 presenter model 组织已下沉到 `Internal/Tooling/Localization/LocalizationReviewPresenterModelBuilderDomain` 并挂入 `LocalizationAlignmentReportModel.Presenter`，VSCode 侧仅保留 `Scripts/Localization/Controllers/LocalizationReviewController` 作为宿主交互壳，以及 `Scripts/Localization/ViewModels/LocalizationReviewQuickPickAdapter` 作为 QuickPick 标签映射层。
		- `LocalizationAlignmentAuditDomain`、`LocalizationAlignmentReportModel`、candidate scoring 与状态机已在 `Internal/Tooling`，这条边界目前是对的。
		- 暂不新增 Localization review 的 LanguageServer 逐项查询 API；当前保持 CLI / Tooling 产出完整 report + presenter，宿主消费完整 report。只有未来需要 item / candidate 增量查询、长会话缓存或多宿主共享交互状态时，再进入 LanguageServer。
	- 新增：把 VSCode 的 `Resources / Scripts` 终局结构重新澄清并列入迁移计划；当前先以 `DevScripts` 作为过渡脚本桶，避免继续误用 `Scripts`；若确认采用这对目录，就不能让业务源码目录继续与最终 `Scripts` 平级。
	- 新增：清点并迁移当前命名例外文件，必要时发明符合既有风格的新名字，并把命名法补进规范，而不是长期保留历史名。
	- 2026-05-19 巡检首批发现：
		- `EditorAuthoringCommand` 原先又吸收了 stable node map review 的二级 Quick Pick、report 解析后的交互分发、source jump 与文件打开编排；其中 review UI 已拆到 `StoryNodeMapReviewController`，success action 分发也已收成 `handleNodeMapSelection`，当前剩余主要还是工具菜单入口、node map 命令入口与 CLI invocation 编排仍集中在同一入口类内。
		- `LocalizationCommand` 原先同时承担 export / update / audit 命令入口、报告读取、Quick Pick 渲染、candidate action 二级交互、location jump 和 CLI invocation 编排；其中 review UI 已拆到 `LocalizationReviewController`，success action 分发也已收成 `handleSuccessSelection`，当前剩余主要还是命令入口自身的参数采集与 CLI 调度职责。
		- `extension.js` 仍保持薄入口总体方向；`openLocation` / `locationFromPayload` 这类重复注入已开始收成共享 `locationServices`，文件打开 glue 也已收成 `openFileInEditor`。下一步要继续防止组合根参数表重新横向膨胀。
		- `Review Items` / report review 相关 UI 现在分别散在 `EditorAuthoringCommand` 与 `LocalizationCommand`，存在重复的 report->pick->action->jump 模式，后续应评估提炼为更窄的 review presenter / controller，而不是继续在 command 中平铺复制。
	- 已推进：第一轮命名例外已开始收口，`Scripts/ExtensionManifestEntry.js`、`PreviewHtmlDocumentTemplate.html`、`PreviewNavigationContractCheck.js`、`PreviewSourceSyncContractCheck.js` 已替换掉首批历史名；当前 `Scripts/` 下也已承接 `Entries/`、`DslScript/`、`Localization/`、`Preview/`、`EditorAuthoring/`、`HostSchema/`、`HostBinding/`；`AGENTS.md`、handoff、README 和回归流程里的当前验证入口也已同步到新路径。下一步继续清点剩余历史名并做迁移后的全局清扫。
4. **最后再挑 Tooling 单点收敛。**
	- 保持原则：继续落到 `DslScriptSources`、`ToolConfig`、`Preview`、`Localization`、`HostSchema`、`HostBinding` 等窄模块；不要新建泛化 `ProjectService`。
	- 只挑一个仍重复的跨 Cli / VSCode / LanguageServer 流程做小闭环，不把“顺手统一”混进主线节点。
5. **Unity / Bird 只做准备和决策。**
	- 待定：Bird 项目新增 importer 与 `InscapeGenerated` 资源提交策略。
	- 待验证：带真实 Timeline 绑定的 Bird Import Dry Run，确认 `talking.exit` 的 `TalkingEffectTM.PlayTimeline` 落地和其他 phase warning。
	- 低优先级：结合 Bird `L10N` 真实格式决定是否调整 Inscape CSV 字段和列顺序。
6. **自研编辑器进入方案化准备。**
	- 已新增 [自研编辑器架构方案](self-hosted-editor-architecture-plan.md) 与 [ADR 0017](adr/0017-self-hosted-editor-external-support-boundary.md)，结论是自研编辑器作为第一方宿主客户端落在 `src/ExternalSupport/SelfHostedEditor`，而不是进入 `Internal`。
	- 已创建 `src/ExternalSupport/SelfHostedEditor` 第一版静态工作台壳：Notion-like 写作表面、左栏编辑 / 右栏预览、`write-preview` / `write-only` / `preview-only` 布局切换、提示层弱化显示、本地化视图和节点图视图占位。
	- 已将左栏脚本区替换为第一版 Monaco 编辑表面，并保留现有预览、本地化、节点图和诊断的 UI-only 数据流；下一步继续接 `LanguageServer`。
	- 已新增浏览器文件选择入口，可导入单个 `.inscape` 脚本并刷新编辑区与预览；后续桌面壳应替换为真实项目工作区桥。
	- 已新增临时 UI-only 脚本模型，让预览、本地化草表和节点图预览消费同一份前端模型；后续需要替换为 `Tooling` / `LanguageServer` / `Runtime` 输出。
	- 已新增临时 UI-only 诊断面板，覆盖重复节点、缺失跳转目标和空选项文本，并支持跳回源行；后续需要替换为 `LanguageServer` diagnostics。
	- 已接入第一条 SelfHostedEditor 开发宿主诊断桥：当前脚本文本会先经本地预览服务器调用 `Inscape.LanguageServer --diagnose-file`，失败时再回退到 UI-only 草稿诊断。
	- 已接入第一条 SelfHostedEditor 开发宿主 hover 桥：Monaco 编辑区里的节点标题与 jump target 会先经本地预览服务器调用 `Inscape.LanguageServer --hover-file`。
	- 已把 SelfHostedEditor 诊断贴回 Monaco 编辑区：当前诊断除了保留底部可点击列表，也会同步渲染为编辑区内 markers。
	- 已把 SelfHostedEditor 状态栏接到诊断导航：当前底部状态栏会显示当前行、诊断来源和诊断数量，并支持 previous / next problem 导航。
	- 已把 SelfHostedEditor 底部诊断区收成 Problems 面板雏形：当前支持 severity 筛选、每类问题计数和 active-line 高亮。
	- 已把 SelfHostedEditor 侧栏 session 信息做成轻量状态面板：当前会显示 file、dirty state、source state、active view、layout mode 和 diagnostics backend。
	- 已推进 SelfHostedEditor 第一轮沉浸式写作表面收口：当前工作台视觉已从偏表单式工具壳收向更安静的 paper-like 写作表面，编辑区、预览区和控制区的留白、字重、层级与交互边框都更强调连续写作体验。
	- 已进入第二轮主界面硬重置：当前优先不再加新功能，而是把默认主视图重构成更接近 Inky / Notion 的沉浸式双栏写作器，收掉常驻厚面板和标签噪音，让编辑器 / 预览成为主舞台，辅助信息默认更淡、更小、更靠边，只在 hover / focus / 切换视图时增强。
	- 已继续推进 hover-first 辅助层：当前侧栏 session 信息、outline 元信息、预览底部 meta 与 diagnostics 区都在默认态进一步弱化，只在 hover / focus / active 时增强，继续减少主视图里的“解释性噪音”。
	- 已继续推进主视图缩骨：当前左侧导航进一步变窄、状态文字更短、顶栏来源信息更弱、右栏预览留白更大，目标是让主视图更像长期停留的写作桌，而不是功能说明页。
	- 已继续推进“少壳、多内容”的主舞台策略：当前按钮文案进一步缩短，状态栏改用更轻的箭头式问题导航，右栏 choice / diagnostics / meta 的默认存在感继续下降，优先让阅读层自己成立。
	- 已继续推进第三轮纸面收口：当前双栏主舞台的版心进一步收窄，左右栏背景与留白更接近同一张纸面，预览标题 / 正文 / choice 节奏继续往阅读页靠拢，侧栏、顶栏、状态栏和摘要也继续减重，避免“应用壳”抢走正文注意力。
	- 已继续推进“默认隐身、hover 显形”的侧边层：当前文件名、outline 标题、outline 次信息和侧栏元状态都进一步改成常态更淡、悬停后再增强，目标是把左栏做得更像安静目录，而不是常亮控制面板。
	- 已继续推进“目录化而非按钮化”的边缘层：当前左栏视图切换、文件打开入口、outline 条目和顶栏布局切换都进一步压低了控件感，尽量减少像表单按钮组那样的观感，让主舞台更像内容页而不是操作台。
	- 已继续推进“顶栏 / 底栏近乎隐身”的边缘策略：当前顶部模式切换、来源信息、底部摘要和问题导航都继续减重，只在 hover 时抬头，默认尽量不打断正文与预览的连续阅读。
	- 已新增底层约束：自研编辑器后续必须从“单文件壳”升级为“项目 workspace”，默认支持同目录多 `.inscape` 文件共享上下文、跨文件定义 / 引用 / 跳转 / 补全 / 重命名。
	- 已新增节点图方向约束：节点图长期明确参考 Yarn Spinner Graph View，支持 workspace 级图、节点拖拽改画布位置、图中改连回写文本真相，并把节点位置视为 sidecar / layout 元数据，而不是逻辑语义本身。
	- 已继续推进“轻导航、重正文”的主视图：当前左侧栏再次收窄，顶栏与状态栏继续减重，右栏预览留白继续增大，阅读区的诊断和辅助信息默认更弱，只在需要时浮出来。
	- 已开始进一步统一左右两栏的纸面感：当前编辑区背景和预览区背景继续向同一套淡纸面靠拢，目标是不再让左栏像“编辑器壳”、右栏像“展示壳”，而是让两边更像同一张写作桌的两面。
	- 已接入第一条 SelfHostedEditor 开发宿主 definition / references 桥：Monaco 编辑区里的节点标题与 jump target 会先经本地预览服务器调用 `Inscape.LanguageServer --definition-file` 与 `--references-file`。
	- 已接入第一条 SelfHostedEditor 开发宿主 completion 桥：Monaco 编辑区在书写 `-> target` 时会先经本地预览服务器调用 `Inscape.LanguageServer --completion-file` 获取节点补全。
	- 已接入第一条 SelfHostedEditor 开发宿主 outline 桥：侧栏 outline 会先经本地预览服务器调用 `Inscape.LanguageServer --document-symbols-file` 获取节点结构，并支持点击跳回源行。
	- 已接入第一条 SelfHostedEditor Monaco 语义级重命名雏形：编辑区里的节点标题与 jump target 现在支持 rename provider，并通过受控整文 patch 回写 `# 标题` 与匹配的 `-> 标题` 引用。
	- 已继续修正编辑交互：词级灰块高亮继续减轻，行号轨默认隐藏并改为 hover 显示完整数字，标题左侧引用候选开始转向不会撑开正文的 overlay 交互。
	- 已继续澄清编辑区行号语义：行号默认隐藏，显示时只表示 block 内局部行号；标题不显示行号，也不在默认写作表面显示 stable node id。稳定 line id 必须来自 localization line sidecar，SelfHostedEditor 在真正接入 sidecar 前只能显示 `id not loaded` 占位，不能伪造稳定 id。
	- 已新增节点图受控重命名雏形：节点图触发 rename 后会 patch 文本源中的 `# 标题` 与匹配的 `-> 标题` 引用，用于验证“图编辑回写文本源”的长期边界。
	- 已新增本地化会话草稿：本地化视图支持在当前会话内填写译文草稿，并用 `empty` / `draft` 状态区分；当前既可导出浏览器 draft CSV，也可在选择真实旧 CSV 后导出共享 CLI 生成的真实 updated CSV；若浏览器支持 native file handle，还可把 updated CSV 直接写回已链接旧文件，并把 linked baseline 明确标成 `clean / unsaved`。后续继续补更完整的 review 工作流。
	- 已新增工作区摘要状态：顶部状态栏显示节点数、本地化行数、译文草稿数和诊断数；后续可替换为真实项目工作区 / LanguageServer / Tooling 汇总。
	- 已接入 workspace 导入第一版：文件选择入口允许一次导入同目录多份 `.inscape`，并保留 workspace 名称、文件数与相对路径状态；跨文件语义解析后续继续接入。
	- 已继续推进 workspace 语义探测第二步：SelfHostedEditor 发给开发宿主的 diagnostics / completion / definition / references / hover 请求现在会附带当前 workspace 文档清单与活动文件相对路径，并优先改走 `LanguageServer` 的 project 级 probe；当前 marker / diagnostics 仍先只贴回活动文件。
	- 已继续推进 references overlay：候选项开始显示 `relative/path.inscape:Lxx` 来源标签与引用行正文预览，并支持从浮层切换到同一 workspace 的其他脚本文档；目标仍是完全替代会撑开正文的 inline peek。
	- 已继续推进标题 hover 操作：标题左侧 add / refs / edit / drag 控件改为更轻的 Notion-like 浮动胶囊；edit 入口复用语义级 node rename patch，并已从浏览器系统 prompt 改为自绘 rename dialog；drag handle 已从原生 HTML drag 改为按纵向位置命中最近标题的 pointer-drag，拖到另一标题附近会移动整个 block 的文本位置，不改逻辑跳转关系。
	- 已继续推进第一眼视觉收口：侧栏从窄工具条调整为更接近桌面写作客户端的工作区侧栏；主写作/预览表面去掉大面积暖色渐变，改为更克制的白色文档面；预览字体、标题间距和选项按钮比例已从夸张展示态回收到阅读态。
	- 已继续推进辅助信息降噪：底部状态栏、诊断区、workspace summary、L10N 表格和 Graph 卡片都改得更轻，避免在默认写作/阅读状态里呈现调试面板感。
	- 已继续推进编辑/阅读字体基线：写作区和预览区从偏装饰的 serif 调整为更接近 Notion 的系统 sans；当前 block 高亮改为轻灰，不再使用明显蓝色 selection 面。
	- 已继续推进交互与浮层质感：标题 hover 控件新增 `edit` 入口，接入现有语义级节点重命名 patch，并使用自绘 rename dialog 替代浏览器系统弹窗；Monaco hover / completion suggest 已覆写成当前白色文档面的轻浮层，减少默认 IDE 蓝色候选框割裂感。
	- 已继续推进节点图视觉：Graph 视图从普通卡片网格改为第一版 Yarn Spinner 方向的节点画布，包含点阵背景、绝对定位节点和 SVG 曲线连线；当前节点已经支持会话内自由拖拽并让连线跟随刷新。后续仍需补画布缩放/平移、节点位置 sidecar 和图中改连 patch。
	- 第一版建议从 Player Shell + Authoring Shell 开始：打开项目、接 LanguageServer、用 Runtime 跑 Narrative Graph、显示诊断 / 预览 / CSV / 本地化审查，并统一源位置跳转。
	- 编辑体验基线：默认左栏 Monaco 脚本编辑器、右栏运行 / 效果预览；跳转、提示、引用、错误提示、补全、Hover 和语义级重命名需要尽量对齐当前 VSCode 体验。
	- 布局基线：双栏可随时切换为仅编写或仅预览；布局切换不能丢失光标、选择、预览位置或运行状态。
	- 产品体验基线：书写和阅读体验对标 Notion，正文阅读优先，辅助提示安静低干扰。
	- 当前最近优先级：先把主编辑 / 预览视图做过体验线，再继续扩展 Localization / Node Graph / Runtime 视图能力；在主视图过线前，不再把“功能更多”误当成“更值得体验”。
	- 视觉基线：编辑器内容分为文本层和提示层；提示层默认淡灰、字号更小、低干扰，只在 hover / focus / selection 或可交互状态下增强高亮。
	- 视图基线：除编辑器视图、预览视图外，提前为本地化编辑视图和节点图视图保留架构位置；节点图长期需要既能编辑也是预览，但编辑结果必须通过受控 command / patch 回写文本源或 sidecar。
	- 平台基线：优先支持 Windows 与 macOS；iOS / Android 只保留远期低优先级可能性。
	- 在实现前先确认技术壳优先级：当前倾向 Tauri + Web UI + Monaco；如果 Windows 打包、进程管理或 .NET 调用链验证不合适，再用 ADR 调整。

## 剩余工作总览

- **当前可直接推进**：
	- 本地化候选评分 / 编辑器 review 体验细化。
	- 标题重命名人工确认流收尾。
	- VSCode 最近增量代码的命名 / 分层巡检与收口。
	- VSCode 结构自检脚本的规则继续按新增风险扩展。
	- VSCode `Resources / Scripts` 终局结构与命名例外收口。
	- Localization 宿主适配壳与宿主无关契约的进一步拆层。
	- Localization review view-model / query contract 下沉评估。
- **当前人工待办**：
	- 无。Goal 7 与 Goal 11.1 的真实 VSCode smoke 已在 2026-05-19 收口完成。
- **当前主线研发**：
	- 本地化候选评分 / 编辑器 review 体验细化。
	- Localization line sidecar 的后续契约细化与 report 体验评估。
	- stable node map / localization review 交互细化。
	- VSCode 重构守规与节点后自检机制。
	- G10.4.2 candidate scoring 细化：相似度并列时优先使用 sequence / line ranking penalty 收口误匹配，第二轮已加 context shape 信号，第三轮已加 keyword fingerprint 信号，第四轮已加 neighbor shape 信号，第五轮已加同节点前后翻译单元 local context fingerprint 信号，第六轮已加轻微改写前后文的 `near-local-context` 信号，第七轮已让 `same-line-id` 收敛同窗口内的近似文本候选，第八轮已允许精确 line id 在文本大改时仍保留人工审查候选，第九轮已让精确 line id 在排序上优先于纯文本相似度，第十轮已把 `rankPenalty` 暴露到 JSON / text report candidate，第十一轮已把 `rankPenalty` 接入 Tooling presenter 的 candidate summary / action status / diff detail，第十二轮已把 current / candidate `lineId` 接入 Tooling presenter 的 item / candidate / diff detail，第十三轮已让 presenter 同步显示 `lineIdentityStatus`（例如 `available` / `missing`），第十四轮已把 line fingerprint 以短 `fp` 摘要接入 review detail，第十五轮已把有 line id 的候选身份摘要接入 action status，第十六轮已把 current / previous line identity 摘要接入 diff action summary，辅助人工审查身份信号和排序依据。
- **低一层优先级但可随时切入**：
	- Tooling 单点收敛。
	- 体验细化后续项：`Ctrl+Hover` 链接态人体工学微调、Preview review 列表可读性。
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
	- [x] 已迁出第三条 VSCode command：`LocalizationCommand` 当前位于 `Scripts/Localization/Commands/LocalizationCommand.js`，本地化导出 / 更新行为保持不变。
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
- [~] 实现 stable node id sidecar 与标题重命名迁移流程。
	- [x] VSCode 新增显式 `Inscape: Update Stable Node Map` 命令，调用 `update-node-map-project` 并把活动未保存文档通过 `--override` 传给 CLI。
	- [x] VSCode `Inscape: Insert Node Title` 在插入成功后会静默同步 stable node map；同步失败只提示 warning，不回滚标题插入。
	- [x] 标题重命名已具备审查报告、review item 列表、candidate 跳转、显式 apply / revert / preview 操作。
	- [ ] 后续只需评估是否需要 multi-apply 或更强的批量审查流。
- [x] 定义并实现行级隐式 hash 的输入、规范化规则、版本号和碰撞处理。
- [x] 实现第一版本地化 CSV 提取，覆盖旁白、对白、选择提示和选择项。
- [x] 实现旧翻译表按锚点精确继承，并标记新增、保留、删除条目。
- [x] 设计旧翻译表的模糊匹配与人工确认流程；详见 [Localization Diff Alignment Contract](localization-diff-alignment-contract.md)。
- [x] 实现本地化 alignment / audit report：`audit-l10n-alignment-project` 输出 `inscape.localization-alignment` JSON，显式标记 `kept` / `new` / `changed` / `removed` / `conflict` / `stale`，相似旧译文只放入候选，不写入确认译文。
- [x] 将相似文本匹配收束为人工候选：高置信单候选输出 `changed`，低置信或并列候选输出 `conflict`，并在候选里附带 `reason` 说明，不静默复用旧译文。
- [x] 设计显式稳定 ID 或迁移表，用于处理节点重命名和重复文本插入。
	- [x] 决定标题不作为长期机器 ID，stable node id 由系统维护；标题仍是作者可见主身份。
	- [x] 定义 stable node id / title map 的 JSON 契约和冲突解决策略；详见 [Stable Node ID Contract](stable-node-id-contract.md)。
- [x] 实现本地化 alignment / audit report，用 stable node id、line anchor、occurrence 与 diff 保护已有译文。
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
- [x] 为 VSCode 预览补充更细粒度的未保存内容热刷新、局部更新、状态提示与可选源码同步策略。
	- [x] 预览 webview 在防抖等待和刷新时显示轻量“等待刷新...” / “刷新中...”状态，不改变故事状态、路径或 Compiler 输出。
	- [x] 未保存内容热刷新增加版本保护：保存或显式刷新会取消已挂起的 debounce timer，旧刷新完成不会清掉新一轮状态。
	- [x] 继续细化局部更新策略：详见 [VSCode Preview Refresh Strategy](vscode-preview-refresh-strategy.md)，VSCode 暂只局部处理状态、源码定位和纯 UI 状态，语义相关变化继续全量重渲染。
	- [x] 设计并实现第一版可选预览 / 源码同步模式：`inscape.preview.sourceSyncMode = off|click|selection`，默认 `click` 保持现有行为，`selection` 只驱动已打开预览。
	- [x] 新增自动化自检：`npm --prefix src/ExternalSupport/VSCode run check:preview-source-sync`，覆盖 `off` / `click` / `selection` 的关键边界。
	- [x] 新增可重复手动 smoke 入口：`npm --prefix src/ExternalSupport/VSCode run smoke:preview-source-sync -- -Mode <off|click|selection>`，统一生成临时工作区和模式设置。
	- [x] 补一次 VSCode 手动 smoke，确认 `off` / `click` / `selection` 三种模式的交互边界符合预期。
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
- [x] 若后续准备删除 CLI fallback，先补一次 LanguageServer 不可用场景下的 CLI diagnostics fallback 专项 smoke test。
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
