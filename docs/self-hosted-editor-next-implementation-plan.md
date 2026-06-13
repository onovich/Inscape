# SelfHostedEditor 下一阶段实施计划

状态：计划

适用范围：`src/ExternalSupport/SelfHostedEditor`

本文针对 SelfHostedEditor 当前剩余的三项主要架构债务制定实施计划：

1. 正式 backend 会话模型。
2. CSS 可维护性。
3. 继续减少 UI-only fallback 面积。

目标不是推倒重写，也不是把当前 dev host 立刻替换成完整桌面后端；目标是在保持现有 HTTP smoke、model contract、作者体验和共享语义契约不变的前提下，把下一阶段的边界铺稳。

## 当前基线

当前 SelfHostedEditor 已完成两轮重要收口：

- Dev host 已拆出 HTTP、API handler、payload、process、session、static asset、workspace bridge。
- UI controller 已拆到可维护范围，`Scripts/` 下没有超过 500 行的 JS。
- `ScriptDocumentModelBuilder` 已被 `ScriptDocumentFallbackPolicy` 包住，生产代码不能直接绕过 policy 使用草模。
- Backend migration map 和 ADR 0018 已明确：未来 backend 应使用业务窄接口，不把 `/api/*` 机械升级成通用 RPC。

当前仍存在：

- dev host 仍是临时 workspace + process-per-call 模型。
- Runtime、line-map、localization baseline 仍只是 dev-host bounded cache，不是正式 project session。
- CSS 文件已拆分，但 `SelfHostedEditorWorkspaceLayout.css`、`SelfHostedEditorEditorAuthoring.css` 等仍偏厚，缺少结构检查。
- UI-only fallback 已受控，但仍存在于 Preview、StoryGraph、Localization、Diagnostics、DocumentSymbols、Workspace Summary、EditorAuthoring 等路径。

## 总体目标

短期目标不是上线完整桌面后端，而是完成三个可验证的架构前置层：

| 主线 | 目标 |
|---|---|
| Backend session | 先建立 frontend-facing `EditorBackendClient` 和 session status contract，仍可调用现有 `/api/*` |
| CSS maintainability | 给样式建立 layer / feature / token 边界和结构检查，避免再次变成大 CSS |
| Fallback reduction | 把 fallback 从“可用兜底”推进到“显式降级模式”，正常 hosted 路径不能依赖草模 |

目标评分：

| 维度 | 当前 | 目标 |
|---|---:|---:|
| SelfHostedEditor 综合 | 8.7 | 8.9 |
| 产品化准备度 | 8.0 | 8.4 |
| CSS 可维护性 | 7.8 | 8.5 |
| Fallback 边界 | 8.3 | 8.8 |
| 回归体系 | 9.0 | 保持 9.0+ |

## 不改变项

所有阶段默认保持：

- 不改变 `Compiler` / `Tooling` / `LanguageServer` / `Runtime` 的语义。
- 不改变当前 `/api/*` 成功 payload shape。
- 不删除 dev-host smoke。
- 不把浏览器前端变成 parser、Runtime、localization alignment 或 node-map truth。
- 不把 dev-host bounded cache 当作正式 project session。
- 不把 CSS 重构混进行为重构。
- 不把 fallback 移除成硬失败；必须先有等价 shared contract 和用户可见错误状态。

## 主线 A：正式 backend 会话模型

### A0：冻结 backend 迁移边界

目标：

- 把现有 migration map 转为实施 checklist。
- 明确哪些是 UI state、哪些是 dev-host transport cache、哪些是 future backend project session。

交付：

- 更新 `docs/self-hosted-editor-backend-migration-map.md`，为每个 endpoint 增加 `implementationPhase`。
- 在 `README.md` 或 architecture plan 中补一句：当前实现仍调用 dev host，新增 client 只是边界适配。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

### A1：新增 frontend-facing backend client

目标：

- 在前端新增业务窄接口 `EditorBackendClient`。
- 第一版仍调用当前 `/api/*`，不引入新 transport。
- Controller / bridge 逐步依赖业务 client，而不是散落 fetch endpoint 细节。

建议目录：

