# SelfHostedEditor P1 40 轮内执行方案

状态：执行中（Round 1-12 已完成）

日期：2026-06-15

适用范围：`src/ExternalSupport/SelfHostedEditor`

相关文档：

- [Agent 接手指南](agent-handoff.md)
- [TODO](todo.md)
- [SelfHostedEditor P0 12 轮内执行方案](self-hosted-editor-p0-12-round-execution-plan.md)
- [SelfHostedEditor 当前阶段 100% 收口推进计划](self-hosted-editor-current-stage-100-plan.md)
- [SelfHostedEditor desktop backend v0 实施计划](self-hosted-editor-desktop-backend-v0-plan.md)
- [ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](adr/0019-self-hosted-editor-embedded-backend-v0.md)
- [ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)

## 目标

本计划用于把 P1，也就是 SelfHostedEditor desktop backend v0，实现压缩在 40 轮以内完成。

P1 的目标是把 SelfHostedEditor 从 dev-host request-driven prototype 推进到 editor session-driven desktop product shell。v0 采用 Electron + embedded EditorBackend，不采用 sidecar daemon。

P1 完成后应满足：

1. SelfHostedEditor UI 只依赖 `EditorBackendClient` 与业务窄接口，不知道 backend 是 HTTP dev host、embedded invoke transport，还是未来 sidecar。
2. Electron renderer 不能直接访问 Node、`fs`、`child_process`、shell 或 arbitrary IPC。
3. preload 只暴露受控 editor command。
4. embedded EditorBackend 持有 `ProjectSession` 与 `DocumentBufferStore`。
5. 一个窗口一个 workspace folder，一个 active project session。
6. v0 只打开目录，不提供正式单文件工作模式。
7. backend 统一执行 workspace 文件系统边界与写回白名单。
8. backend 持有 dirty buffers、revision、active document 和保存状态。
9. LanguageServer / Runtime / Tooling / Compiler 请求从 backend buffer 组 workspace snapshot。
10. autosave、manual Save、recovery snapshot 与 CSV / node-map / line-map 写前 backup 可用。
11. `.inscape-workspace/` 承担 recovery / backups / cache，默认不进入 Git。
12. 外部资源默认复制进 workspace 内 `assets/`，不长期引用 workspace 外路径。
13. v0 最小闭环可用：打开目录 -> 文件列表 -> 编辑 `.inscape` -> autosave / 手动 Save -> recovery -> 基础诊断 / 补全 -> Preview。
14. Windows 内部可用版能启动并通过 smoke。

P1 不包括：

1. 独立 sidecar daemon。
2. 多窗口共享 session。
3. 跨重启 session restore。
4. VSCode 连接同一个 backend 进程。
5. 本地 localhost 产品 API。
6. 默认 full long-lived LanguageServer。
7. P1.5 的 workspace-scoped long-lived LanguageServer 迁移。
8. 首发 macOS、签名、自动更新或完整安装器体验。

## 前置条件

开始 P1 前应确认 P0 已完成：

1. SelfHostedEditor current-stage fallback 与 session vocabulary 已收口。
2. `check:structure` 不再输出当前可消除 warning。
3. Summary / Preview / StoryGraph / Localization / Outline provider-aware contract 已稳定。
4. `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` spike 支持范围已明确。
5. README、architecture、backend migration map、handoff 与 TODO 口径一致。

如果 P0 未完成，先回到 [SelfHostedEditor P0 12 轮内执行方案](self-hosted-editor-p0-12-round-execution-plan.md)，不要直接进入 P1。

## 新 session 启动步骤

接手 session 先读：

```text
docs/agent-handoff.md
docs/todo.md
docs/self-hosted-editor-p0-12-round-execution-plan.md
docs/self-hosted-editor-current-stage-100-plan.md
docs/self-hosted-editor-desktop-backend-v0-plan.md
docs/adr/0019-self-hosted-editor-embedded-backend-v0.md
docs/adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md
src/ExternalSupport/SelfHostedEditor/README.md
```

然后检查工作区：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

建议先跑当前基线：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

注意：当前仓库可能已有未提交文档变更。不要回滚或覆盖用户 / 上一 session 的变更；如果必须改同一文件，先读 diff，按现有口径追加。

## 执行记录

### 2026-06-16 Round 1：P1 基线审计

范围：只读审计，不改产品行为，不接 Electron，不启动 P1.5 long-lived LanguageServer。

启动基线已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

现状审计：

1. `EditorBackendClient` 已经是 UI 侧业务入口，当前可通过构造参数注入 transport；默认 transport 是 `SelfHostedEditorHttpBackendTransport`。
2. 当前 transport 契约仍是 `postJson(path, payload)`，HTTP `/api/*` path 只集中在 `EditorBackendClient` 内部业务方法映射中；Round 3 / Round 4 需要把它进一步收敛成可替换的 editor command / 窄服务契约，而不是让 feature controller 获得 generic RPC。
3. 生产 `Scripts/` 中直接 `fetch()` 只用于 `SelfHostedEditorAppEntry.js` 加载默认静态 sample；业务 backend 调用经由 `EditorBackendClient` 下的 `languageSession`、`hostCapabilities`、`storyGraph`、`runtimeSession`、`lineIdentitySession`、`localizationSession`、`stableNodeMap` 与 `projectSession`。
4. dev HTTP route / handler / temp workspace 编排集中在 `DevScripts/StartSelfHostedEditorPreview.js`、`SelfHostedEditorApiHandlerBridge.js`、`SelfHostedEditorRouteBridge.js` 与 `SelfHostedEditorWorkspaceBridge.js`；这仍是开发宿主 transport，不是产品 backend API。
5. `check:structure` 当前已守住 `Scripts/` 业务代码不得直接 `fetch("/api/...")`，也守住 SelfHostedEditor 业务目录白名单、API route bridge、workspace temp path guard、static asset guard 与 session cache status；Round 6 还需要补 renderer / preload / desktop transport 的结构 guard。
6. package scripts 当前只有 dev-host / model / HTTP smoke / session / static asset 等检查，还没有 P1 desktop-specific `check:desktop-backend`、`check:workspace-fs`、`check:document-buffer`、`check:save-recovery` 或 `smoke:desktop`。

架构对照结论：

1. 当前 Round 1 未把 `Compiler` / `LanguageServer` / `Tooling` / `Runtime` 语义复制进 `EditorBackend`。
2. 当前 Round 1 未引入 sidecar daemon、多窗口共享、正式单文件模式、localhost 产品 API 或默认 full long-lived LanguageServer。
3. 下一轮应进入 Round 2：定义 embedded backend v0 model contract，先覆盖 shape 与 guard，不接 Electron，不改 dev-host payload 成功形状。

### 2026-06-16 Round 2：embedded backend v0 model contract

范围：只定义 shape 与 guard，不接 Electron，不做真实文件 IO，不改变 dev-host `/api/*` 成功 payload，不启用 P1.5 full long-lived LanguageServer。

完成内容：

1. 新增 `EditorBackendDesktopSessionModel`，定义 `embedded-desktop` project session、DocumentBuffer、workspace file boundary、save status、recovery status 与 settings summary 的 P1 v0 shape。
2. `DocumentBuffer` 是 backend buffer truth，可包含当前文本；project session status 只暴露 document summary、dirty/revision/save/recovery/settings 摘要，不暴露正文或 recovery 文本。
3. workspace file boundary guard 当前只做模型层判定：允许 `.inscape` 文档、localization CSV、`inscape.node-map.json`、`inscape.line-map.json`、`.inscape-workspace/recovery|backups|cache` 与 `assets/`；拒绝空路径、绝对路径、`..` 越界和未列入白名单的写回目标。
4. save / recovery / settings summary 已建立默认值：autosave 默认开启，backup 默认开启，外部资源默认复制到 `assets/`，Git checkpoint 默认 manual。
5. 新增 `check:desktop-backend`，并接入 `check:model`；`check:structure` 现在守住该 contract 入口和 model 文件存在。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

架构对照结论：

1. 本轮新增的是 ExternalSupport / SelfHostedEditor 的 backend model contract，不把 parser、compiler、localization scoring、Runtime flow 或 LanguageServer authoring 语义复制进 EditorBackend。
2. 语言会话默认仍是 `process-per-request`，没有声称 P1.5 long-lived LanguageServer 已完成。
3. 下一轮应进入 Round 3：抽出 `EditorBackendTransport`，把当前 `postJson(path, payload)` 进一步收敛为明确 transport contract，同时保持现有 HTTP dev host 默认路径和 smoke 不变。

### 2026-06-16 Round 3：抽出 EditorBackendTransport

