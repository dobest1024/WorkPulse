import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Trash2, RotateCcw, Keyboard, Sun, Moon, Monitor } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useThemeStore } from '../stores/themeStore'
import { useI18n, useLanguageStore } from '../stores/languageStore'
import type { AppLanguage, ResolvedLanguage } from '../lib/i18n'

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
  onChange,
  capturingLabel
}: {
  value: string
  onChange: (v: string) => void
  capturingLabel: string
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
          ? 'border-zinc-500 ring-2 ring-zinc-200 dark:ring-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 cursor-pointer'
        }`}
    >
      <Keyboard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      {capturing ? capturingLabel : value}
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

const DEFAULT_SYSTEM_PROMPT_EN = `You are a professional work report assistant. Generate a structured work summary from the user's work logs.

Requirements:
- Language: {{language}}
- Style: {{style}}
- Date range: {{dateFrom}} to {{dateTo}}
- Output format: Markdown
- Group work by topic/project
- Highlight key outcomes and deliverables
- Keep it concise and useful; avoid a raw chronological dump`

const DEFAULT_REPORT_TEMPLATE_EN = `## Work Summary ({{dateFrom}} - {{dateTo}})

### Key Outcomes
(Group important outcomes by project/topic)

### Work in Progress
(Items that are not finished but have meaningful progress)

