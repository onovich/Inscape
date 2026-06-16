# SelfHostedEditor backend migration map

状态：草案

最后更新：2026-06-17

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

2026-06-16 P1 Round 25 补充：`EditorBackendClient.documentBuffer.*` 已成为显式业务入口，覆盖 list / read / updateDraft / saveDocument / saveAll。当前实现仍是 contract layer：saveDocument / saveAll 返回 text-free save status、workspace boundary 和 revision 结果，用于接上手动 Save 命令面；真实 Electron 文件 IO、autosave debounce、flush 和 recovery 仍属于后续 P1 施工。

2026-06-16 P1 Round 26 补充：DocumentBuffer 现在包含 `lastSavedRevision` clean baseline。updateDraft 推进 dirty revision 时保留 baseline，saveDocument / saveAll 成功后刷新 saved revision；当观测到的磁盘 hash 与 buffer baseline 不一致时，保存返回 text-free `disk-conflict` error。真实磁盘读取 / 写入、mtime 检查和冲突 UI 仍待后续 embedded backend handler 落地。

2026-06-16 P1 Round 27 补充：backend autosave 先落为 `buildAutosavePlan()` contract。plan 根据 autosave enabled、idle debounce 和 dirty `.inscape` buffer 生成 text-free save request，并把低于当前 revision 的 pending write 标为 `stale-autosave-revision`。真实 timer、文件写入、flush 和 recovery 仍待后续轮次。

2026-06-16 P1 Round 28 补充：flush rules 先落为 `buildFlushPlan()` contract。plan 覆盖 manual Save、close window、switch workspace、app exit，用当前 dirty backend buffer 的 latest revision 生成 text-free flush request；unsafe write target 进入 blocking issue，save failure 进入 visible failure，真实文件 IO 和 recovery snapshot 仍待后续 embedded backend handler 落地。

2026-06-16 P1 Round 29 补充：recovery snapshot 先落为 `buildRecoverySnapshotPlan()` contract。plan 为 dirty backend buffer 生成含文本、mtime、revision、content hash 的 recovery snapshot write payload，同时提供 text-free `recoveryStatus` 和 save success cleanup request。真实磁盘写入、启动扫描和恢复 UI 仍待后续轮次。

2026-06-16 P1 Round 30 补充：recovery UI 先落为 ProjectSession summary projection 与 action request contract。session panel 只显示 recovery 状态和可恢复文件名；restore / discard / later 分别表达写回、抑制后续提示、保留 snapshot。真实扫描、删除 snapshot 和恢复写回仍待后续 IO 层。

2026-06-16 P1 Round 31 补充：`.inscape-workspace/` 策略先落为 `buildInternalWorkspacePlan()` contract。plan 列出 recovery / backups / cache 内部目录，标记 non-project-truth、默认 git ignored、cache 可重建，并给出 `.gitignore` 追加 `.inscape-workspace/` 的建议。真实 mkdir / gitignore 写入仍待 IO 层。

2026-06-17 P1 Round 32 补充：write-back backup 先落为 `EditorBackendWorkspaceBackupPlanModel.buildPlan()` contract。plan 只覆盖 localization CSV、node-map sidecar、line-map sidecar 写回前 backup，生成 `.inscape-workspace/backups/` 下的 backup request 与 retention cleanup candidates；不复制文件、不删除旧备份，也不把 `.inscape` 正文混入该备份策略。

2026-06-17 P1 Round 33 补充：external resource import 先落为 `EditorBackendWorkspaceAssetImportPlanModel.buildPlan()` contract。plan 只生成图片 / 音频 / CSV 复制到 workspace `assets/images|audio|data` 的 text-free copy request，不持久化 workspace 外路径；未知扩展跳过，`assets/**` 写目标优先于扩展名规则。真实文件复制、文件选择器和项目写入仍待 IO 层。

2026-06-17 P1 Round 34 补充：settings 分层先落为 `EditorBackendSettingsSchemaModel.buildSchema()` contract。schema 集中 autosave、backup retention、默认资源目录、资源导入策略等默认值，并区分 global user preferences 与 workspace project behavior；设置页、配置文件读写和迁移仍待后续 backend command / IO 层。

2026-06-17 P1 Round 35 补充：v0 最小闭环先落为 `smoke:desktop` contract smoke。该入口串起 open workspace、DocumentBuffer edit、autosave、manual Save、recovery snapshot、diagnostics / completion bridge、Runtime choose action，验证 backend payload 边界；不启动 Electron、不执行真实文件 IO、不替代 Windows package smoke。

2026-06-17 P1 Round 36 补充：Windows internal package 先以 `smoke:desktop-startup` 等价本机启动 smoke 收口。该入口验证 package / lockfile、Desktop entry、Workbench entry、preload whitelist 与 contract loop；当轮显式记录未安装 Electron runtime、未生成 Windows package。

