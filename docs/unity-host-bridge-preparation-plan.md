# Unity Host Bridge Preparation Plan

状态：草案，F 阶段 Unity 相关准备计划

最后更新：2026-05-16

本文只做 Unity / Host Bridge 生成化的准备和计划，不进入研发实现。按照当前约束，Unity 相关工作必须等 Host Schema、Host Bridge、Runtime Host、adapter 代码生成方案进一步落实后，再开始改代码。

## 当前结论

Unity 方向暂时停在准备阶段：

```text
Plan first.
Use UnitySample as regression reference.
Do not implement Attribute scanning yet.
Do not generate Unity code yet.
Do not change ExternalSupport behavior yet.
```

现有 `src/ExternalSupport/UnityPlugin` 继续作为 ExternalSupport 过渡样例，而不是最终架构。

## `[Inscape]` Attribute 扫描准备

候选目标是让 Unity 项目用 Attribute 声明哪些成员可以暴露给 Inscape：

```csharp
[InscapeQuery("player.gold")]
public int GetPlayerGold()
{
    return wallet.Gold;
}

[InscapeEvent("timeline.talking.exit")]
public void PlayTimeline(string alias)
{
    director.Play(alias);
}
```

准备阶段只确认以下设计点：

- Attribute 只存在于 Unity 项目或 Unity 支持包，不进入 `Inscape.Compiler`。
- Attribute 扫描结果生成待确认桥接表，而不是直接改 `.inscape`。
- 生成表中的 Inscape ID 必须可读，例如 `player.gold`、`timeline.talking.exit`。
- Unity 内部类型名、方法名、GUID、Addressable key、资源路径只出现在 Host Bridge 或生成物，不进入 DSL 正文。
- 扫描器应作为 Unity Editor 工具运行，不进入默认 `Inscape.slnx` 编译链。

暂不实现：

- 不新增 Attribute 类型。
- 不新增 Unity Editor 扫描器。
- 不新增 Roslyn / 反射扫描逻辑。
- 不修改 UnitySample importer。

## Host Bridge 到 Adapter 生成闭环

未来最小闭环建议是：

1. Unity 项目声明 Attribute 或手写候选能力。
2. Unity Editor 工具扫描项目，生成待确认 Host Schema / Host Bridge 草案。
3. 人工确认 Inscape 可读 ID、query / event 描述、资源别名和 handler 映射。
4. Inscape 脚本只引用可读 ID。
5. Adapter / Runtime Host 根据 Host Bridge 生成 dispatcher 或 binding table。
6. UnitySample 当前 manifest / CSV / warning 行为作为回归样例。

第一版 generator 应生成“待确认表”，而不是直接生成最终业务代码。这样可以避免把项目内部命名、临时资源路径或错误推断写进长期 DSL。

## UnitySample 作为回归样例

UnitySample 当前可用来验证：

- speaker / role map 迁移。
- binding map 迁移。
- timeline hook phase。
- unresolved host hook warnings。
- export manifest 和 CSV 输出。
- merge l10n 的兼容流程。

未来替代硬编码样例结构时，应保持这些回归点：

- 同一 `.inscape` 样例能导出等价的 host hooks。
- 缺失绑定仍产生审查报告，而不是静默跳过。
- `unitySample` 配置字段只作为 ExternalSupport 样例命令输入；VSCode 编辑器扩展作者体验不再把它作为 Host Bridge fallback。
- ExternalSupport 不反向污染 Internal / Compiler。

## Unity 上层消费模型

当前不提前决定唯一消费模型，保留三种候选：

```text
direct-event: Inscape runtime emits events, Unity handler immediately reacts.
polling-state: Unity polls narrative state and decides how to react.
hybrid: important hooks use events, UI/state sync uses polling.
```

建议第一版采用 hybrid 作为设计假设：

- `@timeline.talking.exit` 这类明确时机 hook 适合 direct-event。
- 文本、当前节点、选项、历史路径适合 polling-state 或 explicit state sync。
- `[player.gold]` 这类 query 应由 Runtime Host 在进入文本前准备值，不由文本渲染时直接触发 Unity 业务。

正式研发前需要补齐：

- Runtime Host 如何暴露当前节点 / 当前行 / hook phase。
- Unity handler 是否允许异步。
- handler 失败时是 warning、fallback、跳过还是中断。
- 运行时重放 / 存档恢复是否重新触发事件。

## 暂停条件

出现以下任一情况时，不应进入研发实现：

- Host Bridge 字段仍不足以表达 query handler / event handler。
- Runtime Host 生命周期还不能说明事件触发时机。
- Attribute 命名无法避免暴露 Unity 内部 API 给 DSL。
- UnitySample 回归点尚未整理成验收清单。
- 还未决定 generated dispatcher 与手写 bridge 的共存策略。

## 后续研发前置节点

研发前建议先完成：

1. Host Bridge query / event handler 字段草案。
2. Unity Attribute 命名与扫描输出草案。
3. Generated dispatcher 与 manual bridge 的合并规则。
4. UnitySample 回归清单。
5. Runtime Host hook phase 与 replay 策略。

完成这些设计后，再进入 Unity Editor 工具或 ExternalSupport 代码实现。

## 自检结论

- 本文没有新增 Unity 代码或 Attribute。
- 本文没有修改 ExternalSupport 行为。
- 本文没有让 Compiler 依赖 Unity 或 Host Bridge。
- 本文只把 Unity 相关任务收敛为准备、计划和研发门槛。
