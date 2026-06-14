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
- [0010：采用目录优先的主语/角色命名模型](0010-directory-first-subject-role-naming.md)
- [0011：采用 Internal / ExternalSupport 分层，并引入 Tooling 中间层](0011-internal-tooling-and-external-support-boundary.md)
- [0012：采用目录骨架优先的仓库重构顺序](0012-directory-first-repository-reframe-order.md)
- [0013：作者标题与稳定节点 ID 分离](0013-author-title-and-stable-node-id.md)
- [0014：第一方工具与资源目录边界](0014-first-party-tooling-and-resource-boundaries.md)
- [0015：编辑器扩展归属外部支持层](0015-editor-extension-external-support-boundary.md)
- [0016：VSCode 语言能力使用常驻 LanguageServer 会话](0016-vscode-language-server-daemon-session.md)
- [0017：自研编辑器归属 ExternalSupport 并复用 Internal 契约](0017-self-hosted-editor-external-support-boundary.md)
- [0018：SelfHostedEditor backend 使用业务窄接口并区分 session 状态](0018-self-hosted-editor-backend-session-boundary.md)
- [0019：SelfHostedEditor desktop backend v0 采用嵌入式 EditorBackend](0019-self-hosted-editor-embedded-backend-v0.md)
- [0020：SelfHostedEditor v0 采用 Electron、目录 workspace 与分层保存恢复策略](0020-self-hosted-editor-electron-workspace-and-save-strategy.md)
