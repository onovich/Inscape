# P4 Runtime Playable MVP Goal 模式执行指南

日期：2026-06-18

状态：给执行者使用的 P4 开发指令文档

适用范围：Runtime 条件求值、query provider / receipt、action dispatcher、Log / Backlog、Inscape 子状态 blob Save / Load、最小 CLI / smoke / 文档收口。

## 0. 直接给执行者的 Goal Prompt

请在 goal 模式中创建并持续推进以下目标：

> 在 16 轮会话内完成 P4 Runtime playable MVP：让 P3 已落地的条件语法、Host Schema `queries[]` / `actions[]`、Usage Manifest、Runtime query provider、Runtime State 最小模型进入可运行剧情闭环。实现 Runtime 条件求值、delegate / mock / recorded query 接入、影响分支的 query receipt、`fire` / `wait` / `handoff` action dispatcher 最小模型、Log / Backlog 第一刀、正式项目用的 Inscape 子状态 blob Save / Load，以及最小 CLI / smoke / 文档收口。不实现 SelfHostedEditor 产品化 Runtime UI，不实现完整独立游戏存档产品，不实现完整 Rollback、Trace Replay、Flashback Playback、Presentation IR 或通用 Unity / Host SDK。

执行硬约束：

- 总轮数上限：16 轮。
- 第 1-12 轮是主线开发轮。
- 第 13-15 轮是缓冲修复轮，只能用于补缺陷、补测试、补文档、修兼容和处理验证失败。
- 第 16 轮必须做最终验收并输出 P4 PASS / FAIL。
- 每一轮都必须包含 Debug 自检和架构自检。
- 不允许在最终验收矩阵通过前把 goal 标记为 complete。
- 如果同一阻塞连续 3 轮无法推进，标记 goal 为 blocked，并说明阻塞点、已尝试动作和需要的人类决策。

每轮回复必须包含：

- 本轮目标
- 本轮完成内容
- Debug 自检
- 架构自检
- 已运行验证命令与结果
- 下一轮目标
- 是否消耗缓冲轮

## 1. 必读上下文

每次接手前先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `docs/self-hosted-editor-p3-final-validation-report.md`
4. `docs/p3-runtime-language-discussion-memory.md`
5. `docs/adr/0021-p3-runtime-and-host-capability-boundary.md`
6. `docs/runtime-unity.md`
7. `docs/condition-syntax-contract.md`
8. `docs/usage-manifest-contract.md`
9. `docs/host-schema.md`
10. `docs/host-bridge-contract.md`
11. `docs/host-query-event-registration-strategy.md`
12. `docs/open-questions.md`
13. `docs/cli-command-reference.md`
14. `docs/code-structure.md`
15. `docs/coding-conventions.md`

代码侧优先读：

- `src/Internal/Compiler`
- `src/Internal/Runtime`
- `src/Internal/Tooling`
- `src/Internal/Cli`
- `src/Internal/LanguageServer`
- `src/ExternalSupport/VSCode`
- `src/ExternalSupport/SelfHostedEditor`
- `tests/Internal/Inscape.Tests`

P4 默认不需要真实 Bird / Unity 验证。若执行者认为必须碰 `src/ExternalSupport/UnityPlugin`，必须先说明它为什么是 Runtime playable MVP 的必要条件，并保证 Unity / Bird 不进入 `Internal`。

## 2. P4 要完成什么

P4 是 Runtime playable MVP。它要把 P3 的“能描述、能审计、能导出最小状态”推进成“可以实际跑一段受条件、查询、动作影响的剧情”。

必须完成：

- Runtime 条件求值：
  - 执行 P3 Compiler IR 中的选项条件和条件跳转。
  - 条件跳转按源码顺序 `first true wins`。
  - 条件跳转没有命中时走 fallback。
  - 无法求值、类型不匹配、query 缺失、query provider 报错时产生明确 Runtime error。

