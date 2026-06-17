# P3 第二版语法 / Runtime / 宿主能力 Goal 模式执行指南

日期：2026-06-18

状态：给执行者使用的 P3 开发指令文档

适用范围：第二版条件语法、Host Schema `queries[]` / `actions[]`、Usage Manifest、Host Integration Audit、Runtime State 最小模型

## 0. Goal 模式启动指令

请在 goal 模式中创建并持续推进以下目标：

> 在 16 轮会话内完成 P3 第一刀：把第二版条件语法、Host Schema `queries[]` / `actions[]`、Usage / Requirement Manifest、Host Integration Audit、Runtime State 最小模型和相关文档 / ADR 收口到可验证状态；实现仅限最小模型、最小 Tooling / CLI / smoke，不实现完整正式 Save/Load、完整 Rollback、完整 Trace Replay、Flashback Playback、Presentation IR 或通用 Unity package。

执行约束：

- 总轮数上限：16 轮。
- 主线开发轮：第 1-12 轮。
- 缓冲修复轮：第 13-15 轮，只用于修缺陷、补验证、补文档、处理环境阻塞报告。
- 最终验收轮：第 16 轮。
- 每轮都必须有 Debug 自检和架构自检。
- 不允许在未完成最终验证前把 goal 标记为 complete。
- 如果同一阻塞条件连续 3 轮仍无法推进，标记 goal 为 blocked，并写明阻塞点、已尝试动作、需要的人类决策。

每轮回复必须包含：

- 本轮目标。
- 本轮已完成。
- Debug 自检结果。
- 架构自检结果。
- 已运行验证命令与结果。
- 下一轮目标。
- 是否消耗缓冲轮。

## 1. 必读上下文

每次接手前先读：

1. `docs/agent-handoff.md`
2. `docs/todo.md`
3. `docs/p3-runtime-language-discussion-memory.md`
4. `docs/adr/0021-p3-runtime-and-host-capability-boundary.md`
5. `docs/host-query-event-registration-strategy.md`
6. `docs/host-schema.md`
7. `docs/host-bridge-contract.md`
8. `docs/runtime-unity.md`
9. `docs/open-questions.md`
10. `docs/dsl-syntax-guide.md`
11. `docs/dsl-language.md`
12. `docs/authoring-marker-contract.md`
13. `docs/authoring-query-interpolation-contract.md`
14. `docs/query-interpolation-data-contract.md`
15. `docs/code-structure.md`
16. `docs/coding-conventions.md`

代码侧优先阅读：

- `src/Internal/Compiler`
- `src/Internal/Tooling`
- `src/Internal/Cli`
- `src/Internal/LanguageServer`
- `src/Internal/Runtime`
- `src/ExternalSupport/VSCode`
- `src/ExternalSupport/SelfHostedEditor`
- `tests/Internal/Inscape.Tests`

P3 不要求真实 Bird / Unity 验证。若涉及 `ExternalSupport/UnityPlugin`，必须先说明为什么 P3 第一刀需要碰它，并继续保持 Unity / Bird 不进入 `Internal`。

## 2. P3 第一刀范围

P3 要完成：

- 新增或更新 ADR / 文档，让 P3 关键边界可追溯。
- 将 Host Schema 口径收敛为统一能力清单：`queries[]` 与 `actions[]`。
- 设计并最小验证 Query / Action Schema 字段：
  - Query：`name`、`parameters`、`returnType`，可选 `idKind`、`description`。
  - Action：`name`、`parameters`、`mode`，可选 `idKind`、`description`。
- 明确现有 `events[]` 到未来 `actions[]` 的兼容 / 迁移口径。
- 设计并最小实现 Usage / Requirement Manifest：
  - `inspect-usage-project <root> -o usage.json`
  - 输出 `inscape.usage`。
  - 记录 query / action usage、字面量参数、source location、context、required ids。
- 设计并最小实现 Host Integration Audit：
  - `audit-host-integration-project <root> -o report.json`
  - 对账 Usage + Host Schema + Host Bridge。
  - 输出 unknown query / action、参数类型不匹配、缺失 bridge binding、待补全 Bridge TODO。
- 设计第二版条件表达式第一刀：
  - 选项条件：`- [condition] text -> target`
  - 条件跳转：`? [condition] -> target`
  - 默认 fallback：`-> target`
  - 表达式支持 `and` / `or` / `not`、括号、标量比较、字符串、数字、bool。
  - 不支持数组、列表、复杂表达式、赋值、`await`、在条件中触发动作。
- 将条件语法落到 Compiler / IR / Tooling 的最小可验证模型，不能复制进 VSCode 或 SelfHostedEditor。
- 设计并最小验证 Runtime State：
  - `ExportState` shape。
  - `ValidateStateAgainstCurrentScript` shape。
  - compatible / migratable / incompatible 判断模型。
