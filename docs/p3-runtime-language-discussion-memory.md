# P3 Runtime / Language Discussion Memory

状态：讨论记忆，供未来 session 恢复上下文

最后更新：2026-06-18

本文不是最终规范，也不是执行计划。它记录 2026-06-17 至 2026-06-18 围绕 P3 第二版语法、Runtime、查询、存档、回放、Rollback、Timeline 控制权的讨论脉络。正式口径已经沉淀到 [Host Query and Event Registration Strategy](host-query-event-registration-strategy.md)、[运行时与 Unity 宿主](runtime-unity.md)、[TODO](todo.md) 与 [待确认问题](open-questions.md)。本文的价值是保留“为什么这么定”，避免换 session 后只看到结论却丢掉判断依据。

## 最高层心智模型

P3 不应该理解成“给 Inscape 加一堆高级功能”。P3 的核心是确定 Inscape 在游戏工程里的位置：

```text
Inscape 是叙事编排层。
宿主是玩法世界和正式存档的权威。
Host Schema / Host Bridge 是两者之间的能力和映射契约。
```

这意味着 Inscape 可以做剧情分支、文本、选择、叙事运行事实、编辑器预览、Runtime state 导出；但不默认拥有背包、任务、战斗、NPC 生死、玩家位置、经济数值等业务玩法状态。

用户已明确接受这个方向：Inscape 可以有内部状态，但只应保存和查询“与业务无关的叙事运行事实”，例如节点是否访问过、某句台词是否见过、上一次选择是什么。好感度、任务阶段、背包等默认仍由宿主管。

## 竞品调研带来的基准

讨论中参考过 Yarn Spinner、Ink、Ren'Py、Twine / SugarCube：

- Yarn Spinner 的 function / command 分离很接近 Inscape 想要的方向：读值与做事分开，宿主实现留在游戏代码里。
- Ink 支持变量、外部函数和 story state 保存，说明叙事 Runtime 可以有自己的状态，但要小心不要把业务逻辑全吸进脚本。
- Ren'Py 是完整 VN 引擎，保存、回滚、Python 表达式都很强，但这不适合作为 Inscape 当前阶段的默认边界。
- Twine / SugarCube 的历史状态通常有数量限制，说明“无限历史 / 完整世界回放”不应成为默认存档模型。

结论不是照抄某一个竞品，而是采用更保守的组合：

```text
像 Yarn 一样分清 read 和 action。
像 Ink 一样允许 Runtime state，但先限制范围。
不要像 Ren'Py 一样一开始就把完整语言和引擎能力全打开。
历史 / 回滚要有限，不默认无限保存世界。
```

## `[]` 和 `@` 的边界

已接受的心智模型：

```text
[] = query / interpolation，只读，不做事。
@  = action / event，可以让某件事发生。
```

`[]` 不能偷偷改状态。原因不是语法洁癖，而是它会直接影响存档、Rollback、调试、回放、文本提取和本地化。作者看到 `[]` 时应该知道它只是问一个值。

`@` 可以产生副作用，但需要进一步区分：

```text
fire
发出去就继续。适合音效、轻量动画、打点。

wait
剧情暂停，等宿主完成。适合 Timeline、动画、加载、宿主 UI 选择。

handoff
剧情把控制权交给宿主，宿主稍后恢复。适合战斗、小游戏、探索、长演出。
```

当前已决定：不要为了低优先级 Rollback / Replay 在第一版 Host Schema 里加入复杂 `rollbackPolicy`、`replayPolicy`、`receiptPolicy`。第一版先采用保守默认：Trace Replay 不真实重放 action，只展示记录；Rollback 遇到改变宿主状态的 action 默认作为 barrier，未来只有宿主明确提供 checkpoint / undo / idempotency 机制时才放开。

## 条件表达式已定的范围

用户已明确接受：

- 支持 `and`、`or`、`not`。
- 支持括号。
- 支持比较运算。
- 支持字符串、数字、bool。
- 不支持数组和列表。
- 暂不支持复杂表达式。

