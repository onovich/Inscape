# Host Query and Event Registration Strategy

状态：草案，P3 第二版语法 / Runtime 前置边界

最后更新：2026-06-18

本文整理变量、查询、回调和宿主动作的第一版边界。它补齐 F 阶段剩余的非 Unity 设计，并在 2026-06-18 的 P3 讨论后沉淀第二版语法 / Runtime 的前置结论：查询表达式需要支持条件分支，但不得携带副作用；`[]` 只读，`@` 表达动作；正式宿主接入默认走 delegate query，mock / recorded values 主要服务测试、预览和调试复现；Host Schema 作为统一宿主能力清单，包含 `queries[]` 与 `actions[]` 两部分。

## 参照结论

不同叙事系统对变量和宿主能力的边界大致如下：

- Yarn Spinner：脚本可以读写变量，也能通过 command / function 连接宿主；工程上通常把宿主实现留在游戏代码里。
- Ink：变量与函数表达力强，external function 可以接宿主；优势是表达顺滑，风险是作者脚本容易靠近业务逻辑。
- Ren'Py：脚本语言与 Python 互通能力强，适合完整引擎生态；但这种能力不适合作为 Inscape 第一阶段的文本 DSL 边界。
- Twine：不同 story format 差异很大，变量和宏能力灵活；优点是创作自由，缺点是工程边界容易随格式膨胀。

Inscape 的第一阶段不追求把这些能力全部塞进 `.inscape`。当前定位应更保守：

```text
.inscape names host-facing intent.
Host Schema declares available capabilities.
Host Bridge maps readable ids to project implementation.
Runtime Host executes implementation.
```

脚本侧保持可读、可审查、可本地化；宿主侧负责真实状态和业务能力。

## 查询是否允许副作用

结论：第一版查询表达式不允许副作用。

`[]` 查询插值只读取值：

```inscape
旁白：[player.name]推开了门。
系统：背包容量：[inventory.used]/[inventory.capacity]
老板娘：你还欠我[debt.remaining]枚金币。
```

它不允许：

```inscape
[grant:item.sword]
[set:player.gold -= 10]
[emit:door_opened]
[Unity.Inventory.AddItem(10023)]
```

原因：

- 文本插值参与本地化锚点和预览显示，副作用会让提取、审校和预览不稳定。
- 作者看到 `[]` 时应形成“读取当前值”的稳定心智模型。
- 事件、状态变化、资源调度应交给 `@` 行或后续显式动作语法，而不是混入正文。
- Runtime Host 可以缓存或准备查询值，但不应让读取文本触发业务变更。

## 条件表达式边界

P3 可以把条件表达式作为第二版语法重点，但第一刀应保持保守：

P3 Round 7 已将作者语法、表达式 grammar、Compiler IR shape 与 diagnostics 收口到 [Condition Syntax Contract](condition-syntax-contract.md)，P3 Round 8 已完成 Compiler / IR 最小实现，P3 Round 9 已让 Usage Manifest 从 Compiler IR 抽取条件 query usage。本文保留查询 / 动作边界口径，具体 parser 与 usage 设计以后者和 [Usage Manifest Contract](usage-manifest-contract.md) 为准。

- 支持 `and`、`or`、`not`。
- 支持括号。
- 支持比较运算，例如 `==`、`!=`、`>`、`>=`、`<`、`<=`。
- 支持字符串、数字和 bool。
- 支持以 query 形式读取值，例如 `has_item("silver_key")` 或 `trust("mira") >= 3`；脚本层不关心该 query 在宿主侧是函数、表查找、缓存还是生成 dispatcher。
- 暂不支持数组和列表。
- 暂不支持复杂表达式，例如数学计算、字符串拼接、三元表达式、集合判断、链式对象访问、赋值、`await`、lambda 或在条件中触发动作。

示例：

```inscape
[has_item("silver_key") and trust("mira") >= 3]
[not quest_done("mira_escape")]
[(chapter() >= 2 and location() == "garden") or debug_mode()]
```

这些表达式只采样条件，不改变世界。采样点应由 Runtime 明确，例如进入节点、展示选项、玩家点击选项、执行跳转或分支时。受条件影响的 query 结果如果需要调试复现，应由 Runtime 记录为 receipt，而不是在回放时重新向宿主查询。

