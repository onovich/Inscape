# SelfHostedEditor P4 Editor Host Contract Guard Audit

日期：2026-06-18

阶段：P4 Runtime playable MVP Round 11

## 本轮目标

Round 11 只收口 Editor host contract guard：确认 VSCode / SelfHostedEditor 不复制 Runtime 条件求值、query evaluator、action dispatcher、Log builder、substate import/export/validation 或 Runtime Inspector 产品化语义。

本轮不改 SelfHostedEditor Runtime bridge 行为，不新增 Runtime Inspector UI，不改变 Preview choice click 行为。

## 改动范围

- VSCode `check:structure` 新增 host product semantic marker 扫描，覆盖 `Scripts/` 与 `Resources/` 下的 JS / JSON / snippets。
- SelfHostedEditor `check:structure` 新增 host product semantic marker 扫描，覆盖 `Desktop/`、`Scripts/` 与 `Resources/` 下的 JS / CJS / HTML / JSON。
- 扫描对象只覆盖产品侧 host 代码与资源；`DevScripts/` 仍可保留 contract、smoke 与测试夹具，不作为产品 Runtime 语义来源。
- SelfHostedEditor `SelfHostedEditorRuntimeBridge` 保持薄桥接：只构建 backend workspace request、调用 runtime session client、透传 snapshot / error provider 状态。

## Guard 口径

新增 guard 禁止 host 产品代码出现以下类型的实现标记：

- 条件 / query 求值器实现角色。
- Runtime action dispatcher 实现角色。
- Runtime Log builder 实现角色。
- Runtime substate import / export / validation 实现角色。
- Runtime Inspector 产品化入口。

该口径保留合法的宿主作者提示和展示词汇，例如 Host Schema `queries[]` / `actions[]`、VSCode query interpolation provider、SelfHostedEditor backend command dispatcher、Runtime session transport 与 Preview snapshot rendering。

## 架构自检

- `Internal/Runtime` 仍是 Runtime 条件求值、query provider、action dispatcher、Log、substate 的语义来源。
- `ExternalSupport/VSCode` 仍只做 VSCode extension adapter、authoring hint、semantic parity consumption 与结构检查。
- `ExternalSupport/SelfHostedEditor` 仍只做 backend client / transport / bridge / preview rendering；Runtime project 执行继续通过 CLI / backend route / session bridge 进入 shared Runtime。
- Preview choice click invariant 继续由 `check:model` 覆盖，本轮没有改 Preview 点击或 Runtime bridge 行为。

## 已运行验证

- `dotnet build Inscape.slnx --no-restore` 通过，0 warning / 0 error。
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build` 通过。
- `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js` 通过。
- `node --check src\ExternalSupport\VSCode\DevScripts\VSCodeStructureContractCheck.js` 通过。
- `npm --prefix src\ExternalSupport\VSCode run check:structure` 通过。
- `node --check src\ExternalSupport\SelfHostedEditor\DevScripts\SelfHostedEditorStructureContractCheck.js` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure` 通过。
- `npm --prefix src\ExternalSupport\VSCode run check:semantic-parity` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http` 通过。
- ExternalSupport runtime semantic marker grep 无命中。
- `git diff --check` 通过。

## 后续

下一轮进入 P4 Round 12：P4 integration smoke + 文档收口，串起条件选项、条件跳转、query provider、action、pending / resume、Log、state/substate import-export 与 query receipt。
