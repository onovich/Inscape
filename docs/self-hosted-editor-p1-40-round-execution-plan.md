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
| 17 | close / switch workspace cleanup | close 或切换 workspace 时清理 Runtime / line-map / localization baseline 与临时子 session；status 只返回摘要和计数。 |
| 18 | session panel / status 接入 | UI session panel 显示 embedded mode、session id、workspace 摘要、language mode、runtime / line / localization 状态；不泄露正文、CSV、line-map 或 Runtime snapshot。 |

### D. DocumentBufferStore v0，Round 19-24

| 轮次 | 目标 | 完成标准 |
|---|---|---|
| 19 | DocumentBuffer model | backend buffer 记录 `relativePath`、text、disk hash、revision、dirty、existsOnDisk、lastLoadedUtc；contract 覆盖最小字段。 |
| 20 | list / get / update / active document | 打开 workspace 后可列文档、取文档、更新文本、设置 active document；revision 只增不倒退。 |
| 21 | baseRevision 与 stale guard | `updateDocument` 使用 `baseRevision` 或等价 stale guard；旧 debounce 不能覆盖更新 revision。 |
| 22 | workspace snapshot builder | LanguageServer / Runtime / Tooling 请求从 backend buffer 组装 workspace snapshot，不再依赖前端每次上传完整 workspace truth。 |
| 23 | authoring endpoint 接入 buffer | diagnostics / completions / definition / references / hover / documentSymbols 使用 backend buffer 当前内容；payload shape 仍与 shared LanguageServer contract 对齐。 |
| 24 | Preview / Runtime 接入 buffer | Preview / Runtime 使用 backend buffer 当前 workspace state；Preview choice click invariant 保持不变。 |

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
