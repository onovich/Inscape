# SelfHostedEditor P2 Review Presenter Shape Audit

日期：2026-06-17

结论：PASS。P2 Round 4 已把 localization review presenter 的候选、diff、rank、identity、risk/warning 信号收敛为共享 structured `signals` contract；SelfHostedEditor 与 VSCode 都只消费该 contract，不重算 candidate scoring / ranking。

## 范围

- 本轮只收敛 review presenter shape 与 host payload / UI 消费边界。
- 不进入 localization review UI 产品化细节；该项留给 P2 Round 5。
- 不改 `LocalizationAlignmentAuditDomain` 的 scoring / matching 语义。

## Shared Presenter

- `LocalizationReviewItemPresenterModel` 与 `LocalizationReviewActionPresenterModel` 新增 `Signals`。
- `LocalizationReviewSignalPresenterModel` 使用稳定字段：`Key`、`Label`、`Value`、`Severity`。
- `LocalizationReviewPresenterModelBuilderDomain` 统一生成：
  - item: `review-status`、`candidate-count`、`current-line-identity`
  - candidate action: `similarity`、`rank-penalty`、`reason`、`candidate-line-identity`
  - diff action: candidate signals + `current-line-identity`
- severity 由 Tooling 决定：`conflict` 和 `drift` 进入 `risk`，`changed/new/removed/stale` 与非 available line identity 进入 `warning`，普通信息为 `info`。

## SelfHostedEditor Payload

- `SelfHostedEditorPayloadBridge` 继续保留 compact `presenter.items`，不返回 full report。
- review row 的 `lineId`、`lineFingerprint`、`lineIdentityStatus` 仍作为结构字段保留。
- item 级 compact signals 只保留 `risk`，避免普通行重复携带大量 tooltip detail。
- `open-candidate` action 保留 shared structured signals；当 signals 可用时 compact payload 不再重复携带旧 `actionStatus`。
- `show-candidate-diff` 继续保留 presenter-generated diff `detail`，浏览器不生成 diff 语义。
- `court-loop` real review payload 修复过程：
  - 初始 structured signals 后为 306058 bytes，超过 240000 bytes 上限。
  - item risk-only signals 后为 266108 bytes，仍超过上限。
  - 普通 item detail 压缩后为 231521 bytes，通过 direct / HTTP smoke。

## Host Consumption

- SelfHostedEditor `LocalizationReviewRowsModelBuilder` 只 normalize `signals` 字段。
- SelfHostedEditor table tooltip 读取 shared signals 生成摘要，不解析旧 status 字符串。
- VSCode `LocalizationReviewQuickPickAdapter` 读取 `model.signals` 生成 description/detail parity 摘要。
- 两个 host 都没有复制 scoring / rank / identity 判断。

## Debug 自检

- direct smoke 与 HTTP smoke 均使用真实 `samples/court-loop.inscape`。
- direct / HTTP payload 都为 170 items、231521 bytes，低于 240000 bytes 上限。
- payload bridge contract 覆盖 item risk signal 过滤、candidate action signals 保留、diff detail 保留。
- model contract 覆盖 table row / action signal normalize 与 tooltip 摘要。

## 架构自检

- 语义源头仍在 `Internal/Tooling`。
- SelfHostedEditor 只做 transport trimming、row model normalize、tooltip display、source jump。
- VSCode 只做 QuickPick display。
- `Inscape.Compiler` 未引入 host / UI 依赖。
- 本轮不改变 localization CSV update、line-map refresh、stable node map apply 语义。

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
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
git diff --check
```

`git diff --check` 退出码为 0；输出仅包含既有工作区 CRLF/LF 提示。

## 下一轮

P2 Round 5：SelfHostedEditor Localization Review UI。重点是把 candidate diff、rank reason、line identity、conflict/risk 状态产品化为更易读的 UI 审计信息，并做人工 clear match / similar candidate / ambiguous candidate 检查。
