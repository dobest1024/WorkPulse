import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync, mkdirSync } from 'fs'

let db: Database.Database

const DB_NAME = 'workpulse.db'

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, DB_NAME)
}

function getBackupPath(): string {
  const userDataPath = app.getPath('userData')
  const backupDir = join(userDataPath, 'backups')
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
  const date = new Date().toISOString().slice(0, 10)
  return join(backupDir, `workpulse-${date}.db`)
}

function runIntegrityCheck(): boolean {
  try {
    const result = db.pragma('integrity_check') as { integrity_check: string }[]
    return result[0]?.integrity_check === 'ok'
  } catch {
    return false
  }
}

function createBackup(): void {
  const backupPath = getBackupPath()
  if (!existsSync(backupPath)) {
    try {
      copyFileSync(getDbPath(), backupPath)
    } catch {
      // backup failure is non-critical
    }
  }
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      category TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      task_id INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'draft')),
      board_column TEXT NOT NULL DEFAULT 'todo',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('weekly', 'monthly', 'quarterly', 'custom')),
      date_from TEXT NOT NULL,
      date_to TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_reports_dates ON reports(date_from, date_to);
  `)
}

function runMigrations(): void {
  // Migration: add due_date column
  const colInfo = db.prepare("PRAGMA table_info('tasks')").all() as { name: string }[]
  if (!colInfo.some((c) => c.name === 'due_date')) {
    db.exec("ALTER TABLE tasks ADD COLUMN due_date TEXT DEFAULT NULL")
  }

  // Migration: add 'draft' to tasks status CHECK constraint
  // SQLite can't ALTER CHECK constraints, so recreate table if needed
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined
  if (tableInfo?.sql && !tableInfo.sql.includes("'draft'")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'draft')),
        board_column TEXT NOT NULL DEFAULT 'todo',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        completed_at TEXT
      );
      INSERT INTO tasks_new SELECT * FROM tasks;
      DROP TABLE tasks;
      ALTER TABLE tasks_new RENAME TO tasks;
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `)
  }
}

export function initDatabase(): void {
  const dbPath = getDbPath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  runMigrations()

  if (!runIntegrityCheck()) {
    console.error('Database integrity check failed!')
  }

  createBackup()
}

export function getDatabase(): Database.Database {
  return db
}

// --- Work Logs CRUD ---

export interface WorkLog {
  id: number
  content: string
  category: string
  created_at: string
  task_id: number | null
}

export function addWorkLog(content: string, category = ''): WorkLog {
  const stmt = db.prepare(
    'INSERT INTO work_logs (content, category) VALUES (?, ?) RETURNING *'
  )
  return stmt.get(content, category) as WorkLog
}

export function getWorkLogs(limit = 200, offset = 0): WorkLog[] {
  const stmt = db.prepare(
    'SELECT * FROM work_logs ORDER BY created_at DESC LIMIT ? OFFSET ?'
  )
  return stmt.all(limit, offset) as WorkLog[]
}

export function getWorkLogsByDateRange(from: string, to: string): WorkLog[] {
  const stmt = db.prepare(
    'SELECT * FROM work_logs WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) ORDER BY created_at ASC'
  )
  return stmt.all(from, to) as WorkLog[]
}

export function searchWorkLogs(keyword: string, limit = 200): WorkLog[] {
  const stmt = db.prepare(
    'SELECT * FROM work_logs WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?'
  )
  return stmt.all(`%${keyword}%`, limit) as WorkLog[]
}

export function deleteWorkLog(id: number): boolean {
  const stmt = db.prepare('DELETE FROM work_logs WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

// --- Reports CRUD ---

export interface Report {
  id: number
  type: string
  date_from: string
  date_to: string
  content: string
  generated_at: string
}

export function saveReport(
  type: string,
  dateFrom: string,
  dateTo: string,
  content: string
): Report {
  const stmt = db.prepare(
    'INSERT INTO reports (type, date_from, date_to, content) VALUES (?, ?, ?, ?) RETURNING *'
  )
  return stmt.get(type, dateFrom, dateTo, content) as Report
}

export function getReports(limit = 50): Report[] {
  const stmt = db.prepare('SELECT * FROM reports ORDER BY generated_at DESC LIMIT ?')
  return stmt.all(limit) as Report[]
}

// --- Tasks CRUD ---

export interface Task {
  id: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done' | 'draft'
  board_column: string
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
  due_date: string | null
}

export function addTask(title: string, description = '', status: 'todo' | 'draft' = 'todo'): Task {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 as next FROM tasks WHERE status = ?'
  ).get(status) as { next: number }

  const stmt = db.prepare(
    'INSERT INTO tasks (title, description, status, board_column, position) VALUES (?, ?, ?, ?, ?) RETURNING *'
  )
  return stmt.get(title, description, status, status, maxPos.next) as Task
}

export function getTasks(): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY position ASC')
  return stmt.all() as Task[]
}

