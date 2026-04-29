import { useState, useEffect } from 'react'
import {
  Copy,
  RefreshCw,
  AlertCircle,
  FileText,
  Check,
  Pencil,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Save
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getDateRange, type DatePreset } from '../lib/dateUtils'
import { useToast } from '../components/Toast'

interface Report {
  id: number
  type: string
  date_from: string
  date_to: string
  content: string
  generated_at: string
}

type Status = 'idle' | 'no_key' | 'generating' | 'success' | 'error' | 'no_data'

function ReportPage(): JSX.Element {
  const [preset, setPreset] = useState<DatePreset>('this_week')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [reportContent, setReportContent] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState<Report[]>([])
  const [viewingReport, setViewingReport] = useState<Report | null>(null)
  const [activeReport, setActiveReport] = useState<Report | null>(null)
  const [historyOpen, setHistoryOpen] = useState(true)
  const toast = useToast()

  useEffect(() => {
    checkApiKey()
    applyPreset('this_week')
    loadHistory()
  }, [])

  const checkApiKey = async (): Promise<void> => {
    const key = await window.api.settings.get('api_key')
    if (!key) {
      setStatus('no_key')
    }
  }

  const loadHistory = async (): Promise<void> => {
    const reports = await window.api.report.list(50)
    setHistory(reports)
  }

  const applyPreset = (p: DatePreset): void => {
    setPreset(p)
    const range = getDateRange(p)
    setDateFrom(range.from)
    setDateTo(range.to)
  }

  const handleGenerate = async (): Promise<void> => {
    if (!dateFrom || !dateTo) return

    setStatus('generating')
    setReportContent('')
    setErrorMsg('')
    setViewingReport(null)
    setActiveReport(null)

    try {
      const report = await window.api.report.generate(dateFrom, dateTo)
      setReportContent(report.content)
      setActiveReport(report)
      setStatus('success')
      await loadHistory()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败'
      if (msg.includes('没有工作记录')) {
        setStatus('no_data')
      } else {
        setErrorMsg(msg)
        setStatus('error')
      }
    }
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(reportContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('已复制到剪贴板')
    } catch {
      toast.error('复制失败')
    }
  }

  const handleViewReport = (report: Report): void => {
    setViewingReport(report)
    setActiveReport(report)
    setReportContent(report.content)
    setStatus('success')
    setEditing(false)
  }

  const handleBackToNew = (): void => {
    setViewingReport(null)
    setActiveReport(null)
    setReportContent('')
    setStatus('idle')
    setEditing(false)
  }

  const handleSaveReport = async (): Promise<void> => {
    if (!activeReport) return

    try {
      const updated = await window.api.report.update(activeReport.id, reportContent)
      if (!updated) {
        toast.error('保存失败')
        return
      }

      setActiveReport(updated)
      if (viewingReport?.id === updated.id) {
        setViewingReport(updated)
      }
      setReportContent(updated.content)
      await loadHistory()
      toast.success('报告已保存')
    } catch {
      toast.error('保存失败')
    }
  }

  const formatReportDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'this_week', label: '本周' },
    { value: 'last_week', label: '上周' },
    { value: 'this_month', label: '本月' },
    { value: 'last_month', label: '上月' },
    { value: 'this_quarter', label: '本季度' }
  ]

  const isViewingHistory = viewingReport !== null

  return (
    <div>
      {/* Viewing history report header */}
      {isViewingHistory && (
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleBackToNew}
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            &larr; 返回生成
          </button>
          <span className="text-sm text-zinc-400">|</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {viewingReport.date_from} 至 {viewingReport.date_to}
          </span>
          <span className="text-xs text-zinc-400">
            生成于 {formatReportDate(viewingReport.generated_at)}
          </span>
        </div>
      )}

      {/* Date Range — only show when not viewing history */}
      {!isViewingHistory && (
        <>
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    preset === p.value
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 bg-white dark:bg-zinc-800 dark:text-zinc-100"
              />
              <span>至</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 bg-white dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={status === 'no_key' || status === 'generating'}
            className="mb-6 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'generating' ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                AI 正在整理你的工作记录...
              </span>
            ) : (
              '生成报告'
            )}
          </button>
        </>
      )}

      {/* Status Messages */}
      {status === 'no_key' && !isViewingHistory && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800">请先在设置中配置 API Key</p>
            <p className="text-xs text-amber-600 mt-1">
              点击右上角的齿轮图标进入设置页面
            </p>
          </div>
        </div>
      )}

      {status === 'no_data' && !isViewingHistory && (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 mb-1">所选时间段内没有工作记录</p>
          <p className="text-zinc-400 text-sm">先去日志页记录一些工作内容吧</p>
        </div>
      )}

      {status === 'error' && !isViewingHistory && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800">{errorMsg}</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleGenerate}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                重试
              </button>
              <button
                onClick={() => setStatus('idle')}
                className="text-xs text-zinc-500 hover:text-zinc-700 underline"
              >
                检查设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview / Edit */}
      {status === 'success' && reportContent && (
        <div>
          {/* Toggle bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
              <button
                onClick={() => setEditing(false)}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                  !editing ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                预览
              </button>
              <button
                onClick={() => setEditing(true)}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                  editing ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </button>
            </div>
          </div>

          {/* Content area */}
          {editing ? (
            <textarea
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              className="w-full min-h-[300px] px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 dark:text-zinc-100 text-sm font-mono leading-relaxed outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 resize-y mb-4"
            />
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 bg-white dark:bg-zinc-900 mb-4">
              <div className="prose prose-zinc dark:prose-invert prose-sm max-w-none" role="article">
                <ReactMarkdown>{reportContent}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm rounded-md hover:bg-zinc-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制到剪贴板
                </>
              )}
            </button>
            <button
              onClick={async () => {
                const range = viewingReport
                  ? `${viewingReport.date_from}-${viewingReport.date_to}`
                  : `${dateFrom}-${dateTo}`
                const path = await window.api.export.report(reportContent, range)
                if (path) toast.success('报告已导出')
              }}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            {editing && activeReport && (
              <button
                onClick={handleSaveReport}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存修改
              </button>
            )}
            {!isViewingHistory && (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新生成
              </button>
            )}
          </div>
        </div>
      )}

      {/* Idle state — show when no active report and not viewing history */}
      {status === 'idle' && !isViewingHistory && history.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500">选择日期范围，一键生成工作报告</p>
        </div>
      )}

      {/* Report History */}
      {!isViewingHistory && history.length > 0 && (
        <div className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-4 hover:text-zinc-900"
          >
            <Clock className="w-4 h-4 text-zinc-400" />
            历史报告
            <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
              {history.length}
            </span>
            {historyOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {historyOpen && (
            <div className="space-y-2">
              {history.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleViewReport(report)}
                  className="w-full text-left flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {report.date_from} 至 {report.date_to}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 ml-6 truncate">
                      {report.content.slice(0, 80).replace(/[#*\n]/g, ' ').trim()}...
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0 ml-4">
                    {formatReportDate(report.generated_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportPage
