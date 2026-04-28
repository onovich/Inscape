# VSCode 轻工具链

状态：草案 + 原型

第一阶段的 VSCode 支持目标不是替代后续独立编辑器，而是在 DSL 设计期提供足够舒适的文本创作环境。它应当服务两个目的：弱化技术噪声，凸显剧情文本；降低作者记忆语法细节的压力。

## 当前决策

- 文件扩展名：`.inscape`
- VSCode language ID：`inscape`
- 原型位置：`tools/vscode-inscape/`
- 第一版形态：纯声明式扩展，不包含运行时代码。

纯声明式扩展可以先覆盖高亮、括号配置、注释和 snippets。后续补全、诊断、跳转定义、大纲和悬浮说明，应通过 Language Server 复用 `Inscape.Core`，避免在 VSCode 插件里重写解析器。

## 高亮哲学

Inscape 的默认阅读优先级应当是：

1. 剧情文本：对白、旁白、选项文本。
2. 结构控制：节点名、跳转目标、选择提示。
3. 辅助信息：注释、`@...` 元信息、`[...]` 行内标签。
4. 错误信息：非法节点名、非法跳转目标。

因此 TextMate grammar 采用以下倾向：

- 对白 speaker 使用独立 scope，帮助作者快速扫角色轮次。
- 正文使用普通 string-like scope，交给主题保持主视觉。
- 元信息和行内标签使用 comment-like scope，尽量在多数主题下自然变弱。
- 已知非法的节点名和目标名使用 invalid scope，给出轻量即时反馈。

## 已提供能力

- 注册 `.inscape` 文件扩展名和 `inscape` language ID。
- 高亮节点头：`:: node.name`
- 高亮对白：`角色：对白`
- 高亮旁白、选择提示、选项、跳转、元信息和行内标签。
- 标记明显非法的节点名或跳转目标。
- 提供基础 snippets：节点、对白、选择组、跳转、元信息、行内标签。

## 尚未实现

- 基于项目全量脚本的节点补全。
- 基于 `Inscape.Core` 的实时诊断。
- 跳转定义、引用查找、大纲视图和悬浮说明。
- VSCode WebView 预览；当前 HTML 预览仍通过 CLI 生成静态文件。
- 角色表、资源别名、宿主 Schema 驱动的智能提示。

## 本地开发方式

可在仓库根目录用 VSCode 扩展开发模式加载：

```powershell
code --extensionDevelopmentPath=tools\vscode-inscape .
```

也可以直接打开 `tools/vscode-inscape/` 作为扩展项目，启动 Extension Development Host 后再打开 `.inscape` 文件验证高亮。
