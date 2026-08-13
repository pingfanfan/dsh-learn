# dsh-learn

`dsh-learn` 是由“平凡心智”主理、Agent 持续维护的 DeepSeek Harness 中文生态入口。它不是一个按天数推进的课程项目，而是一套持续发现机会、验证事实、构建资产、发布内容并从反馈中迭代的运行系统。

## 如果你是第一次接触 DSH

你不需要先会写代码，也不需要先准备 API Key。建议按下面的顺序进入：

1. 阅读[完全新手教程：从安装到第一个插件](content/canonical/dsh-zero-to-first-plugin-rc6.md)，里面有 Node.js、终端、Web UI、首次 API Key 提示和实际界面截图。
2. 下载本仓库 ZIP，解压后在项目根目录运行 `node scripts/beginner-doctor.mjs`，先确认 Node.js、npm、npx 和练习文件都在。这一步只需要 Node.js，不要求你先安装 pnpm。
3. 用固定版本启动 DSH：

   ```bash
   npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
   ```

   这不是把 DSH 永久安装到系统里，而是由 `npx` 第一次运行时下载并启动指定版本。这样新手不需要先处理全局 CLI，教程也能固定在同一个版本；等熟悉以后，再按官方文档选择其他安装方式。

4. 浏览器打开 `http://127.0.0.1:3080`。如果第一次看到 `Add an API key to get started`，先点 `Configure later`；这一步只验证页面能否打开，不代表模型已经配置好。
5. 准备安装插件前，运行 `node scripts/plugin-doctor.mjs`。Web UI 不需要 pnpm，但 DSH 的 `plugin` 子命令会调用 pnpm；如果检查失败，按它打印的命令安装后再继续。
6. 回到仓库根目录运行 `node labs/hello-plugin/verify.mjs`，在隔离的临时 `DSH_HOME` 中完成第一个插件的安装、加载、配置检查和移除。这个实验会主动排除 API Key，不会发起模型请求。

如果你只想先了解 profile、bundle 和配置树，可以从[无 Key 的隔离 profile 实验](labs/cordis-no-key/README.md)开始；如果你想看完整的插件文件结构，再看[第一个插件实验说明](labs/hello-plugin/README.md)。

## 当前运行方式

- DSH 是内容边界：每项工作都必须对应一个明确的 DSH 用户动作或工程价值。
- 机会按影响、时效、复利、生态关系、证据与可执行性评分。
- 快讯只使用官方一手来源或本地复现；正式教程和工具必须可重复验证。
- 来源分为 `official`、`ecosystem`、`community` 三类；当前已把 5 个公开 DSH 插件/学习项目纳入 `ecosystem` 监控，生态变化会进入机会队列但不会被误标成官方消息。
- GitHub 保存规范资产，中文渠道负责触达和反馈回流。
- 没有新热点时，系统继续复测、修订、补 FAQ、改善搜索入口和自动化。

## 快速开始

```bash
pnpm ops:init
pnpm ops:doctor
pnpm ops watch
pnpm ops:status
pnpm ops:cycle
pnpm ops:next
pnpm public-audit
```

项目使用 Node.js 原生 TypeScript 支持，不依赖运行时第三方包。DSH 新手路径需要 Node.js `22.19.0` 或更高的 22.x，或者 24.x 及以上版本。

## 目录

- [`AUTONOMOUS_PLAN.md`](AUTONOMOUS_PLAN.md)：长期目标、授权和风险边界。
- `src/`：评分、状态机、存储、编排与渠道接口。
- `ops/`：Agent 角色、来源与渠道配置、无人值守运行手册。
- `evidence/`：一手来源与复现证据。
- `content/`：规范内容和渠道衍生版本。
- `labs/`：可重复运行的 DSH/Cordis 实验。
- `incubator/`：尚未证明需要独立仓库的小工具或插件。
- `state/`：本机运行状态和追加式事件账本；实时快照与账本不进入公开 Git 历史。
- `docs/archive/v1-v2/`：已停止执行的日期型旧规划。

## 发布状态

