# SelfHostedEditor desktop backend v0 实施计划

状态：计划

日期：2026-06-14

相关 ADR：

- [ADR 0018：SelfHostedEditor backend 使用业务窄接口并区分 session 状态](adr/0018-self-hosted-editor-backend-session-boundary.md)
- [ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](adr/0019-self-hosted-editor-embedded-backend-v0.md)
- [ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)

## 目标

desktop backend v0 的目标不是重写 Inscape 业务语义，而是把 SelfHostedEditor 从 dev-host request-driven prototype 推进到 editor session-driven product shell。

v0 成功后应满足：

```text
SelfHostedEditor UI
  -> EditorBackendClient
    -> embedded EditorBackend transport
      -> ProjectSession
      -> DocumentBufferStore
      -> LanguageServer / Runtime / Tooling / Compiler orchestration
      -> FileSystem boundary
```

业务语义仍归属：

- `Compiler`：项目 graph 与 DSL truth。
- `LanguageServer`：diagnostics / completion / hover / definition / references / outline。
- `Tooling`：localization / line-map / stable node map / host capability。
- `Runtime`：剧情运行态。

产品形态已经决定：

- desktop shell v0 采用 Electron。
- Electron renderer 只通过 preload 暴露的白名单 editor command 访问 backend，不直接访问 Node / 文件系统 / shell。
- v0 先做单窗口；后续多窗口时每个窗口独立 backend / ProjectSession，不共享 session。
- 一个窗口只打开一个 workspace folder。
- workspace 以目录为单位，支持多个 `.inscape` 文件。
- 不提供正式打开单文件功能。
- 外部资源默认复制进 workspace，不长期引用 workspace 外路径。
- 默认自动保存。
- backend 持有 dirty document buffers。
- backend 统一执行 workspace 文件系统边界检查。
- recovery / backup / cache 使用 workspace 内部目录 `.inscape-workspace/`。
- autosave 采用 debounce：UI 合并文本同步，backend 合并磁盘写入。
- 保留手动 Save 作为立即 flush；UI 显示保存状态；autosave 默认开启且可设置关闭。
- crash recovery 依赖磁盘 recovery snapshot。
- CSV / node-map / line-map 写回默认自动备份。
- Git 是可选增强，不是基础恢复机制。
- LanguageServer long-lived 是 v0 之后的关键下一步；若 v0 不交付，也必须保留清晰升级路径和验收入口。
- v0 首发平台是 Windows 内部可用版；签名、自动更新、安装器体验和 macOS 后置。
- v0 最小可用闭环是打开目录、文件列表、编辑、autosave、手动 Save、recovery、基础诊断 / 补全和 Preview。
- `.inscape-workspace/` 默认不进入 Git；若未来放项目级可复现配置，必须拆出明确可提交部分。

## v0 非目标

当前不做：

1. 独立 sidecar daemon。
2. 多窗口共享 session。
3. 跨重启 session restore。
4. VSCode 连接同一个 backend 进程。
5. 后台多项目服务。
6. 本地 localhost 产品 API。
7. 在 EditorBackend 中复制 Compiler / LanguageServer / Tooling / Runtime 语义。
8. 正式单文件工作模式。
9. v0 正式多窗口管理。
10. 长期引用 workspace 外资源路径。
11. 首发 macOS、签名、自动更新或完整安装器体验。

## 推荐命名

优先命名：

- `EditorBackend`
- `SelfHostedEditorBackend`
- `EditorBackendClient`
- `EditorBackendTransport`
- `ProjectSessionService`
- `DocumentBufferStore`
- `LanguageSessionClient`
- `RuntimeSessionClient`
- `LocalizationWorkflowClient`

避免命名：

- `InscapeBackend`
- `ProjectService`
- `BackendManager`
- `RuntimeService` 用于编辑器总后端

原因：backend 是 SelfHostedEditor 编辑器上层宿主编排，不是 Inscape 底层业务 backend。

## 阶段 0：当前阶段收口

先完成 [SelfHostedEditor 当前阶段 100% 收口推进计划](self-hosted-editor-current-stage-100-plan.md)。

特别是：

1. CSS warning 清零。
2. Summary fallback 的 `migration-target` 状态关闭。
3. Preview / StoryGraph / Localization / Outline fallback contract 再硬化。
4. project-session status 真实表达 dev-host mode。
5. LanguageSession stdio spike 支持范围写清楚。
6. ADR / backend migration map / handoff / TODO 同步。

