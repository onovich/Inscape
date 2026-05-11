# 0010：采用目录优先的主语/角色命名模型

状态：Accepted

日期：2026-05-11

## 背景

Inscape 近期持续在做 Compiler、Tooling、Cli、VSCode 和文档层面的可维护性收口，但现有命名规范仍然带有明显的过渡痕迹：

- 类型名里同时混入了层级词、范围词、主语词和职责词。
- 例如 `CliProjectCompiler`、`CliSingleFileCompiler`、`CliProjectCommandRunner`、`CliUnitySampleSupport` 这类名字，会让维护者先猜“它是在讲范围，还是在讲业务，还是在讲职责”。
- 现有后缀候选也过宽，容易把本该由目录和命名空间承担的信息继续堆到类名后半段。

用户希望命名体验更接近 Bird：即使不熟悉项目，也能先根据架构风格推理“某层代码在哪”“某业务代码在哪”，而不是先记忆一套平铺文件名。

Bird 的规律并不是“所有类都统一前后缀”，而是：

- 目录先表达层级和模块，例如 `System_Story`、`Application_UI`、`Infrastructure_L10N`。
- 类型名只表达当前模块里的具体主语和角色，例如 `StorySystem`、`StorySystemContext`、`UIFactory`、`UITalkingPanel`。

## 决定

1. Inscape 采用“目录优先，类型名次之”的命名模型。
2. 目录和命名空间优先表达层级、范围和模块；类型名只表达当前模块里的业务主语、二级限定和角色。
3. 一级业务主语收敛为：`DslScript`、`StoryGraph`、`Localization`、`Preview`、`ToolConfig`、`HostSchema`、`HostBinding`、`EditorAuthoring`；`UnityPlugin` 仅限 ExternalSupport。
4. `Node`、`Choice`、`Entry`、`Diagnostic`、`SourceMap`、`Reveal`、`Selection`、`Style`、`RoleMap`、`BindingMap`、`Timeline`、`Template`、`Manifest` 等词只作为二级限定，不作为一级主语。
5. 终局后缀收敛为：`Domain`、`Model`、`ViewModel`、`Controller`、`Bridge`、`Context`、`Events`、`Factory`；`Command`、`Provider`、`Entry` 只用于宿主入口语境；`System` 只用于 Runtime。
6. `Parser`、`Compiler`、`Validator`、`Resolver`、`Reader`、`Writer`、`Loader`、`Scanner`、`Exporter`、`Importer`、`Renderer`、`Merger`、`Builder` 视为准后缀，通常放在 `Domain` 前。
7. `Config` 作为后缀家族存在，而不是一级业务前缀。
8. `Command` 不再视为项目内部通用执行模型；内部持续执行流程优先使用 `TaskModel` / `ActionModel`，`Command` 只保留给 Cli、VSCode 命令面板等显式宿主动作入口。
9. `Support`、`Helper`、`Manager`、`Utils` 等弱语义后缀默认视为待拆分信号，不再作为长期目标命名。

## 原因

### 1. 可查性比表面统一更重要

命名的首要目标不是“所有类名看起来一套模版”，而是让陌生维护者可以通过层级、模块和角色快速推断代码位置。

### 2. 范围词和内部结构词都不适合作为一级主语

`Project`、`SingleFile`、`Workspace` 描述的是调用范围；`Node`、`Choice`、`Entry` 描述的是内部结构。把它们放在类型名最前面，都不利于维护者快速判断“这段代码属于哪个系统级业务”。

### 3. 后缀必须按角色收敛

`Domain`、`Model`、`Controller`、`Bridge`、`System` 代表的是类型家族；`Parser`、`Writer`、`Resolver` 代表的是动作限定。把它们混成一套全局候选，会导致命名角色失真。

### 4. 目录结构应该承担信息压力

如果一个类名必须同时表达层级、范围、业务和职责，通常不是类名太短，而是目录和命名空间没有承担足够的信息。

## 影响

正面影响：

- 命名会更接近 Bird 的“主语 + 角色”推理方式。
- 后续拆分目录时，类型名可以自然缩短而不是继续变长。
- `Support`、`Helper` 一类文件会更容易被识别为真实的拆分目标。

代价与边界：

- 现有类型名不会一次性机械重命名；需要按重构切片逐步迁移。
- 架构文档仍然可以使用 `Dsl`、`Config`、`Preview`、`L10n`、`Host` 这类模块术语，但具体类型命名不必强行复刻这些词。

## 当前项目中的解释

- `CliProjectCompiler`、`CliSingleFileCompiler` 这类名字目前只视为过渡命名。
- `CliUnitySampleSupport` 应被优先识别为待拆分类，而不是可长期保留的命名。
- `CliCore`、`InscapeCore` 这类真正的模块入口门面可以暂时保留，但新入口类型优先使用 `Entry`。
- `UnityPlugin` 只在 ExternalSupport 内部使用，不作为 Internal 五层中的普通业务主语。

## 验证清单

新增目录或类型时，至少检查：

1. 目录是否已经表达了层级、范围或模块。
2. 类型名前半段是否是当前模块里最具体、最稳定的主语。
3. 类型名后半段是否来自当前层的小白名单，而不是临时拼词。
4. 是否仍在使用 `Support`、`Helper`、`Manager`、`Utils` 这类弱语义词。
5. 一个不熟悉项目的人，是否可以只根据目录和文件名大致猜到这份代码在哪一层、处理什么主语、扮演什么角色。

## 关联文件

- [docs/coding-conventions.md](../coding-conventions.md)
- [docs/refactoring-plan.md](../refactoring-plan.md)
- [docs/todo.md](../todo.md)
- [docs/agent-handoff.md](../agent-handoff.md)