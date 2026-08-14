# DSH 社区新增 6 条信号：插件、代理报错和源码安装，先分清能不能直接用

# 标题候选

| 标题 | 点击欲 | 信息量 | 跟我有关 | 可信 | 差异化 | 总分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| DSH 社区新增 6 条信号：插件、代理报错和源码安装，先分清能不能直接用 | 9 | 10 | 9 | 10 | 9 | 47 |
| DSH #565–#570：一个插件能接入 OpenClaw，另外 5 个问题怎么判断 | 9 | 10 | 9 | 10 | 8 | 46 |
| DSH 新手遇到 401、乱码和 pnpm 警告，分别该查哪一层 | 9 | 9 | 10 | 10 | 8 | 46 |
| 从 dsh-openclaw-acp 到 web_search 401，DSH 生态正在暴露哪些真实门槛 | 8 | 10 | 8 | 9 | 9 | 44 |
| DSH 新插件接入 OpenClaw，源码安装却遇到 pnpm 循环依赖 | 8 | 9 | 9 | 10 | 9 | 45 |
| DSH 的 web_search 返回 401，先检查 baseURL 还是 API Key | 9 | 9 | 10 | 10 | 8 | 46 |
| DeepSeek Harness #565–#570，哪些是插件机会，哪些只是待复核报告 | 8 | 10 | 9 | 10 | 9 | 46 |
| 从 DSH 固定版本启动开始，读懂最新 6 条社区排障信号 | 8 | 9 | 10 | 10 | 8 | 45 |

推荐标题
DSH 社区新增 6 条信号：插件、代理报错和源码安装，先分清能不能直接用

推荐理由
它同时给出最新范围、读者能遇到的具体问题和文章交付物，不把第三方插件或社区报告夸成官方功能。

# 正文

截至 2026 年 8 月 14 日这次复核，DeepSeek Harness 官方 Discussions 的公开列表已经翻到 `#614`，6 页一共 600 条，编号从 `#12` 到 `#614`，中间存在编号空缺。本文仍专门复盘 `#565–#570` 这 6 条历史信号；列表数量的变化只发生在社区讨论里，不能当成 DSH 发布了新版本。官方代码基线仍按 commit `47f9438` 记录，npm 上新手路径使用的仍是 `@deepseek-ai/dsh@0.1.0-rc.6`。

但这 6 条新讨论很有用，因为它们把新手和贡献者会遇到的门槛摆在了不同位置，有人在展示插件，有人在接第三方模型，有人在调 web_search，有人在源码安装时看到 pnpm 警告，还有人开始讨论 AI 是否应该替用户发社区帖子。它们不能混成一张 `DSH 已经支持什么` 的功能表。

如果你只是想先打开 DSH，看 Web UI 能不能正常出现，仍然沿用固定版本的 `npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web`，先验证 Node.js、终端和本地页面，不用一上来安装 OpenClaw，也不用先处理源码 workspace。网页能打开、API Key 提示能被跳过，和模型请求成功是三件不同的事，先把这三层分开，后面的报错才有位置可放。

如果你是想开发插件，才进入 profile、bundle、Cordis patch 和外部渠道这些内容。插件实验可以在临时 `DSH_HOME` 里完成安装、加载和移除，第三方仓库则要另外看它的版本、依赖、权限和动态测试记录，不能因为仓库里有一条安装命令，就把它当成新手默认入口。

## #565 插件接入 OpenClaw

Discussion #565 展示了社区插件 `dsh-openclaw-acp`。截至本次复核，仓库主分支为 commit `ac475fa`，公开 release 已是 `v0.1.3`；`package.json` 声明依赖 `@deepseek-ai/dsh-acp@0.1.0-rc.6`，插件入口文件则通过 ACP 把 Harness profile 暴露给 OpenClaw。

当前 README 给出的路径是：先安装 `@deepseek-ai/dsh@0.1.0-rc.6`，再用 `dsh plugin --profile openclaw add` 安装发布的 `.tgz` bundle，最后用 `dsh --profile openclaw --dump-config` 检查配置。这是跨 DSH、OpenClaw、ACPX、渠道插件和模型凭据的进阶路径，不能替代新手先用固定版本打开 DSH Web UI 的入口；dsh-learn 只核对了公开文件和发布元数据，没有执行这条安装命令。

这个项目的分工写得比较清楚，Harness 负责 agent、模型、工具、workspace sandbox 和 session log，OpenClaw ACPX 负责进程和消息路由，微信或其他聊天渠道仍然由 OpenClaw 的渠道插件负责。换句话说，仓库标题里虽然出现了 WeChat，但它没有把微信 SDK 塞进 DSH，也不是 DeepSeek 官方发布的微信版 DSH。

对刚接触插件的人来说，这个边界比安装命令本身更值得看。从结构上看，插件是一个外部 `dsh.bundle`，里面有 `index.js` 和 `cordis.patch.yml`，patch 会挂载官方 ACP transport，并通过环境变量选择 provider 和 model。它不是一份可以随便复制到任何 profile 的配置片段，仓库 README 还要求 Node.js、pnpm、OpenClaw ACPX 和模型凭据各自满足条件。