范围：抽出 command-based transport contract，不改变现有 HTTP dev-host route、payload shape 或 feature controller 行为，不接 Electron。

完成内容：

1. 新增 `EditorBackendTransportCommand` catalog，定义 language、host capability、story graph、runtime、line identity、localization、stable node map 与 project session status 的业务 command。
2. `SelfHostedEditorHttpBackendTransport` 现在实现 `invoke(command, payload)`，内部把 command 映射到既有 dev-host `/api/*` route；`postJson(path, payload)` 保留为 HTTP transport 内部实现细节。
3. `EditorBackendClient` 现在只调用 `transport.invoke(command, payload)`，不再持有 `/api/*` path；feature bridge 仍只调用业务入口，不获得 generic request / invoke surface。
4. 新增 `check:backend-transport`，并接入 `check:model`；`check:structure` 已守住 `EditorBackendClient` 不得重新包含 `/api/*`，以及 HTTP transport 必须负责 command -> route 映射。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. dev-host `/api/*` 仍存在，但已下沉为 HTTP transport adapter 细节；它不是产品 backend API。
2. 本轮没有把 desktop transport 私有 payload 引入 feature controller，也没有改变 shared LanguageServer / Tooling / Runtime payload shape。
3. 下一轮应进入 Round 4：定义业务窄接口 adapter，让 `ProjectSessionService`、`LanguageSessionClient`、`RuntimeSessionClient`、`LocalizationWorkflowClient` 等边界更显式，同时继续禁止 feature controller 获取 generic transport surface。

### 2026-06-16 Round 4：业务窄接口 adapter

范围：在 UI 侧显式化业务窄接口，不新增 Electron / preload，不做真实文件 IO，不改变现有 dev-host HTTP payload shape。

完成内容：

1. 新增 `EditorBackendServiceRegistry`，从 `EditorBackendClient` 派生 `ProjectSessionService`、`DocumentBufferStore`、`LanguageSessionClient`、`HostCapabilityClient`、`StoryGraphClient`、`RuntimeSessionClient`、`LineIdentitySessionClient`、`LocalizationWorkflowClient`、`StableNodeMapClient` 与 `BackendDiagnosticsService`。
2. 这些 service object 只暴露业务方法，不暴露 `invoke`、`request`、`postJson` 或底层 `backendClient`。
3. `SelfHostedEditorFeatureBootstrapper` 现在创建服务集合，并把具体能力注入各 Bridge；Bridge 不再 import / new `EditorBackendClient`。
4. `SelfHostedEditorWorkbenchRenderController` 只依赖 `ProjectSessionService.status()` 刷新 session 状态，不再持有完整 backend client。
5. 新增 `check:backend-services`，并接入 `check:model`；`check:structure` 已守住 service registry、Bridge narrow dependency 与 bootstrapper 边界。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

架构对照结论：

1. 本轮继续保持 `EditorBackendClient` 作为唯一 transport owner；UI feature Bridge 只依赖业务窄服务，不知道 HTTP route 或未来 embedded transport 细节。
2. `DocumentBufferStore` 本轮仍是 model-facing contract / adapter，不做真实持久化，也不声称 backend 已拥有磁盘文件 IO。
3. 下一轮应进入 Round 5：建立 fake embedded transport / direct harness，用 contract 证明 UI service layer 不依赖 HTTP path。

### 2026-06-16 Round 5：Fake embedded transport harness

范围：新增 contract-only fake embedded transport / direct harness，不接 Electron，不新增产品 IPC，不改变 dev-host HTTP 默认路径或 shared payload shape。

完成内容：

1. 新增 `SelfHostedEditorFakeEmbeddedTransport`，实现 command-only `invoke(command, payload)`，用于测试 embedded-style direct transport。
2. fake transport 不包含 `/api/*` route、`fetch()` 或 `postJson`，未知 command 会显式拒绝。
3. 新增 `check:fake-embedded-transport`，通过 fake transport 驱动真实 `EditorBackendClient`、`EditorBackendServiceRegistry`、diagnostics / runtime / localization Bridge 与 project session status。
4. contract 验证 fake direct path 的调用记录只包含 `EditorBackendTransportCommand`，不包含 dev-host route；project session status 仍不暴露 workspace document text。
5. `check:model` 与 `check:structure` 已纳入 fake embedded transport guard。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. 本轮证明 UI service layer 可以由非 HTTP transport 驱动；dev-host `/api/*` 仍只属于 HTTP adapter / DevScripts。
2. fake embedded transport 只是测试 harness，不是 Electron preload 或正式 embedded backend 实现。
3. 下一轮应进入 Round 6：structure guard 第一刀，继续把 renderer Node/Electron 禁止、transport 注入边界与 `/api/*` 直接调用限制做成常规检查。

### 2026-06-16 Round 6：structure guard 第一刀

范围：只补结构检查，不接 Electron，不新增产品 renderer 能力，不改变现有 runtime / LanguageServer / Tooling payload shape。

完成内容：

1. `check:structure` 现在禁止生产 `Scripts/` 除 `EditorBackendTransport` command catalog 外出现 dev-host `/api/*` route 字符串。
2. `check:structure` 现在禁止 renderer `Scripts/` 直接 import Node / Electron runtime、`ipcRenderer`、`contextBridge`、`BrowserWindow` 或 `child_process`；Monaco AMD loader 保持允许。
3. `check:structure` 现在守住 backend access：生产 `Scripts/` 只有 `EditorBackendClient` 与 `EditorBackendServiceRegistry` 可接触 `EditorBackendClient`，transport 细节必须留在 `EditorBackendClient` / transport adapter 内。
4. 这些守卫为 Round 7-12 的 Electron / preload 工作预留显式边界；后续如果新增 main / preload 文件，应位于 renderer `Scripts/` 之外或明确加入白名单。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. renderer production `Scripts/` 仍不具备 Node / Electron / arbitrary IPC 能力。
2. dev-host `/api/*` 仍只属于 transport catalog / DevScripts，不进入 feature controller。
3. 下一轮应进入 Round 7：建立 Electron 工程骨架，但不改变 dev host 默认启动路径。

### 2026-06-16 Round 7：Electron 工程骨架

范围：建立 Electron main / preload / app entry 骨架与 contract；不新增 Electron 依赖、不新增启动脚本、不改变 `npm run start` 的 dev-host 默认路径，不接真实 IPC 或文件 IO。

完成内容：

1. 新增 `Desktop/ElectronMain.js`，定义 BrowserWindow 骨架，默认启用 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，并指向 `ElectronPreload.js` 与现有 Workbench HTML。
2. 新增 `Desktop/ElectronPreload.js`，只通过 `contextBridge` 暴露静态 `inscapeSelfHostedEditor` capability summary；当前明确声明 `embeddedBackend: false` 与 `workspaceFileSystem: false`，不暴露 `ipcRenderer`。
3. 新增 `Desktop/ElectronAppEntry.js`，记录 Electron shell 与现有 renderer app entry / workbench document 的骨架关系。
4. 新增 `check:electron-shell` 并接入 `check:model`；`check:syntax` 现在覆盖 `Desktop/`，`check:structure` 守住 Electron skeleton 文件存在和脚本委托。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-shell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. 本轮只建立 Electron 文件骨架和安全默认，不把 Node / Electron 能力暴露到 production renderer `Scripts/`。
2. preload 当前没有 IPC channel，也没有 workspace file-system / embedded backend 能力；后续必须通过白名单 command 逐步补。
3. 下一轮应进入 Round 8：BrowserWindow 安全配置细化与 contract 加固。

### 2026-06-16 Round 8：BrowserWindow 安全配置

范围：只细化 Electron BrowserWindow 安全默认与 contract；不新增 IPC channel，不新增本机文件能力，不改变 dev-host 启动路径。

完成内容：

1. `ElectronMain` 新增 `buildSelfHostedEditorBrowserWindowOptions()`，集中定义 BrowserWindow option。
2. BrowserWindow `webPreferences` 现在显式设置 `contextIsolation: true`、`nodeIntegration: false`、`nodeIntegrationInSubFrames: false`、`nodeIntegrationInWorker: false`、`sandbox: true`、`webSecurity: true`、`allowRunningInsecureContent: false` 与 `webviewTag: false`。
3. 新增 `applySelfHostedEditorWindowSecurity()`，默认禁止新窗口打开，并通过 `will-navigate` 只允许 `file:` navigation。
4. `check:electron-shell` 已覆盖上述安全字段和 window-open / navigation handler。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-shell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. BrowserWindow 安全默认集中在 main process skeleton 中；renderer `Scripts/` 仍不能访问 Node / Electron runtime。
2. preload 仍是唯一计划中的本机能力入口，且当前只暴露静态 capability summary。
3. 下一轮应进入 Round 9：preload public API 白名单边界，定义受控 editor command surface，但仍不接真实文件 IO。

