# DSH Discussions #550–#552：从文件拖拽排障到本地 RAG 插件

> 历史事实基线，2026-08-13T23:58:15Z，当前来源复核到 2026-08-14T03:01:44Z。DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`，`@deepseek-ai/dsh@0.1.0-rc.6`。DSH 仍处于 Developer Preview，以下社区项目和问题都不等于官方功能或官方修复。

# 标题候选

1. DSH #550–#552 把新手最容易混淆的三层问题放在了一起
2. DSH 文件拖拽、网关兼容和本地 RAG 插件，安装前先看边界
3. 一个社区 RAG 插件为什么不能直接当成 DSH 官方插件安装

# 正文

## 这三条讨论应该怎样放回当前基线

Discussion #550 讲的是 Windows/WSL 用户把文件拖进 DSH Web UI 后，非图片文件出现错误，#551 讲的是 reasoning 模型经过 OpenAI-compatible 网关时的 developer role 兼容性，#552 则展示了一个需要改 DSH 源码并接入 Ollama 的本地 RAG 项目。三条讨论都和新手会遇到的实际问题有关，但它们分别属于输入环境、模型网关和社区集成，不能合成一个 `DSH 出问题了` 的结论。

DeepSeek Harness 官方 Discussions 当前已经复核到 7 页、700 条公开讨论，编号从 #12 到 #720，中间存在编号空缺。#550、#551、#552 是其中三条需要单独解释的历史讨论，刚好落在新手最容易混淆的三层，Web UI 的输入问题、模型网关兼容性，以及社区插件如何接进 DSH。列表从 #614 增长到 #720，只改变了当前观察基线，不会把后来的帖子倒灌进这篇历史复核。

这三条不能放在同一个 `DSH 出问题了` 的篮子里。#550 是用户报告，#551 是功能建议，#552 是社区作者展示自己的实现，证据强度和下一步动作都不一样。

对第一次接触 DSH 的人，第一轮不需要碰源码仓库，也不需要为了验证页面而启动 Ollama。固定版本的 `npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web` 可以把问题缩小到 Node.js、终端下载和本机 Web UI，浏览器能打开 `127.0.0.1` 的 3080 端口，只代表服务已经出现，API Key、工作区和模型请求仍然是后面的事情。

如果页面打开以后输入框不能用，也不要随手把它判断成安装失败，第一次运行可能只是没有 API Key 或没有添加工作区。新手教程应该把这两个状态拍清楚，把终端里的版本、启动命令和页面地址留在同一份记录里，读者遇到问题时才知道自己停在 DSH 本体、浏览器页面还是模型配置。

## #550 还是一条待复现的 Windows/WSL 报告

Discussion #550 的作者描述了这样一个场景，从 Windows Explorer 拖文件到 DSH Web UI 时，图片以外的文件，例如 Markdown 和链接文件，会报错，DSH 是从 WSL 启动的，浏览器使用 Windows Edge 的 PWA 模式。

目前公开内容只有环境描述、错误截图和改进建议，没有最小复现命令、完整错误文本或官方回复。它可以作为 Windows/WSL 新手排障的线索，但还不能据此判断是路径转换、拖拽事件、文件类型过滤，还是 PWA 的浏览器行为出了问题。

#550 对新手的价值在于它把环境差异写了出来，文件来自 Windows Explorer，服务跑在 WSL，页面又通过 Windows Edge 的 PWA 打开，任何一层都可能改变文件路径或拖拽事件。复测记录至少要包括文件扩展名、文件所在磁盘、启动命令、浏览器模式、第一段错误和退出状态，单独一张截图很难把这些变量放在一起。

这类问题也不适合马上给出一条 `换浏览器` 或 `重装 DSH` 的命令，图片可以拖进去而 Markdown 失败，只能说明两种输入走了不同路径，不能据此推出 WSL 或 PWA 就是根因。教程可以把截图放在按钮和页面位置旁边，把命令输出放在验收位置，两个证据不要互相替代。

## #551 把一个网关兼容性开关提到了台面上

Discussion #551 讨论的是 reasoning 模型通过 OpenAI-compatible 网关访问时，系统提示应该使用 `system` 还是 `developer` role。作者认为，一些网关不接受 `developer`，但 DSH 当前没有把 `supportsDeveloperRole` 暴露给 profile，因此用户无法在配置里明确关闭它。

这条讨论中的源码观察可以独立核对。固定 commit 的 `PiAiCompatProfile` 当前只声明 `thinkingFormat` 和 `supportsReasoningEffort`，`resolveModelCompat` 也只把这两个字段转发给 `openai-completions` 模型，没有 `supportsDeveloperRole` 这一项。

但这只证明 `配置入口目前没有暴露这个开关`，不证明作者使用的网关一定会返回 `content_filter`，也不证明把这一项加入配置就能解决所有兼容性问题。讨论里的 provider 请求、网关返回和 workaround，仍然需要在对应模型和接口条件下单独复现。

对没有接触过模型网关的新手来说，`system` 和 `developer` 不是换一个文字标签那么简单，它们会进入实际请求的不同字段，兼容层是否支持某个 role，要看 provider、模型类型和端点协议。遇到类似报错时，记录 provider 名称、baseURL、模型 ID、reasoning 设置和返回状态码，真实凭据留在本机，不要贴进截图或 Discussion。

作者在 #551 里还提到修改 npx 缓存里的编译文件作为 workaround，这种做法即使临时有效，也会随着缓存刷新消失，不能作为新手教程的安装步骤。dsh-learn 更适合把它保留为一个配置边界案例，告诉读者哪里是 DSH 当前公开入口，哪里只是社区提出的补丁方向。

## #552 展示了一个并非一键安装的社区插件

Discussion #552 展示的 `dsh-rag-kb` 想解决的是本地文档检索，浏览器端提供一个可拖动的知识库面板，主机端负责切片、调用本机 Ollama embedding、保存 JSON 索引，并向 DSH 注册 `kb_search`、`kb_index` 和 `kb_status` 工具。作者还写了多知识库、Word 文档提取、中文路径处理和可选桌面控制台等功能。

这个项目最值得新手注意的是安装方式，功能列表反而排在后面。当前公开仓库 main commit 是 `bdfc83238ffeb0bc58839e4c03476c51da558629`，README 要求用户把两个源码包复制进自己的 DSH 仓库，修改 4 处 TypeScript 和 bundle 配置，合并 `cordis.patch.yml`，执行 `pnpm install` 和两次构建，再启动本机 Ollama，最后重新启动 `dsh web`。

所以它现在更接近 `社区源码集成示例`。如果只拿一个 npm 包运行 `dsh plugin add`，还不能得到一个独立 bundle。host 和 client 两个包的版本仍是 `0.1.0-rc.5`，依赖的也是 DSH 源码仓库里的 workspace 包，公开 README 没有给出已经发布的独立 tarball 或一条干净 profile 的安装命令。

从入口源码看，host 包会注入 `webServer`、`fs`、`subprocess`、`sandboxPolicy` 和 `tools`，并通过 `curl.exe` 请求本机 Ollama。这个实现路径带有明显的 Windows 假设，作者的 README 也把文件选择器和桌面控制台写成 Windows 场景。它能不能在 macOS、Linux 或 npm 发布版 DSH 中工作，不能从 Discussion 的展示文字推出。

本轮只做了公开仓库的静态审查，没有下载、安装、构建这个插件，没有启动 Ollama，没有启动 DSH，也没有调用模型 API。因此这里可以确认的是 `项目采用了什么接入方式、公开代码声称提供什么能力`，不能确认 `插件已经兼容当前 DSH` 或 `本地 RAG 已经完成一次成功运行`。

对新手而言，主要门槛不在功能列表，安装动作跨过了多少项目才是问题。这个 RAG 项目同时涉及 DSH 源码、两个 workspace 包、Cordis patch、pnpm 构建、本机 Ollama、Windows 文件选择器和 host 端的子进程能力，任何一步缺失，页面上都可能只剩一个看不懂的错误。

如果以后把它放进生态索引，标题可以写成 `源码集成案例`，不要写成 `安装一个插件`，正文也要把外部服务和权限范围列出来。它需要访问本地文件，调用 `curl.exe`，注册 `/kb` 路由并提供 `kb_search`、`kb_index`、`kb_status`，这些能力都比一个只打印加载日志的 hello plugin 更接近真实使用，也更需要隔离 profile 和脱敏记录。

## 对 dsh-learn 新手层的提醒

新手看到 `DSH 插件` 时，最好先区分三种东西，能够被 `dsh plugin` 安装的 profile bundle，必须复制源码并改 DSH 仓库配置的集成项目，以及只在 Discussions 里展示想法的功能建议。它们都可能叫 plugin，但安装成本、权限边界和可验证结果完全不同。

因此，dsh-learn 的第一层仍然应该从本地 `hello-plugin` 开始，先让读者看懂 `package.json`、bundle patch、profile、加载日志和移除动作，再把 `dsh-rag-kb` 作为 `如何审查一个真实社区集成项目` 的案例。阅读第三方项目时，至少要找出它的安装入口、构建脚本、外部服务、宿主权限和平台假设，不能只看到功能列表就开始复制命令。

这条学习路径可以完全不依赖 API Key，Node.js 和固定版本的 DSH 负责建立启动基线，临时 `DSH_HOME` 负责隔离 profile，hello plugin 负责留下安装、加载和移除记录，读者能够在没有模型回答的情况下确认插件生命周期。等这条路径稳定以后，接入 provider、Ollama 或浏览器自动化，每次新增的变量都有地方可查。

截图在这里主要负责带路，告诉读者 Node.js 下载页、终端、API Key 提示和插件目录分别在哪里，实际验收仍然要看版本输出、`--dump-config`、加载日志和移除结果。当前 dsh-learn 已经把这组截图放在完全新手入口里，但 Windows 和 Linux 的视觉截图仍需要在对应系统真实打开页面以后补齐，不能拿 macOS 画面冒充跨平台实测。

# 备用标题

1. DSH #550–#552 把文件拖拽、网关兼容和本地 RAG 放到了一张图里
2. dsh-rag-kb 不是一条 `dsh plugin add` 命令就能装好的插件
3. 新手看 DSH 社区项目，先分清 Web UI、provider 和源码集成

## 来源

- [官方 Discussions 当前第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [Discussion #550：Windows/WSL 文件拖拽报告](https://github.com/deepseek-ai/deepseek-harness/discussions/550)
- [Discussion #551：`supportsDeveloperRole` 建议](https://github.com/deepseek-ai/deepseek-harness/discussions/551)
- [Discussion #552：`dsh-rag-kb` 插件展示](https://github.com/deepseek-ai/deepseek-harness/discussions/552)
- [固定 commit 的 `catalog.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/llm/llm-pi-ai/src/catalog.ts)
- [`dsh-rag-kb` 社区仓库](https://github.com/AlowEnsoul/dsh-rag-kb)
- [`dsh-rag-kb` README](https://raw.githubusercontent.com/AlowEnsoul/dsh-rag-kb/main/README.md)
