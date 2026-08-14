# DeepSeek Harness 官方 Discussions：中文用户可直接复制的最小复现模板

> 适用基线：DeepSeek Harness `47f9438` 附近的 Developer Preview。DSH 仍在快速迭代，命令、配置和插件接口可能发生不兼容变化。每次发帖前，请先把版本、环境和实际命令补完整。

这不是“看到报错就贴日志”的模板，而是一套把中文用户的问题翻译成维护者可以判断的技术信息的最小工作流。它适合三类场景：安装或启动失败、插件/profile 行为异常、旧教程与当前版本不一致。

## 先做三件事

### 1. 固定版本与环境

不要只写“最新版”。至少记录：

```text
OS：macOS / Linux / Windows + 版本
Node.js：
包管理器：npm / pnpm / 其他 + 版本
DSH 包：@deepseek-ai/dsh@<exact-version>
Profile：<profile-name；如果没有使用，写 N/A>
```

可以先运行下面这些不需要模型 Key 的命令，把结果作为本地基线：

```bash
npx --yes @deepseek-ai/dsh@<exact-version> --version
npx --yes @deepseek-ai/dsh@<exact-version> --help
env DSH_HOME=<isolated-temp-dir> npx --yes @deepseek-ai/dsh@<exact-version> plugin --profile <profile-name> --help
env DSH_HOME=<isolated-temp-dir> npx --yes @deepseek-ai/dsh@<exact-version> --profile <profile-name> --dump-config
```

`DSH_HOME` 应指向临时目录。不要为了复现问题把现有账号配置、模型 Key、私有路径或完整用户日志上传到 Discussion。

### 2. 把问题缩小成一个动作

优先保留第一次产生异常的命令，而不是贴一整段 Agent 对话。一个好的最小复现应当能回答：

- 从哪个干净目录开始？
- 安装了哪个精确版本？
- 只运行哪一条命令会出现问题？
- 实际输出是什么？
- 你原本期待什么？
- 换一个 profile、临时目录或版本后是否仍然发生？

### 3. 先脱敏，再复制

删除或替换以下内容：API Key、Authorization header、Cookie、私有仓库地址、个人路径、内部域名、真实手机号和完整私有日志。保留字段名、错误类型、退出码和必要的调用顺序。

## 中文 Discussion 模板

把尖括号内容替换掉；不适用的字段写 `N/A`，不要删掉版本和复现步骤。

```markdown
# [Bug / Help] <一句话描述> — DSH <exact-version>

## 摘要

我在 <OS>、Node.js <version>、<package-manager> 环境中使用
`@deepseek-ai/dsh@<exact-version>`，运行下面的最小命令时遇到：

`<一句话错误现象>`

## 环境

- OS：<系统与版本>
- Node.js：<version>
- 包管理器：<name + version>
- DSH：`@deepseek-ai/dsh@<exact-version>`
- Profile：<name / N/A>
- DSH_HOME：临时目录 / 默认目录（不要贴真实路径）

## 最小复现

```bash
<从干净目录开始的安装命令>
<只保留产生问题的命令>
```

实际输出：

```text
<脱敏后的完整错误、退出码和必要上下文>
```

## 预期与实际

- 预期：<你认为应该发生什么>
- 实际：<实际发生了什么>
- 稳定复现：是 / 否 / 仅在 <条件> 下
- 最小版本对照：<另一个版本或配置的结果；没有就写 N/A>

## 已排除事项

- [ ] 已确认使用的是精确版本，而不是不确定的 latest
- [ ] 已在临时 DSH_HOME 中复现
- [ ] 已移除 Key、Cookie、私有路径和内部域名
- [ ] 已确认不是模型服务或网络本身的偶发错误

## 希望得到的帮助

我想确认：这是当前版本的已知限制、文档缺口、配置问题，还是值得进一步报告的产品问题？如果需要，我可以补充一个更小的复现仓库。
```

## 英文转述模板

如果问题可能需要维护者直接处理，附上简短英文版本。英文只做事实转述，不要把“可能是 bug”写成确定结论。