完成后再进入 backend v0 代码实现。

## 阶段 1：定义嵌入式 EditorBackend contract

目标：先定义产品 backend 的窄接口，并以 Electron main process 作为 v0 embedded backend 的承载层。

新增或规划的 contract：

```text
EditorBackendTransport
  invoke(command, payload)

ProjectSessionService
  openWorkspaceFolder(request)
  closeProject(sessionId)
  getStatus(sessionId)

DocumentBufferStore
  listDocuments(sessionId)
  getDocument(sessionId, relativePath)
  updateDocument(sessionId, relativePath, text, baseRevision)
  setActiveDocument(sessionId, relativePath)
  saveDocument(sessionId, relativePath)
  saveAll(sessionId)
  getRecoveryStatus(sessionId)
  restoreRecoverySnapshot(sessionId, relativePath)
  discardRecoverySnapshot(sessionId, relativePath)

LanguageSessionClient
  diagnose(sessionId, request)
  completions(sessionId, request)
  definition(sessionId, request)
  references(sessionId, request)
  hover(sessionId, request)
  documentSymbols(sessionId, request)

RuntimeSessionClient
  startOrObserve(sessionId, request)
  step(sessionId, action)

LocalizationWorkflowClient
  review(sessionId, request)
  updateCsv(sessionId, request)
```

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

要求：

- UI controller 不依赖具体 desktop API。
- `EditorBackendClient` 仍是 UI 侧唯一业务入口。
- contract 不暴露通用 `call(method, payload)` 给 feature controller。
- Electron main process 只暴露受控 project / file / backend commands，不暴露任意文件读写。
- preload 可以封装内部 IPC 细节，但对 renderer 暴露的 API 必须保持窄接口。

## 阶段 1.5：Electron preload 与文件系统边界

目标：让桌面壳提供本机能力，但 renderer 页面不能直接获得本机文件系统或命令执行能力。

执行项：

1. BrowserWindow 使用隔离 renderer 配置：renderer 不直接获得 Node / Electron / shell 能力。
2. 新增 preload 层，只暴露 `window.inscape` 下的 SelfHostedEditor editor command。
3. preload 暴露的能力与 `EditorBackendClient` 对齐，不给 feature controller 通用 `fs.readFile`、`fs.writeFile`、`child_process` 或 arbitrary IPC。
4. main process / embedded backend 维护 workspace root，并只接受 workspace-relative path。
5. 文件系统边界拒绝绝对路径、`..` 越界、解析后不在 workspace 内的路径，以及未列入白名单的写回目标。
6. 允许的写回目标至少需要区分 `.inscape` 文档、localization CSV、stable node map sidecar、line map sidecar、recovery snapshot 与 backup。
7. status 类接口只返回摘要和计数，不返回文档正文、CSV、line-map 或 Runtime snapshot 本体。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

新增 contract / structure check 应覆盖：

- renderer production scripts 不直接 import / require `fs`、`child_process` 或 Electron runtime。
- renderer production scripts 不直接调用 arbitrary IPC。
- preload public API 只暴露白名单 editor command。
- preload 内部只允许通过固定 Electron IPC channel 转发白名单 editor command；不得暴露 generic invoke / send / request 给 renderer。
- workspace 外路径、绝对路径和路径穿越请求会被拒绝。

## 阶段 2：ProjectSession v0

目标：把当前 request snapshot 升级为嵌入式 backend 持有的项目会话模型。

ProjectSession v0 字段：

```json
{
  "format": "inscape.self-hosted-editor.project-session",
  "formatVersion": 1,
  "mode": "embedded-desktop",
  "sessionId": "...",
  "workspace": {
    "rootPath": "...",
    "workspaceName": "...",
    "activeRelativePath": "story/opening.inscape",
    "documentCount": 2,
    "revision": 7
  },
  "languageSession": {
    "kind": "process-per-request | stdio-spike | long-lived"
  },
  "runtimeSession": {
    "kind": "not-started | active"
  },
  "lineIdentitySession": {
    "kind": "not-started | active"
  },
  "localizationSession": {
    "kind": "not-started | active"
  }
}
```

执行项：

