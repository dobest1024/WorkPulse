import { app } from 'electron'
import { getSetting } from './db'

export type AppLanguage = 'system' | 'zh' | 'en'
export type ResolvedLanguage = 'zh' | 'en'

const translations = {
  zh: {
    create: '创建',
    newLog: '新建日志',
    newTask: '新建任务',
    navigation: '导航',
    logs: '日志',
    board: '看板',
    reports: '报告',
    stats: '统计',
    settings: '设置',
    edit: '编辑',
    window: '窗口',
    showApp: '显示 WorkPulse',
    quit: '退出',
    noWorkLogsInRange: '所选时间段内没有工作记录',
    noLogsToExport: '没有日志可导出',
    exportLogsTitle: '导出工作日志',
    exportReportTitle: '导出报告',
    csvHeader: '时间,分类,内容\n',
    markdownLogsTitle: '# WorkPulse 工作日志',
    apiKeyMissing: 'API Key 未配置',
    openAiError: 'OpenAI API 错误',
    anthropicError: 'Anthropic API 错误',
    noGeneratedContent: '生成失败：无内容返回',
    taskTodo: '待办',
    taskInProgress: '进行中',
    taskDone: '已完成',
    taskDraft: '草稿',
    taskDue: '截止 {{date}}',
    taskCompletedAt: '完成于 {{date}}',
    reportUserMessage: '以下是我的工作日志，请生成工作总结报告：\n\n{{logs}}{{tasks}}\n\n请参考以下格式模板输出：\n{{template}}',
    taskContextTitle: '\n\n相关任务上下文：\n{{tasks}}'
  },
  en: {
    create: 'Create',
    newLog: 'New Log',
    newTask: 'New Task',
    navigation: 'Navigate',
    logs: 'Logs',
    board: 'Board',
    reports: 'Reports',
    stats: 'Stats',
    settings: 'Settings',
    edit: 'Edit',
    window: 'Window',
    showApp: 'Show WorkPulse',
    quit: 'Quit',
    noWorkLogsInRange: 'No work logs in the selected date range',
    noLogsToExport: 'No logs to export',
    exportLogsTitle: 'Export work logs',
    exportReportTitle: 'Export report',
    csvHeader: 'Time,Category,Content\n',
    markdownLogsTitle: '# WorkPulse Work Logs',
    apiKeyMissing: 'API key is not configured',
    openAiError: 'OpenAI API error',
    anthropicError: 'Anthropic API error',
    noGeneratedContent: 'Generation failed: empty response',
    taskTodo: 'Todo',
    taskInProgress: 'In Progress',
    taskDone: 'Done',
    taskDraft: 'Draft',
    taskDue: 'due {{date}}',
    taskCompletedAt: 'completed {{date}}',
    reportUserMessage: 'Here are my work logs. Generate a work summary report:\n\n{{logs}}{{tasks}}\n\nUse this output template as the structure:\n{{template}}',
    taskContextTitle: '\n\nRelated task context:\n{{tasks}}'
  }
} as const

type MainTranslationKey = keyof typeof translations.zh

export function resolveSystemLanguage(language: string): ResolvedLanguage {
  return language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function getConfiguredLanguage(): AppLanguage {
  const saved = getSetting('app_language')
  return saved === 'zh' || saved === 'en' || saved === 'system' ? saved : 'system'
}

export function getResolvedLanguage(): ResolvedLanguage {
  const configured = getConfiguredLanguage()
  return configured === 'system' ? resolveSystemLanguage(app.getLocale()) : configured
}

export function tMain(
  key: MainTranslationKey,
  values: Record<string, string | number> = {}
): string {
  const template = translations[getResolvedLanguage()][key] ?? translations.en[key]
  return template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(values[token] ?? ''))
}
