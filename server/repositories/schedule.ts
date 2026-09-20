import { and, asc, count, eq, inArray, max } from 'drizzle-orm'
import { createError } from 'h3'
import type {
  Course,
  CourseDraft,
  ScheduleBackup,
  ScheduleDocument,
} from '../../shared/types/schedule'
import {
  MAX_COURSES,
  MAX_SESSIONS,
  ScheduleValidationError,
  cloneSerializable,
  createDemoBackup,
  createServerId,
  defaultScheduleSettings,
  parseCourseMutationRequest,
  parseRevisionRequest,
  parseScheduleImportRequest,
  parseSettings,
} from '../../shared/utils/schedule'
import { db } from '../database/client'
import { courseSessions, courses, schedules } from '../database/schema'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type ScheduleRow = typeof schedules.$inferSelect

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validationError(error: unknown): never {
  if (error instanceof ScheduleValidationError) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: error.message })
  }
  throw error
}

function assertResourceId(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '课程资源不存在' })
  }
}

async function ensureOwnedSchedule(userId: string): Promise<ScheduleRow> {
  const [existing] = await db.select().from(schedules).where(eq(schedules.userId, userId)).limit(1)
  if (existing) return existing

  const id = createServerId()
  try {
    await db.insert(schedules).values({
      id,
      userId,
      name: defaultScheduleSettings.name,
      termStart: defaultScheduleSettings.termStart,
      totalWeeks: defaultScheduleSettings.totalWeeks,
      periods: cloneSerializable(defaultScheduleSettings.periods),
      revision: 1,
    })
  }
  catch (error) {
    // A concurrent first request may have won the unique user_id insert.
    const [concurrent] = await db.select().from(schedules).where(eq(schedules.userId, userId)).limit(1)
    if (concurrent) return concurrent
    throw error
  }

  const [created] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1)
  if (!created) throw createError({ statusCode: 500, message: '无法初始化课表' })
  return created
}

async function lockOwnedSchedule(
  tx: Transaction,
  userId: string,
  expectedRevision: number,
): Promise<ScheduleRow> {
  const [schedule] = await tx
    .select()
    .from(schedules)
    .where(eq(schedules.userId, userId))
    .limit(1)
    .for('update')

  if (!schedule) throw createError({ statusCode: 500, message: '课表尚未初始化' })
  if (schedule.revision !== expectedRevision) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: '课表已在其他页面或设备更新，请刷新后重试',
      data: { currentRevision: schedule.revision },
    })
  }
  return schedule
}

async function finishMutation(tx: Transaction, schedule: ScheduleRow): Promise<void> {
  await tx
    .update(schedules)
    .set({ revision: schedule.revision + 1, updatedAt: new Date() })
    .where(and(eq(schedules.id, schedule.id), eq(schedules.userId, schedule.userId)))
}

async function loadScheduleDocument(scheduleId: string): Promise<ScheduleDocument> {
  const [schedule] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1)
  if (!schedule) throw createError({ statusCode: 404, message: '课表不存在' })

  const settings = parseSettings({
    name: schedule.name,
    termStart: schedule.termStart,
    totalWeeks: schedule.totalWeeks,
    periods: schedule.periods,
  })
  const courseRows = await db
    .select()
    .from(courses)
    .where(eq(courses.scheduleId, schedule.id))
    .orderBy(asc(courses.position), asc(courses.createdAt), asc(courses.id))

  const sessionRows = courseRows.length
    ? await db
        .select()
        .from(courseSessions)
        .where(inArray(courseSessions.courseId, courseRows.map(course => course.id)))
        .orderBy(asc(courseSessions.position), asc(courseSessions.createdAt), asc(courseSessions.id))
    : []

  const sessionsByCourse = new Map<string, Course['sessions']>()
  for (const session of sessionRows) {
    const list = sessionsByCourse.get(session.courseId) ?? []
    list.push({
      id: session.id,
      weekday: session.weekday as Course['sessions'][number]['weekday'],
      startPeriod: session.startPeriod,
      endPeriod: session.endPeriod,
      weeks: [...session.weeks],
      room: session.room,
      teacher: session.teacher,
    })
    sessionsByCourse.set(session.courseId, list)
  }

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    revision: schedule.revision,
    settings,
    courses: courseRows.map(course => ({
      id: course.id,
      name: course.name,
      color: course.color,
      credits: course.credits,
      note: course.note,
      sessions: sessionsByCourse.get(course.id) ?? [],
    })),
  }
}

async function countScheduleSessions(tx: Transaction, scheduleId: string): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(courseSessions)
    .innerJoin(courses, eq(courseSessions.courseId, courses.id))
    .where(eq(courses.scheduleId, scheduleId))
  return Number(row?.value ?? 0)
}

