# SelfHostedEditor P4 Integration Audit

日期：2026-06-18

阶段：P4 Runtime playable MVP Round 12

## 本轮目标

Round 12 收口 P4 integration smoke：用最小可玩剧情串起条件选项、条件跳转、mock query、`fire` action、`wait` pending / resume、Log、formal Runtime State export / import、P4 substate save / load、branch query receipt，并通过 CLI JSON 证明条件和 action 行为。

本轮仍不进入 SelfHostedEditor Runtime Inspector 产品化 UI，不做完整独立游戏存档产品，不做 Rollback / Trace Replay / Flashback / Unity Host SDK。

## 新增验证

新增 Internal smoke：

- `tests/Internal/Inscape.Tests/P4/TestP4IntegrationSmoke.cs`
- runner 名称：`p4 integration smoke runs playable mvp sample`

该 smoke 使用真实 `runtime-project` CLI 和临时 workspace，覆盖两条可玩路径：

1. `has_item("silver_key") = true`：
   - 起点条件选项只保留钥匙路径。
   - 选择钥匙进入 `gate.open`。
   - `@emit play_timeline mira_reveal` 通过 `fire` action dispatch，Runtime 不进入 pending。
   - `advance-flow` 记录 `Door opens.` Log。
   - `continue` 到达 `end`。

2. `has_item("silver_key") = false` 且 `trust("mira") = 4`：
   - 起点过滤隐藏钥匙选项，只显示 `Knock`。
   - 选择 Knock 进入 `gate.knock`。
   - `@emit wait_for_ui confirm_help` 进入 `wait` pending。
   - 导出 P4 `inscape.runtime-substate`，其中保存 position、pending action、branch query receipts 和 opaque host checkpoint id，但不保存完整 Log 或 action request history。
   - `--validate-substate` 返回 compatible。
   - `--substate + --resume-action` 恢复 pending 并继续，不重复 dispatch 已完成 action。
   - `advance-flow` 记录 `Knocked.` Log。
   - 再次导出 / 导入 substate 后 `continue`，通过 internal fact `visited("gate.knock")` 与 mock query `trust("mira") >= 3` 命中第一条 conditional jump，到达 `mira.help`。
   - `advance-flow` 记录 `Mira helps.` Log，随后 `continue` 到达 `end`。

同时 smoke 单独覆盖 formal Runtime State：

- `--export-state --script-version script-v1 --host-checkpoint-id checkpoint-formal` 输出 `inscape.runtime-state`。
- formal state 不包含完整 Log 或 branch query receipts。
- `--validate-state` 返回 compatible。
- `--state formal-state.json --advance-flow` 可从 formal state 恢复并继续。

## CLI Smoke 示例

Round 12 smoke 的可复现命令形态如下，测试会在临时目录中自动写入对应 `.inscape`、query provider、action dispatcher 与 resume JSON：

```powershell
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
```

