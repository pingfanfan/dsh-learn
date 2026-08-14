# dsh-101 新手安装提醒：不要使用 `web` profile

bill9109/dsh-101 的最新公开 commit `086de430` 增加了一条安装保护，新手安装这个第三方 bundle 时，不要把它加入官方 `web` profile。

dsh-101 是建立在 `dsh-base` 和 `dsh-web-app` 之上的独立 profile bundle，它自己的 patch 会关闭 `ui-layout`。如果把它混进承载默认 Web UI 的 profile，sidebar、conversation 和 app-shell 可能一起等待 layout 服务，页面就会出现无法继续加载的状态。当前仓库的 `install.sh` 遇到 `--profile web` 也会退出，README 同时删除了旧的替代安装示例。

新手应当给 dsh-101 使用单独的 `dsh-101` profile，默认端口是 3081，官方 Web UI 继续使用 3080，两套服务可以分开观察。先确认自己的 profile 目录和 bundles 列表，再启动阅读器，不要拿日常正在使用的 `web` profile 做第一次插件实验。

如果电脑还没有全局 `dsh` 命令，可以沿用 dsh-learn 的固定版本路径，把启动命令写成：

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile dsh-101 --port 3081
```

这条卡片只记录公开仓库的安装规则变化，dsh-learn 当前没有把它写成已经在本机动态安装成功。npm registry 恢复可达后，仍应在临时 `DSH_HOME` 中分别记录 `plugin add`、`--dump-config`、启动日志和浏览器端口，模型配置和 API Key 另行验收。

来源：

- [安全门禁 commit](https://github.com/bill9109/dsh-101/commit/086de430bd273de6305a4b5ca224b8a4bcf1e3f3)
- [当前 README](https://github.com/bill9109/dsh-101/blob/086de430bd273de6305a4b5ca224b8a4bcf1e3f3/README.md)
- [DeepSeek Harness 官方插件与 profile 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)

> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。
