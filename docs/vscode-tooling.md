# VSCode 轻工具链

状态：草案 + 原型

第一阶段的 VSCode 支持目标不是替代后续独立编辑器，而是在 DSL 设计期提供足够舒适的文本创作环境。它应当服务两个目的：弱化技术噪声，凸显剧情文本；降低作者记忆语法细节的压力。

## 当前决策

- 文件扩展名：`.inscape`
- VSCode language ID：`inscape`
- 原型位置：`tools/vscode-inscape/`
- 当前形态：TextMate grammar + snippets + VSCode extension runtime。

高亮、括号配置、注释和 snippets 保持声明式。实时诊断通过 CLI 的 `diagnose-project` 命令调用 `Inscape.Core`，避免在 VSCode 插件里重写解析器。工作区节点补全、跳转定义、引用查找、悬浮说明和大纲先使用轻量行扫描，它们只做写作提示，不作为语法真相来源。

后续更完整的项目语义能力应通过 Language Server 复用 `Inscape.Core`。

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
- 提供基础 snippets：节点、对白、选择组、跳转、元信息、Timeline Hook、行内标签。
- 通过 `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose-project <workspace> --override <source> <temp-file>` 刷新实时诊断。
- 在 `->` 跳转目标位置补全工作区内的节点名。
- 在对白行开头补全角色名，优先读取 `inscape.config.json` 中 `bird.roleMap` 指向的 `speaker,roleId` 表；未配置时回退扫描工作区已有对白 speaker。
- 在 `@timeline ...` 和 `[kind: ...]` 位置补全宿主绑定别名，优先读取 `inscape.config.json` 中 `bird.bindingMap` 指向的 `kind,alias,birdId,unityGuid,addressableKey,assetPath` 表；未配置时回退扫描工作区已有 hook / inline tag。
- 在 `->` 跳转目标上支持 Go to Definition / Ctrl+Click。
- 在对白 speaker 上支持 Go to Definition / Ctrl+Click 到 `bird.roleMap` 中对应的 `speaker` 行。
- 在节点声明、`->` 跳转目标或对白 speaker 上支持 Find All References。
- 在节点声明或 `->` 跳转目标上显示 Hover 摘要：定义位置、引用数量和出边目标。
- 在对白 speaker 上显示 Hover 摘要：角色名、Bird `roleId` 绑定状态和来源表。
- 在宿主绑定别名上显示 Hover 摘要：`kind:alias`、Bird id、Addressable、Unity guid、Asset path 和来源表。
- 为 VSCode Outline 提供当前文件节点列表。

## 尚未实现

- 正式 Language Server。
- VSCode WebView 预览；当前 HTML 预览仍通过 CLI 生成静态文件。
- 宿主 Schema 查询 / 事件清单驱动的智能提示。

## 角色提示

角色提示是第一版宿主配置接入 VSCode 的试点。扩展会读取工作区根目录的：

```text
inscape.config.json
```

并按配置文件所在目录解析 `bird.roleMap`：

```json
{
  "bird": {
    "roleMap": "config/bird-roles.csv"
  }
}
```

角色表格式为：

```csv
speaker,roleId
旁白,1050
成步堂,
```

在对白行开头输入时，补全项会插入 `角色：`。如果 `roleId` 已绑定，补全详情显示 Bird `roleId`；如果为空，则显示未绑定状态。Hover 同样展示绑定状态和来源路径。

对白 speaker 也支持导航：Ctrl+Click 会跳到配置的 `bird.roleMap` 中对应 `speaker` 行；Find All References 会返回工作区内该 speaker 的全部对白行，并在 VSCode 请求 declaration 时包含角色表行。如果未配置角色表，引用查找仍可基于工作区对白扫描运行，但定义跳转不会返回结果。

这项能力只是写作提示，不改变编译结果。真正的 Bird 导出仍由 CLI 的 `export-bird-project` 读取同一份 `roleMap` 完成。

## 宿主绑定提示

宿主绑定提示复用 Bird Adapter 的绑定表：

```json
{
  "bird": {
    "bindingMap": "config/bird-bindings.csv"
  }
}
```

绑定表格式为：

```csv
kind,alias,birdId,unityGuid,addressableKey,assetPath
timeline,court_intro,12,,Timeline/CourtIntro,Assets/Resources_Runtime/Timeline/SO_Timeline_CourtIntro.asset
bg,classroom,,,BG/Classroom,Assets/Art/BG/classroom.png
```

当前 VSCode 扩展支持两类位置：

- `@timeline court_intro`
- `[timeline: court_intro]`、`[bg: classroom]` 等 inline tag 的值部分

补全按 `kind` 过滤，Hover 显示绑定表中的 Bird id、Addressable、Unity guid 和 asset path。未配置绑定表时，扩展会从工作区已有 `@timeline` 和 inline tag 中扫描别名作为轻量回退。

注意：这仍然只是作者体验层。当前 Bird 导出只对已支持的 hook 赋予宿主意义，例如 `timeline`；其他 `kind` 的 inline tag 补全用于减少写作记忆成本，不代表 Core 已经承诺资源系统语义。

## 诊断桥接

VSCode 扩展在文档变更后会把当前文本写入系统临时目录，然后调用 CLI：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose-project <workspace> --override <source-file> <temp-file>
```

`diagnose-project` 输出项目级 JSON payload，合并工作区内所有 `.inscape` 文件，并用临时文件内容覆盖当前正在编辑的源文件。它不向 stderr 打印人类可读诊断，并且只要 CLI 正常执行就返回 `0`。这样编辑器可以区分“脚本里有语法错误”和“编译器进程不可用”。

项目扫描会忽略 `.git`、`bin`、`obj`、`node_modules` 和 `artifacts` 目录。第一版项目规则是节点名在项目内全局唯一，跨文件跳转不需要 `include`。项目入口使用节点内 `@entry` 声明；未声明时编译器会兼容回退到按文件路径排序后的第一个节点。项目级 CLI 支持 `--entry node.name` 临时覆盖入口，供预览和调试使用。

同一套桥接方式已经复用于本地化命令。VSCode 命令面板提供：

- `Inscape: Export Localization CSV`
- `Inscape: Update Localization CSV From Previous Table`

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <workspace> -o <csv>
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project <workspace> --from <old-csv> -o <csv>
```

如果当前活动 `.inscape` 文件尚未保存，扩展会像诊断一样通过 `--override <source> <temp-file>` 把编辑器内容传给 CLI。

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