底层 CLI 链路等价于：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --query-provider runtime-no-key-query-provider.json --export-state --script-version script-v1 --host-checkpoint-id checkpoint-formal
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --validate-state runtime-formal-state.json --script-version script-v1
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --state runtime-formal-state.json --query-provider runtime-no-key-query-provider.json --advance-flow
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --query-provider runtime-key-query-provider.json --action-dispatcher runtime-action-dispatcher.json --choose 0 0
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --state runtime-key-snapshot.json --action-dispatcher runtime-action-dispatcher.json --advance-flow
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --state runtime-key-line-snapshot.json --action-dispatcher runtime-action-dispatcher.json --continue
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --state runtime-initial-snapshot.json --query-provider runtime-no-key-query-provider.json --action-dispatcher runtime-action-dispatcher.json --choose 0 0 --export-substate --script-version script-v1 --host-checkpoint-id checkpoint-pending
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --validate-substate runtime-pending-substate.json --script-version script-v1
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --substate runtime-pending-substate.json --action-dispatcher runtime-action-dispatcher.json --resume-action runtime-resume.json --export-substate --script-version script-v1
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --substate runtime-resumed-substate.json --action-dispatcher runtime-action-dispatcher.json --advance-flow
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- runtime-project <fixture-root> --substate runtime-advanced-substate.json --query-provider runtime-no-key-query-provider.json --continue
```

## 验收映射

- 条件选项：smoke 断言钥匙选项在 `has_item = false` 时被隐藏，`has_item = true` 时可选。
- 条件跳转：smoke 断言恢复后 `visited("gate.knock") and trust("mira") >= 3` 命中 `mira.help`。
- `first true wins`：Runtime 已由 `NarrativeRuntimeFollowsFirstTrueConditionalJump` 覆盖；Round 12 smoke 使用第一条 true conditional jump 到 `mira.help`。
- fallback：Runtime 已由 `NarrativeRuntimeFollowsConditionalFallback` 覆盖；P4 CLI driver smoke 继续覆盖 `gate.locked` fallback path。
- delegate query：正式主路径仍由 `NarrativeRuntimeQueryProviderUsesDelegateMockAndRecordedSources` 覆盖；CLI smoke 使用 mock provider，因为 JSON CLI 不表达 delegate callback。
- mock query：Round 12 smoke 通过 mock provider 驱动 `has_item` 与 `trust`。
- recorded query：`NarrativeRuntimeConditionEvaluatorUsesRecordedProviderValues` 继续覆盖 recorded provider。
- `fire` action：Round 12 smoke 断言 `play_timeline` 生成 fire request 且不进入 pending。
- `wait` pending / resume：Round 12 smoke 断言 `wait_for_ui` pending、substate 保存 pending、resume 后 pending 清空。
- `handoff` pending / resume：`NarrativeRuntimeHandsOffAndResumes` 和 `NarrativeRuntimeReportsHandoffResumeErrors` 覆盖共享 handoff 控制权模型；Round 12 smoke 选择 wait 作为 MVP 异步路径。
- Log：Round 12 smoke 断言 `Door opens.`、`Knocked.`、`Mira helps.` 只在 `advance-flow` 后进入 snapshot `logEntries`。
- formal Runtime State：Round 12 smoke 断言 `--export-state` / `--validate-state` / `--state` 可恢复继续，且 formal state 不包含完整 Log 或 branch receipts。
- P4 substate：Round 12 smoke 断言 `--export-substate` / `--validate-substate` / `--substate` 可从 pending 后继续，且 substate 不包含完整 Log 或 action request history。
- query receipt：Round 12 smoke 断言 choice condition receipt、internal fact receipt `visited` 和 host query receipt `trust`。
- 从起点到终点：Round 12 smoke 断言 key/fire path 和 wait/resume/help path 都能到达 `end`。

## 架构自检

- Compiler 仍只负责语法、IR 和 diagnostics，不读取 Host Schema / Host Bridge，也不执行 query / action。
- Runtime condition evaluator、query provider、query receipt、action dispatcher、Log、substate save / load 仍位于 `src/Internal/Runtime`。
- CLI `runtime-project` 只做 JSON 输入 / 输出、文件读取和 Runtime 调用，不拥有第二套 Runtime 语义。
- VSCode / SelfHostedEditor 未改动产品 UI 或 Runtime bridge；Round 11 的 host semantic guard 仍守住 ExternalSupport 不复制 Runtime 语义。
- Formal Runtime State 继续保持小而可恢复，不吞并完整 Log / branch receipt / action trace；P4 substate 只保存 Inscape narrative 子状态。

## 已运行验证

- `dotnet build Inscape.slnx --no-restore` 通过，0 warning / 0 error。
- `dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build` 通过，包含新增 `p4 integration smoke runs playable mvp sample`。
- `node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js` 通过。
- `npm --prefix src\ExternalSupport\VSCode run check:structure` 通过。
- `npm --prefix src\ExternalSupport\VSCode run check:semantic-parity` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:model` 通过。
- `npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http` 通过。
- `git diff --check` 通过。
- Internal Unity / host SDK forbidden-term scan 通过。
- P4 deferred policy-name implementation scan 通过。
- ExternalSupport product-code Runtime semantic marker scan 通过。

## 后续

下一轮进入 P4 final validation / PASS-FAIL 收口。若不使用第 13-15 轮缓冲，应直接跑最终矩阵、边界扫描，更新 P4 final validation report、handoff、TODO 与相关 docs，并只在所有 P4 PASS 标准有证据时标记 goal complete。
