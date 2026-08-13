# 实施状态

本文只记录能力是否已经存在，不使用日期型开发排期。

## 能力门 A

- [x] 旧 V1/V2 日期规划保留到 `docs/archive/v1-v2/`。
- [x] 长期 Goal、授权边界、机会队列、证据模板与追加式账本已经建立。
- [x] 实时状态与事件账本只保留在本机并被 Git 忽略，公开仓不携带运营快照。
- [x] 官方 HEAD、npm latest、贡献政策和首批 10 个机会已经扫描。
- [x] 首个版本化事实卡、微博稿、GitHub 稿、知乎稿和公众号稿已经完成。
- [x] rc.6 无 Key CLI 冒烟实验已经通过。
- [x] 官方 Discussions 中文最小复现工具包已经完成 EvidencePack、专用内容验证和 GitHub 真实发布回执。
- [x] 国产模型与网关矩阵已经完成固定基线、兼容性 JSON、无 Key 边界和专用验证器；具体厂商 keyed smoke 仍明确为 `NOT_RUN`。
- [x] 第三方插件迁移诊所已经完成官方移除说明核验、迁移报告模板、专用验证器和 GitHub 真实发布回执。
- [x] 扩展点中文能力地图已经完成架构/ Cordis 证据核验、需求决策树、事件语义、稳定性标记和 GitHub 真实发布回执。
- [x] 安全边界实测手册已经完成沙箱官方契约核验、无 Key 边界、权限探针矩阵、fail-closed 审查清单和 GitHub 真实发布回执。
- [x] Cordis 无 Key mini-lab 已完成固定版本、隔离 `DSH_HOME`、`--dump-config` 探针、超时保护和 GitHub 真实发布回执，并通过微博与知乎创作中心获得真实文章回执；本轮 npm registry DNS 故障未被误记为 DSH 失败。
- [x] Python SDK 安全自动化配方已完成官方文档核验、隔离 workspace/session preflight、无凭据阻断和 GitHub 真实发布回执；真实模型、provider、Headless/ACP 仍为 `NOT_RUN`。
- [x] DSH plugin 术语 FAQ 已完成当前 README topic 与固定 commit 旧格式的双源核验，并获得 GitHub/知乎/微博真实回执。
- [x] 官方会话内容搜索 opt-in 教程已完成 `openAt: never`、`SESSION_QUERY_SEARCH_DISABLED`、base/web bundle 与 session-query 文档的多源核验，并获得 GitHub、知乎和微博真实发布回执。
- [x] 术语 FAQ 和 DSH 无 Key 新手入口已获得微博真实发布回执（`https://weibo.com/7621278794/RdgZThkIo`、`https://weibo.com/7621278794/Rdh0Bwdy`）；术语 FAQ 也已获得知乎文章回执（`https://zhuanlan.zhihu.com/p/2071419243371967305`）和 GitHub 文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-plugin-topic-vs-legacy.md`）。Cordis 无 Key mini-lab 已获得微博回执（`https://weibo.com/7621278794/Rdhak9x3C`）和知乎文章回执（`https://zhuanlan.zhihu.com/p/2071424735729263432`），其 README 已获得 GitHub 回执（`https://github.com/pingfanfan/dsh-learn/blob/main/labs/cordis-no-key/README.md`），配套探针已同批写入远端；中文 Discussions 模板、插件迁移诊所、安全边界手册、provider 矩阵、Python SDK 安全配方、扩展点中文能力地图和 DSH 无 Key 新手入口也已获得 GitHub 回执，其中 Python SDK 安全配方已获得知乎与微博回执，新手入口已获得知乎文章回执。完整母仓已通过 GitHub 连接器同步，公众号仍不得写成已发布。

## 能力门 B

- [x] 确定性评分、DSH 硬边界和反馈调整。
- [x] 机会、证据、资产和发布任务分离状态机。
- [x] 独占租约、fencing token、崩溃恢复和一次换线程重试。
- [x] 快照与追加式账本采用事务日志恢复；`doctor` 检查完整 revision 连续性。
- [x] 内容哈希、渠道去重、更新稿替代与未知远端状态保护。
- [x] 上游 HEAD/npm/贡献政策、架构/Cordis/Python SDK/sandbox 文档、Discussions 和插件 topic 游标，以及固定 commit URL 到逻辑文档源的自动失效映射。
- [x] `sourceHealth.errors` 会持久化部分源扫描失败并在恢复后清除；网络故障不会伪装成“上游无变化”，也不会阻塞本地维护。
- [x] 官方源扫描对网络错误和 5xx 按 3 次指数退避重试，永久 4xx 不重试，并在错误中保留源 ID、HTTP 类型和尝试次数。
- [x] `source-attest` 支持连接器或 Agent 只回写公开 revision，不导入源内容和凭据；只清除已被证明恢复的源错误，并复用同一套游标变化、资产失效和复测机会逻辑。
- [x] EvidencePack、Asset、PublishJob 运行时校验和凭据拦截。
- [x] Asset 的 `PASS` 必须绑定内容哈希与显式验证回执，CI 同时运行 TypeScript typecheck。
- [x] `public-audit` 只扫描 Git 公开候选文件，阻止个人路径、临时目录、高置信度凭据和私钥进入公开候选集。
- [x] 空队列会优先处理失效资产，并对超过 7 天未复测的 READY/PUBLISHED 资产生成一次有界例行维护任务；完成会刷新验证时间，失败两次后停止重试。
- [x] `scan`、`watch`、`source-attest`、`next`、`claim`、`verify`、`publish`、`dispatch-queued`、`reconcile`、`doctor`、`status`、`cycle` 等内部命令。
- [x] `confirm-not-found` 可记录渠道 Agent 已核验的远端缺失；当前绑定任务进入安全重试，过期绑定任务归档后必须按当前资产 revision 重新排队。
- [x] `dispatch-queued` 和 `cycle` 只自动派发 `DRAFT_ONLY` 队列到本地 outbox，明确跳过 `MOCK`、未授权和真实渠道。

