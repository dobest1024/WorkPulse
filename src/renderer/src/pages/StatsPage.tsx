import { useEffect, useState, useRef } from 'react'
import { Flame, FileText, CheckCircle2, ListTodo } from 'lucide-react'

interface DailyStats {
  date: string
  log_count: number
  task_completed: number
}

interface Stats {
  daily: DailyStats[]
  totalLogs: number
  totalTasksDone: number
  totalTasksActive: number
  streak: number
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Count-up hook
function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const frameRef = useRef<number>()

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    startTime.current = null

    const animate = (time: number): void => {
      if (!startTime.current) startTime.current = time
      const progress = Math.min((time - startTime.current) / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration])

  return value
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  delay = 0
}: {
  icon: typeof Flame
  label: string
  value: number
  suffix?: string
  color: string
  delay?: number
}): JSX.Element {
  const displayValue = useCountUp(value)

  return (
    <div
      className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl card-hover animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {displayValue}{suffix}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  )
}

function BarChart({ data }: { data: DailyStats[] }): JSX.Element {
  const maxVal = Math.max(...data.map((d) => d.log_count + d.task_completed), 1)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Trigger bar grow after mount
    const timer = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div ref={ref} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">每日活动</h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const logH = (d.log_count / maxVal) * 100
          const taskH = (d.task_completed / maxVal) * 100
          const day = new Date(d.date + 'T00:00:00')
          const label = `${day.getMonth() + 1}/${day.getDate()}`
          const isToday = d.date === formatLocalDate(new Date())

          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-0.5 min-w-0"
              title={`${d.date}: ${d.log_count}条日志, ${d.task_completed}个任务完成`}
            >
              <div className="w-full flex flex-col justify-end h-24">
                {d.task_completed > 0 && (
                  <div
                    className={`w-full bg-green-400 dark:bg-green-500 rounded-t-sm transition-all duration-500 ${visible ? '' : 'scale-y-0'}`}
                    style={{
                      height: `${taskH}%`,
                      minHeight: d.task_completed > 0 ? 3 : 0,
                      transformOrigin: 'bottom',
                      transitionDelay: `${i * 40}ms`
                    }}
                  />
                )}
                {d.log_count > 0 && (
                  <div
                    className={`w-full bg-blue-400 dark:bg-blue-500 rounded-t-sm transition-all duration-500 ${visible ? '' : 'scale-y-0'}`}
                    style={{
                      height: `${logH}%`,
                      minHeight: d.log_count > 0 ? 3 : 0,
                      transformOrigin: 'bottom',
                      transitionDelay: `${i * 40}ms`
                    }}
                  />
                )}
                {d.log_count === 0 && d.task_completed === 0 && (
                  <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-t-sm" style={{ height: '3%' }} />
                )}
              </div>
              <span
                className={`text-[9px] leading-none ${
                  isToday ? 'text-blue-500 font-bold' : 'text-zinc-400'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> 日志
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-400" /> 完成任务
        </span>
      </div>
    </div>
  )
}

function HeatMap({ data }: { data: DailyStats[] }): JSX.Element {
  // Build last 12 weeks of data
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dataMap = new Map(data.map((d) => [d.date, d.log_count + d.task_completed]))

  const weeks: { date: Date; count: number }[][] = []
  const startDay = new Date(today)
  startDay.setDate(startDay.getDate() - 83) // ~12 weeks
  // Align to Sunday
  startDay.setDate(startDay.getDate() - startDay.getDay())

  let currentWeek: { date: Date; count: number }[] = []
  for (let d = new Date(startDay); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = formatLocalDate(d)
    currentWeek.push({ date: new Date(d), count: dataMap.get(dateStr) || 0 })
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length) weeks.push(currentWeek)

  const getColor = (count: number): string => {
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800'
    if (count <= 2) return 'bg-green-200 dark:bg-green-900'
    if (count <= 5) return 'bg-green-400 dark:bg-green-700'
    return 'bg-green-600 dark:bg-green-500'
  }

  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">活跃度</h3>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={formatLocalDate(day.date)}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all duration-300 hover:scale-150 hover:z-10`}
                title={`${formatLocalDate(day.date)}: ${day.count}条`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400">
        <span>少</span>
        <span className="w-3 h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
        <span className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <span className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <span className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
        <span>多</span>
      </div>
    </div>
  )
}

function StatsPage(): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    window.api.stats.get(90).then(setStats)
  }, [])

  if (!stats) {
    return (
      <div className="text-center py-16 text-zinc-400">
        <div className="w-6 h-6 mx-auto mb-2 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
        加载中...
      </div>
    )
  }

  // Last 14 days for bar chart
  const last14 = stats.daily.filter((d) => {
    const diff = (Date.now() - new Date(d.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 14
  })

  // Fill missing days
  const filled: DailyStats[] = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = formatLocalDate(d)
    const existing = last14.find((s) => s.date === dateStr)
    filled.push(existing || { date: dateStr, log_count: 0, task_completed: 0 })
  }

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Flame}
          label="连续记录"
          value={stats.streak}
          suffix="天"
          color={`bg-orange-100 dark:bg-orange-900/30 text-orange-600 ${stats.streak >= 7 ? 'streak-glow' : ''}`}
          delay={0}
        />
        <StatCard
          icon={FileText}
          label="总日志数"
          value={stats.totalLogs}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          delay={60}
        />
        <StatCard
          icon={CheckCircle2}
          label="已完成任务"
          value={stats.totalTasksDone}
          color="bg-green-100 dark:bg-green-900/30 text-green-600"
          delay={120}
        />
        <StatCard
          icon={ListTodo}
          label="进行中任务"
          value={stats.totalTasksActive}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600"
          delay={180}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        <BarChart data={filled} />
        <HeatMap data={stats.daily} />
      </div>
    </div>
  )
}

export default StatsPage