“复杂表达式”在本轮讨论中具体指：

```text
数学表达式
字符串拼接
三元表达式
集合判断
链式对象访问
赋值
await
lambda / 回调
在条件里触发动作
```

重要细节：在“查询”这件事上，脚本层不关心宿主侧是否真的调用了函数。`has_item("key")` 可以是函数、表查找、缓存、生成 dispatcher 或测试值。作者面对的是 query contract，不是宿主实现细节。

条件表达式落点也已形成倾向：

```text
第一刀：选项条件
第二刀：条件跳转 / 边条件
第三刀：节点入口条件
最后：行级条件
```

选项条件倾向写法：

```inscape
- [has_item("silver_key")] 用银钥匙开门 -> gate_open
- [trust("mira") >= 3] 请求 Mira 帮忙 -> ask_mira
- 离开 -> leave
```

条件跳转倾向写法：

```inscape
? [has_item("silver_key")] -> gate_open
? [lockpick_level() >= 2] -> gate_pick
-> gate_locked
```

多个条件从上到下匹配，第一条 true 生效；没有任何 true 且没有默认跳转时，Runtime 报错。选项条件在展示选项时采样并冻结本次选项列表；跳转条件在执行到跳转组时采样。

## Query 来源：delegate 是主路，snapshot 降级

讨论前曾有三类说法：

```text
internal query
snapshot query
delegate query
```

后来修正为更准确的两层分类：

```text
数据归属：
- Inscape-owned narrative facts
- Host-owned gameplay/business facts

外部数据交付方式：
- delegate
- mock
- recorded
- snapshot as implementation detail
```

最终倾向：

```text
正式运行：delegate query
编辑器预览 / 测试：mock query
调试复现 / Trace Replay：recorded query
snapshot：低优先级，不作为每帧同步主链路
```

为什么 snapshot 降级：

- 如果 snapshot 每帧传，它和 delegate 用途高度重叠。
- 每帧同步会让 Inscape 看起来拥有宿主真相，实际却只是缓存，容易制造两份真相。
- 宿主可以在 delegate 内部用缓存或预计算，这不需要暴露给脚本语言。

snapshot 仍可作为低优先级实现细节：

- 进入一段剧情前传入稳定上下文包。
- 昂贵查询由宿主提前批量准备。
- 测试和编辑器预览手填值。
- recorded query 本质上也是历史时刻的“固定结果”。

不要把 snapshot 设计成“上层每帧 tick 把世界同步给 Inscape”的正式架构。

## 内部状态：可以有，但只限叙事运行事实

用户已接受可以做内部状态，但范围必须窄。

适合 Inscape 自己存和查：

```text
current_node()
previous_node()
entered_from(nodeId)
visited(nodeId)
visit_count(nodeId)
first_visit(nodeId)
seen(lineId)
seen_any(...)
seen_all(...)
choice_made(choiceId)
choice_count(choiceId)
last_choice(nodeId)
log / backlog
rollback stack
```

不适合默认由 Inscape 拥有：

```text
has_item("key")
quest_stage("main")
trust("mira")
npc_alive("mira")
player_level()
gold()
combat_result()
```

这些业务状态理论上可由项目显式选择交给 Inscape，但默认不这样做。原因是它们通常会被任务、背包、战斗、UI、成就、服务器或宿主存档共同使用，一旦 Inscape 也拥有一份，就容易和宿主系统抢权威。

第一版可以有内建只读内部查询函数，不做用户自定义内部变量系统，也不做会修改状态的内部函数。

## 存档关系：宿主权威，Inscape 是子状态

这是本轮重要结论之一，不能丢：

```text
正式游戏存档 = 宿主权威
Inscape state = 宿主存档里的一个子状态 blob
```

也就是说，Unity / 宿主保存游戏时，把 Inscape 当前叙事状态一起放进去。Inscape 提供：

