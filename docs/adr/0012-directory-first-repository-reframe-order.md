# 0012：采用目录骨架优先的仓库重构顺序

状态：Accepted

日期：2026-05-11

## 背景

Inscape 已经在文档层确认了多项长期结构结论：

- Internal / ExternalSupport 两大分层
- Internal 下的 `Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`
- `UnityPlugin` 属于 `ExternalSupport`
- 类型命名采用目录优先的主语 / 角色模型

但当前仓库的可见结构仍明显滞后：

- `src/` 仍以旧项目平铺为主
- `Inscape.Compiler`、`Inscape.Adapters.UnitySample` 等旧路径仍是主入口
- `tools/vscode-inscape` 仍承载长期产品代码
- `LanguageServer` 与 `Runtime` 仍没有任何目录落点

这导致近期虽然完成了多轮局部收口，但仓库外形仍难以体现真正的重构成果。

## 决定

1. 后续仓库重构采用“目录骨架优先”的固定顺序。
2. 一级代码树先落为：
   - `src/Internal`
   - `src/ExternalSupport`
3. 目录公式固定为：`Layer / Business / Role / File`。
4. Role 目录统一采用复数命名：
   - `Domains`
   - `Models`
   - `ViewModels`
   - `Controllers`
   - `Commands`
   - `Providers`
   - `Bridges`
   - `Entries`
   - `Systems`
   - `Contexts`
   - `Events`
   - `Factories`
5. Git 空目录统一用 `README.md` 占位，并把它作为目录规则文件。
6. 迁移顺序固定为：
   - 目录路径
   - 项目路径 / solution / 项目引用
   - 项目名
   - 命名空间
   - 类型名
7. `tools/` 不再承载长期产品源码，只保留脚本、打包和开发辅助。
8. `UnityPlugin` 相关长期代码只允许进入 `ExternalSupport`，并退出默认 .NET solution 编译链。
9. 目录骨架未落稳前，不再把主要重构精力继续投入旧目录里的微观 helper 收口。

## 原因

### 1. 结构成果必须可见

如果仓库外形仍保持旧项目平铺，再多局部类级重构，也很难让维护者感知架构已经发生实质变化。

### 2. 路径比类型名更能稳定表达层级

目录和命名空间本就承担层级与范围信息。若长期先改类型名、不改目录，最终只会把结构信息继续压进类型名，违背 ADR 0010 的初衷。

### 3. 外部支持层必须先在路径和编译链上隔离

只在文档里声明 `UnityPlugin` 属于 `ExternalSupport` 不够；它必须先体现在目录树和默认 solution 边界里。

## 影响

正面影响：

- 仓库外形会更早对齐长期架构。
- 后续的项目名、命名空间和类型名迁移更有落点。
- README 规则文件会把“先读目录规则再重构”变成可执行流程。

代价与边界：

- 短期内会优先做目录与文档施工，而不是继续局部功能式收口。
- 一段时间内可能出现“新目录路径 + 旧项目名”的过渡状态，但这是被允许且受控的。

## 验证清单

1. 仓库外形必须能一眼看出 `src/Internal` 与 `src/ExternalSupport`。
2. `Compiler`、`Tooling`、`Cli`、`VSCode`、`LanguageServer`、`Runtime`、`UnityPlugin` 都必须有真实目录落点。
3. 默认 .NET solution 编译链不再包含 `UnityPlugin` 相关项目。
4. 每个稳定 Layer / Business 目录都必须有 `README.md` 规则文件。
5. 进入任一 Layer / Business 的具体重构前，必须先阅读该目录 `README.md`。

## 关联文件

- [docs/directory-first-reframe-plan.md](../directory-first-reframe-plan.md)
- [docs/code-structure.md](../code-structure.md)
- [docs/coding-conventions.md](../coding-conventions.md)
- [docs/refactoring-plan.md](../refactoring-plan.md)
- [docs/todo.md](../todo.md)
