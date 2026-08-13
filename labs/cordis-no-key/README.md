# Cordis 无 Key mini-lab：先看清一棵插件树

这是给第一次接触 DeepSeek Harness（DSH）的人准备的无 API Key 实验。目标不是让模型回答问题，而是用一个隔离的 profile 把 DSH 的启动入口、profile 文件和 Cordis 组合配置树看出来。

## 固定基线

- DSH：`@deepseek-ai/dsh@0.1.0-rc.6`
- 官方代码基线：`47f943859bef60e4160492346772ded9b24f765a`
- 本地验证环境：macOS、Node.js `v25.8.2`
- 凭据：不需要 API Key；不读取现有 DSH 配置

DSH 仍是 Developer Preview。下面的输出只能说明这组 CLI/profile/config 入口在固定版本下可用，不代表 `ctx.llm`、`ctx.tools` 或任意第三方插件已经通过运行时测试。

## 运行实验

推荐直接运行配套探针；它会创建临时 `DSH_HOME`，只把输出写到终端，结束后删除临时目录：

```bash
node labs/cordis-no-key/probe.mjs
```

也可以手动拆开观察：

```bash
TMP_DSH_HOME="$(mktemp -d /private/tmp/dsh-learn-cordis.XXXXXX)"
trap 'rm -rf "$TMP_DSH_HOME"' EXIT

env DSH_HOME="$TMP_DSH_HOME" npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
env DSH_HOME="$TMP_DSH_HOME" npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo --help
env DSH_HOME="$TMP_DSH_HOME" npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo --dump-config
```

## 你应该看到什么

1. 版本输出为 `0.1.0-rc.6`。
2. `plugin --profile demo --help` 可以初始化或读取 `profiles/demo`。
3. 隔离 profile 至少包含 `package.json`、`cordis.patch.yml` 和 `pnpm-workspace.yaml`。
4. `--dump-config` 可以看到 `@deepseek-ai/dsh-base` 组合树，以及 timer、HMR、LLM、session、sandbox、permission、skill、goal、subagent、workflow 等插件项。

## 用小白能理解的话解释

可以先把 DSH 想成一棵运行时能力树：

- `profile` 决定这一棵树装哪些能力；
- `bundle` 是一组可以复用的能力组合；
- Cordis 负责上下文、服务、事件和生命周期；
- `ctx.llm`、`ctx.tools`、`ctx.fs`、`ctx.jobs` 等是能力接入点；
- `ctx.effect()` 中注册的东西必须有 teardown，否则重载或切换 profile 时容易留下重复监听器或资源。

因此，开发插件的第一步不是复制 agent loop，而是先用 `--dump-config` 看目标 profile 实际挂载了什么，再去官方架构文档确认对应 seam、事件模式和生命周期约束。

## 这个实验没有证明什么

- 没有启动 Web UI。
- 没有调用真实模型。
- 没有读取、写入或复用用户现有 DSH 配置。
- 没有安装第三方插件。
- 没有证明某个 provider、工具、sandbox policy 或 UI seam 可以在运行时工作。

如果 npm registry 暂时不可达，探针会在 20 秒后停止并保留 npm 的错误输出；这属于环境阻塞，不应被记录为 DSH 通过或失败。可以在网络恢复后原样重跑，不需要改动实验文件。

后续真实实验应分层推进：先做 profile/config 结构测试，再做注册与 teardown 测试，最后才在明确授权和脱敏凭据下做 keyed smoke。每层都要绑定 DSH commit、npm 版本、Node 版本和目标 profile。

## 继续练习

完成一次探针后，可以回到 [扩展点中文能力地图](../../content/canonical/extension-map-47f9438.md)，按“我想改变什么”选择 `ctx.llm`、`ctx.tools`、`ctx.commands` 或 `ctx.jobs`。地图中的 `DOC_BASELINE` 不是兼容承诺；升级 DSH 后必须重新运行本实验并复核官方文档。

## 官方依据

- [DSH 架构文档（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.zh.md)
- [Cordis 入门（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-primer.zh.md)
- [官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