### 2026-06-16 Round 9：preload public API 白名单

范围：只定义 preload public API 白名单和 contract，不接 `ipcRenderer`，不执行真实 command，不接 workspace 文件 IO。

完成内容：

1. 新增 `Desktop/ElectronPreloadApi.js`，集中定义 `inscapeSelfHostedEditor` preload API 名称、capabilities 与 editor command 白名单。
2. command 白名单当前只包含 project session、document buffer 与 workspace 打开 / 列表等受控 command 名称；不暴露 generic `invoke` / `send` / `request`。
3. `ElectronPreload.js` 现在只负责通过 `contextBridge.exposeInMainWorld()` 暴露 `createSelfHostedEditorPreloadApi()` 的冻结对象。
4. `check:electron-shell` 现在导入纯 API module 验证 command 唯一性、capability 默认值、无 IPC / HTTP route / generic request surface。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-shell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. preload public API 已有白名单 shape，但仍不含可调用 IPC bridge；不会把 arbitrary IPC 暴露给 renderer。
2. API capability 明确声明 `embeddedBackend: false` 与 `workspaceFileSystem: false`，不提前声称产品 backend / 文件 IO 已完成。
3. 下一轮应进入 Round 10：embedded invoke transport skeleton，仍只接 contract / fake path，不接真实文件系统。

### 2026-06-16 Round 10：Desktop preload transport skeleton

范围：建立 renderer 侧 preload transport skeleton 与 contract；不接真实 `ipcRenderer`、不接真实 filesystem，不改变 dev-host HTTP 默认路径。

完成内容：

1. 新增 `SelfHostedEditorPreloadBackendTransport`，实现 `transport.invoke(command, payload)`，内部把 `EditorBackendTransportCommand` 映射到 preload API 的 typed namespace 方法。
2. `EditorBackendClient` 默认 transport 现在会检测 `globalThis.inscapeSelfHostedEditor`；存在 preload API 时使用 preload transport，否则继续使用 `SelfHostedEditorHttpBackendTransport`。
3. `ElectronPreloadApi` 的 typed namespace 覆盖 language、host capability、story graph、runtime、line identity、localization、stable node map、project session，以及未来 document buffer / workspace command；默认 handler 未接线时显式报错。
4. 新增 `check:preload-transport`，验证 desktop default path 使用 preload transport、dev default path 仍使用 HTTP transport、preload public API 不暴露 generic `invoke` / `send` / `request`。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-shell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. feature controller 仍只通过 service / bridge 调用 `EditorBackendClient`，不感知 HTTP vs preload transport 切换。
2. preload transport 当前只走白名单 typed API，未引入 arbitrary IPC 或文件系统能力。
3. 下一轮应进入 Round 11：preload / IPC validation，补 main / preload command name 与 payload 白名单校验 skeleton。

### 2026-06-16 Round 11：preload / IPC validation skeleton

范围：补 preload command name 与 payload 白名单校验 skeleton；仍不接真实 IPC channel，不接真实文件 IO。

完成内容：

1. `ElectronPreloadApi` 新增 `validateSelfHostedEditorPreloadCommandPayload(command, payload)`，未知 command 会被拒绝。
2. preload command payload 现在按 command 维护 top-level key 白名单；payload 必须是普通 object，数组和多余字段会被拒绝。
3. typed preload command handler 在调用 handler 前统一执行 validator；未接线 handler 仍显式报错。
4. `check:preload-transport` 覆盖 unknown command 与非法 payload key；`check:electron-shell` 覆盖 preload API validator 存在且无 generic request surface。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-shell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. 当前仍没有 arbitrary IPC channel；preload public surface 通过 typed namespace + command/payload whitelist 表达。
2. payload validator 只做 transport 边界白名单，不复制 Compiler / Tooling / Runtime / LanguageServer 业务语义。
3. 下一轮应进入 Round 12：Electron 边界 contract 收束，确保 renderer / preload / desktop transport 边界与窄接口一致。

### 2026-06-16 Round 12：Electron 边界 contract

范围：收束 Electron / preload / renderer / desktop transport 的结构与 model contract；不接真实 IPC、不接真实文件 IO。

完成内容：

1. 新增 `check:electron-boundary`，扫描 renderer `Scripts/`，禁止直接 import Electron / Node runtime、使用 `ipcRenderer`，并继续禁止非 transport catalog 文件知道 `/api/*`。
2. contract 验证 preload 只使用 `contextBridge`，不使用 `ipcRenderer`、`node:fs` 或 `child_process`。
3. contract 验证 preload API 不暴露 `invoke` / `send` / `request` / `readFile` / `writeFile` / `runCommand` 等 generic/system surface。
4. contract 验证 preload command whitelist 覆盖当前 `EditorBackendTransportCommand`，并且 `SelfHostedEditorPreloadBackendTransport` 可处理所有当前 backend command。
5. `check:electron-boundary` 已接入 `check:model` 与 `check:structure`。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. Round 7-12 的 Electron / preload 基础边界已完成 contract 化；renderer 仍无 Node / Electron / arbitrary IPC。
2. preload / desktop transport 与 `EditorBackendClient` command catalog 对齐，但仍未接真实 IPC / 文件 IO。
3. 下一轮应进入 Round 13：workspace path guard，开始 backend workspace 文件系统边界 model / contract。

### 2026-06-16 Round 13：workspace path guard

范围：收束 backend workspace-relative path model / contract；不接真实文件 IO、不实现 open workspace folder、不扩展写回白名单范围。

完成内容：

1. 新增 `EditorBackendWorkspacePathModel`，集中归一化 workspace root、workspace-relative path 与 resolved path 摘要。
2. path guard 拒绝空路径、Windows / POSIX / UNC / URI-like 绝对路径、`..` 越界、`.` segment、null byte 与解析后不在 workspace root 下的路径。
3. `EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary()` 现在先通过 workspace path guard，再执行既有写回白名单；boundary 输出包含 `workspaceRoot`、`resolvedWorkspacePath`、`withinWorkspace` 与嵌入的 `pathBoundary`。
4. 新增 `check:workspace-fs`，覆盖允许的 workspace-relative path、绝对路径拒绝、路径穿越拒绝、resolved outside workspace 拒绝，以及未白名单写回仍被拒绝。
5. `check:workspace-fs` 已接入 `check:model`；`check:structure` 已守住新增 model / contract 文件与 package script。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. workspace path 判定位于 SelfHostedEditor backend model 层，没有把 Node / Electron / fs 能力暴露给 renderer 或 preload。
2. 本轮只定义路径边界与 contract，不实现真实文件 IO、open folder、autosave、recovery 或 P1.5 long-lived LanguageServer。
3. 下一轮应进入 Round 14：写回白名单，将允许写回的文件类型 / 目录从现有 model contract 进一步显式化。

### 2026-06-16 Round 14：写回白名单

范围：显式化 workspace 写回白名单 catalog / decision contract；不接真实文件 IO、不实现保存、backup 或 recovery 写盘。

完成内容：

1. 新增 `EditorBackendWorkspaceWriteTargetModel`，集中定义允许写回的 target kind 与 path rule catalog。
2. 写回白名单显式覆盖 `.inscape` 文档、localization CSV、`inscape.node-map.json`、`inscape.line-map.json`、`.inscape-workspace/recovery/**`、`.inscape-workspace/backups/**`、`.inscape-workspace/cache/**` 与 `assets/**`。
3. `EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary()` 现在先执行 workspace path guard，再调用 write target policy；boundary 输出嵌入 `writeTarget` decision。
4. `check:workspace-fs` 已扩展覆盖 write target catalog 顺序、path rule、允许目标、未白名单目标，以及目录本身不能作为文件写回目标。
5. `check:structure` 已守住新增 `EditorBackendWorkspaceWriteTargetModel` 文件存在。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. 写回白名单仍在 SelfHostedEditor backend model 层，只定义产品允许的 workspace 文件目标，不执行真实写盘。
2. 本轮没有把 Tooling / LanguageServer / Runtime 语义复制进 EditorBackend，也没有改变 dev-host HTTP payload shape。
3. 下一轮应进入 Round 15：open workspace folder，建立只接受目录、列出多个 `.inscape` 文件、不提供正式单文件入口的 contract。

### 2026-06-16 Round 15：open workspace folder

范围：定义 open workspace folder 的 model / contract；不接真实文件选择器、不扫描磁盘、不实现 ProjectSession lifecycle。

完成内容：

