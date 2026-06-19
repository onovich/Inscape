# SelfHostedEditor P5 Error State Audit

日期：2026-06-20

状态：P5 Round 11 Error / empty / stale state hardening complete，不代表 P5 已完成

范围：SelfHostedEditor Runtime authoring surfaces 的 ready / empty / unavailable / error / stale / blocked 状态收口。本文只记录 Round 11 已落地的状态 inventory、bounded diagnostic contract 与 Host view 可见总览，不进入 P5 Round 12 integration smoke，不实现完整 host save、Rollback、Trace Replay、Flashback、Unity / Host SDK 或 Host Schema action policy 扩张。

## 结论

PASS for Round 11。SelfHostedEditor 现在有一个统一的 Runtime error-state inventory contract，用于聚合 Preview、Runtime Status、Mock Query、Runtime Actions、Log / Backlog、Branch Receipts 与 Runtime Substate 七个 authoring surface 的状态。Host view 新增 `Runtime States` 面板，可展示每个 surface 的 bounded state、diagnostic count 与 suggested fix category。

下一轮进入 P5 Round 12：integration smoke + docs closure。

## 完成内容

- 新增 `RuntimeErrorStateInventoryModelBuilder`，输出 `inscape.self-hosted-editor.runtime-error-state-inventory` v1。
- Inventory 固定覆盖七个 surface：Preview、Runtime Status、Mock Query、Runtime Actions、Log / Backlog、Branch Receipts、Runtime Substate。
- Inventory 将 surface 状态归一到 `ready`、`empty`、`unavailable`、`error`、`stale`、`blocked`。
- Bounded diagnostic contract 固定字段为 `layer`、`code`、`shortMessage`、`surface`、`suggestedFixCategory`。
- Suggested fix category 覆盖 `schema`、`bridge`、`query`、`action`、`runtime-cli`、`transport`、`session`、`script`、`payload`。
- 新增 `RuntimeErrorStatePanelController`，Host view 渲染 `Runtime States` 总览，只展示 surface label、state、category、diagnostic count 与 safe short message。
- Workbench render controller 缓存各 Runtime authoring surface 的 bounded model，并在普通 render、Runtime snapshot update、substate export / validate / import、Preview Runtime control state 变化后刷新 inventory。
- `PreviewPanelController` 暴露 `getRuntimeSurfaceModel()`，只返回 provider / runtimeStatus / state 摘要，不暴露 story text 或 Runtime snapshot body。
- `check:model` 扩展为覆盖 inventory model、panel DOM、Workbench integration 与 secret payload absence。
- `check:structure` / `check:style-structure` 扩展为守住新 controller、CSS import order 与 Runtime error-state CSS ownership。
- README 已记录 Runtime States 面板与 Round 11 inventory contract。

## 边界自检

- Runtime / CLI 仍是 Runtime state、condition、query、action、substate 的语义真相。
- SelfHostedEditor 只做 bridge、presenter、UI 与 authoring workflow 聚合，不重算 Runtime condition、query、action、substate 或 log 语义。
- Host Schema / Host Bridge / Usage Manifest / Runtime State 仍分层：inventory 只定位修复类别，不扩展 Host Schema action policy。
- Error text bounded。Inventory 明确 `payloadContentExposed: false`，并声明不暴露 workspace text、host payload body、mock value table、完整 Runtime snapshot、完整 substate、完整 Runtime log 或完整 action history。
- Hosted payload contract error 不通过 offline fallback 静默隐藏；现有 Preview / StoryGraph / Localization / Outline fallback contract 继续由 model checks 守住。
- 本轮未修改 Compiler、Runtime evaluator、Runtime query provider、Runtime action dispatch、Unity / Bird / Host SDK、Rollback / Trace Replay / Flashback 或完整 host save。

## 验证记录

Round 11 功能提交：

- `ca4b929 p5: add runtime error state inventory`
- `ecc0fbe p5: surface runtime error states`

最终收口验证：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
git diff --check
```

`check:structure` 仍报告既有非阻塞提示：`SelfHostedEditorLocalization.css` 有 hard-coded color values，属于既有 split 后 token 收口提示，不是 Round 11 新增阻塞。

边界扫描：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

以上扫描均无命中。

## 后续

P5 Round 12：integration smoke + docs closure。

- 用更接近端到端的 smoke 串起 Runtime-backed Preview、Mock Query、Action pending / resume、Log、Branch Receipts、Substate 与 Runtime States 总览。
- 继续保持 SelfHostedEditor 为 authoring UI / adapter，不复制 Runtime evaluator、query evaluator、action dispatcher、substate validator 或 log builder。
- 继续后置完整 host save、Rollback、Trace Replay、Flashback、Unity / Host SDK 与 Host Schema action policy 扩张。
