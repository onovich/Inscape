# SelfHostedEditor P5 Integration Audit

日期：2026-06-20

状态：P5 Round 12 integration smoke + docs closure complete，不代表 P5 final validation 已完成。

## 结论

PASS for P5 Round 12。SelfHostedEditor 现在有 `check:runtime-authoring-integration`，通过真实 in-process dev host HTTP 请求串起 P5 Runtime authoring 最小作者调试路径，并把 Runtime payload 投影到各 bounded surface model 与 Runtime States inventory。

下一步进入 P5 final validation / PASS-FAIL 收口；当前 Round 12 没有暴露需要进入 P5 Round 13-15 缓冲修复的阻塞缺陷。

## 覆盖路径

- Host Schema / Host Bridge：临时 workspace 包含 `inscape.config.json`、Host Schema `queries[]` / `actions[]`、Host Bridge `actions[]` handler mapping，并通过 `/api/host-schema-capabilities` 与 `/api/host-binding-capabilities` 取回 shared capability catalog。
- Mock Query：`RuntimeMockQueryModelBuilder` 从 Host Schema 生成 session-only mock rows，设置 `has_item("silver_key") = true` 与 `trust("mira") = 3`，只把 ready rows 投影成 Runtime `kind: "Mock"` provider。
- Runtime-backed Preview：`/api/runtime-state` 使用 mock query 与 Host Bridge-derived action dispatcher 返回 Runtime snapshot；Preview model provider 为 `runtime`，能看到 conditional key option。
- Fire action：选择 `Use key` 进入 `GateOpen`，Runtime compact payload 暴露 `play_timeline` fire action request evidence，且不产生 pending。
- Wait pending / debug resume：继续到 `GateKnock` 触发 `wait_for_ui` pending；`RuntimeActionAuthoringModelBuilder.buildResumeActionRequest(..., "completed")` 通过 `/api/runtime-action` 的 `resume-action` 路径交回 Runtime，pending 被 Runtime 清除。
- Log / Backlog：resume 后 `advance-flow` 暴露 Runtime `logEntries`，`RuntimeLogBacklogModelBuilder` 显示 bounded log summary。
- Branch Receipts：`GateKnock` 条件选项记录 `trust("mira")` branch receipt，`RuntimeBranchEvidenceModelBuilder` 显示 query、argument、result、source kind 与 source jump，并保持 `requeriesHost: false`。
- Runtime Substate：通过 `/api/runtime-substate-export` 导出 `inscape.runtime-substate`，`/api/runtime-substate-validate` 返回 compatible，`/api/runtime-substate-import` 只在 compatible 时恢复 Runtime Preview；scriptVersion drift 返回 migratable 且 import blocked。
- Runtime States：`RuntimeErrorStateInventoryModelBuilder` 聚合 Preview、Runtime Status、Mock Query、Runtime Actions、Log / Backlog、Branch Receipts 与 Runtime Substate 七个 surface，覆盖 ready、empty、unavailable、error、stale 与 blocked bounded states。

## Failure / Empty / Stale Coverage

- Runtime unavailable：model-level status 使用 `provider: unavailable`，Runtime States 不把它伪装成 ready。
- Runtime command error：bounded status 只保留 error code / message availability，不暴露 raw stderr。
- Missing schema：Mock Query surface 在 Host Schema unavailable 时进入 unavailable / schema category。
- Missing bridge：Runtime Actions surface 在 Host Bridge unavailable 时指向 bridge fix category。
- Missing handler：Host Schema action declared but Host Bridge handler missing 时 Runtime Actions surface 为 error。
- Empty log：Runtime snapshot 无 `logEntries` 时 Log / Backlog surface 为 empty。
- Empty branch receipt：Runtime snapshot 无 branch receipts 时 Branch Receipts surface 为 empty。
- Empty substate artifact：Runtime unavailable 且无 artifact 时 Runtime Substate 不能 export / import。
- Stale substate：scriptVersion mismatch 的 import 返回 migratable，Runtime Substate surface 为 stale，且不静默修复。
- Hosted payload contract diagnostic：Runtime States diagnostic contract 保留 `payload-contract-error` code / category，但不暴露 raw hosted payload body。

## 验证矩阵

Round 12 功能提交：

- `a72cbe9 p5: add runtime authoring integration smoke`
- `3c652fc p5: harden runtime authoring integration smoke`

本轮收口验证通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-authoring-integration
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
git diff --check
```

`check:structure` 仍报告既有非阻塞提示：`SelfHostedEditorLocalization.css` 有 hard-coded color values，属于既有 split 后 token 收口提示，不是 Round 12 新增阻塞。

## 边界扫描

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

以上扫描均无命中。`rg` 无命中时返回 exit code 1，本轮按无输出解释为 PASS。

## 架构自检

- Runtime / CLI 仍是 Runtime state、condition、query、action、substate、log 与 branch receipt 的语义真相。
- SelfHostedEditor 只做 dev-host HTTP transport、Runtime bridge、presenter model、UI surface 与 smoke 编排。
- Host Schema / Host Bridge / Runtime payload / Runtime States inventory 分层保持清楚；smoke 通过 shared capability endpoint 取 catalog，不在浏览器侧解析 Host Schema 或 Host Bridge JSON。
- 没有复制 Runtime condition evaluator、query evaluator、action dispatcher、substate validator 或 log builder。
- 没有新增完整 host save、Rollback、Trace Replay、Flashback、Unity / Host SDK、Presentation IR 或 Host Schema action policy。
- 未提交 unrelated FSRC / visual-design 草稿文档、`dist/`、`node_modules/`、log 文件或临时 workspace。

## 未完成 / 非阻塞问题

- 既有 `SelfHostedEditorLocalization.css` hard-coded color values style warning 仍存在，非 Round 12 新增阻塞。
- P5 final validation / PASS-FAIL 报告尚未执行；该步骤应在下一轮按 P5 主指南进入最终验收。

## 下一步

进入 P5 final validation / PASS-FAIL 收口，输出 `docs/self-hosted-editor-p5-final-validation-report.md`。除非 final validation 暴露阻塞缺陷，否则不进入 P5 Round 13-15 缓冲修复。
