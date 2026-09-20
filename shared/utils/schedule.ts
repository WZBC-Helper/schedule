import { z } from 'zod'
import type {
  Course,
  CourseDraft,
  CourseMutationRequest,
  CourseSession,
  CourseSessionDraft,
  PeriodTime,
  RevisionRequest,
  ScheduleBackup,
  ScheduleImportRequest,
  ScheduleSettings,
  Weekday,
} from '../types/schedule'

export const MAX_COURSES = 500
export const MAX_SESSIONS = 2_000
export const MAX_SESSIONS_PER_COURSE = 50

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const revisionEnvelopeSchema = z.object({
  revision: z.number().int().min(1),
})

const courseMutationEnvelopeSchema = revisionEnvelopeSchema.extend({
  course: z.unknown(),
})

const importEnvelopeSchema = revisionEnvelopeSchema.extend({
  backup: z.unknown(),
  onlyIfEmpty: z.boolean().optional().default(false),
})

export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScheduleValidationError'
  }
}

function fail(message: string): never {
  throw new ScheduleValidationError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(value: unknown, field: string, maxLength: number, allowEmpty = true): string {
  if (typeof value !== 'string') fail(`${field} 必须是文本`)
  const normalized = value.trim()
  if (!allowEmpty && !normalized) fail(`${field} 不能为空`)
  if (normalized.length > maxLength) fail(`${field} 不能超过 ${maxLength} 个字符`)
  return normalized
}

function readInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    fail(`${field} 必须是 ${min}–${max} 之间的整数`)
  }
  return Number(value)
}

function readCredits(value: unknown): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 30) {
    fail('学分必须是 0–30 之间的数字')
  }
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) {
    fail('学分最多保留两位小数')
  }
  return value
}

function readOptionalId(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return readText(value, field, 80, false)
}

function assertRealDate(value: unknown): string {
  if (typeof value !== 'string') fail('开学日期格式无效')
  const match = DATE_PATTERN.exec(value)
  if (!match) fail('开学日期格式无效')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    fail('开学日期格式无效')
  }
  return value
}

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue?.path[0] === 'revision') return '课表版本号无效'
  return issue?.message || '请求格式无效'
}

export function parseRevisionRequest(input: unknown): RevisionRequest {
  const result = revisionEnvelopeSchema.safeParse(input)
  if (!result.success) fail(formatZodError(result.error))
  return result.data
}

export function parseSettings(input: unknown): ScheduleSettings {
  if (!isRecord(input)) fail('课表设置格式无效')
  const totalWeeks = readInteger(input.totalWeeks, '总周数', 1, 30)
  const termStart = assertRealDate(input.termStart)
  if (!Array.isArray(input.periods) || input.periods.length < 1 || input.periods.length > 20) {
    fail('节次表必须包含 1–20 节')
  }

  let previousEnd = ''
  const periods: PeriodTime[] = input.periods.map((period, index) => {
    if (!isRecord(period)) fail(`第 ${index + 1} 节格式无效`)
    const start = readText(period.start, `第 ${index + 1} 节开始时间`, 5, false)
    const end = readText(period.end, `第 ${index + 1} 节结束时间`, 5, false)
    if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || start >= end) {
      fail(`第 ${index + 1} 节时间无效`)
    }
    if (previousEnd && start < previousEnd) fail(`第 ${index + 1} 节与上一节时间重叠`)
    previousEnd = end
    return { index: index + 1, start, end }
  })

  return {
    name: readText(input.name, '课表名称', 60, false),
    termStart,
    totalWeeks,
    periods,
  }
}

function parseSessionDraft(
  input: unknown,
  settings: ScheduleSettings,
  requireId: boolean,
): CourseSessionDraft {
  if (!isRecord(input)) fail('课程时段格式无效')
  const startPeriod = readInteger(input.startPeriod, '开始节次', 1, settings.periods.length)
  const endPeriod = readInteger(input.endPeriod, '结束节次', startPeriod, settings.periods.length)
  if (!Array.isArray(input.weeks) || !input.weeks.length) fail('课程时段必须至少包含一个周次')
  if (input.weeks.length > settings.totalWeeks) fail('课程时段包含过多周次')
  const weeks = [...new Set(input.weeks.map(week => readInteger(week, '周次', 1, settings.totalWeeks)))]
    .sort((left, right) => left - right)
  const id = readOptionalId(input.id, '时段 ID')
  if (requireId && !id) fail('时段 ID 不能为空')

  return {
    ...(id ? { id } : {}),
    weekday: readInteger(input.weekday, '星期', 1, 7) as Weekday,
    startPeriod,
    endPeriod,
    weeks,
    room: readText(input.room, '教室', 80),
    teacher: readText(input.teacher, '教师', 80),
  }
}

