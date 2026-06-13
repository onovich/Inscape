# SelfHostedEditor long-lived backend 与 fallback 迁出方案

状态：方案

适用范围：`src/ExternalSupport/SelfHostedEditor`

本文回答两个问题：

1. 实现真正 long-lived backend 还缺什么，现在是否适合做。
2. Summary / Preview / StoryGraph / Localization 等仍有草模 fallback，是否好解决，以及应按什么顺序解决。

## 结论

现在适合做 **long-lived backend 的第一刀**，不适合一次性实现完整正式 backend。

推荐目标不是立刻替换当前 dev host，而是先实现：

```text
Backend Session v0
  - 明确 project session id
  - 管理 workspace documents / active document / revision
  - 暴露 session status
  - 让 LanguageServer / Runtime / line-map / localization 都绑定同一个 session vocabulary
  - 继续复用现有 HTTP smoke 和 shared Internal contract
```

不建议现在直接做：

```text
Full Desktop Backend
  - 完整文件权限模型
  - 真正持久项目会话
  - 常驻 Runtime + 常驻 LanguageServer + Tooling direct service 全部一次落地
  - Tauri / sidecar / .NET backend 方案一次定死
```

原因：当前 `EditorBackendClient` 和 bridge 边界已经准备好了，适合推进 session v0；但桌面壳、文件权限、真实 project open 生命周期、持久缓存、进程恢复策略还没有足够产品约束，一次做满容易过度设计。

## long-lived backend 还缺什么

### 1. ProjectSession 生命周期

当前 dev host 是 request-driven；真正 backend 需要 project-driven：

```text
openProject
  -> create ProjectSession
  -> load workspace documents
  -> hold active document / dirty buffers / revision
  -> serve language/runtime/tooling requests
  -> closeProject
```

缺口：

- workspace identity。
- project session id。
- active document identity。
- document revision / dirty state。
- buffer 与真实文件的关系。
- close / dispose / recover lifecycle。

第一刀只需要内存态，不需要持久保存。

### 2. DocumentBufferStore

当前请求会携带 `scriptText` / `workspace`，dev host 建临时 workspace。正式 session 至少需要：

- 当前打开的 documents。
- 每个 document 的 path、text、revision、dirty。
- active document。
- workspace-relative path normalization。
- 对未保存内容参与 diagnostics / references / graph 的统一入口。

第一刀可以继续由前端提交 workspace snapshot，但 backend 应把它登记为 session buffer，而不是每个能力独立解释 request body。

### 3. 常驻 LanguageServer 会话

当前 SelfHostedEditor 的 LanguageServer 能力仍通过 dev host 调命令完成。真正 backend 需要：

- session 级 LanguageServer client。
- request cancellation / debounce。
- process crash detection / restart。
- stderr / diagnostics 日志。
- workspace revision invalidation。
- 与 VSCode semantic parity 保持同一套结果。

第一刀可以先保持 process-per-request，但 request model 必须改成 session-aware；第二刀再替换成 long-lived process。

### 4. RuntimeSession

当前 Runtime snapshot 已有 dev-host bounded cache，但还不是正式 Runtime session。

真正 backend 需要：

- runtime session id。
- compiled graph revision。
- current snapshot。
- action history / path。
- source revision 变化时的 invalidation 策略。
- Runtime unavailable / stale / reset 状态。

第一刀可以让现有 runtime cache 服从 `ProjectSession` vocabulary，不急着改 Runtime 实现。

### 5. LineIdentitySession

当前 line-map sidecar 缓存在 dev host 中。正式 session 需要：

- sidecar 对应 workspace / document / mtime / source fingerprint。
- refresh report。
- drift / conflict 状态。
- 写回 sidecar 的权限和备份策略。

第一刀仍可只读 / refresh，不急着做真实写回。

### 6. LocalizationSession

当前 localization baseline CSV 可以按 sessionId 缓存，但还没有正式文件身份。

真正 backend 需要：

- selected baseline file identity。
- path 或 file handle。
- mtime / byte length。
- current review presenter。
- draft overrides keyed by anchor。
- update / write-back 状态。

第一刀可以保留浏览器 file handle 和 dev-host previousCsv fallback，但 backend status 必须明确这是 dev-host mode。

### 7. Backend diagnostics 与可观测性

真正 backend 不能只返回 500；它需要：

- mode：`dev-host` / `project-session`。
- language session status。
- runtime session status。
- line-map session status。
- localization session status。
- last error / stale reason / revision mismatch。

不能暴露：

- Runtime snapshot 内容本体。
- CSV 内容本体。
- line-map 内容本体。

## 当前是否适合做

适合做：

- Backend Session v0。
- Summary / Outline fallback 迁出。
- Preview / StoryGraph fallback 状态显式化。
- Localization draft fallback 与 hosted presenter 分离。
- LanguageServer request model session-aware。

