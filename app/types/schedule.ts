export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface PeriodTime {
  index: number
  start: string
  end: string
}

export interface CourseSession {
  id: string
  weekday: Weekday
  startPeriod: number
  endPeriod: number
  weeks: number[]
  room: string
  teacher: string
}

export interface Course {
  id: string
  name: string
  color: string
  credits: number | null
  note: string
  sessions: CourseSession[]
}

export interface ScheduleSettings {
  name: string
  termStart: string
  totalWeeks: number
  periods: PeriodTime[]
}

export interface ScheduleBackup {
  schemaVersion: 1
  exportedAt: string
  settings: ScheduleSettings
  courses: Course[]
}

export interface CourseSelection {
  courseId: string
  sessionId: string
}

export const COURSE_COLORS = [
  '#6F7DE8',
  '#E47DA2',
  '#4FB9B0',
  '#A47AE7',
  '#E7926D',
  '#4E9BD8',
  '#D6A84E',
  '#7FAE69',
] as const