function parseCourseDraftInternal(
  input: unknown,
  settings: ScheduleSettings,
  requireIds: boolean,
): CourseDraft {
  if (!isRecord(input)) fail('课程格式无效')
  const id = readOptionalId(input.id, '课程 ID')
  if (requireIds && !id) fail('课程 ID 不能为空')
  if (!Array.isArray(input.sessions) || !input.sessions.length) fail('课程必须至少包含一个上课时段')
  if (input.sessions.length > MAX_SESSIONS_PER_COURSE) {
    fail(`每门课程不能超过 ${MAX_SESSIONS_PER_COURSE} 个时段`)
  }
  const sessions = input.sessions.map(session => parseSessionDraft(session, settings, requireIds))

  if (requireIds) {
    const sessionIds = new Set<string>()
    for (const session of sessions) {
      if (sessionIds.has(session.id!)) fail(`时段 ID 重复：${session.id}`)
      sessionIds.add(session.id!)
    }
  }

  const color = readText(input.color, '课程颜色', 20, false)
  if (!COLOR_PATTERN.test(color)) fail('课程颜色格式无效')

  return {
    ...(id ? { id } : {}),
    name: readText(input.name, '课程名称', 80, false),
    color,
    credits: readCredits(input.credits),
    note: readText(input.note, '备注', 500),
    sessions,
  }
}

export function parseCourseDraft(input: unknown, settings: ScheduleSettings): CourseDraft {
  return parseCourseDraftInternal(input, settings, false)
}

export function parseCourseMutationRequest(
  input: unknown,
  settings: ScheduleSettings,
): CourseMutationRequest {
  const result = courseMutationEnvelopeSchema.safeParse(input)
  if (!result.success) fail(formatZodError(result.error))
  return {
    revision: result.data.revision,
    course: parseCourseDraft(result.data.course, settings),
  }
}

export function parseScheduleBackup(input: unknown): ScheduleBackup {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    fail('不是受支持的课表备份（需要 schemaVersion 1）')
  }
  const settings = parseSettings(input.settings)
  if (!Array.isArray(input.courses)) fail('备份中缺少课程列表')
  if (input.courses.length > MAX_COURSES) fail(`备份不能超过 ${MAX_COURSES} 门课程`)

  const courseIds = new Set<string>()
  const sessionIds = new Set<string>()
  let sessionCount = 0
  const courses: Course[] = input.courses.map((item, index) => {
    const draft = parseCourseDraftInternal(item, settings, true)
    const id = draft.id!
    if (courseIds.has(id)) fail(`课程 ID 重复：${id}`)
    courseIds.add(id)
    sessionCount += draft.sessions.length
    if (sessionCount > MAX_SESSIONS) fail(`备份不能超过 ${MAX_SESSIONS} 个课程时段`)

    const sessions: CourseSession[] = draft.sessions.map((session) => {
      const sessionId = session.id!
      if (sessionIds.has(sessionId)) fail(`时段 ID 重复：${sessionId}`)
      sessionIds.add(sessionId)
      return { ...session, id: sessionId }
    })
    return { ...draft, id, sessions }
  })

  let exportedAt = new Date().toISOString()
  if (input.exportedAt !== undefined) {
    if (typeof input.exportedAt !== 'string' || Number.isNaN(Date.parse(input.exportedAt))) {
      fail('备份导出时间格式无效')
    }
    exportedAt = input.exportedAt
  }

  return { schemaVersion: 1, exportedAt, settings, courses }
}

export function parseScheduleImportRequest(input: unknown): ScheduleImportRequest {
  const result = importEnvelopeSchema.safeParse(input)
  if (!result.success) fail(formatZodError(result.error))
  return {
    revision: result.data.revision,
    backup: parseScheduleBackup(result.data.backup),
    onlyIfEmpty: result.data.onlyIfEmpty,
  }
}

export function createServerId(): string {
  return globalThis.crypto.randomUUID()
}

