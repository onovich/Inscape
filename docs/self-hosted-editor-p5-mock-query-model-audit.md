# SelfHostedEditor P5 Mock Query Model Audit

日期：2026-06-18

状态：P5 Round 3 Mock query model 已落地，完整验证通过，准备提交推送。

## 本轮目标

P5 Round 3 只收口 mock query authoring model，不新增可见 UI，不修改 Host Schema 语义，不把 mock value 写入正式 Runtime State。

本轮完成：

- 新增 `RuntimeMockQueryModelBuilder`，从 SelfHostedEditor 已映射的 Host Schema catalog 生成 editor-session-only mock query authoring model。
- 新增 `SelfHostedEditorRuntimeMockQueryContractCheck.js` 并接入 `check:model`。
- 修正 `HostSchemaCapabilityModelMapper.mapQueries()`：保留参数化 Host Schema queries，并用 `isSimpleTextInterpolationQuery` 标记旧插值提示类别。
- 明确 mock query authoring model 可以投影为 Runtime CLI / backend command 可消费的 `kind: "Mock"` provider，但该 provider 仍是 authoring / preview / CI 测试输入。

## 模型边界

Mock query authoring 使用格式：

```text
format: inscape.self-hosted-editor.runtime-mock-query-authoring
formatVersion: 1
authoringOnly: true
payloadContentExposed: false
contentPolicy.writesToRuntimeState: false
```

模型输入：

- `hostSchemaCatalog.queries[]`：来自 Tooling / LanguageServer 的 shared Host Schema capability payload。
- `mockEntries[]`：当前编辑器 session 的测试输入草稿。

模型输出：

- `rows[]`：按 Host Schema query 生成的 authoring row，包含 query name、return type、参数、source location、当前 mock 状态和结构化 diagnostics。
- `unknownQueries[]`：mock entry 中存在但 Host Schema 未声明的 query。
- `runtimeQueryProvider`：只从 ready rows 投影出的 Runtime mock provider。
- 计数摘要：ready / missing / invalid / unsupported / unknown。

## 支持类型

第一刀只支持：

- `string` / `text` -> Runtime `String`
- `number` / `int` / `integer` / `float` / `double` / `decimal` -> Runtime `Number`
- `bool` / `boolean` -> Runtime `Bool`

复杂返回类型进入 `unsupported-type`，不生成 Runtime provider value。参数也只做 string / number / bool 的 authoring-level 解析。

## 状态与诊断

本轮覆盖的状态：

- `ready`：query 已声明，参数和值都可转成 Runtime query value。
- `missing-value`：query 已声明，但缺参数或缺返回值。
- `invalid-value`：query 已声明，但参数或返回值无法按类型解析，例如 bool 输入 `maybe`。
- `unsupported-type`：Host Schema return type 超出第一刀支持范围。
- `unknown-query`：mock entry 名称未出现在 Host Schema `queries[]`。

对应 diagnostics：

- `mock-query-missing-value`
- `mock-query-invalid-value`
- `mock-query-unsupported-type`
- `mock-query-unknown`

## Runtime Provider 投影

Ready rows 会投影为：

```json
{
  "kind": "Mock",
  "mockValues": [
    {
      "name": "has_item",
      "arguments": [
        { "kind": "String", "stringValue": "silver_key" }
      ],
      "value": { "kind": "Bool", "boolValue": false }
    }
  ]
}
```

该 payload 对齐 P4 `runtime-project --query-provider` 的既有 Runtime mock provider shape。SelfHostedEditor 不解释 query condition，也不查询宿主；它只把作者当前 session 的测试输入交给 Runtime。

## 架构自检

- Host Schema query 列表仍来自 Tooling / LanguageServer shared capability，不由 SelfHostedEditor 扫描脚本或重新定义 schema。
- Mock query value 仍是 authoring / preview / CI 输入，不写入 formal Runtime State，也不写入 `inscape.runtime-substate`。
- SelfHostedEditor 没有新增 condition evaluator、query evaluator、action dispatcher 或 branch receipt 语义。
- 本轮未改 Compiler / Runtime / Host Schema policy / Unity / Bird。
- Round 4 再做 UI 和 apply-to-preview；本轮只提供模型和 contract。

## Debug 自检

- 最小 fixture 可用 `has_item("silver_key")`、`trust("mira")`、`player.name` 和 `debug_mode` 解释。
- 失败可定位到 Host Schema mapper、mock row parsing 或 Runtime provider projection。
- `known query`、`unknown query`、`type mismatch`、`missing value` 和 unsupported complex type 都有 contract 覆盖。
- 本轮不改可见 UI，不需要 browser smoke。

## 契约检查

新增检查：

```text
src/ExternalSupport/SelfHostedEditor/DevScripts/ModelContracts/SelfHostedEditorRuntimeMockQueryContractCheck.js
```

该检查覆盖：

- Host Schema mapper 保留参数化 runtime queries。
- Mock authoring format / authoring-only / runtime-state write policy。
- string / number / bool ready rows。
- missing / invalid / unknown / unsupported return / parameter type states。
- Runtime provider 只包含 ready rows。
- Host Schema error text、host payload、unknown entry payload 与 unsupported complex value 不会泄露进 authoring model。

## 验证结果

2026-06-18 本轮验证通过：

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
npm --prefix src\ExternalSupport\SelfHostedEditor run check:workbench-integration-http
npm --prefix src\ExternalSupport\SelfHostedEditor run check:session-cache-http
git diff --check
```

产品边界 marker 扫描通过：`src\ExternalSupport\SelfHostedEditor\Scripts` 与 `src\ExternalSupport\VSCode` 未出现 `ConditionEvaluator`、`ActionDispatcher`、`QueryReceipt`、`RuntimeInspector`、`rollbackPolicy`、`replayPolicy`、`failurePolicy` 或 `timeoutPolicy`。

## 下一轮

P5 Round 4 进入 Mock query UI：

- 在 SelfHostedEditor 增加 mock query 编辑表面。
- 支持按 Host Schema 显示 query、类型、当前 mock 值、错误状态。
- 支持 reset / apply to runtime preview。
- Runtime Preview 使用这些 mock 值重新启动或推进测试会话。
