# Condition Syntax Contract

状态：P3 Round 7 contract / parser design

最后更新：2026-06-18

本文定义 P3 第一刀条件语法、表达式 grammar、Compiler parser / IR 设计边界和诊断契约。它是 [ADR 0021](adr/0021-p3-runtime-and-host-capability-boundary.md)、[Host Query and Event Registration Strategy](host-query-event-registration-strategy.md) 与 [Usage Manifest Contract](usage-manifest-contract.md) 的落地补充。

本轮只收口 contract 与 parser design；Compiler 实现、Runtime 求值、编辑器消费和端到端 smoke 进入后续轮次。

## 目标

- 定义选项条件和条件跳转的作者语法。
- 固定第一版条件表达式 grammar 范围、优先级和不支持项。
- 设计 Compiler IR shape、source range 和 diagnostics。
- 为后续 Usage Manifest 的 `choice-condition` / `conditional-jump` context 提供查询抽取规则。
- 明确 VSCode、SelfHostedEditor 和 CLI 不复制条件 parser。

## 非目标

- 不实现条件表达式求值。
- 不设计完整 Runtime、Save / Load、Rollback、Trace Replay 或 Flashback。
- 不让 Compiler 读取 Host Schema、Host Bridge、Unity、Bird 或宿主配置。
- 不在 VSCode、SelfHostedEditor、CLI 中重写条件 parser。
- 不新增用户变量系统、数组、列表、数学表达式、异步 `await` 或条件中的 action。
- 不改变第一版 `[]` 文本插值契约；正文插值仍优先保持简单路径。

## 作者语法

### 选项条件

```inscape
- [condition] option text -> target
```

含义：

- 条件为 true 时该选项出现在本次选项列表中。
- 条件为 false 时该选项不显示。
- 条件只读取 query，不触发 action，不修改状态。
- `]` 后的内容继续按现有选项文本与 `-> target` 规则解析。

示例：

```inscape
? 你要怎么进入仓库？
- [has_item("silver_key")] 用银钥匙开门 -> gate_open
- [trust("mira") >= 3 and not quest_done("mira_help")] 请 Mira 帮忙 -> ask_mira
- 离开 -> leave
```

### 条件跳转

```inscape
? [condition] -> target
? [condition] -> target
-> fallback
```

含义：

- 条件跳转从上到下匹配，第一条 true 生效。
- 裸 `-> target` 是默认 fallback。
- 第一版建议同一组条件跳转必须有 fallback；缺失 fallback 应进入 Compiler diagnostics。
- `? text` 仍是现有选项提示；只有 `?` 后第一个非空白字符为 `[` 时才进入条件跳转解析。

示例：

```inscape
? [has_item("silver_key")] -> gate_open
? [lockpick_level() >= 2] -> gate_pick
-> gate_locked
```

### 后置语法

以下语法不进入 P3 第一刀：

- 节点入口条件。
- 行级条件。
- 条件块。
- 条件中的 action / command / assignment。
- 条件中对 Runtime state 的写入。

## 表达式 Grammar

第一版只支持布尔逻辑、括号、标量比较、字面量和只读 query。

```text
condition      := orExpr
orExpr         := andExpr ("or" andExpr)*
andExpr        := notExpr ("and" notExpr)*
notExpr        := "not" notExpr | comparison
comparison     := primary (comparisonOperator primary)?
primary        := literal | queryReference | "(" condition ")"

comparisonOperator := "==" | "!=" | "<" | "<=" | ">" | ">="

queryReference := queryPath | queryCall
queryPath      := identifier ("." identifier)*
queryCall      := queryName "(" argumentList? ")"
queryName      := identifier ("." identifier)*
argumentList   := literalArgument ("," literalArgument)*
literalArgument := string | number | bool | identifierLiteral

literal        := string | number | bool
bool           := "true" | "false"
```

优先级从低到高：

1. `or`
2. `and`
3. `not`
4. `==` / `!=` / `<` / `<=` / `>` / `>=`
5. literal、query、括号

设计说明：

- `and`、`or`、`not` 使用英文关键字；第一版不支持 `&&`、`||`、`!`。
- 比较不支持链式写法，例如 `1 < trust("mira") < 5`。
- query path 例如 `player.gold`；query call 例如 `has_item("silver_key")`。
- query call 参数第一版只接受字面量；`has_item(silver_key)` 中的 `silver_key` 是 identifier literal，不是变量读取。
- bare identifier / dotted identifier 在表达式主体中视为 query path。

## 不支持项

遇到以下内容应产生 Compiler diagnostic，不应由宿主或编辑器自行解释：

- 数组或列表：`["key"]`、`has_any(["a", "b"])`。
- 数学表达式：`gold() + 1 > 3`。
- 字符串拼接：`"a" + "b"`。
- 三元表达式、集合判断、lambda、管道表达式。
- 赋值或自增：`x = true`、`count += 1`、`flag++`。
- action / command：`@emit`、`emit("door_open")`、`grant_item("key")`。
- `await` 或异步控制流。
- 对象索引和任意成员调用：`inventory.items[0]`、`player.inventory.has("key")`。若需要宿主查询，应注册为 query path 或 query call。