```text
ExportState()
ImportState(state)
ValidateStateAgainstCurrentScript(state)
```

Inscape 不应该在接入宿主后自己另起正式存档槽。

例外：

- 纯 Inscape 游戏 / 独立 Runtime 可以由 Inscape 自己管理完整存档。
- 编辑器 Preview 和测试可以有临时测试存档。

普通存档不等于完整 Action 日志。正式存档应尽量保存“恢复到可继续游玩的状态”所需的最小信息，例如当前 node、执行位置、内部叙事事实、必要 receipt、随机策略状态或宿主引用、宿主 checkpoint id、版本信息。

## Log、Rollback、Trace Replay、Flashback 不能混用名字

这轮讨论最终拆出五个概念：

```text
Log / Backlog
查看聊天记录。只看已经实际呈现过的内容，不重新执行脚本。

Save / Load
正式存档。恢复当前可继续游玩的状态。

Rollback
倒退到过去关键点并继续玩。有限数量，只在内存，读档后清空。

Trace Replay
调试复现。记录选择、query 结果、随机结果、action 结果，用来解释为什么走到某个分支。

Flashback Playback
剧情表现用的回忆画面。像播放过去发生过的一段内容，不让玩家重新选择。
```

用户特别指出：

- “回放”在游戏表现语境里更像插入一段回忆闪回，优先级不高。
- “倒放 / Rollback”更像 Ren'Py 的视觉小说能力，用于玩家点太快后回退，或允许一定程度 S/L。
- Log 最常见、最低成本，只需要记录已显示内容。
- 特殊倒放，例如时空穿越式玩法，应交给具体游戏定义，优先级低。

当前倾向：

- Log 默认 `speaker`、`text`、`lineId`。
- 选项是否写入 Log 可配置；默认 UI 可以不显示，但开发模式或项目需要时应能记录 presented choices / chosen choice。
- Rollback checkpoint 默认每次显示文本前建立；显示选项前也必须能作为点。
- Rollback 栈有限、只在内存、读档后清空。
- 跨宿主破坏性 action 时要么要求宿主 checkpoint，要么阻止 rollback 跨越。

## 回放与完整世界重现

需要继续保持这个边界：

```text
Inscape Trace Replay 可以解释剧情为什么这么走。
完整游戏世界重现必须由宿主当权威。
```

Inscape 可以记录：

```text
玩家选了哪个选项
当时 query 返回什么
随机结果是什么
发出了哪个 @ action
action 返回成功 / 失败 / 取消
走到了哪个 node
```

但 Inscape 不能完整还原 Unity 世界：敌人死没死、物体位置、Timeline 播放状态、网络返回、战斗过程、物理状态都在宿主那边。

所以完整游戏回放需要宿主 checkpoint、输入重放或宿主自己的 replay 系统。Inscape 只是参与者，不是全局 replay 引擎。

## 随机数由宿主决定政策

用户明确指出：是否使用固定种子、防 S/L、乘以时间、可复现，都不应由 Inscape 替宿主判断。

Inscape 应提供策略接口，不下业务判断：

```text
host random
seeded random
time / realtime random
recorded random
```

如果随机结果影响剧情分支且需要复现，记录 receipt。是否为了公平性或防 S/L 使用不可复现随机，由宿主决定。

## Timeline / 剧情 / 玩法：同一段只有一个导演

用户提出了三种关系：

```text
Timeline 驱动剧情
剧情驱动 Timeline
两边互相驱动且都不等待
```

最终接受的判断是：

```text
同一段情节里必须只有一个导演。
```

推荐分工：

- 对话、分支、选项为主：Inscape 当导演，Timeline 是 `@action(..., wait)` 或 `fire`。
- 电影化演出为主：Timeline 当导演，通过 Signal / Marker 让宿主 Bridge 调用 Inscape，必要时暂停 Timeline 等剧情完成。
- 玩法为主：宿主 / 战斗 / 小游戏 / 探索系统当导演，Inscape 用 `handoff` 交出控制权，宿主结束后 `Resume`。

