DSH 里 `.dsh-plugin` 和 `dsh-plugin` 不是一回事：前者是官方已移除的旧 repository plugin 路线，后者是当前 README 建议用于 GitHub 发现的 topic 标签。

加 topic ≠ 安装插件；安装包 ≠ 已证明运行时兼容。

旧教程如果还要求 `.dsh-plugin`、repository source list 或 dsh-plugin-prepare，先查它绑定的 commit。固定基线的安装入口是：

`dsh plugin --profile <name> add <package-or-git-spec>`

不要把未运行的第三方插件写成“已兼容”。

参考：<https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md>
