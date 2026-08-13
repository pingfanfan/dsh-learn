# DSH 里的 “dsh-plugin” 到底是什么：别把 GitHub topic 和旧 `.dsh-plugin` 混为一谈

> 适用范围：DeepSeek Harness Developer Preview 的插件资料整理。DSH 迭代很快，涉及安装命令时仍应绑定具体 commit 或 npm 版本。

如果你最近同时看了 DSH 官方 README 和旧教程，很容易被两个长得几乎一样的词绊住：`.dsh-plugin` 和 `dsh-plugin`。

它们不是同一个东西，也不在同一层：前者是已经退出当前路线的旧 repository plugin 格式；后者是官方当前 README 用来帮助用户发现插件仓库的 GitHub topic。把两者混在一起，会得到两个相反但都不准确的结论：要么继续照着旧教程写 `.dsh-plugin`，要么以为给仓库加了 topic 就已经完成插件安装。

## 一句话判断

看到带点号的 `.dsh-plugin`，先按历史格式处理；看到反引号里的 `dsh-plugin` topic，先按 GitHub 的发现标签处理。真正的安装、依赖和 profile 组合，仍要回到 DSH 的 CLI 与目标插件自己的文档。

## 两个词分别负责什么

| 名称 | 所在层 | 当前含义 | 不能据此推出什么 |
| --- | --- | --- | --- |
| `.dsh-plugin` | 旧 repository plugin 路径 | 官方固定 commit 的移除说明中，已经不再是当前外部插件分发契约 | 不能继续创建它，也不能指望 DSH 自动解析或迁移它 |
| `dsh-plugin` | GitHub repository topic | 当前官方 README 建议插件仓库加上的发现标签，方便生态搜索和归类 | 不能证明插件已安装、能被 profile 读取，或运行时兼容 |

这不是官方文档互相矛盾，而是“旧格式名称”和“新生态索引标签”恰好用了相近的词。一个影响过去的插件分发结构，一个只帮助别人找到你的仓库。

## 遇到不同教程时怎么判断

### 教程让你创建 `.dsh-plugin`

不要直接照抄。先查它绑定的 DSH commit、npm 版本和发布日期。如果它还要求维护 repository source list、运行 `dsh-plugin-prepare`，或者依赖专用 repository 缓存，那大概率是在讲已经移除的旧路线。

在固定的 `47f9438` 基线里，官方给出的迁移方向是 profile 组合包，入口形态是：

```bash
dsh plugin --profile <name> add <package-or-git-spec>
```

这条命令只说明安装入口，不等于任意第三方插件已经迁移成功。目标包的来源、版本、构建脚本、`dsh.bundle.patch` 和 Cordis 配置仍要单独核对。

### 教程让你给仓库加 `dsh-plugin` topic

这一步只是在 GitHub 仓库的 Topics 里增加一个文本标签。它解决的是“别人能不能找到这个插件仓库”，不是“DSH 会不会在本地加载这个插件”。加完 topic 之后，仍然需要 README、版本、安装命令和实际兼容性证据。

因此，下面两件事可以同时成立：

- 一个仓库有 `dsh-plugin` topic，但没有可安装的 DSH 插件；
- 一个本地 profile 已安装某个包，但这个仓库还没有添加 `dsh-plugin` topic。

它们分别是发现问题和运行问题，不能互相替代。

## 给插件作者的最小检查清单

1. 在 README 顶部写清楚 DSH commit 或 npm 版本，不要只写“最新版”。
2. 如果插件确实面向 DSH，在 GitHub 仓库添加 `dsh-plugin` topic；不要把 topic 当作 manifest。
3. 写出干净 profile 的安装命令，并锁定包或 Git 来源的版本。
4. 说明插件提供的是普通 Cordis 插件、skill、MCP 客户端，还是它们的组合。
5. 记录最小验证结果；没有实测第三方包时，就写“设计完成”或“未运行”，不要写成“兼容”。
6. 不要要求用户为了迁移而自动删除旧缓存；遗留数据的清理应由用户决定。

## 给插件用户的最小排错顺序

先问四个问题：

1. 我看到的是 GitHub topic，还是旧 `.dsh-plugin` 文件？
2. 教程绑定的是哪个 DSH commit 和 npm 版本？
3. 失败发生在发现仓库、安装依赖、profile 配置，还是运行时加载？
4. 有没有把 topic、包安装成功和运行时兼容误当成同一件事？

如果问题仍然存在，再按 DSH Discussions 的最小复现格式提供版本、环境、命令、实际结果和预期结果。不要粘贴凭据，也不要只写“插件不能用”。

## dsh-learn 的验证边界

本文只核对了官方当前 README 中的 GitHub topic 语义，以及官方固定 commit 对旧 repository plugin 路线的移除说明；没有安装未知第三方包，也没有声称任何具体插件已经迁移或运行成功。安装 Git/npm 来源之前，应先阅读代码、锁定版本，并确认生命周期脚本的风险。

## 参考资料

- [DeepSeek Harness 当前 README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)
- [DeepSeek Harness 当前贡献政策](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
- [移除 repository plugin 的官方说明（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md)
- [dsh-learn 插件迁移诊所](plugin-migration-clinic-47f9438.md)
- [dsh-learn Discussions 最小复现工具包](discussion-minimal-repro-kit.md)
