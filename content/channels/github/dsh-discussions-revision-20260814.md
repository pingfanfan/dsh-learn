# DSH Discussions 当前复核——先看完整分页，再判断用户影响

## 一句话结论

截至 2026-08-14，通过官方 Discussions API 的分页复核，观察到 6 页、521 条公开讨论，编号从 `#12` 到 `#535`，中间存在编号空缺。此前只请求 `per_page=30` 或第一页 `per_page=100`，因此只能看到旧列表的一部分，不能据此判断社区没有新问题。

这次列表增长本身不代表 DSH 发布了新功能，也不代表某个用户报告已经被官方修复。它真正说明的是，早期用户正在集中反馈安装、启动、插件迁移、模型输出和平台兼容问题，这些反馈可以转成更准确的新手入口和排障索引。

## 目前能确认什么

- 早期条目仍包含社区欢迎公告、memory 迁移、Windows 目录选择器和归档会话等讨论，原有的社区入口卡、最小复现工具包和问题分流卡仍有参考价值。
- 新增讨论中可以看到多类真实上手阻力，例如 `#43` 的缺失 `unrun` 依赖、`#46` 的 `dsh web` 启动问题、`#49` 的 ArchLinux 与 `node-pty` 安装问题、`#55` 的全局安装后插件树加载问题，以及 `#111` 的启动卡住。
- 也出现了模型输出、第三方模型视觉能力、VSCode 模式、非 npm 包管理器、远程项目、插件迁移和 CLI 形态等需求或问题，例如 `#68`、`#70`、`#84`、`#86`、`#90` 和 `#102`。
- 这些标题和用户回复是需求与故障信号，不是兼容性承诺。比如 ArchLinux 讨论里的 `bun`、`node-pty`、源码构建等建议，必须按用户自己的系统、Node.js 版本和当前 DSH 版本复测，不能直接写成官方解决方案。

## 对新手入口的直接影响

新手教程应该先覆盖最容易把人挡在门外的路径：Node.js 版本检查、固定版本的 `npx` 启动、不要把全局 `pnpm add` 当成唯一安装方式、路径只使用英文和数字、Web UI 启动与模型配置分开、无 Key 插件实验先验证加载和移除。遇到 `node-pty`、原生依赖或系统包管理器问题，再进入单独的操作系统排障页。

如果你遇到类似问题，先固定 DSH 版本，例如 `@deepseek-ai/dsh@0.1.0-rc.6`，再记录操作系统、Node.js 版本、包管理器、完整错误边界和最小复现步骤。不要只贴一张截图，也不要把未经验证的社区命令写成结论。

下面三张卡可以继续使用。

- [中文最小复现工具包](./discussion-minimal-repro-kit.md)
- [官方社区入口卡](./discussion-community-entry-47f9438.md)
- [新问题分流卡](./discussion-triage-41.md)

## 事实边界

这张卡只记录官方公开 Discussions 列表的分页复核结果和代表性标题。它没有调用模型 API，没有复现 ArchLinux、Windows 或其他用户环境，也没有把任何讨论回复解释成官方兼容性承诺。DSH 的版本和讨论内容仍在快速变化；分页游标、列表摘要和具体问题都要在下一次复测时重新核对。

来源如下。

- [DeepSeek Harness Discussions API 第 1 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=1)
- [DeepSeek Harness Discussions API 第 2 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=2)
- [DeepSeek Harness Discussions API 第 3 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=3)
- [DeepSeek Harness Discussions API 第 4 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=4)
- [DeepSeek Harness Discussions API 第 5 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=5)
- [DeepSeek Harness Discussions API 第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [Discussion #43](https://github.com/deepseek-ai/deepseek-harness/discussions/43)
- [Discussion #46](https://github.com/deepseek-ai/deepseek-harness/discussions/46)
- [Discussion #49](https://github.com/deepseek-ai/deepseek-harness/discussions/49)
- [Discussion #55](https://github.com/deepseek-ai/deepseek-harness/discussions/55)
- [Discussion #68](https://github.com/deepseek-ai/deepseek-harness/discussions/68)
- [Discussion #111](https://github.com/deepseek-ai/deepseek-harness/discussions/111)

验证基线是 DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`，以及 `@deepseek-ai/dsh@0.1.0-rc.6`。


> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。
