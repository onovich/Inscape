# SelfHostedEditor CSS architecture

状态：执行中

最后更新：2026-06-13

本文记录 `src/ExternalSupport/SelfHostedEditor/Resources/Styles` 的样式 ownership、当前行数基线和下一阶段拆分目标。目标不是改变视觉，而是让样式边界能被自动检查，避免功能迭代继续塞回大 CSS。

## 当前规则

- `SelfHostedEditorWorkbench.css` 只负责 import 顺序，不写选择器。
- `SelfHostedEditorBase.css` 持有全局 reset、设计 token 和基础变量。
- feature CSS 只消费 token，不新增全局 reset。
- layout CSS 不继续吸收 feature-specific 视觉规则。
- 当前两个 legacy owner 允许短期高于目标行数，但不得继续增长：`SelfHostedEditorWorkspaceLayout.css` 与 `SelfHostedEditorEditorAuthoring.css`。

## Inventory

| File | Lines | Owner | Current limit | Target |
|---|---:|---|---:|---:|
| `SelfHostedEditorBase.css` | 32 | base tokens and reset | 200 | 200 |
| `SelfHostedEditorDiagnosticsStatus.css` | 160 | diagnostics and status | 220 | 220 |
| `SelfHostedEditorEditorAuthoring.css` | 659 | editor surface legacy owner | 659 | 450 |
| `SelfHostedEditorHostCapability.css` | 113 | host capability | 200 | 220 |
| `SelfHostedEditorLoadingState.css` | 128 | loading state | 200 | 200 |
| `SelfHostedEditorLocalization.css` | 187 | localization | 260 | 400 |
| `SelfHostedEditorNodeMapReview.css` | 161 | node-map review | 220 | 220 |
| `SelfHostedEditorPreview.css` | 261 | preview | 400 | 400 |
| `SelfHostedEditorStoryGraph.css` | 328 | story graph | 400 | 400 |
| `SelfHostedEditorWorkbench.css` | 10 | style import composition | 20 | 20 |
| `SelfHostedEditorWorkspaceLayout.css` | 722 | workspace layout legacy owner | 722 | 450 |

## Next split order

1. Split workspace shell/sidebar/topbar/status ownership from `SelfHostedEditorWorkspaceLayout.css`.
2. Split editor frame, Monaco shell, hint rail, semantic decorations, and references overlay from `SelfHostedEditorEditorAuthoring.css`.
3. Tighten the legacy owner limits to the target limits after both files are below 450 lines.

## Validation

Run:

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:style-structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
```

`check:structure` includes the style structure contract, so future commits get the same guard through the standard Inscape commit script.
