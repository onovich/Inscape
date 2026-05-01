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

## 样式配置文件

为了让开发者能快速改“编辑器里看起来怎么样”和“预览里看起来怎么样”，当前原型提供两份独立样式文件，并通过工作区根目录的 `inscape.config.json` 连接：

```json
{
  "styles": {
    "editor": "config/inscape.editor-style.json",
    "preview": "config/inscape.preview-style.json"
  }
}
```

编辑器样式文件用于 VSCode 内的可见 `.inscape` 文本装饰；预览样式文件用于 CLI/VSCode 预览页的 CSS 变量。两者都刻意保持“像 CSS 一样填值”的轻量结构，不要求开发者理解扩展 API 或直接改源码。

推荐字段示例：

```json
{
  "speakerColor": "#569cd6",
  "dialogueColor": "#dcdcaa",
  "speakerFontWeight": "600",
  "storyFontSize": "28px",
  "cardRadius": "24px"
}
```

约定：

- `editor` 文件主要使用 `...Color`、`...FontWeight`、`...TextDecoration` 这类扁平字段。
- `preview` 文件主要使用颜色、字号、圆角、行高、字体族等 CSS 值字符串。
- 修改 `inscape.config.json`、`inscape.editor-style.json` 或 `inscape.preview-style.json` 后，重载窗口即可看到变化；预览打开时保存这些文件也会触发刷新。
- 编辑器样式由扩展 decorations 应用，所以不会把颜色选择硬绑到某个 VSCode 主题里。

## 已提供能力

- 注册 `.inscape` 文件扩展名和 `inscape` language ID。
- 高亮节点头：`:: node.name`
- 高亮对白：`角色：对白`
- 高亮旁白、选择提示、选项、跳转、元信息和行内标签。
- 标记明显非法的节点名或跳转目标。
- 提供基础 snippets：节点、对白、选择组、跳转、元信息、Timeline Hook、行内标签。
- 通过 `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose-project <workspace> --override <source> <temp-file>` 刷新实时诊断。
- 在 `->` 跳转目标位置补全工作区内的节点名。
- 在对白行开头补全角色名，优先读取 `inscape.config.json` 中 `unitySample.roleMap` 指向的 `speaker,roleId` 表；未配置时回退扫描工作区已有对白 speaker。
- 在 `@timeline ...`、`@timeline.<phase> ...` 和 `[kind: ...]` 位置补全宿主绑定别名，优先读取 `inscape.config.json` 中 `unitySample.bindingMap` 指向的 `kind,alias,unitySampleId,unityGuid,addressableKey,assetPath` 表；未配置时回退扫描工作区已有 hook / inline tag。
- 在 `->` 跳转目标上支持 Go to Definition / Ctrl+Click。
- 在对白 speaker 上支持 Go to Definition / Ctrl+Click 到 `unitySample.roleMap` 中对应的 `speaker` 行；没有配置角色表时，回退到工作区内该 speaker 的对白引用位置。语言配置会把 `：` 和常见中文标点视为词边界，使 Ctrl+Click 的可跳转下划线只覆盖 speaker 名称，而不是整句对白。
- 在节点声明、`->` 跳转目标或对白 speaker 上支持 Find All References。
- 在节点标题上显示 CodeLens：`N 个引用`，点击后使用 VSCode References Peek 追溯跳到当前 block 的调用方。
- 在节点声明和 `->` 跳转目标上显示简短 Hover 类型说明，不在跳转目标上显示统计信息。
- 在对白 speaker 上显示 Hover 摘要：角色名、UnitySample `roleId` 绑定状态和来源表。
- 在 `@entry`、`@scene` 这类 `@` 元信息上显示 Hover 解释，告诉作者它们是用于标记入口、场景或其他宿主可读意图的轻量元数据。
- 将 `@entry`、`@scene`、`@timeline` 等统一按 `@metadata` 语法层高亮和解释，避免在主题或交互上把 `@timeline` 伪装成另一种核心语法。
- 在宿主绑定别名上显示 Hover 摘要：`kind:alias`、UnitySample id、Addressable、Unity guid、Asset path 和来源表。
- 在 `@timeline ...` 和 `[kind: alias]` 上支持 Ctrl+Click 跳转到对应的绑定行，让作者直接看到它们是如何映射到宿主桥接表的。
- 为 VSCode Outline 提供当前文件节点列表。
- 为 `inscape.host.schema.json` / `*.host.schema.json` 提供 JSON Schema 校验。
- 提供命令 `Inscape: Show Host Schema Capabilities`，读取 `inscape.config.json` 的 `hostSchema` 并列出 query / event。
- 提供命令 `Inscape: Open Preview`，以 VSCode custom editor 方式打开可玩预览；它默认会在源码旁边以侧边编辑器打开。如果当前活动 `.inscape` 文件未保存，会通过 `--override` 使用编辑器中的临时内容。
- 编辑器右上角提供 `Inscape: Toggle Preview` 按钮，可以快速在源码和预览之间切换；当前实现会优先复用已有预览标签页，避免重复打开。扩展清单把 custom editor 设为 `option` 而不是 `default`，避免预览劫持源码标签页、Definition 跳转或普通文件打开行为。
- 预览当前采用单栏沉浸式界面展示正文和选项；点击选项推进、无选项时点击正文继续、支持 Back / Restart 和 diagnostics；编辑时会防抖刷新，保存工作区内 `.inscape` 文件后立即刷新打开的预览编辑器，并尽量保留当前 `{ current, path }` 进度，而不是每次都回到第一页。
- 预览启动时优先复用已编译的 `Inscape.Cli.exe`，其次回退到 `dotnet exec Inscape.Cli.dll`，最后才使用 `dotnet run --project ...`，以缩短打开与刷新等待时间。
- 预览中的节点、行、选项、`@` 元信息和 `[]` 宿主标签都支持一键跳回源码位置，便于把“玩流程”和“改脚本”连成一个闭环。
- 预览中的 `源码` 按钮与诊断跳转会优先复用已经打开的源码编辑器；如果源码页签还没打开，再新开源码页签并定位，避免用源码跳转直接替换掉当前预览标签页。
- 编辑器里的正文、旁白、选项提示和选项文本支持 Ctrl+Click：会打开或刷新对应脚本的预览，并把预览定位到包含这段文本的节点页面，方便从“写”切到“玩”。