`pnpm ops:doctor` 会校验状态、完整事件账本和适配器当前声明的能力。现阶段非本地适配器仍是静态配置加 Agent outbox，并不等于登录账号的实时探测。写入 outbox 只表示“等待渠道 Agent”，不等于已经公开发布；只有可信渠道回写远端 URL 和 remote ID 后，PublishJob 才算 `SUCCEEDED`。

知乎是例外的人工批准渠道：Agent 可以准备任务，但不会由 `cycle` 自动派发。只有主理人明确批准指定任务后，运行 `pnpm ops approve <publish-job-id> --by "主理人"`，才允许生成知乎 outbox；这不等于公开发布，仍需人工完成发布并回写真实回执。

本项目是非官方社区项目。DeepSeek Harness 仍处于 Developer Preview，公开内容必须标注验证版本。

## 已建立的事实基线

- DeepSeek Harness HEAD：`47f943859bef60e4160492346772ded9b24f765a`。
- HEAD 中 CLI 清单：`@deepseek-ai/dsh@0.1.0-rc.5`。
- npm registry latest：`0.1.0-rc.6`。
- rc.6 无 Key CLI 冒烟实验：[labs/rc6-cli-smoke/README.md](labs/rc6-cli-smoke/README.md)。
- 无 Key 第一个可安装插件实验：[labs/hello-plugin/README.md](labs/hello-plugin/README.md)。
- 完全新手安装、启动 Web UI 和第一个插件：[content/canonical/dsh-zero-to-first-plugin-rc6.md](content/canonical/dsh-zero-to-first-plugin-rc6.md)；GitHub 干净稿：[content/channels/github/dsh-zero-to-first-plugin-rc6.md](content/channels/github/dsh-zero-to-first-plugin-rc6.md)。
- 无 Key 工具注册实验：[labs/tool-plugin/README.md](labs/tool-plugin/README.md)；离线 schema/注册/执行/渲染检查已通过，真实 npx 探针因 npm registry 超时暂未标成通过。
- DSH 启动、bundle 安装、加载与移除教程：[content/canonical/dsh-first-plugin-rc6.md](content/canonical/dsh-first-plugin-rc6.md)。
- DSH 启动失败与插件安装排障路径：[content/canonical/dsh-startup-plugin-troubleshooting-rc6.md](content/canonical/dsh-startup-plugin-troubleshooting-rc6.md)。
- 首个规范资产：[content/canonical/dsh-change-card-47f9438.md](content/canonical/dsh-change-card-47f9438.md)。
- Discussions 最小复现工具包：[content/canonical/discussion-minimal-repro-kit.md](content/canonical/discussion-minimal-repro-kit.md)。
- 官方 Discussions 社区入口卡：[content/canonical/discussion-community-entry-47f9438.md](content/canonical/discussion-community-entry-47f9438.md)。
- Discussions 新问题分流卡：[content/canonical/discussion-triage-41.md](content/canonical/discussion-triage-41.md)。
- Discussions 当前 revision 复核事实卡：[content/canonical/dsh-discussions-revision-20260813.md](content/canonical/dsh-discussions-revision-20260813.md)；它只记录列表变化，不把用户报告写成官方修复。
- 国产模型与网关矩阵：[labs/provider-matrix/README.md](labs/provider-matrix/README.md)。
- 第三方插件迁移诊所：[content/canonical/plugin-migration-clinic-47f9438.md](content/canonical/plugin-migration-clinic-47f9438.md)。
- 扩展点中文能力地图：[content/canonical/extension-map-47f9438.md](content/canonical/extension-map-47f9438.md)。
- 安全边界实测手册：[content/canonical/security-boundary-47f9438.md](content/canonical/security-boundary-47f9438.md)。
- Cordis 无 Key mini-lab：[labs/cordis-no-key/README.md](labs/cordis-no-key/README.md)。
- Python SDK 安全自动化配方：[labs/python-sdk-safety/README.md](labs/python-sdk-safety/README.md)。

