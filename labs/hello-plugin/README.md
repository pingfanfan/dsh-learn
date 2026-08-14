# 从零制作并安装第一个 DSH 插件

这个实验把官方的 profile bundle 路径缩成一个可以重复运行的闭环：创建一个带 `dsh.bundle` 声明的本地包，把它安装进隔离 profile，检查组合配置，启动 profile 观察插件加载，再移除插件确认配置恢复。

固定基线：DeepSeek Harness 官方 commit `47f943859bef60e4160492346772ded9b24f765a`，`@deepseek-ai/dsh@0.1.0-rc.6`。

## 直接运行

在 `dsh-learn` 根目录执行：

```bash
node labs/hello-plugin/verify.mjs
```

探针会：

1. 创建临时 `DSH_HOME`，不读取现有 profile 或凭据；
2. 用 `dsh plugin --profile demo add ./labs/hello-plugin` 安装本地 bundle；
3. 读取 profile manifest，确认 `dsh-hello-plugin` 进入 `dsh.profile.bundles`；
4. 运行 `--dump-config`，确认组合层和插件行出现；
5. 启动隔离 profile，确认终端打印 `[hello-plugin] loaded`；
6. 执行 `dsh plugin --profile demo remove dsh-hello-plugin`，确认组合层被移除。

实验使用本地包和无 Key CLI，不调用模型，也不启动 Web UI。启动 Web UI 只需要 Node.js，但 `dsh plugin` 会调用 `pnpm`，所以运行实验前先执行 `node scripts/plugin-doctor.mjs`；若检查失败，按提示运行 `npm install --global pnpm`，再重新检查。实验还需要可访问 npm registry；如果依赖下载失败，探针会输出 `BLOCKED_NETWORK` 和下一步检查命令，不把环境问题写成插件不兼容。

## 包的三个关键文件

`package.json` 把这个包声明为 DSH bundle：

```json
{
  "name": "dsh-hello-plugin",
  "type": "module",
  "main": "index.js",
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

`index.js` 是普通 Cordis 插件。`ctx.effect()` 里的返回函数是卸载时的清理动作：

```js
export const name = "hello-plugin";

export function apply(ctx) {
  ctx.effect(() => {
    console.log("[hello-plugin] loaded");
    return () => console.log("[hello-plugin] unloaded");
  });
}
```

`cordis.patch.yml` 是组合包提供的配置层，它按已安装包名引用插件：

```yaml
- insert:
    - id: hello-plugin
      name: dsh-hello-plugin
```

这里有两个层次：插件模块负责注册行为，bundle patch 负责把模块接入 profile。只写 `dsh-plugin` GitHub topic，不会产生安装或加载效果；旧 `.dsh-plugin` 也不是当前路径。

## 手动检查

探针已经把命令串起来，但想逐步观察时，可以把 `DSH_HOME` 指向一个新临时目录，再执行：

```bash
TMP_DSH_HOME="$(mktemp -d /private/tmp/dsh-learn-plugin.XXXXXX)"
trap 'rm -rf -- "$TMP_DSH_HOME"' EXIT

env DSH_HOME="$TMP_DSH_HOME" \
  npx --yes @deepseek-ai/dsh@0.1.0-rc.6 \
  plugin --profile demo add ./labs/hello-plugin

env DSH_HOME="$TMP_DSH_HOME" \
  npx --yes @deepseek-ai/dsh@0.1.0-rc.6 \
  --profile demo --dump-config

env DSH_HOME="$TMP_DSH_HOME" \
  npx --yes @deepseek-ai/dsh@0.1.0-rc.6 \
  --profile demo

env DSH_HOME="$TMP_DSH_HOME" \
  npx --yes @deepseek-ai/dsh@0.1.0-rc.6 \
  plugin --profile demo remove dsh-hello-plugin
```

`--dump-config` 是不启动应用的结构检查；真正启动 profile 后，应该看到 `[hello-plugin] loaded`。这个 demo 没有长时间运行的服务，因此进程可以自然结束，也可能因不同版本的启动器保持运行；手动运行时看到加载日志即可按 Ctrl-C 结束。

## 从本地插件走向可分发插件

本实验使用预构建 JavaScript，是为了把首次学习的变量压到最少。发布 TypeScript 插件时，需要把编译产物放进 npm 包；从 GitHub 直接安装时，pnpm 取到的是源码，作者通常需要一个自包含的 `prepare` 构建脚本，用户还可能需要在 profile 的 `pnpm-workspace.yaml` 中显式允许该包的构建脚本。

这项允许意味着安装阶段会在本机执行第三方代码，不等于 DSH 沙箱。实际使用未知 Git/npm 包前，应阅读源代码、锁定版本或 commit，并把安装、加载、模型请求和权限范围分别记录。

## 没有验证的部分

- 没有 API Key，不代表模型 provider 已配置；
- 没有启动 Web UI，不代表浏览器界面已通过；
- 没有安装未知第三方包，不代表任意社区插件兼容；
- 没有把插件加载成功写成生产环境安全结论；
- 该基线属于 Developer Preview，升级 DSH 后必须重跑探针。

## 官方依据

- [运行 DSH](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#run)
- [第一个插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.zh.md)
- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.zh.md)
- [Cordis 入门](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-primer.zh.md)