2026-06-17 P1 Round 37 补充：真实 Electron runtime / 启动入口先落为 `smoke:desktop-runtime`。该入口运行 Electron CLI `--version`，再以 `SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART=false` 启动 runtime probe，验证 `Desktop/ElectronMain.js` 能在真实 Electron main process 中加载并保持 BrowserWindow 安全默认；真实 GUI launch、installer/package 与文件 IO smoke 仍待后续产品化轮次。

2026-06-17 P1 Round 38 补充：Windows package 先落为 electron-builder config contract。`check:desktop-package` 验证 package main entry、`package:windows`、files 白名单、Windows `dir` x64 target 与 artifact readiness；当前只固定可复现打包入口，不提交构建产物，也不把 package artifact smoke 伪装为已完成。

2026-06-17 P1 Round 39 补充：Windows package artifact smoke 已落地。真实运行 `package:windows` 后，`smoke:desktop-package` 验证 `dist/win-unpacked/Inscape SelfHostedEditor.exe`、`resources/app.asar` 与 builder metadata；构建产物保持 ignored，不进入 Git。该 smoke 仍不是 GUI/workspace/edit-save/recovery smoke。

2026-06-17 P1 Round 40 补充：packaged app asset loading 改为 Electron app protocol。`inscape-self-hosted-editor://app/` 只解析 `Resources/`、`Scripts/`、`node_modules/monaco-editor/` 与 packaged `samples/`，拒绝 traversal、`DevScripts/` 和非 app host；这修复 `file://` 下 Workbench 绝对路径会指向文件系统根目录的风险，但仍不代表真实 GUI/workspace/save/recovery smoke 已完成。

2026-06-17 P1 post-40 补充：Electron preload -> main 已有固定 command channel。preload 内部只通过 `inscape.self-hosted-editor.backend.invoke` 转发白名单 editor command，main process dispatcher 复用 preload payload validator，拒绝未知 command，并让缺少实际 handler 的路径显式失败；`project-session.status` 可返回 `embedded-desktop` 摘要。该入口只是 embedded transport 的第一刀，不改变 dev-host `/api/*` smoke，也不让 renderer 获得 Node/fs/shell/arbitrary IPC；真实 workspace open/read/write 与 recovery snapshot IO 已在后续补充落地，idle autosave、flush 和 recovery UI 仍未完成。

2026-06-17 P1 post-40 workspace 补充：Electron main process 已新增 `ElectronWorkspaceSessionStore`，通过原生 open-folder 选择目录，扫描真实 `.inscape` 文件并读入 backend `DocumentBufferStore`；`workspace.open-folder` / `workspace.list-files` 是 desktop-only command，不映射 dev-host `/api/*`。`project-session.status`、workspace list 与 update draft 响应保持 text-free，显式 `document-buffer.read` 才返回请求文档正文。

2026-06-17 P1 post-40 save/write-back 补充：`document-buffer.save` / `save-all` 已接到 Electron main process 真实磁盘写回。保存前复用 workspace path guard / write target whitelist / `baseRevision` guard，并读取当前磁盘 hash 检测外部修改；stale save 与 disk conflict 返回 text-free error，不覆盖外部磁盘变更。保存成功后刷新 backend buffer 的 `diskTextHash`、`lastSavedRevision` 与 dirty summary。recovery snapshot IO 已由后续补充接上；autosave timer、close/switch/app-exit flush 与恢复 UI 仍待后续迁移。

2026-06-17 P1 post-40 recovery snapshot IO 补充：dirty `document-buffer.update-draft` 已在 Electron main process 写入 `.inscape-workspace/recovery/<relative>.snapshot.json`，snapshot 文件包含可恢复正文；open workspace 会扫描 recovery snapshot 并只把 relative path、revision、mtime 和 hash 投影进 text-free `recoveryStatus`；保存成功会清理对应 snapshot。扫描会跳过越界或文件路径不匹配的 snapshot，避免篡改过的 recovery metadata 进入 UI 状态。idle autosave timer、close/switch/app-exit flush、restore / discard / later 和 GUI recovery smoke 仍待后续迁移。

2026-06-17 P1 post-40 autosave/flush 执行补充：`ElectronWorkspaceSessionStore` 已新增 `runAutosave()` 与 `flushDirtyDocuments()`，把现有 autosave / flush plan 接到真实 `saveDocument()` 路径。waiting autosave 不写盘且保留 recovery snapshot，ready autosave 写盘并清理 snapshot；flush 可按 `app-exit` 等 trigger 保存最新 dirty buffer，并返回 text-free 初始 / 最终 plan 与 save result summary。真实 idle timer、Electron window close / workspace switch / app exit lifecycle 挂接、restore / discard / later 与 GUI recovery smoke 仍待后续迁移。

