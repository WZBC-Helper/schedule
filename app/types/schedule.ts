export type {
  Course,
  CourseDraft,
  CourseMutationRequest,
  CourseSession,
  CourseSessionDraft,
  PeriodTime,
  RevisionRequest,
  ScheduleBackup,
  ScheduleDocument,
  ScheduleImportRequest,
  ScheduleSettings,
  Weekday,
} from '../../shared/types/schedule'

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