这解决了策划“一会儿配 Timeline，一会儿配剧情”的割裂问题。不是固定谁永远驱动谁，而是每段内容必须明确主控权。

## 异步适用场景

已确认异步可以有，适合：

```text
等待 Timeline 播完
等待动画 / 镜头 / 淡入淡出完成
等待宿主 UI 选择
等待大资源加载
等待服务器结果
等待战斗 / 小游戏结束
```

但要分模式：

- 短演出通常是 `wait`。
- 宿主 UI 选择是 `wait + result`。
- 战斗、小游戏、探索通常是 `handoff`。
- 服务器结果优先级低于单机，但可作为长期优势保留协议口子，必须考虑 timeout / error / cancel。

异步错误和超时已进一步收紧：P3 第一版不把异步失败设计成剧情可分支处理的普通结果。只有资源加载和网络请求的失败 / 超时在业务上比较“可理解”，但也应由宿主负责重试、fallback、断线提示或中断流程。对 Inscape 来说，`wait` / `handoff` action 失败、取消或超时都统一视为宿主异常：Runtime 抛出 / 上报 action error，错误中保留 node、lineId、action name、args、requestId 和 host error，上层决定如何处理。

因此第一版不需要为每个 action 配复杂 `failurePolicy` / `timeoutPolicy`；全局默认可以是 `throw`。

## 文本热更新与版本迁移

用户接受热更新可以有限，因为它主要服务测试，不要求完美。

当前倾向：

- `lineId` 还在：尽量停在附近。
- `lineId` 消失：提示状态失效，提供 reload all。
- Log 存 `lineId`，显示时按当前文本解析；不默认保存旧文本。
- 如果项目要旧文本历史，需要另做更高成本的文本快照能力。

状态和协议都要带版本：

```text
saveFormatVersion
runtimeVersion
scriptVersion
schemaVersion
hostProtocolVersion
```

加载时分：

- compatible：直接加载。
- migratable：显式迁移。
- incompatible：提示用户重载、回到最近可定位节点，或由宿主拒绝加载。

## Host Schema 最小形状

术语已收敛：

```text
Host Schema
= 宿主能力清单的总称。

queries[]
= Host Schema 中描述“能问什么”的部分。

actions[]
= Host Schema 中描述“能做什么”的部分。
```

不要再把 Host Schema / Action Schema 写成两个彼此独立的系统。它们可以在同一个文件里：

```json
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [],
  "actions": []
}
```

Query 第一版字段倾向：

```json
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
```

Action 第一版字段倾向：

```json
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
```

字段名取舍：

- 用 `parameters`，不用 `params`。
- 用 `returnType`，不用 `returns`。
- `mode` 放在 action 顶层。
- `idKind` 第一版就支持，但作为可选字段。
- `description` 可选，只服务 Hover / 文档，不参与执行。
- 暂不加入 `rollbackPolicy`、`replayPolicy`、`receiptPolicy`、`failurePolicy`、`timeoutPolicy`。

Schema 权威应来自上层宿主：代码标注、source generator、运行时注册导出或手写文件都可以。下层 `.inscape` 脚本不能生成权威 Schema，因为脚本只知道“用了什么名字”，不知道返回类型、副作用、rollback 安全性或宿主内部实现。

## Usage / Requirement Manifest

下层可以生成的不是权威 Host Schema，而是机器可读的 Usage / Requirement Manifest：

```text
Host Schema
宿主说：我能提供什么。

Usage Manifest
剧本说：我实际用了什么。

Audit
工具对账：剧本用的，宿主有没有提供，Bridge 有没有映射。
```

Usage Manifest 不是运行时执行契约，也不只是给人看的文档。它用于 audit、CI、Bridge TODO 生成、编辑器提示和 source jump。

倾向格式名：

```text
inscape.usage
```

命令入口倾向：

