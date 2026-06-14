# ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略

状态：Accepted

日期：2026-06-14

补充确认：2026-06-15

## 背景

ADR 0019 已决定 SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend，而不是独立 sidecar daemon。接下来需要决定桌面壳、项目入口、保存与恢复策略。

SelfHostedEditor 的产品形态更接近项目制创作工具和轻量游戏引擎，而不是单文件脚本编辑器。它需要同时管理 `.inscape` 多文件、localization CSV、stable node map、line map、Runtime session 和 Tooling workflow。

## 决策

SelfHostedEditor v0 采用：

1. 桌面壳：Electron。
2. Electron renderer 通过 preload 暴露的白名单能力访问 backend；UI 页面不直接使用 Node / 文件系统能力。
3. 项目模型：一个窗口一个 workspace folder。
4. 文件入口：只提供打开目录 / 项目，不提供打开单文件功能。
5. workspace：目录作为工作空间，支持多个 `.inscape` 文件。
6. 文件系统边界：所有项目文件读写由 backend 执行，并限制在当前 workspace 与明确允许的项目文件类型 / 工具产物范围内。
7. 未保存内容：UI 与 embedded EditorBackend 都持有，backend 是 session truth。
8. 恢复机制：依赖磁盘 recovery snapshot，而不是只依赖 UI 内存或 backend 内存。
9. 保存策略：默认自动保存，并通过 debounce 合并 UI 到 backend 的文本同步和 backend 到磁盘的写入。
10. 自动备份：CSV、node-map、line-map 等工具写回文件默认写前备份，并可在设置中调整或关闭。
11. Git：作为可选增强，不作为唯一备份 / 恢复机制。
12. 多窗口：v0 先做单窗口；后续支持多窗口时，每个窗口拥有独立 backend / ProjectSession，不共享 session。
13. 外部资源：图片、音频、CSV 等外部导入默认复制进 workspace，不长期依赖 workspace 外路径。
14. workspace 内部目录：recovery、backup、cache 等编辑器内部状态集中放入明确的 workspace 内部目录，v0 采用 `.inscape-workspace/`。
15. autosave UX：保留手动 Save 作为立即 flush；显示保存状态；autosave 默认开启，可在设置中关闭。
16. 首发平台：v0 先做 Windows 内部可用版；签名、自动更新和安装器体验后置。
17. 设置分层：UI 主题、autosave、backup 保留数量偏全局设置；项目入口、资源路径、导出配置、Git/checkpoint 策略偏 workspace / project 设置。
18. v0 最小可用闭环：打开目录、文件列表、编辑、autosave、手动 Save、recovery、基础诊断 / 补全和 Preview。
19. `.inscape-workspace/`：v0 默认不进入 Git；如未来存放项目级可复现配置，应拆出明确可提交部分。
20. 资源目录：外部资源默认复制到 `assets/`，后续可细分 `assets/images/`、`assets/audio/`。
21. 恢复体验：发现 recovery 新于磁盘文件时，列出可恢复文件，并提供恢复、丢弃、稍后处理。
22. 设置页：v0 可以先提供最小设置页；如果实现暂缓，也必须保留配置结构，不把默认值写死在调用点。

## 为什么选择 Electron v0

Electron 与当前 SelfHostedEditor 的 Web / Monaco / JavaScript 架构最贴近：

- Monaco 在 Chromium 环境中行为稳定。
- 当前 dev host 和 frontend bridge 已经大量使用 JavaScript / Node 生态。
- Electron main process 适合作为 v0 embedded EditorBackend 的物理承载层。
- 可以最快把 ProjectSession、DocumentBufferStore、file IO、LanguageServer / Runtime / Tooling orchestration 接到真实桌面产品闭环。

Tauri 后续可以重新评估，但 v0 不引入 Rust 作为第三技术栈。WebView2/.NET 与 Avalonia 暂不作为 v0 目标。

## Electron renderer 边界

v0 采用 Electron 不意味着 UI 页面获得完整本机能力。renderer 只负责编辑器界面、Monaco、预览和交互状态；本机能力通过 preload 暴露给 renderer，且只暴露 SelfHostedEditor 需要的业务白名单。

最低边界：

- renderer 不直接访问 `fs`、`child_process`、shell 或任意 Electron IPC。
- preload 只暴露 `EditorBackendClient` 所需的窄能力，例如打开 workspace、读取/更新文档 buffer、保存、恢复、运行 shared Tooling workflow。
- UI controller 只依赖 `EditorBackendClient`，不依赖 Electron API。
- Electron main process / embedded backend 可以在内部使用 IPC，但对 renderer 暴露的 surface 必须是受控 editor command，而不是通用 `readFile(path)` / `writeFile(path, text)` / `run(command)`。
- 该边界既用于降低 renderer 漏洞影响面，也用于保证保存、恢复、备份和 workspace ownership 不散落在 UI 组件中。

