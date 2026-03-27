import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Trash2, RotateCcw, Keyboard } from 'lucide-react'
import { useToast } from '../components/Toast'

// Convert a KeyboardEvent to an Electron-style accelerator string
function eventToAccelerator(e: KeyboardEvent): string | null {
  // Ignore modifier-only keydowns
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return null
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('CmdOrCtrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  // Map special keys
  const keyMap: Record<string, string> = {
    ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Backspace: 'Backspace', Delete: 'Delete', Escape: 'Escape', Enter: 'Return',
    Tab: 'Tab', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown'
  }
  const key = keyMap[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)
  // Need at least a modifier + key for a global shortcut
  if (parts.length < 2) return null
  return parts.join('+')
}

function ShortcutCapture({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}): JSX.Element {
  const [capturing, setCapturing] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') { setCapturing(false); return }
    const acc = eventToAccelerator(e.nativeEvent)
    if (acc) {
      onChange(acc)
      setCapturing(false)
    }
  }

  return (
    <button
      ref={ref}
      onFocus={() => setCapturing(true)}
      onBlur={() => setCapturing(false)}
      onKeyDown={capturing ? handleKeyDown : undefined}
      className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-mono transition-all outline-none
        ${capturing
          ? 'border-zinc-500 ring-2 ring-zinc-200 bg-zinc-50 text-zinc-500'
          : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 cursor-pointer'
        }`}
    >
      <Keyboard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      {capturing ? '按下快捷键...' : value}
    </button>
  )
}

interface Props {
  onBack: () => void
}

const DEFAULT_SYSTEM_PROMPT = `你是一个专业的工作报告助手。请根据用户提供的工作日志，生成一份结构化的工作总结报告。

要求：
- 语言：{{language}}
- 风格：{{style}}
- 时间范围：{{dateFrom}} 至 {{dateTo}}
- 输出格式：Markdown
- 按主题/项目分类归纳
- 突出关键成果和产出
- 简洁有力，避免流水账`

const DEFAULT_REPORT_TEMPLATE = `## 工作总结 ({{dateFrom}} - {{dateTo}})

### 主要产出
（按项目/主题分类列出关键成果）

### 进行中的工作
（尚未完成但有进展的事项）

### 下周计划
（基于当前工作的合理推断）`

function SettingsPage({ onBack }: Props): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [editing, setEditing] = useState(false)
  const [provider, setProvider] = useState('openai')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [language, setLanguage] = useState('中文')
  const [style, setStyle] = useState('简洁专业')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [reportTemplate, setReportTemplate] = useState(DEFAULT_REPORT_TEMPLATE)
  const [shortcutLog, setShortcutLog] = useState('CmdOrCtrl+Shift+L')
  const [shortcutTask, setShortcutTask] = useState('CmdOrCtrl+Shift+T')
  const toast = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    const key = await window.api.settings.get('api_key')
    if (key) {
      setApiKey(key)
      setHasKey(true)
    }
    const p = await window.api.settings.get('ai_provider')
    if (p) setProvider(p)
    const b = await window.api.settings.get('ai_base_url')
    if (b) setBaseUrl(b)
    const m = await window.api.settings.get('ai_model')
    if (m) setModel(m)
    const l = await window.api.settings.get('report_language')
    if (l) setLanguage(l)
    const s = await window.api.settings.get('report_style')
    if (s) setStyle(s)
    const sp = await window.api.settings.get('system_prompt')
    if (sp) setSystemPrompt(sp)
    const rt = await window.api.settings.get('report_template')
    if (rt) setReportTemplate(rt)
    const sl = await window.api.settings.get('shortcut_quick_log')
    if (sl) setShortcutLog(sl)
    const st = await window.api.settings.get('shortcut_quick_task')
    if (st) setShortcutTask(st)
  }

  const handleShortcutChange = async (
    key: 'shortcut_quick_log' | 'shortcut_quick_task',
    value: string,
    setter: (v: string) => void
  ): Promise<void> => {
    setter(value)
    await window.api.settings.set(key, value)
    await window.api.shortcut.update(key, value)
    toast.success('快捷键已更新')
  }

  const maskKey = (key: string): string => {
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }

  const handleSaveKey = async (): Promise<void> => {
    if (!apiKey.trim()) return
    await window.api.settings.set('api_key', apiKey.trim())
    setHasKey(true)
    setEditing(false)
    toast.success('API Key 已安全保存')
  }

  const handleDeleteKey = async (): Promise<void> => {
    await window.api.settings.delete('api_key')
    setApiKey('')
    setHasKey(false)
    setEditing(false)
    toast.success('API Key 已删除')
  }

  const saveSetting = async (key: string, value: string): Promise<void> => {
    if (value.trim()) {
      await window.api.settings.set(key, value.trim())
    } else {
      await window.api.settings.delete(key)
    }
  }

  const handleProviderChange = async (value: string): Promise<void> => {
    setProvider(value)
    await window.api.settings.set('ai_provider', value)
  }

  const handleBaseUrlBlur = async (): Promise<void> => {
    await saveSetting('ai_base_url', baseUrl)
  }

  const handleModelBlur = async (): Promise<void> => {
    await saveSetting('ai_model', model)
  }

  const handleLanguageChange = async (value: string): Promise<void> => {
    setLanguage(value)
    await window.api.settings.set('report_language', value)
  }

  const handleStyleChange = async (value: string): Promise<void> => {
    setStyle(value)
    await window.api.settings.set('report_style', value)
  }

  const handleSystemPromptBlur = async (): Promise<void> => {
    if (systemPrompt.trim() === DEFAULT_SYSTEM_PROMPT.trim()) {
      await window.api.settings.delete('system_prompt')
    } else {
      await window.api.settings.set('system_prompt', systemPrompt)
    }
  }

  const handleReportTemplateBlur = async (): Promise<void> => {
    if (reportTemplate.trim() === DEFAULT_REPORT_TEMPLATE.trim()) {
      await window.api.settings.delete('report_template')
    } else {
      await window.api.settings.set('report_template', reportTemplate)
    }
  }

  const resetSystemPrompt = async (): Promise<void> => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
    await window.api.settings.delete('system_prompt')
    toast.success('系统提示词已恢复默认')
  }

  const resetReportTemplate = async (): Promise<void> => {
    setReportTemplate(DEFAULT_REPORT_TEMPLATE)
    await window.api.settings.delete('report_template')
    toast.success('报告模板已恢复默认')
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-zinc-200 bg-white">
        <button
          onClick={onBack}
          className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors mr-2"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-zinc-900">设置</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {/* AI Configuration */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">AI 配置</h2>
            <div className="h-px bg-zinc-200 mb-4" />

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">API Key</label>
              <p className="text-xs text-zinc-400 mb-2">用于生成工作报告的 AI 服务密钥</p>
              {hasKey && !editing ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-zinc-100 rounded-md text-sm text-zinc-600 font-mono">
                    {showKey ? apiKey : maskKey(apiKey)}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showKey ? '隐藏' : '显示'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1.5 text-sm text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50"
                  >
                    修改
                  </button>
                  <button
                    onClick={handleDeleteKey}
                    className="p-2 text-zinc-400 hover:text-red-500"
                    aria-label="删除 API Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="粘贴你的 API Key"
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                  <button
                    onClick={handleSaveKey}
                    className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                  >
                    保存
                  </button>
                  {editing && (
                    <button
                      onClick={() => {
                        setEditing(false)
                        loadSettings()
                      }}
                      className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700"
                    >
                      取消
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* AI Provider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">AI 服务</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            {/* Base URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">API Base URL</label>
              <p className="text-xs text-zinc-400 mb-2">
                自定义 API 地址，留空使用官方默认地址。支持中转服务、本地模型等
              </p>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                onBlur={handleBaseUrlBlur}
                placeholder={provider === 'openai' ? 'https://api.openai.com' : 'https://api.anthropic.com'}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 font-mono"
              />
            </div>
            {/* Model */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">模型名称</label>
              <p className="text-xs text-zinc-400 mb-2">
                留空使用默认模型。如 qwen-plus、gpt-4o、claude-sonnet-4-20250514 等
              </p>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={handleModelBlur}
                placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 font-mono"
              />
            </div>
          </section>

          {/* Report Preferences */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">报告偏好</h2>
            <div className="h-px bg-zinc-200 mb-4" />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">报告语言</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                >
                  <option value="中文">中文</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">报告风格</label>
                <select
                  value={style}
                  onChange={(e) => handleStyleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                >
                  <option value="简洁专业">简洁专业</option>
                  <option value="详细全面">详细全面</option>
                  <option value="轻松随意">轻松随意</option>
                </select>
              </div>
            </div>

            {/* System Prompt */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-700">系统提示词</label>
                <button
                  onClick={resetSystemPrompt}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                  title="恢复默认"
                >
                  <RotateCcw className="w-3 h-3" />
                  恢复默认
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                控制 AI 生成报告的行为。支持变量：{'{{language}} {{style}} {{dateFrom}} {{dateTo}}'}
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onBlur={handleSystemPromptBlur}
                rows={8}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 font-mono leading-relaxed resize-y"
              />
            </div>

            {/* Report Template */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-700">报告输出模板</label>
                <button
                  onClick={resetReportTemplate}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                  title="恢复默认"
                >
                  <RotateCcw className="w-3 h-3" />
                  恢复默认
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                定义报告的输出格式，AI 会参考此模板生成内容。支持 Markdown 和变量
              </p>
              <textarea
                value={reportTemplate}
                onChange={(e) => setReportTemplate(e.target.value)}
                onBlur={handleReportTemplateBlur}
                rows={10}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 font-mono leading-relaxed resize-y"
              />
            </div>
          </section>

          {/* Shortcuts */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">全局快捷键</h2>
            <div className="h-px bg-zinc-200 mb-4" />
            <p className="text-xs text-zinc-400 mb-4">
              点击快捷键框后按下新的组合键即可修改。快捷键在应用切换到后台后仍然有效。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">快速记录日志</label>
                <ShortcutCapture
                  value={shortcutLog}
                  onChange={(v) => handleShortcutChange('shortcut_quick_log', v, setShortcutLog)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">快速添加任务</label>
                <ShortcutCapture
                  value={shortcutTask}
                  onChange={(v) => handleShortcutChange('shortcut_quick_task', v, setShortcutTask)}
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-zinc-50 rounded-lg">
              <p className="text-xs font-medium text-zinc-600 mb-2">其他快捷键（不可修改）</p>
              <div className="space-y-1">
                {[
                  ['Cmd+1 / 2 / 3', '切换日志 / 看板 / 报告'],
                  ['Cmd+,', '打开设置'],
                  ['Tab', '快速创建浮层中切换模式'],
                  ['Esc', '关闭浮层 / 返回']
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between">
                    <code className="text-xs bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-600">
                      {key}
                    </code>
                    <span className="text-xs text-zinc-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">关于</h2>
            <div className="h-px bg-zinc-200 mb-4" />
            <p className="text-sm text-zinc-500">WorkPulse v0.1.0</p>
            <p className="text-xs text-zinc-400 mt-1">工作日志 + AI 报告生成桌面应用</p>
          </section>
        </div>
      </main>

    </div>
  )
}

export default SettingsPage
