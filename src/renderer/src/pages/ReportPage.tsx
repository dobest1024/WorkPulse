import { useState, useEffect } from 'react'
import { Copy, RefreshCw, AlertCircle, FileText, Check, Pencil, Eye } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getDateRange, type DatePreset } from '../lib/dateUtils'

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

  useEffect(() => {
    checkApiKey()
    applyPreset('this_week')
  }, [])

  const checkApiKey = async (): Promise<void> => {
    const key = await window.api.settings.get('api_key')
    if (!key) {
      setStatus('no_key')
    }
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

    try {
      const report = await window.api.report.generate(dateFrom, dateTo)
      setReportContent(report.content)
      setStatus('success')
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
    await navigator.clipboard.writeText(reportContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'this_week', label: '本周' },
    { value: 'last_week', label: '上周' },
    { value: 'this_month', label: '本月' },
    { value: 'last_month', label: '上月' },
    { value: 'this_quarter', label: '本季度' }
  ]

  return (
    <div>
      {/* Date Range */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                preset === p.value
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
            className="px-2 py-1 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500"
          />
          <span>至</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={status === 'no_key' || status === 'generating'}
        className="mb-6 px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Status Messages */}
      {status === 'no_key' && (
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

      {status === 'no_data' && (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 mb-1">所选时间段内没有工作记录</p>
          <p className="text-zinc-400 text-sm">先去日志页记录一些工作内容吧</p>
        </div>
      )}

      {status === 'error' && (
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
            <div className="flex gap-1 bg-zinc-100 rounded-md p-0.5">
              <button
                onClick={() => setEditing(false)}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                  !editing ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                预览
              </button>
              <button
                onClick={() => setEditing(true)}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                  editing ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
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
              className="w-full min-h-[300px] px-4 py-3 border border-zinc-200 rounded-lg bg-white text-sm font-mono leading-relaxed outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 resize-y mb-4"
            />
          ) : (
            <div className="border border-zinc-200 rounded-lg p-6 bg-white mb-4">
              <div className="prose prose-zinc prose-sm max-w-none" role="article">
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
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-600 text-sm rounded-md hover:bg-zinc-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新生成
            </button>
          </div>
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500">选择日期范围，一键生成工作报告</p>
        </div>
      )}
    </div>
  )
}

export default ReportPage