## Workspace 边界

v0 只支持：

```text
一个窗口 = 一个 workspace folder = 一个 active project session
```

不提供打开单文件入口。用户必须打开一个目录作为 workspace。

原因：

- Inscape 的核心能力依赖项目上下文，而不是单个文件。
- 多文件 graph、cross-file references、localization、node-map、line-map 和 Runtime 都需要 workspace。
- 与 VSCode / 游戏引擎类工具的心智一致。
- 避免单文件临时 workspace 造成“看似可用但项目状态不完整”的歧义。

后续如果需要支持从单文件迁移，只提供“选择包含该文件的目录作为 workspace”或“从文件创建项目”的显式流程，不做隐式单文件模式。

## 窗口与平台

v0 先做单窗口产品形态。一个应用实例只服务一个 active workspace。后续如果支持多窗口，应按“每个窗口一个独立 backend / ProjectSession”扩展，而不是让多个窗口共享同一个 session。

原因：

- 当前 v0 的核心风险在 ProjectSession、DocumentBufferStore、保存恢复和文件边界，不在多窗口调度。
- 多窗口共享 session 会提前引入 ownership、并发写盘、跨窗口 stale state 和崩溃隔离问题。
- 独立窗口模型更接近“每个项目一个工具实例”的游戏引擎心智。

首发平台采用 Windows 内部可用版。签名、自动更新、安装器美化、macOS 兼容和跨平台发布策略后置。

v0 最小可用闭环定义为：

```text
打开目录 -> 文件列表 -> 编辑 .inscape -> autosave / 手动 Save -> recovery -> 基础诊断 / 补全 -> Preview
```

不进入这个闭环的能力可以后置；进入这个闭环的能力必须有基本验收。

## 文件系统边界

所有项目文件访问都由 backend 统一处理。renderer 不能直接决定“读写任意本机路径”，只能表达编辑器意图。

v0 文件系统边界：

- workspace root 在 `openWorkspaceFolder` 时确定，并作为当前 ProjectSession 的根。
- backend 接收相对路径，并在写入前解析、归一化和校验，拒绝绝对路径、`..` 越界和解析后不在 workspace 内的路径。
- `.inscape` 文档、localization CSV、stable node map sidecar、line map sidecar、recovery snapshot 和 backup 走明确的文件类型 / 目录白名单。
- 工具写回必须走 backend 的备份 / recovery / dirty state 规则，而不是由 UI 组件直接写盘。
- status / diagnostics 类接口不返回大块文件正文、CSV、line-map 或 Runtime snapshot 本体，避免把 session 内容通过状态接口意外暴露。

## Workspace 内部目录与资源导入

v0 采用 `.inscape-workspace/` 作为 SelfHostedEditor 的 workspace 内部目录，用来存放编辑器内部状态，而不是把 recovery / backup / cache 散落到项目根目录。

建议结构：

```text
.inscape-workspace/
  recovery/
  backups/
  cache/
```

约束：

- recovery snapshot 放入 `.inscape-workspace/recovery/`。
- 写前 backup 放入 `.inscape-workspace/backups/`，并按原目标文件分组或编码路径。
- 可重建缓存放入 `.inscape-workspace/cache/`，不得作为唯一数据来源。
- stable node map、line map 等正式 sidecar 是否放在项目根或内部目录，由对应 workflow 契约决定；但只要属于自动恢复 / 备份 / 缓存，就进入 `.inscape-workspace/`。
- `.inscape-workspace/` 在 v0 默认不进入 Git；如果未来确实需要存放项目级可复现配置，应拆出明确可提交文件或目录，而不是把 recovery / backup / cache 一并提交。
- 用户导入图片、音频、CSV 等外部资源时，默认复制到 workspace 内 `assets/`，后续可以细分为 `assets/images/`、`assets/audio/` 等目录；用户也可以显式选择 workspace 内目录。
- 不把 workspace 外路径作为长期项目依赖；如果确实需要临时读取外部文件，必须来自用户显式选择，并在导入后复制或生成 workspace 内副本。

## 未保存内容与恢复

UI 和 backend 的职责：

- UI 持有当前可编辑文本和光标 / selection / overlay 等交互状态。
- Backend 持有 document buffers、dirty state、revision 和 active document。
- LanguageServer / Runtime / Tooling 请求以 backend buffer 为准。

同步与保存 debounce：

- UI 文本变化后，以短 debounce 同步到 backend buffer，避免每个按键都跨进程调用。
- backend 记录最新 revision；过期的 debounce 回调不能覆盖更新的 revision。
- backend 以较长 idle debounce 自动保存 dirty `.inscape` 文件，避免每次输入都写磁盘。
- 手动保存、关闭窗口、切换 workspace、应用进入退出流程前应 flush 最新 backend buffer。
- 自动保存写盘和 recovery snapshot 都以 backend 当前 revision 为准。
- UI 应显示保存状态，例如 saving、saved、dirty、recovery available 或 save error。
- 用户可以通过设置关闭 autosave，但 v0 默认开启；关闭 autosave 不关闭 recovery snapshot。

