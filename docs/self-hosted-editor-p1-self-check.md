# SelfHostedEditor P1 自检文档

状态：测试自检清单

日期：2026-06-15

适用范围：`src/ExternalSupport/SelfHostedEditor`

相关文档：

- [SelfHostedEditor P1 40 轮内执行方案](self-hosted-editor-p1-40-round-execution-plan.md)
- [SelfHostedEditor P0 自检文档](self-hosted-editor-p0-self-check.md)
- [SelfHostedEditor desktop backend v0 实施计划](self-hosted-editor-desktop-backend-v0-plan.md)
- [ADR 0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](adr/0019-self-hosted-editor-embedded-backend-v0.md)
- [ADR 0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](adr/0020-self-hosted-editor-electron-workspace-and-save-strategy.md)
- [TODO](todo.md)
- [Agent 接手指南](agent-handoff.md)

## 用途

本文用于测试和验收 P1 desktop backend v0 是否完成。它不是实现计划，而是给实现 session 或复核 session 使用的自检清单。

P1 自检验证范围：

1. Electron + embedded EditorBackend v0。
2. preload 白名单与 renderer 安全边界。
3. `EditorBackendClient` transport 可替换。
4. workspace 文件系统边界。
5. `ProjectSession` v0。
6. `DocumentBufferStore` v0。
7. manual Save、autosave、flush、recovery。
8. `.inscape-workspace/`、backup、assets、settings 分层。
9. v0 最小可用闭环与 Windows internal package smoke。

P1 自检不验证 P1.5 的默认 full long-lived LanguageServer。P1 可以保留 `process-per-request` 或 current-stage stdio spike，只要 ownership 已经为 P1.5 铺好。

## 自检前提

开始前确认：

1. P0 自检已通过。
2. P1 实现没有把 `Internal` 语义复制进 EditorBackend。
3. P1 实现没有引入 sidecar daemon、localhost 产品 API、多窗口共享 session 或正式单文件模式。
4. 当前轮没有开始 P1.5 的 workspace-scoped long-lived LanguageServer 默认启用。

先执行：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

记录当前分支、未提交文件和是否存在与 P1 无关的变更。

## 快速通过标准

P1 自检通过时，应同时满足：

1. `EditorBackendClient` 支持 dev HTTP transport 与 desktop embedded transport，feature controller 不感知 transport 类型。
2. Electron renderer 不能直接访问 Node、`fs`、`child_process`、shell 或 arbitrary IPC。
3. preload public API 是 editor command 白名单，不是通用系统 API。
4. backend 统一处理 workspace root、relative path、路径归一化和写回白名单。
5. open workspace 只接受目录，支持多个 `.inscape` 文件。
6. `ProjectSession` status 真实表达 embedded desktop mode、session id、workspace 摘要、language / runtime / tooling 子状态。
7. `DocumentBufferStore` 是 project document truth；UI draft store 只是交互态。
8. LanguageServer / Runtime / Tooling 请求基于 backend buffer 当前 revision。
9. manual Save、autosave、flush、save status、save error 都有自动化或 smoke 覆盖。
10. recovery snapshot 能发现、恢复、丢弃、稍后处理。
11. localization CSV、node-map、line-map 写回前自动 backup。
12. `.inscape-workspace/` 承担 recovery / backups / cache，并默认不进入 Git。
13. 外部资源导入默认复制到 workspace `assets/`，不长期引用 workspace 外路径。
14. settings schema 区分全局偏好与 workspace / project 行为。
15. v0 最小闭环 smoke 通过。
16. Windows internal package 或等价本机启动 smoke 通过。
17. README、architecture、backend migration map、handoff、TODO 口径一致。

## 必跑命令

### SelfHostedEditor 基础

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
```

如果 P1 实现仍保留 P0 样式检查入口，也必须跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
```

通过标准：

1. production scripts 语法全绿。
2. structure check 能识别 renderer / preload / backend 边界。
3. model check 覆盖 ProjectSession、DocumentBuffer、workspace path guard、save status、recovery status 和 settings summary。

### SelfHostedEditor HTTP / dev transport 回归

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:language-session
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:references-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-schema-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:host-binding-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:static-assets-http
```

通过标准：

1. P1 的 desktop transport 不破坏 dev HTTP smoke。
2. shared LanguageServer / Runtime / Tooling payload shape 不被 EditorBackend 私有重命名。
3. Preview choice click invariant 仍成立。

### P1 新增 desktop / workspace 检查

如果 P1 实现新增了以下命令，必须跑：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-backend
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workspace-fs
npm --prefix src\ExternalSupport\SelfHostedEditor run check:document-buffer
npm --prefix src\ExternalSupport\SelfHostedEditor run check:save-recovery
npm --prefix src\ExternalSupport\SelfHostedEditor run check:desktop-package
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-package
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run smoke:desktop-startup
```

