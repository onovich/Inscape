# Host Integration Partner Readiness 决策简报

状态：供技术负责人知情与拍板

日期：2026-06-21

读者：Inscape 技术负责人 / 架构负责人

关联材料：

- `docs/sinan-cooperation/rfc-005-sinan-inscape-narrative-bridge.md`
- `docs/sinan-cooperation/sinan-technical-advisory-2026-06-20.md`
- `docs/sinan-cooperation/inscape-review-for-sinan-technical-lead-2026-06-20.md`
- `docs/post-p5-next-direction-decision-brief.md`

## 1. 需要拍板的结论

建议批准 Inscape 启动一个新的短阶段：

```txt
Host Integration Partner Readiness
```

这个阶段的目标不是接入 Sinan Runtime，也不是为 Sinan 做专属功能，而是把 Inscape 已有的 Host Schema / Host Bridge / Usage Manifest / Host Integration Audit 能力整理成可被外部宿主项目消费和验证的集成契约。

Sinan 可以作为本阶段的第一个真实 partner profile / fixture，但不得成为 Inscape core dependency。

## 2. Sinan 最新反馈摘要

Sinan 侧阅读 Inscape review 后，给出的结论是：

```txt
Inscape-side Host Integration Partner Readiness: GO.
Sinan / Inscape Static Artifact POC planning: GO.
Sinan-side runtime integration: HOLD.
Runtime Preview Bridge: HOLD.
Hard dependency: NO.
```

这说明双方已经对齐以下边界：

```txt
Inscape owns narrative authoring truth.
Sinan owns game runtime truth.
Bridge owns translation evidence.
```

Sinan 明确接受第一阶段只做 static artifact / dry-run / report / Host Bridge candidate，不要求 live preview、runtime state sync、hard dependency 或 Sinan core 绑定。

## 3. 对当前项目的影响

这不是架构方向改变，而是下一阶段优先级改变。

当前 Inscape 已完成 P5 SelfHostedEditor Runtime authoring / productization final validation。Post-P5 brief 中推荐的下一方向本来就是：

```txt
Host Bridge / Host Schema 自动化与代码生成收口
```

Sinan 的反馈把这个方向进一步具体化为：

```txt
Host Integration Partner Readiness
```

也就是从“内部连接层收口”升级为“外部宿主项目可消费的集成契约收口”。

## 4. 建议批准的范围

建议批准一个短阶段，范围限定为 contract、fixture、report 和 planning。

本阶段可以做：

- 定义 Inscape Integration Package 最小组成。
- 明确 Narrative Graph IR 对外稳定字段。
- 明确 source location 对外契约。
- 明确 localization anchors / CSV / anchor map 对外契约。
- 梳理 `inscape.usage` 与 Host Integration Audit 在对外集成包中的职责。
- 设计 Host Bridge candidate / manual review / generated candidate 的边界。
- 准备跨宿主 fixture，例如 minimal dialogue、branching、localization、missing speaker、unknown action、unsupported feature、source diagnostic。
- 以 Sinan 作为 partner profile 验证静态 artifact POC planning。
- 输出 POC-1 acceptance checklist 和 open questions。

## 5. 明确不批准的范围

本阶段不应进入以下事项：

- 不做 Sinan Runtime 接入。
- 不做 Runtime Preview Bridge。
- 不做 Sinan 专用 DSL 语法。
- 不让 `Inscape.Compiler` 依赖 Sinan。
- 不让 `Internal/Runtime` 依赖 Sinan TypeScript runtime。
- 不把 Sinan Director / World / Timeline / Camera / Runtime UI 语义写入 Inscape core。
- 不直接写 Sinan `data/**/*.json`。
- 不做 bidirectional edit。
- 不做 hard dependency。
- 不承诺 Sinan 成为唯一 visual host。

## 6. 推荐第一阶段交付物

建议第一阶段交付以下文档 / fixture / smoke 级产物：

1. `Inscape Integration Package Contract`
   - 定义对外 artifact 组合，而不是把所有内容塞进一个文件。

2. `Narrative Graph IR External Contract`
   - 明确外部 importer 可依赖哪些 graph 字段。