- Query provider 接入：
  - `Delegate` 是正式运行主路径，宿主临时回答查询。
  - `Mock` 服务编辑器预览、测试和 CI。
  - `Recorded` 服务调试复现，不升级为完整 Trace Replay。
  - `Internal facts` 只覆盖 Inscape 自己知道的叙事事实，例如 visited / seen / choice。
  - P4 不做 snapshot query 主链路。snapshot 只作为未来测试便利方向保留。

- Query receipt 第一刀：
  - 只记录影响分支、条件跳转、选项可见性的 query 结果。
  - 不默认记录所有文本插值 query。
  - 不把普通存档变成完整 query / action trace。
  - recorded provider 可以消费 receipt 或等价 recorded values 做调试复现。

- Action dispatcher 第一刀：
  - 使用 Host Schema `actions[]` 的 `mode = fire | wait | handoff`。
  - `fire`：发出动作请求并继续 Runtime。
  - `wait`：Runtime 进入 pending，等待宿主 resume。
  - `handoff`：Runtime 把控制权交给宿主，等待宿主以后 resume。
  - action 失败、取消、超时统一作为宿主异常上报，不做剧情分支。
  - 不新增 per-action rollback / replay / timeout / failure policy 字段。

- Log / Backlog 第一刀：
  - 默认记录已经实际展示的 `speaker`、`text`、`lineId`。
  - 选项记录作为可选扩展或开发模式信息，不要求普通玩家 Log 默认展示。
  - Log 和 Runtime State 分离，不把完整 Log 塞进普通 Runtime State 主体。

- Save / Load 子状态 blob：
  - 正式项目中宿主存档仍是权威。
  - Inscape 只导出 / 导入自己的叙事子状态 blob。
  - 子状态可包含 position、flow、facts、pending action、必要 query receipt、host checkpoint id。
  - editor preview / 测试可以使用临时测试存档。
  - 不做纯 Inscape 独立游戏完整存档产品。

- CLI / smoke：
  - `runtime-project` 或等价 CLI 能驱动 P4 MVP 样例。
  - smoke 覆盖条件、query、action pending / resume、Log、Save / Load 子状态 blob。

- 文档收口：
  - 每个阶段性结果有审计文档。
  - 最终有 P4 PASS / FAIL 报告。

## 3. P4 不做什么

明确不做：

- SelfHostedEditor 产品化 Runtime Inspector UI。
- SelfHostedEditor Usage / Audit 面板产品化。
- VSCode Runtime-backed preview 重做。
- 完整独立游戏存档产品。
- 完整 Rollback。
- 完整 Trace Replay。
- Flashback Playback。
- 时空穿越式特殊倒放。
- Presentation IR。
- 通用 Unity / Host SDK。
- Action rollback / replay / receipt 精细 policy。
- 用户自定义内部变量系统。
- 把 Unity / Bird / Addressables / ScriptableObject 引入 `Internal`。
- 把 Host Schema 变成 Compiler 语义真相。
- 在 VSCode / SelfHostedEditor 里重写 condition evaluator、query evaluator、action dispatcher 或 Runtime 语义。

## 4. 架构边界

必须持续保持：

- `Inscape.Compiler` 是 parser / IR 真相，不依赖 Host Schema、Host Bridge、Runtime provider、Unity、Bird、VSCode 或 SelfHostedEditor。
- Runtime condition evaluator 位于 `Internal/Runtime`，只消费 Compiler IR，不重新解析源码。
- Host Schema 是宿主能力清单。
- Host Bridge 是项目 ID / handler 映射层。
- Usage Manifest 是脚本需求清单。
- 正式玩法状态归宿主管，Inscape 只管理自己的叙事运行子状态。
- ExternalSupport 可以做 UI、adapter、payload presenter，但不拥有 Runtime 语义。
- P4 不为低优先级 Rollback / Replay 提前扩大 schema 和 action policy。

## 5. P4 MVP 验收样例

P4 必须收口一个最小样例或 fixture。实际语法可按当前 parser 调整，但行为要覆盖完整闭环：

