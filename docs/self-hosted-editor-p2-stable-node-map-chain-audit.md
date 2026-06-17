# SelfHostedEditor P2 Stable Node Map Chain Audit

日期：2026-06-17

结论：PASS for Round 6 audit。Stable node map review/apply 当前链路已经可审计：review report、manual-review candidate、dry-run preview 和 selected apply 都复用 `Internal/Tooling` 与共享 CLI；SelfHostedEditor 只做 bridge、显示、source jump 和下载 payload。P2 仍未完成，因为备份/恢复 metadata 与真实桌面写回闭环还需要 Round 7/8 加固。

## 范围

- 本轮审计 stable node map review/apply 当前链路。
- 不改变 stable node id 匹配、候选评分、candidate apply 语义。
- 不提前实现 Host Schema / Host Bridge / Unity-Bird 或 P3 内容。
- 不把 node-map UI 扩成 batch / multi-apply。

## 当前链路

- `StoryNodeMapUpdateDomain` 仍是 `renamed`、`new`、`missing`、`conflict`、`manual-review` report 的共享真相。
- `StoryNodeMapReviewActionDomain` 仍是 selected candidate apply 的共享真相；它只应用作者明确选择的 candidate stable id。
- CLI `update-node-map-project --report` 写出 `inscape.node-map.json` 和 `inscape.node-map-update-report`。
- CLI `apply-node-map-candidate-project` 支持 `--dry-run <preview.json>`；dry-run 写 preview 文件，不修改原 sidecar；非 dry-run 写回 node map sidecar。
- SelfHostedEditor `/api/node-map-review` 和 `/api/node-map-apply` 只调用上述 CLI，并通过 `SelfHostedEditorPayloadBridge` 做 compact / relative path adapter。
- SelfHostedEditor `StoryNodeMapReviewController` 展示 shared report，支持 current/candidate source jump、dry-run preview 下载和 selected apply 后更新 downloadable node map payload。

## Dry-Run / Apply 证据

- Internal tests 覆盖 shared apply action：应用候选后 current title 复用旧 stable id、继承 candidate previous titles，并移除 duplicate candidate entry。
- CLI tests 覆盖 dry-run 不修改原 node map，apply 写回 sidecar。
- SelfHostedEditor direct smoke 覆盖 review、manual-review candidate、dry-run preview path、apply sidecar path。
- SelfHostedEditor HTTP smoke 覆盖真实 `/api/node-map-review` 与 `/api/node-map-apply`，并新增 dry-run preview path 与 apply sidecar path 断言。
- SelfHostedEditor model contract 覆盖 UI 的 `Preview Apply` 必须走 dry-run，`Apply` 必须走 real apply。

## 冲突报告

- `update-node-map-project --report` 当前输出 `inscape.node-map-update-report`。
- report summary 包含 total/new/renamed/missing/conflict/manual-review count。
- report item 包含 kind、stableId、title、previousTitle、sourcePath、sourceLine、status、message，以及 manual-review candidates。
- candidate 目前暴露 stableId、title、sourcePath、sourceLine、score。更细的 reason / conflict evidence 尚未进入 stable node map report。

## 备份 / 恢复路径

- 桌面 backend 已有通用 write-back backup 契约：`EditorBackendWorkspaceBackupPlanModel` 将 `node-map-sidecar` 列为受保护写回目标，并规划 `.inscape-workspace/backups/**` 备份。
- Electron workspace session 已能执行 `workspace.write-back-backup`，复制 node-map sidecar / localization CSV / line-map sidecar，并清理过期备份。
- 当前 node-map review/apply dev-host 流程尚未把 backup result、recovery hint 或 restore action 接入 apply payload。
- 浏览器 dev-host 阶段 apply 只更新 downloadable node map payload，不直接改用户工作区文件；真实桌面写回前仍需要先执行 write-back backup。

## 缺口清单

1. Round 7 需要强化 apply result contract：至少显式表达 applied stable id、removed temporary id、dry-run/apply mode、output path、backup metadata 与 recovery hint。
2. Round 7 需要让 conflict/manual-review report 暴露更清晰的候选 evidence，例如 source/content/neighbor/line-anchor 命中原因，而不是只有 score。
3. Round 8 需要把 SelfHostedEditor 桌面真实写回闭环接到 `workspace.write-back-backup`，确保 apply 前可见备份计划，apply 后可追溯备份。
4. Round 8 需要在 UI 中区分 dry-run preview、download-only apply payload、desktop real write-back success/failure，避免把 downloadable payload 误显示成已写盘。
5. Batch review / multi-apply 仍未决策；在决策前不得新增一键全量 apply。

## Debug 自检

- 最小 fixture 覆盖 `# node.a` / `# node.b` 重复台词导致 manual-review。
- dry-run 通过 preview path `inscape.node-map-candidate-preview.json` 验证，不把输出指向原 sidecar。
- apply 通过 sidecar path `inscape.node-map.json` 验证，并保留当前标题 `node.renamed`。
- UI contract 验证 `Preview Apply` 发出 dry-run，`Apply` 发出 real apply。

## 架构自检

- Compiler 仍只负责 DSL / StoryGraph truth，不读取或写入 sidecar。
- Internal/Tooling 仍是 stable node map report 和 candidate apply 语义真源。
- CLI 只做命令参数、文件读写和 Tooling 调用。
- SelfHostedEditor 只做 host bridge、UI 状态、source jump、downloadable payload 和用户确认。
- VSCode 与 SelfHostedEditor 复用同一 CLI / Tooling 契约，不共享彼此 UI 代码。
- localization CSV 与 host config CSV UI model 未混用。
- 本轮未提前实现 P2.5 Host integration 或 P3。

## 验证

已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

`check:structure` 仍输出既有 `SelfHostedEditorLocalization.css` hard-coded color warning，但退出码为 0；`git diff --check` 退出码为 0，仅输出 CRLF 提示。

## 下一轮

P2 Round 7：Stable Node Map Contract 加固。重点是 conflict report、dry-run/apply result、backup metadata 与 recovery hint；apply 前必须能展示将要修改什么，apply 后必须能追溯备份和结果。
