# 贡献与协作约定

状态：草案

## 文档优先

在语法、IR、存档、本地化、编辑器交互或运行时扩展发生变化前，先更新对应文档或新增 ADR。项目当前仍在设计收敛期，清楚记录“不确定”比提前写死更重要。

接手项目前，先阅读 [docs/agent-handoff.md](docs/agent-handoff.md) 和 [docs/todo.md](docs/todo.md)。它们记录当前进度、下一步优先队列和验证命令。

## 提交建议

- 文档变更应说明影响范围，例如 `docs: 初始化项目立项文档`。
- 语法变更应附带样例脚本。
- 编译器变更应附带解析输入、诊断和 IR 输出示例。
- 运行时变更应说明状态流和存档影响。
- 阶段性变更完成后，更新接手指南、TODO 和必要的 ADR，再提交并推送。

## 验证建议

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check tools\vscode-inscape\extension.js
```

## 待确认问题

遇到尚未决策的问题，先写入 [docs/open-questions.md](docs/open-questions.md)。如果讨论后形成决定，再更新对应设计文档并新增 ADR。
