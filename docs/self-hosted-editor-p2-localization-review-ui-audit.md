# SelfHostedEditor P2 Localization Review UI Audit

日期：2026-06-17

结论：PASS。P2 Round 5 已把 localization review display 从 tooltip-only 推进到可扫读的行内审计信息：review row 现在显示 current line identity，candidate action 显示 shared similarity / rank penalty / reason / candidate line identity，conflict / risk 状态通过 shared signals 呈现。

## 范围

- 本轮只产品化 SelfHostedEditor localization review display。
- 不改变 `Internal/Tooling` 的 localization scoring、candidate ranking、diff 生成或 CSV update 语义。
- 不进入 batch apply、stable node map apply UI 或后续 Host Bridge / P3 工作。

## UI 收口

- `LocalizationTableRenderer` 在 review cell 中新增 compact audit chips。
- item 级 chips 显示 shared `review-status`、`candidate-count` 与 current line identity。
- candidate 级 chips 显示需要审计的 shared `similarity`、`rank-penalty`、`reason` 与 candidate line identity。
- clear match 场景保留紧凑显示，只展示必要 identity warning；similar / ambiguous 场景显示 Match / Rank / Reason / Candidate identity。
- Diff 仍通过 shared presenter `show-candidate-diff.detail` 展开；浏览器不重建 diff。

## Bridge 修复

- 真实 in-app browser 检查发现 dev-host HTTP transport 在浏览器里调用未绑定的 `fetch` 会触发 `Illegal invocation`，导致 hosted review fallback。
- `SelfHostedEditorHttpBackendTransport` 现在用 `fetchImpl.call(globalThis, ...)` 保留浏览器原生 fetch 绑定。
- `check:backend-transport` 已新增回归覆盖该绑定。

## Debug 自检

- clear match：真实 `samples/court-loop.inscape` hosted review 在浏览器中显示 170 rows / 170 rows with audit chips。
- similar candidate：model contract fixture 验证 `Match 0.950`、`Rank 2`、`Reason same-stable-node` 与 `Candidate missing` 可见。
- ambiguous candidate：model contract fixture 验证 `Review conflict/choose-candidate`、`Candidates 2`、`Rank 4`、`Reason ambiguous-local-context` 与 `Candidate drift` 可见。
- 真实浏览器 DOM 检查确认首行显示 `Current missing` / `Candidate missing`，`Current` / `Candidate 1` / `Diff 1` 按钮可见，点击 `Diff 1` 展开 shared diff detail。
- 真实浏览器 DOM 检查未发现 audit chip 或 review action button 发生水平文字溢出。
- 当前 in-app browser 截图能力两次 `Page.captureScreenshot` 超时；本轮使用 DOM / bounding-box 检查作为视觉自检证据。

## 架构自检

- `Internal/Tooling` 仍是 review presenter / signals / diff 语义真源。
- SelfHostedEditor 只做 DOM display、chip label mapping、source jump 与 HTTP transport glue。
- Browser UI 未计算 similarity、rank penalty、reason、line identity 或 candidate order。
- VSCode 共享 contract 未改变，本轮只验证 parity 未回退。
- localization CSV 与 host config CSV 仍保持独立 UI model。

## 验证

已通过：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review
npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

`check:structure` 仍输出既有 `SelfHostedEditorLocalization.css` hard-coded color warning，但退出码为 0；`git diff --check` 退出码为 0，仅输出 CRLF 提示。

## 下一轮

P2 Round 6：Stable Node Map 当前链路审计。重点审计 review/apply 的 dry-run、apply、冲突报告、备份/恢复路径，并列出现有缺口。
