# SelfHostedEditor P5 Runtime Status Audit

日期：2026-06-18

状态：P5 Round 7 complete

## 本轮目标

P5 Round 7 将 Runtime status surface 接入 SelfHostedEditor：

- 显示当前 node、visible choices、visible step count、provider、pending action、Runtime error。
- 显示 query provider 来源：mock / recorded / internal / delegate unavailable。
- 保持状态面板轻量，不抢主写作视图。
- 状态来自 Runtime compact payload，不在浏览器侧重算 Runtime state。

## 完成内容

- 新增 `RuntimeStatusSurfaceModelBuilder`，格式为 `inscape.self-hosted-editor.runtime-status-surface`，从 Runtime envelope / compact snapshot 生成 text-free status surface。
- 新增 `RuntimeStatusPanelController`，接管 sidebar 的 `.workspace-runtime-panel`，复用已有 session item 样式显示 provider、node、choices、steps、query、pending 与 error。
- `SelfHostedEditorPayloadBridge.compactRuntimeStatePayload()` 现在为 Runtime snapshot 附加脱敏 `queryProvider` summary，只包含 source、label、mock / recorded count 与 `payloadContentExposed: false`。
- dev-host Runtime start / step 路径把 session-only query provider 传入 compact payload；HTTP / direct Runtime smoke 验证 internal 与 mock provider 来源。
- `SelfHostedEditorWorkbenchRenderController` 在拿到最新 Runtime envelope 后渲染 status surface，并在 Runtime snapshot 更新时同步刷新状态面板。
- `SelfHostedEditorFeatureBootstrapper` 将旧 session panel 限定为 workspace/session 半边，Runtime meta 面板由 `RuntimeStatusPanelController` 接管。
- `SelfHostedEditorAppEntry` 在 debug resume 失败时也更新最新 Runtime envelope，使 status surface 能显示 Runtime error / unavailable。

## Status Surface 边界

状态面板只展示以下摘要：

- Runtime provider 与 surface state。
- Runtime current node name。
- Runtime already-visible choice option count。
- Runtime visible step count / content step count。
- Runtime pending action name、mode、status、request id 是否存在。
- Runtime error code 与 message availability。
- Query provider source 与 mock / recorded value count。

状态面板不展示：

- workspace text。
- raw Runtime state body。
- mock query value / argument value。
- raw action body。
- pending host payload。
- complete action history。

## Debug 自检

- 最小 fixture：沿用 Runtime direct / HTTP smoke 的 Opening / Gate / ActionStart 路径，覆盖 internal query provider、mock query provider、pending action 与 Runtime control flow。
- 失败定位：Runtime unavailable / error 进入 status surface 的 `runtime-error` / `runtime-unavailable`，Preview 状态仍由 Round 6 的 Runtime status strip 显示。
- 空状态：Runtime payload 不可用时 query provider 显示 unavailable；Runtime payload 可用但没有 external provider 时显示 internal。
- 泄漏检查：contract 明确断言 mock argument、mock value、pending host payload、raw Runtime body 与 raw error message 不进入 status model 或 panel 文本。

## 架构自检

- Runtime current node、visible choices、visible step count、pending action 与 error 均来自 Runtime snapshot / envelope。
- query provider 来源由 dev-host compact Runtime payload 脱敏投影；SelfHostedEditor 不重新执行 query、不重算 condition，也不推断隐藏选项。
- SelfHostedEditor 只新增 bridge payload trimming、presenter model 与 UI 渲染；未改 `Internal/Runtime`、Compiler、Host Schema policy、Unity / Bird。
- 未新增 Runtime condition evaluator、query evaluator、action dispatcher、branch receipt 或 Runtime inspector 语义。
- Sidebar UI 复用现有 session item 样式，没有扩大视觉系统或新增跨模块 CSS ownership。

## 验证

本轮收口验证通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
git diff --check
```

边界扫描也已通过：`Internal` 没有 Unity / Bird / Addressables / ScriptableObject 依赖；未新增 rollback / replay / failure / timeout policy 字段；ExternalSupport 产品代码未出现 Runtime evaluator / dispatcher / inspector 语义标记。

## 后续

下一轮进入 P5 Round 8 Log / Backlog surface：只展示 Runtime `logEntries`，支持空状态与 Runtime unavailable 状态，不把 Log 写入 formal Runtime State。
