import { describe, expect, it } from 'vitest'
import { calculateAcademicWeek, getWeekDates, toDateKey } from '../app/utils/date'
import { buildWeeks, cloneSerializable, parseScheduleBackup } from '../app/utils/schedule'

describe('academic week calculations', () => {
  it('maps the first Saturday to week one', () => {
    expect(calculateAcademicWeek('2026-09-14', new Date(2026, 8, 19), 20)).toBe(1)
  })

  it('returns null outside the semester', () => {
    expect(calculateAcademicWeek('2026-09-14', new Date(2026, 8, 13), 20)).toBeNull()
  })

  it('builds all dates for a viewed week', () => {
    expect(getWeekDates('2026-09-14', 2).map(toDateKey)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ])
  })
})

describe('week patterns', () => {
  it('builds odd and even week lists', () => {
    expect(buildWeeks(1, 6, 'odd')).toEqual([1, 3, 5])
    expect(buildWeeks(1, 6, 'even')).toEqual([2, 4, 6])
  })
})

describe('backup validation', () => {
  it('rejects malformed backups before replacing user data', () => {
    expect(() => parseScheduleBackup({ schemaVersion: 1, settings: {}, courses: [] }))
      .toThrow('总周数')
  })

  it('creates a serializable snapshot from proxy-backed state', () => {
    const state = new Proxy({
      name: '测试课表',
      nested: [{ weeks: [1, 3, 5] }],
    }, {})

    const snapshot = cloneSerializable(state)

    expect(snapshot).toEqual({
      name: '测试课表',
      nested: [{ weeks: [1, 3, 5] }],
    })
    expect(snapshot).not.toBe(state)
  })
})
