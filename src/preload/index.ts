import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type QuickCreateType = 'log' | 'task'
type NavigatePage = 'worklog' | 'kanban' | 'report' | 'stats' | 'settings'

const api = {
  worklog: {
    add: (content: string, category?: string) =>
      ipcRenderer.invoke('worklog:add', content, category),
    list: (limit?: number, offset?: number) =>
      ipcRenderer.invoke('worklog:list', limit, offset),
    byDateRange: (from: string, to: string) =>
      ipcRenderer.invoke('worklog:byDateRange', from, to),
    search: (keyword: string) => ipcRenderer.invoke('worklog:search', keyword),
    categories: () => ipcRenderer.invoke('worklog:categories') as Promise<string[]>,
    setCategory: (id: number, category: string) =>
      ipcRenderer.invoke('worklog:setCategory', id, category),
    delete: (id: number) => ipcRenderer.invoke('worklog:delete', id),
    restore: (log: { content: string; category: string; created_at: string; task_id: number | null }) =>
      ipcRenderer.invoke('worklog:restore', log)
  },
  task: {
    add: (title: string, description?: string, status?: 'todo' | 'draft') =>
      ipcRenderer.invoke('task:add', title, description, status),
    list: () => ipcRenderer.invoke('task:list'),
    update: (id: number, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('task:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('task:delete', id),
    reorder: (taskIds: number[], status: string) =>
      ipcRenderer.invoke('task:reorder', taskIds, status),
    complete: (id: number, logContent: string) =>
      ipcRenderer.invoke('task:complete', id, logContent)
  },
  stats: {
    get: (days?: number) => ipcRenderer.invoke('stats:get', days)
  },
  report: {
    generate: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke('report:generate', dateFrom, dateTo),
    list: (limit?: number) => ipcRenderer.invoke('report:list', limit),
    update: (id: number, content: string) =>
      ipcRenderer.invoke('report:update', id, content)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('settings:delete', key)
  },
  shortcut: {
    update: (key: string, value: string) => ipcRenderer.invoke('shortcut:update', key, value)
  },
  export: {
    logs: (format: 'csv' | 'markdown') => ipcRenderer.invoke('export:logs', format),
    report: (content: string, dateRange: string) =>
      ipcRenderer.invoke('export:report', content, dateRange)
  },
  on: {
    quickCreate: (cb: (type: QuickCreateType) => void) => {
      const logHandler = (): void => cb('log')
      const taskHandler = (): void => cb('task')
      ipcRenderer.on('quick-create:log', logHandler)
      ipcRenderer.on('quick-create:task', taskHandler)
      return () => {
        ipcRenderer.removeListener('quick-create:log', logHandler)
        ipcRenderer.removeListener('quick-create:task', taskHandler)
      }
    },
    navigate: (cb: (page: NavigatePage) => void) => {
      const pages: NavigatePage[] = ['worklog', 'kanban', 'report', 'stats', 'settings']
      const handlers = pages.map((page) => {
        const handler = (): void => cb(page)
        ipcRenderer.on(`navigate:${page}`, handler)
        return { page, handler }
      })
      return () => {
        handlers.forEach(({ page, handler }) =>
          ipcRenderer.removeListener(`navigate:${page}`, handler)
        )
      }
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