export function updateTask(
  id: number,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'position' | 'due_date'>>
): Task | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?', 'board_column = ?')
    values.push(updates.status, updates.status)
    if (updates.status === 'done') {
      fields.push("completed_at = datetime('now', 'localtime')")
    } else {
      fields.push('completed_at = NULL')
    }
  }
  if (updates.position !== undefined) {
    fields.push('position = ?')
    values.push(updates.position)
  }
  if (updates.due_date !== undefined) {
    fields.push('due_date = ?')
    values.push(updates.due_date)
  }

  fields.push("updated_at = datetime('now', 'localtime')")
  values.push(id)

  const stmt = db.prepare(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? RETURNING *`
  )
  return stmt.get(...values) as Task | null
}

export function deleteTask(id: number): boolean {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  return stmt.run(id).changes > 0
}

export function reorderTasks(taskIds: number[], status: string): void {
  const stmt = db.prepare('UPDATE tasks SET position = ?, board_column = ?, status = ? WHERE id = ?')
  const tx = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => {
      stmt.run(index, status, status, id)
    })
  })
  tx(taskIds)
}

// --- Settings CRUD ---

export interface DailyStats {
  date: string
  log_count: number
  task_completed: number
}

export function getStats(days = 30): {
  daily: DailyStats[]
  totalLogs: number
  totalTasksDone: number
  totalTasksActive: number
  streak: number
} {
  const daily = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as log_count, 0 as task_completed
    FROM work_logs
    WHERE created_at >= datetime('now', '-${days} days', 'localtime')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all() as DailyStats[]

  // Merge completed tasks per day
  const taskDone = db.prepare(`
    SELECT date(completed_at) as date, COUNT(*) as cnt
    FROM tasks
    WHERE completed_at IS NOT NULL AND completed_at >= datetime('now', '-${days} days', 'localtime')
    GROUP BY date(completed_at)
  `).all() as { date: string; cnt: number }[]

  const doneMap = new Map(taskDone.map((r) => [r.date, r.cnt]))
  for (const d of daily) {
    d.task_completed = doneMap.get(d.date) || 0
  }
  // Add days that only have completed tasks but no logs
  for (const [date, cnt] of doneMap) {
    if (!daily.find((d) => d.date === date)) {
      daily.push({ date, log_count: 0, task_completed: cnt })
    }
  }
  daily.sort((a, b) => a.date.localeCompare(b.date))

  const totalLogs = (db.prepare('SELECT COUNT(*) as c FROM work_logs').get() as { c: number }).c
  const totalTasksDone = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get() as { c: number }).c
  const totalTasksActive = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status IN ('todo', 'in_progress')").get() as { c: number }).c

  // Calculate streak (consecutive days with logs ending today or yesterday)
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const logDates = new Set(daily.map((d) => d.date))
  for (let i = 0; i <= days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    if (logDates.has(dateStr)) {
      streak++
    } else if (i === 0) {
      // Today has no logs yet, that's ok, check from yesterday
      continue
    } else {
      break
    }
  }

  return { daily, totalLogs, totalTasksDone, totalTasksActive, streak }
}

export function getAllWorkLogs(): WorkLog[] {
  return db.prepare('SELECT * FROM work_logs ORDER BY created_at DESC').all() as WorkLog[]
}

export function getCategories(): string[] {
  const rows = db.prepare(
    "SELECT DISTINCT category FROM work_logs WHERE category != '' ORDER BY category"
  ).all() as { category: string }[]
  return rows.map((r) => r.category)
}

export function updateWorkLogCategory(id: number, category: string): void {
  db.prepare('UPDATE work_logs SET category = ? WHERE id = ?').run(category, id)
}

export function getSetting(key: string): string | null {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
  const row = stmt.get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
  )
  stmt.run(key, value, value)
}

export function deleteSetting(key: string): void {
  const stmt = db.prepare('DELETE FROM settings WHERE key = ?')
  stmt.run(key)
}
