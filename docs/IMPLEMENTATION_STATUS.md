# 实施状态

本文只记录能力是否已经存在，不使用日期型开发排期。

## 能力门 A

- [x] 旧 V1/V2 日期规划保留到 `docs/archive/v1-v2/`。
- [x] 长期 Goal、授权边界、机会队列、证据模板与追加式账本已经建立。
- [x] 实时状态与事件账本只保留在本机并被 Git 忽略，公开仓不携带运营快照。
- [x] 官方 HEAD、npm latest、贡献政策和首批 10 个机会已经扫描。
- [x] 首个版本化事实卡、微博稿、GitHub 稿、知乎稿和公众号稿已经完成。
- [x] rc.6 无 Key CLI 冒烟实验已经通过。
- [x] 第一个可安装插件实验已经完成固定 rc.6 基线、临时 `DSH_HOME`、本地 `dsh.bundle` 安装、`--dump-config`、插件加载和移除验证；没有使用 API Key、没有启动 Web UI、没有安装未知第三方包。
- [x] 官方 Discussions 中文最小复现工具包已经完成 EvidencePack、专用内容验证和 GitHub 真实发布回执。
- [x] 官方 Discussions 社区入口卡已经完成 Discussions 一手证据、专用内容验证，并获得 GitHub 与微博真实发布回执（知乎仍未发布）。
- [x] 官方 Discussions 新问题分流卡已经完成 #37、#38、#40 一手证据、专用内容验证和 GitHub 真实发布回执；微博稿已通过写作门禁并暂留 outbox，知乎未发布。
- [x] 国产模型与网关矩阵已经完成固定基线、兼容性 JSON、无 Key 边界和专用验证器；具体厂商 keyed smoke 仍明确为 `NOT_RUN`。
- [x] 第三方插件迁移诊所已经完成官方移除说明核验、迁移报告模板、专用验证器和 GitHub 真实发布回执。
- [x] 扩展点中文能力地图已经完成架构/ Cordis 证据核验、需求决策树、事件语义、稳定性标记和 GitHub 真实发布回执。
- [x] 安全边界实测手册已经完成沙箱官方契约核验、无 Key 边界、权限探针矩阵、fail-closed 审查清单和 GitHub 真实发布回执。
- [x] Cordis 无 Key mini-lab 已完成固定版本、隔离 `DSH_HOME`、`--dump-config` 探针、超时保护和 GitHub 真实发布回执，并通过微博与知乎创作中心获得真实文章回执；本轮 npm registry DNS 故障未被误记为 DSH 失败。
- [x] npm registry 已通过公开 JSON 响应恢复核对，`@deepseek-ai/dsh/latest` 当前为 `0.1.0-rc.6`；对应公开 revision 已写入 `evidence/source-attestations/2026-08-13-npm.json`，未把包内容或凭据写入公开仓。
- [x] Python SDK 安全自动化配方已完成官方文档核验、隔离 workspace/session preflight、无凭据阻断和 GitHub 真实发布回执；真实模型、provider、Headless/ACP 仍为 `NOT_RUN`。
- [x] DSH plugin 术语 FAQ 已完成当前 README topic 与固定 commit 旧格式的双源核验，并获得 GitHub/知乎/微博真实回执。
- [x] 官方会话内容搜索 opt-in 教程已完成 `openAt: never`、`SESSION_QUERY_SEARCH_DISABLED`、base/web bundle 与 session-query 文档的多源核验，并获得 GitHub、知乎和微博真实发布回执。
- [x] 术语 FAQ 和 DSH 无 Key 新手入口已获得微博真实发布回执（`https://weibo.com/7621278794/RdgZThkIo`、`https://weibo.com/7621278794/Rdh0Bwdy`）；术语 FAQ 也已获得知乎文章回执（`https://zhuanlan.zhihu.com/p/2071419243371967305`）和 GitHub 文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-plugin-topic-vs-legacy.md`）。Cordis 无 Key mini-lab 已获得微博回执（`https://weibo.com/7621278794/Rdhak9x3C`）和知乎文章回执（`https://zhuanlan.zhihu.com/p/2071424735729263432`），其 README 已获得 GitHub 回执（`https://github.com/pingfanfan/dsh-learn/blob/main/labs/cordis-no-key/README.md`），配套探针已同批写入远端；中文 Discussions 模板、插件迁移诊所、安全边界手册、provider 矩阵、Python SDK 安全配方、扩展点中文能力地图和 DSH 无 Key 新手入口也已获得 GitHub 回执，其中 Python SDK 安全配方已获得知乎与微博回执，新手入口已获得知乎文章回执。完整母仓已通过 GitHub 连接器同步，公众号仍不得写成已发布。

