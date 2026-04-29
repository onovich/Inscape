# 本地化提取

状态：基线 + 草案

本阶段提供第一版无引擎本地化提取能力，用来验证行级隐式 hash 是否能稳定服务翻译流转。

## CLI

单文件提取：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n path\story.inscape -o artifacts\l10n.csv
```

项目级提取：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project path\project -o artifacts\l10n.csv
```

项目级命令复用 `compile-project` 的扫描规则，支持 `--override source.inscape temp.inscape`，便于 VSCode 或未来编辑器在未保存文件上执行临时提取。

基于旧表更新：

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n path\story.inscape --from artifacts\old-l10n.csv -o artifacts\l10n.csv
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project path\project --from artifacts\old-l10n.csv -o artifacts\l10n.csv
```

更新命令会按 `anchor` 精确继承旧表里的 `translation`，并输出额外的 `status` 列：

- `current`：当前脚本中仍然存在，并且在旧表中找到同一锚点。
- `new`：当前脚本新增，旧表中没有同一锚点。
- `removed`：旧表中存在，但当前脚本中已经没有同一锚点；这一行保留在输出中，仅供审校和迁移参考。

## CSV 字段

```text
anchor,node,kind,speaker,text,translation,sourcePath,line,column
```

`update-l10n` / `update-l10n-project` 会在 `translation` 后加入 `status`：

```text
anchor,node,kind,speaker,text,translation,status,sourcePath,line,column
```

- `anchor`：行级稳定锚点，例如 `l1_...`。
- `node`：所属叙事节点名。
- `kind`：`Narration`、`Dialogue`、`ChoicePrompt` 或 `ChoiceOption`。
- `speaker`：对白说话人；旁白和选项为空。
- `text`：原文。
- `translation`：译文列；纯提取命令保持为空，更新命令会按旧表锚点继承。
- `status`：仅更新命令输出，用于标记 `current`、`new`、`removed`。
- `sourcePath` / `line` / `column`：源映射信息，用于回跳和审校。

## 当前提取范围

第一版提取所有带锚点的用户可见文本：

- 旁白行。
- 对白行。
- 选择组提示，例如 `? 选择行动`。
- 选择项文本，例如 `- 询问证人 -> court.loop`。

以下内容暂不提取：

- `@entry` 等 metadata。
- `[bg: classroom]` 等演出标签。
- 节点名。
- 跳转目标。

## 后续问题

- 是否需要直接输出 PO/XLIFF。
- 是否需要做模糊匹配，用来识别“文本轻微改写但仍可复用译文”的条目。
- 选择组提示是否最终保留为用户可见文本，还是变成编辑器辅助信息。
- 是否需要给角色显示名、资源别名和 UI 文案建立独立提取源。
