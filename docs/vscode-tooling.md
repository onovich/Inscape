# VSCode 轻工具链

状态：草案 + 原型

第一阶段的 VSCode 支持目标不是替代后续独立编辑器，而是在 DSL 设计期提供足够舒适的文本创作环境。它应当服务两个目的：弱化技术噪声，凸显剧情文本；降低作者记忆语法细节的压力。

## 当前决策

- 文件扩展名：`.inscape`
- VSCode language ID：`inscape`
- 原型位置：`tools/vscode-inscape/`
- 当前形态：TextMate grammar + snippets + VSCode extension runtime。

高亮、括号配置、注释和 snippets 保持声明式。实时诊断通过 CLI 的 `diagnose` 命令调用 `Inscape.Core`，避免在 VSCode 插件里重写解析器。当前文件节点补全和大纲先使用轻量行扫描，它们只做写作提示，不作为语法真相来源。

后续更完整的补全、跳转定义、引用查找和悬浮说明，应通过 Language Server 复用 `Inscape.Core`。

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
- 通过 `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose <temp-file>` 刷新实时诊断。
- 在 `->` 跳转目标位置补全当前文件内的节点名。
- 为 VSCode Outline 提供当前文件节点列表。

## 尚未实现

- 基于项目全量脚本的节点补全。
- 正式 Language Server。
- 跳转定义、引用查找和悬浮说明。
- VSCode WebView 预览；当前 HTML 预览仍通过 CLI 生成静态文件。
- 角色表、资源别名、宿主 Schema 驱动的智能提示。

## 诊断桥接

VSCode 扩展在文档变更后会把当前文本写入系统临时目录，然后调用 CLI：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose <temp-file>
```

`diagnose` 输出与 `compile` 相同的 JSON payload，但不向 stderr 打印人类可读诊断，并且只要 CLI 正常执行就返回 `0`。这样编辑器可以区分“脚本里有语法错误”和“编译器进程不可用”。

可通过以下 VSCode 设置调整：

- `inscape.diagnostics.enabled`
- `inscape.diagnostics.debounceMs`
- `inscape.compiler.command`
- `inscape.compiler.args`

## 本地开发方式

可在仓库根目录用 VSCode 扩展开发模式加载：

```powershell
code --extensionDevelopmentPath=tools\vscode-inscape .
```

也可以直接打开 `tools/vscode-inscape/` 作为扩展项目，启动 Extension Development Host 后再打开 `.inscape` 文件验证高亮。