## 能力门 B

- [x] 确定性评分、DSH 硬边界和反馈调整。
- [x] 机会、证据、资产和发布任务分离状态机。
- [x] 独占租约、fencing token、崩溃恢复和一次换线程重试。
- [x] 编排器强制最多 4 个活跃 worker，单个 worker 不能同时持有两项租约；发布任务最多 2 次外部尝试，耗尽后自动安全取消。
- [x] 快照与追加式账本采用事务日志恢复；`doctor` 检查完整 revision 连续性。
- [x] 内容哈希、渠道去重、更新稿替代与未知远端状态保护。
- [x] 上游 HEAD/npm/贡献政策、架构/Cordis/Python SDK/sandbox 文档、Discussions 和插件 topic 游标，以及固定 commit URL 到逻辑文档源的自动失效映射。
- [x] 来源定义支持 `official`、`ecosystem`、`community` scope；已把 `dsh-plugin-check`、`dsh-plugin-dev`、`dsh-explain`、`plugin-registry` 和 `dsh-101` 的公开 HEAD 纳入生态监控，生态变化生成 `ecosystem` 机会并使用独立评分信号。
- [x] 通过 GitHub 连接器核对 `dsh-plugin-check` HEAD `8b3ea76`，完成 EvidencePack、rc.6 依赖声明/Bundle 边界复核和 GitHub 真实发布回执；没有安装或运行第三方插件，动态兼容仍为 `NOT_RUN`。
- [x] #619–#714 新手安装与插件安全排错路径已完成：覆盖固定版本启动、Node.js/npm/npx/pnpm 前置、首次 Web UI 的 API Key/工作区边界、`--dump-config` 验证 profile bundle、插件加载/移除、Node 20/22 与 Linux 编译工具链分层，以及社区插件的第三方标记；规范稿已完成最终润色，GitHub 已获得真实文件回执，知乎未发布，第三方插件动态安装仍为 `NOT_RUN`。
- [x] `sourceHealth.errors` 会持久化部分源扫描失败并在恢复后清除；网络故障不会伪装成“上游无变化”，也不会阻塞本地维护。
- [x] 来源扫描对网络错误和 5xx 按 3 次指数退避重试，永久 4xx 不重试，并在错误中保留源 ID、HTTP 类型和尝试次数；GitHub API JSON 与 raw 文档共存时使用兼容的 Accept 头。
- [x] `source-attest` 支持连接器或 Agent 只回写公开 revision，不导入源内容和凭据；只清除已被证明恢复的源错误，并复用同一套游标变化、资产失效和复测机会逻辑。
- [x] EvidencePack、Asset、PublishJob 运行时校验和凭据拦截。
- [x] Asset 的 `PASS` 必须绑定内容哈希与显式验证回执，CI 同时运行 TypeScript typecheck。
- [x] `public-audit` 只扫描 Git 公开候选文件，阻止个人路径、临时目录、高置信度凭据和私钥进入公开候选集。
- [x] 空队列会优先处理失效资产，并对超过 7 天未复测的 READY/PUBLISHED 资产生成一次有界例行维护任务；完成会刷新验证时间，失败两次后停止重试。
- [x] `scan`、`watch`、`source-attest`、`next`、`claim`、`verify`、`publish`、`dispatch-queued`、`reconcile`、`doctor`、`status`、`cycle` 等内部命令。
- [x] `confirm-not-found` 可记录渠道 Agent 已核验的远端缺失；当前绑定任务进入安全重试，过期绑定任务归档后必须按当前资产 revision 重新排队。
- [x] `dispatch-queued` 和 `cycle` 只自动派发 `DRAFT_ONLY` 队列到本地 outbox，明确跳过 `MOCK`、未授权和真实渠道。
- [x] 知乎已设置为强制人工批准渠道：未有 `approve` 记录时，`cycle`、`dispatch-queued` 和直接 `dispatch` 均拒绝派发；批准只绑定单个 PublishJob。

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
- [ ] GitHub 后续远端协调和平台实时连接器仍需继续建设；公众号仍未发布；微博已完成七条，新增 Discussions 分流卡因上一条原创微博发布不久暂留 outbox，知乎仍按人工同意闸门保持未发布；本轮已通过 GitHub 连接器核对并回写官方 HEAD、Discussions、生态仓库 HEAD、npm latest 和官方文档哈希，`sourceHealth` 当前为 `ok: true`；AgentBridge 已支持私有互动快照回传，但平台实时 `fetchInteractions` 仍需渠道授权。
- [ ] X 按计划保持禁用。

