import type { Course, ScheduleSettings } from '../types/schedule'
import { buildWeeks } from '../utils/schedule'

export const defaultSettings: ScheduleSettings = {
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

const everyWeek = buildWeeks(1, 20, 'every')
const oddWeeks = buildWeeks(1, 20, 'odd')
const evenWeeks = buildWeeks(1, 20, 'even')

export const defaultCourses: Course[] = [
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
]

export function cloneDefaultSettings(): ScheduleSettings {
  return structuredClone(defaultSettings)
}

export function cloneDefaultCourses(): Course[] {
  return structuredClone(defaultCourses)
}
