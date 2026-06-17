# SelfHostedEditor P2 Line Identity Signal Audit

日期：2026-06-17
状态：P2 Round 3 信号加固

## 结论

Line identity 已从 Tooling scoring / presenter 继续打通到 SelfHostedEditor compact review payload，可进入 Review Presenter 形状收敛与 UI 产品化轮次。

- `Internal/Tooling` 仍负责 line id、fingerprint、local context、rank penalty 与 reason 的 scoring / presenter 语义。
- SelfHostedEditor compact payload 现在保留 `item.lineId`、`item.lineFingerprint`、`item.lineIdentityStatus`，并在 `open-candidate` action 上保留 Tooling 生成的 `actionStatus`。
- `show-candidate-diff` 继续保留 Tooling diff detail，因此 candidate translation、current / previous text、rank penalty、reason 与 line identity 摘要仍从共享 presenter 来。
- 浏览器端只透传和显示共享信号：row model 保存 line identity 字段，Candidate 按钮 tooltip 使用 `actionStatus`；没有在 UI 端重算 similarity、rank penalty 或候选排序。
- payload 仍保持 compact：真实 `court-loop` review payload 为 238738 bytes，低于 240000 bytes 上限。

## 本轮代码变化

- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorPayloadBridge.js`
  - compact localization item 保留 line identity 三字段。
  - compact `open-candidate` action 保留 `actionStatus`，让 score / rank penalty / reason / line status 进入浏览器。
  - diff action 不重复保留 `actionStatus` / `summary`，避免 payload 膨胀；diff detail 已包含审计信息。
- `src/ExternalSupport/SelfHostedEditor/Scripts/Localization/Models/LocalizationReviewRowsModelBuilder.js`
  - hosted review row 保留 line identity 字段，后续 UI 可直接消费结构化字段。
- `src/ExternalSupport/SelfHostedEditor/Scripts/Localization/Renderers/LocalizationTableRenderer.js`
  - review action tooltip 使用 `actionStatus | detail | summary`，让当前 Candidate 操作至少能读到共享 rank / identity 信号。

## 测试证据

- `SelfHostedEditorPayloadBridgeContractCheck`
  - 断言 compact localization item 保留 line id / fingerprint / status。
  - 断言 compact candidate action 保留 shared `actionStatus`。
- `SelfHostedEditorLocalizationContractCheck`
  - 断言 hosted row model 保留 line id / fingerprint / status。
  - 断言 Candidate 按钮 tooltip 暴露 shared similarity / rank status。
- `SelfHostedEditorLocalizationReviewSmoke` 与 HTTP smoke
  - 断言真实 dev-host localization review candidate action 保留 `rankPenalty` 状态。
  - 断言 payload 不暴露完整 report，仍低于 compact payload 上限。
- `SelfHostedEditorLineMapSmoke` 与 HTTP smoke
  - 继续验证 line-map session refresh 可以通过 `sessionId` 保持 stable line id。

## 架构自检

- Compiler 仍是 localization anchor 与 source span 真源。
- Internal/Tooling 仍是 line identity scoring、local context、rank penalty、reason 与 diff presenter 真源。
- SelfHostedEditor 只做 compact transport、row mapping、tooltip display 和 source jump。
- VSCode 不受本轮宿主 UI 细节影响，仍消费共享 CLI / presenter report。
- 本轮未引入 Host Schema / Host Bridge / Unity-Bird 或 P3 runtime / syntax / extension 内容。

## 剩余缺口

- Review Presenter 形状仍需要 Round 4 收敛：需要更稳定地表达 candidate、diff、rank、identity、risk / warning，避免长期依赖混合文本字段。
- SelfHostedEditor Review UI 仍需要 Round 5 产品化：候选差异、rank reason、line identity、conflict / risk 状态应从 tooltip 走向更易扫读的 visible UI。
- Stable Node Map apply 的 backup / recovery / conflict report 仍属于后续 Round 6-8。

## 下一轮目标

P2 Round 4：Review Presenter 形状收敛。

- 继续把共享 presenter 的 candidate / diff / rank / identity / risk 信号收敛成更稳定的 contract。
- 确认 SelfHostedEditor compact payload 不丢 UI 审计必需字段。
- 对 VSCode 与 SelfHostedEditor 的共享 contract 做 parity 检查。