```powershell
inspect-usage-project <root> -o usage.json
audit-host-integration-project <root> -o report.json
```

`inspect-usage-project` 只扫描剧本实际用了什么；`audit-host-integration-project` 读取 Usage + Host Schema + Host Bridge 做对账。

Usage 第一版应记录：

- query / action 名称。
- 可读取的字面量参数。
- source location。
- context，例如 `choice-condition`、`conditional-jump`、`action-line`。
- 结合 Schema 后推导出的 required ids，例如 `item:silver_key`、`timeline:mira_reveal`。

下层可以根据 Usage 生成待补全 Bridge 模板，但不能因为脚本写了 `[has_itme("key")]` 就把拼错的 `has_itme` 当成宿主能力。Audit 应报告 unknown query。

## Runtime State 第一版边界

P3 第一刀不做完整正式存档系统。目标是：

```text
必须输出 Runtime State 设计文档。
可以实现最小 shape / model / smoke。
不实现完整 Save/Load 产品体验。
不实现完整 Rollback / Trace Replay / Flashback。
```

`ExportState()` 第一版最小模型倾向包含：

```text
format / formatVersion
runtimeVersion
scriptVersion
position: nodeId / lineId / commandIndex
flow: entryNodeId / stack
facts: visitedNodes / seenLines / choices
random: policy 或 seed/state
host: checkpointId
```

普通 Runtime State 不默认包含完整 Log，不默认包含完整 query/action trace。Log / Backlog、Rollback Stack、Trace 都应该是独立状态或可选调试产物。普通存档只存继续剧情所需的最小叙事状态。

`ValidateStateAgainstCurrentScript()` 倾向输出：

```text
compatible
migratable
incompatible
```

它只报告能否加载、能否迁移、失败原因和可能的附近位置，不应静默修状态。

P3 Round 11 已按该边界落地最小 Runtime State model / smoke：`NarrativeRuntime.ExportState()` 输出上述 shape，`ValidateStateAgainstCurrentScript()` 输出 compatible / migratable / incompatible 报告；普通 Runtime State 仍不默认包含完整 Log、完整 Rollback stack 或完整 query/action trace。P3 Round 12 已进一步用最小端到端 smoke 串起 Host Schema、Host Bridge、Usage Manifest、Host Integration Audit、条件 IR 与 Runtime State export / validate。P3 final validation 已于 2026-06-18 通过，结论见 [SelfHostedEditor P3 Final Validation Report](self-hosted-editor-p3-final-validation-report.md)。

## ADR 需求

这批决定已经超过普通 TODO，应新增 ADR：

```text
ADR 0021: P3 Runtime and Host Capability Boundary
```

ADR 应记录：

- `[]` 只读，`@` 做事。
- Host Schema 统一包含 `queries[]` 与 `actions[]`。
- delegate query 是正式运行主路，snapshot 降级。
- Inscape 只默认拥有叙事运行事实。
- 宿主存档是权威，Inscape state 是子状态。
- Timeline / 剧情 / 玩法按单导演控制权交接。
- Rollback / Replay 精细 policy、用户自定义内部变量、Presentation IR 后置。

## P3 之后的阶段口径

2026-06-18 进一步确认：P3 之后不要直接跳到高级回放、Flashback 或 Presentation IR。当前只正式确认到 P4；P5 是中期候选，后面的内容只作为方向池停车场，避免反向污染 P3 / P4。

```text
近期明确：
P3  第二版语法 / Host 能力 / Runtime State 最小合同
P4  Runtime 可玩化

中期候选：
P5  SelfHostedEditor Runtime authoring / 产品化接入

后置方向池，不是当前正式排期 phase：
- Unity / Host SDK 第一版
- Rollback / Trace / 高级运行时调试
- Presentation IR / 跨引擎 / 独立 Inscape Runtime
```

P4 的核心不是“做完整 Runtime 大版本”，而是让一条剧情能稳定运行到可验证状态：