Discussion 作者写了 ACP 初始化、会话创建、stdio JSON-RPC 和新 profile 安装等验证结果，同时明确没有做真实微信投递测试。dsh-learn 这次只核对了仓库、package.json、release、入口文件和 patch，没下载、没安装、没运行这个第三方插件，也没有把作者自述改写成我们的实测结论。

【可选口述区 01 开始｜想口述就用原话替换下方正文，不想口述就保留下方正文｜发布前删除本行】
【口述方向｜可以补充你第一次看到 DSH 支持微信时最容易产生的误解，以及为什么你希望新手教程先讲清官方组件、第三方插件和渠道适配器的关系，不新增未经核验的安装结果｜建议100至200字｜发布前删除本行】

对新手来说，看到一个第三方插件能把 Harness 接到另一个产品上，先不要把它理解成 DSH 已经原生支持这个产品。先看它安装的是 bundle 还是核心包，看它依赖哪个 DSH 版本，再看它把消息发送、模型调用和会话管理分别交给了谁。

仓库 README 给出的安装方式还牵涉全局 pnpm、全局 dsh、OpenClaw ACPX 和模型环境变量，这是一条跨项目路径，不适合拿来替代 DSH 的第一步教程。就算将来要真的尝试，也应该先用临时 profile 记录 `dump-config`，确认 bundle 只挂载了预期的插件，再决定是否让它接触真实渠道。

这里可以把安装过程分成三层来看，第一层是 DSH 自己能不能启动，第二层是 bundle 能不能被 profile 发现并加载，第三层才是 OpenClaw 能不能把 ACP 消息交给它。第一层没有通过时，后两层都不值得排查，第三方渠道也不应该和第一轮无 Key 检查绑在一起。这个顺序会让新手少复制很多与自己当前问题无关的命令。

如果以后要把这个插件写进 dsh-learn 的教程，教程还需要分别记录 Node.js、pnpm、DSH、OpenClaw 和 bundle 的版本，说明模型凭据由哪个进程读取，并把 WeChat 投递标成未做动态验证。这样读者看到的是一条可以逐层复测的路径，不会把一个社区仓库的安装说明误认为官方文档。

【可选口述区 01 结束｜发布前删除本行】

## #566 和 #568 的环境报告

#566 的标题是用 GLM-5.2 时中文经常乱码，正文说英文正常，并附了一张界面截图。这个现象值得进入排障队列，但目前没有足够信息判断乱码发生在模型输出、代理转发、终端编码、浏览器渲染还是字体显示，截图也不能替代请求和响应的最小记录。

#568 只有一条 Node.js 相关的兼容性讨论，正文是 `node-domexception` 的 deprecated warning，目前讨论状态为 CLOSED。deprecated 是依赖维护状态的提示，不等同于 DSH 启动失败，更不能单凭这一行判断 Node.js 版本不兼容；关闭讨论也不等于官方已经确认修复。遇到类似信息，把 Node.js、pnpm、DSH 精确版本和退出码放在一起，然后看命令最后有没有实际失败。

这两个问题暂时最适合进入 `如何收集证据` 的新手教程，不适合变成 `安装某个版本就能解决` 的快捷方案。版本、命令、第一段错误和预期结果没有齐，后续讨论很容易被一张截图带偏。

乱码问题尤其需要把显示位置写清楚，模型返回的原始文本、Web UI 展示、终端输出和复制到剪贴板后的内容，可能不是同一个环节。提交 Discussion 时可以保留一小段已经脱敏的原文，补上模型名、provider、操作系统和 DSH 版本，再说清楚英文是否正常，别把 `中文乱码` 四个字扩展成所有中文模型都不兼容。

## #567 的 401 与搜索端点

#567 讨论的是非官方 Anthropic 兼容代理的凭据调用 `web_search` 时返回 401。讨论作者认为，自己拿到的凭据本身有效，但 `web-search-deepseek` 默认会请求官方 DeepSeek Anthropic 兼容端点，因此 key 和端点不匹配时，用户只能从错误里看到 401，很难知道下一步应该查哪里。

官方固定 commit 的 `web-search-deepseek` 中文 README 可以确认几个具体配置，默认搜索基址是官方 Anthropic 兼容基址，可以通过 `baseURL` 改写，也可以使用 `DEEPSEEK_SEARCH_BASE_URL` 环境变量，聊天模型使用的 `$DEEPSEEK_BASE_URL` 不是搜索提供方的替代配置。这个配置边界足以帮助排查，但官方文档没有替任何第三方代理承诺兼容，也没有证明 #567 的代理在 dsh-learn 环境里成功。

所以遇到 401 时，先把问题拆成两件事，凭据是否被目标端点接受，端点是否真的提供 Anthropic Messages API 和 `web_search` 能力。不要在帖子、截图或日志里粘贴真实 key，也不要因为把 baseURL 改成某个地址后出现一次 200，就把这套配置推广成所有代理都适用。

对没有接触过 provider 配置的新手来说，401 不一定发生在模型本身。请求可能还没有走到你以为的服务，或者搜索提供方仍然在使用默认端点。把 provider 名称、baseURL、apiKeyEnv 和模型名分别记录下来，错误就不再是一团看不懂的数字，真实凭据仍然只留在本机环境或凭据服务里。

