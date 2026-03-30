import { create } from 'zustand'

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

interface TaskStore {
  tasks: Task[]
  loading: boolean
  fetchTasks: () => Promise<void>
  addTask: (title: string, description?: string, status?: 'todo' | 'draft') => Promise<Task>
  updateTask: (id: number, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position' | 'due_date'>>) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  completeTask: (id: number, logContent: string) => Promise<void>
  reorderTasks: (taskIds: number[], status: string) => Promise<void>
  getByStatus: (status: Task['status']) => Task[]
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await window.api.task.list()
      set({ tasks })
    } finally {
      set({ loading: false })
    }
  },

  addTask: async (title, description, status) => {
    const task = await window.api.task.add(title, description, status)
    set({ tasks: [...get().tasks, task] })
    return task
  },

  updateTask: async (id, updates) => {
    const updated = await window.api.task.update(id, updates)
    if (updated) {
      set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
    }
  },

  deleteTask: async (id) => {
    await window.api.task.delete(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },

  completeTask: async (id, logContent) => {
    const updated = await window.api.task.complete(id, logContent)
    if (updated) {
      set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
    }
  },

  reorderTasks: async (taskIds, status) => {
    await window.api.task.reorder(taskIds, status)
    // Refetch to get updated positions
    await get().fetchTasks()
  },

  getByStatus: (status) => {
    return get()
      .tasks.filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position)
  }
}))
