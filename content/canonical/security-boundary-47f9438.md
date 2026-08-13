# DeepSeek Harness 安全边界实测手册：先分清文件效果、网络和进程可见性

> 适用基线：DeepSeek Harness `47f9438`。本文解释官方沙箱契约和安全测试方法；已执行的只有无 Key CLI/profile 冒烟，不把未运行的危险或真实后端实验写成通过。

## 先记住一个反直觉结论

DSH 的 `SandboxMode` 只描述文件系统效果。官方文档明确说，网络和进程可见性不属于这个词汇的定义范围。因此“read-only”不能被简写成“网络断开”，“workspace-write”也不能被简写成“只允许当前进程安全工作”。这两件事必须分别验证。

## 三种模式

| 模式 | 官方语义 | 这不代表什么 |
| --- | --- | --- |
| `read-only` | 后端应拒绝文件写入；某些 POSIX runner 仍需 `/dev/null` 等必要 sink | 不代表网络不可达、不代表其他进程不可见 |
| `workspace-write` | 允许工作区根目录和后端承诺的临时区域写入 | 不代表只能修改 Git 已跟踪文件，也不代表网络受限 |
| `danger-full-access` | 绕过隔离，消费方直接 spawn 原始 argv | 不能把它当作普通沙箱模式发送给提供方 |

只有前两种是受约束模式，可以作为 `SandboxPolicy` 的模式。真正的强制执行还要看后端返回的 `full` 或 `partial`：`partial` 不能被当成绝对边界。

## 每次调用都要问的五个问题

1. 当前调用最终解析出的 mode 是什么？是部署默认值、session 记录，还是经过批准的显式覆盖？
2. `workspaceRoot` 是什么？它是按文件系统语义和词法规则规范化后的真实边界吗？
3. 后端返回的 enforcement 是 `full` 还是 `partial`？如果要求绝对保证，`partial` 必须拒绝或向上暴露。
4. 失败是“命令被沙箱正常拒绝”，还是“runner 在执行命令前就坏了”？两者不能混成普通任务失败。
5. 如果没有后端，是否 fail closed？`SANDBOX_UNAVAILABLE` 应该让调用失败，不能静默透传未隔离 argv。

## 安全测试矩阵

### A. 无 Key 静态基线

这一步不会调用模型，也不会执行第三方插件生命周期：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --help
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --version
env DSH_HOME=<isolated-temp-dir> npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile demo --help
env DSH_HOME=<isolated-temp-dir> npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile demo --dump-config
```

结果只能记为：`CLI_PROFILE_SMOKE_PASS`。它不能证明沙箱后端可用、网络被隔离、进程不可见或工具调用安全。

### B. 文件效果探针

在一次性临时 workspace 中，对每个目标后端分别记录：

| 探针 | `read-only` 预期 | `workspace-write` 预期 | 必须记录 |
| --- | --- | --- | --- |
| 读取 workspace 内的固定 fixture | 允许 | 允许 | 退出码和内容摘要 |
| 写入 workspace 内的临时 marker | 拒绝 | 允许 | 实际路径、退出码、后端 dialect |
| 写入 workspace 外的临时 marker | 拒绝 | 拒绝 | 不要使用真实用户目录 |
| 读取不存在的文件 | 失败 | 失败 | 区分普通命令错误和 runner 错误 |
| 访问 `/dev/null` 等必要 sink | 视 POSIX 后端约定 | 视后端约定 | 不把必要 sink 当作任意写权限 |

这组探针只允许使用专门创建的临时目录和无敏感内容的 fixture。不要用用户凭据目录、真实项目根目录或生产数据作为探针目标。

### C. 正交边界探针

文件探针通过后，还要单独记录：网络请求是否可达、其他进程是否可见、子进程是否继承不应继承的环境变量、shell/PTY/LSP 是否都经过同一个后端边界，以及重试提升权限是否产生了一个新的显式调用策略。

这些不是 `read-only` 或 `workspace-write` 词语本身能回答的问题。没有专门的后端证据时写 `NOT_RUN`，不要写“沙箱已安全”。

## 如何读 `ConfinedArgv`

`ctx.sandbox.confine(argv, policy)` 返回的不是一个“安全字符串”，而是实际要 spawn 的 argv、enforcement 完整性、当前后端的 denial dialect 和 runner failure rules。

判定顺序应是：先检查 runner failure rule；再用当前后端自己的 denial signature 判断“命令被限制”；同时记录 `full` / `partial`；没有 enforcing argv 或出现 `SANDBOX_UNAVAILABLE` 时，必须 fail closed。

## 插件作者安全审查清单

- [ ] 插件是否在明确的 profile 组合包中安装，依赖和锁文件是否可追溯？
- [ ] 是否把 API Key、Cookie、环境变量和用户路径写进日志、prompt 或会话事件？
- [ ] 是否给每个 `ctx.effect()`、监听器、子进程和文件句柄提供 teardown？
- [ ] 是否把网络能力、文件能力和进程能力分开说明？
- [ ] 是否把 `danger-full-access` 当成高风险显式选择，而不是默认回退？
- [ ] 是否区分 `partial` enforcement、runner failure 和正常 denial？
- [ ] 是否在临时 profile 中测试，而不是复用用户现有 DSH_HOME？
- [ ] 是否在发布前运行 `public-audit`，并删除私有日志和真实配置？

## dsh-learn 当前证据边界

本基线已核对官方沙箱文档，并通过 rc.6 无 Key CLI/profile/config 冒烟。尚未在本机或跨平台启动实际沙箱 runner，也没有运行写入、网络、进程可见性、第三方插件或真实模型实验。因此以下结论必须保持 `NOT_RUN`：当前机器的后端是 `full` 还是 `partial`、网络是否隔离、进程是否隔离、某个具体工具在某个 profile 中是否被正确约束，以及任何第三方插件是否安全。

## 参考

- [官方进程沙箱文档（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/sandbox.zh.md)
- [官方架构文档（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.zh.md)
- [官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- [无 Key CLI 冒烟实验](../labs/rc6-cli-smoke/README.md)