## IR 设计

Compiler 应把条件解析为只读表达式 IR，并保留 source range 与 raw text。建议后续实现放在 `Inscape.Compiler` 的 DSL script / story graph 模型附近，而不是 Tooling、LanguageServer、VSCode 或 SelfHostedEditor。

建议模型角色：

```text
DslScriptConditionModel
  raw
  source
  expression

DslScriptConditionExpressionModel
  kind: literal | query | unary | binary | comparison
  raw
  source

DslScriptConditionQueryModel
  name
  syntax: path | call
  arguments
  source

DslScriptConditionLiteralModel
  literalKind: string | number | bool | identifier
  raw
  value
  source
```

节点 / 边承载建议：

- 选项 IR 在现有 option model 上增加可空 `condition`。
- 条件跳转 IR 可以作为独立 edge / transition group，保留顺序。
- fallback 仍使用现有跳转 target，但需要能表达它属于同一条件跳转组。
- source map 继续使用 1-based line / column / length。

Compiler 不应：

- 执行 query。
- 判断 query 是否存在于 Host Schema。
- 判断 Host Bridge 是否映射 query 参数。
- 推导 Unity / Bird / 项目内部 ID。

## Usage Manifest 对接

条件 parser 落地后，Usage Manifest 应从 Compiler IR 或共享 Tooling adapter 抽取 query usage：

- 选项条件使用 context `choice-condition`。
- 条件跳转使用 context `conditional-jump`。
- query path 记录 `syntax = "path"`，`name = "player.gold"`。
- query call 记录 `syntax = "call"`，`name = "has_item"`，并记录字面量参数。
- comparison 或 boolean operator 不作为 query usage。
- 非字面量参数如果后续放开，应记录为 `literalKind = "expression"`，但第一刀 grammar 先不放开。

Usage Manifest 仍只是剧本需求清单，不参与 Runtime 执行，也不反向生成 Host Schema。

## Diagnostics 契约

第一版诊断建议覆盖：

```text
condition.empty
condition.missing-closing-bracket
condition.unexpected-token
condition.trailing-token
condition.unsupported-operator
condition.unsupported-assignment
condition.unsupported-array-or-list
condition.unsupported-call-argument
condition.unsupported-action
condition.unclosed-string
conditional-jump.missing-target
conditional-jump.missing-fallback
```

诊断原则：

- 语法错误由 Compiler 报告。
- unknown query / unknown action 不由 Compiler 报告；它们进入 Host Integration Audit。
- 参数数量、参数类型和 `idKind` 对账不由 Compiler 报告；它们进入 Host Integration Audit。
- VSCode / SelfHostedEditor 只展示 Compiler / LanguageServer / Tooling payload，不重复实现条件解析。
- 诊断 location 指向最小可理解 token，例如缺 `]` 指向条件起始 `[` 或行尾。

## 有效示例

```inscape
- [has_item("silver_key")] 用银钥匙开门 -> gate_open
- [trust("mira") >= 3] 请求 Mira 帮忙 -> ask_mira
- [not quest_done("mira_escape")] 再检查一次线索 -> inspect_again

? [has_item("silver_key")] -> gate_open
? [(chapter() >= 2 and location() == "garden") or debug_mode()] -> secret_path
-> gate_locked
```

## 无效示例

```inscape
- [] 空条件 -> broken
- [gold() + 1 > 3] 数学表达式 -> broken
- [grant_item("silver_key")] 条件中触发动作 -> broken
- [has_any(["silver_key", "brass_key"])] 数组参数 -> broken
- [player.inventory.has("silver_key")] 任意成员调用 -> broken
- [trust("mira") >= 3] 缺少目标

? [has_item("silver_key")] -> gate_open
```

最后一组缺少 fallback，应产生 `conditional-jump.missing-fallback` 诊断。

## Parser 实现建议

Round 8 建议使用小型 recursive descent 或 Pratt parser：

- 先在 Compiler 内识别选项行和条件跳转行的外层 `[...]`。
- 条件内部用 token stream 解析 expression，保留 raw span。
- 外层 DSL line parser 负责区分 `? text` 提示和 `? [condition] -> target` 条件跳转。
- Parser 只产 IR 和 diagnostics，不接 Host Schema、Host Bridge 或 Runtime Host。
- 测试优先覆盖 precedence、括号、source location、unsupported syntax、选项条件、条件跳转顺序和 fallback。

## 架构自检

- Compiler 是条件语法真相；Tooling、LanguageServer、VSCode、SelfHostedEditor 只消费共享 payload。
- `[]` 保持只读查询心智模型；`@` 继续承载动作 / 控制移交。
- Host Schema 是能力清单，Host Bridge 是映射层，Usage Manifest 是需求清单。
- 本契约不引入 Unity、Bird、HTML、VSCode 或第三方包依赖。
- Runtime 求值、delegate / mock / recorded provider、query receipt 和 Save / Load 留给后续 Runtime 轮次。
