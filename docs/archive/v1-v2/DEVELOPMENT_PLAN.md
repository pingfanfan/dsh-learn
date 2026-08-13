# dsh-learn 早期领先开发计划（V2，已归档）

> 状态：当前执行事实源
> 制定日期：2026-08-13
> 适用阶段：DeepSeek Harness Developer Preview 早期
> 执行假设：单人维护，每天投入 4 至 6 小时；时间不足时按 P0 顺序顺延，不同时展开更多产品线

## 1. 这次重新规划后的结论

`dsh-learn` 不做插件市场，不做大型 Web 控制台，也不先钻进 Cordis 的底层实现。项目要抢的是 DeepSeek Harness 早期最容易被长期占住的入口：**一个新用户从听说 DSH，到完成第一个经过验证的真实任务，会优先找到并使用谁的路径。**

最终产品是一套“版本化、可执行、能验证结果”的上手实验室，由 4 个部分组成：

1. 中文优先的快速上手与任务配方；
2. 一个很轻的本地 CLI，负责环境检查、创建练习现场、验证结果和安全重置；
3. 跟踪 DSH 版本变化的兼容状态与更新雷达；
4. 围绕真实实验持续发布的文章、短视频、FAQ 和社区答疑。

这里优先看发布时间、成功率、更新速度和被引用次数，代码量排在后面。代码负责降低教程失效的概率，也负责把“照着做了”推进到一个能被检查的结果。

## 2. 要获得什么领先优势

### 2.1 30 天目标

到第 30 天，`dsh-learn` 应当具备以下位置：

- 搜索 DeepSeek Harness 中文教程、新手入门、安装失败或第一个任务时，能稳定看到 `dsh-learn` 的内容；
- 新用户可以在 15 至 20 分钟内完成一个真实任务，并由本地检查器确认成功；
- DSH 发布新版本或改变关键命令以后，24 小时内能显示兼容状态，48 小时内完成核心路径复测；
- 至少有 3 位插件作者或社区成员愿意链接、补充或共同维护一条任务配方；
- 社区开始把环境、版本和复现步骤完整的问题带到 `dsh-learn`，形成持续可用的故障素材；
- “平凡心智 / pingfan”与这个新手入口形成稳定关联，而不是只留下几篇分散文章。

### 2.2 可以持续积累的资产

项目每次迭代至少增加下面一种资产：

- **搜索资产**：围绕具体问题的中文页面、文章和视频；
- **代码资产**：跨版本可复用的环境检查、验证器和安全重置；
- **数据资产**：版本、系统、失败原因和最后验证日期；
- **社区资产**：使用者、插件作者、贡献者和被官方回应的问题；
- **个人品牌资产**：所有对外内容都回到同一个仓库、同一个名称和同一套实验。

不增加这 5 类资产之一的功能，早期不做。

## 3. 当前生态和产品空位

截至 2026-08-13，官方已经具备以下能力：

- `dsh plugin --profile <name> add/remove/update`，安装生命周期交给 pnpm 和 profile bundle；
- Web Settings 中已有只读插件列表；
- 官方文档已经包含 Web UI 入门、模型配置、插件开发、插件打包安装、Cordis 生命周期和完整 Cordis 教程；
- 官方曾做过专用 repository-plugin 和项目脚手架，随后因为重复、没有真实使用者或维护成本过高而删除。

社区也已经出现：

- `plugin-registry`：插件安装态控制台和插件开发引导；
- `dsh-plugin-check`：插件清单、构建和 bundle 合规检查；
- 多个 awesome-list 和每日插件目录；
- `dsh-101`：官方文档阅读界面；
- `dsh-explain`：从真实会话生成持续学习内容；
- `dsh-plugin-dev`：内测期间积累的插件开发踩坑档案。

`dsh-learn` 的空位集中在官方和上述项目尚未同时解决的 4 件事：