- [x] DSH 完全新手入口已完成 Node.js、终端、npx、Web UI、无 Key 插件、Windows 路径排障和 API Key 边界的重写，加入 beginner-doctor 环境前置诊断、固定 commit 的官方 README/插件教程截图、明确标注的终端示意图，以及 Node.js 下载、GitHub ZIP 下载和 `index.js` 文件定位的 11 张配套图；GitHub 已发布，知乎未发布。
- [x] DSH 无 Key 工具注册实验已完成 ctx.tools.register、参数/返回值 schema、bundle manifest、离线执行/渲染契约和移除路径验证；npm registry 下载超时导致真实 DSH 探针保持未通过，模型工具调用仍为 NOT_RUN。
- [x] 官方 Discussions 监控已修复分页盲区：最新连接器复核到 7 页、696 条公开讨论，编号从 #12 到 #714；#565–#714 的社区插件、工具调度报告、Windows 端口报告和未解决问答已分别分层处理，不把列表增长、用户报告、社区回复、社区 fork 或第三方测试代码包装成新功能、官方修复或官方发行版；#587 的安全细节不复制到公开内容。
- [x] 官方 Discussions 新问题分流卡已按 #614 当前分页基线重新核对 #37、#38、#40 及公开评论，旧证据包已增强、规范稿和 GitHub 渠道稿已更新并获得新的 GitHub 文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/discussion-triage-41.md`）；仍未把 Windows/Firefox、`koffi` 或归档会话报告写成官方修复，知乎未发布。
- [x] #550–#552 复核卡已重新读取三条 Discussion、固定 commit 的 `PiAiCompatProfile`/`resolveModelCompat`、以及 `dsh-rag-kb` 当前 main commit；正文明确保留历史时间边界，并更新到 #614 分页基线。`dsh-rag-kb` 的两个包仍为 `0.1.0-rc.5`，公开安装仍是源码集成，未被写成可直接 `dsh plugin add` 的 bundle；GitHub 已回写新文件回执，知乎未发布。
- [x] #565–#570 复核卡已完成从 #614 到 #714 的分页维护复核，并核对 `dsh-openclaw-acp` 当前 main commit `ac475fa` 与 `v0.1.3` release；正文保留社区插件、用户报告、第三方代理和源码安装警告的证据边界，明确 #568 CLOSED 不等于官方修复，没有下载、安装或运行第三方插件，GitHub 规范稿与证据回执已更新，知乎未发布。
- [x] 官方社区入口卡已按实时分页复核到 #614，更新为 6 页、600 条公开讨论，并保留 #12 欢迎公告、#14 memory 需求、板块选择和最小复现准备的历史事实边界；GitHub 渠道稿已准备同步，知乎未发布。
- [x] #592–#614 当前复核卡已完成官方分页、重点 Discussion、评论和固定 README 的多源核验，覆盖新手启动、工作区/浏览器、provider 与 ACP/MCP/Docker 生态信号；明确没有动态复现、没有把社区建议写成官方修复，GitHub 已获得文件回执，知乎未发布。
- [x] 中文 Discussions 最小复现工具包已把 EvidencePack 更新到 revision 18，并重新绑定 `github-discussions-public-list-through-614-2026-08-14`；正文仍通过专用模板验证、公开审计和 60 项测试，GitHub 规范文件与远端现有内容一致，已记录远端状态回执，知乎未发布。
- [x] #539–#549 历史复核卡已保留原始时间边界，补充当前 #614 分页维护基线，并更新 GitHub 规范稿与证据回执；`dsh-agent-messaging` 仍只做固定 commit 静态审查，没有下载、安装或运行，知乎未发布。
- [x] #560–#564 新手排障卡已保留 Windows 路径、图片输入、缓存展示和第三方网关的历史事实边界，完成从 #614 到 #714 的分页维护复核，并更新 EvidencePack、规范稿与 GitHub 真实文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-discussions-revision-20260814-564.md`）；社区 fork/预设没有下载、安装或运行，知乎未发布。
- [x] #553–#559 网关兼容与插件排障卡已保留原始历史观察，补充当前 #614 分页维护基线，并注明 `dsh-gateway-presets` 后续已恢复可访问；增强 fork、preset 和真实网关仍未动态运行，GitHub 规范稿与证据回执已更新，知乎未发布。
- [x] #535–#537 启动报错、Linux 沙盒想法和社区桌面版复核卡已保留历史证据等级，补充当前 #614 分页维护基线，并更新 GitHub 规范稿与证据回执；没有下载第三方桌面版或把它写成官方发行版，知乎未发布。
- [x] #619–#714 新手安装与插件安全排错路径已完成官方文档、Discussion 详情和固定 rc.6 命令的多源核验；文章把截图定位为导航材料，把本机命令回执定位为最终证据，并明确没有动态安装第三方插件、没有调用模型 API，知乎未发布。