1. 新增 `EditorBackendWorkspaceFolderModel`，定义 workspace open decision、workspace folder summary 与 workspace document summary。
2. open decision 只接受 `directory`，拒绝正式单文件模式并返回 `single-file-mode-rejected`；空 workspace root 返回 `workspace-root-required`。
3. workspace folder summary 可列出多个 `.inscape` 文档、设置 active document，并在 active path 缺失时回落到第一个有效文档。
4. document list 只接受 workspace-relative `.inscape` 文件；非 `.inscape` 候选和路径越界候选进入 `rejectedDocuments`。
5. `check:workspace-fs` 已扩展覆盖目录打开、单文件拒绝、多 `.inscape` 列表、active document 与不泄露 document text。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. open workspace folder 仍是 SelfHostedEditor backend model contract，不访问 Node / Electron / fs，不暴露给 renderer 任意文件能力。
2. 本轮没有引入正式单文件模式、sidecar daemon、多窗口共享 session 或 P1.5 long-lived LanguageServer。
3. 下一轮应进入 Round 16：ProjectSession lifecycle，建立一个窗口一个 active project session 的 status contract。

### 2026-06-16 Round 16：ProjectSession lifecycle

范围：把一个窗口一个 active project session 的 lifecycle 摘要放入 desktop ProjectSession status；不实现 session restore、多窗口共享或 workspace 切换清理。

完成内容：

1. 新增 `EditorBackendProjectSessionLifecycleModel`，定义 `inscape.self-hosted-editor.project-session-lifecycle` status shape。
2. `EditorBackendDesktopSessionModel.buildProjectSession()` 现在返回 `lifecycle` 摘要，包含 `ownership: "single-window-active-session"`、`windowId`、`sessionId`、`workspaceRoot`、`activeRelativePath`、`documentCount`、`revision` 与 `mode: "embedded-desktop"`。
3. workspace summary 同步暴露 normalized `workspaceRoot`，仍只返回 document summaries，不泄露 document text、recovery text、CSV、line-map 或 Runtime snapshot。
4. `check:desktop-backend` 覆盖 lifecycle shape、window id normalization、workspace root、active document、document count、revision 与 embedded mode。
5. `check:structure` 已守住新增 lifecycle model 文件存在。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. lifecycle 是 SelfHostedEditor desktop backend status vocabulary，没有改变 Compiler / LanguageServer / Tooling / Runtime 的语义真相。
2. 本轮仍不引入多窗口共享、sidecar daemon、跨重启 session restore、正式单文件模式或 P1.5 long-lived LanguageServer 默认启用。
3. 下一轮应进入 Round 17：close / switch workspace cleanup，定义关闭或切换 workspace 时需要清理的子 session 摘要边界。

### 2026-06-16 Round 17：close / switch workspace cleanup

范围：定义关闭或切换 workspace 时的 cleanup summary contract；不执行真实进程清理、磁盘删除、session restore 或多窗口共享。

完成内容：

1. 新增 `EditorBackendWorkspaceSessionCleanupModel`，定义 `inscape.self-hosted-editor.workspace-session-cleanup` status shape。
2. cleanup summary 支持 `close-workspace` / `switch-workspace` operation，并列出需要清理的 `language-session`、`runtime-session`、`line-identity-session`、`localization-session` 与 `temporary-workspace` target。
3. cleanup summary 只暴露 `runtimeSnapshots`、`lineMapSidecars`、`localizationBaselines`、`temporaryWorkspaceFiles` 计数和 target kind / action，不暴露 Runtime snapshot、line-map、CSV baseline 或临时文件内容。
4. `EditorBackendDesktopSessionModel.buildWorkspaceSessionCleanupSummary()` 作为 desktop backend model 入口。
5. `check:desktop-backend` 覆盖 cleanup shape、operation、session id / workspace root normalization、target 列表、计数与 payload content exposure flag。

本轮验证已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. cleanup 是 backend session boundary 的摘要 contract，没有新增真实 fs / process 能力，也没有让 renderer 直接清理任何本地资源。
2. 本轮没有改变 dev-host session cache 实现或 shared Runtime / Tooling / LanguageServer payload shape。
3. 下一轮应进入 Round 18：session panel / status 接入，定义 UI 可显示的 embedded mode、session id、workspace 摘要与子状态安全边界。

### 2026-06-16 Round 18：session panel / status 接入

范围：把 ProjectSession status 安全投影到 UI session panel；不引入真实 Electron IPC、文件 IO、保存恢复或 P1.5 long-lived LanguageServer 默认启用。

完成内容：

1. 新增 `ProjectWorkspaceSessionStatusModelBuilder`，定义 `inscape.self-hosted-editor.workspace-session-panel-status` UI-safe panel status shape。
2. `SelfHostedEditorWorkbenchRenderController` 现在通过该模型把 workspace / layout / project-session / runtime snapshot 输入投影为 panel 标签，不再在 render controller 内散落 session label 格式化。
3. `ProjectWorkspaceSessionController` 显示 workspace revision、language mode、Runtime 当前状态、Runtime session store、line identity 与 localization 子状态。
4. `SelfHostedEditorWorkbenchIntegrationContractCheck` 覆盖 dev-host integration path 与 `embedded-desktop` 投影 path，并断言 panel status 不暴露 document text、CSV、line-map 或 Runtime snapshot 内容。
5. `SelfHostedEditorStructureContractCheck` 将新的 ProjectWorkspace session status model 纳入结构守卫。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. session panel status 是 SelfHostedEditor UI 投影模型，只消费既有 ProjectSession / Runtime 摘要，不重建 Compiler、LanguageServer、Tooling 或 Runtime 语义。
2. renderer 仍只通过 `ProjectSessionService.status()` 与窄 bridge/service 获取状态；没有新增 Node / fs / Electron / arbitrary IPC 能力。
3. 本轮关闭 Round 13-18 的 Workspace 文件系统边界与 ProjectSession C 段，可继续进入 Round 19：DocumentBufferStore v0。

### 2026-06-16 Round 19：DocumentBuffer model

范围：把 DocumentBuffer shape 从 desktop session 大模型中抽成独立 backend model；不实现 list / get / update / active document，不接真实文件 IO，也不改变 authoring / Preview 请求来源。

完成内容：

1. 新增 `EditorBackendDocumentBufferModel`，定义 `inscape.self-hosted-editor.document-buffer` 的 buffer shape。
2. buffer 记录 `relativePath`、`text`、`diskTextHash`、`revision`、`dirty`、`existsOnDisk`、`lastLoadedUtc` 与 `active`。
3. `EditorBackendDesktopSessionModel.buildDocumentBuffer()` 与 `buildDocumentBufferSummary()` 现在复用独立 DocumentBuffer model。
4. `DocumentBufferStore.buildBuffer()` / `buildSummary()` 直接复用 `EditorBackendDocumentBufferModel`，继续只作为 UI-side narrow service 的 model adapter。
5. `check:desktop-backend` 覆盖 direct DocumentBuffer model 与 desktop session 组合路径；summary 仍不暴露 document text。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. 本轮只抽出 backend 文档状态 shape，没有让 UI draft store 成为 project document truth。
2. DocumentBuffer 仍只是 SelfHostedEditor backend ownership model，不复制 Compiler / LanguageServer / Tooling / Runtime 语义。
3. 下一轮应进入 Round 20：list / get / update / active document，在 backend buffer store 层补文档列表、读取、更新与 active document contract。

### 2026-06-16 Round 20：list / get / update / active document

范围：补 DocumentBufferStore 的纯 model 操作 contract；不接真实文件 IO，不把 UI draft store 变成 project truth，不提前实现 Round 21 stale guard。

完成内容：

1. 新增 `EditorBackendDocumentBufferStoreModel`，定义 `inscape.self-hosted-editor.document-buffer-store` 与 `document-buffer-list` shape。
2. store 可持有多个 document buffer、session id、workspace name、active relative path、document count 与单调不倒退的 store revision。
3. `listDocuments()` 返回 document summaries，并以 `payloadContentExposed: false` 明确不暴露正文。
4. `getDocument()` 可按 workspace-relative path 取单个 buffer；这是明确的 document read path，可以返回 text。
5. `updateDocument()` 更新文本、标记 dirty，并把 document / store revision 推进到当前 store 之后。
6. `setActiveDocument()` 切换 active document；缺失文档返回 `document-not-found`。
7. `DocumentBufferStore` 窄服务暴露 `buildStore`、`listDocuments`、`getDocument`、`updateDocument` 与 `setActiveDocument`，仍只作为 model adapter。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

架构对照结论：

