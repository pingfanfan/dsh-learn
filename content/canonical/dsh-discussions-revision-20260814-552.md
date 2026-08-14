# DSH Discussions #550–#552：从文件拖拽排障到本地 RAG 插件

> 事实基线：2026-08-13T23:58:15Z；DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`；`@deepseek-ai/dsh@0.1.0-rc.6`。DSH 仍处于 Developer Preview，以下社区项目和问题都不等于官方功能或官方修复。

## 官方讨论列表又往前走了几条

DeepSeek Harness 官方 Discussions 现在已经复核到 6 页、538 条公开讨论，最后编号是 #552。最近新增的 3 条内容，刚好落在新手最容易混淆的三层：Web UI 的输入问题、模型网关兼容性，以及社区插件如何接进 DSH。

这三条不能放在同一个“DSH 出问题了”的篮子里。#550 是用户报告，#551 是功能建议，#552 是社区作者展示自己的实现，证据强度和下一步动作都不一样。

## #550 还是一条待复现的 Windows/WSL 报告

Discussion #550 的作者描述了这样一个场景：从 Windows Explorer 拖文件到 DSH Web UI 时，图片以外的文件，例如 Markdown 和链接文件，会报错；DSH 是从 WSL 启动的，浏览器使用 Windows Edge 的 PWA 模式。

目前公开内容只有环境描述、错误截图和改进建议，没有最小复现命令、完整错误文本或官方回复。它可以作为 Windows/WSL 新手排障的线索，但还不能据此判断是路径转换、拖拽事件、文件类型过滤，还是 PWA 的浏览器行为出了问题。

## #551 把一个网关兼容性开关提到了台面上

Discussion #551 讨论的是 reasoning 模型通过 OpenAI-compatible 网关访问时，系统提示应该使用 `system` 还是 `developer` role。作者认为，一些网关不接受 `developer`，但 DSH 当前没有把 `supportsDeveloperRole` 暴露给 profile，因此用户无法在配置里明确关闭它。

这条讨论中的源码观察可以独立核对。固定 commit 的 `PiAiCompatProfile` 当前只声明 `thinkingFormat` 和 `supportsReasoningEffort`，`resolveModelCompat` 也只把这两个字段转发给 `openai-completions` 模型，没有 `supportsDeveloperRole` 这一项。

但这只证明“配置入口目前没有暴露这个开关”，不证明作者使用的网关一定会返回 `content_filter`，也不证明把这一项加入配置就能解决所有兼容性问题。讨论里的 provider 请求、网关返回和 workaround，仍然需要在对应模型和接口条件下单独复现。

## #552 展示了一个并非一键安装的社区插件

Discussion #552 展示的 `dsh-rag-kb` 想解决的是本地文档检索：浏览器端提供一个可拖动的知识库面板，主机端负责切片、调用本机 Ollama embedding、保存 JSON 索引，并向 DSH 注册 `kb_search`、`kb_index` 和 `kb_status` 工具。作者还写了多知识库、Word 文档提取、中文路径处理和可选桌面控制台等功能。

这个项目最值得新手注意的是安装方式，功能列表反而排在后面。当前 README 要求用户把两个源码包复制进自己的 DSH 仓库，修改 4 处 TypeScript 和 bundle 配置，合并 `cordis.patch.yml`，执行 `pnpm install` 和两次构建，再启动本机 Ollama，最后重新启动 `dsh web`。

所以它现在更接近“社区源码集成示例”。如果只拿一个 npm 包运行 `dsh plugin add`，还不能得到一个独立 bundle。两个包的版本是 `0.1.0-rc.5`，依赖的也是 DSH 源码仓库里的 workspace 包；公开 README 没有给出已经发布的独立 tarball 或一条干净 profile 的安装命令。

从入口源码看，host 包会注入 `webServer`、`fs`、`subprocess`、`sandboxPolicy` 和 `tools`，并通过 `curl.exe` 请求本机 Ollama。这个实现路径带有明显的 Windows 假设，作者的 README 也把文件选择器和桌面控制台写成 Windows 场景。它能不能在 macOS、Linux 或 npm 发布版 DSH 中工作，不能从 Discussion 的展示文字推出。

本轮只做了公开仓库的静态审查，没有下载、安装、构建这个插件，没有启动 Ollama，没有启动 DSH，也没有调用模型 API。因此这里可以确认的是“项目采用了什么接入方式、公开代码声称提供什么能力”，不能确认“插件已经兼容当前 DSH”或“本地 RAG 已经完成一次成功运行”。

## 对 dsh-learn 新手层的提醒

新手看到“DSH 插件”时，最好先区分三种东西：能够被 `dsh plugin` 安装的 profile bundle，必须复制源码并改 DSH 仓库配置的集成项目，以及只在 Discussions 里展示想法的功能建议。它们都可能叫 plugin，但安装成本、权限边界和可验证结果完全不同。

因此，dsh-learn 的第一层仍然应该从本地 `hello-plugin` 开始，先让读者看懂 `package.json`、bundle patch、profile、加载日志和移除动作，再把 `dsh-rag-kb` 作为“如何审查一个真实社区集成项目”的案例。阅读第三方项目时，至少要找出它的安装入口、构建脚本、外部服务、宿主权限和平台假设，不能只看到功能列表就开始复制命令。

## 来源

- [官方 Discussions 当前第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [Discussion #550：Windows/WSL 文件拖拽报告](https://github.com/deepseek-ai/deepseek-harness/discussions/550)
- [Discussion #551：`supportsDeveloperRole` 建议](https://github.com/deepseek-ai/deepseek-harness/discussions/551)
- [Discussion #552：`dsh-rag-kb` 插件展示](https://github.com/deepseek-ai/deepseek-harness/discussions/552)
- [固定 commit 的 `catalog.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/llm/llm-pi-ai/src/catalog.ts)
- [`dsh-rag-kb` 社区仓库](https://github.com/AlowEnsoul/dsh-rag-kb)
- [`dsh-rag-kb` README](https://raw.githubusercontent.com/AlowEnsoul/dsh-rag-kb/main/README.md)
