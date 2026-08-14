# dsh-plugin-check 的 rc.6 兼容更新，能证明什么，不能证明什么

2026 年 8 月 14 日，生态项目 `omdsh-dev/dsh-plugin-check` 的 main 分支出现了一个值得记录的更新，提交 `8b3ea76` 的标题直接写着“对齐 DSH 0.1.0-rc.6 依赖线，并按 rc.6 类型重建 lib”。

这不是 DeepSeek Harness 官方仓库的 release note，也不是官方宣布的兼容名单，但对正在找插件开发入口的人有参考价值：生态项目已经开始跟着 rc.6 的包结构和类型变化调整自己的依赖声明。

## 这次提交改了哪一层

当前 `package.json` 把三个 peer dependency 写成了新的范围：`@deepseek-ai/cordis` 使用 `^4.0.1`，`@deepseek-ai/dsh-invariants` 和 `@deepseek-ai/dsh-tools` 使用 `>=0.0.1-rc.1 <0.2.0`。

它同时保留了 `dsh.bundle.patch` 声明，README 也给出了 `dsh plugin --profile <name> add <path>` 这一类 Profile Bundle 安装方式，说明作者希望它作为独立 profile bundle 被装进去，而不是让用户把源码复制进 DSH 核心仓库。

## 新手不要把它当成现成安装答案

这里有两个容易被忽略的边界。

第一，提交标题是项目作者对这次改动的描述，package.json 是当前公开的依赖声明，它们能证明仓库正在做 rc.6 兼容对齐，不能替代一次真实安装和启动。

第二，当前 README 里仍保留 rc.1 的兼容说明、旧版本验证命令和旧版运行示例，文档与最新提交之间存在时间层次。它更适合被看作“正在迁移中的生态项目”，不适合直接复制旧命令给第一次使用 DSH 的人。

这次 dsh-learn 没有克隆、安装或运行这个第三方插件，也没有调用模型 API。当前本机 npm registry 不可达，所以没有把它写成“rc.6 已验证可用”。

## 对插件作者的实际启发

如果你准备给 DSH 写第一个插件，可以先观察它的公开边界：包清单声明 peer dependency，bundle patch 负责进入 profile，README 给出 profile 安装命令，构建产物放在可发布的包里。这样比把源码直接塞进 DSH 核心更容易跟随上游迭代。

但不要一次照搬所有复杂检查。新手先从 dsh-learn 的无 Key `hello-plugin` 完成安装、加载和移除，再逐步加入工具注册、类型构建和依赖兼容矩阵。每一步都要绑定 DSH 版本，遇到“包声明看起来兼容”时，仍然要把 `--dump-config`、profile 启动日志和移除结果分开记录。

## 当前结论

`dsh-plugin-check` 的最新提交是一个高价值生态信号：它说明 rc.6 的兼容边界已经开始影响第三方插件的 peer dependency 和构建产物。

它目前还不是一条经过 dsh-learn 动态验证的安装路径，也不能证明所有 DSH 插件都应采用相同版本范围。等 npm registry 恢复后，下一次复测应固定 Node.js、pnpm、DSH、插件 commit 和 profile，先验证安装，再验证加载，最后才讨论工具调用。

## 来源

- [rc.6 兼容对齐提交](https://github.com/omdsh-dev/dsh-plugin-check/commit/8b3ea76ef909dae92cbd677d090ea6f64647fae7)
- [当前 package.json](https://github.com/omdsh-dev/dsh-plugin-check/blob/main/package.json)
- [当前 README](https://github.com/omdsh-dev/dsh-plugin-check/blob/main/README.md)

验证边界：没有安装或运行第三方插件，没有调用模型 API，没有使用或保存 API Key，知乎不自动发布。
