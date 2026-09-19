<script setup lang="ts">
import { MapPin, UserRound } from '@lucide/vue'
import type { Course, CourseSelection, ScheduleSettings, Weekday } from '../types/schedule'
import { formatMonthDay, isSameDate } from '../utils/date'
import { isSessionActive } from '../utils/schedule'

const props = defineProps<{
  settings: ScheduleSettings
  courses: Course[]
  week: number
  dates: Date[]
  selectedDay: Weekday
}>()

const emit = defineEmits<{
  'choose-day': [day: Weekday]
  edit: [selection: CourseSelection]
}>()

const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const today = new Date()

const blocks = computed(() => props.courses.flatMap((course) => course.sessions.map((session) => ({
  course,
  session,
  active: isSessionActive(session, props.week),
}))))

function blockStyle(weekday: Weekday, start: number, end: number, color: string) {
  return {
    gridColumn: weekday + 1,
    gridRow: `${start + 1} / span ${end - start + 1}`,
    '--course-color': color,
  }
}
</script>

<template>
  <div class="schedule-scroll">
    <div
      class="schedule-grid"
      :style="{ gridTemplateRows: `64px repeat(${settings.periods.length}, 76px)` }"
    >
      <div class="schedule-corner">
        <span>节次</span>
        <small>时间</small>
      </div>

      <button
        v-for="(date, index) in dates"
        :key="date.toISOString()"
        type="button"
        class="day-heading"
        :class="{
          'day-heading--today': isSameDate(date, today),
          'day-heading--selected': selectedDay === index + 1,
          'day-heading--weekend': index >= 5,
        }"
        :style="{ gridColumn: index + 2, gridRow: 1 }"
        @click="emit('choose-day', (index + 1) as Weekday)"
      >
        <span>{{ weekdayNames[index] }}</span>
        <strong>{{ formatMonthDay(date) }}</strong>
      </button>

      <template v-for="period in settings.periods" :key="period.index">
        <div
          class="period-label"
          :style="{ gridColumn: 1, gridRow: period.index + 1 }"
        >
          <strong>{{ period.index }}</strong>
          <span>{{ period.start }}</span>
          <span>{{ period.end }}</span>
        </div>

        <div
          v-for="day in 7"
          :key="`${period.index}-${day}`"
          class="schedule-slot"
          :class="{
            'schedule-slot--selected': selectedDay === day,
            'schedule-slot--weekend': day >= 6,
          }"
          :style="{ gridColumn: day + 1, gridRow: period.index + 1 }"
        />
      </template>

      <button
        v-for="block in blocks"
        :key="block.session.id"
        type="button"
        class="course-block"
        :class="{ 'course-block--inactive': !block.active }"
        :style="blockStyle(
          block.session.weekday,
          block.session.startPeriod,
          block.session.endPeriod,
          block.course.color,
        )"
        :aria-label="`${block.course.name}，${block.session.room || '教室待定'}，点击编辑`"
        @click="emit('edit', { courseId: block.course.id, sessionId: block.session.id })"
      >
        <span class="course-block__title">{{ block.course.name }}</span>
        <span v-if="block.session.room" class="course-block__meta">
          <MapPin :size="12" />{{ block.session.room }}
        </span>
        <span v-if="block.session.teacher" class="course-block__meta">
          <UserRound :size="12" />{{ block.session.teacher }}
        </span>
        <span v-if="!block.active" class="course-block__status">非本周</span>
      </button>
    </div>
  </div>
</template>
