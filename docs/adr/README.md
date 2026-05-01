# 架构决策记录

ADR 用于记录影响项目长期方向的决定。每条 ADR 应说明背景、决定、原因、影响和后续验证方式。

## 状态

- `Proposed`：提议中。
- `Accepted`：已经采纳。
- `Superseded`：已被后续 ADR 替代。

## 记录列表

- [0001：采用文档先行的立项方式](0001-documentation-first.md)
- [0002：把未定语法和交互显式标注为草案](0002-mark-uncertain-designs-as-draft.md)
- [0003：块级使用显式节点名，行级使用隐式哈希](0003-explicit-node-names-and-line-hashes.md)
- [0004：DSL 阶段提供 VSCode 支持和 HTML 调试预览](0004-dsl-stage-tooling.md)
- [0005：DSL 只表达状态查询，不绑定具体业务行为](0005-expression-only-state-queries.md)
- [0006：第一版本地化使用 CSV 与锚点精确继承](0006-localization-csv-and-anchor-update.md)
- [0007：采用分层竞品参照定位 DSL 与工具链](0007-dsl-benchmark-positioning.md)
- [0008：宿主桥接层与项目适配边界](0008-host-bridge-and-adapter-boundary.md)
- [0009：VSCode 正文链接态不用 DocumentLinkProvider](0009-vscode-transient-text-links-without-document-links.md)