- 保持 `[]` 只读，`@` 做事。
- 保持正式 query 主路为 delegate，mock / recorded 服务测试和调试，snapshot 不作为生产主链路。

P3 不做：

- 完整正式 Save / Load 产品系统。
- 完整 Rollback、完整 Trace Replay、Flashback Playback。
- 时空穿越式特殊倒放机制。
- Action rollback / replay / receipt 精细 policy。
- 用户自定义内部变量系统。
- Presentation IR。
- 通用 Unity package 产品化。
- 把 Unity / Bird / Addressables / ScriptableObject 引入 `Internal`。
- 把 Host Schema 变成 Compiler 语义真相。
- 在 VSCode / SelfHostedEditor 中重写 parser、expression evaluator、Host Schema reader 或 Runtime 语义。

## 3. 每轮固定自检

每轮开始：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

每轮 Debug 自检：

- 当前改动是否能用一个最小 sample / fixture 解释？
- 是否为新增 JSON shape 添加了最小读写或 schema 验证？
- 如果涉及 parser / Compiler，是否有正例、反例和 source location 测试？
- 如果涉及 CLI，是否覆盖 stdout / `-o` 输出 / 非零退出码边界？
- 如果涉及 Tooling presenter，是否输出可供编辑器消费的稳定字段，而不是散文字符串？
- 如果涉及 Runtime State，是否验证 compatible / migratable / incompatible 三种状态？
- 如果出现失败，是否定位到 Compiler、Tooling、CLI、LanguageServer、VSCode、SelfHostedEditor 或 test fixture 哪一层？

每轮架构自检：

- `Inscape.Compiler` 仍不依赖 Unity、VSCode、HTML、Bird 或宿主配置。
- Host Schema / Host Bridge 仍不成为 Compiler 必需输入。
- VSCode / SelfHostedEditor 只消费 LanguageServer / Tooling / CLI / shared payload，不重建语义。
- Host Schema 是能力清单；Host Bridge 是映射层；Usage Manifest 是剧本需求清单。
- Action Schema 不是独立系统，而是 Host Schema 的 `actions[]`。
- 不为低优先级 Rollback / Replay 提前扩大 action policy。
- Runtime State 不吞并 Log / Rollback / Trace 的完整数据。
- 正式玩法状态仍归宿主，Inscape 内部状态只覆盖叙事运行事实。

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

若只改文档：

```powershell
git diff --check
```

## 4. 轮次安排

### 第 1 轮：P3 基线审计与执行边界冻结

目标：

- 读取 P3 相关文档、ADR 0021、讨论记忆。
- 审计当前 Host Schema / Host Bridge / Query Interpolation / Runtime 文档和代码入口。
- 明确当前 `events[]`、query reader、host schema capability endpoint、VSCode / SelfHostedEditor 消费链路现状。
- 不做大规模实现。

产出：

- `docs/self-hosted-editor-p3-baseline-audit.md`
- 当前 P3 差距清单。
- 第一刀实现范围确认。

验收：

- 文档列出 `queries[]` / `events[]` / `actions[]` 的当前状态和迁移风险。
- 文档列出 Usage Manifest、Host Integration Audit、条件语法、Runtime State 的现有入口和缺口。
- 运行至少 `git diff --check`；如有代码改动，跑基础验证。

### 第 2 轮：Host Schema v2 最小 contract

目标：

- 更新 Host Schema 文档、JSON Schema、模板和测试 fixture，使 `queries[]` / `actions[]` 口径可验证。
- 定义 `parameters`、`returnType`、`mode`、`idKind`、`description` 字段。
- 明确 `events[]` 的兼容 / 迁移策略：当前工具可以继续读取 `events[]`，P3 新能力优先落到 `actions[]`。

产出：

- Host Schema v2 草案文档更新。
- JSON Schema / template 更新。
- 最小 schema fixture。

验收：

- `inscape.host.schema.json` 或等价 JSON Schema 能校验 `queries[]` / `actions[]`。
- Existing `events[]` fixture 不被误删或静默破坏。
- Host Schema 不包含 Unity GUID、asset path、Bird ID、Addressables key。

### 第 3 轮：Host Schema Tooling / CLI / LanguageServer 兼容

目标：

- 让 Tooling Host Schema reader 能读取 `actions[]`，同时保留当前 `events[]` 兼容路径。
- `inspect-host-schema-project` 输出 capability catalog 时区分 query / action，并对 legacy event 给出兼容字段或 warning。
- LanguageServer / VSCode / SelfHostedEditor 消费共享 capability，不复制 JSON 解析。

