# Plan: .cc-delivery 契约 v2 —— plan 库 + 当期工单 + 锁 + 回执

- Status: approved(用户 2026-08-19 批准:①worker_report→worker_output 改名 ②删除 retired/ ③生效)
- Author: leochan007 (Plan session) @ 2026-08-19
- Refs: plans/003(config.ts 反引号教训);plans/004-default-working-directory(并行活跃,互不冲突)

## 1. 背景与目标
现行契约:plan_output.md 单份覆写 + status.md 状态 + worker_report.md 里程碑追加。问题:① plans/ 与契约脱节;② 无互斥,多 Worker 并行只靠口头约定;③ 回执是流水账;④ planner 无写权限,契约文件落不了盘(本计划诞生时亲历)。
v2 目标:plans/ 升格为受管理 plan 库(合并/简化/收录);delivery 保持当期单份工单;status.md 变协议锁;worker_report.md 升级为 worker_output.md 结构化回执;planner 获得路径限定写权限。

## 2. 现状(已 grep 核实)
- src/main/config.ts:DEFAULT_ROLES_YAML 两段 prompt(planner 约行 86–170,worker 约行 200–280)
- 用户盘 ~/.cc-mode-switcher/roles.yaml 为运行时副本(Reset 才刷新)
- docs:index(en/zh)、guide/00、03、04、05、08 共 12+ 文件引用契约名
- .cc-delivery/retired/ 机制 → v2 删除
- plans/ 现存:001(completed)、002(completed)、003(active)、004-default-working-directory(active)、feedbacks/001 → 首批退役 001/002/feedbacks

## 3. 方案
### 3.1 三层终态
plans/ = 库(README 约定 + 滚动索引表 + NNN-*.md);Planner 挑当期/合并/简化;.cc-delivery/ = 当期交接(plan_output.md 单份工单 / status.md 锁 / worker_output.md 回执,不进 git)。

### 3.2 status.md(锁)
{"lock":{"owner":"worker","heartbeat_at":"…"},"current_plan":"plans/NNN-….md","phase":"…"}
- 取锁:读 → owner 为空才写自己;任何写操作刷新 heartbeat_at
- 僵锁:超 30 分钟 planner 可强制释放,worker_output.md 记 force-release 留痕
- 协议锁(advisory):约束进双方 prompt,docs 明示

### 3.3 worker_output.md(回执,替代 worker_report.md)
## plans/NNN — done|in_progress|blocked @ 时间 + 结果/进度/原因 行。

### 3.4 Planner 库管理规则(写入 planner prompt)
合并:相关 plan 合成新 NNN,旧文件同 commit 删,Refs 注明;简化:完成退役(索引记一行,文件删,git 留档)、过期/重复删、再版压缩;收录:backlog 物化为 plan_output.md,小任务 inline;优先级 = 索引排序,不加字段。

### 3.5 触点清单
1. src/main/config.ts 两段 prompt(⚠ 反引号全量重扫,003 教训)
2. plans/README.md 重写:库约定 + 索引 + 退役规则;首批退役 001/002/feedbacks
3. docs 12+ 文件:契约名统一、所有权表、05 多 Worker 段改锁协议
4. roles.yaml planner.allowedTools += Write(.cc-delivery/**), Write(plans/**)(同步进 config.ts 出厂默认)

## 4. 任务拆解
- [ ] T0 退役首批:git rm 001/002/feedbacks(含 .gitkeep 暂存),README 索引记三行
- [ ] T1 config.ts planner prompt:库管理 + 锁 + 删 retired/ + worker_output 名
- [ ] T2 config.ts worker prompt:锁协议 + worker_output schema + blocked 流程
- [ ] T3 plans/README.md 重写
- [ ] T4 docs en/zh 全量同步
- [ ] T5 e2e 一轮新契约跑通
- [ ] T6 双 worker 并发 + 僵锁恢复演练
- [ ] T7 Reset 验证 + 升级说明
- [ ] T8 planner 写权限:config.ts 出厂 roles.yaml + 用户盘 roles.yaml 加 Write(.cc-delivery/**) / Write(plans/**)

## 5. 不做的事
不做大队列、不引入优先级字段、不做硬锁、不动 .cc-delivery 不进 git 定位、不动 004 计划内容、不卷入 XtermTab.vue。

## 6. 验收
- [ ] plans/ 根 = README + 004-default-working-directory(003/005 完工自退役);feedbacks/ 消失;索引含全部退役行
- [ ] e2e 跑通;worker 无锁不开工;双 worker 互斥;僵锁可强制释放留痕
- [ ] docs build 无断链;grep -r worker_report docs/ src/ 零命中
- [ ] pnpm run build 全绿;Reset 后新 prompt 生效;planner 会话实测能写 plans/ 与 .cc-delivery/、仍不能写 src/

## 7. 风险与回滚
config.ts 模板串(003 同类)→ 每步 build 验证;老 roles.yaml → Reset+说明;协议锁靠自觉 → docs 明示 advisory。回滚:分步 path-scoped commit 单 revert;用户盘 Reset。完工后按新约定自退役。