```text
Scripts/Backend/
  Clients/
    EditorBackendClient.js
    SelfHostedEditorHttpBackendTransport.js
  Models/
    EditorBackendSessionStatusModel.js
```

第一批 client shape：

```text
languageSession
  diagnose
  hover
  definition
  references
  completions
  documentSymbols
hostCapabilities
  schemaCapabilities
  bindingCapabilities
storyGraph
  compileProjectGraph
runtimeSession
  startOrObserve
  step
lineIdentitySession
  refresh
localizationSession
  review
  updateCsv
stableNodeMap
  review
  applyCandidate
diagnostics
  sessionStatus
```

实施顺序：

1. 新增 client 和 transport，但先不迁移全部调用点。
2. 先迁 Runtime bridge、line-map bridge、localization bridge 这三类 session 意味最强的桥。
3. 再迁 LanguageServer-backed authoring endpoints。
4. 最后迁 node-map、host capability、story graph。

禁止事项：

- 不新增通用 `request(endpoint, payload)` 作为业务层入口。
- 不把 endpoint 名称泄漏到 controller。
- 不修改 response 字段名。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

完成标准：

- 新 client 只表达业务能力。
- 现有 bridge 仍保持薄适配。
- controller 不直接关心 transport 是 HTTP、desktop invoke 还是未来 sidecar。

### A2：建立 ProjectSession status contract

目标：

- 在现有 `/api/session-cache-status` 之上，设计未来 backend session status 的最小形状。
- 当前可以由 dev host 返回 `mode: "dev-host"`，不假装已经是正式 backend。

建议 format：

```json
{
  "format": "inscape.self-hosted-editor.backend-session-status",
  "formatVersion": 1,
  "mode": "dev-host",
  "workspace": {
    "source": "temporary-workspace",
    "documentCount": 0
  },
  "languageSession": {
    "kind": "process-per-request"
  },
  "runtimeSession": {
    "kind": "bounded-cache",
    "entryCount": 0
  },
  "lineIdentitySession": {
    "kind": "bounded-cache",
    "entryCount": 0
  },
  "localizationSession": {
    "kind": "bounded-cache",
    "entryCount": 0
  }
}
```

实施：

1. 保留 `/api/session-cache-status`。
2. 新增或扩展 diagnostics client 的 `sessionStatus()`，返回当前 dev-host status。
3. UI 状态面板只显示非内容元数据，不暴露 CSV、Runtime snapshot、line-map 内容本体。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

完成标准：

- 前端能区分 `dev-host` 与未来 `project-session`。
- session status 不泄漏内容。
- dev-host bounded cache 仍有 TTL / 容量边界。

### A3：常驻 LanguageServer 会话准备

目标：

- 不马上实现常驻进程，但把 backend client 和 dev host process bridge 的职责整理到可替换。
- 为未来 `LanguageSessionClient` 记录 request / response / invalidation 需求。

实施：

1. 为 diagnostics、hover、definition、references、completions、documentSymbols 建立统一 request model。
2. 明确 current draft / workspace documents / active document 的版本字段。
3. 不改变当前 HTTP smoke payload。
4. 在 migration map 中记录常驻 LanguageServer 需要的 session lifecycle。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

完成标准：

- SelfHostedEditor 与 VSCode parity 不退化。
- LanguageServer request 可以从 process-per-call 迁到 long-lived session，而无需改 UI controller。

### A4：Runtime / line-map / localization session 第一刀

目标：

- 把最像“会话”的三类能力从 dev-host cache 语义推进到 future session interface。
- 第一刀仍可使用现有 dev host cache 实现。

实施：

