生态项目 dsh-plugin-check 最近跟着 DSH rc.6 改了一轮依赖。最新提交 8b3ea76 的标题写得很直白：对齐 rc.6 依赖线，并按 rc.6 类型重建 lib。

现在它的 package.json 把 Cordis、dsh-invariants、dsh-tools 的 peer dependency 重新写了一遍，包里也保留了 dsh.bundle.patch 和 profile 安装示例。对插件作者来说，方向很清楚：先作为独立 bundle 进入 profile，不要把源码塞回 DSH 核心。

但这还不能叫“rc.6 已经跑通”。README 里仍有 rc.1 的旧说明，我这边也没有克隆、安装或启动它，npm registry 还没恢复。现在能确认的，只是生态项目在跟着上游版本迁移。

我更愿意把这条更新当成一个提醒：写 DSH 插件，包声明、bundle patch、profile 安装和真实启动日志要分开验证。看起来兼容，和真的能用，中间还隔着一次安装。