GitHub 已通过连接器同步当前公开候选的 dsh-learn 母仓，并包含术语 FAQ、Cordis 无 Key mini-lab（含可重复探针）、中文 Discussions 最小复现模板、社区入口卡和新问题分流卡、插件迁移诊所、安全边界手册、provider 矩阵、Python SDK 安全配方、扩展点能力地图、DSH 无 Key 新手入口和会话内容搜索 opt-in 教程；术语 FAQ、DSH 无 Key 新手入口、Cordis 无 Key mini-lab 和会话内容搜索教程已通过已登录的“平凡ZhiH”微博账号获得真实发布回执，社区入口卡已有微博回执，新问题分流卡当前已获得 GitHub 回执，微博稿因账号近期已有原创内容暂留 outbox。术语 FAQ、Cordis mini-lab、Python SDK 安全配方、DSH 无 Key 新手入口和会话内容搜索教程也已通过知乎创作中心获得真实文章 URL。知乎发布必须经过主理人明确同意，本轮没有发布知乎。其余渠道和稿件仍可能只有本地 outbox。GitHub、微博、知乎回执、阅读数据和当前限制详见 [实施状态](docs/IMPLEMENTATION_STATUS.md)；未有回执的内容仍不得写成已发布。

## 常用命令

```bash
# 拉取官方 HEAD/npm/文档、Discussions、插件 topic 和 DSH 生态仓库，变化时自动标记关联资产失效
pnpm ops watch

# 查看队列、渠道、资产与“下一项为什么是它”
pnpm ops:status

# 做一轮恢复、反馈分析与任务检查；加 --worker 才会原子认领
pnpm ops:cycle
pnpm ops cycle --worker scout-1

# 只把已配置为 DRAFT_ONLY 的队列任务写入渠道 outbox；不会触发真实发布
pnpm ops dispatch-queued --limit 10

# 知乎必须先得到主理人对指定任务的明确批准
pnpm ops approve <publish-job-id> --by "主理人" --note "本次明确同意知乎发布"
pnpm ops dispatch <publish-job-id>

# 运行全部确定性检查
pnpm check
```

源扫描部分失败时，使用 `pnpm ops doctor` 查看 `sourceHealth.errors`；系统会继续本地维护，但不会把失败扫描当成上游稳定。

网络受限但连接器已经核对到公开 revision 时，可以把只含 `id`、`revision` 和可选 `observedAt` 的 JSON 交给 `source-attest`，它不会把远端正文写入本地：

```bash
pnpm ops source-attest evidence/source-attestations/2026-08-13-github.json
```

该命令只清除对应 source ID 的错误，其他未被核对的源继续保持降级状态；revision 变化仍会触发同一套证据、资产和发布任务失效逻辑。

`pnpm check` 同时执行 TypeScript 静态检查和自动化测试。Asset 进入 `READY` 前还必须提供与当前内容哈希绑定的验证回执；教程内容可使用内容审查或 validator，实验、工具和插件必须记录实际通过的命令。

Discussion 工具包还可以单独运行 `pnpm validate:discussion`，检查版本字段、最小复现字段、双语模板、代码围栏、官方链接和常见凭据模式。

Provider 矩阵可以单独运行 `pnpm validate:providers`，检查固定基线、提供方覆盖、`NOT_RUN` 边界和凭据泄漏模式。

第一个插件实验可以单独运行 `pnpm validate:plugin-lab` 做静态检查，再运行 `node labs/hello-plugin/verify.mjs` 在临时 `DSH_HOME` 中真实完成本地 bundle 安装、加载和移除；该探针不读取现有凭据，不发起模型请求。

零基础入口可以运行 `pnpm validate:beginner-entry`，检查 Node.js、npx、Web UI、无 Key 插件实验、官方截图、本地示意图、图片路径和凭据边界；`pnpm validate:plugin-doctor` 会同时检查 pnpm 缺失时的失败提示。

完全新手下载项目后，可以先运行 `node scripts/beginner-doctor.mjs`。它只在本地检查 Node.js、npm、npx、练习文件和路径提示，不联网、不读取 API Key；通过以后会直接打印固定版本的 DSH 启动命令。准备安装插件时，再运行 `node scripts/plugin-doctor.mjs`，它会单独检查 DSH 所需的 pnpm。

