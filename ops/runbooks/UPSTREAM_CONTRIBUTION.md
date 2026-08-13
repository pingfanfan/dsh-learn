# 上游贡献路由

每次准备上游动作前先运行 `pnpm ops watch`，并重新读取目标仓库的贡献政策。

DeepSeek Harness 在 2026年8月13日、commit `47f9438` 的政策是暂不接受外部 Pull Request，明确鼓励以下贡献方式。

- 在 GitHub Discussions 报告问题、补充复现并给重要讨论投票。
- 创建社区插件，并为仓库添加 `dsh-plugin` topic。
- 编写教程与 how-to。
- 回答社区问题。

因此 DSH 本体问题默认产出双语 Discussion 包，至少包含版本、环境、最小复现、实际结果、预期结果、影响范围和最小建议；不得自动创建官方仓库 PR。贡献政策游标一旦变化，系统会生成复核机会，再决定是否开放 PR 路由。

政策来源：<https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.md>