如果命令名称不同，在自检记录中写明实际命令和覆盖范围。

最低覆盖要求：

1. embedded transport contract。
2. renderer / preload / main IPC 白名单。
3. workspace path traversal 拒绝。
4. DocumentBuffer revision / stale update 拒绝。
5. manual Save / autosave / flush。
6. recovery restore / discard / later。
7. backup 与 `.inscape-workspace/`。
8. desktop app 启动与打开 workspace。

### VSCode parity

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

通过标准：

1. P1 没有把 VSCode 改成 desktop backend client。
2. VSCode 继续消费 LanguageServer / Tooling shared contract。
3. SelfHostedEditor embedded backend 不影响 VSCode authoring parity。

### .NET 基线

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

通过标准：

1. `Internal` 仍是 Compiler / Tooling / LanguageServer / Runtime 语义真相。
2. EditorBackend 没有把 Unity、VSCode、HTML rendering 或 Electron 依赖带入 `Internal`。

## Electron / Preload 边界自检

检查代码和结构检查结果，确认：

1. `BrowserWindow` 使用隔离 renderer 配置。
2. renderer 不启用 Node integration。
3. renderer 无法直接获得 `require`、Electron API、`fs`、`child_process` 或 shell 能力。
4. preload 只暴露 `window.inscape` 或等价命名空间下的 editor command。
5. preload 不暴露通用 `readFile(path)`、`writeFile(path, text)`、`run(command)`、`shellOpen(path)` 或 arbitrary IPC。
6. main process / embedded backend 对 command name 做白名单校验。
7. unknown command、非法 payload、arbitrary channel 都被拒绝。
8. feature controller 不 import Electron，不知道 IPC channel 名。

建议搜索：

```powershell
rg --line-number "require\\(|from ['\\\"]electron|fs\\.|child_process|ipcRenderer|ipcMain|shell\\." src\ExternalSupport\SelfHostedEditor\Scripts
rg --line-number "readFile|writeFile|runCommand|execute|ipc" src\ExternalSupport\SelfHostedEditor
```

判断标准：

- renderer production code 中不应出现 Node / Electron runtime 直接访问。
- `ipcRenderer` 只应出现在 preload 或明确测试 harness 中。
- main process 可以使用 Node / Electron 能力，但必须隐藏在白名单 command 后面。

## Transport 自检

必须覆盖：

1. `EditorBackendClient` 可注入 transport。
2. dev 环境默认使用 HTTP dev transport。
3. desktop 环境使用 preload / embedded invoke transport。
4. fake embedded transport 或 direct harness 可用于 contract check。
5. feature controller 只调用业务窄接口，不调用 generic `call(method, payload)`。
6. dev HTTP transport 与 desktop transport 返回同一类业务 payload shape。

禁止：

1. 在业务 controller 里直接拼 `/api/*`。
2. 在业务 controller 里直接拼 IPC channel。
3. 把 desktop transport payload 改成与 dev HTTP 不兼容的私有 shape。

## Workspace 文件系统自检

必须覆盖路径拒绝：

1. 绝对路径。
2. `..` 路径穿越。
3. 归一化后不在 workspace root 下的路径。
4. 未列入白名单的写回目标。
5. workspace 外部资源路径被长期写入项目配置。

必须覆盖允许写回：

1. `.inscape` 文档。
2. localization CSV。
3. stable node map sidecar。
4. line map sidecar。
5. `.inscape-workspace/recovery/`。
6. `.inscape-workspace/backups/`。
7. `.inscape-workspace/cache/`。
8. `assets/` 中的导入资源副本。

open workspace 必须覆盖：

1. 只接受目录。
2. 拒绝正式打开单文件模式。
3. 列出多个 `.inscape` 文件。
4. 支持设置 active document。
5. status 不暴露文件正文。

## ProjectSession 自检

`ProjectSession` status 必须表达：

1. `format` / `formatVersion`。
2. `mode: "embedded-desktop"` 或等价明确 desktop embedded mode。
3. `sessionId`。
4. workspace root 摘要或 workspace name。
5. active relative path。
6. document count。
7. workspace / document revision。
8. language session kind：`process-per-request`、`stdio-spike` 或未来 `long-lived`，但 P1 不应默认声称 full long-lived 已完成。
9. runtime session kind。
10. line identity session kind。
11. localization session kind。
12. last error / stale reason 摘要。

status 禁止暴露：

1. workspace 文档正文。
2. CSV 内容。
3. line-map sidecar 内容本体。
4. Runtime snapshot 内容本体。
5. recovery snapshot 文本。
6. absolute temp workspace secret content。

