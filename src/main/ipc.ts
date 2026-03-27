import { ipcMain, safeStorage } from 'electron'
import {
  addWorkLog,
  getWorkLogs,
  getWorkLogsByDateRange,
  deleteWorkLog,
  saveReport,
  getReports,
  getSetting,
  setSetting,
  deleteSetting,
  addTask,
  getTasks,
  updateTask,
  deleteTask,
  reorderTasks
} from './db'
import { generateReport } from './ai'

export function registerIpcHandlers(): void {
  // --- Work Logs ---

  ipcMain.handle('worklog:add', (_event, content: string, category?: string) => {
    return addWorkLog(content, category)
  })

  ipcMain.handle('worklog:list', (_event, limit?: number, offset?: number) => {
    return getWorkLogs(limit, offset)
  })

  ipcMain.handle('worklog:byDateRange', (_event, from: string, to: string) => {
    return getWorkLogsByDateRange(from, to)
  })

  ipcMain.handle('worklog:delete', (_event, id: number) => {
    return deleteWorkLog(id)
  })

  // --- Reports ---

  ipcMain.handle(
    'report:generate',
    async (_event, dateFrom: string, dateTo: string) => {
      const logs = getWorkLogsByDateRange(dateFrom, dateTo)
      if (logs.length === 0) {
        throw new Error('所选时间段内没有工作记录')
      }
      const content = await generateReport(logs, dateFrom, dateTo)
      const report = saveReport('custom', dateFrom, dateTo, content)
      return report
    }
  )

  ipcMain.handle('report:list', (_event, limit?: number) => {
    return getReports(limit)
  })

  // --- Tasks ---

  ipcMain.handle('task:add', (_event, title: string, description?: string, status?: 'todo' | 'draft') => {
    return addTask(title, description, status)
  })

  ipcMain.handle('task:list', () => {
    return getTasks()
  })

  ipcMain.handle(
    'task:update',
    (_event, id: number, updates: { title?: string; description?: string; status?: string; position?: number }) => {
      return updateTask(id, updates as any)
    }
  )

  ipcMain.handle('task:delete', (_event, id: number) => {
    return deleteTask(id)
  })

  ipcMain.handle('task:reorder', (_event, taskIds: number[], status: string) => {
    reorderTasks(taskIds, status)
  })

  // Complete task + auto create work log
  ipcMain.handle(
    'task:complete',
    (_event, id: number, logContent: string) => {
      const task = updateTask(id, { status: 'done' })
      if (task && logContent.trim()) {
        addWorkLog(logContent.trim())
      }
      return task
    }
  )

  // --- Settings ---

  ipcMain.handle('settings:get', (_event, key: string) => {
    if (key === 'api_key') {
      const encrypted = getSetting('api_key_encrypted')
      if (encrypted && safeStorage.isEncryptionAvailable()) {
        try {
          return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
        } catch {
          return null
        }
      }
      return getSetting('api_key')
    }
    return getSetting(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    if (key === 'api_key') {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(value).toString('base64')
        setSetting('api_key_encrypted', encrypted)
        setSetting('api_key', value)
      } else {
        setSetting('api_key', value)
      }
      return
    }
    setSetting(key, value)
  })

  ipcMain.handle('settings:delete', (_event, key: string) => {
    if (key === 'api_key') {
      deleteSetting('api_key')
      deleteSetting('api_key_encrypted')
      return
    }
    deleteSetting(key)
  })
}
