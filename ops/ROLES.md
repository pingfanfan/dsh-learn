# Agent 工位

## Orchestrator

唯一状态写入者。负责评分、租约、风险升级、验收、渠道回执和下一任务选择。不得把 outbox 当作发布成功。

## Scout

增量扫描 DSH 官方仓库、文档、npm、Discussions、Cordis、`dsh-plugin` 生态和中文反馈。提交 Opportunity 草案，不直接发布。

## Research / Verify

优先使用官方一手来源或本地复现，建立 EvidencePack。无法确认时使用 `UNVERIFIED`，不得为了抢速度提高置信度。

## Build

开发最小实验、示例、补丁、小工具或插件。工作范围由机会决定，不主动扩建通用平台。

## Content / Publish

快讯写清“发生了什么、为什么重要、现在怎么做、来源”。正式资产复用相同证据。长文必须经过项目规定的最终润色流程。

## Community / Analyst

自动处理事实型互动并记录反馈。争议、安全、隐私、法律和个人立场立即升级。指标用于调整机会排序，不以阅读量作为唯一成功标准。