暂不适合做：

- 一次性替换成完整桌面 backend。
- 一次性从 Node dev host 迁到 .NET sidecar。
- 删除 dev-host HTTP smoke。
- 删除所有 fallback。
- 在 backend 中直接重写 Tooling / Runtime / Compiler 逻辑。

判断标准：

```text
如果改动能让 UI controller 更不关心 transport，并且不改变 shared payload shape，就适合现在做。
如果改动需要决定桌面打包、文件权限、持久存储和跨平台进程管理，就先只写 ADR / spike，不进主线实现。
```

## 推荐路线

### 阶段 A：Backend Session v0

目标：建立 session vocabulary，不改语义，不替换全部底层实现。

建议新增：

```text
DevScripts/SelfHostedEditorProjectSessionBridge.js
DevScripts/SelfHostedEditorProjectSessionContractCheck.js
Scripts/Backend/Models/EditorBackendProjectSessionModel.js
```

最小 session model：

```json
{
  "format": "inscape.self-hosted-editor.project-session",
  "formatVersion": 1,
  "mode": "dev-host",
  "sessionId": "default",
  "workspace": {
    "source": "request-snapshot",
    "activeRelativePath": "samples/court-loop.inscape",
    "documentCount": 1,
    "revision": 1
  },
  "languageSession": {
    "kind": "process-per-request"
  },
  "runtimeSession": {
    "kind": "bounded-cache"
  },
  "lineIdentitySession": {
    "kind": "bounded-cache"
  },
  "localizationSession": {
    "kind": "bounded-cache"
  }
}
```

实施：

1. 增加 session model 和 direct contract。
2. `EditorBackendClient.diagnostics.sessionStatus()` 返回 project-session shaped status。
3. Runtime / line-map / localization bridge 继续使用现有 endpoint，但 request 都带同一 session identity。
4. Structure check 防止新 bridge 绕开 backend client。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

完成标准：

- 前端能显示当前是 `dev-host` session，不误称为正式 backend。
- Runtime / line-map / localization 使用一致 session vocabulary。
- 不改变任何成功 payload shape。

### 阶段 B：LanguageSession v0

目标：让 LanguageServer 请求变成 session-aware，为常驻 LS 做准备。

实施：

1. 新增统一 request model：

```text
languageSession request
  sessionId
  workspace
  activeRelativePath
  documentRevision
  query
```

2. diagnostics / hover / definition / references / completions / documentSymbols 都走这个 request model。
3. 当前底层仍可 process-per-request。
4. session status 中保留 `kind: "process-per-request"`，不要伪装。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

完成标准：

- SelfHostedEditor / VSCode semantic parity 不变。
- 未来可把 `process-per-request` 替换成 long-lived LS，而 UI controller 不改。

### 阶段 C：常驻 LanguageServer spike

目标：做最小可回退 spike，不替换主路径。

实施：

1. 在 DevScripts 中新增可选 `SelfHostedEditorLanguageSessionBridge`。
2. 使用已构建 LanguageServer stdio session。
3. 只覆盖 diagnostics + documentSymbols 两个低风险入口。
4. 用环境开关启用，例如 `SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio`。
5. 默认仍走当前稳定路径。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- spike 能证明 long-lived LS 可行。
- 失败可回退到 process-per-request。
- 不影响默认 dev host smoke。

## fallback 迁出难度判断

总体判断：**好解决，但要按能力分层做，不要直接删除草模。**

| 区域 | 难度 | 建议 |
|---|---:|---|
| Workspace Summary | 低 | 最先做，从已有 hosted payload 聚合 |
| DocumentSymbols / Outline | 低到中 | 正常路径已有 LS；fallback 只保留离线显示 |
| Preview | 中 | 正常路径已有 Compiler graph / Runtime；需要把 fallback 显式变成 offline mode |
| StoryGraph | 中 | 正常路径已有 Compiler graph；需补 provider 状态和 malformed 区分 |
| Localization | 中到高 | Tooling presenter 已有，但 draft table / CSV 文件交互要继续保留，需分清 hosted review 与 offline draft |
| EditorAuthoringSurface | 不建议强迁 | Monaco 几何、line hint、UI interaction 可保留 offline-only 草模 |
| Diagnostics fallback | 可保留 | LS 不可用时显示 draft diagnostics，但必须标明 fallback |

## fallback 迁出实施顺序

### F1：Workspace Summary 迁出草模

目标：

- hosted 正常路径 summary 不再从 `ScriptDocumentModelBuilder` 统计。

建议新增：

```text
Scripts/ProjectWorkspace/Models/WorkspaceSummaryHostedModelBuilder.js
```

输入来源：

