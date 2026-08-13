# Cordis 论文阅读笔记及对 dsh-learn 的影响

## 1. 来源

- 论文：*A Programming Paradigm for Spatiotemporal Composability*
- 作者：Yifan Shi、Wei Zhang、Tianyi Cui
- 机构：Peking University、DeepSeek-AI
- PDF：88页，生成日期 2026-08-13
- 来源文件：用户提供的本地 PDF；不在公开仓库记录原始临时路径。

这份笔记服务于产品和课程设计，不替代论文，也不试图复述全部形式化定义与证明。

## 2. 论文解决的核心问题

论文把动态组合拆成两个彼此独立的维度：

### 时间可组合性（Temporal Composability）

组件在运行期间注册工具、事件、定时器或状态，组件被移除时，这些影响应当完整、安全、按顺序撤销。普通插件系统常把创建写在 `activate`，把清理寄希望于另一处 `deactivate`，既难核对，也容易漏掉。

Cordis 把一次作用和它的 inverse 放在一起，运行时跟踪 inverse，卸载时按逆序执行。实现层的核心入口是 `ctx.effect`。论文5.1.1说明，effect 可以分步产生 inverse，卸载或中断时只恢复已经完成的步骤；dispose 至多生效一次。

### 空间可组合性（Spatial Composability）

组件应当声明自己依赖什么，由运行时在依赖出现、消失或更换提供者时重新判断组件是否能够运行。Cordis 把依赖需求称作 reactive coeffects：消费者的依赖满足时激活，依赖不满足时停用，变化不影响它时保持不动。

论文5.1.2和5.1.3给出的关键行为是：一个 provider 开始卸载时，会先停止“提供”能力；依赖它的 consumer 因此先执行 teardown，provider 等待相关 consumer 停止后再回收自己的资源。这样可以避免消费者在提供者已经拆掉一半时继续访问它。

## 3. 对 dsh-learn 最重要的工程结论

### 3.1 setup 与 reset 必须邻近定义

课程创建目录、复制夹具、启动进程或注册监听器时，应当同时登记对应的清理动作。不能先写完整 setup，再靠另一个开发者凭记忆补 reset。

落地约束：

- 每个资源创建函数返回 cleanup；
- cleanup 按 LIFO 执行；
- setup 中途失败时，只回收已经成功创建的资源；
- cleanup 重复执行不会破坏状态；
- 课程测试验证资源数量回到初始值，而不只检查命令退出码。

### 3.2 “可以 reset”有明确系统边界

论文6.1区分了边界内可恢复状态与越过边界的 emission。私有 scratch 文件、课程自己的状态和本地子进程可以纳入恢复；已经发出的网络数据、外部消息、付费 API 调用和 GitHub 发布不能因为本地 cleanup 就当作从未发生。

落地约束：

- 用户课程首先在私有练习目录运行；
- API 调用发生前显示费用和数据边界；
- Git commit/push、发消息和发布操作单列为 commit point；
- 对外动作只能采用延迟提交、明确确认或补偿措施，不能承诺精确回滚；
- `reset` 的文案只描述自己确实恢复的范围。

### 3.3 前置条件应当是声明式依赖

课程需要 DSH、API Key、某个平台能力或上一课时，应在 manifest 中声明。调度器统一判断课程是 ready、blocked 还是 stale，不让每课自己写一套轮询和错误处理。

落地约束：

- manifest 依赖图必须无环；
- 依赖缺失时课程不做半初始化；
- provider 或版本变化后重新检查；
- 插件课程通过 `inject` 声明依赖；
- 不使用未经声明的全局服务。

### 3.4 组件状态必须可观察

论文把一个组件实例称作 fiber，并给出 LOADING、ACTIVE、UNLOADING、INACTIVE、FAILED 等生命周期行为。dsh-learn 不需要把完整状态机教给普通用户，但 Builder Track 应让学习者看到 provider/consumer 的状态顺序。

落地约束：

- B03 输出时间线，而不是只输出最终“测试通过”；
- 断言 consumer 在 provider 完成回收前已经 INACTIVE；
- provider 被新实例替换时，即使提供相等值，也应视作提供者变化；
- 异步加载期间依赖又变化时，旧加载完成后不能误进入 ACTIVE。

### 3.5 配置是事实源，loader 做 reconciliation

论文5.2.1把配置 entry 定义为一个 fiber 的声明，包含稳定 ID、URL、isolate、intercept、config 和 disabled 等信息。配置变化以后，loader 增量调整受影响组件，而不是一律重启全部系统。

落地约束：

- 课程组合、前置条件和启停状态保存在结构化配置；
- 稳定 lesson ID 用于协调，不用数组位置代替身份；
- 改一课不应重建所有无关课程实例；
- 旧课程实例与新 verifier 契约冲突时标记 stale。

### 3.6 HMR 应当具备失败回滚

论文5.2.2描述三阶段 HMR：识别可热替换依赖子图、找到 stale entries、备份模块缓存并进行事务式 reload。新模块导入失败时，恢复缓存并重新实例化旧组件，避免系统停在一半新、一半旧的状态。

落地约束：

- B05 必须包含一次故意语法错误；
- reload 失败以后旧功能仍可用；
- 不把“进程没退出”当成 HMR 成功；
- 测试需要检查旧 fiber 的影响已撤销、新 fiber 只安装一次；
- MVP CLI 不必先做 HMR，它属于 Builder Track。

### 3.7 Capability 访问控制不是恶意代码沙箱