P3 第一刀的语法落点倾向：

```inscape
- [has_item("silver_key")] 用银钥匙开门 -> gate_open
- [trust("mira") >= 3] 请求 Mira 帮忙 -> ask_mira
- 离开 -> leave

? [has_item("silver_key")] -> gate_open
? [lockpick_level() >= 2] -> gate_pick
-> gate_locked
```

选项条件前置，表示条件为 true 时该选项出现；条件跳转从上到下匹配，第一条 true 生效，默认 `-> target` 作为 fallback。行级条件和节点入口条件后置，不进入第一刀。

## Query 来源与优先级

脚本作者只看到一套 query contract；底层来源由 Runtime / Host Bridge 配置决定。P3 先按以下优先级设计：

```text
delegate
正式宿主接入主路径。Inscape 在叙事决策点临时向宿主查询，宿主是玩法状态权威。

mock
编辑器预览、测试和 CI 使用的假数据或手填数据。

recorded
调试复现、Trace Replay 或回滚重建时使用的历史 query 结果。
```

原先讨论的 snapshot 不再作为一等生产查询来源。它可以保留为低优先级实现细节：

- 宿主进入一段剧情前传入一次性上下文包。
- 宿主内部为昂贵查询做批量预计算。
- 工具层把 mock / recorded values 当作只读值表。

P3 不设计“每帧把宿主状态同步给 Inscape”的主链路。每帧 snapshot 如果总是作为最新状态使用，会和 delegate 高度重叠，并容易制造两份真相。宿主可以在自己的 delegate 实现里使用缓存，但 Inscape 语言和 Runtime contract 不需要知道缓存细节。

## 内部状态与内部查询

P3 可以允许 Inscape 拥有内部状态，但边界必须很窄：只保存“叙事运行事实”，不保存业务玩法事实。

可以由 Inscape 管理和查询：

- 当前 node、当前执行位置。
- 节点是否访问过、访问次数。
- 某句 line 是否已经显示过。
- 某个选项是否出现过、是否被选过。
- 上一次选择、choice 历史。
- Log / Backlog。
- 当前 Runtime checkpoint 和本轮内存 rollback 栈。

不应默认由 Inscape 管理：

- 背包、任务阶段、好感度、战斗结果、NPC 生死、玩家位置、经济数值。

内部查询函数应只读、同步、确定性，并且只读取 Inscape 的叙事运行事实。候选示例：

```text
current_node()
previous_node()
entered_from(nodeId)
visited(nodeId)
visit_count(nodeId)
first_visit(nodeId)
seen(lineId)
seen_any(lineId...)
seen_all(lineId...)
choice_made(choiceId)
choice_count(choiceId)
last_choice(nodeId)
```

暂不做用户自定义内部变量系统，也不做能修改状态的内部函数。`trust("mira")`、`has_item("key")`、`quest_stage("main")` 这类业务状态默认仍归宿主 delegate query；只有项目明确选择把某类叙事变量交给 Inscape 时，才应作为后续扩展另行设计。

## Host Schema 角色

Host Schema 是宿主能力清单，不是实现。概念上它包含两类能力：

```text
queries[]
描述“能问什么”。只读，用于 `[]`、条件表达式、编辑器提示和测试 mock。

actions[]
描述“能做什么”。可能有副作用，用于 `@` 动作 / 事件 / 控制权交接。
```

P3 之后不要把 Host Schema / Action Schema 写成两个独立系统；Action Schema 只是 Host Schema 的 `actions[]` 部分。

第一版最小 shape 倾向：

```json
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    {
      "name": "has_item",
      "parameters": [
        {
          "name": "itemId",
          "type": "string",
          "idKind": "item",
          "required": true
        }
      ],
      "returnType": "bool",
      "description": "玩家是否拥有指定道具。"
    }
  ],
  "actions": [
    {
      "name": "play_timeline",
      "parameters": [
        {
          "name": "timelineId",
          "type": "string",
          "idKind": "timeline",
          "required": true
        }
      ],
      "mode": "wait",
      "description": "播放宿主演出资源。"
    }
  ]
}
```

Host Schema 负责：

- 告诉作者哪些 query / action 可用。
- 给 VSCode / audit / LanguageServer 提供 completion、Hover 和显式审计信息。
- 保持 Inscape 可读 ID，不暴露项目内部类型、方法、GUID、endpoint 或资源路径。

