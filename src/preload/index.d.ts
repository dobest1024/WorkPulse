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
}

interface API {
  task: {
    add: (title: string, description?: string, status?: 'todo' | 'draft') => Promise<Task>
    list: () => Promise<Task[]>
    update: (id: number, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position'>>) => Promise<Task | null>
    delete: (id: number) => Promise<boolean>
    reorder: (taskIds: number[], status: string) => Promise<void>
    complete: (id: number, logContent: string) => Promise<Task | null>
  }
  worklog: {
    add: (content: string, category?: string) => Promise<WorkLog>
    list: (limit?: number, offset?: number) => Promise<WorkLog[]>
    byDateRange: (from: string, to: string) => Promise<WorkLog[]>
    delete: (id: number) => Promise<boolean>
  }
  report: {
    generate: (dateFrom: string, dateTo: string) => Promise<Report>
    list: (limit?: number) => Promise<Report[]>
  }
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
