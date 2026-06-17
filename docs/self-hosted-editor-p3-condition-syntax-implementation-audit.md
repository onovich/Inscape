# SelfHostedEditor P3 Condition Syntax Implementation Audit

状态：P3 Round 8 condition syntax Compiler / IR minimal implementation complete

最后更新：2026-06-18

## 结论

PASS：P3 Round 8 已完成条件语法 Compiler / IR 最小实现。

本轮不宣称 P3 完成。下一轮进入 P3 Round 9：条件表达式 Tooling / LanguageServer / Editor consumption。

## 本轮范围

已完成：

- 在 `Inscape.Compiler` 内新增条件表达式 parser 与 IR model。
- 选项条件 `- [condition] option text -> target` 会解析为 `DslScriptChoiceOptionModel.Condition`，并同步挂到对应 choice edge。
- 条件跳转 `? [condition] -> target` 会解析为 `DslScriptConditionalJumpModel`，并生成 `StoryGraphEdgeKindModel.Conditional` edge。
- fallback `-> target` 继续复用现有 default jump / default edge；条件跳转组缺 fallback 时产生 Compiler diagnostic。
- 条件表达式支持 `and`、`or`、`not`、括号、标量比较、字符串、数字、bool、query path 与 query call。
- 新增 Internal tests，覆盖选项条件、条件跳转顺序、fallback、source column、unsupported operator / array / assignment / action。

未完成且后置：

- 未实现 Runtime 条件求值。
- 未接 Usage Manifest 的 `choice-condition` / `conditional-jump` 实际扫描。
- 未接 LanguageServer hover / completion 或 editor 条件提示。
- 未过滤 Preview / Runtime 选项可见性。
- 未设计 Runtime query provider、query receipt、Runtime State 或 Save / Load。

## Debug 自检

本轮验证结果：

```powershell
dotnet build Inscape.slnx --no-restore
# PASS，0 warning，0 error

dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
# PASS
```

提交前补充验证：

```powershell
git diff --check
# PASS，仅提示两个既有测试文件下一次 Git touch 会规范 CRLF/LF，无 whitespace error。

node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
# PASS

npm --prefix src\ExternalSupport\VSCode run check:structure
# PASS
```

当前无已知未解决实现 bug。需要留意：条件 options 在现有 Preview / Runtime 中仍会作为普通选项展示；这是 Round 9 / Round 10 之后的消费与求值任务，不属于本轮语义。

## Diagnostic Codes

本轮新增 Compiler diagnostics：

- `INS050`：condition empty。
- `INS051`：missing closing `]`。
- `INS052`：unexpected / trailing token 或括号未闭合。
- `INS053`：unsupported operator，例如 `+`、`await`。
- `INS054`：unsupported array / list。
- `INS055`：unsupported assignment。
- `INS056`：unsupported query call argument。
- `INS057`：unclosed string。
- `INS058`：unsupported action marker。
- `INS060`：conditional jump missing target。
- `INS061`：conditional jump group missing fallback。

Unknown query、参数数量 / 类型 mismatch、missing Host Bridge binding 仍不属于 Compiler diagnostics。

## 架构自检

- 条件 parser / IR 位于 `src/Internal/Compiler`。
- Compiler 不读取 Host Schema / Host Bridge，也不判断 query 是否存在。
- CLI / LanguageServer / VSCode / SelfHostedEditor 未新增条件 parser。
- 本轮未引入 Unity、Bird、Addressables、HTML rendering 或第三方包。
- Runtime 仍只消费 Compiler graph，不反向解析 `.inscape` 源文本。

## 下一轮入口

P3 Round 9 优先完成：

1. Tooling / Usage Manifest 从 Compiler IR 抽取条件 query usage。
2. LanguageServer / editor 只消费 shared diagnostics / capability payload，补条件 query hint 时不得复制 parser。
3. VSCode / SelfHostedEditor parity smoke 证明没有宿主侧重复语义。
