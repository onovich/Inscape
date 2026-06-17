# Stable Node ID Contract

状态：Accepted

最后更新：2026-06-17

本文完成 `/goal` Goal 1：把 [ADR 0013](adr/0013-author-title-and-stable-node-id.md) 落成可实现的数据契约。它只定义身份、落盘和迁移规则，不改变 parser 行为。

Goal 0 后，`:: node.name` 不再是当前 parser / editor 主路径。本文保留 `::` 到 `#` 的离线迁移策略，但不要求任何运行时兼容期。

2026-05-19 补充：Goal 10 的第一刀已经落地 `update-node-map-project`。当前实现会创建/读取/更新 `inscape.node-map.json`，按当前标题精确命中复用 stable node id，把消失节点标成 `missing`，并把 sidecar 内重复 `id` / `title` 标成 `conflict`。source/content/neighbor 指纹已开始落盘；同日又补了第一版“保守自动重命名识别”：当 `sourcePath` 稳定，且 content / neighbor / line anchors 能形成唯一候选时，会复用旧 id 并把旧标题写入 `previousTitles`。VSCode 当前也已新增显式 `Inscape: Update Stable Node Map` 入口，并会把活动未保存 `.inscape` 文档通过 `--override` 传给 CLI。Goal 10.2.3 现已落地：`update-node-map-project --report` 会输出 `inscape.node-map-update-report`，列出 `renamed`、`new`、`missing`、`conflict` 与 `manual-review` 项；VSCode 也提供显式 `Inscape: Review Stable Node Map Changes` 入口。

2026-06-02 补充：manual-review 候选应用语义已落地为 Tooling 共享动作与 CLI `apply-node-map-candidate-project`。该动作只执行作者明确选择的候选：把候选 stable id 应用到当前标题，继承候选历史标题，追加候选旧标题，并移除重复候选条目。VSCode 已改为调用该共享命令；SelfHostedEditor 后续若需要 apply UI，也应复用该命令或同一 Tooling action。

2026-06-17 P2 补充：SelfHostedEditor 已完成 stable node map review/apply 的 P2 可审计闭环。manual-review candidate 的 evidence、apply preview、dry-run/apply result、backup metadata 与 recovery hint 继续由 `Internal/Tooling` / CLI 产生；SelfHostedEditor 只 compact payload 并显示 UI。dev-host HTTP 路径保持 download-ready，不写工作区 sidecar；Electron desktop 路径必须先由用户显式 `Confirm Apply`，再调用 `workspace.write-back-backup`，最后通过 desktop-only `stable-node-map.write-sidecar` 写回。P2 不实现 batch review / multi-apply；后续若重启批量能力，必须先补共享 Tooling / CLI batch dry-run、batch result、per-item failure 与 rollback contract，宿主不能循环单候选 apply 来伪造批量语义。

## 目标

Inscape 块语法使用 `# 标题`。标题是作者界面的主身份，适合写作、跳转、补全、大纲和预览；stable node id 是系统身份，适合本地化锚点迁移、外部引用、Runtime 存档和 Host Bridge 输出。

核心规则：

- 标题在同一 Inscape project 内唯一。
- stable node id 不直接等于标题。
- 标题改名不应导致本地化、外部引用和存档身份全断。
- 作者默认不需要手写机器 ID。
- 歧义必须可见，不能静默猜错。

## 文件位置

第一版采用项目 sidecar 文件：

```text
inscape.node-map.json
```

默认放在项目配置文件同目录；如果没有 `inscape.config.json`，则放在 workspace root。后续可以在 `inscape.config.json` 增加显式路径：

```json
{
  "nodeMap": "inscape.node-map.json"
}
```

不建议把 stable id 默认写进 `.inscape` 正文。显式 `@id` 只作为高级修复手段，用于合并冲突、外部系统强绑定或 sidecar 丢失后的人工恢复。

## JSON 契约