async function insertCourses(
  tx: Transaction,
  scheduleId: string,
  courseDrafts: readonly CourseDraft[] | readonly Course[],
): Promise<void> {
  if (!courseDrafts.length) return

  const courseValues: Array<typeof courses.$inferInsert> = []
  const sessionValues: Array<typeof courseSessions.$inferInsert> = []
  courseDrafts.forEach((course, courseIndex) => {
    const courseId = createServerId()
    courseValues.push({
      id: courseId,
      scheduleId,
      name: course.name,
      color: course.color,
      credits: course.credits,
      note: course.note,
      position: courseIndex,
    })
    course.sessions.forEach((session, sessionIndex) => {
      sessionValues.push({
        id: createServerId(),
        courseId,
        weekday: session.weekday,
        startPeriod: session.startPeriod,
        endPeriod: session.endPeriod,
        weeks: [...session.weeks],
        room: session.room,
        teacher: session.teacher,
        position: sessionIndex,
      })
    })
  })

  await tx.insert(courses).values(courseValues)
  if (sessionValues.length) await tx.insert(courseSessions).values(sessionValues)
}

async function replaceScheduleInTransaction(
  tx: Transaction,
  schedule: ScheduleRow,
  backup: ScheduleBackup,
  onlyIfEmpty: boolean,
): Promise<void> {
  if (onlyIfEmpty) {
    const [row] = await tx
      .select({ value: count() })
      .from(courses)
      .where(eq(courses.scheduleId, schedule.id))
    if (Number(row?.value ?? 0) > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: '云端课表已有课程，未覆盖现有数据',
      })
    }
  }

  await tx.delete(courses).where(eq(courses.scheduleId, schedule.id))
  await tx
    .update(schedules)
    .set({
      name: backup.settings.name,
      termStart: backup.settings.termStart,
      totalWeeks: backup.settings.totalWeeks,
      periods: cloneSerializable(backup.settings.periods),
    })
    .where(and(eq(schedules.id, schedule.id), eq(schedules.userId, schedule.userId)))
  await insertCourses(tx, schedule.id, backup.courses)
}

export async function getScheduleForUser(userId: string): Promise<ScheduleDocument> {
  const schedule = await ensureOwnedSchedule(userId)
  return loadScheduleDocument(schedule.id)
}

export async function createCourseForUser(userId: string, rawRequest: unknown): Promise<ScheduleDocument> {
  const owned = await ensureOwnedSchedule(userId)
  try {
    await db.transaction(async (tx) => {
      const schedule = await lockOwnedSchedule(tx, userId, parseRevisionRequest(rawRequest).revision)
      const request = parseCourseMutationRequest(rawRequest, parseSettings({
        name: schedule.name,
        termStart: schedule.termStart,
        totalWeeks: schedule.totalWeeks,
        periods: schedule.periods,
      }))
      const [courseCount] = await tx
        .select({ value: count() })
        .from(courses)
        .where(eq(courses.scheduleId, schedule.id))
      if (Number(courseCount?.value ?? 0) >= MAX_COURSES) {
        throw new ScheduleValidationError(`每张课表不能超过 ${MAX_COURSES} 门课程`)
      }
      const existingSessions = await countScheduleSessions(tx, schedule.id)
      if (existingSessions + request.course.sessions.length > MAX_SESSIONS) {
        throw new ScheduleValidationError(`每张课表不能超过 ${MAX_SESSIONS} 个课程时段`)
      }
      const [positionRow] = await tx
        .select({ value: max(courses.position) })
        .from(courses)
        .where(eq(courses.scheduleId, schedule.id))
      const courseId = createServerId()
      await tx.insert(courses).values({
        id: courseId,
        scheduleId: schedule.id,
        name: request.course.name,
        color: request.course.color,
        credits: request.course.credits,
        note: request.course.note,
        position: Number(positionRow?.value ?? -1) + 1,
      })
      await tx.insert(courseSessions).values(request.course.sessions.map((session, index) => ({
        id: createServerId(),
        courseId,
        weekday: session.weekday,
        startPeriod: session.startPeriod,
        endPeriod: session.endPeriod,
        weeks: [...session.weeks],
        room: session.room,
        teacher: session.teacher,
        position: index,
      })))
      await finishMutation(tx, schedule)
    })
  }
  catch (error) {
    validationError(error)
  }
  return loadScheduleDocument(owned.id)
}
export async function updateCourseForUser(
  userId: string,
  courseId: string,
  rawRequest: unknown,
): Promise<ScheduleDocument> {
  assertResourceId(courseId)
  const owned = await ensureOwnedSchedule(userId)
  try {
    await db.transaction(async (tx) => {
      const schedule = await lockOwnedSchedule(tx, userId, parseRevisionRequest(rawRequest).revision)
      const request = parseCourseMutationRequest(rawRequest, parseSettings({
        name: schedule.name,
        termStart: schedule.termStart,
        totalWeeks: schedule.totalWeeks,
        periods: schedule.periods,
      }))
      const [existing] = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.scheduleId, schedule.id)))
        .limit(1)
      if (!existing) throw createError({ statusCode: 404, message: '课程不存在' })

      const [existingCourseSessions] = await tx
        .select({ value: count() })
        .from(courseSessions)
        .where(eq(courseSessions.courseId, courseId))
      const nextTotalSessions = await countScheduleSessions(tx, schedule.id)
        - Number(existingCourseSessions?.value ?? 0)
        + request.course.sessions.length
      if (nextTotalSessions > MAX_SESSIONS) {
        throw new ScheduleValidationError(`每张课表不能超过 ${MAX_SESSIONS} 个课程时段`)
      }

      await tx
        .update(courses)
        .set({
          name: request.course.name,
          color: request.course.color,
          credits: request.course.credits,
          note: request.course.note,
          updatedAt: new Date(),
        })
        .where(and(eq(courses.id, courseId), eq(courses.scheduleId, schedule.id)))
      await tx.delete(courseSessions).where(eq(courseSessions.courseId, courseId))
      await tx.insert(courseSessions).values(request.course.sessions.map((session, index) => ({
        id: createServerId(),
        courseId,
        weekday: session.weekday,
        startPeriod: session.startPeriod,
        endPeriod: session.endPeriod,
        weeks: [...session.weeks],
        room: session.room,
        teacher: session.teacher,
        position: index,
      })))
      await finishMutation(tx, schedule)
    })
  }
  catch (error) {
    validationError(error)
  }
  return loadScheduleDocument(owned.id)
}