Host Schema 不负责：

- 执行 query。
- 绑定宿主实现。
- 决定 Unity、Web、服务端或其他 runtime 的调用方式。
- 让 Compiler 因缺失 query 而失败。

字段命名约定：

- 用 `parameters`，不用 `params`。
- Query 用 `returnType`，不用 `returns`。
- Action 用顶层 `mode`，取值第一版为 `fire`、`wait`、`handoff`。
- `idKind` 是可选字段，用来提示某个 string 参数是 Inscape 可读 ID，例如 `item`、`timeline`、`speaker`。
- `description` 可选，只服务 Hover / 文档，不参与执行。
- 第一版不加入 `rollbackPolicy`、`replayPolicy`、`receiptPolicy`、`failurePolicy`、`timeoutPolicy`。

## Host Bridge 角色

Host Bridge 把 Inscape 可读 ID 映射到项目实现：

```json
{
  "queries": [
    {
      "name": "player.gold",
      "handler": {
        "kind": "generated-dispatcher",
        "memberName": "GetPlayerGold"
      }
    }
  ],
  "actions": [
    {
      "name": "play_timeline",
      "handler": {
        "kind": "generated-dispatcher",
        "memberName": "PlayTimeline"
      }
    }
  ]
}
```

Bridge 可以引用宿主内部成员，但这些引用不得回写到 `.inscape` 正文。脚本只认识 `player.gold` 或 `timeline.talking.exit` 这类 Inscape ID。

## Runtime Host 注册策略

第一版推荐注册模型：

```text
Host Schema: declares what authors may use.
Host Bridge: maps ids to implementation handles.
Runtime Host: registers concrete delegates or generated dispatchers.
```

查询注册建议：

- Query handler 必须声明返回值类型。
- Query handler 默认视为只读。
- 异步 query 不作为第一版文本插值主线；若存在，应由 Runtime Host 在进入文本前准备值，或在后续 runtime 设计中定义加载状态。
- Query 失败时由 Runtime Host 决定 fallback：保留 `[query]`、显示调试值、记录 runtime diagnostic 或按项目策略中断。

动作注册建议：

- Action handler 可以产生副作用。
- Action handler 由 `@` 行、hook phase 或后续显式动作语法触发。
- Action 不应通过 `[]` 文本插值触发。
- Action payload 第一版应保持小而稳定，例如 node id、line anchor、phase、source span，而不是直接暴露 Compiler 内部对象。
- 动作可按 `fire`、`wait`、`handoff` 三类设计：`fire` 发出后继续，`wait` 暂停剧情等待宿主完成，`handoff` 把控制权交给宿主并等待宿主日后恢复剧情。
- 第一版不为了低优先级 Rollback / Replay 增加复杂 per-action policy。Trace Replay 不真实重放 action，只显示记录；Rollback 遇到改变宿主状态的 action 默认作为 barrier，未来只有宿主明确提供 checkpoint / undo / idempotency 机制时才放开。
- `wait` / `handoff` action 失败、取消或超时统一视为宿主异常。Runtime 应抛出 / 上报 action error，包含 node、lineId、action name、args、requestId 和 host error，由宿主决定重试、fallback、弹窗或中断。

## Usage / Requirement Manifest

Host Schema 权威来自上层宿主；下层 `.inscape` 脚本不能生成权威 Host Schema。脚本能生成的是 Usage / Requirement Manifest：一份机器可读的需求清单。

```text
Host Schema
宿主说：我能提供什么。

Usage Manifest
剧本说：我实际用了什么。

Audit
工具对账：剧本用的，宿主有没有提供，Bridge 有没有映射。
```

P3 Round 4 已在 [Usage Manifest Contract](usage-manifest-contract.md) 定义 `inscape.usage` 契约。P3 Round 5 已实现 usage 入口，P3 Round 6 已实现 Host Integration Audit 最小入口，P3 Round 7 已完成条件语法 contract / parser design，P3 Round 8 已完成 Compiler / IR 最小实现，P3 Round 9 已接入 `choice-condition` 与 `conditional-jump` 的实际 usage 扫描：

```powershell
inspect-usage-project <root> -o usage.json
audit-host-integration-project <root> -o report.json
```