1. `RuntimeSessionClient`：start / observe / step。
2. `LineIdentitySessionClient`：refresh / status。
3. `LocalizationSessionClient`：selectBaseline / review / updateCsv / status。
4. 所有 session client 都带 `sessionId`、workspace identity、active document identity。
5. UI 只显示 session status，不把内容状态当真相。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
```

完成标准：

- Runtime、line-map、localization bridge 走同一类 session vocabulary。
- 当前 dev-host cache 不再被 UI 文案误称为正式 backend。
- 未来替换为 desktop backend 时，UI controller 不需要重写。

## 主线 B：CSS 可维护性

### B0：样式基线盘点

目标：

- 明确当前 CSS 文件职责和行数上限。
- 建立后续拆分不改视觉的基线。

当前重点文件：

```text
Resources/Styles/SelfHostedEditorWorkspaceLayout.css
Resources/Styles/SelfHostedEditorEditorAuthoring.css
Resources/Styles/SelfHostedEditorStoryGraph.css
Resources/Styles/SelfHostedEditorPreview.css
Resources/Styles/SelfHostedEditorLocalization.css
```

交付：

- 在 `docs/self-hosted-editor-css-architecture.md` 或本计划后续补充 CSS inventory。
- 标记每个 CSS 文件的 owner 和可接受上限。

建议上限：

| 类型 | 目标 |
|---|---:|
| token / base | 200 行以内 |
| feature CSS | 400 行以内 |
| layout CSS | 450 行以内 |
| temporary compatibility CSS | 必须写明删除条件 |

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

### B1：建立 CSS layer 和 token 边界

目标：

- 把颜色、间距、字体、z-index、transition、panel 尺寸等基础变量集中到 base / tokens。
- 功能 CSS 只消费 token，不自行发明大量新色值和尺寸。

建议结构：

```text
Resources/Styles/
  SelfHostedEditorWorkbench.css
  SelfHostedEditorBase.css
  SelfHostedEditorTokens.css
  SelfHostedEditorWorkspaceLayout.css
  SelfHostedEditorEditorAuthoring.css
  SelfHostedEditorPreview.css
  SelfHostedEditorStoryGraph.css
  SelfHostedEditorLocalization.css
  SelfHostedEditorHostCapability.css
  SelfHostedEditorDiagnosticsStatus.css
  SelfHostedEditorLoadingState.css
```

规则：

- `Workbench.css` 只负责 import 顺序。
- `Tokens.css` 只定义 custom properties。
- feature CSS 不定义全局 reset。
- layout CSS 不写 feature-specific 视觉细节。
- 不新增一色系大面积主题；保持当前克制、工具型 UI。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
```

完成标准：

- 样式 import 顺序稳定。
- 变量命名能表达用途，而不是具体颜色。
- 页面视觉不发生非目标性变化。

### B2：拆 WorkspaceLayout 和 EditorAuthoring CSS

目标：

- 把两个最大 CSS 文件拆到更窄 ownership。

建议拆分：

```text
SelfHostedEditorWorkspaceShell.css
SelfHostedEditorSidebar.css
SelfHostedEditorTopbar.css
SelfHostedEditorStatusBar.css
SelfHostedEditorEditorFrame.css
SelfHostedEditorLineHintRail.css
SelfHostedEditorAuthoringDecorations.css
SelfHostedEditorReferenceOverlay.css
```

拆分顺序：

1. Workspace shell / sidebar / topbar / status bar。
2. Editor frame / Monaco shell。
3. Hint rail / stable id。
4. Semantic decorations / reference overlay。

禁止事项：

- 不改布局行为。
- 不重新引入页面级滚动。
- 不让 Preview 和 Monaco 共享滚动容器。
- 不更改 class name，除非同步更新 model contract。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

完成标准：

- 单个 CSS 文件原则上不超过 450 行。
- Feature class ownership 可从文件名判断。
- Hover / active / loading / error 状态仍可读。

### B3：增加 CSS structure contract

目标：

- 把 CSS 边界变成可自动检查的规则。

建议新增：

```text
DevScripts/SelfHostedEditorStyleStructureContractCheck.js
```

检查内容：

- `SelfHostedEditorWorkbench.css` 只包含 `@import`。
- CSS 文件行数超过阈值时 fail 或 warning。
- 禁止新增 `Utils` / `Common` 风格样式文件名。
- 检查关键 CSS 文件是否被 import。
- 检查 `Resources/Styles` 下未被 import 的孤儿 CSS。
- 检查过多硬编码颜色是否集中到 feature 文件中。

接入：

```json
{
  "check:style-structure": "node DevScripts/SelfHostedEditorStyleStructureContractCheck.js"
}
```

并接入 `check:structure` 或至少在 README 中列为必跑。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

完成标准：