1. 新用户能否完成第一个具体任务；
2. 结果是否能由机器验证；
3. 失败以后是否知道下一步并能恢复练习现场；
4. 上游变化以后，这条路径现在还能不能用。

### 3.1 与现有项目的边界

| 已有项目 | 它负责什么 | dsh-learn 的处理 |
|---|---|---|
| 官方文档 | 权威 API、概念和标准流程 | 引用，不复制；把文档串成任务路径 |
| plugin-registry | 插件管理和开发引导 | 不做安装器；只做一条经过验证的安装实验 |
| dsh-plugin-check | 插件仓库合规扫描 | 不重复扫描；需要时把它作为高级配方 |
| awesome-list | 插件发现和分类 | 不维护全量目录；只维护解决真实任务的少量配方 |
| dsh-101 | 文档阅读 | 不做阅读器；让用户边做边验证 |
| dsh-explain | 从工作会话中持续学习 | 不做长期学习线程；负责第一次成功和基础练习 |
| dsh-plugin-dev | 深度插件开发经验 | Builder 路径引用它，不重新整理同一批坑 |

## 4. 产品定位

### 4.1 一句话定位

`dsh-learn` 帮助第一次使用 DeepSeek Harness 的人，在一个不会伤到真实项目的练习目录里，完成并验证第一个任务。

### 4.2 首要用户

首版只优先服务一种人：会安装 Node.js、愿意复制少量命令，但没有使用过 DSH 的开发者或 AI 工具用户。

他们最常见的阻塞点是：

- 不确定 Node、DSH、端口和模型配置有没有准备好；
- 能启动 Web UI，但不知道下一步应该做什么；
- Agent 说“完成了”，用户不知道文件是否真的改对；
- 不清楚批准一次工具调用会影响哪些文件；
- 教程与当前 DSH 版本不一致，用户无法判断是自己操作错了还是教程过期。

插件作者是第 2 阶段用户，普通用户完成第一条路径以前，不扩写深度 Cordis 课程。

### 4.3 产品承诺

- 5 步以内进入第一条实验；
- 每一步显示版本、权限、预计时间和写入范围；
- 成功由本地证据决定，不采用模型的自我声明；
- 默认只操作 `dsh-learn` 创建的练习目录；
- 已知失效的实验显示 `stale` 或 `blocked`，不继续推荐；
- 不承诺第三方插件安全，也不把 Cordis 生命周期描述成系统级沙箱或万能回滚。

## 5. 为什么选这条路线

| 候选方向 | 首次发布速度 | 后续积累 | 当前重合 | 维护风险 | 决策 |
|---|---:|---:|---:|---:|---|
| 普通教程文章 | 很快 | 较弱 | 高 | 低 | 作为流量入口，不单独成产品 |
| 插件市场/安装器 | 慢 | 中 | 很高 | 高 | 不做 |
| 插件合规扫描 | 中 | 中 | 很高 | 中 | 不做 |
| 深度 Cordis 课程 | 慢 | 强 | 中 | 高 | 30 天以后按需求做 |
| 大型 DSH 插件 | 慢 | 中 | 高 | 高 | 不做首版 |
| 可执行上手实验 + 轻 CLI | 快 | 强 | 低 | 中低 | 主线 |
| 上游更新雷达 + 版本状态 | 快 | 强 | 低 | 低 | 与主线一起做 |

这条主线允许先发布内容，再补工具；工具做出来以后又会反过来提高内容可信度。即使官方将来补齐新手教程，历史兼容记录、任务配方、中文搜索入口和用户反馈仍然可以继续更新。

## 6. 产品结构

### 6.1 最小产品

首个公开 Alpha 由 1 个 npm CLI、1 条硬编码实验、3 篇核心文档和基础 CI 组成。等第 1 条实验被真实用户走通以后，再把它抽成 manifest 并增加更多实验。

CLI 命令：

