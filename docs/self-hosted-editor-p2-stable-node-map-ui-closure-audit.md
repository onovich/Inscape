# SelfHostedEditor P2 Stable Node Map UI Closure Audit

状态：P2 Round 8 完成，不宣布 P2 完成

日期：2026-06-17

## 结论

PASS for Round 8。SelfHostedEditor stable node map manual-review candidate apply 现在区分 dry-run preview、downloadable payload 与 Electron workspace real write-back；真实写回必须经过人工确认、`workspace.write-back-backup` 备份和 narrow `stable-node-map.write-sidecar` 桌面命令。

P2 仍未完成。下一轮按执行指南进入 Round 9：VSCode parity 与共享边界复核。

## 本轮范围

- 在 SelfHostedEditor node-map review UI 中把 `Apply` 拆为两步：第一次点击只展开确认，`Confirm Apply` 才执行真实 apply。
- 保留 dry-run preview 的下载能力；dry-run 不调用 backup 或 sidecar write。
- 新增 desktop-only `stable-node-map.write-sidecar` command，通过 preload whitelist / IPC / `ElectronWorkspaceSessionStore` 写回 `**/inscape.node-map.json`。
- 写回前必须调用 `workspace.write-back-backup`，且至少成功复制一个备份后才执行 sidecar write。
- dev-host / HTTP 路径没有 sidecar write route；失败时 UI 只显示 download-ready，不把 downloadable payload 误报为已写盘。

## 架构自检

- Stable node map review/apply 语义仍由 `Internal/Tooling` 与共享 CLI contract 提供；SelfHostedEditor 不重算 candidate evidence、conflict 语义或 apply preview。
- 新增写入口是桌面端窄命令 `stable-node-map.write-sidecar`，不暴露 generic `writeFile` / `invoke` / filesystem API。
- `ElectronWorkspaceSessionStore` 复用 `EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary` 与 existing write target whitelist，只允许 `node-map-sidecar`。
- 写入结果 text-free，不回显 node map JSON；preload payload 只允许 `relativePath`、`nodeMapText`、`workspaceId`。
- `workspace.write-back-backup` 仍是 sidecar 写前备份真相，响应也保持 text-free。

## Debug 自检

- dry-run：`Preview Apply` 仍调用 dry-run apply 并下载 preview sidecar；model test 断言 `lastDryRun === true`。
- 人工确认：点击 `Apply` 后只出现 `Confirm Apply`，不触发 real apply；确认后才调用 apply 与 write-back。
- 写入后备份：Electron workspace contract 先复制 `inscape.node-map.json` backup，再调用 sidecar write，并读磁盘确认 sidecar 文本已替换。
- 冲突/失败不误报成功：若 apply result 不声明 `writesNodeMap`，或 workspace write-back 不可用 / 失败，UI 显示 `Download ready ... workspace write-back failed/unavailable`，不显示 workspace applied。
- 路径边界：`stable-node-map.write-sidecar` 拒绝非 node-map sidecar 目标，例如 `.inscape` 文档。

## 验证

已通过：

- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-workspace`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-shell`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:payload-bridge`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:fake-embedded-transport`

备注：`check:structure` 仍会输出既有 `SelfHostedEditorLocalization.css` hard-coded color warning，命令 exit 0；本轮未触碰该文件。

## 剩余边界

- 本轮不做 batch / multi-apply；该决策留给 P2 Round 10。
- 本轮不做 Host Schema / Host Bridge / Unity-Bird 集成。
- VSCode 侧仍需在 Round 9 复核与 SelfHostedEditor 对 shared stable node map contract 的 parity。

## 下一轮

P2 Round 9：VSCode Parity 与共享边界。重点确认 VSCode 与 SelfHostedEditor 对 P2 语义消费一致，并且没有在宿主端重复实现 Tooling 语义。