- Compiler project graph：node count。
- Localization presenter：localization row count。
- Diagnostics payload：diagnostic count。
- Localization draft store：draft count。
- Runtime session status：optional。

保留：

- `ProjectWorkspaceSummaryModelBuilder` 改名或限定为 `ProjectWorkspaceDraftSummaryModelBuilder`。
- `WorkspaceSummaryStatus` fallback reason 只在 hosted summary 不可用时使用。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
```

完成标准：

- 正常 hosted 路径 summary provider 为 `shared` 或 `backend`。
- `workspace-summary-status` 不再是常规路径。

### F2：Outline fallback 降级为 offline-only

目标：

- Outline 正常路径必须来自 `LanguageServer documentSymbols`。
- fallback 只在 LanguageServer unavailable 时显示 `Draft outline`。

实施：

1. `SelfHostedEditorDocumentSymbolBridge` 保持 provider 区分。
2. `DocumentOutlineController` 显示 provider。
3. Model contract 覆盖 LanguageServer outline 与 Draft outline 两条状态。
4. 如果 LanguageServer 返回 malformed symbols，不回退草模，显示 error。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- `DocumentSymbolsLanguageServerUnavailable` 是显式 unavailable fallback。
- malformed shared payload 不被草模掩盖。

### F3：Preview fallback 显式 offline mode

目标：

- Preview 只有在 Compiler graph unavailable 时进入 offline draft preview。
- Compiler graph malformed 继续 contract error。

实施：

1. 在 Preview model 中增加 provider status：

```text
compiler-project
runtime
offline-draft
contract-error
```

2. UI 显示 provider 状态。
3. `PreviewCompilerGraphContractGuard` 继续守 malformed graph。
4. Model contract 覆盖 provider 状态。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- 正常 hosted Preview 不依赖草模。
- offline draft preview 是明确降级状态。

### F4：StoryGraph fallback 显式 offline mode

目标：

- StoryGraph 正常路径只消费 Compiler project graph。
- draft graph 只作为 offline graph preview。

实施：

1. Graph model 增加 provider：

```text
compiler-project
offline-draft
contract-error
```

2. Graph panel 显示 provider 状态。
3. malformed Compiler graph 显示 error，不回退 draft graph。
4. 保持 edge / retarget / reference projection 行为不变。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

完成标准：

- 正常 hosted Graph 不依赖草模。
- draft graph 不再像正常成功路径。

### F5：Localization hosted / draft table 分离

目标：

- Localization 正常路径只消费 Tooling presenter。
- Draft fallback 表仅用于 review bridge unavailable。

实施：

1. `LocalizationReviewRowsModelBuilder` 输出 provider-aware rows。
2. Hosted review 空表和 review unavailable 分开。
3. Draft fallback 模式禁用真实 update / replace，并显示原因。
4. Model contract 覆盖“不把 draft row 混入 hosted presenter”。

验收：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
```

完成标准：

- hosted review table 与 draft fallback table 明确分离。
- CSV update 继续只走 Tooling / CLI。

## 推荐近期路线

建议下一阶段按以下顺序做：

1. `refactor: move self hosted summary to hosted model`
2. `refactor: make self hosted outline fallback explicit`
3. `refactor: mark self hosted preview fallback as offline mode`
4. `refactor: mark self hosted graph fallback as offline mode`
5. `refactor: split self hosted localization hosted and draft rows`
6. `refactor: add self hosted backend project session model`
7. `refactor: make self hosted language requests session-aware`
8. `spike: add optional self hosted language server session`

理由：

- Fallback 迁出比 full backend 风险低，收益快。
- Summary / Outline 最容易先拿下。
- Preview / StoryGraph / Localization 做完后，前端正常路径基本不再依赖草模。
- 此时再做 backend session，状态边界会更清楚。

## 不推荐路线

暂不推荐：

- 直接删除 `ScriptDocumentModelBuilder`。
- 直接改成完整 `.NET backend`。
- 直接引入 WebSocket。
- 直接引入 Tauri/Rust session 管理。
- 把现有 `/api/*` 全部改名。
- 把 Runtime / localization / line-map 内容塞进 session status。

## 验证矩阵

每个 fallback 迁出节点至少跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

能力相关追加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
```

backend session 节点追加：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

阶段大验收：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

## 成功标准

完成本方案后，应达到：

- Summary / Outline 正常 hosted 路径不依赖草模。
- Preview / StoryGraph / Localization 的草模 fallback 都是显式 offline mode。
- `ScriptDocumentModelBuilder` 仍存在，但只承担 offline / unavailable fallback，不承担 hosted 正常路径。
- `EditorBackendClient` 已能承接 session-aware request。
- Backend status 能清楚表达当前仍是 `dev-host`，未来可替换为 `project-session`。
- long-lived backend 的下一步可以从 LanguageServer session spike 开始，而不是从 UI controller 重写开始。