```text
dsh-learn doctor                 检查运行环境与当前兼容状态
dsh-learn start <lab>            创建练习目录并显示下一步
dsh-learn check [path]           检查任务结果
dsh-learn reset [path] --dry-run 预览并安全重置
dsh-learn report [path]          生成脱敏诊断信息（第 2 周）
```

候选实验：

| 实验 | 是否需要模型 | 用户得到什么 | 验证方式 |
|---|---|---|---|
| `L00-environment` | 否 | 确认 Node、DSH、端口和目录状态 | `doctor` 输出结构化 PASS/WARN/BLOCKED |
| `L01-first-result` | 是 | 让 DSH 在练习目录完成一个小修改 | 检查允许文件、内容和测试结果 |
| `L02-fix-and-reset` | 是 | 经历测试失败、修复、检查和恢复 | 测试通过，reset 后哈希恢复 |
| `L03-plugin-lifecycle` | 否 | 安装、验证并卸载一个本地示例 bundle | 检查 profile 配置和 `--dump-config` |

公开 Alpha 只要求 L00 和 L01 完整可用。L02、L03 默认放到第 15 至 30 天，除非前 10 位用户的反馈明确指向其中之一。

### 6.2 内容产品

首批文档按用户实际动作组织：

1. `5 分钟认识并启动 DSH`；
2. `完成第一个经过验证的任务`；
3. `模型说完成了以后，应该检查什么`；
4. `安装第一个插件：使用官方 profile bundle 流程`；
5. `常见错误：Node、端口、provider、pnpm 和版本不匹配`；
6. `DSH 本周变了什么`，每周固定更新。

每篇文档顶部必须包含：

- 最后验证的 DSH npm 版本或 commit；
- 实测日期；
- 实测系统；
- 是否需要 API Key、网络和费用；
- 会读取或写入什么；
- 当前状态：`verified / community-tested / stale / blocked`。

### 6.3 不做全量插件目录，改做任务配方

第 2 周以后可以加入少量第三方配方，但入口必须是“我要完成什么”，而不是“这里有多少插件”。

一条配方至少包含：

- 问题和适用人群；
- 官方或第三方来源；
- 固定版本或 commit；
- 安装、验证和卸载命令；
- API、权限、网络与构建脚本提示；
- 最后实测环境；
- 失败时的下一步。

配方通过不等于安全审计。对第三方项目只使用 `discovered / install-passed / boot-passed / task-passed` 等事实标签。

## 7. 轻量技术方案

### 7.1 技术约束

- 单仓库、单 npm 包，不建立 monorepo；
- TypeScript ESM，Node 版本与当前支持的 DSH 基线一致；
- pnpm 管理依赖，Vitest 做单元和集成测试；
- 首版没有服务器、账户、数据库、登录和遥测；
- Markdown 是内容事实源，CLI 和 CI 只读取必要的结构化 manifest；
- 不自动安装第三方插件，不执行未经固定版本的远程脚本；
- 首版不修改 `$DSH_HOME`，L03 需要 profile 时使用独立测试 profile，并显示清理步骤。

### 7.2 目录建议

```text
dsh-learn/
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── doctor.ts
│   │   ├── start.ts
│   │   ├── check.ts
│   │   ├── reset.ts
│   │   └── report.ts
│   └── core/
│       ├── baseline.ts
│       ├── paths.ts
│       ├── lab.ts
│       ├── verifier.ts
│       └── redact.ts
├── labs/
│   ├── L00-environment/
│   ├── L01-first-result/
│   ├── L02-fix-and-reset/
│   └── L03-plugin-lifecycle/
├── compatibility/
│   ├── baselines.json
│   └── history/
├── docs/
│   ├── quickstart.zh.md
│   ├── first-task.zh.md
│   ├── plugin-install.zh.md
│   ├── troubleshooting.zh.md
│   └── weekly/
├── scripts/
│   ├── canary.ts
│   └── verify-doc-commands.ts
└── tests/
```

### 7.3 实验 manifest v0

