import { ElectronAPI } from '@electron-toolkit/preload'

interface WorkLog {
  id: number
  content: string
  category: string
  created_at: string
  task_id: number | null
}

interface Report {
  id: number
  type: string
  date_from: string
  date_to: string
  content: string
  generated_at: string
}

interface Task {
  id: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done' | 'draft'
  board_column: string
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
  due_date: string | null
}

type QuickCreateType = 'log' | 'task'
type NavigatePage = 'worklog' | 'kanban' | 'report' | 'stats' | 'settings'
type AppLanguage = 'system' | 'zh' | 'en'

interface API {
  app: {
    setLanguage: (language: AppLanguage) => Promise<void>
  }
  on: {
    quickCreate: (cb: (type: QuickCreateType) => void) => () => void
    navigate: (cb: (page: NavigatePage) => void) => () => void
  }
  task: {
    add: (title: string, description?: string, status?: 'todo' | 'draft') => Promise<Task>
    list: () => Promise<Task[]>
    update: (id: number, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position' | 'due_date'>>) => Promise<Task | null>
    delete: (id: number) => Promise<boolean>
    reorder: (taskIds: number[], status: string) => Promise<void>
    complete: (id: number, logContent: string) => Promise<Task | null>
  }
  worklog: {
    add: (content: string, category?: string) => Promise<WorkLog>
    list: (limit?: number, offset?: number) => Promise<WorkLog[]>
    byDateRange: (from: string, to: string) => Promise<WorkLog[]>
    search: (keyword: string) => Promise<WorkLog[]>
    categories: () => Promise<string[]>
    setCategory: (id: number, category: string) => Promise<void>
    delete: (id: number) => Promise<boolean>
    restore: (log: Pick<WorkLog, 'content' | 'category' | 'created_at' | 'task_id'>) => Promise<WorkLog>
  }
  stats: {
    get: (days?: number) => Promise<{
      daily: { date: string; log_count: number; task_completed: number }[]
      totalLogs: number
      totalTasksDone: number
      totalTasksActive: number
      streak: number
    }>
  }
  report: {
    generate: (dateFrom: string, dateTo: string) => Promise<Report>
    list: (limit?: number) => Promise<Report[]>
    update: (id: number, content: string) => Promise<Report | null>
  }
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  shortcut: {
    update: (key: string, value: string) => Promise<boolean>
  }
  export: {
    logs: (format: 'csv' | 'markdown') => Promise<string | null>
    report: (content: string, dateRange: string) => Promise<string | null>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