```json
{
  "format": "inscape.node-map",
  "formatVersion": 1,
  "nodes": [
    {
      "id": "node_01HX7S8E4Q3M8A6V9K2P4N7B5C",
      "title": "法庭开场",
      "previousTitles": ["court_intro"],
      "sourcePath": "story/court.inscape",
      "sourceLine": 1,
      "sourceCharacter": 0,
      "firstContentFingerprint": "sha256:...",
      "neighborFingerprint": "sha256:...",
      "lineAnchorSamples": [
        "line-v1:..."
      ],
      "status": "active",
      "createdAt": "2026-05-17T00:00:00Z",
      "updatedAt": "2026-05-17T00:00:00Z"
    }
  ],
  "tombstones": [
    {
      "id": "node_01HX7S8E4Q3M8A6V9K2P4N7B5D",
      "lastTitle": "废弃开场",
      "lastSourcePath": "story/court.inscape",
      "deletedAt": "2026-05-17T00:00:00Z"
    }
  ]
}
```

字段语义：

- `id`：系统稳定身份。建议使用不依赖排序、冲突概率极低的随机 ID，例如 ULID / UUIDv7 风格，并加 `node_` 前缀。
- `title`：当前作者可见标题，项目内唯一。
- `previousTitles`：已确认的历史标题，用于重命名迁移和人工审查，不作为当前跳转目标。
- `sourcePath`：相对项目根目录路径，只作识别线索，不参与 stable id 本身。
- `sourceLine` / `sourceCharacter`：0-based editor location，只作识别线索。
- `firstContentFingerprint`：节点内前几条可本地化文本、metadata、jump 的归一化摘要。
- `neighborFingerprint`：前后节点标题 / id / 内容摘要形成的上下文线索。
- `lineAnchorSamples`：该节点最近一次导出的若干行级 anchor，用于本地化迁移和重命名识别。
- `status`：`active`、`missing`、`conflict`、`tombstoned`。
- `tombstones`：删除记录。删除节点不应立刻永久丢弃 stable id。

## ID 生成

新节点首次登记时生成 stable node id。生成动作只发生在明确的项目索引 / 迁移 / 编辑器创建流程中，不发生在纯 parser 阶段。

推荐格式：

```text
node_<ULID-or-UUIDv7-without-punctuation>
```

要求：

- 不从标题派生。
- 不从文件路径派生。
- 不从行号派生。
- 同一项目内唯一。
- 能被 JSON、CSV、Runtime 存档和 Host Bridge 安全传输。

## 匹配流程

工具更新 node map 时按以下顺序匹配新扫描到的 `# 标题` 节点：

1. **显式 ID 命中**：如果节点内存在未来兼容的 `@id node_xxx`，且 map 中存在同 id，直接匹配。
2. **标题命中**：当前标题在 map 中唯一命中 active 节点，直接匹配。
3. **source range 命中**：标题已变化，但 source path 与原位置附近命中，且内容摘要相似，可以自动视为重命名。
4. **内容 / 邻居命中**：标题和位置都变化，但 `firstContentFingerprint`、`lineAnchorSamples`、前后节点上下文有高置信匹配，可以标记为 rename candidate。
5. **人工确认**：多个候选或置信度不足时，标记 `conflict`，由 VSCode 或 CLI report 要求用户确认“这是重命名旧节点，还是新节点”。
6. **新节点**：无匹配候选时生成新 stable id。

## 自动迁移与人工确认

可以自动迁移：

- 标题改名，但 source path 与位置附近稳定，内容高度相似。
- 文件移动，但标题唯一且内容摘要高度相似。
- 节点前插入新节点，导致 source line 改变，但标题唯一。
- 通过离线迁移工具把 `:: node.name` 迁到 `# 标题`，且旧 node name 与新标题通过迁移工具明确对应。

必须人工确认：

- 同时改标题、移动文件、大改内容。
- 一个旧节点匹配到多个新节点。
- 多个旧节点都可能匹配同一个新节点。
- sidecar 中存在冲突 id。
- Git 合并后两个分支新增相同标题。
- 用户手写 `@id` 指向不存在或已 tombstoned 的 id。

