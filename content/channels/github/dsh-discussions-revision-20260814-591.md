# DSH Discussions #565–#591：新插件、工具调度报告与 Windows 启动排障

DeepSeek Harness 官方 Discussions 已复核到 6 页、577 条公开讨论，列表最后编号为 #591。本页固定在 `@deepseek-ai/dsh@0.1.0-rc.6` 和官方 commit `47f9438`，只整理对 DSH 用户、插件作者和新手教程有用的信号。

先说边界：下面提到的第三方插件没有由 dsh-learn 下载或运行，Windows 端口问题没有在 Windows 实机动态复现，也没有调用模型 API。社区讨论中的说法，不自动等于官方功能或官方修复。

## 新手先处理启动问题

第一次使用 DSH，可以先跟随[从安装到第一个插件的完全新手教程](dsh-zero-to-first-plugin-rc6.md)：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web
```

如果 Windows 终端出现 `listen EACCES`，并且错误指向 `127.0.0.1:3080`，先检查端口，不要马上重装 Node.js 或修改插件。

在 PowerShell 中查看 3080 是否已有进程占用：

```powershell
Get-NetTCPConnection -LocalPort 3080 -ErrorAction SilentlyContinue
```

再查看 Windows 是否把这个端口放进了系统排除区间：

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

如果 3080 落在保留范围内，Discussion #589 的作者报告可以换一个端口，例如：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web --port 13080
```

`13080` 只是社区报告里的示例，并非官方规定端口，也不是 dsh-learn 在 Windows 上实测通过的固定答案。以终端最终打印的本机地址为准；换端口仍失败时，再检查 Node.js 版本、权限、路径和启动日志。

## 这几条讨论分别说明什么

- **#565：`dsh-openclaw-acp`。** 这是社区展示的外部 `dsh.bundle`，作者自述包含 ACP 接入、隔离 profile 和打包产物。它说明 DSH 周围开始出现跨工具编排尝试，但它不是官方插件，dsh-learn 也没有验证其安装、运行或 WeChat 通道。
- **#571、#572：工具调度报告。** #571 讨论工具失败后会话无法继续请求，#572 讨论多份物理 `@deepseek-ai/dsh-tools` 副本可能导致 Symbol 查找不一致。这些适合高级插件排障，不能写成 dsh-learn 已经复现的根因，更不能让第一次安装的用户直接修改 `node_modules`。
- **#573：自部署模型与依赖变化。** 这是社区反馈，不是本卡确认的兼容性结论。若要复现，应记录 DSH 版本、provider、profile 和完整依赖树。
- **#591：企业微信联系入口。** 目前只是一个没有解决方案的问答，不能据此判断联系失败的原因。

## 插件作者应该保留什么证据

新手实验仍建议从 dsh-learn 的无 Key、本地、可移除 `hello-plugin` 开始。只有完成基础启动后，才进入第三方插件或外部编排器。

DSH 负责 profile、模型、工具、工作区和沙箱边界，外部编排器负责进程生命周期和消息路由，渠道插件还会带来登录、身份和消息投递权限。系统越复杂，依赖和凭据范围越大，排障时就越需要保留最小复现。

提交新的 Discussion 时，至少写清：

- DSH 精确版本和 commit；
- 操作系统、Node.js、包管理器和 profile；
- 最小命令、实际结果和预期结果；
- 是否能在临时目录或干净 profile 中重复；
- 已经排除的端口、路径、依赖和 provider 差异。

不要把 API Key、Cookie、私有路径或完整内部日志贴到公开讨论中。#587 涉及安全边界，本页不复制其漏洞细节，也不把它改写成公开教程。

## 来源

- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [#565：dsh-openclaw-acp](https://github.com/deepseek-ai/deepseek-harness/discussions/565)
- [#571：工具调度失败后的会话状态](https://github.com/deepseek-ai/deepseek-harness/discussions/571)
- [#572：多份 dsh-tools 物理副本](https://github.com/deepseek-ai/deepseek-harness/discussions/572)
- [#573：自部署模型与 pi 依赖](https://github.com/deepseek-ai/deepseek-harness/discussions/573)
- [#589：Windows 3080 端口启动失败](https://github.com/deepseek-ai/deepseek-harness/discussions/589)
- [#591：企业微信联系入口](https://github.com/deepseek-ai/deepseek-harness/discussions/591)

当前基线：`github-discussions-public-list-through-591-2026-08-14`；6 页，577 条公开讨论，编号从 #12 到 #591。本文没有调用模型 API，没有运行第三方插件，也没有发布知乎。
