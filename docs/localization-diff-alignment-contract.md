# Localization Diff Alignment Contract

状态：Accepted

最后更新：2026-05-17

本文完成 `/goal` Goal 2：设计本地化 diff / alignment 迁移。它只定义后续 `update-l10n` 增强的状态机、报告和对齐规则，不改变当前 CLI 行为。

## 目标

当前 `update-l10n` / `update-l10n-project` 只按 `anchor` 精确继承旧译文，并输出 `current`、`new`、`removed`。这能保护没有变化的文本，但遇到同一节点内删一行、加一行、改一行、插入重复行时，容易把“可参考的旧翻译”变成不可见的 removed / new 分离条目。

增强目标：

- 保留 anchor 精确继承作为第一优先级。
- 对 anchor 变化但疑似同一文本演化的条目，输出候选和审校状态。
- 不自动静默复用相似文本的译文。
- 正确揭示新增、删除、改写、移动和歧义。
- 为翻译人员保留旧文本、旧译文、相似度、上下文和确认动作。

## 状态定义

未来增强版 update report 使用以下状态：

- `kept`：新旧 anchor 精确命中，译文直接保留。
- `new`：新文本没有可用旧候选，需要翻译。
- `changed`：新文本疑似由旧文本改写而来，旧译文作为候选，必须审校确认。
- `removed`：旧文本在新脚本中没有匹配项，保留到 removed report。
- `conflict`：多个旧文本候选匹配同一新文本，或多个新文本争用同一旧文本，必须人工选择。
- `stale`：译文来自旧文本候选，但尚未确认；不得当作已完成翻译。

兼容说明：

- 当前 CSV 的 `current` 可视为未来 `kept`。
- 当前 CSV 的 `new` / `removed` 继续保留兼容。
- 增强模式可以先通过独立 report 输出，不立即改变默认 CSV 字段和现有命令语义。

## 分层流程

增强版本地化更新分三层：

1. **Anchor exact match**
   对新表每一条可本地化文本，用 `anchor` 在旧表中查找。命中则输出 `kept`，直接保留旧译文。

2. **Node-local alignment**
   对未命中的新行和未消费的旧行，在同一 stable node id 内进行块内 diff / alignment。

3. **Review report**
   对 `changed`、`conflict`、`removed`、`stale` 输出人工确认报告。工具只给候选，不静默改写译文。

## 对齐输入

每条本地化行参与对齐时至少包含：

```text
stableNodeId
nodeTitle
anchor
kind
speaker
text
occurrence
sourcePath
line
character
previousText
previousTranslation
```

其中：

- `stableNodeId` 来自 [Stable Node ID Contract](stable-node-id-contract.md)，用于跨标题重命名保持块身份。
- `anchor` 是行级精确继承主键。
- `occurrence` 只用于区分同节点内完全相同文本，不是 runtime 状态。
- `kind` / `speaker` 是相似度和对齐的强约束。
- `sourcePath` / `line` / `character` 是低权重线索，不能单独决定迁移。

## 对齐规则

只在同一 `stableNodeId` 内自动寻找 changed 候选。跨节点候选默认不自动迁移，除非后续显式启用 project-wide review mode。

候选过滤：

- `kind` 必须相同。
- `speaker` 必须相同，除非是旁白或选项。
- `text` 归一化后完全相同但 occurrence 变化时，优先按 sequence alignment 处理。
- `text` 相似但语义可能变化时，只能作为 `changed` / `stale`，不能自动 `kept`。

推荐算法：

1. 按 node 内可本地化行顺序构建旧序列和新序列。
2. 先移除 anchor exact match 的行。
3. 对剩余行运行 sequence alignment。
4. 对候选对计算综合分数：
   - 文本相似度。
   - kind / speaker 是否一致。
   - 前后相邻 kept 行是否一致。
   - occurrence 变化距离。
   - source line 相对位置变化。
5. 高置信单一候选输出 `changed` + `stale translation candidate`。
6. 多候选输出 `conflict`。
7. 无候选的新行输出 `new`。
8. 无候选的旧行输出 `removed`。

