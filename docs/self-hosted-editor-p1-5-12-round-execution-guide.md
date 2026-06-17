# SelfHostedEditor P1.5 12 轮内执行指南

状态：执行交接指南

日期：2026-06-17

适用范围：`src/ExternalSupport/SelfHostedEditor`

## 目标

P1.5 的目标是把 P1 已经落地的 Electron + embedded EditorBackend v0 继续推进到 **backend 管理的 workspace-scoped long-lived LanguageServer** 可交付状态。

当前已知状态：

- P1 desktop backend v0 已验收通过。
- Electron main process 已经可以创建 / 复用 `Inscape.LanguageServer --stdio` session。
- `check:electron-language-session` 已覆盖六类 authoring endpoint、dirty buffer override、revision lag、协议错误后 replacement process restart、workspace switch dispose。
- 仍需收口的关键缺口是：packaged app 内置 LanguageServer artifact、packaged GUI 真实 long-lived LanguageServer smoke、缺失 artifact / spawn error / protocol error 时的可观测降级，以及文档最终一致。

P1.5 完成后应满足：

1. Electron desktop app 默认由 main process 管理 workspace-scoped long-lived `Inscape.LanguageServer --stdio` session。
2. packaged app 能解析并启动随包携带的 LanguageServer artifact，而不是依赖开发机源码目录。
3. diagnostics / completions / definition / references / hover / documentSymbols 都从同一个 workspace-scoped LanguageServer session 读取当前 backend `DocumentBufferStore` state。
4. document revision 更新后，LanguageServer 请求能看到最新 dirty buffer override。
5. workspace switch / close window / app exit 会 dispose 当前 LanguageServer session。
6. LanguageServer 缺失、启动失败、协议错误或超时时，backend status 能显示 health、last error summary、restart count、document revision lag，并能降级到 `process-per-request`。
7. 降级路径不改变 shared LanguageServer payload shape，不把语义复制到 EditorBackend。
8. packaged GUI smoke 覆盖真实 packaged app + real LanguageServer authoring path。
9. VSCode semantic parity、SelfHostedEditor dev-host HTTP 回归、.NET build 与 Internal tests 全绿。

P1.5 不包括：

1. P2 stable identity / localization review 产品化。
2. RuntimeSession long-lived 产品化。
3. sidecar daemon。
4. 多窗口共享 LanguageServer session。
5. VSCode 连接 SelfHostedEditor embedded backend。
6. 复制 Compiler / Tooling / Runtime / LanguageServer 语义到 EditorBackend。

## 开始前必读

```text
docs/agent-handoff.md
docs/todo.md
docs/self-hosted-editor-p1-self-check.md
docs/self-hosted-editor-p1-40-round-execution-plan.md
docs/self-hosted-editor-desktop-backend-v0-plan.md
docs/adr/0019-self-hosted-editor-embedded-backend-v0.md
docs/adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md
src/ExternalSupport/SelfHostedEditor/README.md
```

开始先看工作树：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

不要回滚或覆盖现有未提交 / untracked 文档。若要改同一文件，先读 diff，再按现有口径追加。

## 12 轮执行预算

本阶段必须压缩在 **10 轮主线 + 2 轮缓冲** 内完成。每轮至少形成一个可验证闭环；如果某轮无法完成，记录阻塞原因，不要把问题拖成开放式重构。

### Round 1：P1.5 基线审计

目标：确认当前 long-lived LanguageServer 已有能力和缺口。

完成标准：

- 列出 Electron long-lived LanguageServer 当前入口、status shape、dispose / restart 行为、dev vs packaged artifact resolution。
- 跑当前基线：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-gui-recovery
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-package-gui
```

### Round 2：LanguageServer artifact 打包策略

目标：让 packaged app 明确携带 LanguageServer artifact。

完成标准：

- 明确 dev 环境与 packaged 环境的 artifact lookup 顺序。
- `package.json` / electron-builder config 或等价打包配置包含 LanguageServer runtime artifact。
- 不把源码目录、测试临时目录或用户机器绝对路径写进 packaged app contract。
- 新增或扩展 package contract 覆盖 artifact 存在性。

建议命令：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-package
```

### Round 3：LanguageServer artifact resolver

目标：把 artifact 查找收口到 main process / backend 层。

完成标准：

- resolver 能区分 dev workspace 路径与 packaged resources 路径。
- status 只暴露 artifact kind / health / error summary，不暴露本机敏感绝对路径细节。
- missing artifact 返回明确错误或 fallback reason。
- contract 覆盖 dev path、packaged path、missing path。

### Round 4：packaged app 真实 long-lived LanguageServer smoke

目标：确认 packaged GUI 不再只靠 fake handler 或 process-per-request 兜底。

完成标准：

