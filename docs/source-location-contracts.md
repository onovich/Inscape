# Source Location Contracts

状态：C 阶段基线

本文定义 Inscape 当前 source map 与 preview reveal 的坐标约定，避免 Compiler、CLI、Preview、VSCode 与未来 LanguageServer 各自猜测 `line` / `column` / `character` 的含义。

## 两套坐标

### Compiler source location

适用范围：

- `SourceSpanModel`
- `DiagnosticModel`
- Compiler / CLI JSON 中的 `source` 对象和 `diagnostics`
- Preview HTML 从 Compiler IR 读取的 node、line、choice、edge source

字段：

- `sourcePath`：源码路径。序列化输出应保留生产者给出的路径文本；只在比较时做路径归一化。
- `line`：1-based 行号。
- `column`：1-based 列号。

规则：

- Compiler 是这些字段的语义源头。
- `column` 不等于 VSCode 的 `character`。它是面向编译结果、诊断和人类显示的 1-based 列。
- Compiler source location 当前不携带 range length。后续如果扩展 range，应作为显式契约补充，不用现有 `column` 暗示长度。

### Editor reveal location

适用范围：

- VSCode selection bridge 发给 Preview webview 的 `revealSource`
- Preview webview 发回 VSCode 的 `openSource`
- `EditorAuthoringLocationProvider` 生成的 location payload
- 未来 LanguageServer 与编辑器三视图之间的定位消息

字段：

- `sourcePath`：源码路径。
- `line`：0-based 编辑器行号。
- `character`：0-based 编辑器字符位置。
- `length`：0-based range 长度，可选，仅表示编辑器选区范围。

兼容字段：

- Preview webview 发回 VSCode 的 `openSource` payload 应使用 `character` 字段承载 0-based 编辑器字符位置。
- 读取旧 payload 时可以接受 `column` 作为 `character` 的 fallback；新 payload 应优先写 `character`，不再继续扩散 `column`。

## 转换规则

Compiler -> Editor：

- `editor.line = max(0, compiler.line - 1)`
- `editor.character = max(0, compiler.column - 1)`

Diagnostic -> Editor：

- `editor.line = max(0, diagnostic.line - 1)`
- `editor.character = max(0, diagnostic.column - 1)`

Editor -> Human display：

- 显示行列时使用 `line + 1` 和 `character + 1`。

不得做的事：

- 不要把 Compiler JSON 中的 `column` 直接传给 VSCode `Range`。
- 不要把 VSCode `character` 写回 Compiler source model。
- 不要让 VSCode 或 Preview 重新推断 parser 语义；它们只能消费 Compiler source location，或在编辑器体验层做临时 reveal 匹配。

## 当前消息契约

Preview -> VSCode 源码回跳：

```json
{
  "type": "openSource",
  "source": {
    "sourcePath": "D:/path/story.inscape",
    "line": 0,
    "character": 4
  }
}
```

说明：`line` 与 `character` 都是 0-based 编辑器坐标。旧 payload 中的 `column` 只作为读取 fallback 保留，不再作为新消息字段。

VSCode -> Preview 定位：

```json
{
  "type": "revealSource",
  "source": {
    "sourcePath": "D:/path/story.inscape",
    "line": 0,
    "character": 4,
    "length": 12
  }
}
```

说明：`line`、`character`、`length` 都是 VSCode 0-based 编辑器坐标。

## C 阶段推进顺序

1. 先把 Preview HTML 的 Compiler source -> Editor reveal 转换收口到单点，修复 1-based / 0-based 混用。
2. 再把 Preview -> VSCode 的兼容 `column` 字段迁到 `character`，VSCode 侧保留 fallback。（已完成 C2.1）
3. 再为中文对白、选项、metadata、diagnostics 和跨文件 source map 增加测试样例。
4. 最后让 LanguageServer 基线复用同一份契约，而不是重新定义编辑器坐标。