## 重复文本

同一节点内相同文本继续用 `occurrence` 防止 anchor 碰撞。

示例：

```inscape
# 审讯开始

旁白：沉默。
艾琳：继续。
旁白：沉默。
```

两句 `沉默。` 具有不同 occurrence。若后来在前面插入第三句相同文本，后续 occurrence 可能位移，anchor 会变。此时不能简单把所有后续重复行当作新文本。

处理规则：

- 如果重复文本前后上下文能唯一确定旧行对应关系，输出 `kept-by-alignment` 候选状态或 `changed` 候选。
- 如果重复文本完全相同且上下文也无法区分，输出 `conflict`，要求人工确认。
- 新插入的重复文本不能偷用旧译文并标为完成；最多复制旧译文为候选并标 `stale`。

## CSV 与 report 字段

默认 `update-l10n` CSV 暂不破坏现有字段：

```text
anchor,node,kind,speaker,text,translation,status,sourcePath,line,column
```

增强 report 建议新增独立 CSV 或 JSON，例如：

```text
status,anchor,nodeId,nodeTitle,kind,speaker,text,translation,candidateAnchor,candidateText,candidateTranslation,similarity,review,sourcePath,line,column
```

字段含义：

- `status`：`kept`、`new`、`changed`、`removed`、`conflict`、`stale`。
- `anchor`：新行 anchor；removed 行为空或保留旧 anchor。
- `nodeId`：stable node id。
- `nodeTitle`：作者可见标题。
- `translation`：只有 `kept` 可直接填入确认译文。
- `candidateAnchor` / `candidateText` / `candidateTranslation`：旧行候选。
- `similarity`：工具评分，用于审校排序，不作为自动继承依据。
- `review`：`confirmed`、`needs-translation`、`needs-review`、`choose-candidate`、`removed-reference`。

JSON report 可以表达多候选：

```json
{
  "format": "inscape.localization-alignment",
  "formatVersion": 1,
  "items": [
    {
      "status": "changed",
      "review": "needs-review",
      "nodeId": "node_01HX7S8E4Q3M8A6V9K2P4N7B5C",
      "nodeTitle": "审讯开始",
      "anchor": "line-v1:new",
      "text": "我在这里等你很久了。",
      "candidate": {
        "anchor": "line-v1:old",
        "text": "我已经等你很久了。",
        "translation": "I've waited for you for a long time.",
        "similarity": 0.82
      }
    }
  ]
}
```

## CLI 兼容迁移计划

第一阶段只新增显式增强入口，不改变现有命令默认行为。

候选命令：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project path\project --from old.csv -o new.csv --alignment-report l10n-review.csv
```

或新增独立审计命令：

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- audit-l10n-alignment-project path\project --from old.csv -o l10n-review.json
```

推荐顺序：

1. 先实现独立 `audit-l10n-alignment-project`，只读当前脚本和旧 CSV，输出 report。
2. 再让 `update-l10n-project` 可选接 `--alignment-report`。
3. 最后再讨论是否把 `changed` / `stale` 写入主 CSV。

默认 `update-l10n` 不应突然把相似旧译文填入 `translation` 并标为完成。

## 分层边界

- Compiler：继续生成 source spans、line anchors、kind、speaker、text，不做旧表 diff。
- Tooling：承载 CSV 读取、line item model、alignment、report model 和状态机。
- CLI：提供显式命令、参数、文件输出和退出码。
- VSCode：未来可读取 report，在编辑器里提供 review UI 和 source jump。
- Runtime：不参与 diff / alignment。

## Goal 2 自检

- G2.1 已完成：本文定义了 localization update 状态机和 CSV / JSON report 字段。
- G2.2 已完成：本文定义了 stable node id + line anchor + occurrence + diff 的对齐流程。
- G2.3 已完成：本文定义了 CLI `update-l10n` 的兼容迁移计划，不改变当前行为。
- 本节点只改文档，不改 CLI、Tooling、Compiler 或 VSCode 行为。
