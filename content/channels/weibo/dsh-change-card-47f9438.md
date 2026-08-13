DeepSeek Harness 还在 Developer Preview，旧教程已经出现两处硬失效。

`.dsh-plugin` 那套 repository plugin 被移除了，而且没有兼容层。另一边，被删的是尚未发布的 SDK 项目脚手架，runtime SDK 仍在，所以不能顺手写成“DSH 的 SDK 没了”。

版本也得写清。官方当前 commit 里的 CLI 清单是 rc.5，npm latest 已到 rc.6。教程只写“最新版”，过几次提交以后就没法复核。

现在做插件，先沿 profile bundle 和 `dsh plugin --profile <name> add <package-or-git-spec>` 走。rc.6 的帮助、版本、隔离 profile 和配置导出已经实测通过；Web UI、模型调用、第三方插件安装还没测。

事实卡、命令和来源都放在这里，后面会跟着官方版本复测：
https://github.com/pingfanfan/dsh-learn
