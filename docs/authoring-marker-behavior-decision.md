# Authoring Marker Behavior Decision

状态：F1.5 决策结论

最后更新：2026-05-16

本文承接 [Authoring Marker Contract](authoring-marker-contract.md) 与 [Authoring Marker Compatibility Audit](authoring-marker-compatibility-audit.md)，评估旧 `[kind: alias]` / `[timeline: alias]` 行为是否需要立刻调整。本文是 F 阶段历史决策记录；Goal 0 后，当前主路径已删除旧 inline host binding 行为，不再按本文的“继续保留 fallback”执行。

## 结论

F1.5 不立刻删除旧行为。

当前长期边界冻结为：

1. Compiler 继续只把整行 `[...]` 识别为 metadata，不在 Compiler 内解释 generic `[kind: alias]` 的宿主语义。
2. UnitySample / Bird 兼容层只继续把 `timeline` / `timeline.<phase>` 的 bracket 写法当作 legacy Timeline Hook 导出，不扩展 generic `[kind: alias]` 为通用宿主事件。
3. VSCode 继续对 legacy `[kind: alias]` 提供补全、Hover 和 Ctrl+Click fallback，但文案必须明确它是旧 inline host binding fallback，不是新推荐语法。
4. 新写法继续使用 `@` 表达事件、动作、时机和状态变化，使用 `[]` 表达查询、读取和文本插值。

一句话：旧行为保留在兼容层，新语义不继续沿旧外壳扩张。

## 当前行为事实

### Compiler

`Inscape.Compiler` 当前的 parser 只在这一层面认识 bracket 行：

```text
[...]
```

如果一整行以 `[` 开头并以 `]` 结尾，它会被归类为 metadata。Compiler 不解析 `kind`、`alias`，不读取 Host Bridge，也不判断该 tag 是否指向资源或事件。

这符合 Core 边界：Compiler 是 DSL / StoryGraph 真相层，但不是宿主绑定解析器。

### VSCode

VSCode 的 `HostBindingProvider` 会识别：

```inscape
@timeline court_intro
@timeline.node.enter court_intro
[timeline: court_intro]
[bg: courtroom]
```

它的职责是作者体验：补全、Hover、定义跳转和旧项目维护。它可以读取 `hostBridge` 或 legacy `unitySample.bindingMap`，但不能把这些提示升级为 Compiler 语义。

因此 VSCode 可以继续保留 generic `[kind: alias]` fallback，但只能被描述为 legacy authoring hint。

### UnitySample / Bird 兼容层

UnitySample 当前只把 timeline key 解析为 host hook：

```inscape
[timeline: court_intro]
[timeline.node.exit: court_outro]
```

`[bg: courtroom]`、`[emotion: tense]` 或其他 generic `[kind: alias]` 不会被 UnitySample 自动导出为 `hostHooks`。它们可以作为旧脚本里的 metadata / 编辑器提示存在，但不应获得新的 adapter 语义。

## 为什么不现在删除

不立刻删除旧行为有三个原因：

- 旧项目和回归样例仍依赖 bracket timeline。
- VSCode 的 fallback 能帮助维护旧脚本和定位旧 binding map。
- 直接删除会把“语义设计收敛”和“破坏性迁移”混在同一提交里，回归定位会变差。

但不删除不等于继续推荐。F1 之后新增能力必须走新边界：

- 事件 / 动作 / 时机：`@...`
- 查询 / 插值：`[...]`
- 宿主映射：Host Schema / Host Bridge

## 后续迁移规则

后续如果要进一步收紧行为，按这个顺序执行：

1. 先新增新规范样例，覆盖 `@timeline.<phase>` 与真实 Host Bridge 配置。
2. 再给 legacy bracket timeline 增加 warning 或迁移报告，而不是直接报错。
3. 再为 VSCode 增加 legacy 项目模式或配置开关，逐步限制 generic `[kind: alias]` fallback 的默认面。
4. 最后才考虑调整 Compiler 对整行 `[...]` metadata 的处理。

任何一步都必须保留旧回归，直到有明确迁移路径。

## 命名与分层自检

- 本决策不新增代码类型，不触碰命名空间。
- Compiler 仍不依赖 Unity、VSCode、HTML、Bird、Addressables、Tooling、Cli、LanguageServer、Runtime 或 ExternalSupport。
- Internal / ExternalSupport 边界不变：VSCode 是 ExternalSupport 下的编辑器扩展作者体验层，UnitySample 是 ExternalSupport 兼容样例。
- `[]` 的新语义不绑定具体业务实体；查询能力仍应由 Host Schema / Host Bridge 声明与映射。
