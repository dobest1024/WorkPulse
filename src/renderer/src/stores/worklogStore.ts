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
  hasMore: boolean
  searchKeyword: string
  lastDeleted: WorkLog | null
  fetchLogs: () => Promise<void>
  loadMore: () => Promise<void>
  searchLogs: (keyword: string) => Promise<void>
  clearSearch: () => Promise<void>
  addLog: (content: string, category?: string) => Promise<WorkLog>
  deleteLog: (id: number) => Promise<void>
  undoDelete: () => Promise<void>
}

const PAGE_SIZE = 50

export const useWorkLogStore = create<WorkLogStore>((set, get) => ({
  logs: [],
  loading: false,
  hasMore: true,
  searchKeyword: '',
  lastDeleted: null,

  fetchLogs: async () => {
    set({ loading: true })
    try {
      const logs = await window.api.worklog.list(PAGE_SIZE, 0)
      set({ logs, hasMore: logs.length >= PAGE_SIZE })
    } finally {
      set({ loading: false })
    }
  },

  loadMore: async () => {
    if (get().loading || !get().hasMore || get().searchKeyword) return
    set({ loading: true })
    try {
      const more = await window.api.worklog.list(PAGE_SIZE, get().logs.length)
      set({
        logs: [...get().logs, ...more],
        hasMore: more.length >= PAGE_SIZE
      })
    } finally {
      set({ loading: false })
    }
  },

  searchLogs: async (keyword: string) => {
    set({ loading: true, searchKeyword: keyword })
    try {
      const logs = await window.api.worklog.search(keyword)
      set({ logs })
    } finally {
      set({ loading: false })
    }
  },

  clearSearch: async () => {
    set({ searchKeyword: '' })
    await get().fetchLogs()
  },

  addLog: async (content: string, category?: string) => {
    const log = await window.api.worklog.add(content, category)
    // If searching, re-run search; otherwise prepend
    if (get().searchKeyword) {
      await get().searchLogs(get().searchKeyword)
    } else {
      set({ logs: [log, ...get().logs] })
    }
    return log
  },

  deleteLog: async (id: number) => {
    const deleted = get().logs.find((l) => l.id === id)
    await window.api.worklog.delete(id)
    set({ logs: get().logs.filter((l) => l.id !== id), lastDeleted: deleted || null })
  },

  undoDelete: async () => {
    const deleted = get().lastDeleted
    if (!deleted) return
    await window.api.worklog.add(deleted.content)
    set({ lastDeleted: null })
    // Refresh to get correct ordering
    if (get().searchKeyword) {
      await get().searchLogs(get().searchKeyword)
    } else {
      await get().fetchLogs()
    }
  }
}))
