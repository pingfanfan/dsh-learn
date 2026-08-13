第一次碰 DSH，先别忙着填模型 Key。

新手卡住时，常常还分不清问题在 Node.js、npx 下载、Web UI，还是插件加载，几层东西混在一起，最后就只剩一句“模型不行”。

在 dsh-learn 根目录先跑：

node scripts/beginner-doctor.mjs

它只检查 Node.js、npm、npx、练习文件和路径。通过后再运行固定版本的 DSH：

npx --yes @deepseek-ai/dsh@0.1.0-rc.6 web

页面能打开，再运行：

node labs/hello-plugin/verify.mjs

这条路径不需要 API Key，也不会请求模型。先把环境、启动和插件加载分开验证，排错会简单很多。
