import { cloneDefaultSettings } from '../data/default-schedule'
import type {
  Course,
  ScheduleBackup,
  ScheduleDocument,
  ScheduleSettings,
} from '../types/schedule'
import { calculateAcademicWeek, getMondayBasedWeekday } from '../utils/date'
import { cloneSerializable, parseScheduleBackup } from '../utils/schedule'

const LEGACY_STORAGE_KEY = 'wzbc-schedule:v1'

interface ApiErrorShape {
  statusCode?: number
  status?: number
  statusMessage?: string
  message?: string
  data?: {
    message?: string
    data?: { currentRevision?: number }
  }
}

function apiErrorMessage(error: unknown): string {
  const candidate = error as ApiErrorShape
  return candidate?.data?.message
    || candidate?.message
    || candidate?.statusMessage
    || '操作失败，请稍后重试'
}

export function useSchedule() {
  const settings = useState<ScheduleSettings>('schedule-settings', cloneDefaultSettings)
  const courses = useState<Course[]>('schedule-courses', () => [])
  const revision = useState('schedule-revision', () => 1)
  const ownerUserId = useState<string | null>('schedule-owner-user-id', () => null)
  const hydrated = useState('schedule-hydrated', () => false)
  const loading = useState('schedule-loading', () => true)
  const mutationPending = useState('schedule-mutation-pending', () => false)
  const errorMessage = useState('schedule-error', () => '')
  const localMigration = useState<ScheduleBackup | null>('schedule-local-migration', () => null)
  const currentAcademicWeek = computed(() => calculateAcademicWeek(settings.value.termStart, new Date(), settings.value.totalWeeks))
  const viewedWeek = useState('schedule-viewed-week', () => currentAcademicWeek.value ?? 1)
  const selectedDay = useState('schedule-selected-day', () => getMondayBasedWeekday(new Date()))

  function applyDocument(document: ScheduleDocument) {
    settings.value = cloneSerializable(document.settings)
    courses.value = cloneSerializable(document.courses)
    revision.value = document.revision
    const currentWeek = calculateAcademicWeek(document.settings.termStart, new Date(), document.settings.totalWeeks)
    if (viewedWeek.value < 1 || viewedWeek.value > document.settings.totalWeeks) {
      viewedWeek.value = currentWeek ?? 1
    }
  }

  function clearState() {
    settings.value = cloneDefaultSettings()
    courses.value = []
    revision.value = 1
    ownerUserId.value = null
    hydrated.value = false
    loading.value = true
    mutationPending.value = false
    errorMessage.value = ''
    localMigration.value = null
    viewedWeek.value = 1
    selectedDay.value = getMondayBasedWeekday(new Date())
  }

  function detectLegacySchedule(userId: string) {
    localMigration.value = null
    if (!import.meta.client || courses.value.length > 0) return
    if (localStorage.getItem(`${LEGACY_STORAGE_KEY}:dismissed:${userId}`)) return

    const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!stored) return
    try {
      localMigration.value = parseScheduleBackup(JSON.parse(stored))
    }
    catch {
      // Invalid legacy data stays untouched so the user can recover it manually.
    }
  }

  async function load(userId: string, force = false): Promise<void> {
    if (!userId) throw new Error('无法识别当前登录用户')
    if (!force && hydrated.value && ownerUserId.value === userId) return

    if (ownerUserId.value !== userId) clearState()
    ownerUserId.value = userId
    loading.value = true
    errorMessage.value = ''

    try {
      const document = await $fetch<ScheduleDocument>('/api/schedule')
      applyDocument(document)
      hydrated.value = true
      detectLegacySchedule(userId)
    }
    catch (error) {
      errorMessage.value = apiErrorMessage(error)
      throw new Error(errorMessage.value)
    }
    finally {
      loading.value = false
    }
  }

  async function mutate(request: () => Promise<ScheduleDocument>): Promise<void> {
    if (mutationPending.value) throw new Error('上一项操作仍在保存中')
    mutationPending.value = true
    errorMessage.value = ''
    try {
      applyDocument(await request())
    }
    catch (error) {
      const candidate = error as ApiErrorShape
      if ((candidate.statusCode ?? candidate.status) === 409 && ownerUserId.value) {
        await load(ownerUserId.value, true).catch(() => undefined)
      }
      errorMessage.value = apiErrorMessage(error)
      throw new Error(errorMessage.value)
    }
    finally {
      mutationPending.value = false
    }
  }

  async function addCourse(course: Course) {
    await mutate(() => $fetch<ScheduleDocument>('/api/courses', {
      method: 'POST',
      body: { revision: revision.value, course },
    }))
  }

  async function updateCourse(course: Course) {
    if (!courses.value.some(item => item.id === course.id)) throw new Error('要编辑的课程不存在')
    await mutate(() => $fetch<ScheduleDocument>(`/api/courses/${encodeURIComponent(course.id)}`, {
      method: 'PUT',
      body: { revision: revision.value, course },
    }))
  }

  async function deleteSession(courseId: string, sessionId: string) {
    await mutate(() => $fetch<ScheduleDocument>(
      `/api/courses/${encodeURIComponent(courseId)}/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE', body: { revision: revision.value } },
    ))
  }

  function createBackup(): ScheduleBackup {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: cloneSerializable(settings.value),
      courses: cloneSerializable(courses.value),
    }
  }

  async function importBackupText(text: string, onlyIfEmpty = false) {
    let json: unknown
    try {
      json = JSON.parse(text)
    }
    catch {
      throw new Error('文件不是有效的 JSON')
    }
    await importBackup(parseScheduleBackup(json), onlyIfEmpty)
  }

  async function importBackup(backup: ScheduleBackup, onlyIfEmpty = false) {
    await mutate(() => $fetch<ScheduleDocument>('/api/schedule/import', {
      method: 'PUT',
      body: { revision: revision.value, backup, onlyIfEmpty },
    }))
  }

  async function importLocalSchedule() {
    if (!localMigration.value || !ownerUserId.value) throw new Error('没有可迁移的本地课表')
    const backup = cloneSerializable(localMigration.value)
    await importBackup(backup, true)

    if (import.meta.client) {
      localStorage.setItem(`${LEGACY_STORAGE_KEY}:migrated:${ownerUserId.value}`, JSON.stringify(backup))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    localMigration.value = null
  }

  function dismissLocalMigration() {
    if (import.meta.client && ownerUserId.value) {
      localStorage.setItem(`${LEGACY_STORAGE_KEY}:dismissed:${ownerUserId.value}`, new Date().toISOString())
    }
    localMigration.value = null
  }

  async function resetToDemo() {
    await mutate(() => $fetch<ScheduleDocument>('/api/schedule/reset-demo', {
      method: 'POST',
      body: { revision: revision.value },
    }))
    viewedWeek.value = currentAcademicWeek.value ?? 1
    selectedDay.value = getMondayBasedWeekday(new Date())
  }

  return {
    settings,
    courses,
    revision,
    ownerUserId,
    hydrated,
    loading,
    mutationPending,
    errorMessage,
    localMigration,
    currentAcademicWeek,
    viewedWeek,
    selectedDay,
    load,
    clearState,
    addCourse,
    updateCourse,
    deleteSession,
    createBackup,
    importBackupText,
    importLocalSchedule,
    dismissLocalMigration,
    resetToDemo,
  }
}
