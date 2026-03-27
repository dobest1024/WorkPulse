import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  isToday,
  isYesterday,
  parseISO
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return '今天'
  if (isYesterday(date)) return '昨天'
  return format(date, 'M月d日 EEEE', { locale: zhCN })
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm')
}

export function formatDateShort(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export type DatePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter'

export function getDateRange(preset: DatePreset): { from: string; to: string; label: string } {
  const now = new Date()

  switch (preset) {
    case 'this_week': {
      const from = startOfWeek(now, { weekStartsOn: 1 })
      const to = endOfWeek(now, { weekStartsOn: 1 })
      return { from: formatDateShort(from), to: formatDateShort(to), label: '本周' }
    }
    case 'last_week': {
      const lastWeek = subWeeks(now, 1)
      const from = startOfWeek(lastWeek, { weekStartsOn: 1 })
      const to = endOfWeek(lastWeek, { weekStartsOn: 1 })
      return { from: formatDateShort(from), to: formatDateShort(to), label: '上周' }
    }
    case 'this_month': {
      const from = startOfMonth(now)
      const to = endOfMonth(now)
      return { from: formatDateShort(from), to: formatDateShort(to), label: '本月' }
    }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      const from = startOfMonth(lastMonth)
      const to = endOfMonth(lastMonth)
      return { from: formatDateShort(from), to: formatDateShort(to), label: '上月' }
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      const from = new Date(now.getFullYear(), quarter * 3, 1)
      const to = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      return { from: formatDateShort(from), to: formatDateShort(to), label: '本季度' }
    }
  }
}

export function groupLogsByDate(
  logs: { created_at: string }[]
): Map<string, typeof logs> {
  const groups = new Map<string, typeof logs>()
  for (const log of logs) {
    const dateKey = log.created_at.slice(0, 10)
    const group = groups.get(dateKey) || []
    group.push(log)
    groups.set(dateKey, group)
  }
  return groups
}
