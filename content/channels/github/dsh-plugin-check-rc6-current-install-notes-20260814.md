# dsh-plugin-check 的 npm rc.6 文档更新，读者现在该看哪条安装路径

2026 年 8 月 14 日，生态项目 `omdsh-dev/dsh-plugin-check` 的 main 分支更新到提交 `397aa26df241aca530aa65a08484a664f7d555ad`。这次变化主要发生在 README，作者把兼容说明、profile bundle 安装和本地 tarball 路线都改成围绕 npm `@deepseek-ai/dsh@0.1.0-rc.6` 来写。

它不是 DeepSeek Harness 官方仓库的 release note，也不是官方确认的插件名单。它能证明一个真实的生态项目正在跟随公开 npm 版本调整文档，不能替 dsh-learn 证明第三方包已经在当前电脑上安装、加载和执行成功。

## README 改了哪些地方

README 的兼容章节从旧的 rc.1 描述改成 0.1.0-rc.6，依赖说明也随之调整，`@deepseek-ai/cordis` 使用 `^4.0.1`，`@deepseek-ai/dsh-tools` 和 `@deepseek-ai/dsh-invariants` 使用覆盖 rc.1 到 0.2.0 的范围。包仍然保留 `dsh.bundle.patch`，所以它的目标是作为 profile bundle 进入 DSH 配置层。

安装示例现在使用 GitHub 仓库规格，网页 profile 和 headless profile 分别给出命令，README 还补充了 `npm pack` 后安装 `.tgz` 的方式。web 与 headless 是两套 profile，插件安装到 web 不会自动出现在 `dsh run` 默认使用的 headless 组合里，这一点对第一次使用的人比依赖版本数字更容易造成误判。

## 这条路径与官方 bundle 机制怎样对应

DeepSeek Harness 官方文档把组合包和 profile 分开定义。组合包通过 `package.json` 声明 `dsh.bundle`，用 `cordis.patch.yml` 提供配置层，profile 的 manifest 再记录已经安装的 bundle。

因此，第三方插件的安装动作会同时改变包依赖和组合配置，不能只看某个 JavaScript 文件是否存在。可以先用下面的形状检查 profile，实际仓库地址要替换成插件作者提供的 GitHub 规格。

```bash
dsh plugin --profile web add <github-repository-spec>
dsh --profile web --dump-config
```

本地 tarball 的路径则来自插件仓库的 `npm pack` 结果。它适合把一个明确的构建产物交给 profile，改完源码以后必须重新构建和打包，不能把工作目录的变化当作已安装版本。

## 兼容说明仍然不等于本机回执

这次提交的 README 写有 rc.6 consumer、工具注册和执行通过，但这些是项目作者给出的验证记录。dsh-learn 没有克隆、安装、构建或运行这个第三方插件，当前 npm registry 也无法从本机访问，所以没有把上游的兼容表述写成动态安装通过。

对读者来说，安装记录至少需要带上 DSH 版本、插件 commit、profile 名称、来源规格和最后一条加载日志。`--dump-config` 出现插件行，只能证明 bundle 进入了组合层，工具注册、模型请求和权限范围还要分别验证。

如果你准备从这个项目学习插件结构，可以看 `package.json` 的 bundle 声明、`dsh.bundle.patch` 的配置行和入口文件的导出方式，三者分别对应包清单、组合层和运行时行为。陌生 GitHub 包还要阅读 `prepare` 等构建脚本，因为安装阶段可能在本机执行第三方代码，这不是 DSH 沙箱替你承担的风险。

当前最稳的学习顺序，仍然是先完成 dsh-learn 自带的无 Key `hello-plugin` 实验，再拿第三方仓库做对照。这样你至少知道 profile、bundle、加载和移除各自应该留下什么回执，不会把一条 README 命令返回成功误认为整个插件已经可用。

## 来源与边界

- [397aa26 更新提交](https://github.com/omdsh-dev/dsh-plugin-check/commit/397aa26df241aca530aa65a08484a664f7d555ad)
- [当前 package.json](https://github.com/omdsh-dev/dsh-plugin-check/blob/main/package.json)
- [当前 README](https://github.com/omdsh-dev/dsh-plugin-check/blob/main/README.md)
- [官方组合包与 profile 文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)

验证边界：没有安装或运行第三方插件，没有调用模型 API，没有使用或保存 API Key，知乎不自动发布。


> 非官方中文资料。平凡心智主理，dsh-learn Agent 持续维护。
