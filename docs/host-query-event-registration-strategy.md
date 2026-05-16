# Host Query and Event Registration Strategy

状态：草案，F 阶段非 Unity 宿主 API 边界

最后更新：2026-05-16

本文整理变量、查询、回调和宿主事件的第一版边界。它补齐 F 阶段剩余的非 Unity 设计：对比 Yarn / Ink / Ren'Py / Twine 的变量与宿主 API 模型，明确查询表达式不允许副作用，并定义 Host Schema / Host Bridge / Runtime Host 的注册策略。

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

## Host Schema 角色

Host Schema 是能力清单，不是实现：

```json
{
  "queries": [
    {
      "name": "player.gold",
      "returnType": "number",
      "isAsync": false,
      "description": "Current visible gold amount."
    }
  ],
  "events": [
    {
      "name": "timeline.talking.exit",
      "description": "Play a timeline when leaving a talking line."
    }
  ]
}
```

Host Schema 负责：

- 告诉作者哪些 query / event 可用。
- 给 VSCode / audit / LanguageServer 提供 completion、Hover 和显式审计信息。
- 保持 Inscape 可读 ID，不暴露项目内部类型、方法、GUID、endpoint 或资源路径。

Host Schema 不负责：

- 执行 query。
- 绑定宿主实现。
- 决定 Unity、Web、服务端或其他 runtime 的调用方式。
- 让 Compiler 因缺失 query 而失败。

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
  "events": [
    {
      "name": "timeline.talking.exit",
      "handler": {
        "kind": "generated-dispatcher",
        "memberName": "PlayTimelineOnTalkingExit"
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

事件注册建议：

- Event handler 可以产生副作用。
- Event handler 由 `@` 行、hook phase 或后续显式动作语法触发。
- Event 不应通过 `[]` 文本插值触发。
- Event payload 第一版应保持小而稳定，例如 node id、line anchor、phase、source span，而不是直接暴露 Compiler 内部对象。

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

1. 先在 `Inscape.Tooling` 建立 Host Schema query reader。
2. 再实现显式 query interpolation audit。
3. 再决定 VSCode 是否调用 audit 或继续保留 JS 原型。
4. 最后评估 LanguageServer 是否接手 Hover / completion。

Unity 相关代码生成和 Attribute 扫描只进入准备和计划文档；在设计方案落实前，不进行研发实现。

## 自检结论

- 查询副作用被明确禁止，事件副作用被保留到 `@` / Runtime Host。
- Host Schema、Host Bridge、Runtime Host 三层职责分开。
- 本文不引入 Unity 实现，不把 Unity 类型或 API 暴露给 DSL。
- Compiler 仍不依赖宿主配置。
