import { useEffect, useState, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical, Archive, ChevronRight, ChevronLeft } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'
import { useToast } from '../components/Toast'

interface Task {
  id: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done' | 'draft'
  position: number
}

type ColumnId = 'todo' | 'in_progress' | 'done'
type DroppableId = ColumnId | 'draft'

const COLUMNS: { id: ColumnId; label: string; color: string }[] = [
  { id: 'todo', label: '待办', color: 'border-zinc-300' },
  { id: 'in_progress', label: '进行中', color: 'border-blue-400' },
  { id: 'done', label: '已完成', color: 'border-green-400' }
]

const ALL_DROPPABLE_IDS: DroppableId[] = ['todo', 'in_progress', 'done', 'draft']

// --- Droppable Column Wrapper ---
function DroppableColumn({
  id,
  children
}: {
  id: string
  children: React.ReactNode
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] rounded-lg transition-colors ${isOver ? 'bg-zinc-100' : ''}`}
    >
      {children}
    </div>
  )
}

// --- Sortable Task Card ---
function SortableTaskCard({
  task,
  onDelete
}: {
  task: Task
  onDelete: (id: number) => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 p-3 bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 p-0.5 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-800 break-words">{task.title}</p>
        {task.description && (
          <p className="text-xs text-zinc-400 mt-1 break-words">{task.description}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-300 hover:text-red-500 transition-all shrink-0"
        aria-label="删除任务"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// --- Overlay Card (while dragging) ---
function TaskCardOverlay({ task }: { task: Task }): JSX.Element {
  return (
    <div className="p-3 bg-white border border-zinc-300 rounded-lg shadow-lg rotate-2">
      <p className="text-sm text-zinc-800">{task.title}</p>
    </div>
  )
}

// --- Complete Dialog ---
function CompleteDialog({
  task,
  onConfirm,
  onCancel
}: {
  task: Task
  onConfirm: (logContent: string) => void
  onCancel: () => void
}): JSX.Element {
  const [logContent, setLogContent] = useState(`完成任务：${task.title}`)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onConfirm(logContent)
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-semibold text-zinc-900 mb-1">任务完成</h3>
        <p className="text-sm text-zinc-500 mb-4">
          记录一下这个任务的产出？（将自动写入工作日志）
        </p>
        <textarea
          ref={inputRef}
          value={logContent}
          onChange={(e) => setLogContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 resize-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            跳过
          </button>
          <button
            onClick={() => onConfirm(logContent)}
            className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
          >
            记录并完成
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Main Kanban Page ---
function KanbanPage(): JSX.Element {
  const { tasks, fetchTasks, addTask, deleteTask, completeTask, reorderTasks } =
    useTaskStore()
  const toast = useToast()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [draftInput, setDraftInput] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [pendingComplete, setPendingComplete] = useState<Task | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>([])
  const [draftOpen, setDraftOpen] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getColumnTasks = (columnId: DroppableId): Task[] =>
    localTasks.filter((t) => t.status === columnId).sort((a, b) => a.position - b.position)

  const findTaskColumn = (taskId: number | string): DroppableId | null => {
    const task = localTasks.find((t) => t.id === taskId)
    return (task?.status as DroppableId) || null
  }

  const handleAddTask = async (): Promise<void> => {
    if (!newTaskTitle.trim()) return
    await addTask(newTaskTitle.trim())
    setNewTaskTitle('')
  }

  const handleAddDraft = async (): Promise<void> => {
    if (!draftInput.trim()) return
    await addTask(draftInput.trim(), undefined, 'draft')
    setDraftInput('')
  }

  const handleDragStart = (event: DragStartEvent): void => {
    const task = localTasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: DragOverEvent): void => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as number
    const overId = over.id

    // Determine which column the "over" element belongs to
    let overColumn: DroppableId | null = null
    if (ALL_DROPPABLE_IDS.includes(overId as DroppableId)) {
      // Dropped over a column container directly
      overColumn = overId as DroppableId
    } else {
      // Dropped over a task — find that task's column
      overColumn = findTaskColumn(overId as number)
    }

    if (!overColumn) return

    const activeTaskItem = localTasks.find((t) => t.id === activeId)
    if (!activeTaskItem || activeTaskItem.status === overColumn) return

    // Move task to new column optimistically
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, status: overColumn! } : t
      )
    )
  }

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) {
      // Cancelled drag — revert
      setLocalTasks(tasks)
      return
    }

    const activeId = active.id as number
    const task = localTasks.find((t) => t.id === activeId)
    if (!task) return

    // Determine target column
    let targetColumn: DroppableId = task.status as DroppableId
    if (ALL_DROPPABLE_IDS.includes(over.id as DroppableId)) {
      targetColumn = over.id as DroppableId
    } else {
      const overTask = localTasks.find((t) => t.id === over.id)
      if (overTask) targetColumn = overTask.status as DroppableId
    }

    // If moved to done, show complete dialog
    const originalTask = tasks.find((t) => t.id === activeId)
    if (targetColumn === 'done' && originalTask?.status !== 'done') {
      setPendingComplete({ ...task, status: 'done' })
      return
    }

    // Reorder within the column
    const columnTasks = localTasks
      .filter((t) => t.status === targetColumn)
      .sort((a, b) => a.position - b.position)

    const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
    const overIndex = columnTasks.findIndex((t) => t.id === over.id)

    if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
      const reordered = arrayMove(columnTasks, oldIndex, overIndex)
      await reorderTasks(reordered.map((t) => t.id), targetColumn)
    } else {
      const ids = columnTasks.map((t) => t.id)
      await reorderTasks(ids, targetColumn)
    }
  }

  const handleComplete = async (logContent: string): Promise<void> => {
    if (!pendingComplete) return
    await completeTask(pendingComplete.id, logContent)
    setPendingComplete(null)
    toast.success('任务已完成，已写入工作日志')
  }

  const handleCancelComplete = async (): Promise<void> => {
    setPendingComplete(null)
    await fetchTasks()
  }

  const handleDelete = async (id: number): Promise<void> => {
    await deleteTask(id)
  }

  const draftTasks = getColumnTasks('draft')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4">
        {/* Main Board Area */}
        <div className="flex-1 min-w-0">
          {/* Add task */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="添加新任务..."
              className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
            <button
              onClick={handleAddTask}
              className="flex items-center gap-1 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>

          {/* Board */}
          <div className="grid grid-cols-3 gap-4">
            {COLUMNS.map((col) => {
              const columnTasks = getColumnTasks(col.id)
              return (
                <div key={col.id} className="min-h-[200px]">
                  <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
                    <h3 className="text-sm font-medium text-zinc-700">{col.label}</h3>
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                      {columnTasks.length}
                    </span>
                  </div>
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn id={col.id}>
                      <div className="space-y-2">
                        {columnTasks.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            onDelete={handleDelete}
                          />
                        ))}
                        {columnTasks.length === 0 && (
                          <div className="text-center py-8 text-xs text-zinc-300">
                            拖拽任务到这里
                          </div>
                        )}
                      </div>
                    </DroppableColumn>
                  </SortableContext>
                </div>
              )
            })}
          </div>
        </div>

        {/* Draft Box Sidebar */}
        <div
          className={`shrink-0 border-l border-zinc-200 bg-zinc-50/50 rounded-lg transition-all flex flex-col ${
            draftOpen ? 'w-56' : 'w-10'
          }`}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setDraftOpen(!draftOpen)}
            className="flex items-center justify-center h-10 border-b border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0 rounded-t-lg"
            aria-label={draftOpen ? '收起草稿箱' : '展开草稿箱'}
          >
            {draftOpen ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {!draftOpen && (
            <div className="flex flex-col items-center gap-1 pt-3">
              <Archive className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-400" style={{ writingMode: 'vertical-rl' }}>
                草稿箱 ({draftTasks.length})
              </span>
            </div>
          )}

          {draftOpen && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200">
                <Archive className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-700">草稿箱</h3>
                <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                  {draftTasks.length}
                </span>
              </div>

              <p className="text-xs text-zinc-400 px-3 py-2">
                可办可不办的想法，拖到待办即为计划
              </p>

              {/* Draft Input */}
              <div className="px-3 pb-3">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={draftInput}
                    onChange={(e) => setDraftInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDraft()}
                    placeholder="随手记一个..."
                    className="flex-1 px-2 py-1.5 border border-zinc-200 rounded text-xs outline-none focus:border-zinc-400 bg-white"
                  />
                  <button
                    onClick={handleAddDraft}
                    className="px-2 py-1.5 bg-zinc-100 text-zinc-600 text-xs rounded hover:bg-zinc-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Draft List */}
              <SortableContext
                items={draftTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn id="draft">
                  <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-3">
                    {draftTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onDelete={handleDelete}
                      />
                    ))}
                    {draftTasks.length === 0 && (
                      <div className="text-center py-6 text-xs text-zinc-300">
                        暂无草稿
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              </SortableContext>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>

      {/* Complete Dialog */}
      {pendingComplete && (
        <CompleteDialog
          task={pendingComplete}
          onConfirm={handleComplete}
          onCancel={handleCancelComplete}
        />
      )}
    </DndContext>
  )
}

export default KanbanPage