session lifecycle 必须覆盖：

1. open workspace 创建 session。
2. close project 清理 session。
3. switch workspace flush / cleanup。
4. app exit flush / cleanup。
5. stale session request 被拒绝或返回明确错误。

## DocumentBufferStore 自检

每个 document buffer 至少包含：

1. `relativePath`。
2. text。
3. disk text hash 或等价磁盘一致性摘要。
4. revision。
5. dirty。
6. exists on disk。
7. last loaded time。

必须覆盖：

1. list documents。
2. get document。
3. update document。
4. set active document。
5. save document。
6. save all。
7. baseRevision / stale update guard。
8. revision 只增不倒退。
9. 旧 debounce 不能覆盖新 revision。
10. LanguageServer / Runtime / Tooling 请求从 backend buffer 组 workspace snapshot。

禁止：

1. 产品路径继续依赖前端每次上传完整 workspace truth。
2. UI draft store 成为 project document truth。
3. DocumentBufferStore 跳过 backend 文件系统边界直接写盘。

## Authoring / Preview 自检

必须覆盖：

1. diagnostics 使用 backend buffer 当前文本。
2. completions 使用 backend buffer 当前文本。
3. definition / references 支持 backend buffer 当前 workspace snapshot。
4. hover / documentSymbols 使用 backend buffer 当前文本。
5. Preview 使用 backend buffer 当前 workspace state。
6. Runtime action 不要求前端上传完整 Runtime state。
7. Preview choice click 推进 reading Preview 到目标 block。
8. 编辑器 reveal 到目标 block title。

必须保持：

1. LanguageServer payload shape 与 VSCode semantic parity 一致。
2. malformed shared payload 仍显示显式错误。
3. offline fallback 仍显式、有 owner、有触发条件。

## Save / Autosave / Recovery 自检

manual Save 必须覆盖：

1. save active document。
2. save all。
3. 保存成功后 dirty=false。
4. 保存失败时 UI 显示 error。
5. 保存走 workspace path guard。

autosave 必须覆盖：

1. UI 到 backend buffer 的短 debounce。
2. backend 到磁盘的 idle debounce。
3. 连续编辑合并，不为每次按键写盘。
4. 只写回最新 revision。
5. autosave 默认开启。
6. autosave 可通过设置关闭。
7. autosave 关闭后 manual Save 仍工作。
8. autosave 关闭后 recovery snapshot 仍工作。

flush 必须覆盖：

1. 手动 Save flush 最新 buffer。
2. close window flush 最新 buffer。
3. switch workspace flush 最新 buffer。
4. app exit flush 最新 buffer。
5. flush 失败时阻止静默丢失并提示用户。

recovery 必须覆盖：

1. 写入 recovery snapshot。
2. snapshot 记录 relative path、revision、mtime、content hash 和文本。
3. 下次打开 workspace 时扫描 recovery。
4. recovery 新于磁盘文件时提示。
5. UI 列出可恢复文件。
6. 恢复后写回 backend buffer / 文件。
7. 丢弃后不再反复提示。
8. 稍后处理不会删除 snapshot。
9. 正常保存后清理过期 recovery。

## Backup / Assets / Settings 自检

`.inscape-workspace/` 必须覆盖：

1. `.inscape-workspace/recovery/`。
2. `.inscape-workspace/backups/`。
3. `.inscape-workspace/cache/`。
4. 默认被 Git 忽略。
5. cache 删除后可重建，不影响项目 truth。

write-back backup 必须覆盖：

1. localization CSV 写回前备份。
2. `inscape.node-map.json` 写回前备份。
3. `inscape.line-map.json` 写回前备份。
4. 备份进入 `.inscape-workspace/backups/`。
5. 默认启用。
6. 支持保留数量 / 保留天数或等价策略。
7. 设置允许关闭或调整。

assets 必须覆盖：

1. 外部图片导入复制到 workspace 内。
2. 外部音频导入复制到 workspace 内。
3. 外部 CSV 或其他资源导入复制到 workspace 内。
4. 默认进入 `assets/`。
5. 不把 workspace 外路径保存为长期依赖。
6. 导入失败不创建半导入状态。

settings 必须覆盖：

1. 全局设置：UI 主题、autosave、backup 保留策略、默认资源目录。
2. workspace / project 设置：项目入口、资源路径策略、导出配置、localization / node-map / line-map workflow 配置、Git/checkpoint 策略。
3. 影响可复现行为的设置随 workspace / project。
4. 个人偏好留在全局。
5. 默认值集中在配置层，不散落在 feature controller。

## Desktop v0 Smoke

Windows internal package 或等价本机启动 smoke 至少覆盖：