产出：

- Tooling reader / model / tests。
- CLI capability output 更新。
- VSCode / SelfHostedEditor parity 小修，如需要。

验收：

- Internal tests 覆盖 `queries[]` / `actions[]` / legacy `events[]`。
- VSCode `check:semantic-parity` 和 SelfHostedEditor host schema smoke 保持通过。

### 第 4 轮：Usage Manifest contract

目标：

- 设计 `inscape.usage` JSON shape。
- 定义 query / action usage、arguments、source location、context、ids。
- 明确 Usage 不作为 Host Schema 权威，不用于 Runtime 执行。

产出：

- `docs/usage-manifest-contract.md`
- usage JSON sample。
- source location / context 枚举说明。

验收：

- 文档能解释 Usage、Host Schema、Host Bridge、Audit 四者关系。
- 明确 typo query 应在 audit 中报告 unknown，而不是生成 Host Schema。

### 第 5 轮：`inspect-usage-project` 最小实现

目标：

- 在 Tooling / CLI 实现 `inspect-usage-project <root> -o usage.json`。
- 扫描条件 query、`[]` 查询、`@` action / timeline hook 的 usage。
- 输出 source location 和 context。

产出：

- Tooling usage model / domain。
- CLI command。
- Internal tests。

验收：

- 正例：能输出 query / action usage。
- 反例：未知 query 不导致 command 失败，只作为 usage 记录。
- 输出格式为 `inscape.usage`，支持 `-o`。

### 第 6 轮：Host Integration Audit 最小实现

目标：

- 实现 `audit-host-integration-project <root> -o report.json`。
- 读取 Usage + Host Schema + Host Bridge。
- 报告 unknown query / action、参数数量或类型不匹配、缺失 id binding。
- 生成 Bridge TODO 或待补全摘要。

产出：

- Tooling audit model / domain。
- CLI command。
- Internal tests。

验收：

- 能定位到 source location。
- 能区分 schema 缺失、bridge 缺失、参数错误。
- 不把 audit 失败接入默认 Compiler diagnostics。

### 第 7 轮：条件语法 contract 与 parser 设计

目标：

- 写清楚选项条件与条件跳转语法。
- 定义表达式 grammar 范围。
- 设计 IR shape，不急于接 Runtime。

产出：

- 更新 `docs/dsl-language.md`、`docs/dsl-syntax-guide.md` 或新增条件语法 contract。
- Compiler parser / IR 设计说明。
- 最小 sample。

验收：

- 明确 `- [condition] text -> target` 与 `? [condition] -> target`。
- 明确默认 fallback `-> target`。
- 明确行级条件和节点入口条件后置。

### 第 8 轮：条件语法 Compiler / IR 最小实现

目标：

- 在 Compiler 中解析选项条件和条件跳转。
- 表达式只进入 IR，不在 VSCode / SelfHostedEditor 中重写 parser。
- 添加 source map / diagnostics。

产出：

- Compiler parser / model / tests。
- 条件表达式 IR。
- 错误诊断：括号不匹配、非法运算符、unsupported array/list、条件跳转无 fallback 等。

验收：

- Internal tests 覆盖选项条件、条件跳转、fallback、多条件顺序。
- 表达式中 action / assignment / array / list 报错或明确 unsupported。

### 第 9 轮：条件表达式 Tooling / LanguageServer / Editor 消费

目标：

- 让 LanguageServer / Tooling 消费 Compiler IR 和 diagnostics。
- VSCode / SelfHostedEditor 只展示 shared diagnostics / hover / completion，不复制条件 parser。
- 使用 Host Schema capability 为 query 名提供提示。

产出：

- LanguageServer / Tooling integration。
- VSCode / SelfHostedEditor parity 小修，如需要。
- smoke / structure checks。

验收：

- VSCode semantic parity 通过。
- SelfHostedEditor semantic parity HTTP 通过。
- 没有在 ExternalSupport 中实现独立 expression parser。

### 第 10 轮：Runtime query provider 与内部叙事事实设计

目标：

- 定义 Runtime query provider contract：
  - delegate。
  - mock。
  - recorded。
  - internal narrative facts。
- 不做 snapshot 生产主链路。
- 不做业务状态托管。

产出：

- Runtime provider 设计文档或 model。
- 内部 facts 最小集合：current node、visited、seen、choice history。
- 最小 tests 或 smoke。

验收：

- 正式玩法状态示例仍通过 delegate。
- `visited()` / `seen()` / `last_choice()` 等内部事实只读、同步、确定性。
- 不新增用户自定义内部变量系统。

### 第 11 轮：Runtime State 最小模型

目标：

