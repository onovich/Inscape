# SelfHostedEditor backend migration map

状态：草案

最后更新：2026-06-15

本文记录 SelfHostedEditor 从当前 dev host 迁向产品化 editor backend 时的边界图。它不是立即实现 backend 的施工单；它用来防止后续把临时 HTTP server、浏览器 UI state、Runtime / Tooling / LanguageServer 语义状态混成一团。

相关 ADR：

- [ADR 0018：SelfHostedEditor backend 使用业务窄接口并区分 session 状态](adr/0018-self-hosted-editor-backend-session-boundary.md)
- [ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](adr/0019-self-hosted-editor-embedded-backend-v0.md)
- [ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)

## 当前结论

当前 `src/ExternalSupport/SelfHostedEditor/DevScripts` 仍应保持轻量开发服务器职责：

- 提供本地静态资源和 JSON API transport。
- 为 smoke test 真实调用 CLI / LanguageServer / Runtime。
- 用 bounded cache 缓存 runtime snapshot、line-map sidecar、localization baseline 这三类 dev-host transport state。
- 不成为正式 project session，不保存长期 workspace 状态，不绕过 `Internal` 语义契约。

未来产品化 backend 应承担 long-lived project session：

- 打开的 workspace、当前文档版本、dirty buffer 与文件系统权限。
- 常驻 LanguageServer 会话。
- Runtime project session。
- line-map sidecar 生命周期。
- localization baseline 选择、文件 handle / path / mtime 与写回状态。
- 可观测的 session status 和 backend diagnostics。

前端仍只做 UI state：

- active view、layout mode、panel collapse、hover / selection、scroll position。
- Monaco 光标、临时 overlay、filter mode、当前可见行。
- 未写回前的用户输入草稿可以先在 UI store 中存在，但真实 CSV merge、alignment、line identity 和 Runtime 进度仍属于 `Tooling` / `LanguageServer` / `Runtime` 或未来 project session。

