# SelfHostedEditor P5 Substate Authoring Audit

日期：2026-06-19

状态：P5 Round 10 substate preview save/load complete

范围：SelfHostedEditor Runtime Substate authoring surface。本文只记录 Round 10 已落地的 Runtime substate 预览保存 / 载入工作流，不把 `inscape.runtime-substate` 扩展成完整宿主存档系统。

## 实现摘要

Round 10 已把 P4 Runtime substate 能力产品化为 SelfHostedEditor 的 authoring workflow：

- 新增 `RuntimeSubstateAuthoringModelBuilder`，从 Runtime snapshot / substate artifact / validation result 构建 bounded authoring model，显示 format、formatVersion、runtimeVersion、scriptVersion、current node、command index、flow stack depth、pending action 摘要、branch receipt count、host checkpoint presence 与 validation status。
- 新增 `RuntimeSubstatePanelController`，在 Host view 提供 Runtime Substate panel，支持 Export、Validate、Import 三个显式动作。
- Host view Runtime Substate panel 可导出当前 Runtime Preview substate JSON，允许粘贴 artifact 进行 validate，并且只在 validation status 为 `compatible` 时允许 import 恢复 Runtime Preview。
- dev-host backend command 已接入 `runtime.substate-*` 语义边界，对应 transport command 为 Runtime substate export / validate / import。
- HTTP dev-host routes 已接入 `/api/runtime-substate-export`、`/api/runtime-substate-validate`、`/api/runtime-substate-import`。
- CLI 语义仍由 Runtime / CLI 持有：export / validate / import 分别通过 `runtime-project --export-substate`、`runtime-project --validate-substate` 与 `runtime-project --substate` 执行。
- Desktop preload / IPC 白名单已接入 Runtime substate commands；embedded desktop backend 当前返回 explicit unavailable operation，不伪造真实 Runtime substate 执行能力。

## 边界自检

- `inscape.runtime-substate` 仍是 Runtime preview / 调试 artifact，不是完整 host save。
- Artifact 不保存宿主业务状态，例如背包、任务、好感度、战斗或服务器状态。
- Artifact 不保存完整 Log、完整 action history、Rollback stack 或 Trace Replay。
- `host.checkpointId` 仍是 opaque；SelfHostedEditor 只显示 checkpoint 是否存在，不解释宿主 checkpoint 内容。
- SelfHostedEditor 不复制 Runtime substate validator、condition evaluator、query evaluator 或 action dispatcher；验证和导入语义继续通过 Runtime / CLI 路径执行。
- `migratable` / `incompatible` / malformed JSON 不会静默导入；UI 只允许 `compatible` artifact 触发 import。

## 验证记录

Round 10 功能提交 `dc42cae feat: add self hosted runtime substate preview` 已通过：

- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-services`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:backend-transport`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:preload-transport`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-boundary`
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:electron-ipc`
- `dotnet build Inscape.slnx --no-restore`
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build`
- `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js`
- `npm --prefix src\ExternalSupport\VSCode run check:structure`

本次文档收口补跑：

- `git -c safe.directory=D:/LabProjects/Inscape status --short --branch`
- `rg` 检查 handoff / TODO / 本审计文档中的 Round 10、Round 11 与 audit link 状态标记，确认旧的 Round 10 下一轮待办标记不再出现。
- `git diff --check`

## 后续

下一轮进入 P5 Round 11 Error / empty / stale state hardening。Round 11 不应混入 Unity / Bird / Host SDK、Rollback / Trace Replay / Flashback 或完整 host save。