Usage Manifest 第一版记录 query / action 名称、可读取的字面量参数、source location、使用上下文，并在结合 Host Schema 后推导 `requiredIds`。`@timeline...` 这类 hook 在 usage 中标记为 `usageKind = "host-binding-hook"`，优先对账 Host Bridge。它可用于 audit、CI、Bridge TODO 生成和编辑器跳转，但不用于 runtime 执行，也不作为宿主能力真相。

示例：

```json
{
  "format": "inscape.usage",
  "formatVersion": 1,
  "queries": [
    {
      "name": "has_item",
      "arguments": ["silver_key"],
      "source": {
        "path": "chapter1.inscape",
        "line": 42,
        "column": 8
      },
      "context": "choice-condition"
    }
  ],
  "actions": [
    {
      "name": "play_timeline",
      "arguments": ["mira_reveal"],
      "source": {
        "path": "chapter1.inscape",
        "line": 58,
        "column": 1
      },
      "context": "action-line"
    }
  ],
  "requiredIds": [
    {
      "kind": "item",
      "name": "silver_key",
      "usedBy": {
        "capabilityKind": "query",
        "name": "has_item",
        "argumentIndex": 0
      },
      "reason": "host-schema-parameter-idKind"
    }
  ]
}
```

## Host Schema 生成策略

Host Schema 应保持宿主无关。手写 JSON / YAML 是兜底方案，但长期应优先支持自动化生成：

- C# attribute 或 source generator：例如 `[InscapeQuery]`、`[InscapeAction]` 扫描项目代码后生成待确认 schema / bridge。
- TypeScript / 其他宿主语言的声明或装饰器生成。
- 宿主启动时 runtime register，再导出 schema 给编辑器使用。

不建议把第一版 schema 维护绑定到 Unity Inspector。Inspector 可以成为 Unity 插件的编辑界面，但 Host Schema 本身必须是可版本化、可审查、可在非 Unity 项目中使用的普通文件。

## 避免 DSL 控制反转进业务层

Inscape 不应该让脚本直接写宿主语言调用：

```inscape
[Unity.Inventory.HasItem(10023)]
[GET /api/player/gold]
@call Game.Services.Inventory.AddItem sword
```

正确方向是：

```inscape
旁白：你还有[player.gold]枚金币。
@timeline.talking.exit court_intro
```

然后由 Host Schema / Host Bridge / Runtime Host 决定 `player.gold` 和 `court_intro` 在项目里如何实现。

## 和 Compiler 的边界

Compiler 继续负责 `.inscape` 语法、节点图、source map、本地化锚点和基础诊断。它不读取 Host Schema，不执行查询，不验证 Host Bridge。

Tooling / VSCode / LanguageServer 可以提供提示或显式 audit，但这些都属于作者体验层，不能反向改变 Compiler 的语言真相。

## 后续节点

后续非 Unity 实现建议：

1. Compiler 条件 parser / IR 与 diagnostics 已按 [Condition Syntax Contract](condition-syntax-contract.md) 落地，VSCode / SelfHostedEditor 不复制表达式 parser。
2. Host Schema 最小字段已收敛到 `queries[]` / `actions[]`，legacy `events[]` 继续作为 deprecated 兼容输入。
3. `inspect-usage-project` 与 `audit-host-integration-project` 已完成最小实现，Usage Manifest 已接入 Compiler 条件 IR 中的 `choice-condition` / `conditional-jump`。
4. Runtime 已定义 delegate / mock / recorded provider contract，并明确 snapshot 不作为生产主链路。
5. Runtime 已定义内部叙事运行事实和内部只读查询函数的最小集合。
6. Runtime State 最小模型和 `ValidateStateAgainstCurrentScript` shape 已完成；下一步进入 Host Schema / Usage / Audit / 条件语法 / Runtime State 的端到端 smoke。
7. 评估 C# attribute / source generator 的宿主无关 schema 生成流程。

Unity 相关代码生成和 Attribute 扫描只进入准备和计划文档；在设计方案落实前，不进行研发实现。

## 自检结论

- 查询副作用被明确禁止，事件副作用被保留到 `@` / Runtime Host。
- Host Schema、Host Bridge、Runtime Host 三层职责分开。
- 本文不引入 Unity 实现，不把 Unity 类型或 API 暴露给 DSL。
- Compiler 仍不依赖宿主配置。
