# SelfHostedEditor P5 Log Backlog Audit

日期：2026-06-18

状态：P5 Round 8 Log / Backlog surface complete，不代表 P5 已完成

## 结论

PASS for Round 8。SelfHostedEditor Host view 现在有 Runtime Log / Backlog surface，来源只限 Runtime compact payload 的 `logEntries`。该 surface 支持 Runtime ready、empty、unavailable 和 error 状态，log item 可以跳回源文本，不重新执行脚本，不把 Log 写入 formal Runtime State，也不显示条件隐藏分支文本。

下一轮进入 P5 Round 9：Branch receipt / condition explanation。

## 完成内容

- `SelfHostedEditorPayloadBridge` 会把 Runtime snapshot 的 `logEntries` 压缩为安全摘要，只保留 `lineId`、`nodeId`、`sequence`、`speaker` 与 bounded `text`。
- 新增 `RuntimeLogBacklogModelBuilder`，输出 `inscape.self-hosted-editor.runtime-log-backlog` v1 模型，区分 `runtime-ready`、`runtime-empty`、`runtime-unavailable` 与 `runtime-error`。
- 新增 `RuntimeLogBacklogPanelController`，在 Host view 渲染 Runtime Log 列表、空状态、不可用状态和 source jump 控件。
- Workbench render controller 在 Runtime snapshot start / step、workspace state change 和普通 render 时刷新 Log / Backlog surface。
- Source jump 复用现有 editor reveal 路径；panel 只发出 `{ lineNumber, sourcePath }` 选择事件，不拥有编辑器或 Runtime 语义。
- 新增 `SelfHostedEditorRuntimeLogBacklogContractCheck.js`，覆盖 model、panel、source jump、hidden text absence、formal Runtime State absence、empty / unavailable / error 与 `line:N` fallback。
- Runtime direct / HTTP smoke 现在断言 `logEntries` 会从真实 Runtime bridge / dev-host HTTP path 返回，且条件隐藏选项不会进入 response。

## 边界自检

- Runtime truth 仍在 `Internal/Runtime` 与 CLI `runtime-project`。SelfHostedEditor 只消费 Runtime snapshot payload。
- Log / Backlog surface 不重跑 Compiler / Runtime，也不实现 browser-side condition evaluator、query evaluator、action dispatcher 或 log builder。
- Log 不进入 formal Runtime State。模型显式携带 `writesToFormalRuntimeState: false`，contract check 会守住该字段。
- 条件隐藏文本不来自 story graph 本地扫描。模型只渲染 Runtime `logEntries`，并用 contract fixture 验证 hidden branch text 不进入 JSON 或 DOM。
- Runtime unavailable 和 error 状态不会被 offline draft fallback 静默覆盖。
- 本轮未修改 Unity / Bird / Host SDK，未新增 rollback / replay / timeout / failure policy。

## 已运行验证

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary
npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
git diff --check
```

`check:structure` 仍报告既有非阻塞提示：`SelfHostedEditorLocalization.css` 有 hard-coded color values，属于既有 split 后 token 收口提示，不是本轮新增阻塞。

Browser smoke：启动 `npm --prefix src\ExternalSupport\SelfHostedEditor run start` 到本地 `127.0.0.1:5198`，用 in-app Browser 打开 Workbench 并切换到 Host view。Runtime Log / Backlog panel 渲染成功，状态为 `runtime-empty`，无 console error，未显示 hidden branch text。

边界扫描：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

以上扫描均无命中。

## 下一轮

P5 Round 9：Branch receipt / condition explanation。

- 只展示 Runtime 提供的 branch query receipts。
- 为条件选项和条件跳转显示 query、arguments、result、source kind 与 context。
- 支持从 receipt 跳回相关 node / line。
- 不重新查询 host 来解释历史分支，不实现完整 Trace Replay。
