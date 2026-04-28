# 运行时与 Unity 宿主

状态：草案

## 目标

Unity 宿主的第一目标是解释执行 Compiler Core 输出的 IR，并将叙事 Command 转换为 Unity 中的 UI、角色立绘、背景、音频和分支交互。

它不应该成为 DSL 编译器的第二份实现。运行时只消费编译产物和资源引用。

## 初始能力

- 加载编译后的 IR。
- 顺序执行对白、旁白和演出标签。
- 处理基础变量、条件和选择。
- 通过状态 Store 保存叙事变量和执行位置。
- 调用 Unity UI 显示文本和选项。
- 调用资源系统切换背景、立绘和音频。
- 支持基础存档和读档。

## Command Pipeline 候选

```text
IR Command
  -> Runtime Executor
  -> Action or Render Request
  -> Reducer updates Store
  -> Unity Adapter updates UI and assets
```

这种方式符合单向数据流，便于记录、回放和调试。

## IR 内容候选

- 指令类型。
- 源文件与源位置。
- 锚点 ID。
- 可翻译文本引用。
- 角色引用。
- 资源引用。
- 变量读写信息。
- 分支与跳转目标。
- 运行时参数。

## Unity 集成方式候选

- ScriptableObject 存储编译后的指令流。
- Addressables 管理背景、立绘、音频、视频等资源。
- MonoBehaviour 作为宿主入口，负责加载 IR 和连接 UI。
- 自定义 Inspector 用于调试当前执行位置、Store 和指令队列。

## 扩展边界

插件化扩展应允许项目接入自定义指令，例如战斗、小游戏、复杂 UI、特殊镜头或成就系统。

待确认：

- 自定义指令是否需要编译期 Schema。
- Unity 端扩展是否通过 C# Attribute、ScriptableObject 注册表，还是配置文件。
- 编辑器如何识别扩展指令并提供补全和诊断。
- 自定义指令是否允许改变叙事 Store，还是只能发出受控 Action。

## 存档策略草案

存档至少需要包含：

- 当前脚本锚点或节点锚点。
- 当前指令偏移。
- 叙事 Store 快照。
- 编译器和 IR 版本。
- 必要的执行历史或 Action 日志。

是否需要完整 Action 回放，取决于性能、存档体积和确定性需求。