export async function deleteSessionForUser(
  userId: string,
  courseId: string,
  sessionId: string,
  rawRequest: unknown,
): Promise<ScheduleDocument> {
  assertResourceId(courseId)
  assertResourceId(sessionId)
  const owned = await ensureOwnedSchedule(userId)
  try {
    await db.transaction(async (tx) => {
      const schedule = await lockOwnedSchedule(tx, userId, parseRevisionRequest(rawRequest).revision)
      const [course] = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.scheduleId, schedule.id)))
        .limit(1)
      if (!course) throw createError({ statusCode: 404, message: '课程不存在' })
      const [session] = await tx
        .select({ id: courseSessions.id })
        .from(courseSessions)
        .where(and(eq(courseSessions.id, sessionId), eq(courseSessions.courseId, courseId)))
        .limit(1)
      if (!session) throw createError({ statusCode: 404, message: '课程时段不存在' })
      const [sessionCount] = await tx
        .select({ value: count() })
        .from(courseSessions)
        .where(eq(courseSessions.courseId, courseId))
      if (Number(sessionCount?.value ?? 0) <= 1) {
        await tx.delete(courses).where(and(eq(courses.id, courseId), eq(courses.scheduleId, schedule.id)))
      }
      else {
        await tx.delete(courseSessions).where(and(
          eq(courseSessions.id, sessionId),
          eq(courseSessions.courseId, courseId),
        ))
      }
      await finishMutation(tx, schedule)
    })
  }
  catch (error) {
    validationError(error)
  }
  return loadScheduleDocument(owned.id)
}

export async function importScheduleForUser(userId: string, rawRequest: unknown): Promise<ScheduleDocument> {
  const owned = await ensureOwnedSchedule(userId)
  try {
    const request = parseScheduleImportRequest(rawRequest)
    await db.transaction(async (tx) => {
      const schedule = await lockOwnedSchedule(tx, userId, request.revision)
      await replaceScheduleInTransaction(tx, schedule, request.backup, request.onlyIfEmpty)
      await finishMutation(tx, schedule)
    })
  }
  catch (error) {
    validationError(error)
  }
  return loadScheduleDocument(owned.id)
}

export async function resetDemoForUser(userId: string, rawRequest: unknown): Promise<ScheduleDocument> {
  const owned = await ensureOwnedSchedule(userId)
  try {
    const request = parseRevisionRequest(rawRequest)
    await db.transaction(async (tx) => {
      const schedule = await lockOwnedSchedule(tx, userId, request.revision)
      await replaceScheduleInTransaction(tx, schedule, createDemoBackup(), false)
      await finishMutation(tx, schedule)
    })
  }
  catch (error) {
    validationError(error)
  }
  return loadScheduleDocument(owned.id)
}
