# Inscape 极简语法速查

把 Inscape 先理解成 5 条规则：

- `:: node.name`：声明一个对话块。
- `角色：台词`：写对白；`旁白：文字` 也一样。
- `? 选择提示`：开始一组选择。
- `- 选项文字 -> target.node`：写一个选项并跳到目标块。
- `-> target.node`：当前块结束后直接跳转。

## 最小例子

```inscape
:: court.intro

@entry
@timeline.talking.exit court_intro
旁白：法庭里很安静。
成步堂：[player.name]，现在开始吧。

? 你想做什么？
  - 继续询问 -> court.ask
  - 直接反驳 -> court.press
```

## 常用补充

- `@entry`：把当前块标成入口。
- `@scene court`：写一个轻量场景标签。
- `@timeline.talking.exit court_intro`：在指定时机触发宿主演出事件。
- `[player.name]` / `[itemName]`：从当前上下文读取值并拼进文本。

## 写作时怎么用

- 用一个 `:: node.name` 开头，写一小段对白或旁白。
- 需要分支时，先写 `? 提示`，再写若干条 `- 选项 -> 目标块`。
- 需要直接续到别处时，写 `-> target.node`。
- `@...` 主要表达事件、动作、时机和状态变化。
- `[...]` 主要表达查询、读取和文本插值。
- 旧项目里的 `[bg: courtroom]`、`[timeline: court_intro]` 仍可能被工具识别，但新写法不要把它当成推荐模型。

## VS Code 里可直接用

- 右上角预览图标：打开或切换预览。
- 右上角三横线菜单：打开编辑器样式、预览样式、这份速查。
- 想改颜色和 UI：优先编辑 `inscape.config.json` 指向的样式文件。
