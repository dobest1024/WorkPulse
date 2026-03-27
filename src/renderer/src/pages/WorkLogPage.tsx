import { useEffect, useRef, useState } from 'react'
import { Trash2, ClipboardEdit } from 'lucide-react'
import { useWorkLogStore } from '../stores/worklogStore'
import { formatDate, formatTime, groupLogsByDate } from '../lib/dateUtils'

function WorkLogPage(): JSX.Element {
  const { logs, fetchLogs, addLog, deleteLog } = useWorkLogStore()
  const [input, setInput] = useState('')
  const [shaking, setShaking] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchLogs()
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed) {
      setShaking(true)
      setError('请输入工作内容')
      setTimeout(() => {
        setShaking(false)
        setError('')
      }, 1500)
      return
    }

    try {
      await addLog(trimmed)
      setInput('')
    } catch {
      setError('保存失败，请重试')
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    await deleteLog(id)
    setDeletingId(null)
  }

  const grouped = groupLogsByDate(logs)

  return (
    <div>
      {/* Input */}
      <div className="mb-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="今天干了什么？"
            aria-label="记录工作日志"
            className={`w-full px-4 py-3 text-base border rounded-lg outline-none transition-all ${
              shaking ? 'animate-shake border-red-400 ring-2 ring-red-200' : 'border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200'
            }`}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardEdit className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
          <p className="text-zinc-500 text-lg mb-1">开始记录你的第一条工作日志吧</p>
          <p className="text-zinc-400 text-sm">输入你今天做了什么，按回车保存</p>
        </div>
      ) : (
        <div role="list" className="space-y-6">
          {Array.from(grouped.entries()).map(([dateKey, dateLogs]) => (
            <div key={dateKey} role="group">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">
                {formatDate(dateKey + 'T00:00:00')}
              </h3>
              <div className="space-y-1">
                {dateLogs.map((log) => (
                  <div
                    key={log.id}
                    className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-zinc-50 animate-fade-in"
                  >
                    <span className="text-zinc-800 flex-1 mr-4">{log.content}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        {formatTime(log.created_at)}
                      </span>
                      {deletingId === log.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-1"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-zinc-400 hover:text-zinc-600 px-1"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(log.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                          aria-label="删除此条日志"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkLogPage
