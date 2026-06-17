# SelfHostedEditor P2 Workbench Integration Smoke Audit

日期：2026-06-17
状态：P2 Round 12 审计完成

## 目标

本轮收口 SelfHostedEditor workbench 集成 smoke：

- 在同一个 dev-host HTTP server 中串起 localization review / update、line-map refresh、stable node map review / apply。
- 覆盖工作台会消费的 success、empty、error 与 session status payload。
- 继续确认共享语义留在 `Internal/Tooling`，SelfHostedEditor 只做 bridge、payload compact 与 UI 状态展示。

## 结论

新增 `check:workbench-integration-http`，它通过真实本地 HTTP 请求验证一条跨能力工作流：

- localization review 可 seeded previous CSV baseline，并在同一 `sessionId` 下复用。
- localization empty review 返回 hosted empty presenter，而不是 draft fallback 或错误。
- localization update 缺少 previous CSV / session baseline 时返回显式错误。
- localization update 成功路径复用 session baseline，返回 updated CSV 与 `safety` metadata，并确认 dev-host 不写 workspace 文件。
- line-map refresh 连续两次复用同一 session，保留既有 line id 并报告新增行。
- stable node map review 产出 manual-review candidate；dry-run apply 写 preview path，不要求 backup；real apply 写 sidecar path，并返回 backup metadata 与 recovery hint。
- `/api/session-cache-status` 能看到 line-map 与 localization baseline session，但不暴露 script text 或 CSV translation 内容。

## 架构边界

- 新增 smoke 只调用现有 HTTP route，不新增产品 API 或 shared semantics。
- stable node map apply、localization update、line-map refresh 的语义仍分别来自 shared CLI / Tooling。
- empty / error / success 检查只验证 workbench 可用 payload，不把 UI 状态机搬进 DevScripts。
- Host Schema / Host Bridge / Unity-Bird 和 P3 Runtime / syntax 仍未进入 P2。

## 回归入口

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
```

该命令应和 Round 12 建议的单项 HTTP smoke 一起作为 P2 workbench integration gate。

## 下一轮入口

进入 P2 Round 13：文档与 ADR 收口。重点清理 P2 状态口径、验证入口和后续 Host Schema / Host Bridge / Unity-Bird 的开启条件。