1. backend buffer store contract 只管理文档状态 ownership，不执行磁盘写入，也不调用 LanguageServer / Runtime / Tooling。
2. list/status 路径不泄露正文；只有明确 `getDocument()` / `updateDocument()` document path 携带 text。
3. 下一轮应进入 Round 21：baseRevision 与 stale guard，拒绝旧 debounce / stale update 覆盖较新 revision。

### 2026-06-16 Round 21：baseRevision 与 stale guard

范围：给 `updateDocument()` 增加 baseRevision stale guard；不接真实 debounce、authoring endpoint 或文件 IO。

完成内容：

1. `EditorBackendDocumentBufferStoreModel.updateDocument()` 接受 `baseRevision`。
2. 当 `baseRevision` 与当前 document revision 不一致时，更新被拒绝并返回 `stale-document-revision`。
3. stale rejection 返回 `baseRevision`、`currentRevision` 与 text-free document summary，不回显被拒绝的新文本，也不暴露当前 document text。
4. 正常 update 继续推进 document / store revision，保持 revision 只增不倒退。
5. `check:desktop-backend` 与 `check:backend-services` 均覆盖正常 baseRevision update 与 stale update rejected。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

架构对照结论：

1. stale guard 只保护 backend buffer revision ownership，不改变 Compiler / LanguageServer / Tooling / Runtime 语义。
2. 旧 debounce / stale request 已有明确拒绝路径，不会覆盖较新 revision。
3. 下一轮应进入 Round 22：workspace snapshot builder，让 LanguageServer / Runtime / Tooling 请求从 backend buffer 组 workspace snapshot。

### 2026-06-16 Round 22：workspace snapshot builder

范围：从 DocumentBufferStore 构建 backend-owned workspace snapshot；不接入 authoring endpoint、Preview 或 Runtime 调用，不改变 dev-host HTTP payload shape。

完成内容：

1. 新增 `EditorBackendWorkspaceSnapshotModel`，定义 `inscape.self-hosted-editor.workspace-snapshot` shape。
2. snapshot 从 `EditorBackendDocumentBufferStoreModel` 构建，包含 `sessionId`、workspace name、active path、store revision、active document revision、document count 与 documents。
3. snapshot documents 携带 `relativePath`、text、revision、dirty、existsOnDisk、lastLoadedUtc 与 active flag，用于后续 LanguageServer / Runtime / Tooling 请求。
4. snapshot 标记 `payloadContentExposed: true`，明确它是 backend request payload，不是 status / list summary。
5. 新增 `buildActiveDocumentRequest()`，从 snapshot 取 active document text、active relative path、document revision 与 workspace。
6. `DocumentBufferStore` 窄服务暴露 `buildWorkspaceSnapshot()` 与 `buildActiveDocumentRequest()`。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

架构对照结论：

1. snapshot builder 只把 backend buffer store 投影成请求输入；没有重算 Compiler / LanguageServer / Runtime / Tooling 语义。
2. status / list 仍不泄露正文；只有明确 backend request snapshot 标记为 content-bearing payload。
3. 下一轮应进入 Round 23：authoring endpoint 接入 buffer，让 diagnostics / completions / definition / references / hover / documentSymbols 使用 backend snapshot。

### 2026-06-16 Round 23：authoring endpoint 接入 buffer

范围：让 LanguageServer-backed authoring bridge 优先消费 backend workspace snapshot；不改变 dev-host `/api/*` route 或 LanguageServer shared payload 语义，不默认启用 P1.5 long-lived LanguageServer。

完成内容：

1. 新增 `LanguageServerAuthoringRequestModel`，统一把 content-bearing workspace snapshot 投影为 LanguageServer authoring request。
2. diagnostics / completions / definition / references / hover / documentSymbols 六个 bridge 新增 `workspaceSnapshotProvider`。
3. 当 snapshot 存在时，六个 bridge 使用 snapshot active document 的 `scriptText`、`activeRelativePath`、`documentRevision` 与 workspace；旧 `workspaceContextProvider` 只作为 fallback。
4. `SelfHostedEditorFeatureBootstrapper` 通过 `DocumentBufferStore` 从当前 workspace context 构建 backend workspace snapshot，并注入六个 authoring bridge。
5. `check:backend-services` 覆盖六个 authoring bridge 的 snapshot 优先级，并断言旧 workspace context 文本不会在 snapshot 存在时进入 payload。
6. `check:semantic-parity-http` 保持通过，确认当前 dev-host HTTP authoring 行为未回归。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

架构对照结论：

1. 本轮只改变 SelfHostedEditor bridge 的请求来源选择，不复制 LanguageServer 语义，也不改变 shared endpoint response shape。
2. UI draft/workspace context 仍可 fallback，但有 backend snapshot 时不会作为 authoring truth 上传。
3. 下一轮应进入 Round 24：Preview / Runtime 接入 buffer，让 Preview / Runtime 使用 backend buffer 当前 workspace state。

### 2026-06-16 Round 24：Preview / Runtime 接入 buffer

范围：让 Preview 所依赖的 StoryGraph bridge 与 Runtime bridge 优先消费 backend workspace snapshot；不改变 dev-host `/api/*` route、Compiler / Runtime shared payload shape 或 Preview choice click invariant。

完成内容：

1. 新增 `EditorBackendWorkspaceRequestModel`，统一把 backend workspace snapshot active document 投影为 shared request 的 `scriptText`、`workspace`、`activeRelativePath` 与 `documentRevision`。
2. `LanguageServerAuthoringRequestModel` 复用该通用 request 投影，避免 LanguageServer / StoryGraph / Runtime 各自重复 snapshot 取 active document 逻辑。
3. `SelfHostedEditorStoryGraphBridge` 新增 `workspaceSnapshotProvider`，Preview 的 Compiler graph 请求优先使用 backend buffer active document。
4. `SelfHostedEditorRuntimeBridge` 新增 `workspaceSnapshotProvider`，Runtime start / step 请求优先使用 backend buffer active document，同时保留 `sessionId`、`action` 与 `runtimeState` fallback。
5. `SelfHostedEditorFeatureBootstrapper` 把同一个 backend snapshot provider 注入六个 authoring bridge、StoryGraph bridge 与 Runtime bridge。
6. `check:backend-services` 覆盖 Preview / Runtime snapshot 优先级，并断言旧 workspace context 文本不会在 snapshot 存在时进入 payload。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

架构对照结论：

1. 本轮只改变 SelfHostedEditor host adapter 的请求输入来源，不复制 Compiler graph、Preview presenter 或 Runtime execution 语义。
2. Preview choice click invariant 仍由 `check:model` 覆盖，Runtime action 仍不要求前端上传完整 Runtime state。
3. 下一轮应进入 Round 25：Save command skeleton，开始把 DocumentBufferStore 写回入口和 save status contract 接上。

### 2026-06-16 Round 25：Save command skeleton

范围：建立 `saveDocument` / `saveAll` 的 backend buffer-store 命令契约，让手动 Save 入口先经过 workspace file boundary、baseRevision guard 与 text-free save status；本轮不声称真实 Electron 文件 IO、autosave debounce、flush 或 recovery 已完成。

完成内容：

1. `EditorBackendDocumentBufferStoreModel` 新增 `saveDocument()` 与 `saveAll()`，返回 `inscape.self-hosted-editor.document-buffer-save-result` / `document-buffer-save-all-result`。
2. Save 成功会把对应 document summary 标记为 clean，返回 `saved` save status、`savedRevision`、workspace boundary 与 write target；结果不暴露 buffer 正文。
3. Save 失败覆盖缺失文档、`stale-document-revision` 与写回白名单拒绝，返回 `error` save status 和稳定 reason，仍不回传当前正文或被拒绝正文。
4. `DocumentBufferStore` 窄服务新增 async `saveDocument` / `saveAll` backend command 入口，以及纯模型 `saveDocumentToStore` / `saveAllToStore` contract helper。
5. `EditorBackendClient.documentBuffer.*`、`EditorBackendTransportCommand`、preload whitelist、preload transport 与 fake embedded transport 接入 `document-buffer.save` / `document-buffer.save-all`。
6. `check:desktop-backend`、`check:backend-services`、`check:backend-transport`、`check:preload-transport`、`check:fake-embedded-transport` 与 `check:electron-boundary` 覆盖 Save command shape、payload 白名单、path guard 和 text-free result。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. Save 入口仍是受控 editor command，不暴露 generic `writeFile(path, text)`、arbitrary IPC、Node / fs 或 shell 能力给 renderer。
2. workspace root、relative path guard 与 write target catalog 仍由 backend model 承担；UI 只表达保存意图和相对路径。
3. Save result 面向 UI，保持 text-free；完整 buffer text 仍只属于 backend buffer truth。
4. 本轮没有复制 Compiler / LanguageServer / Tooling / Runtime 语义，也没有进入 P1.5 long-lived LanguageServer。
5. 下一轮应进入 Round 26：dirty state / saved revision，补 clean baseline、磁盘更新冲突与 save status 更新规则。

