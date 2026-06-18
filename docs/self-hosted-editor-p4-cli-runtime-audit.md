# SelfHostedEditor P4 CLI Runtime Audit

日期：2026-06-18

状态：P4 Round 10 CLI Runtime playable driver 第一刀完成，不代表 P4 MVP 已完成

## 本轮范围

本轮按 [P4 Runtime Playable MVP Goal 模式执行指南](self-hosted-editor-p4-goal-mode-execution-guide.md) 第 10 轮推进 `runtime-project`。目标是让 CLI 可以用 JSON 输入驱动 P4 Runtime MVP 的关键闭环：query provider、action dispatcher、action result / resume、P4 substate import / export，以及 snapshot 中的 log output。

本轮不做 SelfHostedEditor Runtime Inspector UI、不做 VSCode Runtime-backed preview 重做、不做完整宿主存档产品，也不把 host delegate callback 伪装成 CLI JSON。

## CLI 新增入口

`runtime-project` 保留既有参数兼容，并新增：

- `--query-provider provider.json`：读取 `NarrativeRuntimeQueryProviderModel`，支持 `Mock` / `Recorded` value table；`Delegate` callback 仍属于正式宿主集成，不通过 CLI JSON 表达。
- `--action-dispatcher dispatcher.json`：读取 `NarrativeRuntimeActionDispatcherModel`，注入 action capability 与 handler binding。
- `--action-result result.json`：读取 `NarrativeRuntimeActionResultModel`，用于 CLI smoke 模拟宿主 action 返回成功或失败。
- `--resume-action resume.json`：读取 `NarrativeRuntimeActionResumeModel`，恢复 `wait` / `handoff` pending action。
- `--substate runtime-substate.json`：导入 P4 `inscape.runtime-substate`。
- `--export-substate`：导出 P4 `inscape.runtime-substate`。
- `--validate-substate runtime-substate.json`：验证 P4 substate，继续只报告，不静默修复。

既有 `--state`、`--export-state`、`--validate-state` 仍保持 P3 formal state / snapshot 兼容。若把 P4 substate 误传给旧 `--state` 或 `--validate-state`，CLI 会拒绝并提示使用 `--substate` / `--validate-substate`，避免 pending action 与 branch receipt 被静默降级丢失。

## JSON 输入边界

Query provider 示例：

```json
{
  "kind": "Mock",
  "mockValues": [
    {
      "name": "trust",
      "arguments": [
        { "kind": "String", "stringValue": "mira" }
      ],
      "value": { "kind": "Number", "numberValue": 4 }
    }
  ]
}
```

Action dispatcher 示例：

```json
{
  "actions": [
    { "name": "wait_for_ui", "mode": "wait" }
  ],
  "handlers": [
    { "name": "wait_for_ui", "handlerName": "Ui.WaitForUi" }
  ]
}
```

Resume 示例：

```json
{
  "requestId": "action-1",
  "status": "completed",
  "hostPayload": "{\"confirmed\":true}"
}
```

## Debug 自检

- CLI happy path 测试通过真实 `runtime-project` 命令串起 P4 fixture：mock query 过滤选项、`fire` action、`wait` pending、substate export / validate / import、resume、log output、internal fact + query 条件跳转。
- CLI query error 测试确认缺失 query 以非零退出码返回，并在 stderr 暴露 `IRF005`、`IRC003`、branch path 和 query name。
- CLI action-result error 测试确认宿主 action result 失败以非零退出码返回，并在 stderr 暴露 host error code、action path 与 host error message。
- 旧 `runtime-project --state` / `--export-state` / `--validate-state` 测试保持通过。

## 架构自检

- CLI 只负责 argv、JSON 文件读写、stdout / stderr 和调用 `NarrativeRuntime`；没有在 CLI 里重写 condition evaluator、query provider、action dispatcher 或 substate 语义。
- Query provider、action dispatcher、action result、resume 与 substate 均复用 `Internal/Runtime` 既有模型。
- `Delegate` query callback 仍留给正式宿主集成，CLI JSON 只支持 mock / recorded value table。
- ExternalSupport 未新增 Runtime 语义副本。
- 本轮未新增 rollback / replay / failure / timeout policy 字段，也未引入 Unity / Bird / Addressables / ScriptableObject 到 `Internal`。

## 验证

本轮应运行并通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
git -c safe.directory=D:/LabProjects/Inscape diff --check
```

同时应执行边界扫描，确认 `ExternalSupport` 未复制 Runtime 语义，`Internal` 未引入 Unity / Bird / Addressables / ScriptableObject，且未新增 rollback / replay / failure / timeout policy 字段。

## 下一轮

进入 P4 Round 11：Editor host contract guard，不做产品化 UI。重点是确认 VSCode / SelfHostedEditor 没有复制 Runtime 条件求值、query evaluator、action dispatcher 或 substate 语义；如需调整 SelfHostedEditor Runtime bridge，也只做 shared payload 适配和 smoke。
