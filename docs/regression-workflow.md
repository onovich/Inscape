# Regression Workflow

状态：执行中

最后更新：2026-05-16

本文把大目标 E 的防回归工作流固化成可执行清单。它用于每个重构 / 功能节点开始前、提交前和推送后自检，避免正确行为只停留在个人记忆里。

## 节点开始前

每个节点先做四件事：

1. 确认仓库状态：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

2. 阅读固定入口：

```text
docs/agent-handoff.md
docs/todo.md
```

3. 阅读目标目录规则：

```text
src/Internal/<Layer>/README.md
src/ExternalSupport/<Layer>/README.md
tests/<Root>/<Area>/README.md
```

4. 写清本轮边界：

```text
本轮做什么：
本轮不碰什么：
涉及层级：
需要保留的旧行为：
```

## 行为契约

非平凡行为改动先写 3 到 5 条可观察行为。可以写在 TODO、提交说明、测试名或对应设计文档里。

示例：

```text
涉及层级：VSCode WorkspaceIndex
新增行为：
- 优先读取 hostBridge ids 作为 speaker / host binding authoring hint。
- hostBridge 缺失时继续读取 legacy unitySample roleMap / bindingMap。
- completion / hover 文案不再把 UnitySample 当通用模型。
不可破坏：
- 旧 unitySample 配置仍能提供补全和跳转。
- Compiler 不读取 hostBridge。
```

## 命名与分层自检

每次提交前对照 [编码与命名规范](coding-conventions.md)：

- 目录是否仍符合 `Layer / Business / Role / File`。
- 命名空间是否保持适度粗粒度，没有为了目录一一对应而过细。
- 类型名是否是“业务主语 + 限定词 + 角色后缀”。
- 是否引入了 `Helper`、`Support`、`Manager`、`Utils`、泛 `Workspace*` 或新的大而泛服务。
- Compiler 是否仍不依赖 Unity、VSCode、HTML、Bird、Addressables、Tooling、Cli、LanguageServer、Runtime 或 ExternalSupport。
- Internal / ExternalSupport 是否仍由目录表达边界；ExternalSupport 可以依赖 Internal，Internal 不反向依赖 ExternalSupport。

## 验证命令

每个节点提交前至少运行：

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project tests\ExternalSupport\UnityPlugin\Inscape.UnitySample.Tests\Inscape.UnitySample.Tests.csproj --no-build
node --check src\Internal\VSCode\vscode-inscape\extension.js
node -e "JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/syntaxes/inscape.tmLanguage.json','utf8')); console.log('json ok')"
```

如果改了具体 VSCode 模块，额外检查对应文件：

```powershell
node --check src\Internal\VSCode\vscode-inscape\WorkspaceIndex\HostBindingProvider.js
node --check src\Internal\VSCode\vscode-inscape\WorkspaceIndex\DslScriptSpeakerProvider.js
```

按实际改动替换文件路径。

## VSCode 发布与交互回归

只要改了 `src/Internal/VSCode/vscode-inscape/`，默认执行：

```powershell
npm run rebuild:vsix
```

该脚本会打包并安装 `.vsix`。安装后需要 reload VSCode 窗口，再做手动交互回归：

- 正文 / 选项文本默认无常驻下划线。
- Ctrl+指向正文 / 选项才出现链接态。
- Ctrl+Click 正文 / 选项复用预览并定位。
- `-> target` 定义跳转和引用查找正常。
- speaker 补全、Hover、定义和引用查找正常。
- `@timeline ...` / `[kind: alias]` host binding 补全、Hover、Ctrl+Click 正常。
- 预览源码按钮、diagnostics 点击、metadata 点击仍能回跳源码。

如果当前环境无法完成手动验证，在最终报告里明确说明“已重建安装，未手动 reload / 点击验证”。

扩展侧同一份清单也维护在 `src/Internal/VSCode/vscode-inscape/README.md` 的 `Regression Checklist` 小节；修改 VSCode 行为时，两处口径要保持一致。

## 提交拆分规则

一次提交只做一种主动作：

- 纯移动。
- 纯重命名。
- 纯行为修复。
- 纯文档决策。
- 窄范围功能节点。

确实需要混合时，在文档或提交说明里说明原因。常见允许混合：

- 行为改动 + 对应测试。
- 结构改动 + README / TODO 更新。
- VSCode 行为改动 + README 中的使用说明更新。

不要把顺手清理混入当前节点。

## 提交前检查

提交前必须看：

```powershell
git -c safe.directory=D:/LabProjects/Inscape diff --stat
git -c safe.directory=D:/LabProjects/Inscape diff -- <关键文件>
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
```

确认：

- 没有 `bin/`、`obj/`、`.git/`、`node_modules/`、生成物或临时文件。
- 没有把无关用户改动纳入提交。
- TODO / handoff 已随阶段性节点更新。
- 新增长期规则已进入文档；长期架构决策必要时进入 ADR。

## 推送后检查

提交后立即推送：

```powershell
git -c safe.directory=D:/LabProjects/Inscape push
```

推送后确认：

```powershell
git -c safe.directory=D:/LabProjects/Inscape status --short --branch
git -c safe.directory=D:/LabProjects/Inscape log --oneline --decorate -8
```

工作树应回到干净状态，分支应显示 `main...origin/main`。
