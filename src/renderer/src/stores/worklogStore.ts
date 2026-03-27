import { create } from 'zustand'

interface WorkLog {
  id: number
  content: string
  category: string
  created_at: string
  task_id: number | null
}

interface WorkLogStore {
  logs: WorkLog[]
  loading: boolean
  fetchLogs: () => Promise<void>
  addLog: (content: string) => Promise<WorkLog>
  deleteLog: (id: number) => Promise<void>
}

export const useWorkLogStore = create<WorkLogStore>((set, get) => ({
  logs: [],
  loading: false,

  fetchLogs: async () => {
    set({ loading: true })
    try {
      const logs = await window.api.worklog.list(200)
      set({ logs })
    } finally {
      set({ loading: false })
    }
  },

  addLog: async (content: string) => {
    const log = await window.api.worklog.add(content)
    set({ logs: [log, ...get().logs] })
    return log
  },

  deleteLog: async (id: number) => {
    await window.api.worklog.delete(id)
    set({ logs: get().logs.filter((l) => l.id !== id) })
  }
}))
