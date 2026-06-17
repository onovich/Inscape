# SelfHostedEditor P2 VSCode Parity Boundary Audit

日期：2026-06-17
状态：P2 Round 9 审计完成

## 目标

本轮只复核 VSCode 与 SelfHostedEditor 对 P2 stable identity / localization review 语义的消费边界，不新增 Host Schema / Host Bridge / Unity-Bird 或 P3 行为。

结论：

- VSCode 仍通过共享 CLI / Tooling contract 消费 stable node map、localization review/update 与 line identity refresh；未复制 SelfHostedEditor 的桌面写回链路。
- SelfHostedEditor 仍通过 backend service / transport command 消费 shared CLI payload；dev-host HTTP 路径不暴露真实 sidecar write-back，Electron desktop 才拥有 `workspace.write-back-backup` 与 `stable-node-map.write-sidecar`。
- 两侧 UI 形态可以不同：VSCode 保持 Quick Pick / 命令式入口，SelfHostedEditor 保持 workbench 表格与 node-map dialog；语义来源必须一致。

## 审计证据

VSCode：

- `LocalizationCommand` 继续调用 `audit-l10n-alignment-project`、`update-l10n-project` 与 `refresh-l10n-line-map-project`。
- `LocalizationReviewQuickPickAdapter` 只展示 shared `signals` / `actionStatus`，不计算 similarity、rank penalty 或 candidate order。
- `EditorAuthoringCommand` 继续调用 `update-node-map-project` 与 `apply-node-map-candidate-project`。
- `StoryNodeMapReviewController` 只拥有 Quick Pick、`.review-backup.json` / revert 这类宿主文件体验，并把 preview/apply 委托给 CLI invocation wrapper。

SelfHostedEditor：

- `EditorBackendTransport` 把 node-map review/apply/write-back 表达为业务 command；dev-host route map 只暴露 review/apply，不暴露 desktop-only sidecar write 或 write-back backup。
- `SelfHostedEditorStoryNodeMapBridge.writeBackNodeMap()` 在真实写回前先调用 `workspaceSessionClient.writeBackBackup()`，再调用 `stableNodeMapClient.writeSidecar()`。
- `StoryNodeMapReviewController` 保留 `Preview Apply` 与 `Confirm Apply` 的两段式 UI：dry-run 与真实 apply/write-back 不混用。
- `LocalizationReviewRowsModelBuilder` 继续保留 shared presenter signals 与 candidate actionStatus。

## 新增回归护栏

`npm --prefix src\ExternalSupport\VSCode run check:semantic-parity` 现在除 LanguageServer 六类作者语义端点外，也静态断言 P2 共享边界：

- VSCode stable node map 只能调用 shared CLI，不得依赖 SelfHostedEditor desktop-only write-back command。
- VSCode localization review UI 只能展示 shared presenter signals，不得在宿主侧重算候选分数 / 排名。
- SelfHostedEditor dev-host route map 不得暴露 `stable-node-map.write-sidecar` 或 `workspace.write-back-backup`。
- SelfHostedEditor node-map write-back 必须先 backup 再 sidecar write。

## 下一轮入口

进入 P2 Round 10：评估 batch review / multi-apply 是否进入 P2。默认倾向是不扩大自动 apply 范围；如果保留，必须是 selected candidates 的小闭环，并具备 dry-run、人工确认、备份与可审计结果。