L01 首版把配置写在代码里，避免为了一个实验先设计框架。出现第 2 条经过用户验证、确实需要复用字段的实验以后，再引入短小的 `lab.json`：

```json
{
  "schemaVersion": 1,
  "id": "L01-first-result",
  "title": "第一个经过验证的任务",
  "estimatedMinutes": 15,
  "requiresModel": true,
  "network": "model-only",
  "writes": ["${LAB_ROOT}/**"],
  "supportedDsh": ["current-baseline"],
  "verifier": "./verify.mjs",
  "reset": "snapshot"
}
```

不设计通用工作流语言。只有出现第 3 个无法由当前字段表达的实验时，才扩充 schema。

### 7.4 安全边界

- 默认练习目录位于系统临时目录下的 `dsh-learn/<instance-id>`；
- `start` 创建带随机实例 ID 和初始文件哈希的 marker；
- `reset` 只接受位于允许根目录、marker 完整且 ID 匹配的实例；
- `reset --dry-run` 与实际动作使用同一个动作清单；
- 拒绝 `/`、用户主目录、仓库根、空路径、未展开变量和跳出允许根的符号链接；
- 不显示、记录或写入 API Key，只检查指定变量是否存在；
- 子进程使用参数数组，不拼接用户输入到 shell 字符串；
- 诊断报告默认不包含会话正文、文件正文、环境变量全集和完整主目录。

## 8. 让优势持续增长的循环

### 8.1 上游更新循环

```text
DSH 出现新 commit/npm 版本
        ↓
每日 canary 发现变化并运行核心 smoke test
        ↓
兼容状态变成 verified 或 stale
        ↓
修正文档与实验，记录具体变化
        ↓
发布“本周 DSH 变了什么”
        ↓
搜索、引用、用户反馈继续回到 dsh-learn
```

Canary 只负责发现和报告，不自动把失败步骤改写成看似可用的教程。

### 8.2 用户反馈循环

每一个失败报告都要进入一类明确去向：

- 用户环境问题 → `doctor` 新检查；
- 教程表达问题 → 修改对应步骤；
- DSH 版本变化 → 新 baseline 或 `stale` 标记；
- DSH 缺陷 → 最小复现与 GitHub Discussion；
- 第三方插件问题 → 联系作者或更新配方状态；
- 重复问题 → FAQ 和后续文章。

### 8.3 插件作者合作循环

不要求作者加入另一个目录，而是邀请他们共同维护一条“安装后如何确认真的能用”的配方。作者得到经过验证的入口和反向链接，`dsh-learn` 得到真实场景、外部维护者和新用户。

## 9. 分阶段路线图

### 阶段 A：24 小时内抢到公开入口

产出：

- 确认 GitHub、npm 和社交平台上的统一名称；
- 公开一个中文为主、英文有简短摘要的 README；
- 实测并写出当前版本的最短启动路径；
- 发布 `compatibility/baselines.json` 第一条记录；
- 录制 60 至 90 秒的真实操作 GIF 或视频；
- 准备第一篇对外文章，但所有发布动作单独确认。

退出条件：一个没有参与规划的人只看 README，能够启动 DSH，或者明确知道自己被哪个前置条件阻塞。

### 阶段 B：第 2 至 4 天做出可运行纵向切片

产出：

- `doctor` 和 L00；
- 针对 L01 硬编码的 `start/check/reset --dry-run`；
- macOS 和 Linux CI，Windows 至少运行 Node 与路径安全测试；
- 所有失败信息都带下一步动作。

退出条件：`doctor -> start L01 -> DSH 完成任务 -> check -> reset -> start` 可以重复通过。

### 阶段 C：第 5 至 7 天公开 Alpha

产出：

- npm `0.1.0` 或仓库内等价安装方式；
- quickstart、first-task、troubleshooting 3 篇核心文档；
- 5 位种子用户观察测试；
- 首次 TTFV、失败步骤和人工救援记录；
- GitHub Discussion 的 Show and Tell 草稿；
- 第一篇知乎/公众号长文和一个短视频素材包。