2026-06-17 P1 post-40 Electron lifecycle 补充：`ElectronWorkspaceLifecycle` 已在 main process 持有与 IPC 共享的 `ElectronWorkspaceSessionStore`，启动 idle autosave timer，并把 BrowserWindow close、workspace switch 和 app `before-quit` 接到真实 flush/save 路径。`runAutosave()` 未显式传 `idleElapsedMs` 时会按 main-process dirty timestamp 计算 debounce；workspace switch flush blocked 时不会切换目录。renderer/preload API 未扩大，restore / discard / later 与 GUI recovery smoke 仍待后续迁移。

2026-06-17 P1 post-40 recovery actions IO 补充：desktop-only `recovery.restore` / `recovery.discard` / `recovery.later` 已进入 shared command catalog、preload whitelist、`EditorBackendClient.recovery.*` 与 Electron dispatcher，但不映射 dev-host HTTP route。`restore` 会校验 snapshot relative path / content hash / text payload，把 snapshot 正文写回 `.inscape` 并清理 snapshot；`discard` 删除 snapshot；`later` 只更新当前 session 的 action state 并保留 snapshot。GUI edit-save-recovery smoke 仍待后续迁移。

2026-06-17 P1 post-40 GUI recovery smoke 补充：`smoke:desktop-gui-recovery` 已启动真实 Electron BrowserWindow，加载 `inscape-self-hosted-editor://app/` Workbench 与 `ElectronPreload.cjs`，通过 renderer 可见 preload API 覆盖 open/read/edit/manual save/autosave/recovery restore/later/discard 的真实 IPC/main-process 路径。该轮修复 sandbox preload 不能加载 ESM preload 的问题；`ElectronPreloadApi.js` 保留为 ESM contract，实际 BrowserWindow 使用 CJS preload bundle。

2026-06-17 P1 post-40 authoring current-buffer GUI 补充：Electron dispatcher 已将 language-session commands 接到 `ElectronWorkspaceSessionStore`，由 main-process 当前 `DocumentBufferStore` 通过 `EditorBackendWorkspaceSnapshotModel` / `EditorBackendLanguageSessionRequestModel` 构建 authoring payload，不使用 renderer 传入的 stale `scriptText`。`smoke:desktop-gui-recovery` 现在覆盖 diagnostics / completions 在 recovery restore 后使用当前 buffer，且 language action response 仍保持 text-free。

2026-06-17 P1 post-40 packaged GUI smoke 补充：`smoke:desktop-package-gui` 在真实 `dist/win-unpacked/Inscape SelfHostedEditor.exe` 上运行受保护 smoke path，验证 packaged app 自身加载 Workbench/app protocol/preload 后可以打开临时 workspace、显式 read、edit、manual Save 写盘、recovery restore 写盘，并让 diagnostics / completions 使用 restore 后当前 buffer。该入口通过 env guard 与临时 result file 驱动，不引入 localhost 产品 API，也不把 `DevScripts/` 打进 loose package 目录。

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
| `/api/document-buffer-list` | 返回请求内 `store` 的 text-free document summary list | `DocumentBufferStore.list` | Backend project session | P1 Round 25 save command skeleton | 产品 backend 应从 ProjectSession 内部 store 读取，不要求前端上传完整 store。 |
| `/api/document-buffer-read` | 从请求内 `store` 读取指定 document buffer | `DocumentBufferStore.read` | Backend project session | P1 Round 25 save command skeleton | 产品 backend 应从 ProjectSession 内部 store 读取正文，status/list 仍不暴露正文。 |
| `/api/document-buffer-update-draft` | 对请求内 `store` 应用 text update 与 `baseRevision` guard | `DocumentBufferStore.updateDraft` | Backend project session | P1 Round 26 saved revision baseline | 真实实现应更新 backend buffer truth，旧 debounce 不能覆盖较新 revision，edit 不能覆盖 `lastSavedRevision` baseline。 |
| `/api/document-buffer-save` | 对请求内 `store` 构造 text-free save result，不写盘 | `DocumentBufferStore.saveDocument` | Backend project session | P1 Round 26 saved revision baseline | 真实实现必须从 ProjectSession 取 workspace root 和 buffer text，走 backend 文件边界写盘；成功刷新 `lastSavedRevision`，磁盘 hash 冲突返回 save error。 |
| `/api/document-buffer-save-all` | 对请求内 `store` 构造 text-free save-all result，不写盘 | `DocumentBufferStore.saveAll` | Backend project session | P1 Round 26 saved revision baseline | 真实实现必须只写回最新 dirty revision，并保持 save status / error / disk conflict 可见。 |
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
  documentBuffer
    list(request)
    read(request)
    updateDraft(request)
    saveDocument(request)
    saveAll(request)
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
