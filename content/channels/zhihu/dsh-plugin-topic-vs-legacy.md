# DSH 里的 “dsh-plugin” 到底是什么：别把 GitHub topic 和旧 `.dsh-plugin` 混为一谈

如果你同时看了 DSH 官方 README 和旧教程，很容易被两个长得几乎一样的词绊住：`.dsh-plugin` 和 `dsh-plugin`。

它们不是同一个东西：`.dsh-plugin` 是已经退出当前路线的旧 repository plugin 格式；`dsh-plugin` 是官方当前 README 建议用于 GitHub 发现的 topic 标签。前者涉及旧的插件分发结构，后者只是帮助别人找到插件仓库。

看到 `.dsh-plugin`，先查教程绑定的 DSH commit、npm 版本和发布日期。如果它还要求 repository source list、`dsh-plugin-prepare` 或专用缓存，就不要直接照抄。固定的 `47f9438` 基线给出的迁移方向是 profile 组合包，入口形态是：

```bash
dsh plugin --profile <name> add <package-or-git-spec>
```

看到 `dsh-plugin` topic，则把它理解成 GitHub 的文本标签。它不能证明插件已安装、profile 会读取它，或运行时已经兼容。一个仓库可以先加 topic 再完善安装说明；一个本地 profile 也可以已经安装包，但仓库尚未添加 topic。

给插件作者的最低要求是：绑定版本、写清干净 profile 的安装命令、说明 Cordis/skill/MCP 的能力边界，并把未运行的实验标成“未运行”。给插件用户的最低排错顺序是：先分清 topic 和旧文件，再确认版本，最后区分发现、安装、配置和运行时失败。

本文没有安装未知第三方包，也没有声称任何具体插件已经迁移或兼容。

参考：

- [DeepSeek Harness 当前 README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)
- [移除 repository plugin 的官方说明](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md)