不能自动迁移：

- 项目内出现重复当前标题。应报 duplicate title diagnostic。
- 两个 active map entries 使用同一个 stable id。应报 map conflict。
- stable id 格式非法。应报 map format diagnostic。

## 删除与恢复

当节点从源码中消失时，不立即删除 map entry，而是：

1. 将 `status` 标为 `missing`。
2. 记录最后位置和最后标题。
3. 在后续明确确认删除时移动到 `tombstones`。

如果后续又出现高置信匹配的节点，可以从 `missing` 或 `tombstones` 恢复原 stable id，但 `tombstones` 恢复必须有人工确认或显式 `@id`。

## Git 合并策略

node map 是可版本控制文件。合并策略：

- 不要求按 source line 排序，建议按 `title` 或 `id` 稳定排序，降低 diff 噪声。
- 合并后如果出现重复 `id`，标记 `conflict`。
- 合并后如果出现重复 `title`，Compiler / LanguageServer 报 duplicate title diagnostic。
- 两个分支各自新增同标题节点时，不自动改标题；由用户保留一个标题，另一个改为 `_01` 或更合适标题。

## `:: node.name` 离线迁移

旧语法中的 `node.name` 视为 legacy title seed，而不是未来 stable id。Goal 0 后，不保留 parser 兼容期；迁移只通过离线工具或人工编辑完成。

迁移工具第一版规则：

1. `:: court_intro` 迁为 `# court_intro`，保留原写法可读性最强。
2. 如果用户提供标题映射，可以迁为 `# 法庭开场`，并把 `court_intro` 放入 `previousTitles`。
3. 所有 `-> court_intro` 暂迁为 `-> court_intro` 或映射后的标题。
4. 迁移完成后生成 / 更新 `inscape.node-map.json`，为每个节点登记 stable id。
5. 迁移报告列出所有旧 `::` 来源，不要求 Compiler 或 VSCode 在主路径继续识别旧语法。

迁移输出 IR 不需要携带 `legacyName` 字段。若某个离线报告需要记录旧名，应保存在迁移报告或 `previousTitles` 中。

## 分层边界

- Compiler：解析标题、诊断重复标题、在输入提供 node map 时把标题解析为 stable node id；不负责扫描文件系统寻找 sidecar。
- Tooling：读取 / 更新 `inscape.node-map.json`，执行项目扫描、迁移识别和冲突报告。
- CLI：提供显式命令，例如 `update-node-map-project` 与 `apply-node-map-candidate-project`，负责 sidecar 输出、`inscape.node-map-update-report` 审查报告和人工候选应用写回；如后续需要离线迁移器，再单独增加 `migrate-node-titles-project`。
- LanguageServer：消费 Tooling 契约，提供编辑器 diagnostics、rename candidates 和 quick fix。
- VSCode：提供创建标题 `_01` 自动编号、显式 stable node map 更新命令、显式 `Review Stable Node Map Changes` 审查入口、跳转、预览、backup / revert 等宿主体验；candidate apply 语义调用共享 CLI，不在扩展 JS 内改写 node map。
- SelfHostedEditor：通过共享 CLI / Tooling contract 展示 stable node map review 与 candidate apply preview；dev-host 只提供 downloadable payload，Electron desktop 在人工确认后先调用 `workspace.write-back-backup`，再通过 desktop-only `stable-node-map.write-sidecar` 写回 node-map sidecar。
- Runtime：只消费编译结果中的 stable node id 和 display title，不读取源码或 sidecar。

## Goal 1 自检

- G1.1 已完成：本文定义了 stable node id / title map JSON 契约。
- G1.2 已完成：本文定义了标题重命名识别流程和人工确认边界。
- G1.3 已完成：本文定义了 `:: node.name` 到 `# 标题` 的离线迁移策略；Goal 0 后不保留主路径兼容。
- 本节点只改文档，不改 parser、Compiler、VSCode 或 Runtime 行为。
