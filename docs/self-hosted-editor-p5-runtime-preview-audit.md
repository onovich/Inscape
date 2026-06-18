# SelfHostedEditor P5 Runtime Preview Audit

日期：2026-06-18

状态：P5 Round 6 complete

## 本轮目标

P5 Round 6 收口 Runtime-backed Preview controls：

- Preview 控制优先消费 Runtime snapshot 与 Runtime action。
- 覆盖 choose、continue、advance-flow、rewind-flow、Back / rewind。
- pending、Runtime unavailable、Runtime error、snapshot stale 在 Preview 中可见。
- 保持 Runtime 语义仍归 `Internal/Runtime` / `runtime-project`，SelfHostedEditor 只做 bridge、presenter 和 UI 状态。

## 完成内容

- `PreviewRuntimePreferenceModelBuilder` 现在接受完整 Runtime envelope，同时兼容旧裸 snapshot 调用；Runtime unavailable / error / stale 状态会附加到 fallback story model。
- `SelfHostedEditorWorkbenchRenderController` 将完整 `latestRuntimeSnapshot` envelope 传给 Preview，不再在 Workbench 里提前丢掉 unavailable / error provider。
- `PreviewPanelController` 增加轻量 Runtime status strip 与 `data-runtime-preview-state`，可显示 `runtime-unavailable`、`runtime-error`、`runtime-stale`，同时继续隐藏 `runtime-ready` 的重复状态文本。
- Preview 本地 fallback 导航会保留 Runtime fallback / stale 状态；Runtime 成功返回 snapshot 后清除 transient control error。
- `SelfHostedEditorAppEntry` 在 Runtime unavailable、Runtime action failure、snapshot/node mismatch 时把状态显式渲染到 Preview；Runtime path stale 且当前 Preview 已是 Runtime provider 时，不再落回本地分支推进。
- `check:model` 的 Preview / Runtime contract 覆盖 runtime unavailable fallback、runtime command error、snapshot stale 与 Runtime action control error。
- `check:runtime-http` 补齐 `rewind-flow` HTTP 路径；直接 runtime smoke 已覆盖 choose、continue、advance-flow、rewind-flow 与 rewind / Back。

## Debug 自检

- 最小 fixture：沿用 Preview / Runtime contract 里的 Opening -> Witness -> End 与 HTTP smoke 的 Opening / Stay / End；覆盖 choose、continue、advance-flow、rewind-flow、Back。
- 失败定位：Runtime provider 不可用或 action 失败在 Preview 显示为 unavailable / error；Runtime node 与 Preview control node 不一致显示为 stale。
- fallback：compiler-project / offline fallback 仍可用，但 Runtime envelope 的 unavailable / error / stale 不会被静默吞掉。
- pending：Round 5 的 `wait` / `handoff` pending guard 保持，`fire` 不阻断 controls。

## 架构自检

- Runtime flow、choice、pending 与 action dispatch 仍由 Runtime snapshot / Runtime bridge 决定。
- SelfHostedEditor 没有新增 condition evaluator、query evaluator、action dispatcher、branch receipt 或 Host action policy。
- Workbench 只传递 Runtime envelope；Preview 只展示 provider/status 与 bridge 返回的 snapshot。
- 本轮未改 Compiler、Runtime 内核、Host Schema policy、Unity / Bird、rollback / replay / trace / flashback。

## 验证

已通过：

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

下一轮进入 P5 Round 7 Runtime status surface：从 Runtime payload 展示 node、visible choices、visible step count、provider、pending action、Runtime error 与 query provider 来源；继续不重算 Runtime 状态。
