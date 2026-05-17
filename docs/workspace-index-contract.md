# Workspace Index Contract

状态：C 阶段过渡契约

本文定义 VSCode 当前轻量扫描、未来 LanguageServer 和 Tooling 之间可共享的作者体验索引。它不是 Compiler 语义真相，也不能替代 `Inscape.Compiler` 的 parser / validator；它只描述编辑器为了补全、跳转、引用、Hover 和 reveal 所需的 authoring hint。

## 边界

Workspace index 可以做：

- 扫描 `.inscape` 文本、配置文件、CSV 和 host schema，生成编辑器提示所需的轻量位置对象。
- 为 VSCode provider 提供统一的 nodes、references、speakers、host bindings、metadata、schema capabilities。
- 作为未来 LanguageServer 的数据模型输入或输出。

Workspace index 不可以做：

- 重新定义 DSL 语义。
- 重新实现跨文件编译、节点可达性、合法性诊断。
- 把 UnitySample / Bird / Addressables 规则写进 Internal 的通用索引。

## 通用位置对象

所有索引项都应使用编辑器坐标：

```json
{
  "sourcePath": "D:/path/story.inscape",
  "line": 0,
  "character": 4,
  "length": 12
}
```

字段规则沿用 [Source Location Contracts](source-location-contracts.md)：

- `line` 是 0-based 编辑器行号。
- `character` 是 0-based 编辑器字符位置。
- `length` 是 0-based range 长度。
- 不在 index 项里使用 `column`。

## 索引项

### Nodes

用于节点补全、定义跳转、引用查找、CodeLens 和 node hover。

字段：

- `name`
- `sourcePath`
- `line`
- `character`
- `length`

### Node References

用于 `-> target` 跳转引用、入边 CodeLens 和 Find All References。

字段：

- `target`
- `sourcePath`
- `line`
- `character`
- `length`

### Speakers

用于对白 speaker 补全、定义跳转、引用查找和 hover。

字段：

- `name`
- `sourcePath`
- `line`
- `character`
- `length`
- `sourceKind`：`script`、`roleMap` 或未来其它来源。

### Host Bindings

用于 `@timeline ...`、`@timeline.<phase> ...` 这类宿主事件 / 时机 hook 的补全、定义与 hover。

该索引项只代表作者体验层 hint，不代表新推荐语法，也不让 Workspace Index 拥有 Compiler 语义。

字段：

- `kind`
- `name`
- `sourcePath`
- `line`
- `character`
- `length`
- `sourceKind`：`bindingMap`、`hostSchema` 或未来其它来源。

### Metadata

用于 `@entry`、`@scene`、`@timeline` 等元信息引用和 hover。

字段：

- `key`
- `value`
- `sourcePath`
- `line`
- `character`
- `length`

### Schema Capabilities

用于 host schema query / event 浏览、补全和 hover。

字段：

- `kind`：`query` 或 `event`
- `name`
- `description`
- `sourcePath`
- `line`
- `character`
- `length`

## C 阶段迁移顺序

1. 先冻结本文契约，避免 VSCode provider 继续各自发明位置对象。
2. 再把现有 `WorkspaceIndex` provider 输出对齐为上述对象字段。
3. 再把 selection reveal、definition、reference、hover、completion 的共享读取点收敛到 index provider。
4. 最后让 `Inscape.LanguageServer` 基线复用同一套 index 契约，而不是重做一份 VSCode-only 模型。
