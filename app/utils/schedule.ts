import type {
  Course,
  CourseSession,
  ScheduleBackup,
  ScheduleSettings,
  Weekday,
} from '../types/schedule'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(value: unknown, field: string, maxLength: number, allowEmpty = true): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} 必须是文本`)
  }
  const normalized = value.trim()
  if (!allowEmpty && !normalized) {
    throw new Error(`${field} 不能为空`)
  }
  if (normalized.length > maxLength) {
    throw new Error(`${field} 不能超过 ${maxLength} 个字符`)
  }
  return normalized
}

function readInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${field} 必须是 ${min}–${max} 之间的整数`)
  }
  return Number(value)
}

export function buildWeeks(
  startWeek: number,
  endWeek: number,
  recurrence: 'every' | 'odd' | 'even',
): number[] {
  if (!Number.isInteger(startWeek) || !Number.isInteger(endWeek) || startWeek < 1 || endWeek < startWeek) {
    throw new Error('周次范围无效')
  }

  return Array.from({ length: endWeek - startWeek + 1 }, (_, index) => startWeek + index)
    .filter((week) => recurrence === 'every' || (recurrence === 'odd' ? week % 2 === 1 : week % 2 === 0))
}

export function describeWeeks(weeks: number[]): string {
  if (!weeks.length) return '无有效周次'
  const sorted = [...new Set(weeks)].sort((left, right) => left - right)
  const allOdd = sorted.every((week) => week % 2 === 1)
  const allEven = sorted.every((week) => week % 2 === 0)
  const suffix = allOdd ? '单周' : allEven ? '双周' : '周'
  return sorted.length === 1 ? `第 ${sorted[0]} ${suffix}` : `第 ${sorted[0]}–${sorted.at(-1)} ${suffix}`
}

export function isSessionActive(session: CourseSession, week: number): boolean {
  return session.weeks.includes(week)
}

function normalizeSession(value: unknown, totalWeeks: number, periodCount: number): CourseSession {
  if (!isRecord(value)) throw new Error('课程时段格式无效')

  const startPeriod = readInteger(value.startPeriod, '开始节次', 1, periodCount)
  const endPeriod = readInteger(value.endPeriod, '结束节次', startPeriod, periodCount)
  if (!Array.isArray(value.weeks) || !value.weeks.length) {
    throw new Error('课程时段必须至少包含一个周次')
  }
  const weeks = [...new Set(value.weeks.map((week) => readInteger(week, '周次', 1, totalWeeks)))]
    .sort((left, right) => left - right)

  return {
    id: readText(value.id, '时段 ID', 80, false),
    weekday: readInteger(value.weekday, '星期', 1, 7) as Weekday,
    startPeriod,
    endPeriod,
    weeks,
    room: readText(value.room, '教室', 80),
    teacher: readText(value.teacher, '教师', 80),
  }
}

function normalizeSettings(value: unknown): ScheduleSettings {
  if (!isRecord(value)) throw new Error('课表设置格式无效')
  const totalWeeks = readInteger(value.totalWeeks, '总周数', 1, 30)
  if (typeof value.termStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.termStart)) {
    throw new Error('开学日期格式无效')
  }
  if (!Array.isArray(value.periods) || value.periods.length < 1 || value.periods.length > 20) {
    throw new Error('节次表必须包含 1–20 节')
  }

  const periods = value.periods.map((period, index) => {
    if (!isRecord(period)) throw new Error(`第 ${index + 1} 节格式无效`)
    const start = readText(period.start, `第 ${index + 1} 节开始时间`, 5, false)
    const end = readText(period.end, `第 ${index + 1} 节结束时间`, 5, false)
    if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || start >= end) {
      throw new Error(`第 ${index + 1} 节时间无效`)
    }
    return { index: index + 1, start, end }
  })

  return {
    name: readText(value.name, '课表名称', 60, false),
    termStart: value.termStart,
    totalWeeks,
    periods,
  }
}

export function parseScheduleBackup(input: unknown): ScheduleBackup {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    throw new Error('不是受支持的课表备份（需要 schemaVersion 1）')
  }

  const settings = normalizeSettings(input.settings)
  if (!Array.isArray(input.courses)) throw new Error('备份中缺少课程列表')

  const ids = new Set<string>()
  const sessionIds = new Set<string>()
  const courses: Course[] = input.courses.map((value, courseIndex) => {
    if (!isRecord(value)) throw new Error(`第 ${courseIndex + 1} 门课程格式无效`)
    const id = readText(value.id, '课程 ID', 80, false)
    if (ids.has(id)) throw new Error(`课程 ID 重复：${id}`)
    ids.add(id)
    if (!Array.isArray(value.sessions) || !value.sessions.length) {
      throw new Error(`课程“${String(value.name ?? courseIndex + 1)}”没有上课时段`)
    }
    const sessions = value.sessions.map((session) => normalizeSession(session, settings.totalWeeks, settings.periods.length))
    for (const session of sessions) {
      if (sessionIds.has(session.id)) throw new Error(`时段 ID 重复：${session.id}`)
      sessionIds.add(session.id)
    }

    return {
      id,
      name: readText(value.name, '课程名称', 80, false),
      color: readText(value.color, '课程颜色', 20, false),
      credits: value.credits === null
        ? null
        : typeof value.credits === 'number' && Number.isFinite(value.credits) && value.credits >= 0 && value.credits <= 30
          ? value.credits
          : (() => { throw new Error('学分必须是 0–30 之间的数字') })(),
      note: readText(value.note, '备注', 500),
      sessions,
    }
  })

  return {
    schemaVersion: 1,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    settings,
    courses,
  }
}

export function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

export function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