1. 设计 session id 生成和生命周期。
2. 只支持一个 active workspace folder 和一个窗口级 active project session。
3. open project 只接受目录，不接受单文件。
4. session close 时清理 Runtime / line-map / localization baseline 与 LanguageServer 子进程。
5. status 不暴露文件正文、CSV、line-map 或 Runtime snapshot 本体。
6. v0 不提供正式多窗口管理；后续多窗口必须按独立 ProjectSession 扩展。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
```

## 阶段 3：DocumentBufferStore v0

目标：让 backend 成为文档状态 truth，结束产品路径依赖“每次 request 上传当前 workspace snapshot”的模式。

DocumentBuffer v0 字段：

```json
{
  "relativePath": "story/opening.inscape",
  "text": "...",
  "diskTextHash": "...",
  "revision": 7,
  "dirty": true,
  "existsOnDisk": true,
  "lastLoadedUtc": "..."
}
```

执行项：

1. open workspace folder 时加载 `.inscape` 文件列表。
2. active document 文本更新只传 delta 或 full text 到 backend buffer。
3. backend 维护 dirty state 与 revision。
4. 默认自动保存 `.inscape` 文件。
5. 保存文件走 backend 文件系统边界。
6. LanguageServer / Runtime / Tooling 请求从 backend buffer 组装 workspace snapshot。
7. 前端仍可保留 UI draft store，但不能成为 project document truth。
8. 不提供正式单文件打开入口；如用户拖入单文件，只提示选择其所在目录或创建项目。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
```

## 阶段 3.2：workspace 内部目录与资源导入

目标：把编辑器内部状态、导入资源和 workspace 文件边界落到可维护的目录契约。

目录策略：

```text
.inscape-workspace/
  recovery/
  backups/
  cache/
assets/
```

执行项：

1. open workspace 时确保 `.inscape-workspace/` 可创建或可发现。
2. recovery snapshot 写入 `.inscape-workspace/recovery/`。
3. write-back backup 写入 `.inscape-workspace/backups/`。
4. 可重建缓存写入 `.inscape-workspace/cache/`，不得作为唯一数据来源。
5. `.inscape-workspace/` 默认写入 workspace `.gitignore` 或等价 ignore 规则；不要把 recovery / backup / cache 纳入项目提交。
6. 外部图片、音频、CSV 等资源导入时默认复制到 workspace 内 `assets/`，后续可细分 `assets/images/`、`assets/audio/`，或由用户显式选择 workspace 内目录。
7. backend 不把 workspace 外路径保存为长期项目依赖。
8. 若导入失败或复制失败，UI 显示可恢复错误，不创建半导入状态。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

新增 smoke 应覆盖：

- recovery / backup / cache 进入 `.inscape-workspace/`。
- `.inscape-workspace/` 默认被 Git 忽略。
- 外部资源导入后生成 workspace 内副本。
- 默认资源副本进入 `assets/`。
- workspace 外路径不能作为长期引用写入项目配置。
- `.inscape-workspace/cache/` 删除后可重建，不影响项目真相。

## 阶段 3.5：autosave / recovery v0

目标：默认自动保存，并为崩溃恢复提供磁盘 recovery snapshot。

执行项：

1. UI 编辑后用短 debounce 同步 backend buffer，避免每个按键都跨进程调用。
2. backend 维护 document revision；过期 debounce 不能覆盖较新的 revision。
3. backend 在短暂 idle 后用写盘 debounce 自动保存 dirty `.inscape` 文件。
4. 手动保存、关闭窗口、切换 workspace、应用退出流程前 flush 最新 backend buffer。
5. UI 显示保存状态：dirty、saving、saved、save error、recovery available。
6. 设置项允许关闭 autosave，但默认开启；关闭 autosave 不关闭 recovery snapshot。
7. backend 写入 recovery snapshot，记录 relative path、revision、mtime、content hash 和文本。
8. 下次打开 workspace 时扫描 recovery snapshot。
9. 如果 recovery 比磁盘文件新，向 UI 返回 recoverable documents。
10. UI 列出可恢复文件，并提供恢复 / 丢弃 / 稍后处理。
11. 正常保存后清理已过期 recovery。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

新增 smoke 应覆盖：

- 编辑后 backend revision 增长。
- 连续编辑会被 debounce 合并，不为每次按键写盘。
- autosave 只写回最新 backend revision。
- recovery snapshot 新于磁盘时被发现。
- 关闭窗口 / 手动保存会 flush 尚未写盘的最新内容。
- autosave 关闭后，手动 Save 与 recovery snapshot 仍工作。
- 保存状态能反映 dirty / saving / saved / error。
- recovery UI 能执行恢复 / 丢弃 / 稍后处理。
- discard 后不会反复提示。

## 阶段 3.6：write-back backup v0

目标：CSV / node-map / line-map 写回前自动备份。