- 设计并实现最小 Runtime State model。
- 包含 `format`、`formatVersion`、`runtimeVersion`、`scriptVersion`、`position`、`flow`、`facts`、`random`、`host.checkpointId`。
- 实现 `ValidateStateAgainstCurrentScript` 的 shape。

产出：

- Runtime State model / docs。
- compatible / migratable / incompatible tests。
- 最小 fixture。

验收：

- 普通 Runtime State 不默认包含完整 Log、完整 Rollback Stack、完整 Trace。
- Validate 只报告，不静默修状态。
- 宿主 checkpoint 只作为 opaque id 保存，不被 Inscape 解释。

### 第 12 轮：最小端到端 smoke 与文档收口

目标：

- 串起 Host Schema、Usage Manifest、Audit、条件语法、Runtime State 最小模型的端到端样例。
- 更新 docs / handoff / TODO。
- 不宣布 P3 PASS，先进入缓冲修复前审计。

产出：

- `docs/self-hosted-editor-p3-integration-audit.md`
- 一个最小 sample 或 fixture。
- smoke script，如适合。

验收：

- usage 可以从 sample 生成。
- audit 可以对账 schema / bridge。
- 条件语法可以编译进 IR。
- Runtime State model 可以导出 / validate。

### 第 13-15 轮：缓冲修复

只能用于：

- 修第 1-12 轮发现的失败项。
- 补测试、补 smoke、补 docs。
- 处理 `events[]` / `actions[]` 兼容问题。
- 修 VSCode / SelfHostedEditor parity。
- 收敛命名、目录、结构检查。

不能用于：

- 启动完整 Save / Load 产品体验。
- 启动完整 Rollback / Trace Replay / Flashback。
- 增加复杂 action policy。
- 做 Presentation IR。
- 做通用 Unity package。

### 第 16 轮：最终验证与 P3 PASS / FAIL

目标：

- 跑最终验证矩阵。
- 更新 handoff / TODO / README / ADR 状态。
- 给出 P3 第一刀 PASS / FAIL。
- 明确下一阶段候选目标。

建议完整验证：

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

最终报告格式：

```text
P3 second syntax / Runtime / host capability first cut: PASS | FAIL

Completed:
- ...

Validation:
- command: PASS/FAIL

Architecture checks:
- Compiler remains host-independent: YES | NO
- Host Schema / Host Bridge / Usage separation preserved: YES | NO
- ExternalSupport did not duplicate Compiler / Runtime semantics: YES | NO

Deferred:
- Full Save/Load
- Full Rollback
- Full Trace Replay
- Flashback Playback
- Action rollback/replay policy
- Presentation IR

Next candidate phase:
- ...
```

## 5. 最终验收标准

P3 第一刀 PASS 必须同时满足：

- ADR 0021 存在且与实际实现一致。
- Host Schema 能表达 `queries[]` / `actions[]` 最小字段。
- 现有 `events[]` 兼容 / 迁移口径明确，不静默破坏当前工具。
- Usage Manifest 可生成并包含 source location。
- Host Integration Audit 可对账 Usage + Host Schema + Host Bridge。
- 条件语法第一刀可编译进 IR，并有 tests。
- 条件语义没有复制进 VSCode / SelfHostedEditor。
- Runtime query provider 与内部叙事 facts 边界清楚。
- Runtime State 最小 model / validate shape 可验证。
- 普通 Runtime State 不吞并完整 Log / Rollback / Trace。
- 异步失败 / 超时作为宿主异常处理，不成为第一版剧情分支语义。
- Rollback / Replay action policy 没有提前塞进 Host Schema。
- `Internal` 未引入 Unity / Bird / Addressables 依赖。
- 最终验证矩阵通过。
- `docs/agent-handoff.md`、`docs/todo.md`、`docs/p3-runtime-language-discussion-memory.md` 与实际状态一致。

## 6. 给执行者的边界提醒

- P3 第一刀是边界收口和最小验证，不是完整 Runtime 产品化。
- Host Schema 是菜单，不是调用包；Runtime call 才是真实调用。
- Usage Manifest 是剧本需求清单，不是宿主能力真相。
- Host Bridge 是映射层，不是 Schema。
- `actions[]` 是 Host Schema 的动作部分，不是另一个独立 schema 系统。
- Schema 权威来自宿主；脚本 Usage 只能反向生成需求和 Bridge TODO。
- `description` 可以来自 attribute、代码注释或人工 overlay，但它不参与执行。
- snapshot 不要重新升级为生产主路。
- 不要为了低优先级回放 / 倒放把 action 字段设计胖。
- 每轮都要 debug，也要检验架构。P3 最大风险不是做不出来，而是把语言、Runtime、宿主和编辑器边界混在一起。