### 2026-06-16 Round 26：dirty state / saved revision

范围：把 DocumentBuffer 的 clean baseline 显式化，让 edit / save 的 dirty state 与 saved revision 可由 contract 验证；用磁盘 hash 偏离模拟外部更新冲突。本轮仍不做真实文件写盘、autosave debounce、flush 或 recovery。

完成内容：

1. `EditorBackendDocumentBufferModel` 新增 `lastSavedRevision`，dirty buffer 默认保留既有 baseline，clean buffer 默认把当前 revision 视为 saved revision。
2. `EditorBackendDocumentBufferStoreModel.updateDocument()` 在推进 revision 和 dirty state 时保留 `lastSavedRevision`，证明旧 clean baseline 不会被 edit 覆盖。
3. `saveDocument()` 成功后把 document summary / store summary 标为 clean，并把 `lastSavedRevision` 更新到当前 document revision。
4. `saveDocument()` 支持用 `observedDiskTextHash` / `currentDiskTextHash` 对比 buffer 的 `diskTextHash`；不一致时返回 text-free `disk-conflict` error 与可见 hash 摘要。
5. `saveAll()` 继承同一套 saved revision 更新规则；Save result / Save All result 仍不暴露 buffer text。
6. `check:desktop-backend` 与 `check:backend-services` 覆盖 edit 保留 baseline、save 刷新 baseline、disk conflict error 和 text-free result。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. `lastSavedRevision` 和 `diskTextHash` 只描述 backend buffer / disk baseline，不复制 Compiler、LanguageServer、Tooling 或 Runtime 语义。
2. 磁盘冲突以 save error status 呈现，不让 UI 直接读写任意文件或绕过 workspace boundary。
3. Save result 继续保持 text-free；正文仍只在 backend buffer / content-bearing request snapshot 内流动。
4. 本轮没有改变 dev-host `/api/*` shared semantic payload，也没有进入 P1.5 long-lived LanguageServer。
5. 下一轮应进入 Round 27：backend autosave debounce，建立 idle debounce 与“只保存最新 revision”的 contract。

### 2026-06-16 Round 27：backend autosave debounce

范围：建立 backend autosave idle-debounce 的计划模型，证明 autosave 只为 dirty `.inscape` 生成最新 revision 的 save request，并显式跳过 stale pending write；本轮仍不启动真实 timer、不写盘、不实现 flush 或 recovery。

完成内容：

1. `EditorBackendDocumentBufferStoreModel.buildAutosavePlan()` 返回 `inscape.self-hosted-editor.document-buffer-autosave-plan`。
2. Autosave plan 读取 `autosaveEnabled`、`debounceMs`、`idleElapsedMs` 与 `pendingWrites`，只在 autosave 开启且 idle 已超过 debounce 时进入 ready 状态。
3. ready plan 只为 dirty `.inscape` document 生成 save request，`baseRevision` / `documentRevision` 使用当前最新 buffer revision。
4. 当 pending write 的 revision 低于当前 buffer revision 时，plan 记录 `stale-autosave-revision` skip，证明旧 autosave 回调不能覆盖新 revision。
5. autosave disabled / debounce waiting 均返回显式 skipped reason；plan 结果保持 text-free。
6. `DocumentBufferStore` 窄服务新增 `buildAutosavePlan()` helper；`check:desktop-backend` 与 `check:backend-services` 覆盖 ready、waiting、disabled、stale pending write 和 no-text result。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. Autosave plan 只编排 backend buffer revision 和 save command readiness，不直接写文件，也不让 renderer 获取文件系统能力。
2. “只保存最新 revision” 通过 `baseRevision` / `documentRevision` 和 stale pending write skip 表达，继续沿用 Round 21/26 的 revision guard。
3. autosave 设置输入仍是配置层/ProjectSession 将来应持有的行为参数；本轮没有把默认值散落到 feature controller。
4. 本轮没有改变 Compiler / LanguageServer / Tooling / Runtime payload shape，也没有进入 P1.5 long-lived LanguageServer。
5. 下一轮应进入 Round 28：flush rules，覆盖手动 Save、关闭窗口、切换 workspace、应用退出前 flush 最新 backend buffer。

### 2026-06-16 Round 28：flush rules

范围：建立 flush lifecycle 守门 contract，证明手动 Save、关闭窗口、切换 workspace 与 app exit 都必须先 flush 最新 backend buffer；失败或无法写回时 UI 可见并阻断静默丢失。本轮仍不做真实 Electron 文件 IO 或 recovery snapshot。

完成内容：

1. `EditorBackendDocumentBufferStoreModel.buildFlushPlan()` 返回 `inscape.self-hosted-editor.document-buffer-flush-plan`。
2. Flush plan 识别 `manual-save`、`close-window`、`switch-workspace`、`app-exit` 四类 trigger。
3. dirty document 会通过既有 workspace file boundary / write target catalog 生成 `flushRequests`，`baseRevision` / `documentRevision` 使用当前最新 buffer revision。
4. 非白名单写回目标进入 `blockingIssues`，并把 `uiVisibility.state` 标为 `flush-blocked-visible`。
5. save failure 可通过 `saveResults` 进入 text-free `visibleFailures`，并把 `uiVisibility.state` 标为 `save-error-visible` / `requiresUserAction`，避免关闭 / 切换 / 退出静默丢内容。
6. `DocumentBufferStore` 窄服务新增 `buildFlushPlan()` helper；`check:desktop-backend` 与 `check:backend-services` 覆盖四种 trigger、latest revision、unsafe target、failure visibility 和 no-text result。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. Flush plan 只做 lifecycle guard / UX visibility contract，不直接写文件，也不让 renderer 获得 Node / fs / shell 能力。
2. 路径与写回目标继续复用 `EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary()` 和 write target catalog，没有在 feature 层复制文件边界语义。
3. “flush 最新 buffer” 通过当前 `baseRevision` / `documentRevision` 表达，继续沿用现有 revision guard。
4. failure visibility 只暴露 sanitized save status / reason，不回显 document text 或任意错误 payload。
5. 本轮没有改变 Compiler / LanguageServer / Tooling / Runtime payload shape，也没有进入 P1.5 long-lived LanguageServer。
6. 下一轮应进入 Round 29：recovery snapshot。

### 2026-06-16 Round 29：recovery snapshot

范围：建立 recovery snapshot 写入 payload 与保存后 cleanup contract，证明 backend 可以从 dirty buffer 生成包含正文的 recovery snapshot，并且 recovery status / cleanup request 不暴露正文。本轮仍不执行真实文件 IO，不扫描下次启动的 recovery，也不实现恢复 UI。

完成内容：

1. `EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan()` 返回 `inscape.self-hosted-editor.document-buffer-recovery-snapshot-plan`。
2. Dirty backend buffer 会生成 `inscape.self-hosted-editor.document-buffer-recovery-snapshot` write payload，记录 relative path、document revision、disk mtime、snapshot mtime、content hash 和文本。
3. Snapshot 写入路径使用 `.inscape-workspace/recovery/<relativePath>.snapshot.json`，继续通过 workspace file boundary / write target catalog 判定为 `recovery-snapshot`。
4. `recoveryStatus` 只投影 relative path、revision、mtime、content hash 与 action state，不包含 snapshot text。
5. save success / `savedRelativePaths` 会生成 text-free `saved-document-recovery-cleanup` request，用于后续真实 IO 层清理正常保存后的 recovery snapshot。
6. `DocumentBufferStore` 窄服务新增 `buildRecoverySnapshotPlan()` helper；`check:desktop-backend` 与 `check:backend-services` 覆盖 snapshot payload、status no-text、cleanup request 和 write target boundary。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. Snapshot write payload 是 backend 内部持久化载荷，允许包含 document text；面向 UI 的 `recoveryStatus` 和 cleanup request 仍是 text-free。
2. recovery 写入路径继续复用 workspace boundary / write target catalog，没有在 feature controller 复制路径规则。
3. content hash 只用于 snapshot identity / comparison contract，不改变 Compiler / LanguageServer / Tooling / Runtime 语义。
4. 本轮没有让 renderer 获取 Node / fs / shell 能力，也没有进入 P1.5 long-lived LanguageServer。
5. 下一轮应进入 Round 30：recovery UI，覆盖打开 workspace 后发现 recovery、恢复 / 丢弃 / 稍后处理。