论文6.3明确区分两件事：依赖声明和 interception 可以限制组件通过代理能访问的能力；但拥有宿主运行时权限的恶意组件可以直接触达底层对象，语言层检查不够。真正隔离不可信代码需要独立进程、受限运行时、容器或虚拟化边界。

落地约束：

- 教程不能宣称“声明依赖以后插件就是安全的”；
- 第三方插件安装前显示其来源、版本和能力；
- 不可信课程 verifier 考虑受控子进程、超时和最小环境；
- B06 教能力收敛，B07 单独教系统边界与沙箱。

### 3.8 版本兼容是论文承认的开放问题

论文6.6指出，只靠 key 名称会遇到接口漂移和 key 冲突。Cordis 当前借助 peer dependencies 做安装期约束，但仍依赖语义化版本是否可信，也难以同时容纳同一依赖的多个版本。

落地约束：

- 插件课程使用 peer dependency 和明确版本范围；
- 课程保存最后实测 commit；
- key 使用包命名空间，避免通用短名称；
- smoke test 验证行为契约，不只验证 TypeScript 能编译；
- 不把 semver 当作兼容性的充分证据。

## 4. 论文概念与课程映射

| 论文概念 | 论文位置 | dsh-learn 课程 | 学习者需要看到的行为 |
|---|---|---|---|
| 动态组合的两个维度 | 1.1、1.2 | B00 | 卸载残留与依赖变化是两类不同问题 |
| Revertible effects | 3.1、5.1.1 | B02 | 注册后存在、卸载后归零、按逆序恢复 |
| Reactive coeffects | 3.2、5.1.2 | B03 | provider 出现/消失驱动 consumer 启停 |
| Component/fiber 生命周期 | 4.1、5.1.3 | B01、B03 | LOADING/ACTIVE/UNLOADING/INACTIVE 顺序 |
| Isolation/interception | 3.2.3、5.1.4 | B06 | 同 key 可隔离，调用策略可收紧 |
| 声明式配置 | 5.2.1 | B04 | 改配置只协调受影响实例 |
| 事务式 HMR | 5.2.2 | B05 | 新代码失败时回到旧版本 |
| 系统边界 | 6.1 | U03、U05、B07 | 本地恢复不等于撤销外部行为 |
| 访问控制与沙箱 | 6.3 | U07、B06、B07 | capability 限制不等于运行时隔离 |
| 循环依赖与组件粒度 | 6.5 | B03 | 环依赖不激活，拆成 core 与 integration |
| 依赖版本 | 6.6 | B08 | peer range、key namespace、行为 smoke test |

## 5. 不应塞进新手主线的内容

以下内容对论文成立很重要，但不是普通用户获得首次价值的前置条件：

- twisted composition、monoid homomorphism 等形式化构造；
- 完整动态组合 calculus；
- preservation、progress、confluence 的证明；
- observational equivalence 的全部定义；
- 语言与操作系统共同设计的推演；
- Koishi 生态的全部案例细节。

这些内容可以在高级附录中解释，或者作为“从实验回到论文”的阅读路线。普通用户路径只保留与权限、恢复、验证和插件风险直接有关的直觉。

## 6. 对产品形态的直接调整

读完论文后，dsh-learn 的 MVP 不应先做成一个必须安装进 DSH 的复杂插件。原因有两个：

1. 新手如果必须先理解插件安装和版本依赖，学习门槛被提前；
2. 课程 reset、兼容判断和诊断在 DSH 无法启动时仍要可用。

因此首版采用外部 CLI 建立安全练习工作区和验证闭环，等核心课程稳定以后，再增加 DSH 内插件作为第二入口。插件仍然值得做，因为它能展示 Cordis 生命周期、依赖反应和 UI 扩展，但它不应成为完成 U00-U06 的单点故障。

## 7. 论文驱动的测试门槛

### 时间可组合性测试

- 注册 N 项 effect，卸载后 N 项全部消失；
- inverse 按 LIFO 顺序执行；
- setup 在第 K 步失败，只撤销前 K-1 步；
- dispose 调用两次，第二次无副作用；
- 异步 effect 中途取消，不执行未登记步骤的 inverse；
- 全局变量或边界外写入被测试明确标记为不可自动恢复。

### 空间可组合性测试

- 无 provider：consumer 保持 INACTIVE；
- provider 上线：consumer 进入 ACTIVE；
- provider 开始卸载：consumer 先退出；
- provider 更换：consumer 按新依赖重新加载；
- 无关 key 变化：consumer 不重载；
- 循环依赖：系统给出诊断且不假装已激活；
- 两个隔离 realm：同 key 不串值。

### HMR 测试

- 正常代码变化只替换受影响 entry；
- 新模块导入失败恢复缓存与旧 fiber；
- reload 后工具、监听器和定时器不重复注册；
- 旧课程实例与新 manifest 不兼容时标记 stale。

## 8. 仍需实测确认的问题

论文给出的是 Cordis v4 的模型和实现说明，dsh-learn 开发前仍要在当前 DeepSeek Harness 基线上确认：

- DSH 公开 npm 包实际暴露的 Cordis API 与示例路径；
- repository plugin、bundle patch 和 profile 的当前安装方式；
- Web UI 可观察到哪些 fiber/插件状态；
- DSH 当前权限策略能否限制课程命令和文件范围；
- HMR 在 DSH 开发流程中的现有入口；
- 无 API Key 情况下可以启动和测试到哪一层；
- Windows 原生路径、进程退出和信号处理行为；
- 上游是否已有可复用的测试支持包。

这些问题对应 `TODO.md` 中的上游基线任务，未验证以前不应写成公开教程里的确定事实。