3. `Source Location External Contract`
   - 保证 report 能回到 `.inscape` 源文件与具体范围。

4. `Localization Anchor Export Contract`
   - 明确 anchor / CSV / source map 的关系。

5. `Host Bridge Candidate Contract`
   - 定义候选映射、置信度、冲突、人工确认、是否会写 host data。

6. `Static Artifact POC Fixtures`
   - 提供 5 到 7 个小样例，先于 runtime adapter 建立共同语言。

7. `Sinan Static Artifact POC Planning Note`
   - 只规划 POC-1，不实现 runtime integration。

## 7. 建议 POC 路线

### POC-1：Static Artifact Exchange / Dry-run

Inscape 输出：

- `.inscape` sample。
- Narrative Graph IR。
- source locations。
- localization anchors / CSV。
- `inscape.usage`。
- diagnostics / audit report。

Sinan 输出：

- dry-run import report。
- missing binding diagnostics。
- Host Bridge candidate。

成功标准：

- 不修改 Sinan 正式 data。
- 不引入 hard dependency。
- report deterministic / diffable。
- diagnostics 可回到 Inscape source。

### POC-2：Sinan Catalog To Host Schema / Host Bridge

Sinan 输出：

- resource catalog。
- action catalog。
- query catalog。
- timeline / cameraShot / UI target catalog。

Inscape 验证：

- 能投影为 Host Schema / Host Bridge candidate。
- 能驱动 completion / hover / diagnostics。
- 能通过 Host Integration Audit 表达 missing / unknown / ambiguous mapping。

### POC-3：One-way Generated Candidate

仅在 POC-1 / POC-2 稳定后讨论。

候选输出：

- Sinan-side generated narrative data candidate。
- localization mapping。
- import report。

必须满足：

- generated ownership 明确。
- 不覆盖手写数据。
- Sinan validation 通过。
- 可回滚。

### POC-4：Runtime Preview Bridge

继续 HOLD。

只有前三个 POC 稳定后，才讨论 preview tick、query provider、pending action、handoff、resume token、substate 与 host save/load 边界。

## 8. 风险判断

当前合作风险可控，因为 Sinan 已接受：

- runtime integration HOLD。
- Runtime Preview Bridge HOLD。
- hard dependency NO。

真正的风险在于后续范围滑坡：

```txt
static artifact POC
  -> live preview
  -> runtime state sync
  -> Sinan-specific core changes
  -> hard dependency
```

因此如果批准本阶段，需要同时批准边界扫描：

- `src/Internal` 不得出现 Sinan-specific dependency。
- Host Schema 不得新增 Sinan-only action policy。
- Compiler 不得读取 Sinan catalog。
- Runtime 不得复制 Sinan execution semantics。
- ExternalSupport / bridge 可以消费 shared contracts，但不得成为 core truth。

## 9. 对技术负责人的建议

建议批准：

```txt
Host Integration Partner Readiness: GO
```

同时明确：

```txt
Sinan Runtime Integration: HOLD
Runtime Preview Bridge: HOLD
Hard Dependency: NO
Sinan-specific Core Semantics: NO
```

这会让 Inscape 在保持 engine-agnostic 的前提下，用 Sinan 的真实需求检验 Host Schema / Host Bridge / Usage Manifest / Host Integration Audit 是否足够成熟。

## 10. 建议对外口径

可以对 Sinan 表达：

```txt
Inscape 接受 Static Artifact POC planning 的方向。
我们会在 Inscape 项目内启动 Host Integration Partner Readiness 的内部准备阶段。
第一阶段只整理 integration package、Narrative Graph IR external contract、source location、localization anchors、usage/audit report、Host Bridge candidate 和 fixtures。
Runtime integration、Runtime Preview Bridge、hard dependency 和 Sinan-specific core semantics 继续 HOLD。
```

## 11. 最终判断

Sinan 当前反馈是正向信号。它不会要求 Inscape 改变自研核心方向，反而支持我们始终坚持的 engine-agnostic 路线。

本阶段若获批准，Inscape 的重点不是“接 Sinan”，而是把“任意合格宿主如何接 Inscape”的通用契约做扎实。Sinan 只是第一个真实合作样本。