## 能力门 D

- [x] 指标样本可按 Asset 和 Channel 追加记录。
- [x] 已有真实回执的 PublishJob 可通过 `collect-interactions` / `sync-interactions` 拉取互动，按 `remoteId` 去重并生成累计评论、引用、提及和反应指标；旧状态快照和事务日志会自动补齐互动数组。
- [x] 短期触达与长期使用、引用、上游回应分开计算。
- [x] `analyze` 会在样本成熟后以有限幅度调整机会排序。
- [x] `status` 会展示下一项工作及其基础分和真实反馈理由。
- [x] 已产生真实传播样本：微博七条已回执内容完成公开阅读/互动核对，既有新增事实卡为 5 次阅读、0 转发、0 评论、0 赞；社区入口卡刚完成发布，尚未写入猜测性指标；新问题分流卡尚未发布微博；既有 Cordis 为 122 次阅读、Python SDK 为 89 次阅读/1 赞、会话搜索为 110 次阅读/1 评论/1 赞；知乎新手入口为 2 赞同/1 收藏、Cordis 为 1 赞同/2 收藏，其余本轮核对文章暂无评论。数据已写入对应 Asset 指标；没有把页面未显示的阅读量猜入账本。
- [x] AgentBridge 已支持从 `state/private/interactions/<channel>/<publish-job-id>.json` 读取渠道 Agent 回传的公开互动快照，并复用 job 绑定、凭据拦截、remote ID 去重和指标账本；平台实时 `fetchInteractions` 连接器仍需渠道授权。
- [x] 同一资产/渠道累计两条评论或提及时，互动正文会保留在私有状态并自动生成去重的 `feedback` Opportunity，后续仍必须重新建立 EvidencePack；重复采集不会制造重复机会。
- [x] 已补齐跨渠道发布与不确定远端状态：`PUBLISHED` 资产可以在不撤销既有回执的前提下补发其他渠道；`remote-unknown` 可把已尝试但无明确公开结果的 `OUTBOX/SENDING` 任务安全转入 `UNKNOWN_REMOTE_STATE`，再由远端核验决定回执或可重试。

## 当前下一项

