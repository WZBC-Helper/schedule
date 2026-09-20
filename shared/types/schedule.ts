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

export interface CourseSessionDraft extends Omit<CourseSession, 'id'> {
  id?: string
}

export interface CourseDraft extends Omit<Course, 'id' | 'sessions'> {
  id?: string
  sessions: CourseSessionDraft[]
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

export interface ScheduleDocument extends ScheduleBackup {
  revision: number
}

export interface RevisionRequest {
  revision: number
}

export interface CourseMutationRequest extends RevisionRequest {
  course: CourseDraft
}

export interface ScheduleImportRequest extends RevisionRequest {
  backup: ScheduleBackup
  onlyIfEmpty: boolean
}