执行项：

1. localization CSV 写回前备份。
2. `inscape.node-map.json` 写回前备份。
3. `inscape.line-map.json` 写回前备份。
4. 备份写入 `.inscape-workspace/backups/`。
5. 采用“最近 N 份 + 过期清理”的组合保留策略。
6. 设置项支持关闭或调整保留数量 / 保留天数。
7. 默认启用备份。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
```

## 阶段 3.7：settings 分层

目标：避免个人偏好污染项目配置，也避免项目行为只存在用户本机。

执行项：

1. 全局设置保存 UI 主题、autosave 开关、backup 保留数量 / 保留天数、默认导入资源目录。
2. workspace / project 设置保存项目入口、资源路径策略、导出配置、localization / node-map / line-map workflow 配置、Git / checkpoint 策略。
3. 影响项目可复现行为的设置必须随 workspace / project 走。
4. 影响用户个人偏好的设置必须留在全局。
5. v0 可以先提供最小设置页，覆盖 autosave、backup 保留策略和默认资源目录。
6. 如果最小设置页暂缓，配置 schema 仍先落地，默认值不得硬编码散落在 feature controller 或 workflow 中。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

## 阶段 3.8：v0 最小可用闭环

目标：用最小产品闭环验收桌面版是否真正能用于写作，而不是只验证单点 API。

闭环：

```text
打开目录 -> 文件列表 -> 编辑 .inscape -> autosave / 手动 Save -> recovery -> 基础诊断 / 补全 -> Preview
```

执行项：

1. 打开目录后能列出 workspace 内多个 `.inscape` 文件。
2. 选择文件后能编辑并更新 backend buffer revision。
3. autosave 和手动 Save 都能写回磁盘。
4. recovery snapshot 能在异常退出后被发现，并通过恢复 / 丢弃 / 稍后处理入口处理。
5. 基础 diagnostics 和 completion 使用 backend buffer 的当前内容。
6. Preview 能基于当前 workspace state 渲染并响应选项。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
```

## 阶段 4：LanguageSession ownership v0

目标：backend 管理 LanguageServer 生命周期，但不复制语言语义。

用户已确认 long-lived LanguageServer 很重要。阶段 4 的口径是：v0 可以不把真正 long-lived 作为阻塞项，但必须把它作为紧随 v0 的关键里程碑，而不是普通优化。

推荐顺序：

1. 第一版继续 `process-per-request`，但从 DocumentBufferStore 组 workspace snapshot。
2. 保留 `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 或等价 debug flag。
3. 用 ProjectSession / DocumentBufferStore / revision ownership 验证 long-lived 所需输入都已稳定。
4. 若 stdio 六项能力稳定，再切到 embedded backend 管理 long-lived LanguageServer。
5. 每个 endpoint 的 payload shape 继续与 LanguageServer contract 对齐。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

## 阶段 4.5：long-lived LanguageServer 关键里程碑

目标：在 desktop backend v0 基础稳定后，把 LanguageServer 从 request-driven 调用升级为 backend 管理的 workspace-scoped long-lived session。

执行项：

1. 打开 workspace 时由 backend 启动或复用对应的 LanguageServer session。
2. DocumentBufferStore revision 更新后，把当前文档变化同步给 LanguageServer。
3. diagnostics / completions / definition / references / hover / documentSymbols 都从同一份 LanguageServer workspace state 读取。
4. LanguageServer 崩溃、超时或协议错误时，backend 负责标记状态、重启或降级到 `process-per-request`。
5. 切换 workspace / 关闭窗口时，backend 负责停止 LanguageServer 并清理 session。
6. status 中暴露 long-lived session kind、health、last error summary、document revision lag，但不暴露文档正文。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

2026-06-17 第一刀状态：真实 Electron app 已默认启用 main-process workspace-scoped `Inscape.LanguageServer --stdio` session；open workspace 启动 / 复用、六个 authoring endpoint 的 current-buffer override、ProjectSession `long-lived` status、workspace switch dispose / restart、close-window / app-exit dispose hook 已有 contract。packaged app 尚未内置 LanguageServer artifact，崩溃后自动 restart 与 `process-per-request` 降级仍待后续补齐。

新增 smoke 应覆盖：

- 连续编辑后 LanguageServer 看到最新 backend revision。
- 多文件 reference / definition 使用同一 workspace state。
- LanguageServer 崩溃后状态可见，并能重启或回退。
- 回退路径不改变 shared LanguageServer payload shape。

## 阶段 5：RuntimeSession v0

目标：Runtime state 从 dev-host bounded cache 迁入 ProjectSession。

执行项：

1. startOrObserve 使用 backend buffer 当前 revision。
2. step 只传 action，不再需要前端上传完整 runtimeState。
3. source revision 改变时明确 runtime stale reason。
4. Preview choice click 继续以 Runtime 返回 snapshot 为准。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

## 阶段 6：Localization / line-map / node-map workflow v0

目标：把 dev-host session cache 中的 workflow state 迁入 ProjectSession，但语义继续由 Tooling / CLI contract 产生。

执行项：

1. localization baseline 存 file identity / path / mtime / byte length / selected name。
2. previous CSV text 只作为导入动作输入，不作为长期请求 body。
3. updateCsv 从 session baseline + draft overrides 生成。
4. line-map sidecar 归 session 管理。
5. node-map review/apply 继续调用 shared Tooling / CLI。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
```