总控队列已完成二十一项高分机会的首个规范资产：官方变更事实站、Discussions 最小复现工具包、官方 Discussions 社区入口卡、Discussions 新问题分流卡、国产模型/网关矩阵、第三方插件迁移诊所、扩展点中文能力地图、安全边界实测手册、Cordis 无 Key mini-lab、Python SDK 安全自动化配方、DSH 无 Key 新手入口、DSH plugin 术语 FAQ、官方会话内容搜索 opt-in 教程、旧版 Discussions revision 复核卡、#535–#537 复核事实卡、#539–#549 复核事实卡、#550–#552 复核事实卡、#553–#559 复核事实卡、#560–#564 新手排障与网关兼容边界卡、#565–#614 新插件/工具调度报告与 Windows 启动排障卡，以及 dsh-plugin-check rc.6 生态兼容性复核。其中 FAQ 已在 GitHub、微博和知乎获得真实回执；Cordis mini-lab 已在 GitHub、微博和知乎获得真实回执；Python SDK 安全配方已在 GitHub、微博和知乎获得真实回执；中文 Discussions 模板、社区入口卡、Discussions 新问题分流卡、插件迁移诊所、安全边界手册、provider 矩阵、扩展点能力地图和 DSH 无 Key 新手入口已在 GitHub 获得真实回执，其中社区入口卡已获得微博回执（`https://weibo.com/7621278794/RdhRIu2qL`），新问题分流卡微博稿已过门禁但暂未发布，知乎未发布。最新 #565–#614 复核卡已获得 GitHub 文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-discussions-revision-20260814-591.md`）；其证据基线固定为 6 页、600 条公开讨论、#12–#614。新手入口也已获得知乎文章回执。会话内容搜索教程已获得 GitHub 回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-session-content-search-opt-in-47f9438.md`）、微博回执（`https://weibo.com/7621278794/RdhnpeP8j`）和知乎文章回执（`https://zhuanlan.zhihu.com/p/2071432880262329422`）。dsh-plugin-check rc.6 复核已获得 GitHub 文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-plugin-check-rc6-compatibility-20260814.md`），但没有安装第三方插件，知乎仍需主理人明确同意。旧版 Discussions revision 事实卡保留为历史版本，分页复核卡已随 #559、#564、#591 和 #614 新卡滚动更新；公众号不可用。旧版扩展点地图和旧版新手 GitHub outbox 的未知远端状态已通过渠道核验后安全归档，并按当前 revision 发布了清理后的公开版本。除已记录的真实回执外，本地 `MOCK`、Agent outbox 和 `DRAFT_ONLY` 都只证明工作流或待办已生成，不属于公开发布。
- [x] DSH 无 Key 新手入口已完成终稿润色、rc.6 固定证据、GitHub/知乎/微博真实发布回执和公众号渠道稿；模型、provider、Web UI 与第三方插件仍明确未覆盖。
- [x] DSH plugin 术语 FAQ 已完成当前官方 README 与固定 commit 的证据绑定；没有安装未知第三方包，也没有把 topic、安装成功或未运行实验写成运行时兼容。
- [x] DSH 第一个插件端到端教程已完成 `dsh plugin add`、profile manifest、bundle patch、加载日志和 `remove` 的无 Key 证据绑定；规范稿已完成最终润色检查，知乎未发布。
- [x] DSH 启动与插件安装排障教程已完成官方启动/插件文档和公开 Discussions 的多源核验，复用 rc.6 无 Key bundle 实验，并明确区分 CLI、profile、bundle、插件加载、Web UI、模型和工具调用边界；规范稿已完成最终润色检查，知乎未发布。
- [x] 当前 #619–#714 新手安装与插件安全排错路径已获得 GitHub 文件回执（`https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-beginner-install-and-plugin-safety-714.md`）；新卡证据基线为 7 页、696 条公开讨论、#12–#714。微博稿因账号近期已有原创内容暂留 outbox，知乎未发布。
- [x] #560–#564 维护复核已完成：原始观察仍固定为当时的 6 页/550 条/#564，当前来源只更新为 7 页/696 条/#714；规范稿通过最终润色检查，GitHub 更新回执为 `https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-discussions-revision-20260814-564.md`，知乎未发布。
- [x] 中文 Discussions 最小复现工具包维护复核已完成：模板结构通过 `validate-discussion-kit.mjs`，证据基线从 #614 更新到 #714，内容哈希未变，既有 GitHub 发布状态保留，知乎未发布。
- [x] #565–#570 维护复核已完成：原始观察为 6 页/556 条/#570，当前来源基线为 7 页/696 条/#714；正文通过 polish-article 检查，GitHub 更新回执为 `https://github.com/pingfanfan/dsh-learn/blob/main/content/channels/github/dsh-discussions-revision-20260814-570.md`，没有下载、安装或运行第三方插件，知乎未发布。