- CSS 结构退化能被自动发现。
- 后续新增视图时不会顺手塞回大 CSS。

## 主线 C：继续减少 fallback 面积

### C0：fallback 使用点分级

目标：

- 给当前 `ScriptDocumentFallbackPolicy` 的 reason 增加等级，明确哪些可以长期保留，哪些必须迁移。

建议分级：

| 等级 | 含义 |
|---|---|
| `offline-only` | 离线浏览器壳可保留，不能覆盖 hosted shared result |
| `temporary-hosted-fallback` | 临时兜底，已有 shared contract，后续应减少 |
| `migration-target` | 应迁往 LanguageServer / Tooling / Runtime / backend session |

当前 reason 初判：

| Reason | 建议等级 | 后续方向 |
|---|---|---|
| `editor-authoring-surface-offline-model` | offline-only | 保留为 UI geometry / hints fallback |
| `workspace-summary-status` | migration-target | 迁到 project summary shared model |
| `diagnostics-language-server-unavailable` | temporary-hosted-fallback | 保留可见降级状态，不新增语义 |
| `document-symbols-language-server-unavailable` | temporary-hosted-fallback | 常驻 LS 后减少依赖 |
| `preview-compiler-graph-unavailable` | temporary-hosted-fallback | Runtime / Compiler graph 正常路径继续加强 |
| `story-graph-compiler-graph-unavailable` | temporary-hosted-fallback | 只作为 offline graph preview |
| `localization-review-unavailable` | temporary-hosted-fallback | hosted 正常路径必须走 Tooling presenter |

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

完成标准：

- model contract 覆盖 reason catalog 的等级。
- README 记录 fallback 使用边界。

### C1：fallback 用户可见状态收口

目标：

- fallback 不再只是 console warning 或 provider 字段，而是在 UI 中明确表达“当前正在降级”。

实施：

1. Diagnostics：显示 LanguageServer unavailable / Draft fallback。
2. Preview：Compiler graph unavailable 时显示明确 provider；Compiler graph malformed 仍显示 contract error。
3. StoryGraph：Compiler graph unavailable 时标记 offline draft graph。
4. Localization：Review unavailable 时禁用真实 updated CSV，并说明原因。
5. DocumentSymbols：Outline fallback 时显示 Draft outline。

禁止事项：

- 不把 fallback 状态做得像正常成功。
- 不用 fallback 覆盖 shared malformed payload。
- 不因为显示 fallback 状态而改变 payload shape。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

完成标准：

- 用户能看出当前能力来自 shared backend 还是 draft fallback。
- 关键降级路径有 model contract。

### C2：Workspace summary 迁出草模

目标：

- `ProjectWorkspaceSummaryModelBuilder` 不再依赖草模解析作为 hosted 正常路径。
- 优先消费 Compiler graph / LanguageServer document symbols / localization presenter 中已有信息。

实施顺序：

1. 新增 `WorkspaceSummaryBackendModelBuilder`，从已有 hosted payload 聚合 node count、diagnostics count、localization rows、runtime state。
2. `ScriptDocumentFallbackPolicy` 只在 backend summary 不可用时用于 offline summary。
3. model contract 覆盖 hosted summary 优先级。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

完成标准：

- `workspace-summary-status` reason 从常规路径退到 offline-only。
- Summary 不再诱导前端维护第二套 node/localization count truth。

### C3：DocumentSymbols fallback 降级

目标：

- Outline 正常路径必须来自 LanguageServer document symbols。
- fallback 只在 LS 不可用时作为离线浏览器模式。

实施：

1. 在 `SelfHostedEditorDocumentSymbolBridge` 中区分 `language-server`、`draft-fallback`、`unavailable`。
2. UI 显示 provider。
3. structure / model contract 守住 fallback policy reason。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- Outline fallback 不再被误认为 shared symbol truth。

### C4：Preview / StoryGraph fallback 再收窄

目标：

- Preview 和 StoryGraph 只有在 Compiler graph unavailable 时才使用 draft model。
- Compiler graph 返回 malformed 数据时必须报错。

当前已有基础，需要继续巩固：

- `PreviewCompilerGraphContractGuard` 已防止 `previewLines` 丢失被草模掩盖。
- StoryGraph fallback 应只作为 offline graph。