### 2026-06-16 Round 30：recovery UI

范围：建立 recovery UI/status/action contract，让 ProjectSession 的 recoveryStatus 可投影到 session panel，列出可恢复文件，并为 restore / discard / later 三类动作生成 text-free action request。本轮仍不做真实启动扫描、snapshot 删除或恢复写回。

完成内容：

1. `ProjectWorkspaceSessionStatusModelBuilder` 新增 recovery UI 投影：`recoveryLabel`、`recoveryFileLabel`、`recoveryItemCount`、text-free `recoveryItems`。
2. `recoveryItems` 保留 relative path、file name、revision、mtime、content hash、action state 和可用动作列表，不包含 recovery snapshot text。
3. `ProjectWorkspaceSessionController` 在 session panel 渲染 Recovery / Recoverable 状态，显示可恢复文件名。
4. `ProjectWorkspaceSessionStatusModelBuilder.buildRecoveryActionRequest()` 返回 `inscape.self-hosted-editor.workspace-recovery-action-request`，覆盖 restore / discard / later。
5. Restore action 标记 `requiresWriteBack`；discard action 标记 `suppressFuturePrompt`；later action 标记 `keepsSnapshot`。
6. Workbench integration contract 覆盖 dev-host / embedded ProjectSession recovery status、面板文本、动作请求与 no-text projection。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. recovery UI 只消费 backend ProjectSession `recoveryStatus` summary，不读取 recovery snapshot text 或文件系统。
2. restore / discard / later 先落为 action request contract；真实恢复写回、删除 snapshot 和稍后处理持久化留给后续 IO 层。
3. session panel 只渲染文件名和状态，不暴露正文、CSV、Runtime snapshot 或 recovery payload。
4. 本轮没有改变 Compiler / LanguageServer / Tooling / Runtime payload shape，也没有进入 P1.5 long-lived LanguageServer。
5. 下一轮应进入 Round 31：`.inscape-workspace/` 策略。

### 2026-06-16 Round 31：`.inscape-workspace/` 策略

范围：建立 workspace 内部目录策略 contract，证明 open workspace 时 `.inscape-workspace/recovery`、`.inscape-workspace/backups`、`.inscape-workspace/cache` 可被发现或计划创建，并且 `.inscape-workspace/` 默认不进入 Git。本轮不执行真实 mkdir、不写 `.gitignore`。

完成内容：

1. `EditorBackendWorkspaceFolderModel.buildInternalWorkspacePlan()` 返回 `inscape.self-hosted-editor.workspace-internal-directory-plan`。
2. plan 固定列出 recovery / backups / cache 三个内部目录，均标记为非 project truth、默认 Git ignored。
3. existing relative paths 可标记已存在目录；缺失目录返回 `createRequired`。
4. cache 目录标记 `recreatable: true`，表达 cache 删除后可重建且不影响项目 truth。
5. `.gitignore` plan 默认建议追加 `.inscape-workspace/`；已有该条目时 action 为 `none`。
6. `check:workspace-fs` 覆盖目录发现、创建计划、cache 可重建、非项目真相、默认 gitignore 和 no-text plan。

验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

架构对照结论：

1. internal workspace plan 只描述可发现 / 可创建目录与 gitignore 建议，不直接访问文件系统。
2. `.inscape-workspace/` 被明确标为 non-project-truth，防止 recovery / backup / cache 被当成可提交项目真相。
3. 路径仍走 workspace-relative path guard；renderer 不获得 Node / fs / shell 能力。
4. 本轮没有改变 Compiler / LanguageServer / Tooling / Runtime payload shape，也没有进入 P1.5 long-lived LanguageServer。
5. 下一轮应进入 Round 32：write-back backup。

## 36 轮主计划

### A. Contract 与 transport 基础，Round 1-6

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 1 | P1 基线审计 | 已完成。现有 `EditorBackendClient`、dev HTTP transport、feature controller 到 `/api/*` 的调用路径、package scripts 与 SelfHostedEditor 目录结构已记录在 2026-06-16 Round 1 执行记录中；未改行为。 |
| 2 | 定义 embedded backend v0 model contract | 已完成。`EditorBackendDesktopSessionModel` 与 `check:desktop-backend` 覆盖 `ProjectSession`、`DocumentBuffer`、workspace file boundary、save status、recovery status、settings summary；只定义 shape 与 guard，不接 Electron。 |
| 3 | 抽出 `EditorBackendTransport` | 已完成。`EditorBackendClient` 现在调用 command-based `transport.invoke(command, payload)`；现有 HTTP dev host 作为默认 transport，由 `SelfHostedEditorHttpBackendTransport` 负责 command -> `/api/*` route 映射，现有 smoke 不变。 |
| 4 | 定义业务窄接口 adapter | 已完成。`EditorBackendServiceRegistry` 现在把 `EditorBackendClient` 包装成 `ProjectSessionService`、`DocumentBufferStore`、`LanguageSessionClient`、`RuntimeSessionClient`、`LocalizationWorkflowClient` 等 UI 侧窄接口；feature Bridge 不再接收完整 backend client，也不获得 generic `call(method, payload)`。 |
| 5 | Fake embedded transport harness | 已完成。新增 `SelfHostedEditorFakeEmbeddedTransport` 与 `check:fake-embedded-transport`，通过真实 `EditorBackendClient`、service registry 和 Bridge direct path 证明 UI 侧不依赖 HTTP path；fake harness 本身不包含 `/api/*`、`fetch()` 或 `postJson`。 |
| 6 | structure guard 第一刀 | 已完成。`check:structure` 覆盖：生产 `Scripts/` 除 transport catalog 外不得包含 `/api/*` route，renderer 不得直接 import Node / Electron runtime / IPC，transport 细节必须留在 `EditorBackendClient` 与 transport adapter 内。 |

### B. Electron shell 与 preload 边界，Round 7-12

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 7 | Electron 工程骨架 | 已完成。新增 `Desktop/ElectronMain.js`、`ElectronPreload.js` 与 `ElectronAppEntry.js` 骨架，新增 `check:electron-shell` 并纳入 `check:model` / `check:syntax`；未新增 Electron 依赖、启动脚本、IPC 或文件 IO，dev host 默认启动路径不变。 |
| 8 | BrowserWindow 安全配置 | 已完成。BrowserWindow options 集中定义并显式启用隔离 / sandbox / webSecurity，禁用 Node integration、worker/subframe Node、insecure content 与 webview；main process 默认阻止 window-open，并限制 navigation。 |
| 9 | preload 白名单 API | 已完成。新增 `ElectronPreloadApi.js`，定义冻结的 `inscapeSelfHostedEditor` capability + editor command 白名单；不暴露 generic `invoke` / `send` / `request`，不接 `ipcRenderer` 或真实文件 IO。 |
| 10 | Desktop invoke transport | 已完成。新增 `SelfHostedEditorPreloadBackendTransport`，`EditorBackendClient` 会在存在 `inscapeSelfHostedEditor` preload API 时选择 preload transport，否则保留 HTTP dev transport；新增 `check:preload-transport`。 |
| 11 | preload / IPC validation | 已完成。`ElectronPreloadApi` 新增 command/payload validator，未知 command、非 object payload 与多余 top-level key 被拒绝；当前仍不接真实 IPC channel。 |
| 12 | Electron 边界 contract | 已完成。新增 `check:electron-boundary` 并接入 `check:model` / `check:structure`，验证 renderer 无 Node / Electron / arbitrary IPC、preload 无 generic/system surface、preload command whitelist 覆盖当前 backend command。 |

### C. Workspace 文件系统边界与 ProjectSession，Round 13-18

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 13 | workspace path guard | 已完成。新增 `EditorBackendWorkspacePathModel` 与 `check:workspace-fs`；backend boundary 只接受 workspace-relative path，拒绝绝对路径、`..` 越界、非法 segment / null byte 与解析后不在 workspace 内的路径。 |
| 14 | 写回白名单 | 已完成。新增 `EditorBackendWorkspaceWriteTargetModel`，显式 catalog 覆盖 `.inscape` 文档、localization CSV、node-map sidecar、line-map sidecar、recovery、backup、cache、assets；其他写回默认拒绝。 |
| 15 | open workspace folder | 已完成。新增 `EditorBackendWorkspaceFolderModel`，v0 只接受目录，拒绝正式单文件模式，可列出多个 workspace-relative `.inscape` 文件并设置 active document。 |
| 16 | ProjectSession lifecycle | 已完成。新增 `EditorBackendProjectSessionLifecycleModel`，ProjectSession status 可查询 single-window active session、session id、workspace root、active relative path、document count、revision 与 `mode=embedded-desktop`。 |
| 17 | close / switch workspace cleanup | 已完成。新增 `EditorBackendWorkspaceSessionCleanupModel`，close / switch workspace cleanup status 只返回待清理 target 摘要和 Runtime / line-map / localization / temporary workspace 计数。 |
| 18 | session panel / status 接入 | 已完成。新增 `ProjectWorkspaceSessionStatusModelBuilder`，UI session panel 显示 backend mode、session id、workspace 摘要、revision、language mode、Runtime / line identity / localization 状态；contract 断言不泄露正文、CSV、line-map 或 Runtime snapshot。 |

