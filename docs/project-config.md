# 项目配置草案

状态：原型草案

最后更新：2026-05-01

Inscape CLI 会在项目根目录自动读取：

```text
inscape.config.json
```

也可以通过 `--config path` 显式指定配置文件。命令行参数优先级高于配置文件。

## Bird 配置

第一版配置只覆盖 Bird Adapter 常用路径，目的是减少重复输入长命令，并为后续 VSCode 补全和编辑器读取同一份宿主配置打基础。

```json
{
  "hostSchema": "config/inscape.host.schema.json",
  "bird": {
    "talkingIdStart": 100000,
    "roleMap": "config/bird-roles.csv",
    "bindingMap": "config/bird-bindings.csv",
    "existingRoleNameCsv": "D:/UnityProjects/Bird/Assets/Resources_Runtime/Localization/L10N_RoleName.csv",
    "existingTimelineRoot": "D:/UnityProjects/Bird/Assets/Resources_Runtime/Timeline",
    "existingTalkingRoot": "D:/UnityProjects/Bird/Assets/Resources_Runtime/Talking"
  }
}
```

相对路径按配置文件所在目录解析。

当前读取这些字段的工具：

- `export-host-schema-template`：可生成 `hostSchema` 的起始模板，但不会自动写入配置。
- `export-bird-role-template`：读取 `existingRoleNameCsv`。
- `export-bird-binding-template`：读取 `existingTimelineRoot`。
- `export-bird-project`：读取 `talkingIdStart`、`roleMap`、`bindingMap`、`existingTalkingRoot`。
- VSCode 扩展：读取 `roleMap`，在对白行开头提供 speaker 补全，并在 speaker 上显示 Bird `roleId` Hover；读取 `bindingMap`，在 `@timeline ...` 和 `[kind: ...]` 位置提供宿主别名补全与 Hover。
- VSCode 扩展：读取 `hostSchema`，通过命令面板列出宿主 query / event，并为 `inscape.host.schema.json` / `*.host.schema.json` 提供 JSON Schema 校验。

仍未放进配置的内容：

- 输出目录：继续通过 `-o` 指定，避免误写。
- Unity Importer 输出目录：仍通过 Unity 菜单或 batchmode 参数指定。
- L10N merge 的 `--from` 路径：暂时仍显式传入，避免误覆盖正式表。

## 设计边界

这份配置不是最终宿主 Schema，也不是最终 Host Bridge。它只是第一版“项目级默认值”，用于把当前 CSV 和 Bird 项目路径稳定下来。后续如果引入宿主 Schema / Host Bridge，应考虑把角色、资源、Timeline、查询函数、回调事件和 Inscape ID 到项目内部 ID 的映射纳入更正式的配置或生成流程。

当前 `hostSchema` 是这个方向的第一步，详见 [宿主 Schema 草案](host-schema.md)。它用于描述查询函数和宿主事件清单，不替代 Bird 的 `roleMap` / `bindingMap`。

`bird.bindingMap` 目前可以视为 Host Bridge 的 Bird-specific 早期形态：它把 Inscape 侧可读别名映射到 Bird 整数 ID、Unity guid、Addressables key 或 asset path。通用 Host Bridge 后续需要支持更多项目和引擎，不应假设所有项目都使用 Bird、Addressables 或 ScriptableObject。
