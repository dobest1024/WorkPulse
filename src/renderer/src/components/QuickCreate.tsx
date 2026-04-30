import { useEffect, useRef, useState } from 'react'
import { ClipboardList, Columns3 } from 'lucide-react'
import { useWorkLogStore } from '../stores/worklogStore'
import { useTaskStore } from '../stores/taskStore'
import { useToast } from './Toast'
import { useI18n } from '../stores/languageStore'

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
  const { t } = useI18n()

  const parseCategory = (text: string): { content: string; category: string } => {
    const match = text.match(/#(\S+)\s*/)
    if (match) {
      return { content: text.replace(match[0], '').trim(), category: match[1] }
    }
    return { content: text, category: '' }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  const handleSubmit = async (): Promise<void> => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      if (mode === 'log') {
        const { content, category } = parseCategory(trimmed)
        await addLog(content, category)
        toast.success(t('quick.logSaved'))
      } else {
        await addTask(trimmed)
        toast.success(t('quick.taskSaved'))
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
      <div className="absolute inset-0 bg-black/20 animate-fade-in" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mode toggle */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => { setMode('log'); setValue('') }}
            className={`flex items-center gap-2 px-4 py-3 text-sm flex-1 transition-colors ${
              mode === 'log'
                ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border-b-2 border-zinc-900 dark:border-zinc-100'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            {t('quick.log')}
          </button>
          <button
            onClick={() => { setMode('task'); setValue('') }}
            className={`flex items-center gap-2 px-4 py-3 text-sm flex-1 transition-colors ${
              mode === 'task'
                ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border-b-2 border-zinc-900 dark:border-zinc-100'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <Columns3 className="w-4 h-4" />
            {t('quick.task')}
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
            placeholder={mode === 'log' ? t('quick.logPlaceholder') : t('quick.taskPlaceholder')}
            disabled={submitting}
            className="w-full px-3 py-2.5 text-base border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-zinc-400">
              {t('quick.help')}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || submitting}
              className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 transition-all btn-bounce"
            >
              {mode === 'log' ? t('quick.submitLog') : t('common.add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
