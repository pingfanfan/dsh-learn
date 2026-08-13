# DSH 新手先别急着接模型：用 0 个 Key 看懂 Cordis

发生了什么：我在固定版本 `@deepseek-ai/dsh@0.1.0-rc.6` 上做了一个隔离的 Cordis 无 Key mini-lab。

为什么重要：`--dump-config` 可以先把 profile、bundle 和基础插件树看清楚。这样你知道 DSH 的能力是挂在什么上下文和 seam 上，再决定接 `ctx.llm`、`ctx.tools` 还是 `ctx.commands`。

现在怎么做：运行 `node labs/cordis-no-key/probe.mjs`。它不会读取现有配置、不会调用模型、不会安装第三方插件；网络不可用时会在 20 秒后退出并保留错误原因。

完整实验与官方固定 commit 来源：`labs/cordis-no-key/README.md`。