1. 启动桌面 app。
2. 打开 workspace 目录。
3. 文件列表显示多个 `.inscape` 文件。
4. 打开并编辑 `.inscape`。
5. 保存状态从 dirty / saving / saved 正确变化。
6. manual Save 写回磁盘。
7. autosave 写回磁盘。
8. 模拟或触发 recovery available 状态。
9. recovery UI 能恢复 / 丢弃 / 稍后处理。
10. diagnostics 使用当前未保存 buffer。
11. completion 使用当前未保存 buffer。
12. Preview 基于当前 workspace state 渲染。
13. Preview choice click 正确推进并 reveal source。
14. localization / node-map / line-map 写回前 backup。
15. 关闭 app 前 flush 最新 buffer。

记录：

1. 启动命令或 package 路径。
2. 测试 workspace 路径。
3. 是否修改真实样例。
4. 是否生成 recovery / backup / cache。
5. 已知限制。
6. packaged app 是否通过受控 app protocol 加载 Workbench assets，而不是依赖 `file://` 根目录。

## 文档一致性自检

检查以下文档是否同步：

```text
docs/todo.md
docs/agent-handoff.md
docs/self-hosted-editor-desktop-backend-v0-plan.md
docs/self-hosted-editor-backend-migration-map.md
src/ExternalSupport/SelfHostedEditor/README.md
```

必须一致表达：

1. P1 完成的是 Electron + embedded EditorBackend v0。
2. P1 不等于 sidecar daemon。
3. P1 不默认完成 workspace-scoped full long-lived LanguageServer。
4. P1 支持目录 workspace，不支持正式单文件工作模式。
5. backend 是 SelfHostedEditor 编辑器宿主编排层，不是 Inscape 底层业务 backend。
6. Compiler / LanguageServer / Tooling / Runtime 仍是 semantic truth。
7. `.inscape-workspace/` 用于 recovery / backup / cache，默认不进入 Git。
8. Git 是可选增强，不是基础保存 / 恢复机制。

## 禁止通过项

出现以下任一情况，P1 自检不得通过：

1. renderer 可以直接访问 Node、`fs`、`child_process`、shell 或 arbitrary IPC。
2. preload 暴露通用文件读写或命令执行 API。
3. backend 接受绝对路径或 `..` 越界写回。
4. status 泄露正文、CSV、line-map、Runtime snapshot 或 recovery 文本。
5. open workspace 支持了含混的正式单文件模式。
6. DocumentBufferStore 没有成为 project document truth。
7. autosave / manual Save / recovery 任一基础闭环缺失。
8. 写回 CSV / node-map / line-map 前没有 backup。
9. `.inscape-workspace/` 被默认纳入 Git。
10. desktop package smoke 未通过但宣布 P1 完成。
11. VSCode semantic parity 失败但宣布 P1 完成。
12. `.NET build` 或 Internal tests 失败但未记录原因。
13. P1 文档暗示 full long-lived LanguageServer 已默认完成。
14. 为了 desktop v0 把 Compiler / Tooling / Runtime 语义复制进 EditorBackend。

## 自检记录模板

完成 P1 自检后，在提交说明或交接信息中记录：

```text
P1 self-check date:
Branch:
Commit / diff summary:

Commands passed:
- SelfHostedEditor check:syntax:
- SelfHostedEditor check:structure:
- SelfHostedEditor check:model:
- SelfHostedEditor HTTP smokes:
- desktop backend checks:
- workspace fs checks:
- document buffer checks:
- save / recovery checks:
- desktop package checks:
- smoke:desktop:
- smoke:desktop-package:
- smoke:desktop-runtime:
- smoke:desktop-startup:
- VSCode check:structure:
- VSCode check:semantic-parity:
- dotnet build:
- Internal tests:

Electron / preload:
- renderer isolation:
- preload whitelist:
- arbitrary IPC rejected:

Workspace / ProjectSession:
- open directory only:
- path traversal rejected:
- write whitelist:
- status no leakage:

DocumentBufferStore:
- revision guard:
- stale update rejected:
- authoring endpoints use backend buffer:
- Preview uses backend buffer:

Save / Recovery:
- manual Save:
- autosave:
- flush:
- recovery restore / discard / later:

Backup / Assets / Settings:
- .inscape-workspace:
- write-back backup:
- assets import:
- settings schema:

Desktop smoke:
- package / launch command:
- workspace used:
- result:

Docs updated:
- docs/todo.md:
- docs/agent-handoff.md:
- backend migration map:
- README:

Known residual risk:
-
```

## 最终结论格式

最终交接时建议用以下三行结论：

```text
P1 desktop backend v0: PASS / FAIL
P1.5 long-lived LanguageServer entry allowed: YES / NO
Blocking reason if NO:
```