2026-06-13 / 2026-06-15 现状补充：前端已有 `inscape.self-hosted-editor.project-session` 状态投影和 `inscape.self-hosted-editor.language-session-request` 请求 envelope，但它们仍是 dev-host mode 的迁移词汇。`EditorBackendClient.projectSession.status()` 只投影 `/api/session-cache-status` 的非内容计数、language-session mode / supported endpoints 与 workspace request snapshot 元数据；`EditorBackendClient.languageSession.*` 只把当前请求包成 session-aware shape，再展开到既有 `/api/*`。可选 `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 只作为 diagnostics / documentSymbols 的可回退 spike，未覆盖的 completions / definition / references / hover 继续走 process-per-request fallback，不代表正式 backend 已完成。

2026-06-15 P0 收口补充：进入 desktop backend v0 前的 current-stage readiness 已完成。Workspace Summary 当前接受 hosted aggregation summary 作为 normal path，不再标为 shared project-summary migration target；draft summary 只在 hosted Compiler graph 或 hosted localization presenter inputs 不完整时使用。fallback catalog 当前不再包含 current-stage `migration-target`。这些结论不改变正式 backend v0 的施工范围：Electron shell、embedded EditorBackend、DocumentBufferStore、autosave / recovery 与 workspace filesystem boundary 仍属于 P1。

2026-06-14 决策补充：desktop backend v0 采用嵌入式 EditorBackend，而不是独立 sidecar daemon。它是 SelfHostedEditor 桌面产品的编辑器应用后端 / 宿主编排层，优先服务一个 SelfHostedEditor 桌面窗口和一个 active project session。VSCode 继续使用 extension + LanguageServer + Tooling / Runtime contracts；Web dev host 继续作为开发验证和 smoke test 工具。v0 代码仍必须通过 `EditorBackendClient` / transport 边界保持未来可 sidecar 化。

2026-06-14 产品补充：desktop shell v0 采用 Electron；一个窗口只打开一个 workspace folder，workspace 是目录并支持多个 `.inscape` 文件，不提供正式打开单文件功能。默认自动保存，UI 与 embedded backend 都持有未保存内容，backend 是 session truth；崩溃恢复依赖磁盘 recovery snapshot。localization CSV、node-map sidecar 和 line-map sidecar 写回前默认自动备份；Git 只作为可选增强，不作为唯一恢复机制。

## 状态分类

| 分类 | 当前例子 | 未来归属 | 规则 |
|---|---|---|---|
| Editor UI state | active view、layout、hover line、filter mode、refs overlay anchor | browser / desktop UI | 可丢失，不参与 shared 语义，不作为后端真相。 |
| Dev-host transport cache | `runtime` snapshot、`line-map` sidecar、`localization-baseline` CSV | 当前 dev host only | 有 TTL / 容量上限，只为减少重复上传或恢复上一帧，不是正式保存。 |
| Backend project session | workspace、document buffers、LanguageServer process、Runtime session、baseline file identity | future editor backend | 可持续、可观测、可恢复，必须保持 Internal contract shape。 |
| Shared semantic truth | Compiler graph、LanguageServer diagnostics/references、Tooling localization presenter、Runtime state | `Internal` | 不在 SelfHostedEditor 前端或 backend 复制算法。 |

## Endpoint migration table

`implementationPhase` 是当前下一阶段施工顺序，不代表正式 backend 已经实现。所有 phase 默认先通过 frontend-facing `EditorBackendClient` 调用现有 `/api/*`，再逐步替换底层 transport。

| Endpoint | 当前 dev-host 行为 | 未来 backend service | 状态分类 | implementationPhase | 迁移要求 |
|---|---|---|---|---|---|
| `/api/diagnostics` | 用当前 script/workspace 调 LanguageServer diagnostics | `LanguageSessionClient.diagnose` | Backend project session | A3 language-session request model | 走常驻 LanguageServer；保持 diagnostics payload shape。 |
| `/api/hover` | 用 hover kind/name 调 LanguageServer hover | `LanguageSessionClient.hover` | Backend project session | A3 language-session request model | 只传定位/target，不在前端重算 hover 文案。 |
| `/api/definition` | 用 definitionName 调 LanguageServer definition | `LanguageSessionClient.definition` | Backend project session | A3 language-session request model | sourcePath 继续 workspace-relative。 |
| `/api/references` | 用 referenceName 调 LanguageServer references | `LanguageSessionClient.references` | Backend project session | A3 language-session request model | 保留 current draft 参与和跨文件结果。 |
| `/api/completions` | 用 current draft 调 LanguageServer completions | `LanguageSessionClient.completions` | Backend project session | A3 language-session request model | 常驻会话可增量优化，但 payload 不改名。 |
| `/api/document-symbols` | 用 current draft 调 LanguageServer document symbols | `LanguageSessionClient.documentSymbols` | Backend project session | A3 language-session request model | Outline 只消费 shared symbols。 |
| `/api/host-schema-capabilities` | 调共享 HostSchema capability 流程 | `HostCapabilityClient.schemaCapabilities` | Backend project session / cache | A1 backend client adapter | 可缓存 catalog，但 schema 真相仍来自 Tooling / LanguageServer。 |
| `/api/host-binding-capabilities` | 调共享 HostBinding capability 流程 | `HostCapabilityClient.bindingCapabilities` | Backend project session / cache | A1 backend client adapter | 不解析 Host Bridge JSON 到前端私有模型。 |
| `/api/story-graph` | 调 CLI `compile-project` 并 compact graph payload | `StoryGraphClient.compileProjectGraph` | Backend project session | A1 backend client adapter | Compiler graph 仍是图真相；UI graph layout 另做 view state。 |
| `/api/runtime-state` | 调 `runtime-project` 启动 snapshot 并记入 bounded cache | `RuntimeSessionClient.startOrObserve` | Backend project session | A4 runtime session interface | 迁到 long-lived Runtime project session；dev cache 不再是正式状态。 |
| `/api/runtime-action` | 用 request state 或 cached state 调 `runtime-project` action | `RuntimeSessionClient.step` | Backend project session | A4 runtime session interface | action 只透传，浏览器不模拟 Runtime。 |
| `/api/line-map-refresh` | 调 line-map refresh，使用 request sidecar 或 cache sidecar | `LineIdentitySessionClient.refresh` | Backend project session | A4 line-identity session interface | sidecar 应绑定 workspace / document identity / mtime。 |
| `/api/session-cache-status` | 暴露 dev-host bounded cache 状态与 language-session mode / supported endpoints | `BackendDiagnosticsClient.sessionStatus` | Dev-host diagnostic | A2 backend session status contract | 产品 backend 可保留观测接口，但不能暴露 Runtime / CSV / line-map 内容本体；stdio spike 只声明 diagnostics / documentSymbols。 |
| `/api/node-map-review` | 调 `update-node-map-project --report` 并 compact report | `StableNodeMapClient.review` | Backend project session | A1 backend client adapter | 继续消费 Tooling report；前端不做 candidate scoring。 |
| `/api/node-map-apply` | 调 shared candidate apply，返回 dry-run / sidecar payload | `StableNodeMapClient.applyCandidate` | Backend project session | A1 backend client adapter | 写回必须由 Tooling / CLI command 执行或预览，不在浏览器私改 sidecar。 |
| `/api/localization-review` | 调 localization extract/audit，session 记住 previous CSV | `LocalizationSessionClient.review` | Backend project session | A4 localization session interface | baseline 应绑定文件身份；Presenter shape 保持 `presenter.items`。 |
| `/api/localization-update` | 调 shared CSV update，应用 anchor overrides | `LocalizationSessionClient.updateCsv` | Backend project session | A4 localization session interface | CSV merge 仍由 Tooling / CLI 执行；前端只提供 overrides 和保存意图。 |

## Backend-facing client shape

未来前端或桌面壳面对 backend 时，应暴露按业务命名的窄 client，而不是把当前 `/api/*` 机械包成通用 RPC：

```text
EditorBackendClient
  languageSession
    diagnose(request)
    hover(request)
    definition(request)
    references(request)
    completions(request)
    documentSymbols(request)
  hostCapabilities
    schemaCapabilities(request)
    bindingCapabilities(request)
  storyGraph
    compileProjectGraph(request)
  runtimeSession
    startOrObserve(request)
    step(request)
  lineIdentitySession
    refresh(request)
  localizationSession
    review(request)
    updateCsv(request)
  stableNodeMap
    review(request)
    applyCandidate(request)
  diagnostics
    sessionStatus()
```

约束：

- 每个 client method 对应业务能力，不对应 HTTP transport 细节。
- request / response 保持现有 shared payload shape，必要时只裁剪未使用字段。
- 如果同一能力同时被 VSCode 和 SelfHostedEditor 需要，优先把 presenter / model 下沉到 `Internal`，不要在 backend client 中发明新语义。
- Backend 可以改变传输协议，但前端控制器不应知道是 HTTP、stdio、WebSocket 还是 desktop invoke。

## Runtime session requirements

未来 Runtime project session 至少需要：

- workspace identity。
- current compiled graph / source revision。
- current Runtime snapshot。
- action history / path。
- localization / language context。
- host bridge event boundary。

不做：

- 浏览器不保存 Runtime 真相。
- Preview Flow presenter 不再长期保存节点内进度真相；Runtime 可用时只显示 Runtime reading progress。
- Runtime session 不解析 `.inscape` 源文本，只消费 Compiler / Tooling 产物。

## Line-map session requirements

未来 line identity session 至少需要：

- workspace identity 和 document path。
- current line-map sidecar。
- source file revision / mtime。
- previous sidecar provenance。
- refresh report / conflicts for UI display。

不做：

- 前端不生成稳定 line id。
- dev-host cache 中的 `line-map` 不能被当作项目 sidecar 的长期保存位置。

## Localization baseline requirements

未来 localization session 至少需要：

- selected previous CSV file identity、path 或 file handle。
- byte length / mtime / last reviewed source revision。
- current alignment report presenter。
- draft override set keyed by anchor。
- write-back capability and dirty/clean state。

不做：

- 前端不合并真实 CSV。
- 前端不重算 alignment、candidate score、stale/conflict 状态。
- `previousCsv` request body 只作为 dev-host fallback，不应成为产品 backend 的主要长期状态传输方式。

## Migration order

1. 保持现有 dev host API 和 smoke tests 不变。
2. 在前端增加窄 `EditorBackendClient` adapter，先调用现有 `/api/*`。
3. 把 Runtime / line-map / localization baseline 从 dev-host cache 语义迁为 backend project session 语义。
4. 让 LanguageServer 变成常驻会话，而不是每次请求启动进程。
5. 仅在 backend session 稳定后，再评估 WebSocket / desktop invoke / stdio transport。

## Validation gates

迁移期间每次 backend / API 改动至少跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
```

完成产品化 backend 前，不能删除 dev-host smoke。dev host 继续作为轻量本地验证面，直到正式 backend 有等价或更强的 session smoke。
