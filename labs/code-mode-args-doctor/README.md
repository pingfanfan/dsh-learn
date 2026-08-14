# Code Mode 参数分层体检

官方 Discussion #558 报告了一个很容易让新手混淆的情况：外层 `run_code` 和内层 `tools.bash` 都有一个叫 `description` 的必填字段，错误提示如果没有说清楚层级，看到 `INVALID_ARGS` 时很难判断缺的是哪一个。

这个小实验把一次调用压缩成一个本地 JSON 夹具，分别检查：

- 外层 `run_code.arguments.code` 和 `run_code.arguments.description`；
- 夹具中列出的内层 `bash.arguments.command` 和 `bash.arguments.description`。

运行默认通过夹具：

```bash
node scripts/code-mode-args-doctor.mjs
```

再运行两个故意失败的夹具：

```bash
node scripts/code-mode-args-doctor.mjs labs/code-mode-args-doctor/fixtures/missing-outer-description.json
node scripts/code-mode-args-doctor.mjs labs/code-mode-args-doctor/fixtures/missing-inner-description.json
```

每次失败都会把字段路径写出来，帮助新手先判断是外层还是内层，不用先配置模型。这个体检器只读本地 JSON，不联网、不启动 DSH、不调用模型，也不把夹具中的代码当作 JavaScript 执行；它是字段层级检查，不是 DSH runtime 的动态复现。

验证脚本：

```bash
pnpm validate:code-mode-args-doctor
```

夹具格式是教学用的最小记录格式，不是官方会话日志格式。真实 DSH 运行仍要固定版本、保留外层调用和工具结果，并在报告中区分 `run_code` 与内层工具。