### D. DocumentBufferStore v0，Round 19-24

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 19 | DocumentBuffer model | 已完成。新增 `EditorBackendDocumentBufferModel`，backend buffer 记录 `relativePath`、text、disk hash、revision、dirty、existsOnDisk、lastLoadedUtc 与 active；desktop session 与 `DocumentBufferStore` 均复用该 shape，summary 不暴露正文。 |
| 20 | list / get / update / active document | 已完成。新增 `EditorBackendDocumentBufferStoreModel`，可 build store、list summaries、get document、update text 并切换 active document；list 不暴露正文，update 推进 document / store revision，缺失文档返回 `document-not-found`。 |
| 21 | baseRevision 与 stale guard | 已完成。`updateDocument()` 支持 `baseRevision`，revision 不匹配时返回 `stale-document-revision`，并只回传 current/base revision 与 text-free summary；旧 debounce 不能覆盖较新 revision。 |
| 22 | workspace snapshot builder | 已完成。新增 `EditorBackendWorkspaceSnapshotModel`，从 DocumentBufferStore 构建 content-bearing backend request snapshot，并可导出 active document request；status/list 仍保持 text-free。 |
| 23 | authoring endpoint 接入 buffer | 已完成。六个 LanguageServer-backed authoring bridge 优先使用 backend workspace snapshot active buffer，旧 workspace context 仅 fallback；semantic parity HTTP 保持通过。 |
| 24 | Preview / Runtime 接入 buffer | 已完成。StoryGraph / Runtime bridge 优先使用 backend workspace snapshot active buffer，旧 workspace context 仅 fallback；Preview choice click 与 Runtime HTTP smoke 保持通过。 |

### E. 保存、autosave 与 recovery，Round 25-30

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 25 | manual Save | `saveDocument` / `saveAll` 通过 backend 文件边界写盘；UI 可触发手动 Save 并显示 saved / error。 |
| 26 | UI -> backend debounce | 编辑文本以短 debounce 同步到 backend buffer；连续编辑合并，不为每个按键跨进程调用。 |
| 27 | backend autosave debounce | backend 以较长 idle debounce 自动保存 dirty `.inscape`；只写回最新 revision。 |
| 28 | flush rules | 手动 Save、关闭窗口、切换 workspace、应用退出前 flush 最新 backend buffer；失败时 UI 可见。 |
| 29 | recovery snapshot | backend 写入 recovery snapshot，记录 relative path、revision、mtime、content hash 和文本；正常保存后清理过期 recovery。 |
| 30 | recovery UI | 打开 workspace 时发现 recovery 新于磁盘文件，UI 列出可恢复文件，并支持恢复、丢弃、稍后处理；discard 后不反复提示。 |

### F. Workspace 内部目录、资源、backup 与 settings，Round 31-34

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 31 | `.inscape-workspace/` 策略 | open workspace 时确保 `.inscape-workspace/recovery`、`.inscape-workspace/backups`、`.inscape-workspace/cache` 可发现或可创建；`.inscape-workspace/` 默认被 Git 忽略。 |
| 32 | write-back backup | localization CSV、`inscape.node-map.json`、`inscape.line-map.json` 写回前自动备份到 `.inscape-workspace/backups/`；默认启用。 |
| 33 | external resource import | 外部图片、音频、CSV 等导入时默认复制到 workspace 内 `assets/`；不把 workspace 外路径保存为长期依赖。 |
| 34 | settings 分层 | 建立全局设置与 workspace / project 设置 schema；至少覆盖 autosave、backup 保留策略、默认资源目录；若最小设置页暂缓，默认值集中在配置层，不散落在 feature controller。 |

### G. v0 闭环、Windows smoke 与文档，Round 35-36

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 35 | v0 最小闭环 smoke | 自动化或半自动 smoke 覆盖：打开目录、文件列表、编辑 `.inscape`、autosave、manual Save、recovery、diagnostics / completion、Preview choice click。 |
| 36 | Windows internal package v0 | 生成或启动 Windows 内部可用版；能打开 workspace、编辑保存、看到恢复提示、跑基础 LanguageServer authoring 能力；记录 smoke checklist 与已知限制。 |

## 4 轮缓冲

| 轮次 | 用途 |
|---|---|
| 37 | 如果 Electron / preload 安全边界实现复杂，用于补 IPC validation、structure guard 和 desktop transport smoke。 |
| 38 | 如果 DocumentBufferStore 接入 authoring / Preview 暴露回归，用于修 snapshot builder、revision guard 和 semantic parity。 |
| 39 | 如果 autosave / recovery / backup 在真实文件系统上暴露边界问题，用于修路径 guard、flush、恢复 UI 和 backup retention。 |
| 40 | 最终文档、全量验证、diff 审计和提交准备；不得进入 P1.5 long-lived LanguageServer。 |

## 每轮建议验证

轻量轮默认跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

涉及 LanguageServer / authoring endpoint 的轮次增加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

涉及 Preview / Runtime 的轮次增加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
```

涉及 localization / line-map / node-map 的轮次增加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
```

涉及 session / static assets / desktop shell 的轮次增加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
```

最终收口至少跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

如果新增 desktop-specific scripts，建议命名为明确的 contract / smoke 入口，例如：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop
```

这些命令只有在实现中实际新增后才纳入最终必跑清单。

## P1 完成判定

P1 完成时必须满足：

1. `EditorBackendClient` 支持 dev HTTP transport 与 desktop embedded transport，feature controller 不感知 transport 类型。
2. Electron renderer 没有 Node / fs / shell / arbitrary IPC 能力。
3. preload public API 是 editor command 白名单，不是通用系统 API。
4. backend 统一处理 workspace root、relative path、路径归一化和写回白名单。
5. open workspace 只接受目录，支持多个 `.inscape` 文件。
6. `ProjectSession` status 真实表达 embedded desktop mode、session id、workspace 摘要、language/runtime/tooling 子状态。
7. `DocumentBufferStore` 是 project document truth；UI draft store 只是交互态。
8. LanguageServer / Runtime / Tooling 请求基于 backend buffer 当前 revision。
9. autosave、manual Save、flush、save status、save error 全部可见且有 contract。
10. recovery snapshot 能发现、恢复、丢弃、稍后处理。
11. CSV / node-map / line-map 写回前自动 backup。
12. `.inscape-workspace/` 承担 recovery / backups / cache，并默认不进入 Git。
13. 外部资源导入默认复制到 workspace `assets/`。
14. settings schema 区分全局偏好与 workspace / project 行为。
15. v0 最小闭环 smoke 通过。
16. Windows internal package 或等价本机启动 smoke 通过。
17. README / architecture / backend migration map / handoff / TODO 已同步。
18. 全量验证通过，工作树变更边界清楚，可以提交。

## 风险控制

- 不在 P1 中默认启用 full long-lived LanguageServer；P1 只保证 ProjectSession / DocumentBufferStore 为 P1.5 铺好 ownership。
- 不把 embedded EditorBackend 做成新的 Compiler、LanguageServer、Tooling 或 Runtime 语义真相。
- 不让 renderer 获得通用本机能力。
- 不把 dev-host `/api/*` 当作最终产品 API。
- 不提供正式打开单文件模式。
- 不做多窗口共享 session。
- 不把 `.inscape-workspace/` 中的 recovery / backup / cache 当作可提交项目真相。
- 不依赖 Git 作为 autosave / recovery / backup 的基础机制。
- 不为 Bird / Unity 调整通用 backend v0 contract。

## 建议提交粒度

如果每个里程碑都能独立通过验证，建议按以下粒度提交：

```text
refactor: add self hosted backend transport contracts
feat: add self hosted electron preload boundary
feat: add self hosted workspace project session
feat: add self hosted document buffer store
feat: add self hosted save and recovery workflow
feat: add self hosted workspace backups and settings
test: add self hosted desktop v0 smoke
docs: document self hosted desktop backend v0 completion
```

如果改动量过大，不要把 40 轮合成一个巨大提交；至少按 Contract / Electron / ProjectSession / DocumentBuffer / Save Recovery / Final Smoke 六段拆分。
