# SelfHostedEditor P2 Localization Update Safety Audit

日期：2026-06-17
状态：P2 Round 11 审计完成

## 目标

本轮收口 localization CSV update 的安全边界：

- updated localization CSV 只能经共享 Tooling / CLI contract 生成。
- SelfHostedEditor dev-host 只能作为 transport adapter，不声称写入 workspace 文件。
- localization CSV 与 host config CSV 继续保持 UI model 和输入契约分离。

## 结论

- `Internal/Tooling` 的 previous localization CSV 读取入口现在先验证首个非空 CSV header 必须包含 `anchor` 与 `translation`。误把 Host Schema / Host Config CSV 传给 `update-l10n-project --from` 时，会在共享入口失败，不会生成“全新本地化 CSV”掩盖错误。
- SelfHostedEditor `/api/localization-update` 仍调用共享 `update-l10n-project` 并应用 anchor-based translation overrides；浏览器和 dev-host 不重建 merge / candidate / CSV 语义。
- dev-host updated CSV payload 新增 `safety` 摘要，明确 `generatedBy: "update-l10n-project"`、`writesWorkspaceFile: false`、backup 状态为 `not-written-by-dev-host`，并给出 host-owned export / linked-file replacement 的恢复提示。
- `SelfHostedEditorLocalizationReviewBridge` 只把上述 `safety` 摘要透传给前端；真实 linked-file replace 仍由浏览器 native file handle / Electron desktop write-back 边界负责。

## 回归护栏

- `check:localization-update` 覆盖 direct helper：真实 previous CSV + translation override 可以生成 updated CSV；session baseline 可以复用；host config CSV 会被共享 guard 拒绝。
- `check:localization-update-http` 覆盖真实 HTTP：`/api/localization-review` seeded baseline 后，`/api/localization-update` 可复用 session baseline，同时对 host config CSV 返回共享错误。
- `check:payload-bridge` 覆盖 compact update payload 的 format、baseline、safety、backup、byte length 与 override count。
- `check:semantic-parity` 覆盖 VSCode / SelfHostedEditor 边界：VSCode localization update 只能走 shared CLI，不混入 SelfHostedEditor file-handle / draft CSV builder；SelfHostedEditor bridge 只能通过 backend workflow service 调 update command，不硬编码 dev-host route。
- Internal CLI test 覆盖 `update-l10n-project --from host-config.csv` 必须失败且不向 stdout 输出 CSV。

## 架构边界

- 共享 guard 位于 `Internal/Tooling`，因此 VSCode、SelfHostedEditor direct helper、HTTP dev-host 和未来 desktop backend 都复用同一失败语义。
- Host Config CSV 仍属于 Host Schema / Host Binding 能力输入；Localization CSV 仍属于 `anchor,node,kind,speaker,text,translation,status,sourcePath,line,column` 的本地化更新输入。
- dev-host safety metadata 是传输摘要，不是新的 localization truth。真实 CSV merge、override application、alignment review 和 candidate scoring 继续属于 `Internal/Tooling` / CLI。

## 下一轮入口

进入 P2 Round 12：工作台集成 Smoke。重点串起 localization review/update、line map、node map review/apply 的真实工作流，修正 UI loading / error / empty / success report 的断点。
