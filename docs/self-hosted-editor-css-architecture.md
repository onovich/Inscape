# SelfHostedEditor CSS architecture

状态：执行中

最后更新：2026-06-13

本文记录 `src/ExternalSupport/SelfHostedEditor/Resources/Styles` 的样式 ownership、当前行数基线和下一阶段拆分目标。目标不是改变视觉，而是让样式边界能被自动检查，避免功能迭代继续塞回大 CSS。

## 当前规则

- `SelfHostedEditorWorkbench.css` 只负责 import 顺序，不写选择器。
- `SelfHostedEditorBase.css` 持有全局 reset、设计 token 和基础变量。
- feature CSS 只消费 token，不新增全局 reset。
- layout CSS 不继续吸收 feature-specific 视觉规则。
- 当前所有主要 CSS owner 均已低于 450 行；后续新增视图必须先选择明确 feature owner，再更新本文件和 `check:style-structure`。

## Inventory

| File | Lines | Owner | Current limit | Target |
|---|---:|---|---:|---:|
| `SelfHostedEditorBase.css` | 36 | base tokens and reset | 200 | 200 |
| `SelfHostedEditorAuthoringDecorations.css` | 53 | editor semantic decorations | 80 | 120 |
| `SelfHostedEditorDiagnosticsStatus.css` | 187 | diagnostics and status | 220 | 220 |
| `SelfHostedEditorEditorAuthoring.css` | 229 | editor frame and Monaco shell | 240 | 260 |
| `SelfHostedEditorHostCapability.css` | 135 | host capability | 200 | 220 |
| `SelfHostedEditorLineHintRail.css` | 257 | editor line hint rail | 280 | 320 |
| `SelfHostedEditorLoadingState.css` | 143 | loading state | 200 | 200 |
| `SelfHostedEditorLocalization.css` | 219 | localization | 260 | 400 |
| `SelfHostedEditorNodeMapReview.css` | 185 | node-map review | 220 | 220 |
| `SelfHostedEditorPreview.css` | 303 | preview | 400 | 400 |
| `SelfHostedEditorReferenceOverlay.css` | 120 | editor references overlay | 140 | 160 |
| `SelfHostedEditorSidebar.css` | 366 | workspace sidebar | 380 | 380 |
| `SelfHostedEditorStoryGraph.css` | 375 | story graph | 400 | 400 |
| `SelfHostedEditorTopbar.css` | 127 | workspace top bar | 150 | 150 |
| `SelfHostedEditorWorkbench.css` | 16 | style import composition | 20 | 20 |
| `SelfHostedEditorWorkspaceLayout.css` | 233 | workspace shell layout | 260 | 450 |

## Next split order

1. Keep `SelfHostedEditorEditorAuthoring.css` limited to editor frame, rename dialog, Monaco hover, and suggest widget shell rules.
2. Continue token cleanup opportunistically when feature files change, without mixing visual refactors into backend or fallback behavior changes.

## Validation

Run:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

`check:structure` includes the style structure contract, so future commits get the same guard through the standard Inscape commit script.
