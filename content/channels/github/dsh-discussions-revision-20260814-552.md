# DSH Discussions #550–#552：从文件拖拽排障到本地 RAG 插件

> 事实基线：2026-08-13T23:58:15Z；DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`；`@deepseek-ai/dsh@0.1.0-rc.6`。DSH 仍处于 Developer Preview，社区项目和问题都不等于官方功能或官方修复。

DeepSeek Harness 官方 Discussions 已复核到 6 页、538 条公开讨论，最后编号是 #552。最近新增的 3 条内容分别落在 Web UI 输入问题、模型网关兼容性和社区插件集成三层，不能统称为同一种 DSH 故障。

## #550：Windows/WSL 文件拖拽报告

Discussion #550 描述了从 Windows Explorer 拖文件到 DSH Web UI 时，图片以外的文件（如 Markdown 和链接文件）会报错，DSH 从 WSL 启动，浏览器使用 Windows Edge PWA。

公开内容目前只有环境描述、错误截图和建议，没有最小复现命令、完整错误文本或官方回复。因此它是排障线索，不足以判断根因属于路径转换、拖拽事件、文件类型过滤，还是 PWA 行为。

## #551：OpenAI-compatible 网关的 role 兼容性建议

Discussion #551 认为 reasoning 模型通过 OpenAI-compatible 网关访问时，一些网关不接受 `developer` role，而 DSH 当前没有把 `supportsDeveloperRole` 暴露给 profile。

固定 commit 的 `PiAiCompatProfile` 当前只声明 `thinkingFormat` 与 `supportsReasoningEffort`，`resolveModelCompat` 也只转发这两个字段，没有 `supportsDeveloperRole`。这支持“配置入口未暴露该开关”的源码观察，但没有独立复现讨论中的 provider 返回、`content_filter` 或 workaround，不能把 Ideas 写成官方修复。

## #552：`dsh-rag-kb` 是源码集成示例，不是一键 bundle

`dsh-rag-kb` 展示了一个本地 RAG 知识库：浏览器端悬浮面板，主机端文档切片、本机 Ollama embedding、JSON 索引，以及 `kb_search`、`kb_index`、`kb_status` 工具。

当前 README 要求把两个源码包复制进 DSH 仓库，修改 4 处 TypeScript/bundle 配置，合并 `cordis.patch.yml`，执行 `pnpm install` 和两次构建，再启动 Ollama 并重启 `dsh web`。两个包版本为 `0.1.0-rc.5`，依赖 DSH workspace 包，公开资料没有给出独立发布 tarball 或干净 profile 的 `dsh plugin add` 命令。

host 入口注入 `webServer`、`fs`、`subprocess`、`sandboxPolicy` 与 `tools`，并通过 `curl.exe` 请求本机 Ollama。这带有明显的 Windows 假设；能否在 macOS、Linux 或 npm 发布版 DSH 中直接工作，不能从展示文字推出。

本轮只完成公开仓库静态审查，没有下载、安装、构建该插件，没有启动 Ollama、启动 DSH 或调用模型 API。

## 给新手的判断顺序

看到“DSH 插件”时，先区分：能被 `dsh plugin` 安装的 profile bundle、需要复制源码并改仓库配置的集成项目，以及只在 Discussions 里提出的功能建议。dsh-learn 的第一层继续从本地 `hello-plugin` 开始，再用 `dsh-rag-kb` 演示如何查看安装入口、构建脚本、外部服务、宿主权限和平台假设。

## 来源

- [官方 Discussions 第 6 页](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=6)
- [#550](https://github.com/deepseek-ai/deepseek-harness/discussions/550) · [#551](https://github.com/deepseek-ai/deepseek-harness/discussions/551) · [#552](https://github.com/deepseek-ai/deepseek-harness/discussions/552)
- [固定 commit 的 `catalog.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/llm/llm-pi-ai/src/catalog.ts)
- [`dsh-rag-kb` 仓库](https://github.com/AlowEnsoul/dsh-rag-kb) · [README](https://raw.githubusercontent.com/AlowEnsoul/dsh-rag-kb/main/README.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。
