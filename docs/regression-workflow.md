# Regression Workflow

状态：执行中

最后更新：2026-05-17

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
需要删除的旧行为 / fallback：
```

## 研发期兼容原则

Inscape 当前仍处于研发期，没有已发布版本和真实用户项目需要承诺兼容。因此工作流默认不为旧语法、旧配置、旧样例或旧实现路径保留兼容层。

执行规则：

- 发现旧写法、legacy fallback、兼容字段或迁移期样例时，优先把它们登记为删除 / 迁移任务，而不是继续扩展兼容逻辑。
- 新节点不得新增“为了旧版本可用”的 fallback。确实为了调试或渐进切换临时保留时，必须写明删除节点和验收条件。
- 主样例、README、快速指南和 snippets 必须展示当前推荐写法；旧写法不得留在主路径中作为可见示范。
- 测试应覆盖当前规范。旧语法测试只允许在“删除旧语法前的定位节点”短暂存在，删除节点完成后必须移除。
- ADR 可以保留历史决策脉络，但当前行为文档、TODO 和工具提示不得把 legacy 当作仍需维护的产品能力。

## 行为契约

非平凡行为改动先写 3 到 5 条可观察行为。可以写在 TODO、提交说明、测试名或对应设计文档里。

示例：

```text
涉及层级：VSCode WorkspaceIndex
新增行为：
- 优先读取 hostBridge ids 作为 speaker / host binding authoring hint。
- completion / hover 文案不再把 UnitySample 当通用模型。
不可破坏：
- Compiler 不读取 hostBridge。
需要删除：
- legacy unitySample roleMap / bindingMap fallback 不再作为长期能力。
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
node --check src\ExternalSupport\VSCode\extension.js
node -e "JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/syntaxes/inscape.tmLanguage.json','utf8')); console.log('json ok')"
```

如果改了具体 VSCode 模块，额外检查对应文件：

```powershell
node --check src\ExternalSupport\VSCode\WorkspaceIndex\HostBindingProvider.js
node --check src\ExternalSupport\VSCode\WorkspaceIndex\DslScriptSpeakerProvider.js
```

按实际改动替换文件路径。

## VSCode 发布与交互回归

只要改了 `src/ExternalSupport/VSCode/`，默认执行：

```powershell
npm run rebuild:vsix
```

该脚本会打包并安装 `.vsix`。安装后需要 reload VSCode 窗口，再做手动交互回归：

- 正文 / 选项文本默认无常驻下划线。
- Ctrl+指向正文 / 选项才出现链接态。
- Ctrl+Click 正文 / 选项复用预览并定位。
- `-> target` 定义跳转和引用查找正常。
- speaker 补全、Hover、定义和引用查找正常。
- `@timeline ...` host binding 补全、Hover、Ctrl+Click 正常；legacy `[kind: alias]` 不再作为目标体验。
- 预览源码按钮、diagnostics 点击、metadata 点击仍能回跳源码。

如果当前环境无法完成手动验证，在最终报告里明确说明“已重建安装，未手动 reload / 点击验证”。

扩展侧同一份清单也维护在 `src/ExternalSupport/VSCode/README.md` 的 `Regression Checklist` 小节；修改 VSCode 行为时，两处口径要保持一致。

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

批量改中文样例、中文标题或中文文档时，避免把中文替换表直接塞进 PowerShell one-liner。优先用 `apply_patch` 或 UTF-8 文件脚本承载中文文本，再执行机械替换；替换后用 `rg "\?\?\?\?"` 和抽样 `Get-Content -Encoding UTF8` 检查是否发生终端转码损坏。

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