退出条件：至少 3/5 位新用户不经实时救援完成 L01；没有越界写入和凭据泄漏。

### 阶段 D：第 8 至 14 天形成可传播产品

产出：

- 每日 canary 与状态 badge；
- 一篇插件安装配方，只调用官方 `dsh plugin` 流程，不开发安装工具；
- 第 1 期《DSH 本周变了什么》；
- 10 位累计种子用户，整理前 10 个真实问题；
- 邀请 3 位插件作者核对或合作一条任务配方；
- 发布一次带数据的 Show and Tell，而不是只发项目介绍。

退出条件：至少 7/10 位用户完成核心实验；核心路径对上游变化的状态能在 24 小时内更新。

### 阶段 E：第 15 至 30 天建立复利

产出：

- L02、L03 和最小 `lab.json`；
- 累计 6 至 10 条经过验证的实验或任务配方；
- `report` 脱敏诊断；
- 贡献指南和 recipe 模板；
- 3 次以上外部贡献、共同维护或有效反向链接；
- 连续 4 期更新记录；
- 英文 quickstart 和核心错误页；
- 评估是否值得做 DSH 内部教学入口。

只有同时出现以下证据，才进入 DSH 插件开发：

1. 至少 30% 的种子用户明确希望在 DSH 内看到下一步；
2. CLI 课程引擎已经稳定，不需要在插件里复制逻辑；
3. 官方 UI 扩展面没有马上替代这一需求；
4. 预计 5 天内能做出插件纵向切片。

### 阶段 F：31 至 90 天可选扩展

- 新用户路径继续保持轻量；
- Builder Track 只做 3 个最有用实验：最小插件、effect 清理、inject 依赖变化；
- 给优质第三方项目提供事实型兼容 badge；
- 如果 Markdown 已明显影响发现和导航，再上线静态站点；
- 如果官方开放 PR，再根据真实失败记录选择文档、测试或 onboarding 相关贡献。

## 10. 前 14 天的每日安排

| 天数 | 开发主任务 | 内容/社区任务 | 当天必须交付 |
|---|---|---|---|
| D1 | 锁定官方基线，完成启动、provider、profile 插件流程实测 | 统一名称和一句话定位 | baseline 记录、实测笔记、README 骨架 |
| D2 | 建仓库、工具链和 `doctor` 骨架 | 写 quickstart，录真实启动画面 | 可公开 README、quickstart 初稿 |
| D3 | 完成 `doctor --json` 和错误模型 | 发布或准备第一个短内容 | doctor 在 3 个系统 CI 中运行 |
| D4 | 完成 marker、路径保护、`start` | 写 first-task | L01 练习目录可创建 |
| D5 | 完成 L01 专用 `check`、`reset --dry-run` | 整理 5 个常见错误 | 核心纵向切片 E2E 通过 |
| D6 | 打包 CLI，修安装问题 | 找 3 位新用户观察测试 | Alpha 安装命令可用 |
| D7 | 修复前三大阻塞 | 完成第 1 篇长文和演示视频 | 3/5 用户独立完成 |
| D8 | 完成 canary 和 baseline 状态更新 | 把真实失败补进 FAQ | 上游变化能自动触发报告 |
| D9 | 修跨平台和安装阻塞 | 写官方插件流程配方 | 核心路径在支持矩阵通过 |
| D10 | 增加诊断脱敏和 `report` 骨架 | 写第 1 期变化摘要 | 可分享的脱敏报告 |
| D11 | 修前 10 位用户的共同阻塞 | 英文 README 摘要 | 累计 7/10 用户完成 |
| D12 | 完善贡献模板和 recipe 约定 | 联系 1 至 2 位插件作者 | 外部贡献入口清楚 |
| D13 | 修文档命令漂移和跨平台问题 | 发布带数据的 Show and Tell | 公开完成率与已知限制 |
| D14 | 做 2 周复盘，删除低价值工作 | 规划下 2 周内容 | Go/Pivot/Stop 决策记录 |

