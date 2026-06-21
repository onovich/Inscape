# Sinan Cooperation Notes

状态：外部合作资料目录

本目录记录 Sinan / Inscape 合作讨论、技术评估、决策简报和对外沟通口径。这里的内容用于合作对齐，不代表 Sinan 成为 Inscape core dependency。

当前已拍板：

- `Host Integration Partner Readiness: GO`
- `Sinan Static Artifact POC planning: GO`
- `Sinan Runtime Integration: HOLD`
- `Runtime Preview Bridge: HOLD`
- `Hard Dependency: NO`
- `Sinan-specific Core Semantics: NO`

阅读顺序：

1. [Sinan Engine 给 Inscape 的合作沟通函](sinan-business-letter-2026-06-20.md)
2. [RFC-005 Sinan / Inscape Narrative Bridge](rfc-005-sinan-inscape-narrative-bridge.md)
3. [Sinan Technical Advisory](sinan-technical-advisory-2026-06-20.md)
4. [Inscape Review for Sinan Technical Lead](inscape-review-for-sinan-technical-lead-2026-06-20.md)
5. [Host Integration Partner Readiness 决策简报](host-integration-partner-readiness-decision-brief-2026-06-21.md)
6. [Host Integration Partner Readiness 商务反馈口径](host-integration-partner-readiness-business-response-2026-06-21.md)
7. [Host Integration Partner Readiness Goal 模式执行指南](../host-integration-partner-readiness-goal-mode-execution-guide.md)
8. [Host Integration Partner Readiness Baseline Audit](../host-integration-partner-readiness-baseline-audit.md)
9. [Host Integration Package Contract](../host-integration-package-contract.md)
10. [Narrative Graph IR External Contract](../narrative-graph-ir-external-contract.md)
11. [Source Location External Contract](../source-location-external-contract.md)
12. [Localization Anchor Export Contract](../localization-anchor-export-contract.md)
13. [Host Bridge Candidate Contract](../host-bridge-candidate-contract.md)
14. [Host Integration Partner Readiness Fixtures](../host-integration-partner-readiness-fixtures.md)

边界规则：

- `Inscape.Compiler` 不依赖 Sinan。
- `src/Internal` 不出现 Sinan-specific dependency。
- Host Schema 不新增 Sinan-only action policy。
- Runtime 不复制 Sinan execution semantics。
- Sinan 只能作为 partner profile / fixture 验证通用契约。
- 第一阶段只做 static artifact、dry-run、report、Host Bridge candidate、fixture 和 planning。
