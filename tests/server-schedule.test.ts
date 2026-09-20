import { describe, expect, it } from 'vitest'
import {
  ScheduleValidationError,
  createDemoBackup,
  parseCourseMutationRequest,
  parseScheduleBackup,
  parseScheduleImportRequest,
} from '../shared/utils/schedule'

describe('server schedule validation', () => {
  it('accepts the trusted demo schedule and normalizes its shape', () => {
    const backup = parseScheduleBackup(createDemoBackup())

    expect(backup.courses).toHaveLength(7)
    expect(backup.courses.flatMap(course => course.sessions)).toHaveLength(10)
    expect(backup.settings.periods).toHaveLength(12)
  })

  it('rejects impossible calendar dates', () => {
    const backup = createDemoBackup()
    backup.settings.termStart = '2026-02-30'

    expect(() => parseScheduleBackup(backup)).toThrowError(ScheduleValidationError)
  })

  it('rejects a course outside the configured period range', () => {
    const backup = createDemoBackup()
    const course = backup.courses[0]!
    course.sessions[0]!.endPeriod = 20

    expect(() => parseCourseMutationRequest({ revision: 1, course }, backup.settings))
      .toThrow('结束节次')
  })

  it('defaults normal imports to allowing non-empty replacement only when explicitly requested', () => {
    const backup = createDemoBackup()
    const request = parseScheduleImportRequest({ revision: 1, backup })

    expect(request.onlyIfEmpty).toBe(false)
  })

  it('normalizes duplicate and unordered weeks', () => {
    const backup = createDemoBackup()
    backup.courses[0]!.sessions[0]!.weeks = [3, 1, 3, 2]

    expect(parseScheduleBackup(backup).courses[0]!.sessions[0]!.weeks).toEqual([1, 2, 3])
  })
})
