import { useEffect, useRef, useState } from 'react'
import { Trash2, ClipboardEdit, Search, X, Download, Undo2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useWorkLogStore } from '../stores/worklogStore'
import { formatDate, formatTime, groupLogsByDate } from '../lib/dateUtils'
import { useI18n } from '../stores/languageStore'

function WorkLogPage(): JSX.Element {
  const { logs, fetchLogs, loadMore, hasMore, addLog, deleteLog, undoDelete, lastDeleted, searchLogs, clearSearch, searchKeyword, loading } =
    useWorkLogStore()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [shaking, setShaking] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const toast = useToast()
  const { resolvedLanguage, t } = useI18n()

  useEffect(() => {
    fetchLogs()
    inputRef.current?.focus()
  }, [])

  const parseCategory = (text: string): { content: string; category: string } => {
    const match = text.match(/#(\S+)\s*/)
    if (match) {
      return { content: text.replace(match[0], '').trim(), category: match[1] }
    }
    return { content: text, category: '' }
  }

  const handleSubmit = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed) {
      setShaking(true)
      setError(t('worklog.emptyError'))
      setTimeout(() => {
        setShaking(false)
        setError('')
      }, 1500)
      return
    }

    try {
      const { content, category } = parseCategory(trimmed)
      await addLog(content, category)
      setInput('')
    } catch {
      setError(t('worklog.saveError'))
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSearchChange = (value: string): void => {
    setSearch(value)
    clearTimeout(searchTimerRef.current)
    if (!value.trim()) {
      clearSearch()
      return
    }
    searchTimerRef.current = setTimeout(() => {
      searchLogs(value.trim())
    }, 300)
  }

  const handleClearSearch = (): void => {
    setSearch('')
    clearSearch()
  }

  const handleDelete = async (id: number): Promise<void> => {
    await deleteLog(id)
    setDeletingId(null)
    toast.success(t('worklog.deleted'))
  }

  const handleUndo = async (): Promise<void> => {
    await undoDelete()
    toast.success(t('worklog.restored'))
  }

  const grouped = groupLogsByDate(logs)

  return (
    <div>
      {/* Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('worklog.inputPlaceholder')}
            aria-label={t('worklog.inputAria')}
            className={`w-full px-4 py-3 text-base border rounded-lg outline-none transition-all bg-white dark:bg-zinc-900 dark:text-zinc-100 ${
              shaking
                ? 'animate-shake border-red-400 ring-2 ring-red-200'
                : 'border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700'
            }`}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>

      {/* Search + Export */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('worklog.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-100"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all btn-bounce">
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={async () => {
                const path = await window.api.export.logs('csv')
                if (path) toast.success(t('worklog.exportedCsv'))
              }}
              className="block w-full px-4 py-2 text-sm text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-t-lg whitespace-nowrap"
            >
              {t('worklog.exportCsv')}
            </button>
            <button
              onClick={async () => {
                const path = await window.api.export.logs('markdown')
                if (path) toast.success(t('worklog.exportedMarkdown'))
              }}
              className="block w-full px-4 py-2 text-sm text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-b-lg whitespace-nowrap"
            >
              {t('worklog.exportMarkdown')}
            </button>
          </div>
        </div>
      </div>

      {/* Search info */}
      {searchKeyword && (
        <div className="mb-3 text-sm text-zinc-500">
          {t('worklog.searchInfo', { keyword: searchKeyword, count: logs.length })}
          <button onClick={handleClearSearch} className="ml-2 text-blue-500 hover:underline">
            {t('common.clear')}
          </button>
        </div>
      )}

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <ClipboardEdit className="w-12 h-12 mx-auto text-zinc-300 mb-4 animate-float" />
          {searchKeyword ? (
            <>
              <p className="text-zinc-500 text-lg mb-1">{t('worklog.noResults')}</p>
              <p className="text-zinc-400 text-sm">{t('worklog.tryOtherKeywords')}</p>
            </>
          ) : (
            <>
              <p className="text-zinc-500 text-lg mb-1">{t('worklog.emptyTitle')}</p>
              <p className="text-zinc-400 text-sm">{t('worklog.emptySubtitle')}</p>
            </>
          )}
        </div>
      ) : (
        <>
        <div role="list" className="space-y-6">
          {Array.from(grouped.entries()).map(([dateKey, dateLogs]) => (
            <div key={dateKey} role="group">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">
                {formatDate(dateKey + 'T00:00:00', resolvedLanguage)}
              </h3>
              <div className="space-y-1 stagger-children">
                {dateLogs.map((log) => (
                  <div
                    key={log.id}
                    className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex-1 mr-4 flex items-center gap-2">
                      <span className="text-zinc-800 dark:text-zinc-200">{log.content}</span>
                      {log.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {log.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">{formatTime(log.created_at)}</span>
                      {deletingId === log.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-1"
                          >
                            {t('common.confirm')}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-zinc-400 hover:text-zinc-600 px-1"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(log.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                          aria-label={t('worklog.deleteAria')}
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
        {hasMore && !searchKeyword && (
          <div className="text-center py-4">
            <button
              onClick={loadMore}
              disabled={loading}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('worklog.loadMore')}
            </button>
          </div>
        )}
        </>
      )}

      {/* Undo bar */}
      {lastDeleted && (
        <div className="fixed bottom-4 left-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg shadow-lg text-sm animate-undo-slide-up">
          <span>{t('worklog.deletedOne')}</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 font-medium text-blue-300 dark:text-blue-600 hover:text-blue-200 dark:hover:text-blue-500"
          >
            <Undo2 className="w-3.5 h-3.5" />
            {t('worklog.undo')}
          </button>
        </div>
      )}
    </div>
  )
}

export default WorkLogPage