## 阶段 7：desktop transport 接入

目标：引入真实桌面壳 invoke transport，但不改变 feature controller。

执行项：

1. `EditorBackendClient` 支持 transport 注入。
2. HTTP dev transport 保留用于 smoke。
3. Desktop embedded transport 新增独立 contract check。
4. 桌面壳只暴露 EditorBackend command，不暴露 arbitrary file read/write。
5. 如果桌面壳尚未选型，先以 fake embedded transport + Node direct harness 验证 contract。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

## 阶段 7.5：Windows internal package v0

目标：生成 Windows 内部可用版，而不是一次性解决完整发布体系。

执行项：

1. Electron 桌面壳能在 Windows 本机启动。
2. 能打开目录 workspace。
3. 能加载 SelfHostedEditor UI 与 embedded backend。
4. 不要求首版完成签名、自动更新、安装器美化或 macOS。
5. 打包产物要有 smoke checklist，覆盖打开 workspace、编辑保存、恢复提示和基础 LanguageServer authoring 能力。

当前进展：

- 2026-06-17 P1 Round 37 已补 Electron dev runtime、`start:desktop` 与 `smoke:desktop-runtime`。runtime smoke 会运行 Electron CLI `--version`，并在真实 Electron main process 中加载 `Desktop/ElectronMain.js` 的受保护 probe，检查 BrowserWindow 安全默认后退出。
- 该进展只证明桌面入口可由真实 Electron runtime 加载；尚未生成 Windows package，尚未执行 GUI 打开 workspace / 真实文件 IO / installer smoke。
- 2026-06-17 P1 Round 38 已补 `package:windows`、electron-builder build config 与 `check:desktop-package`。该检查固定 package main entry、files 白名单、Windows `dir` x64 target 与 artifact readiness；真实 `package:windows` 执行和 artifact smoke 仍是后续工作。
- 2026-06-17 P1 Round 39 已运行真实 `package:windows` 并新增 `smoke:desktop-package`，验证 Windows unpacked exe、`resources/app.asar` 与 builder metadata；GUI 打开 workspace、编辑保存、恢复提示和基础 LanguageServer authoring smoke 仍待后续。
- 2026-06-17 P1 Round 40 已补 packaged app protocol：Workbench 通过 `inscape-self-hosted-editor://app/` 加载，协议白名单只服务 `Resources/`、`Scripts/`、Monaco 与 packaged samples；这为真实 GUI smoke 消除了 `file://` 绝对路径风险。
- 2026-06-17 P1 post-40 已补 Electron IPC command boundary：preload 内部通过固定 `inscape.self-hosted-editor.backend.invoke` channel 转发白名单 editor command，main process 通过 dispatcher 复用 payload validator，显式拒绝未知 command，并让缺少实际 handler 的路径显式失败。
- 2026-06-17 P1 post-40 已补真实 Electron workspace open / read / write / recovery snapshot / autosave-flush lifecycle / recovery actions / GUI recovery smoke 局部闭环：main process 通过 `ElectronWorkspaceLifecycle` 持有并与 IPC 共享 `ElectronWorkspaceSessionStore`，通过原生 open-folder 选择目录，扫描真实 `.inscape` 文件并读入 `DocumentBufferStore`；`project-session.status` / workspace list / update draft / save 响应保持 text-free，显式 `document-buffer.read` 才返回请求文档正文。`document-buffer.save` / `save-all` 已写回真实磁盘并覆盖 stale revision / disk conflict；dirty edit 已写入 `.inscape-workspace/recovery/` snapshot，open workspace 可扫描 text-free recovery status，保存成功会清理 snapshot；idle autosave timer、BrowserWindow close、workspace switch 和 app-exit flush 已通过真实 save 路径写盘；`recovery.restore` / `recovery.discard` / `recovery.later` 已可执行真实 snapshot 写回、删除与稍后处理。`smoke:desktop-gui-recovery` 已用真实 BrowserWindow / app protocol / preload API 验证 open、edit、manual save、autosave、recovery actions，以及 diagnostics / completions 使用 restore 后当前 buffer。
- 2026-06-17 P1 post-40 已补 Windows packaged GUI smoke：`smoke:desktop-package-gui` 运行真实 `dist/win-unpacked/Inscape SelfHostedEditor.exe`，通过 packaged app 自身加载 Workbench/app protocol/preload，打开临时 workspace、编辑保存、recovery restore，并验证 diagnostics / completions 使用 restore 后当前 buffer；P1.5 long-lived LanguageServer 仍待后续。
- 2026-06-17 P1 post-40 已补真实 write-back backup IO：新增 desktop-only `workspace.write-back-backup` command，经 preload whitelist / Electron dispatcher 进入 `ElectronWorkspaceSessionStore.runWriteBackBackup()`；main process 复用 shared backup plan，把 localization CSV、node-map sidecar、line-map sidecar 复制到 `.inscape-workspace/backups/`，并执行 count-and-age retention cleanup。`check:electron-workspace` 覆盖三类真实复制、旧 backup 清理、禁用 backup、unsupported `.inscape` skip、desktop-only route 和 text-free response。
- 2026-06-17 P1 post-40 已补真实 assets import IO：新增 desktop-only `workspace.import-assets` command，经 preload whitelist / Electron dispatcher 进入 `ElectronWorkspaceSessionStore.importAssets()`；renderer payload 不传 workspace 外 source path，main process 通过原生多文件选择器或测试注入 selector 临时持有外部路径，复用 shared asset import plan，把图片、音频、CSV 复制到 workspace `assets/images|audio|data`。`check:electron-workspace` 覆盖真实 image/audio/CSV 复制、重名后缀、unsupported skip、取消导入、缺失源失败不留下目标文件、desktop-only route 和不持久化外部路径。
- 2026-06-17 P1 post-40 已补真实 GUI Preview smoke：`smoke:desktop-gui-recovery` 与 `smoke:desktop-package-gui` 现在都会在真实 Workbench / packaged exe 中确认 Preview 渲染默认样例、点击 choice 推进到目标 block，并验证 editor active source line reveal；该覆盖完成 v0 最小闭环里的 Preview GUI 验收。
- 2026-06-17 P1 post-40 已收口 SelfHostedEditor npm audit advisory：保留 `monaco-editor@0.55.1`，用 npm `overrides` 将间接 `dompurify` 提升到 `3.4.10`，避免 `npm audit fix --force` 降到 `monaco-editor@0.53.0`；`npm audit` 已清零。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace
```

## 阶段 8：全量验收

完整验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace
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
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

## 完成标准

v0 完成时：

1. SelfHostedEditor UI 不知道 backend 是 dev HTTP、embedded invoke 还是未来 sidecar。
2. Backend 持有 ProjectSession 与 DocumentBufferStore。
3. LanguageServer / Runtime / Tooling 都由 backend 编排，语义仍来自 Internal。
4. Preview、Graph、Localization、Outline 的 provider 状态真实。
5. 文件保存、previous CSV baseline、line-map sidecar 与 Runtime session 都有明确 ownership。
6. Renderer 只通过 preload 白名单访问 backend，不直接访问 Node / fs / shell。
7. Backend 统一执行 workspace 文件系统边界与写回白名单。
8. 外部资源默认复制进 workspace，不长期引用 workspace 外路径。
9. `.inscape-workspace/` 承担 recovery / backup / cache 内部目录。
10. `.inscape-workspace/` 默认不进入 Git。
11. Autosave debounce、手动 Save flush、保存状态、recovery snapshot 和写前 backup 都有自动化验收。
12. recovery UI 支持恢复 / 丢弃 / 稍后处理。
13. settings 明确区分全局偏好与 workspace / project 行为，并有最小设置页或稳定配置 schema。
14. v0 最小可用闭环通过 smoke。
15. Windows 内部可用包可启动并通过 smoke。
16. 文档明确说明 v0 是 embedded backend，不是 sidecar daemon。