这也是为什么教程不能只给出一条复制命令，端点、模型、凭据引用和返回协议分别出错时，表面上都可能只剩一个 401。把每一项记在同一份脱敏记录里，后续换 provider 或换 profile 时，才看得出变化发生在哪个环节。

【可选口述区 02 开始｜想口述就用原话替换下方正文，不想口述就保留下方正文｜发布前删除本行】
【口述方向｜可以补充你希望新手遇到 401 时先查哪个配置，以及为什么教程必须把端点、模型和凭据拆开讲，不新增真实服务商结果或个人密钥｜建议100至200字｜发布前删除本行】

这类报错最值得保留的是排查顺序，先确认请求去了哪里，确认对方认不认这份凭据，模型名和返回格式放在后面讨论。

【可选口述区 02 结束｜发布前删除本行】

## #570 的源码警告和 #569 的社区复核建议

#570 报告从源码执行 `pnpm install` 时出现 workspace 循环依赖警告，讨论列出了 api、sandbox、subagent 和 vendor 之间的若干依赖环，作者还说后续 `pnpm run build` 和 `pnpm dsh web` 可以成功。这仍然是社区成员在 Windows 11、Node.js 24.17.0、pnpm 11.19.0 下的报告，没有经过 dsh-learn 的源码安装复现。

这个问题和新手用 `npx @deepseek-ai/dsh web` 不是一回事。想先打开 DSH Web UI 的人，不需要先 clone 源码、理解 workspace 图或处理贡献者环境的依赖警告，想参与上游开发的人，才需要把 commit、packageManager 指定版本、完整 warning 和 build 结果一起记录下来。两条路径混在一篇 `安装教程` 里，反而会让新手以为必须先处理内部依赖环。

#569 也提醒了 dsh-learn 自己的发布边界

#569 讨论的是 AI 自动发起社区讨论时的人工复核问题，发帖者担心低质量 AI 评论、无意义的本地文件引用和未经整理的长日志把社区淹没。它不是 DSH 功能报告，却和生态运营有关，因为一个能读写外部渠道的 Agent，技术上能做什么，和应该不应该替人发布，是两件事。

dsh-learn 目前把这个边界写得很具体，GitHub 母仓的低风险文件同步可以自动完成，知乎发布必须经过主理人明确同意，涉及凭据、隐私、不可逆操作、公开漏洞和代表个人表态的动作必须停下来。这样做会少一部分即时发布速度，但每份公开内容仍然能回到证据包、版本和发布回执，出了错误也有纠正路径。

这次 #565–#570 更适合被新手当成一张 `先判断问题属于哪一层` 的地图。插件展示看生态边界，乱码和 401 看模型与端点，Node 警告看环境证据，pnpm 循环依赖看源码贡献路径，AI 发帖建议看授权和复核。开始排障时，仍然从固定版本的 DSH 启动、无 Key 页面检查和脱敏后的最小复现开始。

对于教程维护者，这 6 条讨论也提供了更新顺序，先补新手能看懂的安装和端点说明，随后把第三方插件放进生态索引，没有复现条件的报告则留在待验证区。这样读者能知道哪些内容现在可以照着做，哪些内容只能拿来准备下一次排障。

# 备用标题

1. DSH #565–#570：一个插件能接入 OpenClaw，另外 5 个问题怎么判断
2. DSH 新手遇到 401、乱码和 pnpm 警告，分别该查哪一层
3. 从 dsh-openclaw-acp 到 web_search 401，DSH 生态正在暴露哪些真实门槛

# 编辑附录

事实基线：DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`，`@deepseek-ai/dsh@0.1.0-rc.6`，官方 Discussions 分页为 6 页、600 项、编号从 #12 到 #614；本文复盘 #565–#570。社区插件 `dsh-openclaw-acp` 当前主分支为 `ac475fa1c81e350eda53edce9fdf1a3126c5b7b5`，公开 release 为 `v0.1.3`。本文没有调用模型 API，没有安装或运行第三方插件，没有保存 API Key、邮箱、私人路径或私密日志。

官方来源：

- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [Discussion #565](https://github.com/deepseek-ai/deepseek-harness/discussions/565)
- [Discussion #566](https://github.com/deepseek-ai/deepseek-harness/discussions/566)
- [Discussion #567](https://github.com/deepseek-ai/deepseek-harness/discussions/567)
- [Discussion #568](https://github.com/deepseek-ai/deepseek-harness/discussions/568)
- [Discussion #569](https://github.com/deepseek-ai/deepseek-harness/discussions/569)
- [Discussion #570](https://github.com/deepseek-ai/deepseek-harness/discussions/570)
- [web-search-deepseek 中文 README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/web/web-search-deepseek/README.zh.md)
- [dsh-openclaw-acp](https://github.com/BeAChanger/dsh-openclaw-acp)
- [dsh-openclaw-acp v0.1.3 Release](https://github.com/BeAChanger/dsh-openclaw-acp/releases/tag/v0.1.3)
