# SelfHostedEditor P2 Localization Scoring Audit

日期：2026-06-17
状态：P2 Round 2 契约审计

## 结论

Localization candidate scoring 的共享契约当前可继续进入 P2 下一轮。

- `LocalizationAlignmentAuditDomain` 仍是 localization alignment、similarity、rank penalty、reason 与 candidate 排序的唯一共享真相。
- 相似文本不会静默复用旧译文：只有 anchor 完全命中的 `kept` item 会填入 confirmed translation；`changed` / `conflict` item 的当前 translation 保持空值，旧译文只进入 candidate。
- `LocalizationReviewPresenterModelBuilderDomain` 在 `Internal/Tooling` 生成 candidate source jump、diff、similarity、rank penalty、line identity 与 reason 摘要。
- SelfHostedEditor 当前只消费共享 presenter actions 并渲染 Current / Candidate / Diff，不计算 similarity、rank penalty 或候选排序。
- 本轮没有进入 Host Schema / Host Bridge / Unity-Bird，也没有进入 P3 runtime / syntax / extension 设计。

## 契约证据

### Internal / Tooling

- `src/Internal/Tooling/Localization/Domains/LocalizationAlignmentAuditDomain.cs`
  - exact anchor match 才生成 `kept / confirmed`，并把 previous translation 填入当前 item。
  - similar match 生成 `changed / needs-review` 或 `conflict / choose-candidate`，当前 item 使用空 translation。
  - previous entry 的 translation 保留在 `LocalizationAlignmentCandidateModel.Translation`，由人工 review 使用。
  - candidate 带 `Similarity`、`RankPenalty`、`Reason`、`LineId`、`LineFingerprint` 与 `LineIdentityStatus`。
  - 被候选引用但未确认的旧 entry 会生成 `stale / needs-review`，避免旧译文无声消失。
- `src/Internal/Tooling/Localization/Domains/LocalizationReviewPresenterModelBuilderDomain.cs`
  - `open-candidate` action status/detail 暴露 similarity、rank penalty、reason 与 line identity。
  - `show-candidate-diff` action detail 暴露 current text、previous candidate text、candidate translation、rank penalty 与 reason。

### Tests

现有 Internal tests 已覆盖本轮需要的核心风险，因此本轮不新增重复测试。

- `LocalizationAlignmentAuditReportsReviewStatuses`
  - 断言 `kept` 会携带 confirmed translation。
  - 断言 `changed.Translation == ""`，即相似旧文不会静默继承旧译文。
  - 断言旧译文只出现在 `changed.Candidates[0].Translation`。
  - 断言 candidate reason、candidate diff、rank penalty 进入 review presenter action。
- `LocalizationAlignmentAuditKeepsLowConfidenceSimilarTextAsConflict`
  - 断言低置信相似文本不产生 `changed`。
  - 断言 conflict item 不填 confirmed translation。
- `LocalizationAlignmentAuditKeepsRewrittenSameLineCandidate`
  - 断言 exact line identity 可以保留 rewritten same-line 旧译文候选。
  - 同时断言 rewritten current item 仍需要 review，不继承候选翻译。
- `LocalizationAlignmentAuditResolvesCloseCandidatesByLineIdentity` 与 `LocalizationAlignmentAuditRanksExactLineIdentityBeforeTextSimilarity`
  - 断言 exact line identity 可以裁剪或压过纯文本高相似候选。
- sequence、context shape、keyword fingerprint、neighbor shape、local context 相关 tests 覆盖候选排序 reason 与 tie-break。

### SelfHostedEditor / VSCode 边界

- `src/ExternalSupport/SelfHostedEditor/Scripts/Localization/Models/LocalizationReviewRowsModelBuilder.js` 只把 shared presenter item/action 归一化为 UI row。
- `src/ExternalSupport/SelfHostedEditor/Scripts/Localization/Renderers/LocalizationTableRenderer.js` 只根据 action key 生成按钮标签和交互，不重算候选分数。
- `src/ExternalSupport/SelfHostedEditor/DevScripts/SelfHostedEditorLocalizationReviewSmoke.js` 与 HTTP smoke 验证 compact payload 保留 shared `presenter.items`，并包含 `open-current`、`open-candidate`、`show-candidate-diff` actions。
- VSCode 没有持有 localization scoring 分支逻辑；相关 review 语义继续来自共享 CLI / Tooling contract。

## Debug 自检

- 相似文本：当前 translation 保持空值，旧译文只作为 candidate translation 出现。
- 低置信相似文本：进入 conflict review，不产生自动 changed 确认。
- rewritten same-line：可通过 line identity 找回候选，但仍需要人工 review。
- exact line identity：优先级高于纯文本相似度，且 reason 可审计。
- SelfHostedEditor direct / HTTP review：只验证 compact presenter action 可消费，不让宿主变成 scoring 真相。

## 架构自检

- Compiler 仍是 DSL、StoryGraph 与 localization anchor 真源。
- Internal/Tooling 仍是 localization scoring、candidate ranking、line identity 与 review presenter 真源。
- SelfHostedEditor 只做 bridge adapter、UI 展示和用户确认。
- VSCode 只做 editor integration，不复制 SelfHostedEditor 专属 UI 逻辑。
- localization CSV 与 host config CSV 继续分离；本轮未触碰 host config CSV UI model。

## 下一轮目标

P2 Round 3：Line Identity 信号加固。

- 继续审计 line id、fingerprint、local context、rank penalty 与 diff detail 的可读性。
- 若发现缺口，优先补 `Internal/Tooling` 测试或 presenter contract，再调整宿主展示。
- 本轮保留的 UI 产品化缺口进入 Round 4 / Round 5，而不是在浏览器端补 scoring。
