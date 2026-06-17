# SelfHostedEditor P3 Condition Syntax Contract Audit

状态：P3 Round 7 condition syntax contract / parser design complete

最后更新：2026-06-18

## 结论

PASS：P3 Round 7 已完成条件语法 contract 与 Compiler parser / IR 设计收口。

本轮不宣称 P3 完成。下一轮进入 P3 Round 8：条件语法 Compiler / IR 最小实现。

## 本轮范围

已完成：

- 新增 [Condition Syntax Contract](condition-syntax-contract.md)。
- 明确选项条件 `- [condition] option text -> target`。
- 明确条件跳转 `? [condition] -> target` 与 fallback `-> target`。
- 明确 `? text` 仍是选项提示，只有 `? [` 进入条件跳转解析。
- 定义第一版 expression grammar：`and` / `or` / `not`、括号、标量比较、字符串、数字、bool、query path、query call。
- 定义不支持项：数组、列表、数学表达式、赋值、`await`、action、任意成员调用、条件块、节点入口条件和行级条件。
- 设计 Compiler IR shape、Usage Manifest 对接和 diagnostics 清单。
- 同步 handoff、TODO、索引、ADR 与相关 contract 文档状态。

未完成且后置：

- 未实现 Compiler parser / IR。
- 未接 Runtime 条件求值。
- 未接 VSCode / SelfHostedEditor 条件提示。
- 未把 `choice-condition` / `conditional-jump` 接入 Usage Manifest 实际扫描。
- 未实现 Runtime State、Save / Load、Rollback、Trace Replay 或 Flashback。

## Debug 自检

本轮验证结果：

```powershell
git diff --check
# PASS

dotnet build Inscape.slnx --no-restore
# PASS，0 warning，0 error

dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
# PASS

node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
# PASS

npm --prefix src\ExternalSupport\VSCode run check:structure
# PASS
```

当前无已知未解决实现 bug；本轮主要风险是文档状态滞后或下一轮误把 parser 复制进编辑器宿主。

## 架构自检

- Compiler 仍是条件语法、IR 和 diagnostics 的唯一真相。
- VSCode / SelfHostedEditor / CLI 不拥有条件 parser。
- Host Schema / Host Bridge 不进入 Compiler。
- Usage Manifest 仍是剧本需求清单，不是 Host Schema 权威，也不是 Runtime 执行输入。
- `[]` 保持只读 query；`@` 保持 action / 控制移交。
- Unity / Bird / 宿主内部 ID 未进入 Internal contract。

## 下一轮入口

P3 Round 8 优先完成：

1. 在 Compiler 中解析选项条件和条件跳转。
2. 新增条件表达式 IR 与 source map。
3. 新增 diagnostics 与 Internal tests。
4. 保证 VSCode / SelfHostedEditor 只消费 shared diagnostics，不重写 parser。
