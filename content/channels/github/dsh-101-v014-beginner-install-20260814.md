# dsh-101 更新到 v0.1.4：新手安装前先把 profile 和端口分开

bill9109/dsh-101 的 main 分支在安装引用固定到 `v0.1.4` 后，又在 commit `086de430` 增加了一个新手必须知道的安全门禁：不要把 dsh-101 安装进官方 `web` profile。这个 bundle 会禁用 `ui-layout`，混进 Web 应用 profile 后，sidebar、conversation 和 app-shell 可能一起等不到 layout 服务，当前安装脚本也会直接拒绝 `--profile web`。

这不是 DeepSeek Harness 本体发布了新版本，而是一个生态项目补充自己的安装保护。README 仍使用 `v0.1.4` 作为安装引用，仓库 `package.json` 的 main 版本字段是 `0.1.3`，新手按固定 tag 和 commit 核对即可，不要把两个数字当成同一个版本字段。

dsh-101 是一个把 DSH 自带文档整理成阅读界面的 profile bundle，里面有目录、检索、翻译和右侧对话入口。它属于 DSH 生态项目，仓库同时准备了 `profile/` 目录，用来组合 `dsh-base`、`dsh-web-app` 和 `@bill9109/dsh-101` 这三层内容。

## 新手先分清 DSH profile 和 bundle

你可以把 DSH 想成负责启动运行环境的程序，把 profile 看成一套独立配置，把 bundle 看成会被装进这套配置的功能包。dsh-101 的安装脚本会把 `profile/` 放到 `$DSH_HOME/profiles/dsh-101/`，再把自己的 bundle 加进这个 profile，随后用 `dsh --profile dsh-101` 启动。

默认 DSH Web UI 通常使用 3080 端口，dsh-101 的仓库示例使用 3081，单独的 profile 和端口可以让两个入口同时存在。安装 dsh-101 也不等于模型已经配置好，网页进程能启动只说明 profile 和前端层加载了，翻译和对话还要另行配置 provider、模型和凭据。

如果你在旧教程里看到下面这条命令，不要照抄：

```bash
dsh plugin --profile web add github:bill9109/dsh-101#v0.1.4
```

当前路径是独立的 `dsh-101` profile，默认 3081 端口，和 3080 的 Web UI 分开运行。

## 按上游固定版本安装

当前仓库 README 给出的远程安装命令如下

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/bill9109/dsh-101/main/scripts/install.sh) github:bill9109/dsh-101#v0.1.4
```

这条命令会下载并执行上游安装脚本。完全新手至少应该先打开 [install.sh](https://github.com/bill9109/dsh-101/blob/086de430bd273de6305a4b5ca224b8a4bcf1e3f3/scripts/install.sh)，看清它会写入哪个目录、调用哪些命令，再决定是否执行。当前脚本遇到 `--profile web` 会退出，不要把这个退出误判成 npm 或网络故障。

上游脚本默认调用 PATH 中的 `dsh` 命令，如果你只跟着 dsh-learn 的 npx 路径学习，电脑上可能还没有全局 `dsh`。这时更适合使用本地 `profile` 文件加固定版本 npx 的方式，命令如下

```bash
export DSH_HOME="$(mktemp -d -t dsh101)"
mkdir -p "$DSH_HOME/profiles/dsh-101"
cp profile/package.json profile/pnpm-workspace.yaml profile/cordis.patch.yml "$DSH_HOME/profiles/dsh-101/"
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile dsh-101 add github:bill9109/dsh-101#v0.1.4
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile dsh-101 --dump-config
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile dsh-101 --port 3081
```

上面的命令需要在已经下载的 dsh-101 仓库根目录执行，profile 文件会写入临时 `DSH_HOME`，不会混入平时的 `~/.dsh`。完成练习以后停止 DSH，再删除这个临时目录。

安装完成后，先检查临时 `DSH_HOME` 下的 `profiles/dsh-101/package.json`，确认 bundles 里有：

```text
@deepseek-ai/dsh-base
@deepseek-ai/dsh-web-app
@bill9109/dsh-101
```

确认配置以后再启动

```bash
npx --yes @deepseek-ai/dsh@0.1.0-rc.6 --profile dsh-101 --port 3081
```

浏览器打开 `http://127.0.0.1:3081`，默认 DSH Web UI 仍然可以使用 `http://127.0.0.1:3080`。如果 3081 已被占用，可以换一个空闲端口，启动参数优先于 profile 里的回退配置。

## 这次静态核对留下的边界

当前核对到的事实是，dsh-101 的公开安装文档把安装引用固定到 `v0.1.4`，最新 commit `086de430` 明确禁止 `web` profile，并保留独立 profile、三层 bundle 和 3081 端口的关系。当前 dsh-learn 没有把这个文档变化写成第三方插件已经兼容，因为本机 npm registry 不可达，动态下载、`plugin add`、profile 启动和模型请求都没有重新执行。

新手第一次练习，仍然建议先完成 dsh-learn 的无 Key `hello-plugin` 安装、加载和移除实验，再把 dsh-101 放进临时 `DSH_HOME` 里复测。安装命令返回成功只是第一条回执，还要分别保存 profile 配置、启动日志、网页地址和移除结果。

如果远程安装失败，先看 Node.js、pnpm、npm registry 和网络代理，不要立刻修改 dsh-101 的源码。等网络恢复以后，使用同一个固定版本命令重新运行，并把实际终端结果标记为自己的环境回执。

## 来源与验证边界

- [dsh-101 web profile 安全门禁 commit](https://github.com/bill9109/dsh-101/commit/086de430bd273de6305a4b5ca224b8a4bcf1e3f3)
- [dsh-101 当前 README](https://github.com/bill9109/dsh-101/blob/086de430bd273de6305a4b5ca224b8a4bcf1e3f3/README.md)
- [dsh-101 当前 install.sh](https://github.com/bill9109/dsh-101/blob/086de430bd273de6305a4b5ca224b8a4bcf1e3f3/scripts/install.sh)
- [DSH 官方插件与 profile 说明](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)

静态证据基线：DSH `47f943859bef60e4160492346772ded9b24f765a`、npm `0.1.0-rc.6`、dsh-101 main `086de430bd273de6305a4b5ca224b8a4bcf1e3f3`，README 安装引用 `v0.1.4`。本稿没有动态安装或启动 dsh-101，没有调用模型 API，没有读取或保存凭据。
