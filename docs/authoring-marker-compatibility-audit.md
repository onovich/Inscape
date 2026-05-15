# Authoring Marker Compatibility Audit

状态：F1.2 审计结论

最后更新：2026-05-16

本文对照 [Authoring Marker Contract](authoring-marker-contract.md)，审计当前仓库里旧 `[timeline: ...]` / `[kind: alias]` / inline host binding 口径的残留。它只分类和排后续动作，不改变 Compiler、VSCode 或 UnitySample 行为。

## 审计结论

当前仓库同时存在三种口径：

1. 新规范：`@` 表达事件 / 动作 / 状态变化，`[]` 表达查询 / 读取 / 文本插值。
2. 历史实现：`@timeline ...` 与 `[timeline: ...]` 都会被当作 Timeline Hook / host binding authoring hint。
3. 历史文档示例：`[bg: ...]`、`[emotion: ...]`、`[kind: alias]` 被描述成资源别名或宿主绑定。

F 阶段迁移不应一次性删除旧行为。正确顺序是：

1. 先标记兼容残留。
2. 再迁移文档和 VSCode 文案。
3. 最后再评估是否改 parser / adapter / sample 语义。

## 分类规则

| 分类 | 含义 | 当前动作 |
| --- | --- | --- |
| `compatible` | 现有回归、旧项目或 ExternalSupport 仍依赖 | 保留行为，文档标为兼容 |
| `migrate-docs` | 面向作者的新示例或设计说明仍在推荐旧模型 | 后续改成新规范示例 |
| `migrate-tooling-copy` | VSCode / 工具提示仍把 `[]` 当 host binding 主线 | F1.3 改文案，保留 fallback |
| `defer-behavior` | 涉及 Compiler / VSCode / UnitySample 行为 | 等文案迁完后单独设计 |

## 代码与测试残留

| 位置 | 残留 | 分类 | 处理意见 |
| --- | --- | --- | --- |
| `tests/ExternalSupport/UnityPlugin/Inscape.UnitySample.Tests/TestUnitySample.cs` | `[timeline: court.close]`、`[timeline.node.exit: court.node_exit]` 等 bracket timeline 回归 | `compatible` | 保留，作为旧项目兼容测试。后续新增一个 `@timeline.<phase>` 推荐写法测试，不删除旧测。 |
| `src/Internal/VSCode/vscode-inscape/WorkspaceIndex/HostBindingProvider.js` | 识别 `@timeline...` 和 `[kind: alias]` completion / definition / hover 上下文 | `defer-behavior` | F1.3 先改 hover / completion 文案；行为继续保留 legacy fallback。 |
| `src/Internal/VSCode/vscode-inscape/WorkspaceIndex/DslScriptMetadataProvider.js` | hover 提示称 `@timeline ...` 是 host binding hint，`[kind: alias]` 是 inline equivalent | `migrate-tooling-copy` | F1.3 改成 `@timeline` 是事件挂载，bracket 只是 legacy inline host binding。 |
| `samples/court-loop.inscape` | `[bg: courtroom]`、`[emotion: tense]` 等 inline 演出标签 | `migrate-docs` | 样例目前服务预览和旧语法展示；后续需要一版新规范样例，旧样例可重命名或注释为 legacy authoring sample。 |

## 文档残留

| 位置 | 残留 | 分类 | 处理意见 |
| --- | --- | --- | --- |
| `docs/dsl-syntax-guide.md` | 最小例子和 `[]` 章节仍大量展示 `[bg]`、`[timeline]`、`[kind: alias]` | `migrate-docs` | 后续把主体示例改为 `@timeline...` + `[player.value]` 查询；旧写法移入兼容小节。 |
| `docs/dsl-language.md` | 行内标签章节仍把 `[bg]`、`[show]`、`[timeline]` 作为候选语法核心 | `migrate-docs` | 改为“历史候选 / 兼容写法”，新增查询表达式小节。 |
| `docs/quick-syntax-guide.md` | `[bg: courtroom]` 被当作快速示例 | `migrate-docs` | 后续快速指南应优先展示 `@entry`、`@timeline.<phase>`、`[player.name]`、`[itemName]`。 |
| `docs/vscode-tooling.md` | 宿主绑定提示章节仍把 `[kind: alias]` 与 `@timeline` 并列 | `migrate-tooling-copy` | F1.3 与 VSCode README 一起迁文案。 |
| `src/Internal/VSCode/vscode-inscape/README.md` | README 仍写 host binding alias completions cover `[kind: ...]` inline tag positions | `migrate-tooling-copy` | F1.3 改成 legacy inline host binding fallback。 |
| `docs/workspace-index-contract.md` | workspace index 用于 `@timeline ...`、`[timeline: ...]` | `migrate-tooling-copy` | 改为 workspace index 仍索引 legacy host binding authoring hint，不代表推荐语法。 |
| `docs/bird-adapter.md` | 明确 `[timeline: alias]` 会导出 `hostHooks` | `compatible` | 保留为 Bird / UnitySample 历史行为，补注“不推荐新写法”。 |
| `docs/host-schema.md`、`docs/host-bridge-contract.md` | 仍把 `[kind: alias]` 作为资源 / timeline 坐标服务对象 | `migrate-docs` | 后续改成 Host Bridge 服务 `@` 事件和 legacy inline host binding；`[]` 查询走 Host Schema / Host Bridge 查询实现。 |
| `docs/open-questions.md` | 仍记录需要明确 `@timeline` / `[timeline]` 是否双写 | `migrate-docs` | 改为“已决定方向，待迁移兼容残留”。 |
| `docs/regression-workflow.md` | 回归清单写 `@timeline ...` / `[kind: alias]` host binding 正常 | `compatible` | 暂保留为 legacy 回归项，避免迁移过程误删兼容行为。 |

## 迁移建议

### F1.3：VSCode 文案迁移

优先改：

- `DslScriptMetadataProvider` hover 文案。
- `HostBindingProvider` completion / hover 文案。
- `src/Internal/VSCode/vscode-inscape/README.md`。
- `docs/vscode-tooling.md`。

原则：

- `@timeline...` 显示为“host event / timing hook”。
- `[kind: alias]` 显示为“legacy inline host binding fallback”。
- 继续支持 Ctrl+Click / completion / hover，不改变现有回归。

### F1.4：作者文档迁移

优先改：

- `docs/quick-syntax-guide.md`
- `docs/dsl-syntax-guide.md`
- `docs/dsl-language.md`
- `docs/open-questions.md`

原则：

- 新示例优先展示查询插值：`[player.name]`、`[itemName]`、`[player.gold]`。
- 事件示例优先展示 `@emit`、`@grant`、`@timeline.<phase>`。
- `[bg]`、`[emotion]`、`[timeline]` 只出现在“兼容旧写法”小节。

### F1.5：行为迁移评估

等文档和工具提示迁完后再决定是否动行为：

- Compiler 是否继续收集 generic inline host binding。
- UnitySample 是否长期保留 bracket timeline 导出。
- VSCode 是否继续对所有 `[kind: alias]` 提供 host binding 补全，还是仅对 legacy 项目启用。

## F1.2 自检结论

- 本节点只新增审计文档，并更新 TODO / handoff，不改代码行为。
- 审计结果符合分层边界：Compiler 语义、VSCode 作者体验、ExternalSupport 兼容回归被分开处理。
- 命名符合文档规范：`authoring-marker-compatibility-audit.md` 使用小写连字符，主题与 F 阶段作者语法收敛直接相关。