## 能力门 C

- [x] GitHub、微博、知乎、公众号、X 与本地测试采用统一适配器契约。
- [x] Agent outbox 已实现 `probe`、`publish`、`correct`、幂等键与回执契约；这仍是宿主桥接层，不是平台实时 API。
- [x] 已记录浏览器渠道中继手册，并完成五条微博内容、五篇知乎文章的真实回执与去重核对；已有阅读指标继续回流，未确认 URL 时仍停留在 `OUTBOX`。
- [x] 未授权渠道局部阻塞，授权恢复后可自动重新入队。
- [x] 规范母稿可机械生成不含编辑标记的 GitHub、知乎和公众号稿；GitHub 清理渲染器已覆盖无标题候选表的干净规范稿。
- [x] 不提供删除接口，纠错保留原始远端关系。
- [x] GitHub 公开空仓 `pingfanfan/dsh-learn` 已创建，浏览器登录与 SSH 写入能力已确认。
- [x] 微博“平凡ZhiH”和知乎创作中心浏览器登录态已确认。
- [x] GitHub 首次全仓同步已通过连接器完成；同步前运行 `public-audit`，未使用受阻的本地 SSH 推送路径。
- [ ] 公众号后台被浏览器安全策略禁止访问，未尝试绕过。
- [ ] GitHub 后续远端协调和平台实时连接器仍需继续建设；当前已同步 126 个经过公开审计的文件。公众号仍未发布；微博已完成五条、知乎已完成五篇浏览器发布，AgentBridge 已支持私有互动快照回传，但平台实时 `fetchInteractions` 仍需渠道授权。
- [ ] X 按计划保持禁用。

## 能力门 D

- [x] 指标样本可按 Asset 和 Channel 追加记录。
- [x] 已有真实回执的 PublishJob 可通过 `collect-interactions` / `sync-interactions` 拉取互动，按 `remoteId` 去重并生成累计评论、引用、提及和反应指标；旧状态快照和事务日志会自动补齐互动数组。
- [x] 短期触达与长期使用、引用、上游回应分开计算。
- [x] `analyze` 会在样本成熟后以有限幅度调整机会排序。
- [x] `status` 会展示下一项工作及其基础分和真实反馈理由。
- [x] 已产生首批真实传播样本：微博术语 FAQ 读取 6 次、微博 DSH 无 Key 新手入口读取 1 次，均为 0 转发、0 评论、0 赞；知乎术语 FAQ 初始可见互动为 0 赞同、0 评论、0 收藏。3 个样本已写入对应 Asset 指标；Cordis 新回执尚未有可核验的互动数据，现有样本仍不足以调整机会排序。
- [x] AgentBridge 已支持从 `state/private/interactions/<channel>/<publish-job-id>.json` 读取渠道 Agent 回传的公开互动快照，并复用 job 绑定、凭据拦截、remote ID 去重和指标账本；平台实时 `fetchInteractions` 连接器仍需渠道授权。

## 当前下一项

总控队列已完成十一项高分机会的首个规范资产：官方变更事实站、Discussions 最小复现工具包、国产模型/网关矩阵、第三方插件迁移诊所、扩展点中文能力地图、安全边界实测手册、Cordis 无 Key mini-lab、Python SDK 安全自动化配方、DSH 无 Key 新手入口、DSH plugin 术语 FAQ，以及官方会话内容搜索 opt-in 教程。其中 FAQ 已在 GitHub、微博和知乎获得真实回执；Cordis mini-lab 已在 GitHub、微博和知乎获得真实回执；Python SDK 安全配方已在 GitHub、微博和知乎获得真实回执；中文 Discussions 模板、插件迁移诊所、安全边界手册、provider 矩阵、扩展点能力地图和 DSH 无 Key 新手入口已在 GitHub 获得真实回执，新手入口也已获得知乎文章回执。会话内容搜索教程已获得 GitHub 回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-session-content-search-opt-in-47f9438.md`）、微博回执（`https://weibo.com/7621278794/RdhnpeP8j`）和知乎文章回执（`https://zhuanlan.zhihu.com/p/2071432880262329422`）。公众号不可用。旧版扩展点地图和旧版新手 GitHub outbox 的未知远端状态已通过渠道核验后安全归档，并按当前 revision 发布了清理后的公开版本。除已记录的真实回执外，本地 `MOCK`、Agent outbox 和 `DRAFT_ONLY` 都只证明工作流或待办已生成，不属于公开发布。
- [x] DSH 无 Key 新手入口已完成终稿润色、rc.6 固定证据、GitHub/知乎/微博真实发布回执和公众号渠道稿；模型、provider、Web UI 与第三方插件仍明确未覆盖。
- [x] DSH plugin 术语 FAQ 已完成当前官方 README 与固定 commit 的证据绑定；没有安装未知第三方包，也没有把 topic、安装成功或未运行实验写成运行时兼容。
