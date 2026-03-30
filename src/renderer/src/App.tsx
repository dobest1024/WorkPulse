import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, FileText, ClipboardList, Columns3, BarChart3 } from 'lucide-react'
import WorkLogPage from './pages/WorkLogPage'
import ReportPage from './pages/ReportPage'
import KanbanPage from './pages/KanbanPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import { QuickCreate } from './components/QuickCreate'
import { useThemeStore } from './stores/themeStore'

type Page = 'worklog' | 'kanban' | 'report' | 'stats' | 'settings'
type QuickCreateMode = 'log' | 'task' | null

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('worklog')
  const [quickCreate, setQuickCreate] = useState<QuickCreateMode>(null)
  const initTheme = useThemeStore((s) => s.init)

  useEffect(() => {
    initTheme()
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if quick-create is open (it handles its own keys)
      if (quickCreate) return

      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === '1') {
        e.preventDefault(); setCurrentPage('worklog')
      } else if (isMod && e.key === '2') {
        e.preventDefault(); setCurrentPage('kanban')
      } else if (isMod && e.key === '3') {
        e.preventDefault(); setCurrentPage('report')
      } else if (isMod && e.key === '4') {
        e.preventDefault(); setCurrentPage('stats')
      } else if (isMod && e.key === ',') {
        e.preventDefault(); setCurrentPage('settings')
      } else if (e.key === 'Escape' && currentPage === 'settings') {
        setCurrentPage('worklog')
      }
    },
    [currentPage, quickCreate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Listen for IPC events from main process (menu bar / global shortcuts)
  useEffect(() => {
    const unsubCreate = window.api.on.quickCreate((type) => {
      setQuickCreate(type)
    })
    const unsubNav = window.api.on.navigate((page) => {
      setCurrentPage(page)
    })
    return () => {
      unsubCreate()
      unsubNav()
    }
  }, [])

  // Track page changes for transition direction
  const prevPageRef = useRef<Page>(currentPage)
  const [pageKey, setPageKey] = useState(0)

  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      prevPageRef.current = currentPage
      setPageKey((k) => k + 1)
    }
  }, [currentPage])

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('worklog')} />
  }

  const navBtn = (page: Page, icon: JSX.Element, label: string): JSX.Element => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
        currentPage === page
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 tab-active'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-[1.02]'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mr-4">WorkPulse</h1>
          <nav className="flex gap-1">
            {navBtn('worklog', <ClipboardList className="inline-block w-4 h-4 mr-1 -mt-0.5" />, '日志')}
            {navBtn('kanban', <Columns3 className="inline-block w-4 h-4 mr-1 -mt-0.5" />, '看板')}
            {navBtn('report', <FileText className="inline-block w-4 h-4 mr-1 -mt-0.5" />, '报告')}
            {navBtn('stats', <BarChart3 className="inline-block w-4 h-4 mr-1 -mt-0.5" />, '统计')}
          </nav>
        </div>
        <button
          onClick={() => setCurrentPage('settings')}
          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors settings-spin"
          aria-label="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Content with page transition */}
      <main className="flex-1 overflow-auto">
        <div key={pageKey} className={`px-4 py-6 page-enter ${currentPage === 'kanban' ? '' : 'max-w-3xl mx-auto'}`}>
          {currentPage === 'worklog' && <WorkLogPage />}
          {currentPage === 'kanban' && <KanbanPage />}
          {currentPage === 'report' && <ReportPage />}
          {currentPage === 'stats' && <StatsPage />}
        </div>
      </main>

      {/* Quick Create overlay */}
      {quickCreate && (
        <QuickCreate
          initialMode={quickCreate}
          onClose={() => setQuickCreate(null)}
        />
      )}
    </div>
  )
}

export default App