### Next Plan
(Reasonable next steps based on current work)`

function getDefaultSystemPrompt(language: ResolvedLanguage): string {
  return language === 'zh' ? DEFAULT_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT_EN
}

function getDefaultReportTemplate(language: ResolvedLanguage): string {
  return language === 'zh' ? DEFAULT_REPORT_TEMPLATE : DEFAULT_REPORT_TEMPLATE_EN
}

function SettingsPage({ onBack }: Props): JSX.Element {
  const isMac = navigator.userAgent.includes('Mac')
  const modifierLabel = isMac ? 'Cmd' : 'Ctrl'
  const { language: appLanguage, resolvedLanguage, t } = useI18n()
  const setAppLanguage = useLanguageStore((s) => s.setLanguage)
  const previousLanguageRef = useRef<ResolvedLanguage>(resolvedLanguage)
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [editing, setEditing] = useState(false)
  const [provider, setProvider] = useState('openai')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [reportLanguage, setReportLanguage] = useState(resolvedLanguage === 'zh' ? '中文' : 'English')
  const [style, setStyle] = useState(t('settings.styleConcise'))
  const [systemPrompt, setSystemPrompt] = useState(getDefaultSystemPrompt(resolvedLanguage))
  const [reportTemplate, setReportTemplate] = useState(getDefaultReportTemplate(resolvedLanguage))
  const [shortcutLog, setShortcutLog] = useState('CmdOrCtrl+Shift+L')
  const [shortcutTask, setShortcutTask] = useState('CmdOrCtrl+Shift+T')
  const toast = useToast()
  const { theme, setTheme } = useThemeStore()
  const styleOptions = [
    t('settings.styleConcise'),
    t('settings.styleDetailed'),
    t('settings.styleCasual')
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const previousLanguage = previousLanguageRef.current
    if (previousLanguage === resolvedLanguage) return

    setReportLanguage((current) => {
      const previousDefault = previousLanguage === 'zh' ? '中文' : 'English'
      return current === previousDefault ? (resolvedLanguage === 'zh' ? '中文' : 'English') : current
    })
    setStyle((current) => {
      const previousDefault = previousLanguage === 'zh' ? '简洁专业' : 'Concise professional'
      return current === previousDefault ? t('settings.styleConcise') : current
    })
    setSystemPrompt((current) => {
      const previousDefault = getDefaultSystemPrompt(previousLanguage)
      return current.trim() === previousDefault.trim() ? getDefaultSystemPrompt(resolvedLanguage) : current
    })
    setReportTemplate((current) => {
      const previousDefault = getDefaultReportTemplate(previousLanguage)
      return current.trim() === previousDefault.trim() ? getDefaultReportTemplate(resolvedLanguage) : current
    })

    previousLanguageRef.current = resolvedLanguage
  }, [resolvedLanguage, t])

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
    if (l) {
      setReportLanguage(l)
    } else {
      setReportLanguage(resolvedLanguage === 'zh' ? '中文' : 'English')
    }
    const s = await window.api.settings.get('report_style')
    if (s) {
      setStyle(s)
    } else {
      setStyle(t('settings.styleConcise'))
    }
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
    const updated = await window.api.shortcut.update(key, value)
    if (!updated) {
      toast.error(t('settings.shortcutTaken'))
      return
    }

    setter(value)
    toast.success(t('settings.shortcutSaved'))
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
    toast.success(t('settings.apiKeySaved'))
  }

  const handleDeleteKey = async (): Promise<void> => {
    await window.api.settings.delete('api_key')
    setApiKey('')
    setHasKey(false)
    setEditing(false)
    toast.success(t('settings.apiKeyDeleted'))
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
    setReportLanguage(value)
    await window.api.settings.set('report_language', value)
  }

  const handleStyleChange = async (value: string): Promise<void> => {
    setStyle(value)
    await window.api.settings.set('report_style', value)
  }

  const handleAppLanguageChange = async (value: AppLanguage): Promise<void> => {
    await setAppLanguage(value)
  }

  const handleSystemPromptBlur = async (): Promise<void> => {
    if (systemPrompt.trim() === getDefaultSystemPrompt(resolvedLanguage).trim()) {
      await window.api.settings.delete('system_prompt')
    } else {
      await window.api.settings.set('system_prompt', systemPrompt)
    }
  }

  const handleReportTemplateBlur = async (): Promise<void> => {
    if (reportTemplate.trim() === getDefaultReportTemplate(resolvedLanguage).trim()) {
      await window.api.settings.delete('report_template')
    } else {
      await window.api.settings.set('report_template', reportTemplate)
    }
  }

  const resetSystemPrompt = async (): Promise<void> => {
    setSystemPrompt(getDefaultSystemPrompt(resolvedLanguage))
    await window.api.settings.delete('system_prompt')
    toast.success(t('settings.systemPromptReset'))
  }

  const resetReportTemplate = async (): Promise<void> => {
    setReportTemplate(getDefaultReportTemplate(resolvedLanguage))
    await window.api.settings.delete('report_template')
    toast.success(t('settings.templateReset'))
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={onBack}
          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors mr-2"
          aria-label={t('settings.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('settings.title')}</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {/* AI Configuration */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.aiConfig')}</h2>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 mb-4" />

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">API Key</label>
              <p className="text-xs text-zinc-400 mb-2">{t('settings.apiKeyHelp')}</p>
              {hasKey && !editing ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                    {showKey ? apiKey : maskKey(apiKey)}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showKey ? t('settings.hide') : t('settings.show')}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1.5 text-sm text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50"
                  >
                    {t('settings.modify')}
                  </button>
                  <button
                    onClick={handleDeleteKey}
                    className="p-2 text-zinc-400 hover:text-red-500"
                    aria-label={t('settings.deleteApiKey')}
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
                    placeholder={t('settings.apiKeyPlaceholder')}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    onClick={handleSaveKey}
                    className="px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    {t('common.save')}
                  </button>
                  {editing && (
                    <button
                      onClick={() => {
                        setEditing(false)
                        loadSettings()
                      }}
                      className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700"
                    >
                      {t('common.cancel')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* AI Provider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.aiProvider')}</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            {/* Base URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.baseUrl')}</label>
              <p className="text-xs text-zinc-400 mb-2">
                {t('settings.baseUrlHelp')}
              </p>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                onBlur={handleBaseUrlBlur}
                placeholder={provider === 'openai' ? 'https://api.openai.com' : 'https://api.anthropic.com'}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 font-mono"
              />
            </div>
            {/* Model */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.modelName')}</label>
              <p className="text-xs text-zinc-400 mb-2">
                {t('settings.modelHelp')}
              </p>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={handleModelBlur}
                placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 font-mono"
              />
            </div>
          </section>

          {/* Report Preferences */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.reportPrefs')}</h2>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 mb-4" />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.reportLanguage')}</label>
                <select
                  value={reportLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="中文">中文</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.reportStyle')}</label>
                <select
                  value={style}
                  onChange={(e) => handleStyleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {!styleOptions.includes(style) && <option value={style}>{style}</option>}
                  {styleOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* System Prompt */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('settings.systemPrompt')}</label>
                <button
                  onClick={resetSystemPrompt}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                  title={t('settings.restoreDefault')}
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('settings.restoreDefault')}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                {t('settings.promptHelp')}
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onBlur={handleSystemPromptBlur}
                rows={8}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 font-mono leading-relaxed resize-y"
              />
            </div>

            {/* Report Template */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('settings.reportTemplate')}</label>
                <button
                  onClick={resetReportTemplate}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                  title={t('settings.restoreDefault')}
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('settings.restoreDefault')}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                {t('settings.templateHelp')}
              </p>
              <textarea
                value={reportTemplate}
                onChange={(e) => setReportTemplate(e.target.value)}
                onBlur={handleReportTemplateBlur}
                rows={10}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 font-mono leading-relaxed resize-y"
              />
            </div>
          </section>

          {/* Shortcuts */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.shortcuts')}</h2>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 mb-4" />
            <p className="text-xs text-zinc-400 mb-4">
              {t('settings.shortcutsHelp')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.shortcutLog')}</label>
                <ShortcutCapture
                  value={shortcutLog}
                  onChange={(v) => handleShortcutChange('shortcut_quick_log', v, setShortcutLog)}
                  capturingLabel={t('settings.capturingShortcut')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.shortcutTask')}</label>
                <ShortcutCapture
                  value={shortcutTask}
                  onChange={(v) => handleShortcutChange('shortcut_quick_task', v, setShortcutTask)}
                  capturingLabel={t('settings.capturingShortcut')}
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-2">{t('settings.otherShortcuts')}</p>
              <div className="space-y-1">
                {[
                  [`${modifierLabel}+1 / 2 / 3 / 4`, t('settings.navShortcuts')],
                  [`${modifierLabel}+,`, t('settings.openSettings')],
                  ['Tab', t('settings.quickModeShortcut')],
                  ['Esc', t('settings.closeShortcut')]
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between">
                    <code className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                      {key}
                    </code>
                    <span className="text-xs text-zinc-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.appearance')}</h2>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 mb-4" />
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('settings.language')}</label>
              <p className="text-xs text-zinc-400 mb-2">{t('settings.languageHelp')}</p>
              <select
                value={appLanguage}
                onChange={(e) => handleAppLanguageChange(e.target.value as AppLanguage)}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="system">{t('settings.languageSystem')}</option>
                <option value="zh">{t('settings.languageZh')}</option>
                <option value="en">{t('settings.languageEn')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              {([
                { value: 'light', label: t('settings.themeLight'), Icon: Sun },
                { value: 'dark', label: t('settings.themeDark'), Icon: Moon },
                { value: 'system', label: t('settings.themeSystem'), Icon: Monitor }
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors ${
                    theme === value
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{t('settings.about')}</h2>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 mb-4" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">WorkPulse v0.1.0</p>
            <p className="text-xs text-zinc-400 mt-1">{t('settings.aboutText')}</p>
          </section>
        </div>
      </main>

    </div>
  )
}

export default SettingsPage
