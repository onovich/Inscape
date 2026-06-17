# SelfHostedEditor P2 Stable Node Map Contract Audit

状态：P2 Round 7 完成，不宣布 P2 完成
日期：2026-06-17

## 本轮目标

Round 7 只加固 stable node map review/apply 的共享 contract：

- conflict / manual-review report 能解释候选为什么进入人工审查。
- apply 前可以明确展示将要替换的 stable id。
- dry-run / apply 后能追溯结构化结果。
- apply result 携带 node-map sidecar backup metadata 与 recovery hint。
- SelfHostedEditor 继续只做 bridge / compact payload / UI 显示，不在浏览器重建候选语义。

## 已完成

- `StoryNodeMapReviewCandidateModel` 新增 `evidence` 与 `applyPreview`。
  - `evidence` 由 `StoryNodeMapUpdateDomain` 的候选评分过程生成，当前覆盖 source path、first content fingerprint、line anchor overlap、source line distance，以及匹配时的 neighbor fingerprint。
  - `applyPreview` 由 Tooling 根据当前新节点与候选旧节点生成，明确 `removedStableId -> appliedStableId`、候选标题、结果标题、是否移除候选 entry 与 apply 后 previousTitles。
- `StoryNodeMapReviewCandidateApplyResultModel` 新增共享 result contract。
  - `format` 为 `inscape.node-map-candidate-apply-result`。
  - 包含 `dryRun`、`writesNodeMap`、`nodeMapPath`、`outputPath`、`changePreview`、`backup` 与 `recoveryHint`。
  - dry-run 明确 `writesNodeMap=false`、`backup.status=not-required-dry-run`。
  - apply 明确 `writesNodeMap=true`、`backup.targetKind=node-map-sidecar`、`backup.status=required-before-write-back`，并提示通过 `.inscape-workspace/backups` 恢复。
- CLI `apply-node-map-candidate-project` 新增 `--result <json>`。
  - stdout 仍保持最后一行输出写出路径，兼容现有调用。
  - dry-run 写 preview sidecar 与 result JSON；apply 写 node-map sidecar 与 result JSON。
- SelfHostedEditor dev host 的 `/api/node-map-apply` 读取 CLI result JSON 并 compact。
  - compact payload 保留 top-level `changePreview`、`backup`、`recoveryHint` 与 `result` metadata。
  - compact payload 不重复嵌套完整 `nodeMap`，避免 payload 膨胀；完整 sidecar 仍在 top-level `nodeMap` / `nodeMapText`。
- SelfHostedEditor review UI 只消费共享 preview/result。
  - 候选行显示 `removedStableId -> appliedStableId`。
  - dry-run/apply 状态使用 shared `changePreview` 与 `backup.status`。

## 架构自检

- `Internal/Tooling` 仍是候选评分、证据、apply preview、apply result 与 backup/recovery contract 的语义来源。
- `Internal/Cli` 只作为共享命令入口和 result 写出 adapter，没有重新实现 candidate matching。
- `ExternalSupport/SelfHostedEditor/DevScripts` 只负责运行 CLI、读取 result、路径相对化与 compact payload。
- `ExternalSupport/SelfHostedEditor/Scripts` 只显示 shared fields，不计算 score、不推断冲突语义、不直接改写工作区 sidecar。
- 本轮没有进入 batch / multi-apply，也没有把 downloadable sidecar 升级为真实 workspace write-back；真实写回仍应在 Round 8 以后接 `workspace.write-back-backup` 与明确用户确认。

## Debug 自检

- dry-run 与 apply 仍走同一个 shared `StoryNodeMapReviewActionDomain`。
- dry-run 输出路径保持 `inscape.node-map-candidate-preview.json`，不会修改原 sidecar。
- apply 输出路径保持 `inscape.node-map.json`。
- Direct / HTTP smoke 均断言候选 evidence、apply preview、apply result、backup metadata 与 recovery hint 存在。
- Model contract 断言 UI 发起 dry-run / apply 的参数不变，并显示 shared `node_NEW -> node_OLD` change preview。

## 验证

已通过：

```powershell
dotnet build Inscape.slnx --no-restore
npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map
npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

完整提交前还需要继续跑 SelfHostedEditor syntax/structure、VSCode structure/parity、`git diff --check` 与 `git diff --cached --check`。

## 下一轮

进入 P2 Round 8：Stable Node Map UI 闭环。

重点：

- 将当前 downloadable payload 与真实 workspace write-back 明确区分为两个 UI 状态。
- 对真实写回接入 `workspace.write-back-backup`，并显示 backup result / recovery path。
- 补人工确认闭环与错误恢复，不扩展自动继承范围。
