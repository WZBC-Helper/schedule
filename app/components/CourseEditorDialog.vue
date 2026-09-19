<script setup lang="ts">
import { AlertCircle, Trash2 } from '@lucide/vue'
import type { Course, CourseSession, ScheduleSettings, Weekday } from '../types/schedule'
import { COURSE_COLORS } from '../types/schedule'
import { buildWeeks, cloneSerializable, createId } from '../utils/schedule'

const props = defineProps<{
  open: boolean
  settings: ScheduleSettings
  course?: Course
  session?: CourseSession
  defaultDay: Weekday
  currentWeek: number
}>()

const emit = defineEmits<{
  close: []
  save: [course: Course]
  delete: [courseId: string, sessionId: string]
}>()

const form = reactive({
  name: '',
  color: COURSE_COLORS[0] as string,
  credits: null as number | null,
  teacher: '',
  room: '',
  weekday: 1 as Weekday,
  startPeriod: 1,
  endPeriod: 2,
  startWeek: 1,
  endWeek: 20,
  recurrence: 'every' as 'every' | 'odd' | 'even',
  note: '',
})

const errorMessage = ref('')
const weekdayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function inferRecurrence(weeks: number[]): 'every' | 'odd' | 'even' {
  if (weeks.length && weeks.every((week) => week % 2 === 1)) return 'odd'
  if (weeks.length && weeks.every((week) => week % 2 === 0)) return 'even'
  return 'every'
}

function populateForm() {
  errorMessage.value = ''
  if (props.course && props.session) {
    Object.assign(form, {
      name: props.course.name,
      color: props.course.color,
      credits: props.course.credits,
      teacher: props.session.teacher,
      room: props.session.room,
      weekday: props.session.weekday,
      startPeriod: props.session.startPeriod,
      endPeriod: props.session.endPeriod,
      startWeek: Math.min(...props.session.weeks),
      endWeek: Math.max(...props.session.weeks),
      recurrence: inferRecurrence(props.session.weeks),
      note: props.course.note,
    })
    return
  }

  Object.assign(form, {
    name: '',
    color: COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)],
    credits: null,
    teacher: '',
    room: '',
    weekday: props.defaultDay,
    startPeriod: 1,
    endPeriod: Math.min(2, props.settings.periods.length),
    startWeek: Math.max(1, props.currentWeek),
    endWeek: props.settings.totalWeeks,
    recurrence: 'every',
    note: '',
  })
}

watch(() => props.open, (open) => {
  if (open) populateForm()
})

watch(() => form.startPeriod, (value) => {
  if (form.endPeriod < value) form.endPeriod = value
})

watch(() => form.startWeek, (value) => {
  if (form.endWeek < value) form.endWeek = value
})

function submit() {
  errorMessage.value = ''
  try {
    const name = form.name.trim()
    if (!name) throw new Error('请输入课程名称')
    if (name.length > 80) throw new Error('课程名称不能超过 80 个字符')
    if (form.credits !== null && (!Number.isFinite(form.credits) || form.credits < 0 || form.credits > 30)) {
      throw new Error('学分必须是 0–30 之间的数字')
    }
    const weeks = buildWeeks(form.startWeek, form.endWeek, form.recurrence)
    if (!weeks.length) throw new Error('当前周次范围与单双周设置没有交集')

    const nextSession: CourseSession = {
      id: props.session?.id ?? createId('session'),
      weekday: form.weekday,
      startPeriod: form.startPeriod,
      endPeriod: form.endPeriod,
      weeks,
      room: form.room.trim(),
      teacher: form.teacher.trim(),
    }

    if (props.course && props.session) {
      emit('save', {
        ...cloneSerializable(props.course),
        name,
        color: form.color,
        credits: form.credits,
        note: form.note.trim(),
        sessions: props.course.sessions.map((session) => session.id === props.session?.id ? nextSession : session),
      })
    }
    else {
      emit('save', {
        id: createId('course'),
        name,
        color: form.color,
        credits: form.credits,
        note: form.note.trim(),
        sessions: [nextSession],
      })
    }
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法保存课程'
  }
}

