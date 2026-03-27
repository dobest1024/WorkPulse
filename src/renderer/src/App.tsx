import { useState } from 'react'
import { Settings, FileText, ClipboardList, Columns3 } from 'lucide-react'
import WorkLogPage from './pages/WorkLogPage'
import ReportPage from './pages/ReportPage'
import KanbanPage from './pages/KanbanPage'
import SettingsPage from './pages/SettingsPage'

type Page = 'worklog' | 'kanban' | 'report' | 'settings'

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('worklog')

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('worklog')} />
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-zinc-900 mr-4">WorkPulse</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => setCurrentPage('worklog')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                currentPage === 'worklog'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <ClipboardList className="inline-block w-4 h-4 mr-1 -mt-0.5" />
              日志
            </button>
            <button
              onClick={() => setCurrentPage('kanban')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                currentPage === 'kanban'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Columns3 className="inline-block w-4 h-4 mr-1 -mt-0.5" />
              看板
            </button>
            <button
              onClick={() => setCurrentPage('report')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                currentPage === 'report'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <FileText className="inline-block w-4 h-4 mr-1 -mt-0.5" />
              报告
            </button>
          </nav>
        </div>
        <button
          onClick={() => setCurrentPage('settings')}
          className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
          aria-label="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className={`px-4 py-6 ${currentPage === 'kanban' ? '' : 'max-w-3xl mx-auto'}`}>
          {currentPage === 'worklog' && <WorkLogPage />}
          {currentPage === 'kanban' && <KanbanPage />}
          {currentPage === 'report' && <ReportPage />}
        </div>
      </main>
    </div>
  )
}

export default App
