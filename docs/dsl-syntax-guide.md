# Inscape 语法说明

状态：当前作者指南

本文面向脚本作者，解释 Inscape 当前“已经能写、已经能用”的语法。它不替代 [DSL 语言设计草案](dsl-language.md)；如果你关心候选语法、长期边界和未定项，再回去看设计文档。

## 一眼看懂

Inscape 当前可以先理解成五类东西：

1. `:: node.name`
   - 定义一个可跳转的剧情块。
2. `角色：对白` / `旁白文本`
   - 写剧情正文。
3. `? 提示` + `- 选项 -> target`
   - 写选择与分支。
4. `-> target`
   - 显式跳到别的节点。
5. `@...` 与 `[...]`
   - 写“给宿主或工具看的提示”，不是正文。

## 最小例子

```inscape
:: court.opening

@entry
@scene courtroom
[timeline: court_intro]
[bg: courtroom]

旁白：法庭里很安静。
成步堂：先从证言开始吧。

? 你要做什么
- 询问证言 -> court.questioning
- 查看证物 -> court.evidence

:: court.questioning

证人：我什么都不知道。
-> court.opening
```

## 1. 节点：`:: node.name`

节点是 Inscape 的基本叙事块。

```inscape
:: court.opening
```

规则：

- 节点名当前使用小写 ASCII 层级名。
- 允许字母、数字、下划线、短横线和点。
- 点表示层级，例如 `court.cross_exam.loop`。
- 项目内节点名必须全局唯一。

你可以把它理解成“这个剧情页的机器名”。

## 2. 正文：对白与旁白

### 对白

```inscape
成步堂：异议！
Witness: I know nothing.
```

当前写法是“说话人 + 冒号 + 文本”。

- 支持全角 `：` 和半角 `:`。
- 冒号前面会被识别为 speaker。
- 冒号后面的部分是正文文本。

### 旁白

```inscape
法庭里一片安静。
```

没有 speaker 的普通文本会被当作旁白/叙述行。

## 3. 选择：`?` 与 `-`

### 选择提示

```inscape
? 你要做什么
```

`?` 行是这一组选项的提示语。

### 选择项

```inscape
- 询问证言 -> court.questioning
- 查看证物 -> court.evidence
```

含义是：

- `-` 后面是玩家看到的选项文本。
- `->` 后面是选中后跳转的目标节点。

如果只有选项，没有单独的 `?` 提示，也可以直接写 `-` 行。

## 4. 跳转：`-> target`

```inscape
-> court.opening
```

这是显式跳转。

- 它不会显示给玩家。
- 它只是告诉叙事流程“下一步去哪个节点”。
- 在 VSCode 里可 Ctrl+Click 跳到目标节点。

## 5. `@...` 是什么

`@` 行是 **metadata（元信息）**。

它的核心意思是：

- 这不是给玩家看的正文。
- 这也不是第一版 DSL 的“执行命令”。
- 它是给编译器、预览、宿主桥接层、编辑器提示的轻量标记。

### 常见例子

#### `@entry`

```inscape
@entry
```

表示“这个节点是项目入口”。

- 预览默认从这里开始。
- 项目编译默认把它当入口节点。
- 它不显示给玩家。

#### `@scene courtroom`

```inscape
@scene courtroom
```

表示“这个节点带有一个 scene 语义标签”。

- 当前更偏作者意图/宿主提示。
- 它本身不改变正文流程。
- 后续宿主层可以用它做分组、资源准备、逻辑标注。

#### `@timeline court_intro`

```inscape
@timeline court_intro
@timeline.talking.exit court_outro
@timeline.node.enter camera_push
```

表示“这里引用了一个宿主侧演出别名”。

当前要点：

- 它仍然属于 `@metadata`。
- 它不是 DSL 内建的时间轴脚本语言。
- 它只是引用了一个宿主绑定别名，例如一个 Timeline、cue 或演出事件。
- 这些别名最终应通过 Host Bridge / binding map 映射到项目内部资源或事件。

## 6. `[...]` 是什么

`[]` 是 **行内标签 / 宿主绑定提示**。

它和 `@...` 很像，但更偏“紧贴当前内容的标签写法”。

### 基本写法

```inscape
[bg: courtroom]
[timeline: court_intro]
[timeline.node.exit: court_outro]
```

可以把它理解成：

- `kind`：标签类型，例如 `bg`、`timeline`。
- `alias`：作者写的可读别名，例如 `courtroom`、`court_intro`。

当前语义：

- `[]` 主要是宿主绑定提示，不是玩家正文。
- 它不会直接在 Core 里执行 Unity / Bird / Addressables 调用。
- 它给工具链一个“这里引用了某个宿主资源/事件”的挂点。

## 7. `@` 和 `[]` 的区别

可以先这样记：

- `@...`
  - 更像“节点级/语义级元信息”。
  - 例如入口、场景、Timeline hook。
- `[...]`
  - 更像“标签式宿主提示”。
  - 例如背景别名、Timeline 别名、资源别名。

更直白一点：

- `@` 偏“这段内容是什么、有什么额外意图”。
- `[]` 偏“这里挂了什么宿主绑定别名”。

但当前第一版里，它们都还属于“提示层”，不是 Core 内建运行时命令。

## 8. 注释

当前原型使用：

```inscape
// 这是一行注释
```

注释不会进入剧情正文。

## 9. 一个稍完整的例子

```inscape
:: court.opening

@entry
@scene courtroom
@timeline court_intro
[bg: courtroom]

旁白：法庭里很安静。
成步堂：先从证言开始吧。

? 你要做什么
- 询问证言 -> court.questioning
- 查看证物 -> court.evidence

:: court.questioning

证人：我什么都不知道。
成步堂：那就从头再问一遍。
-> court.opening

:: court.evidence

旁白：证物袋里只有一枚旧怀表。
```

## 10. 当前不要误会的边界

这些东西现在 **还不是** 第一版 DSL 的既定能力：

- 变量系统
- 条件分支表达式
- 自定义指令系统
- 直接控制 Unity / Bird API
- 在 DSL 里描述完整 Timeline 内部轨道

第一版更像：

- 图叙事结构
- 正文与选项
- 轻量元信息
- 宿主绑定提示
- 预览与工具链验证

## 11. VSCode 里你会看到什么

当前扩展里：

- `@...` 和 `[...]` 都有高亮与 Hover。
- `@timeline ...` 与 `[kind: alias]` 可 Ctrl+Click 到绑定来源。
- `@entry`、`@scene` 会显示“这是 metadata”的解释。
- 正文文本 Ctrl+Click 可以打开或刷新预览，并定位到对应节点页面。
- 预览里的 `源码` 按钮会尽量复用已经打开的源码编辑器。

## 12. 进一步阅读

- 作者写法速查：本文
- 设计边界与候选语法：[DSL 语言设计草案](dsl-language.md)
- 当前 VSCode 交互：[VSCode 轻工具链](vscode-tooling.md)
- 宿主桥接与能力边界：[宿主 Schema 草案](host-schema.md)
