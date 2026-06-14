# ADR 0018：SelfHostedEditor backend 使用业务窄接口并区分 session 状态

状态：Accepted

日期：2026-06-13

## 背景

SelfHostedEditor 当前已经从静态 UI 原型推进到真实消费 `LanguageServer`、`Tooling`、`Runtime` 和 CLI 的开发宿主。开发宿主现在提供一组 `/api/*` JSON endpoint，并维护三类 bounded cache：

- Runtime snapshot。
- line-map sidecar。
- localization baseline CSV。

这些 cache 解决了本地预览和 HTTP smoke 的短期问题，但它们仍然是 dev-host transport cache：有 TTL、有容量上限、随进程消失，不表达正式 project session。后续如果直接把这些 `/api/*` 和 cache 机械升级成产品 backend，就会把临时 transport、UI state 和长期项目状态混在一起。

同时，SelfHostedEditor 必须继续遵守 ADR 0017：它是 `ExternalSupport` 宿主客户端，不能把 Compiler、Tooling、LanguageServer 或 Runtime 语义复制到前端或桌面壳层。

## 决策

未来 SelfHostedEditor 产品化 backend 采用业务窄接口，而不是通用 RPC 或 `/api/*` 的一层机械包装。

推荐 backend-facing client 按能力分组：

- `languageSession`
- `hostCapabilities`
- `storyGraph`
- `runtimeSession`
- `lineIdentitySession`
- `localizationSession`
- `stableNodeMap`
- `diagnostics`

三类状态必须明确区分：

- Editor UI state：active view、layout、hover、filter、overlay、scroll 等，可由前端持有。
- Dev-host transport cache：当前 bounded runtime / line-map / localization baseline cache，只为开发服务器和 smoke 提供恢复能力。
- Backend project session：未来产品 backend 持有的 workspace、document buffers、LanguageServer 会话、Runtime session、line-map sidecar、localization baseline 文件身份和写回状态。

未来 backend 可以改变传输协议，但不能改变 shared semantic ownership：

- 编辑语义来自 `LanguageServer`。
- Graph / DSL truth 来自 `Compiler`。
- localization、node-map、HostSchema、HostBinding 等共享流程来自 `Tooling`。
- player state 和 narrative action 来自 `Runtime`。

2026-06-15 current-stage P0 follow-up：

- 当前 dev-host `project-session` / `language-session-request` 词汇只用于迁移准备和可观测性，不表示正式 desktop backend 已完成。
- `/api/session-cache-status` 可以暴露 language-session mode、supported endpoints 和 process-per-request fallback endpoints，但仍不得暴露文档正文、Runtime snapshot、CSV 或 line-map 内容本体。
- 默认 LanguageServer authoring endpoint 仍全部是 `process-per-request`；`SELF_HOSTED_EDITOR_LANGUAGE_SESSION=stdio` 只覆盖 diagnostics / documentSymbols，并允许失败后回退。
- Workspace Summary 当前接受 hosted aggregation summary 作为 current-stage normal path；只有 hosted Compiler graph 或 hosted localization presenter inputs 不完整时才使用 draft summary fallback。
- `ScriptDocumentFallbackPolicy` 当前阶段不再保留 `migration-target` reason；剩余 fallback 必须明确 owner 与触发条件。

## 不做的事

- 不把当前 `/api/*` 当成最终产品 backend API 逐字冻结。
- 不引入通用 `call(method, payload)` RPC 作为前端主要业务接口。
- 不把 dev-host bounded cache 当作正式 project session。
- 不在 SelfHostedEditor 前端重算 diagnostics、references、line identity、localization alignment、candidate score、CSV merge 或 Runtime progress。
- 不为了未来 backend 提前把当前 dev host 改成复杂框架。
- 不在 current-stage P0 中实现 Electron shell、正式 embedded EditorBackend、持久化 `DocumentBufferStore`、默认 full long-lived LanguageServer、跨重启 session restore 或多窗口 session ownership。

## 影响

- 当前 dev host 继续保留轻量本地服务器身份，并继续服务 smoke tests。
- 后续可以先新增窄 `EditorBackendClient` adapter，让它继续调用现有 `/api/*`，再逐步替换 transport。
- Runtime、line-map、localization baseline 的正式迁移应以 project session 为单位，而不是继续依赖 request body 上传整份 state。
- `/api/session-cache-status` 在 dev host 中仍是 cache / language-session 观测接口；产品 backend 可保留 session status，但不得暴露 Runtime、CSV、line-map 或文档正文内容本体。
- 任何同时被 VSCode 与 SelfHostedEditor 需要的 presenter / model / report shape，应优先下沉或保留在 `Internal`，不能在 backend client 中重新命名成宿主私有 truth。

## 验证

- [SelfHostedEditor backend migration map](../self-hosted-editor-backend-migration-map.md) 维护当前 endpoint 到未来业务 client 的映射。
- Dev host API 改动仍需通过 `check:syntax`、`check:structure`、`check:model` 和相关 HTTP smoke。
- Runtime session 改动至少覆盖 `check:runtime-http`。
- line-map session 改动至少覆盖 `check:line-map-http`。
- localization baseline / update 改动至少覆盖 `check:localization-update-http`。
- session observability 改动至少覆盖 `check:session-cache-http`。
- LanguageSession spike 范围改动至少覆盖 `check:language-session` 与 stdio 开关下的 `check:semantic-parity-http`。

## 关联文件

- [SelfHostedEditor backend migration map](../self-hosted-editor-backend-migration-map.md)
- [自研编辑器架构方案](../self-hosted-editor-architecture-plan.md)
- [SelfHostedEditor 重构计划](../self-hosted-editor-refactoring-plan.md)
- [ADR 0017：自研编辑器归属 ExternalSupport 并复用 Internal 契约](0017-self-hosted-editor-external-support-boundary.md)