恢复策略：

- 编辑时，UI debounce 同步文本到 backend buffer。
- 默认自动保存 `.inscape` 文件。
- backend 同时维护磁盘 recovery snapshot。
- App 崩溃或异常退出后，下一次打开 workspace 时检测 recovery snapshot。
- 如果 recovery 比磁盘文件新，列出可恢复文件，并提示用户恢复、丢弃或稍后处理。

不能只依赖 UI 内存，因为 UI 崩溃会丢失。也不能只依赖 embedded backend 内存，因为桌面壳崩溃时 backend 通常会一起退出。

## 自动备份

工具写回文件默认写前备份：

- localization CSV。
- `inscape.node-map.json` 或等价 stable node map sidecar。
- `inscape.line-map.json` 或等价 line identity sidecar。

备份策略 v0：

- 写前生成带时间戳的 backup。
- 默认采用“最近 N 份 + 过期清理”的组合策略。
- 具体 N 和保留天数作为实现参数进入设置项；它不是新的产品决策阻塞点。
- 备份目录和保留数量进入设置项，默认目录在 `.inscape-workspace/backups/`。
- 设置中允许关闭自动备份，但默认开启。

`.inscape` 正文由自动保存与 recovery snapshot 保护；批量重写或跨文件操作仍可在执行前创建 checkpoint backup。

## Git

Git 是可选增强，不是基础安全机制。

v0 不默认自动 commit。原因：

- 用户项目不一定是 Git repo。
- 自动保存会频繁改变工作区，自动 commit 会制造噪音。
- CSV / sidecar 可能被用户忽略。
- 崩溃恢复需要更细粒度的 snapshot，Git commit 不适合承担这件事。

Git-aware 增强可以包括：

- 显示当前 workspace 是否是 Git repo。
- 显示是否有未提交改动。
- 批量操作前提示用户创建 checkpoint。
- 提供显式 `Create checkpoint commit`。
- 在 CSV / node-map / line-map 写回前提供 diff。

## 设置分层

v0 设置分为全局设置和 workspace / project 设置。

全局设置适合保存：

- UI 主题。
- autosave 开关和 debounce 偏好。
- backup 保留数量 / 保留天数。
- 默认导入资源目录名。

workspace / project 设置适合保存：

- 项目入口和导出配置。
- 资源路径策略。
- localization / node-map / line-map workflow 配置。
- Git / checkpoint 策略。

原则：影响用户个人偏好的放全局；影响项目可复现行为的放 workspace / project。

v0 可以先提供最小设置页，覆盖 autosave、backup 保留策略和默认资源目录。如果设置页暂缓，配置结构仍必须先定下来，避免把默认值硬编码散落到 feature controller 或 backend workflow 中。

## 影响

- desktop backend v0 的第一实现目标应围绕 Electron main process / embedded backend 设计。
- `EditorBackendClient` 仍必须保持 transport 可替换，避免未来切 Tauri 或 sidecar 时重写 UI。
- `ProjectSession` 必须从一开始以 directory workspace 为单位建模。
- `DocumentBufferStore` 必须支持多 `.inscape` 文件。
- 保存 / recovery / backup 是 v0 产品能力，不是后续可选项。

## 验证

后续实现应新增验证：

- 打开目录后能识别多 `.inscape` 文件。
- v0 只提供单窗口产品形态；后续多窗口不共享 backend session。
- 不存在正式打开单文件入口。
- renderer 不能直接访问 Node / fs / shell 能力，preload 只暴露受控 editor command。
- backend 拒绝 workspace 外路径、绝对路径、路径穿越和未列入白名单的写回目标。
- 外部资源导入后在 workspace 内有副本，不依赖 workspace 外路径。
- 外部资源默认进入 `assets/`。
- 编辑文本会同步 backend buffer revision。
- 自动保存 debounce 能合并连续输入，并只写回最新 backend revision。
- 手动 Save、关闭窗口和切换 workspace 会 flush 最新 buffer。
- UI 能显示保存状态和保存错误。
- recovery snapshot 新于磁盘时会被检测。
- recovery UI 提供恢复、丢弃、稍后处理。
- CSV / node-map / line-map 写回前会生成 backup。
- recovery / backup / cache 使用 `.inscape-workspace/` 内部目录。
- `.inscape-workspace/` 默认不进入 Git。
- v0 最小可用闭环能完成打开目录、文件列表、编辑、autosave、手动 Save、recovery、基础诊断 / 补全和 Preview。
- Git 不存在时，保存 / 备份 / 恢复仍正常工作。

现有基础验证仍需保持：

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
