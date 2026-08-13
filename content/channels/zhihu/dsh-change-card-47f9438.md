# DeepSeek Harness 还在快速变，旧教程最容易错在这两处

DeepSeek Harness 刚开源不久，中文资料还没有铺开，这个时候很容易产生一种错觉，谁先写出一篇很长的安装教程，谁就占住了入口。可把官方仓库当前的说明和最近两项删除记录放在一起看，方向恰好相反，DSH 仍处于 Developer Preview，官方明确提醒后续会有破坏兼容性的变化，早期更稀缺的东西，是有人把版本、命令和已经失效的路线讲清楚。

这张事实卡固定在官方提交 `47f943859bef60e4160492346772ded9b24f765a`，该提交中的 `apps/cli/package.json` 写的是 `@deepseek-ai/dsh@0.1.0-rc.5`，而 npm registry 的 latest 标签在核对时已经指向 `0.1.0-rc.6`。所以运行不带版本号的 npx 命令时，不应假定拿到的是 rc.5，dsh-learn Agent 已在隔离的临时 `DSH_HOME` 中运行 rc.6 的帮助、版本、demo profile 初始化和 `--dump-config`，这些无 Key CLI 检查都成功，但尚未覆盖 Web UI、模型调用与第三方插件安装。以后官方提交变化，这篇内容也要复测，然后决定继续沿用或标记过期。

## 先分清 DSH 是什么，再谈怎么学

DSH 是 DeepSeek 开源的 Agent Harness，它和模型、聊天界面所处的位置不同，负责把模型、工具、上下文、插件和运行流程组织到一起。它建立在 Cordis 上，采用 everything is a plugin 的架构，插件因此贯穿整个系统的组合方式，并非装好主体以后才添加的外围装饰。

目前最简短的官方启动命令仍然只有一行。

```bash
npx @deepseek-ai/dsh web
```

它会启动 Web UI，默认使用本机的 3080 端口，这条命令适合先看产品长什么样，可你要继续装插件、写教程或做二次开发，只记住这一行还不够，因为当前变化较大的部分恰好是第三方能力如何接入。

很多早期资料会自然地追求完整，从目录讲到插件，画完架构图以后再给十几条命令，可 Developer Preview 阶段的完整很可能只有很短的保质期。读者需要掌握的第一课，是认出一篇教程绑定了哪个版本，分清官方已经发布的能力、仓库里尚未发布的试验和已经删除的旧设计，还要知道遇到冲突时回到哪里复核，这比记住更多名词更能少走弯路。


这套资料把 DSH 的早期学习理解成跟着接口一起成长，今天确认官方保留了什么，明天发现命令变化，就把旧文和新文连起来，同时保留修改记录。这样做不会制造一篇号称永远正确的终极教程，却能让后来的人知道某个结论在什么时间、什么版本下成立，也能看见它为什么失效，这种可追溯性会比一次写完更有用。


## 第一条失效路线 `.dsh-plugin` 已经退出现行入口

官方在 2026年8月9日记录了一次明确的简化，专用的 repository plugin 路线被移除，随之拿掉的还有 `@deepseek-ai/dsh-repository-plugin`、`.dsh-plugin` 清单、`dsh-plugin-prepare`、专用缓存、生成包装层和 repository 专用配置项。原因很实际，两套路径都在处理第三方包的安装与组合，但 repository 路线传递的配置更少，维护成本却更高，继续保留只会让用户面对两种清单、两套失败标识和两条安装路线。

当前保留的主路叫可安装的 profile bundle，安装入口如下。

```bash
dsh plugin --profile <name> add <package-or-git-spec>
```

第三方包进入对应 profile 的依赖，由包本身通过 `dsh.bundle.patch` 提供 patch 层，然后在这一层挂载普通 Cordis 插件、skill 或 MCP 客户端，包管理器负责来源、版本、依赖和锁文件，配置则回到统一的组合层。如果一篇教程还让你编写 `.dsh-plugin`，或者维护 repository source list，它讲的就是已经停止工作的接口，照抄以后即使没有立刻报错，也不能据此认为插件已经被当前 DSH 读取。

还有一个容易被忽略的细节，官方明确不提供 `.dsh-plugin` 的兼容解析器和迁移机制，旧缓存也不会被 DSH 自动删除，只是以后不再读取。所以看到本地还有相关目录，不能反推旧插件仍会生效，也不能为了清理而让脚本擅自删除用户目录，合适的处理顺序是核对当前 profile、依赖与锁文件，再由使用者决定遗留数据是否需要保留。

## 第二条失效路线 未发布的 SDK 项目脚手架已撤掉

另一项变化发生在 2026年8月11日，官方删除了尚未公开发布、也没有实际消费者的 SDK project toolchain，其中包括 `@deepseek-ai/create-sdk`、`@deepseek-ai/dsh-scripts`、`@deepseek-ai/dsh-helper` 和 `@deepseek-ai/dsh-telemetry`。相关初始化器、项目模板、开发和构建命令、项目编辑模型及遥测一起移除，同样没有兼容层或替代命令，因为官方判断这套产品需要维护大量包和交互流程，却还没有一个已经发布的项目依赖它。

