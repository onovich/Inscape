# SelfHostedEditor P2 Final Validation Report

状态：P2 PASS

日期：2026-06-17

```text
P2 stable identity / localization review: PASS
Post-P2 host integration work allowed: YES
```

## 完成范围

- Localization review 已能展示 shared candidate score、rank reason、candidate diff、current/candidate line identity 与 risk 状态；SelfHostedEditor 和 VSCode 都只消费 Tooling presenter / signals。
- 相似文本只作为人工 review candidate，不静默复用旧译文；Internal tests 覆盖 changed/conflict、低置信、line identity、context / neighbor / local context ranking 等场景。
- Line identity 迁移契约覆盖 line id、fingerprint、局部上下文、rank penalty、diff detail，并由 direct / HTTP line-map smoke 守住 session sidecar 继承。
- Stable node map review/apply 已完成人工确认、冲突报告、dry-run/apply、backup metadata 与 recovery hint；Electron desktop 写回路径必须先 `Confirm Apply`，再 backup，最后写 sidecar。
- P2 不实现 batch review / multi-apply；后续若重启，必须先设计共享 Tooling / CLI batch dry-run、batch result、per-item failure 与 rollback contract。
- Localization CSV 与 host config CSV 保持界面模型分离；`update-l10n` / `update-l10n-project --from` 会拒绝缺少 `anchor` 与 `translation` header 的 CSV。
- SelfHostedEditor 与 VSCode 没有复制 Internal / Tooling scoring、migration、CSV update 或 node-map apply 语义。
- 后续 Host Schema / Host Bridge / Unity-Bird 与 P3 未提前实现；P2 只给出是否允许开启后续 host integration 的验收结论。

## 验证结果

- `dotnet build Inscape.slnx --no-restore`：PASS，0 warnings / 0 errors。
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`：PASS。
- `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`：PASS。
- `npm --prefix src\ExternalSupport\VSCode run check:structure`：PASS。
- `npm --prefix src\ExternalSupport\VSCode run check:semantic-parity`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`：PASS，189 files。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure`：PASS；保留既有 `SelfHostedEditorLocalization.css` hard-coded color warning，退出码为 0，非 P2 阻塞。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review`：PASS，170 items / 231521 bytes。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-review-http`：PASS，170 items / 231521 bytes。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:localization-update-http`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:line-map-http`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:node-map-http`：PASS.
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http`：PASS。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http`：PASS。
- `git -c safe.directory=D:/LabProjects/Inscape diff --check`：PASS。

## Remaining Risks

- Batch review / multi-apply remains a post-P2 product question and must not be implemented by looping single-candidate apply in host code.
- P2.5 Host Schema / Host Bridge / Unity-Bird work is now allowed, but must keep Host Schema, Host Bridge, Bird L10N, and Inscape localization CSV as separate contracts.
- The SelfHostedEditor structure check still reports an existing CSS token migration warning in `SelfHostedEditorLocalization.css`; it is not a P2 semantics or validation blocker.

## Next Candidate Phase

Host Schema / Host Bridge / Unity-Bird adaptation can start as P2.5. The first P2.5 task should re-read the Host Schema / Host Bridge contracts, keep Unity/Bird work under `ExternalSupport`, and avoid moving host-specific IDs, asset coordinates, or Unity dependencies into `Internal`.