export function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const defaultScheduleSettings: ScheduleSettings = {
  name: '2026 秋季学期',
  termStart: '2026-09-14',
  totalWeeks: 20,
  periods: [
    { index: 1, start: '08:10', end: '08:55' },
    { index: 2, start: '09:05', end: '09:50' },
    { index: 3, start: '10:10', end: '10:55' },
    { index: 4, start: '11:05', end: '11:50' },
    { index: 5, start: '13:30', end: '14:15' },
    { index: 6, start: '14:25', end: '15:10' },
    { index: 7, start: '15:30', end: '16:15' },
    { index: 8, start: '16:25', end: '17:10' },
    { index: 9, start: '18:20', end: '19:05' },
    { index: 10, start: '19:10', end: '19:55' },
    { index: 11, start: '20:05', end: '20:50' },
    { index: 12, start: '20:55', end: '21:40' },
  ],
}

function weeks(start: number, end: number, parity?: 0 | 1): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
    .filter(week => parity === undefined || week % 2 === parity)
}

export function createDemoBackup(): ScheduleBackup {
  const everyWeek = weeks(1, 20)
  const oddWeeks = weeks(1, 20, 1)
  const evenWeeks = weeks(1, 20, 0)
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: cloneSerializable(defaultScheduleSettings),
    courses: [
      {
        id: 'course-marxism',
        name: '马克思主义基本原理',
        color: '#6F7DE8',
        credits: 3,
        note: '',
        sessions: [
          { id: 'session-marxism-1', weekday: 2, startPeriod: 1, endPeriod: 2, weeks: everyWeek, room: '经世楼 304', teacher: '李老师' },
          { id: 'session-marxism-2', weekday: 5, startPeriod: 3, endPeriod: 4, weeks: evenWeeks, room: '经世楼 206', teacher: '李老师' },
        ],
      },
      {
        id: 'course-policy',
        name: '形势与政策 X',
        color: '#E47DA2',
        credits: 0.5,
        note: '双周课程',
        sessions: [
          { id: 'session-policy-1', weekday: 1, startPeriod: 3, endPeriod: 4, weeks: evenWeeks, room: '致用楼 304', teacher: '周老师' },
        ],
      },
      {
        id: 'course-practice',
        name: '程序设计综合实践 B',
        color: '#D37F9F',
        credits: 2,
        note: '',
        sessions: [
          { id: 'session-practice-1', weekday: 1, startPeriod: 5, endPeriod: 8, weeks: oddWeeks, room: '思源楼 B301', teacher: '陈老师' },
          { id: 'session-practice-2', weekday: 4, startPeriod: 1, endPeriod: 4, weeks: oddWeeks, room: '思源楼 B304', teacher: '陈老师' },
        ],
      },
      {
        id: 'course-database',
        name: '数据库原理与设计 B',
        color: '#D88977',
        credits: 3,
        note: '',
        sessions: [
          { id: 'session-database-1', weekday: 4, startPeriod: 5, endPeriod: 8, weeks: everyWeek, room: '思源楼 B306', teacher: '王老师' },
        ],
      },
      {
        id: 'course-cpp',
        name: 'C++ 程序设计',
        color: '#4E9BD8',
        credits: 3,
        note: '',
        sessions: [
          { id: 'session-cpp-1', weekday: 5, startPeriod: 5, endPeriod: 8, weeks: everyWeek, room: '经世楼 801', teacher: '赵老师' },
        ],
      },
      {
        id: 'course-architecture',
        name: '计算机组成原理 B',
        color: '#4FB9B0',
        credits: 3.5,
        note: '',
        sessions: [
          { id: 'session-architecture-1', weekday: 2, startPeriod: 7, endPeriod: 8, weeks: everyWeek, room: '致用楼 204', teacher: '孙老师' },
          { id: 'session-architecture-2', weekday: 5, startPeriod: 1, endPeriod: 2, weeks: everyWeek, room: '致用楼 304', teacher: '孙老师' },
        ],
      },
      {
        id: 'course-python',
        name: 'Python 数据分析与展示',
        color: '#A47AE7',
        credits: 2,
        note: '',
        sessions: [
          { id: 'session-python-1', weekday: 2, startPeriod: 9, endPeriod: 10, weeks: everyWeek, room: '博雅楼 B321', teacher: '刘老师' },
        ],
      },
    ],
  }
}
