import { getSetting } from './db'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
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

export async function generateReport(
  logs: { content: string; created_at: string }[],
  dateFrom: string,
  dateTo: string
): Promise<string> {
  const apiKey = getSetting('api_key')
  if (!apiKey) {
    throw new Error('API Key 未配置')
  }

  const provider = getSetting('ai_provider') || 'openai'
  const baseUrl = getSetting('ai_base_url') || ''
  const model = getSetting('ai_model') || ''
  const language = getSetting('report_language') || '中文'
  const style = getSetting('report_style') || '简洁专业'
  const customPrompt = getSetting('system_prompt') || DEFAULT_SYSTEM_PROMPT
  const reportTemplate = getSetting('report_template') || DEFAULT_REPORT_TEMPLATE

  const vars: Record<string, string> = { language, style, dateFrom, dateTo }
  const systemPrompt = replaceVars(customPrompt, vars)
  const templateHint = replaceVars(reportTemplate, vars)

  const logsText = logs
    .map((log) => `[${log.created_at}] ${log.content}`)
    .join('\n')

  const userMessage = `以下是我的工作日志，请生成工作总结报告：\n\n${logsText}\n\n请参考以下格式模板输出：\n${templateHint}`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]

  if (provider === 'anthropic') {
    return callAnthropic(apiKey, baseUrl, model, messages)
  }
  return callOpenAI(apiKey, baseUrl, model, messages)
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '')
}

async function callOpenAI(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: Message[]
): Promise<string> {
  const url = baseUrl
    ? `${baseUrl.replace(/\/+$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API 错误: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || '生成失败：无内容返回'
}

async function callAnthropic(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: Message[]
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const userMsg = messages.find((m) => m.role === 'user')

  const url = baseUrl
    ? `${baseUrl.replace(/\/+$/, '')}/v1/messages`
    : 'https://api.anthropic.com/v1/messages'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemMsg?.content || '',
      messages: [{ role: 'user', content: userMsg?.content || '' }]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API 错误: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0]?.text || '生成失败：无内容返回'
}

export { DEFAULT_SYSTEM_PROMPT, DEFAULT_REPORT_TEMPLATE }
