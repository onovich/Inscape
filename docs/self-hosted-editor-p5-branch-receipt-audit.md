# SelfHostedEditor P5 Branch Receipt Audit

日期：2026-06-18

状态：P5 Round 9 branch receipt / condition explanation complete

## 范围

本轮完成 SelfHostedEditor Host view 的 Branch Receipts surface，只展示 Runtime snapshot 提供的 branch-affecting query evidence。该 surface 用于作者理解条件选项和条件跳转为何可见 / 不可见，但不重新查询 host、不重新执行 Runtime、不实现完整 Trace Replay 或 replay timeline。

## 实现

- Runtime compact payload 现在保留 bounded `branchQueryReceipts` 摘要，字段覆盖 query name、arguments、result、source kind、deterministic、node / choice / jump context、branch path 与 source line / column。
- 新增 `RuntimeBranchEvidenceModelBuilder`，把 Runtime envelope 投影为 `inscape.self-hosted-editor.runtime-branch-evidence` authoring model，显式标记 `requeriesHost: false` 与 `implementsReplayTimeline: false`。
- 新增 `RuntimeBranchEvidencePanelController` 与 `SelfHostedEditorRuntimeBranchEvidence.css`，Host view 显示 Branch Receipts、empty / unavailable / error 状态、condition explanation、source jump 与 choice / jump context。
- Workbench render controller 在 Runtime snapshot start / step 后同步刷新 Runtime status、Log / Backlog 与 Branch Receipts；workspace state refresh 也会重绘 receipt source path。
- README、structure guard、style structure guard、model contract、payload bridge contract、Runtime direct / HTTP smoke 与 Workbench integration contract 均已覆盖本轮 surface。

## 边界自检

- Branch Receipts 只消费 Runtime compact payload，不解析脚本文本、不生成 receipt、不复制 Runtime condition evaluator 或 query evaluator。
- Query provider summary 仍不暴露 mock value table；receipt 本身按合同允许展示 Runtime 记录的 branch query argument / result。
- Branch Receipts 不写入 formal Runtime State，不展示完整 Runtime snapshot body、workspace text、host payload 或 Trace Replay body。
- 产品 `Scripts/` 未新增 `ConditionEvaluator`、`ActionDispatcher`、`QueryReceipt`、`RuntimeInspector`、`rollbackPolicy`、`replayPolicy`、`failurePolicy` 或 `timeoutPolicy` 语义标记。

## 验证

本轮应通过以下最小矩阵：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
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

## 后续

下一轮进入 P5 Round 10：Substate preview save/load surface。继续保持 P4 substate 是 Inscape narrative 子状态 blob，不把它产品化为完整 host save，也不把 host business state、完整 Log、完整 action history 或完整 Trace Replay 塞进 SelfHostedEditor。
