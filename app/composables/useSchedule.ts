import { cloneDefaultCourses, cloneDefaultSettings } from '../data/default-schedule'
import type { Course, ScheduleBackup, ScheduleSettings } from '../types/schedule'
import { calculateAcademicWeek, getMondayBasedWeekday } from '../utils/date'
import { cloneSerializable, parseScheduleBackup } from '../utils/schedule'

const STORAGE_KEY = 'wzbc-schedule:v1'

export function useSchedule() {
  const settings = useState<ScheduleSettings>('schedule-settings', cloneDefaultSettings)
  const courses = useState<Course[]>('schedule-courses', cloneDefaultCourses)
  const hydrated = useState('schedule-hydrated', () => false)
  const today = new Date()
  const currentAcademicWeek = computed(() => calculateAcademicWeek(settings.value.termStart, today, settings.value.totalWeeks))
  const viewedWeek = useState('schedule-viewed-week', () => currentAcademicWeek.value ?? 1)
  const selectedDay = useState('schedule-selected-day', () => getMondayBasedWeekday(today))

  function createBackup(): ScheduleBackup {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: cloneSerializable(settings.value),
      courses: cloneSerializable(courses.value),
    }
  }

  function persist() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createBackup()))
  }

  function hydrate(): string | null {
    if (hydrated.value) return null
    hydrated.value = true
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    try {
      const parsed = parseScheduleBackup(JSON.parse(stored))
      settings.value = parsed.settings
      courses.value = parsed.courses
      const week = calculateAcademicWeek(parsed.settings.termStart, new Date(), parsed.settings.totalWeeks)
      if (week) viewedWeek.value = week
      return null
    }
    catch (error) {
      return error instanceof Error ? error.message : '无法读取本地课表'
    }
  }

  function addCourse(course: Course) {
    courses.value = [...courses.value, cloneSerializable(course)]
    persist()
  }

  function updateCourse(course: Course) {
    const index = courses.value.findIndex((item) => item.id === course.id)
    if (index < 0) throw new Error('要编辑的课程不存在')
    courses.value = courses.value.map((item) => item.id === course.id ? cloneSerializable(course) : item)
    persist()
  }

  function deleteSession(courseId: string, sessionId: string) {
    const course = courses.value.find((item) => item.id === courseId)
    if (!course) throw new Error('要删除的课程不存在')
    const remainingSessions = course.sessions.filter((session) => session.id !== sessionId)
    courses.value = remainingSessions.length
      ? courses.value.map((item) => item.id === courseId ? { ...item, sessions: remainingSessions } : item)
      : courses.value.filter((item) => item.id !== courseId)
    persist()
  }

  function importBackupText(text: string) {
    let json: unknown
    try {
      json = JSON.parse(text)
    }
    catch {
      throw new Error('文件不是有效的 JSON')
    }
    const parsed = parseScheduleBackup(json)
    settings.value = parsed.settings
    courses.value = parsed.courses
    viewedWeek.value = calculateAcademicWeek(parsed.settings.termStart, new Date(), parsed.settings.totalWeeks) ?? 1
    persist()
  }

  function resetToDemo() {
    settings.value = cloneDefaultSettings()
    courses.value = cloneDefaultCourses()
    viewedWeek.value = calculateAcademicWeek(settings.value.termStart, new Date(), settings.value.totalWeeks) ?? 1
    selectedDay.value = getMondayBasedWeekday(new Date())
    persist()
  }

  return {
    settings,
    courses,
    hydrated,
    currentAcademicWeek,
    viewedWeek,
    selectedDay,
    hydrate,
    persist,
    addCourse,
    updateCourse,
    deleteSession,
    createBackup,
    importBackupText,
    resetToDemo,
  }
}
