# 内容资产约定

- `canonical/` 保存事实版本、验证边界、标题选择和可选口述区齐全的规范母稿。
- `channels/` 保存由同一 EvidencePack 派生的干净渠道稿。
- 渠道稿不能私自新增母稿中没有的数字、经历或结论。
- 长文修订后必须重新执行项目要求的最终润色与校验，再运行 renderer。

完全新手入口的截图、步骤、验收信号和当前复测边界见 [`docs/BEGINNER_ENTRY_MAP.md`](../docs/BEGINNER_ENTRY_MAP.md)；单页截图路径见 [`canonical/dsh-beginner-quickstart-rc6.md`](canonical/dsh-beginner-quickstart-rc6.md)。

工具插件的本地 schema 体检和 #297 事实边界见 [`canonical/dsh-tool-schema-doctor-297.md`](canonical/dsh-tool-schema-doctor-297.md)；对应的检查脚本不联网、不调用模型。

Windows 中文路径的 UTF-16 截断排错见 [`canonical/dsh-win32-chinese-path-563.md`](canonical/dsh-win32-chinese-path-563.md)；对应的 doctor 只验证本地字符串读取逻辑，不代表 Windows 原生对话框或 DSH runtime 已通过。

Code Mode 外层 `run_code` 与内层 `bash` 的 `description` 分层排错见 [`canonical/dsh-code-mode-args-558.md`](canonical/dsh-code-mode-args-558.md)；对应的 doctor 只读取本地教学 JSON，不联网、不启动 DSH、不调用模型。