```text
# start
旁白：你站在门前。
- [has_item("silver_key")] 用银钥匙开门 -> gate.open
- 敲门 -> gate.knock

? [visited("gate.knock") and trust("mira") >= 3] -> mira.help
-> gate.locked

# gate.open
@emit play_timeline mira_reveal
旁白：门开了。
-> end

# gate.knock
@emit knock_sound
旁白：门后没有回应。
-> start

# mira.help
@emit wait_for_ui confirm_help
旁白：米拉帮你打开了门。
-> end

# gate.locked
旁白：门锁着。
-> end
```

样例必须覆盖：

- 条件选项可见性。
- 条件跳转 `first true wins`。
- fallback。
- delegate 或 mock query。
- internal facts，例如 `visited()`。
- `fire` action。
- `wait` 或 `handoff` action pending / resume。
- Log / Backlog。
- export state / import state / continue。
- 影响分支 query receipt。

## 6. 每轮固定工作流

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

每轮 Debug 自检：

- 当前改动能否用一个最小 sample / fixture 解释？
- Runtime 行为是否有正例、反例和错误路径测试？
- 如果涉及 query，是否覆盖 delegate / mock / recorded 中本轮目标需要的路径？
- 如果涉及 action，是否覆盖 `fire` / `wait` / `handoff` 中本轮目标模式的 pending / resume / error？
- 如果涉及 state，是否覆盖 export / import / validate / incompatible？
- 如果涉及 Log，是否证明 Log 与普通 Runtime State 分离？
- 如果涉及 CLI，是否覆盖 stdout / `-o` 输出 / 非零退出码边界？
- 如果失败，是否定位到 Compiler、Runtime、Tooling、CLI、LanguageServer、VSCode、SelfHostedEditor 或 test fixture 的具体层？

每轮架构自检：

- `Inscape.Compiler` 是否仍不依赖宿主和 Runtime provider？
- Runtime 是否只消费 Compiler IR，而不是重新解析源码？
- Runtime evaluator / dispatcher 是否没有复制到 ExternalSupport？
- Host Schema / Host Bridge / Usage Manifest 三者是否仍分层清楚？
- Inscape state 是否仍是宿主存档里的子状态 blob？
- 普通 Runtime State 是否没有吞并完整 Log / Rollback / Trace？
- 是否没有为了 Rollback / Replay 提前扩张 Host Schema policy？
- 是否没有把 P5 编辑器产品化或 Unity / Host SDK 混进 P4？

## 7. 分轮安排

### 第 1 轮：P4 baseline audit + Runtime MVP contract

目标：

- 审计 `NarrativeRuntime`、query provider、Runtime State、CLI `runtime-project`、P3 integration smoke 现状。
- 写清 P4 Runtime playable MVP 最小行为契约和不做范围。
- 固定 P4 最小样例 / fixture 草案。

产出：

- `docs/self-hosted-editor-p4-baseline-audit.md`
- `docs/runtime-playable-mvp-contract.md` 或等价 P4 contract 文档。

验收：

- 文档列出现有入口、缺口和风险。
- 至少运行 `git diff --check`；如有代码改动，运行基础验证。

### 第 2 轮：Runtime condition evaluator 最小 domain

目标：

- 在 `Internal/Runtime` 实现条件表达式 evaluator。
- 支持 bool、数字、字符串、`and` / `or` / `not`、括号、比较运算、query path / query call。
- 使用 Runtime query provider 获取 query 值。

验收：

- evaluator 只接收 Compiler IR，不接收源码字符串。
- tests 覆盖求值、类型不匹配、unknown query、provider error。

### 第 3 轮：Runtime flow 接入条件选项与条件跳转

目标：

- 条件选项只显示 / 可选 true 的 option。
- 条件跳转按源码顺序 first true wins。
- 没有命中时走 fallback。
- 无 fallback 或无可行路径时报 Runtime error。

验收：

- tests 覆盖 choice filtering、conditional jump、fallback、first true wins、error path。
- 无条件剧情不回归。

### 第 4 轮：Query receipt 第一刀

目标：

