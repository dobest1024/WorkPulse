# TODOS

## Phase 2: 任务看板模块
**What:** 实现 Todo/InProgress/Done 三列看板 + 拖拽 + 完成自动写入日志 + 月报/季度总结
**Why:** 让任务管理和工作记录形成闭环，拖拽完成任务 = 自动产生工作日志
**Depends on:** Phase 1 MVP 完成
**Context:** 使用 @dnd-kit/core 实现拖拽。tasks 表已在 Phase 1 schema 中预留。完成任务时弹出对话框让用户补充产出描述，同时写入 work_logs 表。月报/季度总结复用 Phase 1 的 AI 生成逻辑，扩展日期范围选择器。
