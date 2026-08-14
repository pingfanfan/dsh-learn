# DSH Discussions 当前复核：从 #535 的启动报错到 #537 的社区桌面版

## 一句话结论

截至 2026-08-13T23:21:32Z，通过 DeepSeek Harness 官方 Discussions API 的分页复核，观察到 6 页、523 条公开讨论，编号从 `#12` 到 `#537`，中间存在编号空缺。

这次变化不等于 DSH 发布了新版本，也不等于某个用户报告已经被官方修复。它说明的是：早期用户正在同时反馈安装、启动、原生依赖、平台形态和安全隔离等问题或想法。对 dsh-learn 来说，最有价值的动作是把这些信号整理成可验证的入口和索引，而不是替用户下结论。

## 这次新增的三类信号

### #535：Windows 上的 npx 启动与原生依赖错误报告

Discussion #535 的用户报告了在 Windows PowerShell 中运行 `npx @deepseek-ai/dsh web` 时，插件树加载失败；正文里出现 `sharp` 的 `win32-x64` 原生运行时加载失败，以及另一个本地包找不到的错误边界。

这只证明该用户的这次启动遇到了依赖加载问题，不证明所有 Windows 用户都会遇到同样问题，也不证明正文中列出的某条 `npm install` 命令就是官方修复。新手遇到类似错误时，应该保留操作系统、Node.js 版本、DSH 版本、完整错误和包管理器信息，再根据当前官方文档或上游回复复核。

### #536：Linux 沙盒方向的社区想法

Discussion #536 提到为 DSH 增加 Linux 隔离沙盒，并与另一个项目进行能力对比。这是一个值得观察的安全与生态方向，但目前是社区想法，不是 DSH 已经提供的功能，也不是 dsh-learn 可以替用户承诺的安全方案。

在没有固定实现、威胁模型、权限边界和复现实验以前，不应把“Linux 沙盒”写成安装教程，更不能把“可以自进化”当成安全保证。

### #537：社区桌面版展示

Discussion #537 展示了一个社区桌面版，并链接到外部仓库和 Release 页面。它可以作为“DSH 周边生态正在出现”的索引条目，但不是 DeepSeek Harness 官方桌面发行版。安装第三方二进制前，读者仍需要自行核对来源、签名、权限、更新方式和代码可审计性；本卡没有下载或运行它。

## 对完全新手入口的影响

新手教程需要把“命令没有跑起来”再拆细一层：

第一次启动仍然应该使用固定版本的 `npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web`，先确认 Node.js、终端和本机 Web UI，浏览器页面能出现以后，再处理 API Key、工作区和模型。这样遇到 `sharp` 或 `node-pty` 时，读者知道它发生在启动依赖层，不会把社区桌面版、Linux 沙盒和官方 Web UI 混成同一条安装路径。

- `npx` 下载失败、Node.js 版本不满足、插件树加载失败和某个原生依赖加载失败，不应被混写成一个“DSH 坏了”。
- Windows 上出现原生模块错误时，先记录完整错误和运行环境，不要看到社区帖子里的单条命令就直接复制到全局环境。
- DSH 官方 Web UI、社区桌面版和 Linux 沙盒是三个不同层次：官方入口、第三方包装、待验证的隔离能力不能互相替代。
- dsh-learn 的无 Key 插件实验仍然只验证固定版本的本地 bundle 安装、配置发现、加载和移除；它不能证明 Windows 原生依赖、桌面版或模型调用已经可用。

## 目前可以确认什么

- 完整分页当前观察到 6 页、523 条公开讨论，最后编号为 `#537`。
- 官方仓库代码基线仍以 commit `47f943859bef60e4160492346772ded9b24f765a` 记录；本卡讨论的是社区列表变化，不把它当成代码版本发布。
- #535 是用户环境中的启动与依赖错误报告，#536 是社区想法，#537 是第三方项目展示；三者的证据等级和可执行动作不同。
- 早先整理的社区入口、最小复现工具包和问题分流卡仍然有用，但遇到新版本或新错误时必须重新记录事实，不能只复制旧结论。

## 事实边界

这张卡只记录官方公开 Discussions 分页和 #535–#537 的公开内容。它没有调用模型 API，没有复现 Windows 或 Linux 用户环境，没有下载或运行第三方桌面版，也没有把社区回复解释成官方兼容性承诺。

来源如下。

- [DeepSeek Harness Discussions API 第 1 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=1)
- [DeepSeek Harness Discussions API 第 2 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=2)
- [DeepSeek Harness Discussions API 第 3 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=3)
- [DeepSeek Harness Discussions API 第 4 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=4)
- [DeepSeek Harness Discussions API 第 5 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=5)
- [DeepSeek Harness Discussions API 第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [Discussion #535：npx 启动报错](https://github.com/deepseek-ai/deepseek-harness/discussions/535)
- [Discussion #536：Linux 沙盒想法](https://github.com/deepseek-ai/deepseek-harness/discussions/536)
- [Discussion #537：社区桌面版展示](https://github.com/deepseek-ai/deepseek-harness/discussions/537)

验证基线是 DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`，以及 `@deepseek-ai/dsh@0.1.0-rc.6`。

维护基线（2026-08-14）：官方 Discussions 当前已复核到 7 页、700 条公开讨论，编号从 `#12` 到 `#720`；这个新分页只用于刷新来源状态，不改写本卡对 #535–#537 的历史观察，也不把后来的讨论混入结论。