## 11. 内容与分发计划

### 11.1 内容事实源

GitHub 仓库是唯一事实源，知乎、公众号、X、掘金和视频只重新讲述其中已经实测的路径。命令变化时先更新仓库，再更新外部内容中的状态和链接。

### 11.2 首批内容组合

同一次实验拆成不同传播形态：

- GitHub：完整步骤、版本、代码和验证器；
- 知乎/公众号：为什么值得试、真实过程、最容易卡住的地方；
- 60 至 90 秒视频：从 `doctor` 到 `check PASS`；
- X/微博：一个结果、一个坑、一个链接；
- Discussion：复现数据、已知限制和希望社区反馈的问题。

前 14 天只围绕 4 个主题：

1. DSH 是什么，和模型、Codex/Claude Code 的区别是什么；
2. 当前版本怎样从零运行并完成第一个任务；
3. 如何看权限、文件变更和测试结果；
4. DSH 更新以后，原来的教程哪里变了。

不为了保持日更而写空泛概念文。每个公开内容至少链接一个可运行实验、一个实测结果或一个明确失败。

### 11.3 社区在场

每天预留 30 至 45 分钟：

- 只回答自己已经复现的问题；
- 回答中给版本、系统、命令和结果；
- 同类问题出现第 2 次时写进 FAQ；
- 能确认是上游缺陷时整理最小复现，再发 Discussion；
- 不在无关讨论中机械推广项目。

## 12. 衡量“领先”的指标

Star 记录但不作为完成条件。每周使用下面 5 组指标：

| 维度 | 14 天目标 | 30 天目标 |
|---|---:|---:|
| 首次价值 | 核心路径完成率 ≥70%，TTFV 中位数 ≤20 分钟 | 完成率 ≥80%，TTFV ≤15 分钟 |
| 新鲜度 | 上游变化 24 小时内更新状态 | 核心教程 48 小时内完成复测 |
| 可发现性 | 2 个外部有效链接或引用 | 5 个以上外部链接，核心关键词可找到 |
| 社区网络 | 10 位种子用户、1 次有效作者合作 | 3 位外部贡献者或共同维护者 |
| 权威信号 | 1 个带复现的 Discussion | 3 个有效反馈，至少 1 个被维护者确认或引用 |

辅助数据：GitHub unique visitors、clone、npm downloads、文章收藏率、视频完播、Discussion 回复和外部链接。不同平台口径不混合相加。

## 13. 范围控制和转向条件

### 13.1 明确不做

- 不做插件 registry、市场和一键安装器；
- 不做全量插件安全评分；
- 不做另一套插件脚手架；
- 不复制官方完整文档；
- 不做云端账号、排行榜、课程平台和社区服务器；
- 不在首版接管真实用户项目的恢复；
- 不把论文形式化推导当作早期主线；
- 不同时维护 20 条未经测试的教程。

### 13.2 Go/Pivot/Stop

| 观察到的情况 | 动作 |
|---|---|
| D7 前 5 位用户里少于 2 位完成 L01 | 停止扩功能，重做安装和第一条实验 |
| 官方上线同类可执行 onboarding | 转向中文任务配方、故障库和版本变化摘要 |
| 竞品做出更完整的新手实验室 | 优先合作、贡献配方或专注 Windows/中文，而不是复制 |
| CLI 开发超过 2 天仍没有纵向切片 | 砍掉 manifest 抽象，先硬编码 L00/L01 |
| 每周兼容维护超过 6 小时 | 只保证最新已发布版本，master 改为 canary 不承诺修复时限 |
| 第三方配方无法稳定 CI | 降级为 `community-tested`，不执行不可信安装脚本 |
| 30 天后没有外部完成记录、贡献或引用 | 停止产品扩展，保留为内容与个人学习仓库 |

