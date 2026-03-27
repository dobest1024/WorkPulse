import { useEffect, useRef, useState } from 'react'
import { ClipboardList, Columns3 } from 'lucide-react'
import { useWorkLogStore } from '../stores/worklogStore'
import { useTaskStore } from '../stores/taskStore'
import { useToast } from './Toast'

type Mode = 'log' | 'task'

interface Props {
  initialMode: Mode
  onClose: () => void
}

export function QuickCreate({ initialMode, onClose }: Props): JSX.Element {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addLog } = useWorkLogStore()
  const { addTask } = useTaskStore()
  const toast = useToast()

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  const handleSubmit = async (): Promise<void> => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      if (mode === 'log') {
        await addLog(trimmed)
        toast.success('日志已记录')
      } else {
        await addTask(trimmed)
        toast.success('任务已添加到待办')
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
    // Tab switches mode
    if (e.key === 'Tab') {
      e.preventDefault()
      setMode((m) => (m === 'log' ? 'task' : 'log'))
      setValue('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mode toggle */}
        <div className="flex border-b border-zinc-100">
          <button
            onClick={() => { setMode('log'); setValue('') }}
            className={`flex items-center gap-2 px-4 py-3 text-sm flex-1 transition-colors ${
              mode === 'log'
                ? 'text-zinc-900 bg-zinc-50 border-b-2 border-zinc-900'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            记录日志
          </button>
          <button
            onClick={() => { setMode('task'); setValue('') }}
            className={`flex items-center gap-2 px-4 py-3 text-sm flex-1 transition-colors ${
              mode === 'task'
                ? 'text-zinc-900 bg-zinc-50 border-b-2 border-zinc-900'
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Columns3 className="w-4 h-4" />
            添加任务
          </button>
        </div>

        {/* Input */}
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'log' ? '今天干了什么？' : '任务名称...'}
            disabled={submitting}
            className="w-full px-3 py-2.5 text-base border border-zinc-300 rounded-lg outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-zinc-400">
              Tab 切换模式 · Enter 保存 · Esc 关闭
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || submitting}
              className="px-4 py-1.5 bg-zinc-900 text-white text-sm rounded-md hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              {mode === 'log' ? '记录' : '添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
