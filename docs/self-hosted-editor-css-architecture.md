# SelfHostedEditor CSS architecture

状态：执行中

最后更新：2026-06-13

本文记录 `src/ExternalSupport/SelfHostedEditor/Resources/Styles` 的样式 ownership、当前行数基线和下一阶段拆分目标。目标不是改变视觉，而是让样式边界能被自动检查，避免功能迭代继续塞回大 CSS。

## 当前规则

- `SelfHostedEditorWorkbench.css` 只负责 import 顺序，不写选择器。
- `SelfHostedEditorBase.css` 持有全局 reset、设计 token 和基础变量。
- feature CSS 只消费 token，不新增全局 reset。
- layout CSS 不继续吸收 feature-specific 视觉规则。
- 当前唯一 legacy owner 允许短期高于目标行数，但不得继续增长：`SelfHostedEditorEditorAuthoring.css`。

## Inventory

| File | Lines | Owner | Current limit | Target |
|---|---:|---|---:|---:|
| `SelfHostedEditorBase.css` | 36 | base tokens and reset | 200 | 200 |
| `SelfHostedEditorDiagnosticsStatus.css` | 187 | diagnostics and status | 220 | 220 |
| `SelfHostedEditorEditorAuthoring.css` | 659 | editor surface legacy owner | 659 | 450 |
| `SelfHostedEditorHostCapability.css` | 135 | host capability | 200 | 220 |
| `SelfHostedEditorLoadingState.css` | 143 | loading state | 200 | 200 |
| `SelfHostedEditorLocalization.css` | 219 | localization | 260 | 400 |
| `SelfHostedEditorNodeMapReview.css` | 185 | node-map review | 220 | 220 |
| `SelfHostedEditorPreview.css` | 303 | preview | 400 | 400 |
| `SelfHostedEditorSidebar.css` | 366 | workspace sidebar | 380 | 380 |
| `SelfHostedEditorStoryGraph.css` | 375 | story graph | 400 | 400 |
| `SelfHostedEditorTopbar.css` | 127 | workspace top bar | 150 | 150 |
| `SelfHostedEditorWorkbench.css` | 13 | style import composition | 20 | 20 |
| `SelfHostedEditorWorkspaceLayout.css` | 233 | workspace shell layout | 260 | 450 |

## Next split order

1. Split editor frame, Monaco shell, hint rail, semantic decorations, and references overlay from `SelfHostedEditorEditorAuthoring.css`.
2. Tighten the remaining legacy owner limit after the file is below 450 lines.

## Validation

Run:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

`check:structure` includes the style structure contract, so future commits get the same guard through the standard Inscape commit script.