这件事不能简写成 DSH 的 SDK 被删了，仍被实际功能使用的 runtime SDK 继续保留。具体包括 `@deepseek-ai/dsh-sdk-client`、`@deepseek-ai/dsh-sdk-protocol` 和 `@deepseek-ai/dsh-sdk-jsonrpc-server`，它们从 `packages/scaffold/` 移到 `packages/sdk/`，npm 包名和线协议没有变化。被取消的部分，是替使用者生成并持续管理独立 SDK 开发项目的产品路线，进程外 Agent、Python SDK 和 JSON-RPC 运行时依赖的协议栈还在。

这种区别看起来有点细，却是早期教程很容易写错的地方，只读一个被删除的包名，可能会得出整个 SDK 消失的结论，只看保留的 3 个运行时包，又可能误以为原脚手架还能继续使用。把决定记录、代码位置和发布边界放在一起，才知道官方删掉了哪个尚未证明的产品假设，哪些部分已经有消费者，后面写示例时也就不会把目录移动误写成功能中断。


所以在这个阶段，dsh-learn 不把教程数量多当成领先，更值得积累的是一组可以互相校验的资产，每条结论有官方来源，每条命令带版本，变化发生后知道会影响哪篇文章，读者遇到问题以后还能把反馈送回 FAQ、实验或上游 Discussion。它看起来不算宏大，却会随着版本更新逐渐形成一段连续历史，别人可以复制某一篇文章，却很难一次复制版本映射、复现记录和真实问答积累。


## 现在上手，先做这 4 个检查

第一项检查是版本，教程至少要写 DSH commit 或 npm 包版本，只写最新版的内容，在快速迭代期几乎无法复核。第二项检查是插件路线，出现 `.dsh-plugin`、repository source list 或已经删除的准备工具时，应当停下来对照当前官方仓库。第三项检查是产品边界，项目脚手架被删除和 runtime SDK 被保留需要分别记录，不能拿其中一项替代另一项。第四项检查是来源安全，安装 Git 或 npm 包之前阅读代码、锁定提交，并确认构建脚本是否可信。

第四项并非多余提醒，当前插件路径交给包管理器处理依赖和生命周期，Git 与 npm 包可能在安装或更新时运行构建脚本，这些动作发生在 Agent 沙箱之外。这样安排允许生态包照常构建，同时也把来源判断交给了使用者，对陌生仓库，最好阅读 `package.json`、构建脚本和目标提交，不要把来路不明的安装命令交给拥有大量本机权限的 Agent，也不要因为仓库名字带有 DSH 就默认它经过官方审计。

检查还可以落实到保存方式上，一篇文章除了正文，至少需要记录来源链接、访问时间、事实基线、验证环境和当前结果，代码示例则要保存预期输出或失败日志。等上游 commit 变化时，系统可以按照来源映射找出受影响的文章，把它们标为 `STALE`，此时旧文仍可用于理解历史，但不应继续以当前教程的身份分发，复测成功后才恢复状态。

如果你只是想看看 DSH，可以从官方 Web UI 命令开始，如果要开发插件，就沿着 profile bundle、`dsh.bundle.patch` 和普通 Cordis 插件这条主路继续，如果看到旧教程，则用上面 4 项检查判断它还有没有参考价值。接下来 dsh-learn 会把这类变化持续做成版本化事实卡，把 Agent 的本地复现单独做成实验记录，像这次 rc.6 已验证到 profile 组合，但 Web UI 与模型调用还没有纳入结论，不用范围有限的一次成功替代完整证据。

早期生态能够积累的优势，是让后来的人每次遇到变化，都知道去哪里找到当前事实、迁移办法和失败记录，抢先给一个不断变化的项目下最终定义，过几次版本更新就可能失去价值。DSH 还会继续变，教程也就需要从一次性文章变成可维护资产，这份资产既告诉人们今天怎么做，也诚实保留昨天为什么不再适用。

## 验证范围与来源

- 事实基线：DeepSeek Harness HEAD commit `47f943859bef60e4160492346772ded9b24f765a`；该提交的 CLI 清单为 `@deepseek-ai/dsh@0.1.0-rc.5`；npm registry latest 为 `0.1.0-rc.6`。
- 验证边界：官方仓库文档与实现记录已核对；rc.6 的 CLI 帮助、版本、隔离 profile 初始化和 `--dump-config` 已通过，Web UI、模型调用和第三方插件安装未测试。
- 官方 README：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md>
- 移除 repository plugin：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md>
- 移除 SDK project toolchain：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-11-remove-sdk-project-toolchain.md>
- npm registry latest：<https://registry.npmjs.org/@deepseek-ai%2Fdsh/latest>
- 本地实验：<https://github.com/pingfanfan/dsh-learn/blob/main/labs/rc6-cli-smoke/README.md>

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。