工具插件实验可以运行 `pnpm validate:tool-plugin-lab`，检查 `ctx.tools.register`、参数与返回值 schema、bundle manifest 和无 Key 边界；`pnpm validate:tool-plugin-offline` 可以在无网络时验证执行函数和渲染器，真实 DSH 安装探针仍需要 npm registry 可达，模型工具调用仍是 `NOT_RUN`。

启动与插件安装排障教程复用同一份无 Key 实验，并把 CLI、profile、bundle、插件加载、Web UI、模型和工具调用分层；官方 Discussions 中的真实启动、Node、路径和全局安装问题只作为公开排障信号，不被写成同一个故障。

插件迁移诊所可以单独运行 `pnpm validate:plugin-clinic`，检查旧格式边界、当前安装路径、迁移报告字段和代码块完整性。

扩展点地图可以单独运行 `pnpm validate:extension-map`，检查需求决策树、事件语义、生命周期约束和版本边界。

安全手册可以单独运行 `pnpm validate:security`，检查沙箱模式、fail-closed、执行完整性和未运行实验的限定语。

Cordis mini-lab 可以单独运行 `pnpm validate:cordis-lab`，检查隔离 profile、无 Key 边界、固定版本和探针超时保护；真实 npm 探针受当前 registry 网络可用性影响。

Python SDK 安全配方可以单独运行 `pnpm validate:python-sdk-safety`，并用 `preflight.py` 做无 Key 的路径、权限和凭据前置检查；真实 SDK 和模型请求仍需单独授权。

维护任务完成时使用 `pnpm ops maintenance-complete` 更新既有资产的验证回执；它不会伪造新的内容版本，也不会替代上游变化后的证据复核。

有真实发布回执后，可用 `pnpm ops collect-interactions <publish-job-id>` 同步互动；渠道 Agent 也可以按 [渠道中继手册](ops/runbooks/CHANNEL_RELAY.md) 将公开互动快照写入 `state/private/interactions/`，系统会校验绑定、拦截潜在凭据、按 remote ID 去重，并把评论、引用等长期信号送入机会排序。DRAFT_ONLY、outbox 和 MOCK 不会被当成真实互动来源。

`pnpm ops cycle` 会自动执行同样的安全队列派发；它只处理 `DRAFT_ONLY`，会跳过 `MOCK`、未授权和其他模式，并在结果中记录跳过原因。

互动回流也会产生下一步工作：同一资产和渠道累计至少两条评论或提及时，系统会自动创建一个去重的 FAQ/教程修订机会。互动只是线索，仍需重新验证官方事实，不会直接变成公开内容。

已发布资产仍可补发到尚未完成的其他渠道；如果浏览器或渠道 Agent 点击发送后无法判断远端结果，先运行 `pnpm ops remote-unknown <publish-job-id> --reason <说明>`，核验公开 URL 不存在后再运行 `pnpm ops confirm-not-found ...`，禁止盲目重发。

未来准备公开推送前，先运行 `pnpm public-audit`。它只检查 Git 会纳入公开仓库的文件，不执行推送；发现个人路径、临时目录或高置信度秘密时会失败。

完整命令与恢复方式见 [无人值守循环手册](ops/runbooks/AUTONOMOUS_LOOP.md)、[发布与纠错手册](ops/runbooks/PUBLISHING.md) 和 [渠道中继手册](ops/runbooks/CHANNEL_RELAY.md)。
- DSH 无 Key 新手入口：[content/canonical/dsh-beginner-start-rc6.md](content/canonical/dsh-beginner-start-rc6.md)。
- DSH plugin 术语澄清：[content/canonical/dsh-plugin-topic-vs-legacy.md](content/canonical/dsh-plugin-topic-vs-legacy.md)。
- 会话内容搜索 opt-in 教程：[content/canonical/dsh-session-content-search-opt-in-47f9438.md](content/canonical/dsh-session-content-search-opt-in-47f9438.md)。
