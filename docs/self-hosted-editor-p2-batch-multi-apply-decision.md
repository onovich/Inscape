# SelfHostedEditor P2 Batch Review / Multi-Apply Decision

日期：2026-06-17
状态：P2 Round 10 决策完成

## 结论

P2 不实现 batch review / multi-apply。

当前 P2 保留并验收的范围是单个 manual-review candidate 的显式闭环：

- 用户逐项查看 shared Tooling / CLI 产生的 review item 与 candidate evidence。
- `Preview Apply` 只做 dry-run preview，不写 workspace sidecar。
- `Apply` 必须经过 `Confirm Apply`。
- Electron desktop 写回前必须先 `workspace.write-back-backup`，再执行 desktop-only `stable-node-map.write-sidecar`。
- dev-host HTTP 仍只提供 downloadable payload，不声称真实写盘。

## 不进入 P2 的原因

- Stable node map manual-review 的核心风险不是按钮数量，而是误把多个候选当成“同一批可安全继承”的语义。批量入口会天然鼓励作者跳过逐项确认。
- Localization alignment contract 明确相似文本只能作为人工候选；同一原则也适用于 stable node rename candidate。
- 当前 shared Tooling / CLI 已有单候选 `apply-node-map-candidate-project`，但没有 batch result / batch recovery / per-item rollback contract。若在宿主侧拼批量，会把语义和恢复策略复制到 VSCode 或 SelfHostedEditor。
- P2 剩余主线需要进入 localization update safety、集成 smoke、文档/ADR 与全量验证；新增 batch 行为会扩大验证矩阵，且不提升 P2 PASS 的必要条件。

## 回归护栏

`npm --prefix src\ExternalSupport\VSCode run check:semantic-parity` 现在拒绝 VSCode / SelfHostedEditor node-map UI 或 bridge 中出现 `Apply All`、bulk、batch、multi-apply 类入口。该检查不禁止已有的逐候选 apply，只防止 P2 中悄悄加入半成品批量入口。

## 后续开放问题

P2 之后若重新评估 batch review / multi-apply，必须先补共享 contract，而不是直接在宿主 UI 里循环调用单候选 apply：

- 输入必须是用户显式选择的一组 candidates，不能一键全量默认选择。
- 必须先生成 batch dry-run report，逐项列出将移除 / 继承 / 写入的 stable id。
- 必须有 batch result contract，包含每项 apply 结果、失败项、skipped 项、backup metadata 与 recovery hint。
- 必须复用共享 Tooling / CLI；VSCode 与 SelfHostedEditor 只展示和确认，不重排 candidate。
- 必须有可验证的恢复策略：至少能说明如何从 `.inscape-workspace/backups/` 或 VSCode `.review-backup.json` 回滚。