- 定义 branch-affecting query receipt 最小 shape。
- 条件选项和条件跳转求值时记录 query name、arguments、result、source、node / line / edge context。
- recorded provider 可用 receipt 或等价 recorded values 调试复现。

验收：

- 普通 Runtime State 仍保持小而可恢复。
- receipt 与完整 Trace Replay 明确分离。

### 第 5 轮：Action dispatcher contract + `fire`

目标：

- 定义 action request / result / error 最小模型。
- 读取 Host Schema `actions[]` 的 `mode`。
- 将当前 `@emit` 或等价 action intent 转成 Runtime action request。
- 实现 `fire`：发出动作并继续 Runtime。

验收：

- action dispatcher 不在 VSCode / SelfHostedEditor 实现。
- action 失败统一作为宿主异常，不做剧情分支。

### 第 6 轮：`wait` pending / resume

目标：

- 实现 `wait` action pending。
- 定义 pending state / resume token / request id。
- 宿主 resume 后 Runtime 继续。
- 失败、取消、超时统一作为 Runtime action error。

验收：

- tests 覆盖 pending、resume success、wrong request、host error。
- 不引入 per-action timeout policy 字段。

### 第 7 轮：`handoff` 控制权移交

目标：

- 实现 `handoff` action。
- 明确 `wait` 与 `handoff` 区别：
  - `wait`：Runtime 等一个宿主动作完成。
  - `handoff`：宿主系统成为当前段落主控，之后再恢复剧情。
- 支持 handoff resume / error。

验收：

- 不实现小游戏、战斗、Timeline 具体逻辑，只实现控制权模型。
- 不引入 Unity / Bird 依赖。

### 第 8 轮：Log / Backlog 第一刀

目标：

- Runtime 记录已经实际展示的内容。
- 默认字段为 `speaker`、`text`、`lineId`。
- 可选扩展记录 presented choices / chosen choice，用于开发模式或项目配置。
- Log 与 Runtime State 分离。

验收：

- 条件导致未展示的文本不进入 Log。
- Log 不重新执行脚本。
- 普通 Runtime State 不默认包含完整 Log。

### 第 9 轮：Save / Load 子状态 blob

目标：

- 将 P3 `ExportState` 推进到 P4 可恢复状态。
- 实现 `ImportState` 或等价 restore 入口。
- 保存 position、flow、facts、pending action、必要 query receipt、host checkpoint id。
- `ValidateStateAgainstCurrentScript` 继续只报告，不静默修状态。

验收：

- tests 覆盖 export -> import -> continue。
- host checkpoint id 仍是 opaque。
- 不保存宿主业务状态。

### 第 10 轮：CLI Runtime playable driver

目标：

- 扩展 `runtime-project` 或新增等价 CLI 参数，驱动 P4 MVP：
  - query provider 输入。
  - action result / resume。
  - export / import state。
  - log output。
- 保持 stdout / `-o` JSON 稳定。

验收：

- CLI 可以跑完最小 P4 样例。
- 错误输出可定位 node / line / action / query。
- 不破坏现有 `runtime-project` 兼容参数。

### 第 11 轮：Editor host contract guard，不做产品化 UI

目标：

- 确保 VSCode / SelfHostedEditor 不复制 Runtime 条件求值、query evaluator 或 action dispatcher。
- 如需改 SelfHostedEditor Runtime bridge，只做 shared payload 适配和 smoke，不做产品化 Runtime Inspector UI。
- 保持 Preview choice click invariant。

验收：

- VSCode `check:semantic-parity` 通过。
- SelfHostedEditor `check:model` / `check:semantic-parity-http` 通过。
- ExternalSupport 没有新增 Runtime 语义副本。

### 第 12 轮：P4 integration smoke + 文档收口

目标：

- 串起 P4 MVP 样例：
  - 条件选项。
  - 条件跳转。
  - delegate / mock query。
  - `fire` action。
  - `wait` 或 `handoff` pending / resume。
  - Log。
  - export / import state。
  - query receipt。
- 更新 docs / handoff / TODO。

