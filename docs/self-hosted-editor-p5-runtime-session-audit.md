# SelfHostedEditor P5 Runtime Session Audit

日期：2026-06-18

状态：P5 Round 2 Runtime authoring session contract 已落地，本轮验证通过后提交推送。

## 本轮目标

P5 Round 2 只收口 Runtime authoring session 的状态表达，不新增 Runtime 语义、不改 Host Schema policy、不做可见 UI 面板。

本轮完成：

- 新增 `RuntimeAuthoringSessionModelBuilder`，给 SelfHostedEditor authoring workflow 一个稳定、text-free 的 Runtime session summary。
- 新增 `SelfHostedEditorRuntimeAuthoringSessionContractCheck.js` 并接入 `check:model`。
- 明确 current snapshot、formal Runtime State、P4 substate、pending action、action request summary、log summary、branch evidence、stale、error 与 transport command boundary 的分工。

## 模型边界

Runtime authoring session 使用格式：

```text
format: inscape.self-hosted-editor.runtime-authoring-session
formatVersion: 1
payloadContentExposed: false
```

模型只保存可显示、可诊断的摘要：

- `currentSnapshot`：provider、当前节点、path length、visible step count、pending flag、action/log/branch evidence count、last error code。
- `formalState`：`inscape.runtime-state` 的 position / flow / host checkpoint / script version 摘要。
- `substate`：`inscape.runtime-substate` 的 position / flow / pending / branch evidence count / validation status 摘要。
- `pendingAction`：当前 pending action 的 name、mode、requestId、handler、source line 与 status。
- `actionRequests`：request count、mode 列表、latest name / mode / request id。
- `logEntries`：entry count、latest sequence、latest source link 摘要。
- `branchEvidence`：entry count、query name 列表、source kind 列表、context 列表。
- `transport`：用 `runtime.start-or-observe` 与 `runtime.step` 表达 dev-host HTTP 和 desktop command 的等价 payload 边界。
- `stale` / `error`：只保存过期状态、原因标签、错误 code 与是否存在 message，不携带 message 正文。

模型明确不保存：

- workspace 文本。
- formal Runtime State body。
- P4 substate body。
- 完整 Log 文本。
- 完整 action request history 或 action payload。
- pending action host payload。
- branch receipt arguments / result body。
- Runtime snapshot debug body。

## Transport 等价边界

P5 Round 2 只把 transport 边界表达为后端命令：

```text
runtime.start-or-observe
runtime.step
```

dev-host HTTP route 与 desktop preload / IPC command 都仍通过既有 `EditorBackendTransportCommand` 族和 service registry 薄适配；Runtime authoring session model 不知道 `/api/*` route，也不直接调用 transport。

## Debug 自检

- 最小 fixture 可以解释本轮改动：一个 `runtime-project` snapshot，外加 formal state、P4 substate、pending action、log 与 branch evidence。
- 失败可定位到 payload / model contract 层：`check:model` 会直接指出 Runtime authoring session shape 或 text-free contract 失败。
- 成功、unavailable、stale、error 均有模型状态覆盖。
- 本轮不改 UI，不需要浏览器 smoke。

## 架构自检

- Runtime 语义仍在 `Internal/Runtime`；SelfHostedEditor 只消费 Runtime / CLI 返回的 payload。
- SelfHostedEditor 没有新增 condition evaluator、query evaluator、action dispatcher、Log builder、substate import/export/validation 语义。
- dev-host 与 desktop 仍是 transport adapter，不拥有 Runtime payload meaning。
- mock query、action surface、Runtime Preview hardening、Log / Backlog UI、branch explanation、substate authoring 都留给后续 P5 轮次。

## 契约检查

新增检查：

```text
src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts/SelfHostedEditorRuntimeAuthoringSessionContractCheck.js
```

该检查覆盖：

- Runtime authoring session format / version / text-free flag。
- current snapshot、formal state、substate、pending action、action request、log、branch evidence 和 transport command summary。
- secret workspace/runtime/log/action/substate/error payload 不会出现在 `JSON.stringify(session)` 中。
- unavailable + stale session 不会泄露 runtime error body。

## 验证结果

本轮已通过：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime
npm --prefix src\ExternalSupport\SelfHostedEditor run check:runtime-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
git diff --check
```

补充边界扫描通过：

```powershell
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```

结果：无产品代码命中。

## 下一轮

P5 Round 3 进入 Mock query model：

- 从 Host Schema `queries[]` 生成 mock query authoring model。
- 支持 string / number / bool mock value。
- 覆盖 missing / invalid / unknown query 的结构化提示。
- 保持 mock query 只作为 editor session test input，不进入正式 Runtime state。