function remove() {
  if (!props.course || !props.session) return
  if (window.confirm(`确定删除“${props.course.name}”的这个上课时段吗？`)) {
    emit('delete', props.course.id, props.session.id)
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="course ? '编辑课程' : '添加课程'"
    description="课程信息会立即保存到当前浏览器"
    width="wide"
    @close="emit('close')"
  >
    <form id="course-editor-form" class="course-form" @submit.prevent="submit">
      <div class="form-field form-field--span-2">
        <label for="course-name">课程名称 <span>*</span></label>
        <input id="course-name" v-model="form.name" maxlength="80" placeholder="例如：高等数学" autofocus>
      </div>

      <div class="form-field">
        <label for="course-credits">学分</label>
        <input id="course-credits" v-model.number="form.credits" type="number" min="0" max="30" step="0.5" placeholder="选填">
      </div>

      <div class="form-field color-field">
        <label>课程颜色</label>
        <div class="color-options" role="radiogroup" aria-label="课程颜色">
          <button
            v-for="color in COURSE_COLORS"
            :key="color"
            type="button"
            class="color-option"
            :class="{ 'color-option--selected': form.color === color }"
            :style="{ backgroundColor: color }"
            :aria-label="`选择颜色 ${color}`"
            :aria-pressed="form.color === color"
            @click="form.color = color"
          />
        </div>
      </div>

      <div class="form-divider form-field--span-2"><span>上课时段</span></div>

      <div class="form-field">
        <label for="course-weekday">星期</label>
        <select id="course-weekday" v-model.number="form.weekday">
          <option v-for="(label, index) in weekdayOptions" :key="label" :value="index + 1">{{ label }}</option>
        </select>
      </div>

      <div class="form-field form-field--inline">
        <label>节次</label>
        <div>
          <select v-model.number="form.startPeriod" aria-label="开始节次">
            <option v-for="period in settings.periods" :key="period.index" :value="period.index">第 {{ period.index }} 节</option>
          </select>
          <span>至</span>
          <select v-model.number="form.endPeriod" aria-label="结束节次">
            <option v-for="period in settings.periods.filter((item) => item.index >= form.startPeriod)" :key="period.index" :value="period.index">第 {{ period.index }} 节</option>
          </select>
        </div>
      </div>

      <div class="form-field form-field--inline">
        <label>周数</label>
        <div>
          <select v-model.number="form.startWeek" aria-label="开始周">
            <option v-for="week in settings.totalWeeks" :key="week" :value="week">第 {{ week }} 周</option>
          </select>
          <span>至</span>
          <select v-model.number="form.endWeek" aria-label="结束周">
            <option v-for="week in settings.totalWeeks" :key="week" :value="week" :disabled="week < form.startWeek">第 {{ week }} 周</option>
          </select>
        </div>
      </div>

      <div class="form-field">
        <label for="course-recurrence">重复方式</label>
        <select id="course-recurrence" v-model="form.recurrence">
          <option value="every">每周</option>
          <option value="odd">仅单周</option>
          <option value="even">仅双周</option>
        </select>
      </div>

      <div class="form-field">
        <label for="course-room">教室</label>
        <input id="course-room" v-model="form.room" maxlength="80" placeholder="选填">
      </div>

      <div class="form-field">
        <label for="course-teacher">老师</label>
        <input id="course-teacher" v-model="form.teacher" maxlength="80" placeholder="选填">
      </div>

      <div class="form-field form-field--span-2">
        <label for="course-note">备注</label>
        <textarea id="course-note" v-model="form.note" maxlength="500" rows="3" placeholder="作业要求、课程群等信息（选填）" />
      </div>

      <div v-if="errorMessage" class="form-error form-field--span-2" role="alert">
        <AlertCircle :size="17" />
        {{ errorMessage }}
      </div>
    </form>

    <template #footer>
      <button v-if="course && session" type="button" class="button button--danger-ghost" @click="remove">
        <Trash2 :size="17" />删除该时段
      </button>
      <span class="modal-footer__spacer" />
      <button type="button" class="button button--ghost" @click="emit('close')">取消</button>
      <button type="submit" form="course-editor-form" class="button button--primary">保存课程</button>
    </template>
  </BaseModal>
</template>
