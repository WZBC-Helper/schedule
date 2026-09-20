import {
  date,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  smallint,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'
import type { PeriodTime } from '../../../shared/types/schedule'
import { user } from './auth'

export const schedules = mysqlTable('schedules', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 60 }).notNull(),
  termStart: date('term_start', { mode: 'string' }).notNull(),
  totalWeeks: smallint('total_weeks', { unsigned: true }).notNull(),
  periods: json('periods').$type<PeriodTime[]>().notNull(),
  revision: int('revision', { unsigned: true }).notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, table => [
  uniqueIndex('schedules_user_id_unique').on(table.userId),
])

export const courses = mysqlTable('courses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  scheduleId: varchar('schedule_id', { length: 36 })
    .notNull()
    .references(() => schedules.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  color: varchar('color', { length: 20 }).notNull(),
  credits: decimal('credits', { precision: 4, scale: 2, mode: 'number' }),
  note: varchar('note', { length: 500 }).notNull().default(''),
  position: smallint('position', { unsigned: true }).notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, table => [
  index('courses_schedule_id_idx').on(table.scheduleId),
])

export const courseSessions = mysqlTable('course_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  courseId: varchar('course_id', { length: 36 })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  weekday: smallint('weekday', { unsigned: true }).notNull(),
  startPeriod: smallint('start_period', { unsigned: true }).notNull(),
  endPeriod: smallint('end_period', { unsigned: true }).notNull(),
  weeks: json('weeks').$type<number[]>().notNull(),
  room: varchar('room', { length: 80 }).notNull().default(''),
  teacher: varchar('teacher', { length: 80 }).notNull().default(''),
  position: smallint('position', { unsigned: true }).notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, table => [
  index('course_sessions_course_id_idx').on(table.courseId),
])