实施：

1. 为 StoryGraph 增加类似 graph provider 状态显示。
2. model contract 增加 StoryGraph hosted graph malformed / unavailable 区分。
3. 评估是否把离线 graph fallback 从 normal render 入口移到显式 offline mode。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- 正常 hosted 路径不依赖草模 graph。
- 离线 fallback 是产品状态，不是静默替换。

### C5：Localization fallback 收口

目标：

- Localization 正常路径只消费 Tooling presenter。
- Draft table 只在 review bridge unavailable 时作为离线草稿表。

实施：

1. `LocalizationReviewRowsModelBuilder` 增加 provider-aware model。
2. Draft fallback 模式下禁用或解释真实 CSV update / replace。
3. Hosted review 为空和 review unavailable 分开处理。
4. Model contract 覆盖“不把 draft row 混进 hosted presenter”。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

完成标准：

- Hosted review table 与 draft fallback table 明确分开。
- CSV update 语义继续只走 Tooling / CLI。

## 推荐执行顺序

建议按 10 个小阶段推进：

1. `docs: phase self hosted backend session implementation`
2. `refactor: add self hosted backend client adapter`
3. `refactor: route runtime line-map localization through backend client`
4. `refactor: route language endpoints through backend client`
5. `docs: inventory self hosted css ownership`
6. `refactor: split self hosted workspace css`
7. `refactor: split self hosted editor authoring css`
8. `test: add self hosted style structure contract`
9. `refactor: classify self hosted draft fallback reasons`
10. `refactor: narrow self hosted summary and outline fallbacks`

不要把 backend client、CSS 拆分、fallback 迁移塞进同一个提交。

## 验证矩阵

| 改动区域 | 必跑 |
|---|---|
| Backend client / transport | `check:syntax`, `check:structure`, `check:model`, `check:semantic-parity-http` |
| Runtime session | `check:runtime-http`, `check:session-cache-http` |
| Line-map session | `check:line-map-http`, `check:session-cache-http` |
| Localization session | `check:localization-review-http`, `check:localization-update-http`, `check:session-cache-http` |
| Language endpoints | `check:semantic-parity-http`, `check:references-http`, VSCode `check:semantic-parity` |
| CSS | `check:syntax`, `check:structure`, `check:static-assets`, `check:static-assets-http`, future `check:style-structure` |
| Fallback policy | `check:structure`, `check:model`, affected HTTP smoke |

阶段性大验收：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
```

## 风险和控制

### 风险：backend client 变成通用 RPC 壳

控制：

- 只暴露业务能力方法。
- structure check 禁止 controller 直接拼 `/api/` endpoint。
- 保留 migration map 作为对照。

### 风险：CSS 拆分导致视觉回归

控制：

- 每轮只拆一个样式 owner。
- 不改 class name 和布局语义。
- 先加 style structure check，再继续大拆。

### 风险：fallback 缩小导致离线模式不可用

控制：

- 不直接删除 fallback。
- 先加 provider 状态，再逐步从 hosted 正常路径移除。
- 每次只处理一个 reason。

### 风险：session 状态泄漏用户内容

控制：

- session status 只暴露 count、byteLength、age、provider、mode。
- 不暴露 Runtime snapshot、CSV 内容、line-map 内容本体。

### 风险：process timeout contract 抖动

控制：

- 将 timeout contract 中依赖 50ms stdout flush 的断言改为更稳的 handshake 或更长 timeout。
- `check:model` 应避免偶发时序失败。

## 完成标准

本计划完成后应达到：

- 前端桥接层有业务窄接口，未来替换真实 backend 不需要重写 UI controller。
- Runtime / line-map / localization baseline 有统一 session vocabulary。
- CSS 文件有明确 owner、import 顺序和结构检查。
- `ScriptDocumentFallbackPolicy` 不只是入口门禁，还能表达 fallback 等级和迁移方向。
- Hosted 正常路径的 Summary、Outline、Preview、StoryGraph、Localization 不再静默依赖草模。
- SelfHostedEditor 架构评分稳定在 8.9 左右，继续保留 dev host 作为可靠 smoke 面。
