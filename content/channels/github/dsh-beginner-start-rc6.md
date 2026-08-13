# 第一次上手 DeepSeek Harness，先跑出一个隔离 profile

第一次看到 DeepSeek Harness，很多人会先找一条命令，把模型接上，然后让它马上完成一个任务。这个愿望很正常，但在 DSH 还处于 Developer Preview 的阶段，最容易浪费时间的地方往往在模型调用之前，你还没有确认自己运行的版本、profile 和插件组合到底是什么。

dsh-learn 目前把新手入口收窄成一个无 API Key 的实验，在隔离目录里运行 `@deepseek-ai/dsh@0.1.0-rc.6`，让它创建一个 demo profile，再把组合配置树打印出来。这个过程不调用模型，也不读取你原来的 DSH 配置，但能把 DSH 的启动入口和 Cordis 的位置先摆到桌面上。

## 先把一棵隔离的 profile 跑出来

已有的 rc.6 冒烟记录来自 macOS、Node.js `v25.8.2`，使用的是临时 `DSH_HOME`，没有 API Key，也没有安装第三方插件，运行结果包括版本输出、帮助信息、demo profile 初始化和 `--dump-config`。现在可以运行配套探针。

```bash
node labs/cordis-no-key/probe.mjs
```

如果你想把命令拆开看，完整手动流程保存在实验 README 中，临时目录只在本次运行中使用，结束以后删掉。这次探针只执行一个入口。

profile 里出现 `package.json`、`cordis.patch.yml` 和 `pnpm-workspace.yaml`。`--dump-config` 输出 `@deepseek-ai/dsh-base` 的组合树，其中可以看到 timer、HMR、LLM、session、sandbox、permission、skill、goal、subagent 和 workflow 等项目。

网络状态也属于结果的一部分，npm registry 不可达时，探针应该记录网络错误并停止，不能把网络故障写成 DSH 失败，也不能把以前成功过一次写成当前版本仍然成功，版本、Node.js、操作系统和 registry 状态都应该留在复现记录里。

有用的输出不在于插件名称越多，而在于 profile 目录有没有在隔离位置生成，配置导出有没有返回，命令退出时临时目录能不能清理。把这三件事分开记录，后面即使某个 provider 或插件失败，也知道故障是在 CLI、profile、依赖安装还是模型请求这一层。

这次实验还会让人看到一个很实际的区别，profile 是本地工作区的边界，bundle 是能力组合的边界，模型凭据则是另一层授权条件。没有 Key 时可以观察前两层，有 Key 以后也不能跳过版本和目录隔离，否则一次试验很容易把缓存、依赖和个人配置混在一起。


在这个实验里，最值得留下的，是命令运行以后 profile 目录的实际变化。目录里多出的文件、配置里的 bundle 指向和退出时留下的错误，都会比一张截屏更容易复查，也能帮助后来的人判断自己跑的是同一个版本。

如果探针因为 registry、Node.js 或本机权限停在中途，记录应该保留失败命令和第一段错误，临时目录可以清掉，原命令不要悄悄改成另一条。下一次网络恢复以后照着同一份记录重跑，结果才有比较意义。

对于第一次写插件的人，这个 profile 还是一个很小的观察窗口。你可以先确认 DSH 把哪些能力放进 bundle，再去看扩展点地图里的服务、事件和生命周期，遇到一个 seam 以后只做一个小改动，问题会比同时改配置、插件和模型调用容易定位。

等到需要接模型时，再新建一个和无 Key 实验分开的工作目录，把 provider、模型名、授权方式和请求结果单独记下。这样一次有 Key 的实验失败，仍然不会覆盖无 Key 基线，也不会让一篇只验证了 CLI 的文章看起来像完整产品报告。


如果你想把命令拆开观察，README 里的手动流程会把隔离目录、版本命令和 profile 命令分开，记录每一步的退出码，比把多条命令粘成一段更容易定位错误。

实验结束后，可以保留脱敏的终端输出和目录清单，再删除临时目录，不要把临时路径写进教程。教程只需要告诉后来的人怎样重新创建隔离目录，不需要把这次运行留下的路径当成固定配置。

等到要接模型时，再新建一个和无 Key 实验分开的工作目录，把 provider、模型名、授权方式和请求结果单独记下。这样一次有 Key 的实验失败，不会覆盖无 Key 基线，也不会让只验证了 CLI 的文章看起来像完整产品报告。

## `--dump-config` 看到的不是一份普通配置

对刚接触 DSH 的人来说，输出里一长串插件名称容易看成安装清单，它更像一张运行时地图。profile 决定这一棵树挂哪些能力，bundle 把可以复用的能力组合起来，Cordis 负责上下文、服务、事件和生命周期，插件则通过这些 seam 进入树里。