- `smoke:desktop-package-gui` 或新增 smoke 覆盖 packaged app 启动真实 LanguageServer artifact。
- 在 packaged app 中执行 diagnostics / completion，确认 `project-session.status` 报告 `long-lived` 或等价状态。
- 验证 dirty buffer edit 后 LanguageServer 请求读到最新 buffer。

### Round 5：六类 authoring endpoint packaged parity

目标：packaged app 里六类 authoring endpoint 都走同一个 workspace-scoped session。

完成标准：

- diagnostics、completions、definition、references、hover、documentSymbols 在 packaged 或 equivalent packaged harness 中全部通过。
- payload shape 继续对齐 shared LanguageServer contract。
- VSCode semantic parity 不受影响。

建议命令：

```powershell
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

### Round 6：process-per-request 降级路径

目标：LanguageServer artifact 缺失、spawn error、协议错误或超时时不让编辑器不可用。

完成标准：

- missing artifact / spawn failure / protocol error / timeout 都会进入明确 fallback。
- fallback 使用现有 process-per-request helper 或等价路径，不复制 LanguageServer 语义。
- status 暴露 `health`、`lastError`、`fallbackKind`、`restartCount`、`documentRevisionLag` 摘要。
- fallback 下六类 authoring endpoint payload shape 不变。

### Round 7：restart / dispose 生命周期硬化

目标：长驻进程生命周期稳定。

完成标准：

- workspace switch dispose old session 并为新 workspace 创建 / 复用对应 session。
- close window / app exit flush 后 dispose session。
- 协议错误后下一次 request 能 restart replacement process。
- stale request 不污染新 workspace session。

建议命令：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-lifecycle
```

### Round 8：status / observability 收口

目标：状态可读，但不泄露内容。

完成标准：

- ProjectSession status 表达 LanguageServer kind、health、pid/process summary 或 sanitized id、last error summary、restart count、document revision lag、supported endpoints。
- status 禁止暴露 document text、workspace full text、CSV、line-map、Runtime snapshot、raw stderr 全量内容。
- UI session panel 能显示轻量 long-lived state。

### Round 9：全量回归与 packaged smoke

目标：确认 P1.5 没破坏 P1 / dev-host / VSCode / Internal。

必跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run package:windows
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-package-gui
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

### Round 10：文档与交接收口

目标：把 P1.5 完成状态写清楚。

完成标准：

- 更新 `docs/todo.md`、`docs/agent-handoff.md`、`docs/self-hosted-editor-p1-40-round-execution-plan.md`、`src/ExternalSupport/SelfHostedEditor/README.md`。
- 明确 P1.5 完成，不暗示 P2 已开始。
- 记录验证命令和已知 residual risk。
- 工作树变更边界清楚，可以提交。

### Round 11-12：缓冲轮

用途：

- Round 11：如果 packaged artifact 或 fallback 暴露平台路径问题，用于修 artifact resolver / package config。
- Round 12：如果 GUI smoke 或 full regression 暴露回归，用于修验证、补文档和整理 diff。

缓冲轮禁止进入 P2。

## 最终验收清单

P1.5 完成时必须通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-lifecycle
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run package:windows
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-package-gui
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
npm --prefix src\ExternalSupport\SelfHostedEditor audit --audit-level=moderate
```

通过标准：

1. packaged app 使用随包 LanguageServer artifact 或明确 resolver，而不是依赖开发机源码目录。
2. packaged GUI smoke 覆盖真实 long-lived LanguageServer authoring path。
3. process-per-request fallback 可用且状态可见。
4. workspace switch / close / app-exit 正确 dispose LanguageServer session。
5. status 不泄露正文或大块 raw process output。
6. VSCode parity 和 Internal tests 全绿。
7. `npm audit` 无 moderate 及以上漏洞。

## 禁止通过项

出现以下任一情况，P1.5 不得宣布完成：

1. packaged app 找不到 LanguageServer artifact，但仍宣布 long-lived ready。
2. packaged GUI smoke 只走 fake handler 或 process-per-request，却宣称 long-lived path 已验证。
3. fallback 通过复制 LanguageServer / Compiler 语义实现。
4. status 泄露文档正文、CSV、line-map、Runtime snapshot 或完整 raw stderr/stdout。
5. workspace switch 后旧 LanguageServer session 仍接受新 workspace request。
6. VSCode semantic parity 失败。
7. `.NET build` 或 Internal tests 失败。
8. 文档暗示已经进入 P2，但 P1.5 验收未过。

## 交接结论格式

完成后用这三行结论：

```text
P1.5 long-lived LanguageServer: PASS / FAIL
P2 stable identity / localization review entry allowed: YES / NO
Blocking reason if NO:
```

若通过，下一 phase 才是 P2：稳定身份与本地化 review 主线。
