# DSH Discussions #565–#591：新插件、工具调度报告与 Windows 启动排障

DeepSeek Harness 官方 Discussions 当前已复核到 6 页、600 条公开讨论，列表最后编号是 #614，中间存在编号空缺。这个数字只说明公开讨论列表发生了增长，不代表这些讨论里的建议已经进入 DSH，也不代表社区插件都能直接安装。

本文只整理对 dsh-learn 新手路径和生态观察有帮助的信号。版本基线固定为 `@deepseek-ai/dsh@0.1.0-rc.6`，官方源码观察固定到 commit `47f9438`。没有在本地运行下面提到的第三方插件，没有在 Windows 上动态复现用户报告，也没有调用模型 API。

## 先看结论

- `dsh-openclaw-acp` 是社区展示的外部 `dsh.bundle`，声称完成了 ACP 方向的隔离 profile 和打包产物验证；这证明生态开始出现跨工具编排插件，不证明它是官方插件，也不等于 dsh-learn 已经安装过它。
- #571 和 #572 都围绕工具调度失败，但一个是会话在工具失败后无法继续请求的用户报告，另一个是多份物理 `dsh-tools` 副本导致 Symbol 查找失败的用户诊断。它们值得作为高级排障信号保留，不能写成 dsh-learn 已经复现的根因或官方修复。
- #589 对新手最有价值：Windows 的 `dsh web` 默认端口 `3080` 可能落入 Hyper-V/WSL2/Docker 的系统保留端口区间，出现 `EACCES`。这是一条社区报告，不是我们在 Windows 实机上的复现；遇到它时应该先检查端口，再尝试换端口。
- #591 是企业微信联系入口问答，后续评论仍是用户描述添加失败和个人猜测，没有维护者确认原因或处理结果。
- #587 涉及安全边界讨论。本卡不复制它的漏洞细节，不把它当作公开教程，也不进行安全披露；需要单独的风险审查和上游协调。

## 给完全新手的 Windows 启动分流

如果你第一次启动 DSH，先按[完全新手教程](dsh-zero-to-first-plugin-rc6.md)使用固定版本命令：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

如果 Windows 终端里出现 `listen EACCES`，而且错误指向 `127.0.0.1:3080`，不要马上重装 Node.js，也不要先改插件。先区分“已有程序占用端口”和“操作系统保留端口”两类情况。

在 PowerShell 中检查是否已有进程占用：

```powershell
Get-NetTCPConnection -LocalPort 3080 -ErrorAction SilentlyContinue
```

也可以查看 Windows 的 TCP 保留端口区间：

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

如果 3080 落在保留区间里，#589 的作者报告使用了另一个端口启动，例如：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web --port 13080
```

这里的 `13080` 只是社区报告中的示例，不是官方规定端口，也不是 dsh-learn 在 Windows 上实测通过的固定答案。终端最终打印出什么本机地址，就用那个地址打开浏览器。若换端口仍失败，再回到 Node.js 版本、权限、路径和启动日志逐层排查。

## 为什么把工具调度报告放在高级层

#571 描述了工具执行失败后，已持久化的 `tool_calls` 没有对应结果，后续请求可能被 provider 拒绝。#572 则描述了同一进程加载多份物理 `@deepseek-ai/dsh-tools` 时，Symbol 不一致可能让调度器查找为空。

这两条报告对插件开发者很重要，但不适合让第一次安装 DSH 的读者直接修改 `node_modules` 或 profile 依赖。新手应该先完成以下最小分层：

1. `--version` 能返回固定版本。
2. Web UI 能打开，或能明确记录启动错误。
3. 无 Key 的 `hello-plugin` 能在临时 `DSH_HOME` 中安装、加载和移除。
4. 只有在自己的工具插件出现调度错误时，才记录完整版本、profile、依赖树、工具调用顺序和最小日志。

不要因为一次工具调用失败，就把模型、插件、网络和依赖副本混成同一个故障。先保存会话 ID 和错误边界；不要把 API Key、Cookie、私有路径或完整内部日志贴到公开 Discussion。

## 社区插件观察

#565 展示的 `dsh-openclaw-acp` 把 DSH profile 作为外部 ACP 进程接入 OpenClaw。讨论中给出了 release tarball、profile 安装和 ACP 初始化等作者自述验证，但这些是社区仓库的声明，dsh-learn 没有下载、安装或运行该插件，也没有验证 WeChat 通道。

这类项目可以帮助新手理解“插件不是 DSH 核心代码的一部分”：

- DSH 负责 profile、模型、工具、工作区和沙箱边界。
- 外部编排器负责进程生命周期和消息路由。
- 具体渠道插件负责登录、身份和消息投递。

但跨系统插件的依赖、权限和凭据范围更多。第一次实验仍应从 dsh-learn 的无 Key、本地、可移除 `hello-plugin` 开始。

## 当前证据边界

本卡依据官方 Discussions 当前分页、#565、#571、#572、#573、#587、#589、#591 详情页及部分公开评论整理。#565、#571、#572、#573、#589 和 #591 是社区插件展示、用户报告或问答；它们不是官方 release note。#587 仅作为风险排除项记录，没有复制其安全细节。

如果你要提交新的 Discussion，建议同时写清：

- DSH 精确版本和 commit；
- 操作系统、Node.js、包管理器和 profile；
- 最小命令、实际结果和预期结果；
- 是否能在临时目录或干净 profile 中重复；
- 已经排除的端口、路径、依赖和 provider 差异。

## 来源

- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [Discussion #565：dsh-openclaw-acp](https://github.com/deepseek-ai/deepseek-harness/discussions/565)
- [Discussion #571：工具调度失败后的会话状态](https://github.com/deepseek-ai/deepseek-harness/discussions/571)
- [Discussion #572：多份 dsh-tools 物理副本](https://github.com/deepseek-ai/deepseek-harness/discussions/572)
- [Discussion #573：自部署模型与 pi 依赖](https://github.com/deepseek-ai/deepseek-harness/discussions/573)
- [Discussion #589：Windows 3080 端口启动失败](https://github.com/deepseek-ai/deepseek-harness/discussions/589)
- [Discussion #591：企业微信联系入口](https://github.com/deepseek-ai/deepseek-harness/discussions/591)
- [当前分页基线](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)

验证基线：`@deepseek-ai/dsh@0.1.0-rc.6`；官方 commit `47f943859bef60e4160492346772ded9b24f765a`；官方 Discussions `github-discussions-public-list-through-614-2026-08-14`。本卡没有调用模型 API，没有运行第三方插件，也没有发布知乎。