- Runtime 真正执行 P3 条件表达式。
- 接入 delegate query provider，并保留 mock / recorded values 用于测试、预览和调试复现。
- 接入 action dispatcher，支持 `fire` / `wait` / `handoff` 的最小执行与 pending / resume 状态。
- 纳入 Log / Backlog。默认记录 `speaker`、`text`、`lineId`；选项记录作为可选扩展或开发模式信息。
- 做普通 Save / Load 的子状态 blob：正式项目中宿主仍是存档权威；Inscape 只导出 / 导入自己的叙事状态。
- 支持 editor preview / 测试用临时存档，但不把纯 Inscape 独立游戏的完整存档产品放进 P4 第一刀。

P5 再把这些 Runtime 能力变成作者可用的 SelfHostedEditor 产品体验：条件 / action 提示、Usage / Audit 面板、Runtime Inspector、mock query 编辑、运行错误展示和 Runtime-backed preview。

Unity / Host SDK 方向池包含 Attribute / source generator / Editor 扫描、Host Bridge 生成或配置、Unity Runtime Host adapter、Timeline hook 与 Bird 回归样例。Bird 仍只是参考适配器，不能回灌为通用 Core 规则。

高级运行时调试方向池包含有限内存 Rollback、Rollback barrier、Trace Replay、recorded query / action receipt、调试 replay 和 Flashback Playback。P3 / P4 不应为了这些低优先级能力提前把 Host Schema 或 Action Schema 做胖。

更远的表现层 / 跨引擎方向池包含 Presentation IR、Timeline 是否成为 Inscape 表现层、非 Unity runtime、Web / Godot / Bevy / 自研轻量演出层等目标。

P4 开始前仍需要细化三件事：

1. Runtime MVP 验收样例：至少覆盖条件选项、条件跳转、delegate query、mock query、`fire` action、`wait` action、`handoff` action、保存和恢复。
2. query receipt 粒度：第一刀优先记录影响分支、条件跳转和选项可见性的 query；文本插值 query 可先作为调试 trace / preview 信息。
3. Runtime Inspector 边界：允许改 mock query / 测试值，不直接改正式 Runtime state。

## 仍待后续细化

核心方向已经可以停止发散。P3 执行阶段仍需要细化：

1. Host Schema JSON Schema 与现有 `events[]` 到 `actions[]` 的迁移 / 兼容口径。
2. 条件语法的 parser / IR 细节。
3. Usage Manifest 的准确 JSON shape 与 audit report shape。
4. Runtime State 最小模型已在 P3 Round 11 落地；P3 Round 12 已完成 Host Schema、Usage、Audit、条件语法和 Runtime State 的最小端到端 smoke。
5. P3 第一刀最终验证已通过；P4 开始前仍需细化 Runtime MVP 验收样例、query receipt 粒度、action pending / resume payload 与 Runtime Inspector 边界。
6. 是否允许非常受限的用户自定义叙事局部变量。

## 未来 session 不要误读的点

- 不要把 snapshot 重新升级成生产主链路。正式运行主路是 delegate，mock / recorded 服务工具和复现。
- 不要把 Inscape 内部状态理解成“可以接管好感度、任务、背包”。默认只管叙事运行事实。
- 不要把普通存档理解成完整 action trace。普通存档是恢复可玩状态，trace 是调试复现。
- 不要把 Flashback Playback、Trace Replay、Rollback、Log 混成一个“回放功能”。
- 不要让 Timeline 和 Inscape 无边界互相驱动。每段内容必须明确谁是导演。
- 不要让 Compiler 依赖宿主 schema、Unity、Bird 或项目内部 ID。Host Schema / Host Bridge / Runtime Host 仍是分层边界。
- 不要把 `actions[]` 当成新的独立 Schema 系统；它是 Host Schema 的动作部分。
- 不要为了低优先级 Rollback / Replay 提前把 action policy 字段塞满。
- 不要把 Usage Manifest 当成宿主能力真相；它只是剧本需求清单。
