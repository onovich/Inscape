# ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend

状态：Accepted

日期：2026-06-14

## 背景

ADR 0018 已经决定 SelfHostedEditor 的 backend-facing 边界应使用业务窄接口，并且区分 UI state、dev-host transport cache 和未来 backend project session。

本轮需要进一步决定产品化 desktop backend v0 的物理形态：

- 嵌在桌面壳进程 / native command 层里。
- 作为独立本地 sidecar 进程运行。

同时需要明确 desktop backend 和 LanguageServer 的关系，避免把 backend 误做成第二套 Compiler、LanguageServer、Tooling 或 Runtime。

## 决策

SelfHostedEditor desktop backend v0 采用**嵌入式 EditorBackend**。

含义：

- 它是 SelfHostedEditor 桌面产品的编辑器应用后端 / 宿主编排层。
- 它优先服务 SelfHostedEditor 独立桌面产品，不把 VSCode 或 Web dev host 作为第一版共同宿主。
- 它在物理部署上随桌面壳启动和退出，不作为独立 daemon 或长期驻留 sidecar。
- 它在代码组织上保留可 sidecar 化边界，避免 UI 依赖具体 transport。

v0 默认产品范围：

- 一个 SelfHostedEditor 桌面窗口。
- 一个 active project session。
- 一个 workspace 的 document buffers、dirty state、revision 和 active document。
- 通过清晰接口编排 LanguageServer、Runtime、Tooling、Compiler 和文件系统。

v0 不做：

- 多窗口共享同一个 backend session。
- 后台 daemon。
- 跨重启 session restore。
- VSCode 直接复用同一个 backend 进程。
- 独立 localhost backend service。
- 把 dev-host `/api/*` 当作最终产品 API。

## 逻辑边界

EditorBackend owns editor session and resource orchestration; Internal owns semantic truth.

EditorBackend 负责：

- `ProjectSession` 生命周期。
- `DocumentBufferStore`、dirty state、revision、active document。
- 文件打开、保存、权限和写回边界。
- LanguageServer / Runtime / Tooling 子服务生命周期编排。
- Runtime session、Localization workflow、line-map / node-map workflow 的产品会话状态。
- session status、错误、stale reason 和可观测性。

Internal 继续负责：

- `Compiler`：DSL / graph / source map 真相。
- `LanguageServer`：diagnostics、completion、hover、definition、references、document symbols。
- `Tooling`：localization alignment、CSV update、line-map、stable node map、Host Schema / Host Binding presenter。
- `Runtime`：剧情推进、choice、flow step、path、rewind 等运行态语义。

Desktop backend 可以 host、spawn、重启或代理 LanguageServer，但不能复制 LanguageServer 语义。

## LanguageServer long-lived 定位

LanguageServer long-lived 是 SelfHostedEditor 走向正式编辑器体验的关键工作，不应被视为普通性能优化或可长期搁置的 nice-to-have。

但它不是 desktop backend v0 成立的前置阻塞项。v0 可以先继续使用 `process-per-request` 或当前 stdio spike，只要满足：

- `ProjectSession` 与 `DocumentBufferStore` 的设计能自然升级到 long-lived LanguageServer。
- backend 能统一管理 LanguageServer 生命周期，而不是让 UI controller 直接管理语言服务。
- 文档同步、revision、active document 和 workspace snapshot 的 ownership 足够清晰，避免未来切 long-lived 时重写 UI。
- long-lived LanguageServer 作为 v0 之后的关键下一阶段工作被显式跟踪。

换言之：v0 不必须一次性交付真正 long-lived LanguageServer，但 v0 的架构不能绕开它、削弱它，或把它降级成无明确时间点的可选优化。

## 为什么不是 sidecar v0

sidecar 适合更复杂阶段：

- 多宿主共享同一 project session。
- 多窗口 / 多项目 ownership。
- backend 崩溃后 UI 继续存活并重连。
- 后台长任务隔离。
- 跨 UI 重启继续持有 session。
- VSCode、SelfHostedEditor 或其他工具共同连接同一个服务。

这些目前不是 v0 的核心产品约束。过早引入 sidecar 会把启动、退出、旧进程清理、版本匹配、本地通信安全、端口或 pipe 权限等问题提前带入，而它们对当前目标的收益不足。

v0 更需要先验证：

- SelfHostedEditor 能打开真实项目。
- backend 能持有真实 project session 和 document buffers。
- UI 能通过稳定 transport 调用 backend。
- backend 能统一编排 LanguageServer、Runtime、Tooling 和文件写回。
- dev-host 临时 workspace 模式能逐步退出产品路径。

## 可 sidecar 化约束

虽然 v0 采用嵌入式部署，代码仍必须按未来可 sidecar 化设计：

- UI 只依赖 `EditorBackendClient` 与业务窄接口。
- transport 必须可替换，不能把桌面壳 API 直接散落到 feature controller。
- `ProjectSessionService`、`DocumentBufferStore`、`LanguageSessionClient`、`RuntimeSessionClient`、`LocalizationWorkflowClient` 等服务应能从嵌入式调用迁移到 IPC / stdio / named pipe / localhost transport。
- session status payload 不应暴露 workspace text、CSV、line-map 或 Runtime snapshot 本体。
- shared semantic payload shape 继续来自 `Internal`，不在 EditorBackend 中重新命名成私有 truth。

## 重新评估 sidecar 的触发条件

出现以下情况时，再重新评估 sidecar：

1. SelfHostedEditor 需要多个窗口共享同一个 project session。
2. VSCode 也需要同一个 editor project session，而不仅是 LanguageServer / Runtime / Tooling 能力。
3. backend 崩溃或长任务卡顿已经影响桌面壳稳定性，且嵌入式隔离不足。
4. 需要 backend 在 UI reload / crash 后继续持有 session。
5. 用户需要跨工具后台服务，例如 command palette、external watcher、automation 同时连接同一项目。
6. 产品需要多项目 daemon、远程协作或后台索引。

在这些触发条件出现前，不引入独立 sidecar daemon。

## 影响

- `SelfHostedEditorBackend` / `EditorBackend` 应作为编辑器上层宿主编排层命名，不应命名为含混的 `InscapeBackend`。
- VSCode 继续使用 extension + LanguageServer + Tooling / Runtime contract，不作为 v0 backend client。
- Web dev host 继续保留为开发验证和 smoke test 工具，不是产品 backend。
- v0 的优先工作是 ProjectSession、DocumentBufferStore、desktop invoke transport 和 session status，而不是 sidecar IPC。
- 如果未来迁到 sidecar，主要替换 transport 和进程 lifecycle，不应重写 UI controller 或 shared semantic logic。

## 验证

后续实现应至少通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

如果引入桌面壳 transport，还必须新增对应的 desktop backend contract / smoke，证明 UI 不需要知道 backend 是 embedded、sidecar、HTTP、stdio 还是 pipe。
