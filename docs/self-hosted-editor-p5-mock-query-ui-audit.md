# SelfHostedEditor P5 Mock Query UI Audit

日期：2026-06-18

状态：P5 Round 4 Mock query UI 已落地，完整验证通过，准备提交推送；P5 尚未完成。

## 本轮目标

P5 Round 4 把 Round 3 的 mock query authoring model 接进 SelfHostedEditor 可见工作流：作者可以从 Host Schema `queries[]` 看到 query、参数、返回类型、当前 mock 值和错误状态，并通过 reset / apply 把 session-only mock provider 送给 Runtime Preview。

本轮完成：

- 新增 `RuntimeMockQueryPanelController`，渲染 Mock Queries 面板、ready / missing / invalid / unknown 计数、query row、参数和值输入、诊断摘要、reset 与 apply 按钮。
- Workbench Host view 新增 `runtime-mock-query-panel`，由 `SelfHostedEditorWorkbenchRenderController` 将 Host Schema catalog、Runtime snapshot、session id 与 workspace revision 传入 panel。
- `SelfHostedEditorRuntimeBridge` 新增 session-only mock query provider 缓存，并在 `runtime.start-or-observe` / `runtime.step` payload 中薄透传 `queryProvider`。
- dev-host HTTP runtime route 与 `runtime-project` CLI 桥接支持 `--query-provider` 临时 JSON 文件；该文件只存在于 dev-host 临时 workspace，不进入项目状态。
- Electron preload command validator 允许 Runtime payload 携带 `queryProvider`；当前 Electron backend 仍保持 Runtime unavailable/fallback，不伪造未接好的 Runtime path。
- 新增 UI / bridge / HTTP / preload contract 覆盖 apply、reset、unavailable、invalid、unknown 与 provider passthrough。

## UI 边界

Mock query 面板挂在 Host view 的 `host-authoring-panels` 中，不进入 writing view，也不遮挡 editor / preview split。样式拆到 `SelfHostedEditorRuntimeAuthoring.css`，由 `SelfHostedEditorWorkbench.css` 显式按功能顺序导入。

面板可见状态：

- `Runtime ready`：Runtime Preview 可用，Apply 按钮启用。
- `Runtime unavailable`：保留本地 session mock 草稿，显示 fallback 文案，Apply 按钮禁用。
- `schema-unavailable`：Host Schema 未加载时不生成 query row。
- `ready` / `missing-value` / `invalid-value` / `unsupported-type` / `unknown-query`：全部来自 Round 3 authoring model，不在 UI 重新解释 query 语义。

## Runtime 透传边界

SelfHostedEditor 只把 ready rows 投影出的 provider 传给 Runtime：

```json
{
  "queryProvider": {
    "kind": "Mock",
    "mockValues": []
  }
}
```

没有 mock provider 时，Runtime payload 不写入 `queryProvider: null`。Reset 会清空 bridge 内的 session provider，并触发 Workbench 重新渲染；Apply 会设置 provider 并刷新 Runtime Preview。

## 架构自检

- Host Schema query 列表仍来自 shared capability mapper；SelfHostedEditor 不扫描 `.inscape` 脚本来重建 query catalog。
- UI 只消费 `RuntimeMockQueryModelBuilder` 的 authoring model，不复制 Runtime condition evaluator、query evaluator、action dispatcher 或 Host Schema action policy。
- Mock value 仍是 editor session test input，不写入 formal Runtime State、P4 substate、Host Schema、Host Binding 或项目文件。
- dev-host 与 preload 都只做 transport whitelist / payload passthrough；Runtime 语义仍在 `Internal/Runtime` 与 `runtime-project`。
- 本轮未修改 Compiler / Runtime 内核 / Unity / Bird。

## Debug 自检

- 最小 fixture 覆盖 `has_item("silver_key")` 与 bool mock：Runtime HTTP smoke 证明 mock provider 能让 key path option 出现。
- UI contract 覆盖 Runtime unavailable、Runtime ready、invalid bool、unknown query、Apply provider、Reset callback 与 secret payload 不泄漏。
- Workbench integration smoke 覆盖 Host Schema catalog 与 Runtime snapshot 传入 mock query panel。
- preload transport contract 覆盖 `runtime.start-or-observe` / `runtime.step` 携带 `queryProvider`。

## 契约检查

新增 / 扩展检查：

```text
src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts/SelfHostedEditorRuntimeMockQueryUiContractCheck.js
src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts/SelfHostedEditorWorkbenchIntegrationContractCheck.js
src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorRuntimeHttpSmoke.js
src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorPreloadTransportContractCheck.js
src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorStructureContractCheck.js
```

覆盖重点：

- UI 文案、按钮状态、计数与 row diagnostics。
- Apply / Reset 对 bridge 和 Runtime Preview 的影响。
- HTTP dev-host 到 `runtime-project --query-provider` 的薄透传。
- preload whitelist 不因为新增 provider 退回 generic payload。
- RuntimeAuthoring CSS 仍只承载 runtime authoring 面板样式，不吞并 Host capability、Preview、Editor、Graph、Localization 等样式边界。

## 验证结果

2026-06-18 本轮验证通过：

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

产品边界 marker 扫描通过：`src\ExternalSupport\SelfHostedEditor\Scripts` 与 `src\ExternalSupport\VSCode` 未出现 `ConditionEvaluator`、`ActionDispatcher`、`QueryReceipt`、`RuntimeInspector`、`rollbackPolicy`、`replayPolicy`、`failurePolicy` 或 `timeoutPolicy`。

## 下一轮

P5 Round 5 进入 Action capability / pending surface：

- 从 Host Schema `actions[]` 与 Runtime snapshot action / pending 摘要生成可读调试面板。
- 显示 action capability、pending request、resume/debug 状态与 fallback。
- 继续只消费 Runtime / Host Schema 输出，不复制 action dispatcher 或 Host Bridge handler 语义。