## 当前预览交互约定

- 预览是作者体验层，不是脚本真相来源；语义仍由 `Inscape.Core` / CLI 决定。
- 预览中的源码回跳只负责把作者带回对应源位置，不与源码编辑器内的 Ctrl+Click 做自动双向同步。
- 预览刷新应尽量保持玩家当前上下文；只有源码结构变化导致当前位置失效时，才回退到新的可达起点。
- `@` 与 `[]` 的目标是“让作者看得懂它们在做什么”：`@` 偏向轻量元数据说明，`[]` 偏向宿主绑定 / 行内标签说明；两者都应提供 Hover 和可导航的来源，但不在扩展里内建 Bird / Unity 运行时语义。
- 文本到预览的 Ctrl+Click 属于作者体验增强，而不是新的语言语义；它只是根据源位置把预览切到最接近的节点页面，不改变编译结果。

## 尚未实现

- 正式 Language Server。
- 更细粒度的未保存内容热刷新、局部更新和刷新中状态提示；当前版本已支持编辑防抖刷新和保存后立即刷新，但还不是 Markdown 级别的无感体验。
- 宿主 Schema 查询 / 事件清单驱动的脚本内补全。

## 角色提示

角色提示是第一版宿主配置接入 VSCode 的试点。扩展会读取工作区根目录的：

```text
inscape.config.json
```

并按配置文件所在目录解析 `unitySample.roleMap`：

```json
{
  "unitySample": {
    "roleMap": "config/unity-sample-roles.csv"
  }
}
```

角色表格式为：

```csv
speaker,roleId
旁白,1050
成步堂,
```

在对白行开头输入时，补全项会插入 `角色：`。如果 `roleId` 已绑定，补全详情显示 UnitySample `roleId`；如果为空，则显示未绑定状态。Hover 同样展示绑定状态和来源路径。

对白 speaker 也支持导航：Ctrl+Click 会优先跳到配置的 `unitySample.roleMap` 中对应 `speaker` 行；Find All References 会返回工作区内该 speaker 的全部对白行，并在 VSCode 请求 declaration 时包含角色表行。如果未配置角色表，Ctrl+Click 会回退返回工作区内该 speaker 的对白引用位置，便于至少通过 Peek/跳转追溯用法。`language-configuration.json` 的 `wordPattern` 会把全角冒号和常见中文标点作为词边界，确保 `旁白：文本` 这类中文对白中只有 `旁白` 被标为可跳转词。

这项能力只是写作提示，不改变编译结果。UnitySample 实验导出由 CLI 的 `export-unity-sample-project` 读取同一份 `roleMap` 完成；长期应由 Host Bridge 配置驱动。

## Block 双向导航

Inscape 的 block 之间是图关系，不应只能顺着 `-> target` 单向跳转。VSCode 原型采用接近 C# References CodeLens 的模型：引用统计显示在被引用对象，也就是 block 标题上。

- `-> target` 上 Ctrl+Click：跳到被调用方，也就是目标 block。
- block 标题上 CodeLens `N 个引用`：查看所有跳到当前 block 的调用方，使用 VSCode 原生 References Peek 展示引用源；在预览区域双击条目可跳转。
- `-> target` 上的 Hover 只说明这是对话块引用，不显示引用统计或出边摘要。

