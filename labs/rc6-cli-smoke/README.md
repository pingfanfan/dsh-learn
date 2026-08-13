# DSH rc.6 无 Key CLI 冒烟测试

## 结论

`@deepseek-ai/dsh@0.1.0-rc.6` 在 macOS、Node.js v25.8.2 环境中通过了无 Key CLI 冒烟测试。验证范围包括 CLI 帮助与版本输出、隔离 profile 初始化、plugin 子命令入口，以及组合配置导出。

本实验没有启动 Web UI、没有调用模型、没有安装第三方插件，也没有使用现有用户的 DSH 配置。因此，`PASS` 只代表下列命令与 profile 基础组合成功，不能外推为模型接入或完整 Agent 工作流已经通过。

## 隔离方式

先创建临时目录，再把 `DSH_HOME` 指向该目录。实际临时路径只用于本次运行，不作为可复用配置提交。

```bash
mktemp -d /private/tmp/dsh-learn-smoke.XXXXXX
```

## 已验证命令

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --help
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
env DSH_HOME=<isolated-temp-dir> npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo --help
env DSH_HOME=<isolated-temp-dir> npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo --dump-config
```

## 观察结果

- `--version` 返回 `0.1.0-rc.6`。
- plugin 命令初始化了 `profiles/demo`，其中包含 `package.json`、`cordis.patch.yml` 和 `pnpm-workspace.yaml`。
- demo profile 的初始依赖为空，`dsh.profile.bundles` 指向 `@deepseek-ai/dsh-base`。
- `--dump-config` 能输出 `@deepseek-ai/dsh-base` 的组合树，其中可见 timer、HMR、LLM、session、sandbox、permission、skill、goal、subagent、workflow 等插件项。
- 未提供 `--profile` 时，`dsh plugin --help` 会报缺少必填 profile，这一点应在教程命令中明确写出。

## 复测触发

以下任一条件变化时重新运行本实验。

- npm latest 不再是 rc.6。
- DeepSeek Harness HEAD 变化并影响 CLI、profile 或 plugin 管理。
- Node.js 主版本或目标操作系统发生变化。
