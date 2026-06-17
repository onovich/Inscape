# SelfHostedEditor P2 Baseline Audit

日期：2026-06-17
状态：P2 Round 1 基线审计

## 结论

P2 已具备可继续推进的共享契约基础，但尚未完成 P2 验收。

- localization alignment / review 的核心 scoring、candidate、rank penalty、line identity 字段已经在 `Internal/Tooling` 内存在，并有 Internal tests 覆盖。
- SelfHostedEditor 已能通过 dev-host direct / HTTP smoke 消费 localization review、line-map refresh 与 stable node map review/apply。
- Stable Node Map 的共享 CLI dry-run/apply 已存在，SelfHostedEditor 也能请求 manual-review candidate preview/apply。
- P2 主要缺口集中在产品化审计展示、apply 写回安全闭环、backup/recovery metadata、batch/multi-apply 决策和最终 parity / 全量验证。

本轮没有进入 P2.5 Host Schema / Host Bridge / Unity-Bird，也没有进入 P3 runtime / syntax / extension 设计。

## 已验证入口

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
```

结果：以上 P2 Round 1 建议命令均通过。工作树中仍有外部协作文档 untracked，本轮未纳入。

## 当前能力清单

### Localization scoring / review

- `src/Internal/Tooling/Localization/Domains/LocalizationAlignmentAuditDomain.cs` 是 alignment / scoring / candidate ranking 的共享真相。
- `LocalizationAlignmentReportModel` 已包含 `kept` / `new` / `changed` / `removed` / `conflict` / `stale` 状态、candidate `similarity`、`rankPenalty`、`reason`、`lineId`、`lineFingerprint` 与 `lineIdentityStatus`。
- Internal tests 已覆盖 low-confidence similar text 进入人工 conflict、sequence / context / keyword / neighbor / local context tie-break、line sidecar identity、sidecar drift、same-line rewrite 和 exact line identity 优先级。
- `LocalizationReviewPresenterModelBuilderDomain` 位于 `Internal/Tooling`，会把 candidate score、rank penalty、line identity 和 fingerprint 汇总到 presenter action status / detail。
- SelfHostedEditor `check:localization-review` 已通过真实 dev-host helper，当前样例返回 170 items。

### Line identity

- `refresh-l10n-line-map-project`、direct smoke 和 HTTP smoke 均存在。
- `LocalizationAlignmentAuditDomain` 会读取 line sidecar，并在可用且无 drift 时把 line id / fingerprint 注入 review item 和 candidate。
- SelfHostedEditor line-map bridge 只保存 session sidecar，并继续让 Tooling 负责 line id 迁移。

### Stable node map

- `update-node-map-project --report` 输出 `inscape.node-map-update-report`，覆盖 `renamed`、`new`、`missing`、`conflict` 与 `manual-review`。
- `apply-node-map-candidate-project` 支持 dry-run 和 apply，复用 `StoryNodeMapReviewActionDomain`，不是宿主 JS 直接改写 sidecar 语义。
- SelfHostedEditor direct / HTTP smoke 已覆盖 node-map review、manual-review candidate、dry-run preview 和 apply payload。

## 差距清单

1. Localization scoring 仍需要 P2 Round 2 做显式契约审计：当前测试显示 similar text 不会静默复用，但还需要对现有实现和 fixtures 做逐项证明，并补缺失测试。
2. Localization review UI 仍偏摘要文本：SelfHostedEditor `LocalizationReviewRowsModelBuilder` 主要消费 presenter summary/detail/actions，尚未把 candidate similarity、rank penalty、line id、fingerprint、risk/warning 作为结构化 UI 字段产品化展示。
3. Line identity 审计信息已进共享 report，但 UI 可读性仍不足；fingerprint、local context、rank penalty 和 diff detail 需要更清晰的 review display。
4. Stable Node Map apply 结果模型较轻，只返回 applied / removed stable id 与更新后的 node map；P2 仍需补 conflict report、backup metadata、recovery hint 与真实 workspace 写回安全闭环。
5. SelfHostedEditor node-map UI 已有 manual candidate Preview / Apply，但 apply 后主要更新 downloadable node map payload；P2 仍需证明 dry-run 不写入、apply 写入前有备份、冲突不误报成功。
6. Batch review / multi-apply 尚未决策。若 P2 不做，需写入 docs；若做，只能做 selected candidates 的小闭环，不能静默全量 apply。
7. Localization update safety 尚未完成 P2 专项审计；需要确认 update 只走共享 CLI / Tooling contract，backup/recovery/error report 清晰，且不混用 host config CSV UI model。
8. VSCode parity 后续还需专项验证：VSCode 不一定暴露同等 UI，但不得持有过期 contract 或复制旧 scoring / node-map apply 语义。

## 架构自检

- Compiler 仍是 DSL / StoryGraph / localization anchor 真相。
- Internal/Tooling 仍是 localization alignment scoring、review presenter、line identity 和 stable node map review/apply 语义真相。
- SelfHostedEditor 当前只做 bridge、UI 状态、review display、candidate confirmation 和 downloadable payload，不重写 scoring / migration 语义。
- VSCode 与 SelfHostedEditor 共享 Tooling / CLI 契约，不共享彼此 UI 代码。
- localization CSV 与 host config CSV 仍保持分离；P2 本轮未触碰 Host Schema / Host Bridge / Unity-Bird。

## 下一轮目标

P2 Round 2：Localization Scoring 契约审计。

- 对 `LocalizationAlignmentAuditDomain` 和 Internal tests 做逐项审计。
- 证明相似文本只能成为人工 review candidate，不会静默复用旧译文。
- 若证据不足，优先补 Internal/Tooling 测试，不在 SelfHostedEditor UI 里补 scoring 逻辑。
