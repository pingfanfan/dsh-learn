# dsh-learn 完全新手入口地图

这份地图是给维护者和 Agent 用的验收表。对外的新手可以先从[完全新手快速上手卡](../content/canonical/dsh-beginner-quickstart-rc6.md)完成第一轮，再进入[完全新手教程：从安装到第一个插件](../content/canonical/dsh-zero-to-first-plugin-rc6.md)；这里把“读者到底要看到什么、哪张图负责什么、什么结果才算验证过”拆开记录。

## 默认假设

- 读者不会写代码，不认识 Node.js、终端、`npx`、profile、bundle 或 Cordis。
- 读者先验证 DSH 能安装、能启动、能打开网页，再接触 API Key 和模型。
- 第一个插件必须无 Key、可隔离、可重复、可移除。
- 真实安装前可以先用 `node scripts/plugin-doctor.mjs --network` 检查 npm registry；网络失败只能标记为环境阻塞，不能写成插件代码失败。
- 截图只负责降低找按钮和认界面的成本；截图不能替代命令输出、版本记录和真实复现。

## 一条完整路径

| 顺序 | 新手要完成的动作 | 正文入口 | 配套截图 | 验收信号 |
| --- | --- | --- | --- | --- |
| 0 | 下载并解压 dsh-learn，不要求先学 Git | “下载 dsh-learn 的练习文件” | `10-github-download-zip.jpg` | 能进入仓库根目录 |
| 1 | 安装 Node.js，确认 `node`、`npm`、`npx` | “安装 Node.js” | `09-nodejs-download-page.jpg`、`03-terminal-node-version.svg` | `node scripts/beginner-doctor.mjs` 输出 PASS |
| 2 | 用新手启动入口启动固定版本 DSH Web UI | “启动 DSH 的 Web UI” | `01-official-run-readme.jpg`、`04-terminal-dsh-web.svg` | 浏览器能打开 `http://127.0.0.1:3080`；失败时得到网络、Node 或端口提示 |
| 3 | 首次打开页面时跳过 Key | “第一次打开页面不要急着接模型” | `07-dsh-first-run-api-key-prompt.jpg`、`08-dsh-web-ui-no-key.jpg` | 看到空工作台；不把它写成模型可用 |
| 4 | 检查插件安装前置条件 | “安装插件前先检查 pnpm” | `06-terminal-beginner-doctor.svg`（环境检查） | `node scripts/plugin-doctor.mjs` 输出 PASS |
| 5 | 在临时 `DSH_HOME` 安装、加载、移除 hello-plugin | “用无 Key 实验安装第一个插件” | `05-terminal-plugin.svg` | 看到 install、config、loaded、remove 四类结果 |
| 6 | 复制示例并只改入口日志 | “从示例复制一个自己的插件” | `02-official-plugin-publish.jpg`、`11-plugin-edit-indexjs.jpg` | 能区分 `package.json`、patch 和 `index.js` 的职责 |

## 截图清单与证据边界

| 文件 | 类型 | 它能证明什么 | 它不能证明什么 |
| --- | --- | --- | --- |
| `01-official-run-readme.jpg` | 官方固定版本页面 | 官方启动说明、默认本机地址 | 当前机器实际启动成功 |
| `02-official-plugin-publish.jpg` | 官方固定版本页面 | bundle/profile/插件命令的位置和形状 | 任意第三方包都兼容 |
| `03-terminal-node-version.svg` | 示例终端卡片 | 新手应该在哪里输入版本命令 | 读者本机的版本 |
| `04-terminal-dsh-web.svg` | 示例终端卡片 | 启动命令和预期观察点 | 网络下载一定成功 |
| `05-terminal-plugin.svg` | 示例终端卡片 | 插件实验要观察的结果 | 当前网络环境已完成安装 |
| `06-terminal-beginner-doctor.svg` | 示例终端卡片 | 前置检查输出长什么样 | 所有操作系统都得到相同版本号 |
| `07-dsh-first-run-api-key-prompt.jpg` | rc.6 隔离实例 | 首次 Key 提示和 `Configure later` | 模型 provider 已经配置 |
| `08-dsh-web-ui-no-key.jpg` | rc.6 隔离实例 | 跳过 Key 后 Web UI 能显示 | 模型请求或 Agent 工作流成功 |
| `09-nodejs-download-page.jpg` | Node.js 官方页面 | 官方安装器入口；当前截图为 macOS | Windows/Linux 安装器的具体按钮 |
| `10-github-download-zip.jpg` | dsh-learn 公开仓库 | `Code → Download ZIP` 的位置 | 下载后的本机路径 |
| `11-plugin-edit-indexjs.jpg` | dsh-learn 公开仓库 | 示例插件入口文件的位置 | 在 GitHub 页面直接改文件就能完成本地实验 |

示例终端图会用示例版本号和输出；官方页面截图会随网站变化而过期；Windows/Linux 用户可以沿用同一组命令，但当前视觉截图以 macOS 为主，不能把 macOS 截图冒充 Windows 实测。需要补充其他系统截图时，必须在对应系统真实打开页面后再加入证据包。

## 当前复测状态

- 文档、图片链接、编辑区隔离检查：`pnpm validate:beginner-entry` 已通过。
- 单页截图快速上手卡：`pnpm validate:beginner-quickstart` 已通过；它复用现有 9 张截图，不新增动态成功声明。
- 友好启动入口：`pnpm validate:beginner-start` 已通过；它只包装固定版本的 npx 启动，不读取或发送 API Key。
- 新手环境检查脚本的静态验证：`pnpm validate:beginner-doctor` 已通过。
- 插件前置检查脚本的静态验证：`pnpm validate:plugin-doctor` 已通过。
- 本轮 hello-plugin 动态复测：暂记为 `BLOCKED_NETWORK`。本机在固定 rc.6 版本检查阶段得到 `ENOTFOUND registry.npmjs.org`，探针现在会输出面向新手的阻塞说明，而不是原始 Node.js 堆栈；因此不能把本轮写成安装、加载、移除通过。恢复 npm registry 可达性后，先运行 `node scripts/plugin-doctor.mjs --network`，再重新运行 `node labs/hello-plugin/verify.mjs`。
- 该阻塞不影响“无 Key、隔离目录、安装—加载—移除”的教程设计，但会阻止新增一条当前动态成功回执。

## 安全红线

教程默认不需要 API Key。任何截图、日志、Issue、Discussion 和发布稿都不得出现真实凭据、Cookie、私有路径或完整私有日志。模型配置、插件安装、插件加载和权限范围必须分开验证；“网页打开了”不等于“模型可用”，“插件包安装成功”也不等于“插件安全”。