```markdown
# [Bug / Help] <short symptom> — DSH <exact-version>

## Summary

On <OS> with Node.js <version>, I ran <one command> using
`@deepseek-ai/dsh@<exact-version>` and got `<short symptom>`.

## Minimal reproduction

```bash
<clean setup command>
<single failing command>
```

Actual output:

```text
<redacted output, exit code, and only necessary context>
```

## Expected vs. actual

- Expected: <expected behavior>
- Actual: <actual behavior>
- Reproducible: yes / no / only when <condition>
- Comparison: <another version or configuration, or N/A>

## Question

Could you help confirm whether this is a known limitation, a documentation gap, a configuration issue, or a product issue worth investigating?
```

## 回答他人问题时的中文首响

当还没有足够证据判断根因时，先帮助对方补齐信息，不要凭印象给出“改某个配置就好”的结论：

```text
先确认四项：DSH 精确版本、Node.js 版本、完整命令、第一段实际错误。
如果可以，请在临时 DSH_HOME 中重跑，并把 Key、Cookie、私有路径和内部域名脱敏。
另外请说明预期行为，以及换一个 profile 或版本后是否仍能复现。
这些信息齐了，才能区分版本变化、配置问题和真实缺陷。
```

英文简版：

```text
Could you share the exact DSH version, Node.js version, complete command, and the first relevant error? Please retry with an isolated DSH_HOME and redact keys, cookies, private paths, and internal domains. Also include the expected behavior and whether another profile or version changes the result.
```

## 三类常见问题的补充字段

### 安装或启动失败

补充安装命令、包管理器输出、退出码，以及是否在干净目录成功。不要把整个 `node_modules` 或用户目录压缩上传。

### Profile 或插件行为异常

补充 profile 名称、插件安装来源、`--help` 或 `--dump-config` 的脱敏结果，以及问题发生在安装、初始化还是运行阶段。当前版本正在快速演化，旧的 repository plugin 教程不能直接当作现行接口。

### 旧教程失效

补充教程链接、教程声称的版本、当前精确版本和第一条失效命令。把“教程过时”和“DSH 有缺陷”分开描述，先让读者能迁移，再讨论是否需要官方澄清。

## 发帖前检查表

- [ ] 主标题包含症状和精确版本
- [ ] 复现步骤可以从干净目录开始
- [ ] 结果、预期、退出码彼此对应
- [ ] 没有凭据、Cookie、私有路径或私人日志
- [ ] 没有把猜测写成结论
- [ ] 若引用教程，保留原链接和版本信息
- [ ] 若维护者补充了结论，回帖更新“已验证 / 待验证”状态

## 贡献边界

在当前官方贡献政策下，DSH 本体仍处于早期开发阶段，外部 Pull Request 暂不接受；官方明确鼓励通过 Discussions 反馈问题、创建插件、写 how-to 和回答社区问题。因此这套模板默认用于高质量 Discussion 和教程，不自动替用户创建官方 PR。

如果是安全漏洞、私人数据或需要公开敏感细节的问题，停止公开发布，改走合适的私下披露渠道，并升级给人工判断。

## 参考与复测基线

当前维护基线为 `@deepseek-ai/dsh@0.1.0-rc.6`、官方 commit `47f9438`，Discussions 已复核到第 11 页、最后编号 #1068。这个分页只用于确认上游仍在增长，不把后续讨论写成某个具体缺陷已经复现或解决；模板字段和脱敏边界保持不变。

- [官方 CONTRIBUTING.md](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.md)
- [官方 README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- [官方 Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
- [当前 Discussions 分页基线](https://api.github.com/repos/deepseek-ai/deepseek-harness/discussions?per_page=100&page=11)
- [dsh-learn 无 Key CLI 冒烟实验](https://github.com/pingfanfan/dsh-learn/blob/main/labs/rc6-cli-smoke/README.md)

本页只在上述基线仍适用时成立。官方 HEAD、npm 版本、CLI 参数或贡献政策变化后，应先复测，再更新本页和渠道稿。