产出：

- `docs/self-hosted-editor-p4-integration-audit.md`
- P4 integration smoke test。
- CLI smoke 示例。

验收：

- 最小剧情可从起点跑到终点。
- 中途保存 / 恢复后可继续。
- 条件和 action 行为可通过 JSON output 验证。

### 第 13-15 轮：缓冲修复

只能用于：

- 修第 1-12 轮发现的失败项。
- 补测试、补 smoke、补 docs。
- 修 CLI JSON shape 或兼容问题。
- 修 Runtime restore / pending / receipt 边界。
- 修 VSCode / SelfHostedEditor parity 或 structure guard。

不能用于：

- 启动 SelfHostedEditor Runtime Inspector 产品化 UI。
- 启动完整 Rollback / Trace Replay / Flashback。
- 做通用 Unity / Host SDK。
- 做 Presentation IR。
- 做纯 Inscape 完整独立游戏存档产品。

### 第 16 轮：最终验证与 P4 PASS / FAIL

目标：

- 跑最终验证矩阵。
- 更新 handoff / TODO / README。
- 输出 P4 Runtime playable MVP PASS / FAIL。
- 明确下一候选阶段只能到 P5 candidate，不把方向池写成正式 phase。

## 8. 验证矩阵

每轮推荐基础验证：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
git diff --check
```

若改动 VSCode：

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
```

若改动 SelfHostedEditor：

```powershell
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
```

最终验收建议完整矩阵：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:structure
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\SelfHostedEditor run check:syntax
npm --prefix src\ExternalSupport\SelfHostedEditor run check:structure
npm --prefix src\ExternalSupport\SelfHostedEditor run check:model
npm --prefix src\ExternalSupport\SelfHostedEditor run check:semantic-parity-http
git diff --check
```

最终边界扫描：

```powershell
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources docs
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\VSCode src\ExternalSupport\SelfHostedEditor -g "*.js" -g "*.json"
```

## 9. P4 PASS 标准

P4 PASS 必须同时满足：

- Runtime 可以执行 P3 条件表达式。
- 条件选项、条件跳转、fallback、first true wins 有 tests。
- Runtime query provider 能服务条件求值。
- Branch-affecting query receipt 可记录并可验证。
- `fire` action 可以发出并继续。
- `wait` action 可以进入 pending 并 resume。
- `handoff` action 可以移交控制权并 resume。
- action error / cancel / timeout 统一作为宿主异常上报。
- Log / Backlog 第一刀存在，默认记录 `speaker`、`text`、`lineId`。
- 普通 Runtime State 不默认包含完整 Log、Rollback stack 或 Trace。
- Save / Load 子状态 blob 可以 export / import / continue。
- CLI 或最小 smoke 能跑通 P4 MVP 样例。
- VSCode / SelfHostedEditor 没有复制 Runtime condition evaluator / action dispatcher / query evaluator。
- `Internal` 未引入 Unity / Bird / Addressables 依赖。
- 未新增 rollback / replay / timeout / failure policy 字段作为 Host Schema 第一版能力。
- 最终验证矩阵通过。
- `docs/agent-handoff.md`、`docs/todo.md`、`docs/runtime-unity.md` 与实际状态一致。

## 10. 最终报告模板

第 16 轮最终报告使用：

```text
P4 Runtime playable MVP: PASS | FAIL

Completed:
- ...

Validation:
- command: PASS | FAIL

Architecture checks:
- Compiler remains host-independent: YES | NO
- Runtime owns condition evaluation, not ExternalSupport: YES | NO
- Host Schema / Host Bridge / Usage separation preserved: YES | NO
- Runtime State remains child blob, not full host save: YES | NO

Deferred:
- SelfHostedEditor Runtime Inspector product UI
- Full independent Inscape save product
- Full Rollback
- Full Trace Replay
- Flashback Playback
- Presentation IR
- Unity / Host SDK

Next candidate:
- P5 SelfHostedEditor Runtime authoring / productization, if P4 PASS
```
