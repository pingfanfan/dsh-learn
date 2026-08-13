# DeepSeek Harness 插件迁移诊所：从旧 `.dsh-plugin` 到 profile 组合包

> 适用基线：DeepSeek Harness `47f9438` 附近的 Developer Preview。本文针对“旧教程还能不能照着做”的迁移判断，不承诺某个第三方插件已经迁移成功。

## 先说结论

官方已经移除专用 repository plugin 路径。旧的 `.dsh-plugin` manifest、repository 源列表、`dsh-plugin-prepare`、专用缓存和相关包装层，不再是当前外部插件分发机制；官方也没有保留兼容解析器或自动迁移流程。

当前应把外部扩展迁移到一种路径：可安装的 profile 组合包。官方说明的入口是：

```bash
dsh plugin --profile <name> add <package-or-git-spec>
```

组合包由包管理器负责获取源、依赖、版本、构建生命周期和锁文件，并通过 `dsh.bundle.patch` 提供自己的 patch 层。patch 层再选择 Cordis 插件并提供完整配置。这里的“组合包”是迁移方向；具体包清单、字段和版本仍要按当前 DSH 文档和目标插件逐项核对。

## 旧路径与新路径

| 旧项目里看到的东西 | 当前判断 | 迁移动作 |
| --- | --- | --- |
| `.dsh-plugin` | 已移除的专用格式 | 不再继续扩展；把能力拆到 profile 组合包和普通 Cordis 插件 |
| repository 源列表 patch | 不再作为独立安装路径 | 把依赖写入组合包，并让包管理器维护来源和锁文件 |
| `dsh-plugin-prepare` | 专用准备流程已移除 | 用显式 `dsh plugin ... add` 和包管理器生命周期替代 |
| repository 缓存 | DSH 不再读取、迁移或自动删除 | 迁移验证完成后由用户自行清理，不把清理当作安装步骤 |
| 包里的 skill / MCP / Cordis 代码 | 仍可由组合包组合 | 复用各自归属方的普通包和配置契约 |

## 插件维护者迁移步骤

### 1. 先盘点旧项目

记录以下内容，但不要把旧缓存或用户凭据上传到公开仓库：

- 是否存在 `.dsh-plugin` manifest；
- 是否依赖 repository 源列表、包装层或 prepare 脚本；
- 入口实际提供的是 skill、MCP 服务器、普通 Cordis 插件，还是多个组合；
- 用户能否在一个干净 profile 中描述出同样的配置；
- 依赖是否有明确版本和可复现的构建命令。

### 2. 选择组合包边界

一个组合包应能独立安装、锁定依赖并说明自身提供的能力。不要把“旧仓库目录原样搬过去”当成迁移完成；先把能力拆成普通依赖和需要挂载的配置。

官方移除说明给出的方向是：

- 提供 skill 的组合包挂载 `@deepseek-ai/dsh-skill-filesystem`；
- 提供 MCP 服务器的组合包挂载 `@deepseek-ai/dsh-mcp-client`；
- 原生行为挂载普通的已编译 Cordis 插件；
- 组合包通过 `dsh.bundle.patch` 提供 patch 层和完整插件配置。

这些是官方迁移方向，不等于每个旧插件都能零修改转换。每个依赖的实际包名、版本和配置字段都必须回到它自己的文档与测试确认。

### 3. 用显式安装流程测试

从新的临时 profile 开始，不复用旧缓存：

```bash
dsh plugin --profile migration-demo --help
dsh plugin --profile migration-demo add <package-or-git-spec>
```

然后记录：安装命令、精确版本、锁文件变化、构建结果、profile 初始化结果和最小功能检查。没有可安装的公开包时，只能完成迁移设计，不能把它标为“已迁移”。

### 4. 验证插件配置和生命周期

至少检查：

- profile 能在干净目录初始化；
- 组合包的 patch 可以被发现和调和；
- skill、MCP 和普通 Cordis 插件分别按照自己的注册、校验和 teardown 契约运行；
- 升级和卸载不会依赖 repository 专用缓存；
- 失败时能通过包管理器和锁文件定位版本，而不是只看生成包装层。

### 5. 把迁移结果写成迁移报告

```markdown
# <plugin> migration report

- Old path: `.dsh-plugin` / repository source / other
- Target path: profile bundle / ordinary Cordis package / not decided
- DSH baseline: <commit or exact package version>
- Reproduction environment: <OS, Node.js, package manager>
- Install command: `<redacted command>`
- Result: PASS / FAIL / DESIGN_ONLY
- Remaining gaps: <configuration, lifecycle, docs, or upstream question>
- Credentials and private paths: removed
```

## 用户侧排错

如果旧教程让你创建 `.dsh-plugin`、编辑 repository 源列表或运行 `dsh-plugin-prepare`，先停下来确认教程基线。当前版本不会把旧格式自动转换成 profile 组合包，也不会替你迁移旧缓存。

如果迁移后仍失败，按 [DSH Discussions 最小复现模板](discussion-minimal-repro-kit.md) 提供精确版本、环境、最小命令、实际结果和预期结果。不要只贴“插件不能用”，也不要把凭据或完整私有日志贴到公开讨论。

## dsh-learn 当前验证边界

本页已验证官方迁移说明和 rc.6 无 Key CLI/profile 入口；没有安装第三方插件，没有执行未知包的生命周期脚本，也没有声称任何具体插件已经成功迁移。后续只有在目标插件公开、来源明确、测试可复现且风险可控时，才建立独立迁移卡。

## 参考

- [官方 repository plugin 移除说明（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md)
- [官方贡献政策（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.md)
- [官方 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- [无 Key CLI 冒烟实验](../labs/rc6-cli-smoke/README.md)