## 14. 风险和处理

| 风险 | 处理 |
|---|---|
| DSH 变化太快 | baseline、状态标记、每日 canary；不承诺 `latest` 永远可用 |
| 官方快速补齐教程 | 依靠验证器、真实任务、中文内容和历史兼容数据继续差异化 |
| 内容先发但很快过时 | 所有文章回链仓库的当前状态页，外部文章标注实测日期 |
| 安全 reset 出错 | marker、canonical path、dry-run、危险路径测试，默认拒绝 |
| API Key 泄漏 | 只检查存在性，不打印值；诊断再次扫描敏感模式 |
| 第三方插件执行任意代码 | MVP 不自动装第三方插件；配方固定版本并明确构建脚本边界 |
| 个人维护精力被社区问答耗尽 | 同类问题第 2 次进入 FAQ；每天答疑设置时间上限 |
| 名称与官方产生误解 | README、npm description 和页面顶部都写明非官方社区项目 |

## 15. 维护节奏

项目进入稳定期以后，每周预算控制在 5 至 6 小时：

- 1 小时检查 canary 和版本变化；
- 2 小时修核心实验和文档；
- 1 小时整理 FAQ 与社区反馈；
- 1 小时发布周更摘要；
- 1 小时处理贡献和合作配方。

新增实验必须替换一个低价值维护项，或者有外部共同维护者。没有人使用的实验连续 30 天不扩写，只保留当前状态。

## 16. 决策记录

### 已确定

- 主品牌继续使用 `dsh-learn`；
- 中文优先，英文保留最短可发现入口；
- 先公开内容，再补 CLI，不等待完整课程体系；
- CLI 优先于 DSH 内插件；
- 官方命令和 profile bundle 是插件安装事实源；
- 第三方项目采用事实型测试状态，不使用“安全”“可信”一类过度承诺；
- 14 天目标是形成一个能传播的纵向切片，不是完成大型平台。

### D1 必须实测后确定

- 第一个支持的 DSH npm 版本和 commit；
- Node 最低版本；
- provider 配置的最短真实路径；
- Windows 原生、WSL、macOS 和 Linux 的支持级别；
- npm 包名是否可用；
- L01 的具体夹具和可稳定验证的结果。

## 17. 研究依据

- DeepSeek Harness 官方 README：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/README.zh.md>
- 官方贡献方式：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/CONTRIBUTING.md>
- 官方插件打包与安装：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/docs/user/develop/basic/publish.zh.md>
- 官方 `dsh plugin` 实现：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/apps/cli/src/plugin.ts>
- repository-plugin 移除决策：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md>
- SDK 项目脚手架移除决策：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/.agents/notes/implemented/simplification/2026-08-11-remove-sdk-project-toolchain.md>
- 官方只读插件 inventory：<https://github.com/deepseek-ai/deepseek-harness/blob/47f9438/packages/host/plugin-inventory/README.md>
- plugin-registry：<https://github.com/vlln/plugin-registry>
- dsh-plugin-check：<https://github.com/omdsh-dev/dsh-plugin-check>
- dsh-plugin-dev：<https://github.com/omdsh-dev/dsh-plugin-dev>
- dsh-101：<https://github.com/bill9109/dsh-101>
- dsh-explain：<https://github.com/yuezengwu/dsh-explain>

## 18. 现在开始时只做这 5 件事

1. 锁定当前 DSH baseline，并在本机完成全流程实测；
2. 确认 `dsh-learn` 的 GitHub/npm 名称；
3. 写出可公开的 5 步 quickstart；
4. 实现 `doctor` 与 L01 的硬编码纵向切片；
5. 找第 1 位没有参与规划的人完整试一次。

第 5 件事完成以前，不做 Web UI、不设计通用课程引擎，也不扩写 Cordis 高级内容。