所以你想加一个工具时，可以去找 `ctx.tools` 和相关事件，想改变模型能力时再看 `ctx.llm`，需要无模型轮次的命令时看 `ctx.commands`，需要调度或后台任务时看 `ctx.jobs`，不要因为要做一个 Agent 就先复制一份核心循环。这个顺序能把问题从重写 DSH 缩小成接入哪一个已经存在的能力边界。

Cordis 的另一条纪律也应该一起记住，`ctx.effect()` 里注册的监听器、定时器和资源必须有对应的 teardown，profile 重载或插件切换以后，旧资源还留在进程里，问题通常不会在第一次运行时出现，却会在第二次加载时变得很难查。

这一步看起来不像让模型干活，但它很适合用来判断一个框架到底把什么放在核心位置，先把 profile 和组合树看明白，后面遇到插件、事件或者 provider 的问题，至少知道自己正在观察哪一层。

## 还没有 API Key，不代表实验没有结果

无 Key 实验确认了 CLI、隔离 profile 和配置导出这一层，不能确认模型请求、provider 兼容、Web UI、第三方插件、sandbox policy 或真实工具调用。这个范围看起来有限，正好适合第一次上手，因为它把命令能启动和 `Agent 已经可用` 分开了。

如果你的目标只是看看产品，官方 README 的 Web UI 入口可以作为下一条路线，如果目标是写插件，就沿着 profile bundle、`dsh.bundle.patch` 和普通 Cordis 插件继续，如果目标是接入 Python 或无人值守流程，则要另外记录 SDK、Headless、ACP 和授权条件，不能拿这次无 Key 的成功替代后面的验证。

安装陌生的 Git 或 npm 包时，也不要因为包名里出现 DSH 就默认它可信，至少要看 `package.json`、构建脚本和目标提交，确认它会读写哪些目录、是否会执行安装脚本，再决定是否交给拥有本机权限的 Agent。这个动作和模型有没有返回结果没有关系，却会决定第一次实验是否把风险带进了日常配置。

## 看到旧教程，先核对它是哪一版

当前资料里最容易遇到的旧路线，是 `.dsh-plugin`、repository source list 和已经撤掉的 SDK project toolchain。官方固定提交 `47f9438` 的记录显示，repository plugin 路线已经移除，当前主路转向 profile bundle，同一基线下，未发布的 SDK 项目脚手架也被删掉，但 runtime SDK 和协议包不能因此被概括成 `整个 SDK 消失`。

所以一篇 DSH 教程至少要把 commit 或 npm 版本写出来，命令要绑定精确版本，实验要记录环境和输出，文章还要说清楚哪些步骤没有运行。只写 `最新版` 或 `照着做就行`，在这种快速变化的项目里，读者很难知道问题来自命令、版本、网络还是自己的 profile。

你可以把每次复测保存成一张小卡，里面写上 DSH 版本、官方 commit、Node.js 和系统、是否使用 Key、隔离目录、实际命令、退出码、关键输出、没有覆盖的范围。以后上游提交变化，先标记旧卡为 `STALE`，再决定是重跑、修订，还是把它保留为历史资料，不要让一篇已经过期的文章继续占据当前入口。

这也是 dsh-learn 现在更愿意做新手实验而不是一次写完大课程的原因。第一次上手的人需要一条能跑、能解释、能知道边界的路径，维护者需要一份跟版本一起变化的证据，二者合在一起，才不会把一个短暂通过的命令包装成永久教程。

如果你刚开始接触 DSH，可以先把这次实验当作认识框架的入口，等 profile、bundle 和 Cordis 的关系看清楚，再决定自己到底要接模型、写插件，还是做自动化，不用一上来就把所有能力都装进同一个环境。

## 验证范围与来源

- 事实基线：DeepSeek Harness 官方 commit `47f943859bef60e4160492346772ded9b24f765a`；npm latest 记录为 `@deepseek-ai/dsh@0.1.0-rc.6`。
- 本地验证边界：复用 `labs/rc6-cli-smoke/README.md` 和 `labs/cordis-no-key/README.md` 的既有记录；覆盖无 Key CLI、隔离 profile 和 `--dump-config`，不覆盖 Web UI、模型请求、第三方插件和 provider 兼容。
- 实验入口：[labs/cordis-no-key/README.md](../../labs/cordis-no-key/README.md)
- 官方 README：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md>
- 官方架构文档：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.zh.md>
- Cordis 入门：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-primer.zh.md>

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。