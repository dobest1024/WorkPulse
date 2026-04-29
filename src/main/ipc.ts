import { ipcMain, dialog } from 'electron'
import { writeFileSync } from 'fs'
import {
  addWorkLog,
  getWorkLogs,
  getWorkLogsByDateRange,
  searchWorkLogs,
  getAllWorkLogs,
  getStats,
  getCategories,
  updateWorkLogCategory,
  deleteWorkLog,
  restoreWorkLog,
  saveReport,
  getReports,
  updateReportContent,
  getSetting,
  setSetting,
  deleteSetting,
  addTask,
  getTasks,
  updateTask,
  deleteTask,
  reorderTasks,
  type Task
} from './db'
import { generateReport } from './ai'
import { deleteStoredApiKey, getStoredApiKey, setStoredApiKey } from './secureSettings'

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

  ipcMain.handle('worklog:search', (_event, keyword: string) => {
    return searchWorkLogs(keyword)
  })

  ipcMain.handle('worklog:categories', () => {
    return getCategories()
  })

  ipcMain.handle('worklog:setCategory', (_event, id: number, category: string) => {
    updateWorkLogCategory(id, category)
  })

  ipcMain.handle('worklog:delete', (_event, id: number) => {
    return deleteWorkLog(id)
  })

  ipcMain.handle(
    'worklog:restore',
    (_event, log: { content: string; category: string; created_at: string; task_id: number | null }) => {
      return restoreWorkLog(log)
    }
  )

  ipcMain.handle('stats:get', (_event, days?: number) => {
    return getStats(days)
  })

  // --- Reports ---

  ipcMain.handle(
    'report:generate',
    async (_event, dateFrom: string, dateTo: string) => {
      const logs = getWorkLogsByDateRange(dateFrom, dateTo)
      if (logs.length === 0) {
        throw new Error('所选时间段内没有工作记录')
      }
      const tasks = getTasks().filter((task) => {
        if (task.status !== 'done') return true
        const completedDate = task.completed_at?.slice(0, 10)
        return Boolean(completedDate && completedDate >= dateFrom && completedDate <= dateTo)
      })
      const content = await generateReport(logs, dateFrom, dateTo, tasks)
      const report = saveReport('custom', dateFrom, dateTo, content)
      return report
    }
  )

  ipcMain.handle('report:list', (_event, limit?: number) => {
    return getReports(limit)
  })

  ipcMain.handle('report:update', (_event, id: number, content: string) => {
    return updateReportContent(id, content)
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
    (
      _event,
      id: number,
      updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position' | 'due_date'>>
    ) => {
      return updateTask(id, updates)
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
        addWorkLog(logContent.trim(), '', id)
      }
      return task
    }
  )

  // --- Settings ---

  ipcMain.handle('settings:get', (_event, key: string) => {
    if (key === 'api_key') {
      return getStoredApiKey()
    }
    return getSetting(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    if (key === 'api_key') {
      setStoredApiKey(value)
      return
    }
    setSetting(key, value)
  })

  ipcMain.handle('settings:delete', (_event, key: string) => {
    if (key === 'api_key') {
      deleteStoredApiKey()
      return
    }
    deleteSetting(key)
  })

  // --- Export ---

  ipcMain.handle('export:logs', async (_event, format: 'csv' | 'markdown') => {
    const logs = getAllWorkLogs()
    if (logs.length === 0) throw new Error('没有日志可导出')

    const ext = format === 'csv' ? 'csv' : 'md'
    const result = await dialog.showSaveDialog({
      title: '导出工作日志',
      defaultPath: `workpulse-logs.${ext}`,
      filters: [
        format === 'csv'
          ? { name: 'CSV', extensions: ['csv'] }
          : { name: 'Markdown', extensions: ['md'] }
      ]
    })

    if (result.canceled || !result.filePath) return null

    let content: string
    if (format === 'csv') {
      const escapeCsvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`
      const header = '时间,分类,内容\n'
      const rows = logs
        .map((l) => [l.created_at, l.category, l.content].map(escapeCsvCell).join(','))
        .join('\n')
      content = header + rows
    } else {
      const grouped = new Map<string, typeof logs>()
      for (const log of logs) {
        const date = log.created_at.slice(0, 10)
        const list = grouped.get(date) || []
        list.push(log)
        grouped.set(date, list)
      }
      const sections = Array.from(grouped.entries()).map(([date, dateLogs]) => {
        const items = dateLogs.map((l) => {
          const category = l.category ? ` [${l.category}]` : ''
          return `- ${l.created_at.slice(11, 16)}${category} ${l.content}`
        }).join('\n')
        return `## ${date}\n\n${items}`
      })
      content = `# WorkPulse 工作日志\n\n${sections.join('\n\n')}\n`
    }

    writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  })

  ipcMain.handle('export:report', async (_event, reportContent: string, dateRange: string) => {
    const result = await dialog.showSaveDialog({
      title: '导出报告',
      defaultPath: `workpulse-report-${dateRange}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (result.canceled || !result.filePath) return null

    writeFileSync(result.filePath, reportContent, 'utf-8')
    return result.filePath
  })
}