这对应编程体验中的“Go to Definition / Find References”，但在领域语言里把跳转关系显示为 block 标题上的引用计数。当前实现仍是轻量行扫描，后续 Language Server 应复用 Core 的项目 IR 来提供更稳定的图导航。

## 宿主绑定提示

宿主绑定提示复用 UnitySample 实验样例的绑定表：

```json
{
  "unitySample": {
    "bindingMap": "config/unity-sample-bindings.csv"
  }
}
```

绑定表格式为：

```csv
kind,alias,unitySampleId,unityGuid,addressableKey,assetPath
timeline,court_intro,12,,Timeline/CourtIntro,Assets/Resources_Runtime/Timeline/SO_Timeline_CourtIntro.asset
bg,classroom,,,BG/Classroom,Assets/Art/BG/classroom.png
```

当前 VSCode 扩展支持两类位置：

- `@timeline court_intro`
- `@timeline.node.enter court_intro`
- `[timeline: court_intro]`、`[timeline.node.exit: court_outro]`、`[bg: classroom]` 等 inline tag 的值部分

补全按 `kind` 过滤，Hover 显示绑定表中的 UnitySample id、Addressable、Unity guid 和 asset path。未配置绑定表时，扩展会从工作区已有 `@timeline` 和 inline tag 中扫描别名作为轻量回退。`@entry` / `@scene` 这类普通 `@` 元信息则用于入口、场景或其他宿主语义说明，本身不参与绑定解析。

注意：这仍然只是作者体验层。当前 UnitySample 导出只对已支持的 hook 赋予样例 adapter 意义，例如 `timeline`；其他 `kind` 的 inline tag 补全用于减少写作记忆成本，不代表 Core 已经承诺资源系统语义。即使 `@timeline` 当前会读取绑定表并可导航，它在语法层依然属于 `@metadata`，不应在编辑器里被实现成另一套独立语言。

## 宿主 Schema 提示

VSCode 扩展会为以下文件名提供 JSON Schema 校验：

```text
inscape.host.schema.json
*.host.schema.json
```

字段约束覆盖 `format`、`formatVersion`、`queries`、`events` 和 `parameters`。这让手写宿主能力清单时能获得 JSON 级别的错误提示和字段补全。

命令面板提供：

- `Inscape: Show Host Schema Capabilities`

该命令读取工作区根目录 `inscape.config.json` 的 `hostSchema` 字段，列出当前配置的 query / event，并可跳转到 schema 文件里的对应 `name` 字段。当前它只验证数据通路，不把 query / event 注入 `.inscape` 脚本补全，因为条件语法和事件语法还未定稿。

## 诊断桥接

VSCode 扩展在文档变更后会把当前文本写入系统临时目录，然后调用 CLI：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- diagnose-project <workspace> --override <source-file> <temp-file>
```

`diagnose-project` 输出项目级 JSON payload，合并工作区内所有 `.inscape` 文件，并用临时文件内容覆盖当前正在编辑的源文件。它不向 stderr 打印人类可读诊断，并且只要 CLI 正常执行就返回 `0`。这样编辑器可以区分“脚本里有语法错误”和“编译器进程不可用”。

项目扫描会忽略 `.git`、`bin`、`obj`、`node_modules` 和 `artifacts` 目录。第一版项目规则是节点名在项目内全局唯一，跨文件跳转不需要 `include`。项目入口使用节点内 `@entry` 声明；未声明时编译器会兼容回退到按文件路径排序后的第一个节点。项目级 CLI 支持 `--entry node.name` 临时覆盖入口，供预览和调试使用。

同一套桥接方式已经复用于本地化命令。VSCode 命令面板提供：

- `Inscape: Open Preview`
- `Inscape: Export Localization CSV`
- `Inscape: Update Localization CSV From Previous Table`

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project <workspace> --override <source-file> <temp-file> -o <preview.html>
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <workspace> -o <csv>
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project <workspace> --from <old-csv> -o <csv>
```

如果当前活动 `.inscape` 文件尚未保存，扩展会像诊断一样通过 `--override <source> <temp-file>` 把编辑器内容传给 CLI。`preview-project` 即使带编译诊断也会先输出 HTML，扩展会继续显示预览，并把诊断留给 Problems / 输出面板处理。webview 必须显式开启 scripts，否则 HTML 已生成但界面会表现为空白，这条经验已经在当前实现中固化。

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

## 发布工作流

当扩展改动需要让本机 VS Code 立刻看到效果时，先重新打包再覆盖安装，而不是只重启窗口。当前建议使用：

```powershell
cd tools\vscode-inscape
npm run rebuild:vsix
```

这条流程会调用 `vsce package` 生成 `.vsix`，再用 `code.cmd` 安装覆盖。详细约定见 [VSCode 扩展发布工作流](vscode-release-workflow.md)。
