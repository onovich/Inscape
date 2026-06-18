# SelfHostedEditor P5 Action Authoring Audit

日期：2026-06-18

状态：P5 Round 5 Action capability / pending surface 已落地，完整验证通过后提交推送；P5 尚未完成。

## 本轮目标

P5 Round 5 把 Host Schema `actions[]`、Host Bridge action mapping、Runtime action request evidence 与 pending action resume 调试面板接进 SelfHostedEditor authoring workflow。

本轮完成：

- 新增 `RuntimeActionAuthoringModelBuilder`，从 Host Schema、Host Bridge 与 Runtime snapshot 生成 text-free action authoring model。
- 新增 `RuntimeActionPanelController`，在 Host view 显示 action capability、handler mapping、Runtime request evidence、pending action 与 Completed / Failed / Cancelled / Timeout debug resume controls。
- `HostBindingCapabilityModelMapper` 开始消费 Host Binding catalog 的 `actions[]`，用于证明 Host Bridge handler mapping 是否存在。
- `SelfHostedEditorRuntimeBridge` 新增 session action input passthrough；Workbench 在 Host Schema / Host Bridge catalog 渲染后把 action input 传给 Runtime Preview。
- dev-host `/api/runtime-state` 与 `/api/runtime-action` 支持把 action input 写成临时 `--action-dispatcher` JSON，`resume-action` 通过 CLI `--resume-action` 执行。
- Runtime compact payload 现在暴露脱敏 `actionRequests[]` 与 `pendingAction` 摘要，不包含 raw action、argument value 或 host payload。
- Preview 在 Runtime snapshot 存在 `wait` / `handoff` pending action 时阻断 Runtime controls，并显示 pending 状态；`fire` request history 不阻断 UI。

## UI / Runtime 边界

Action 面板挂在 Host view 的 `host-authoring-panels` 中，与 Host capability 和 Mock query 面板并列。新增样式拆到 `SelfHostedEditorRuntimeActionAuthoring.css`，由结构守卫记录 ownership。

面板只展示以下摘要：

- Host Schema action name、mode、parameter count、source location。
- Host Bridge mapping 是否存在与来源标签。
- Runtime action request 的 request id、name、mode、handler、source line、argument count。
- Pending action 的 request id、name、mode、handler、status、source line、host payload 是否存在。

面板不展示：

- Workspace text。
- raw `@emit` body。
- action argument raw / value。
- pending host payload body。
- full action history。
- rollback / replay / failure / timeout policy。

## Resume 边界

SelfHostedEditor 不在前端清除 pending，也不实现 Runtime action state machine。Debug resume 按以下路径执行：

```text
RuntimeActionPanelController
  -> SelfHostedEditorRuntimeBridge.stepRuntimeSnapshot(..., { type: "resume-action" })
  -> dev-host /api/runtime-action
  -> runtime-project --substate ... --resume-action ...
  -> Internal/Runtime.ResumeAction(...)
```

`Completed` / `Failed` / `Cancelled` / `Timeout` 只是 Debug resume status 输入；没有新增 Host Schema action policy，也没有新增 timeout / failure policy schema。

## 架构自检

- Runtime action mode、pending、resume 和 error semantics 仍在 `Internal/Runtime` 与 CLI `runtime-project`。
- SelfHostedEditor 只把 Host Schema / Host Bridge catalog 投影成 CLI action input，不扫描脚本重建 Runtime action semantics。
- Host Bridge mapping truth 仍来自 shared Host Binding capability catalog；UI 只显示 mapping 是否存在。
- Preview pending guard 只消费 Runtime snapshot 的 `pendingAction` 摘要；不复制 action dispatcher 或 flow state machine。
- dev-host 只写临时 JSON 给 CLI，不持久化 Runtime action input、resume payload 或 pending state 到项目文件。

## Debug 自检

- 最小 HTTP smoke 覆盖 `play_timeline` fire action：记录 request evidence 且不产生 pending，不阻断 UI。
- 最小 HTTP smoke 覆盖 `wait_for_ui` wait action：产生 pending，compact payload 暴露 pending 摘要，resume-action 经 CLI 清除 pending。
- UI contract 覆盖 schema / bridge mapped / missing handler / pending / request evidence / resume buttons / secret payload 不泄漏。
- Preview contract 覆盖 `wait` pending 阻断 choice / continue controls，`fire` request history 不阻断 controls。

## 契约检查

新增 / 扩展检查：

```text
src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts/SelfHostedEditorRuntimeActionAuthoringContractCheck.js
src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeHttpSmoke.js
src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorStructureContractCheck.js
src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorStyleStructureContractCheck.js
```

覆盖重点：

- Action authoring model format / version / text-free boundary。
- Host Schema action + Host Bridge mapping projection。
- RuntimeBridge `actionDispatcher` passthrough。
- dev-host `--action-dispatcher` / `--resume-action` bridge。
- Runtime compact payload action evidence / pending summary。
- Preview pending guard。
- Action CSS ownership。

## 验证结果

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
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
git diff --check
```

产品边界 marker 扫描通过：`src\ExternalSupport\SelfHostedEditor\Scripts`、`src\ExternalSupport\SelfHostedEditor\Resources` 与 `src\ExternalSupport\VSCode` 未出现禁用 Runtime semantic marker。

## 下一轮

P5 Round 6 进入 Runtime-backed Preview controls hardening：

- 明确 pending / stale / error / unavailable 对 Preview controls 的状态表达。
- 继续让 Runtime snapshot 决定 flow / choice / pending 状态。
- 不把 Runtime flow state、rollback/replay 或 Host action policy 复制到 SelfHostedEditor。
