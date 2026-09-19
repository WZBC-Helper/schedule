<script setup lang="ts">
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudOff,
  Download,
  GraduationCap,
  Import,
  LayoutGrid,
  MapPin,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Upload,
} from '@lucide/vue'
import type { Course, CourseSelection, CourseSession, Weekday } from '../types/schedule'
import {
  formatFullChineseDate,
  getMondayBasedWeekday,
  getWeekDates,
} from '../utils/date'
import { describeWeeks, isSessionActive } from '../utils/schedule'

const schedule = useSchedule()
const editorOpen = ref(false)
const importOpen = ref(false)
const selected = ref<CourseSelection | null>(null)
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const weekDates = computed(() => getWeekDates(schedule.settings.value.termStart, schedule.viewedWeek.value))
const selectedDate = computed(() => weekDates.value[schedule.selectedDay.value - 1]!)
const selectedCourse = computed(() => schedule.courses.value.find((course) => course.id === selected.value?.courseId))
const selectedSession = computed(() => selectedCourse.value?.sessions.find((session) => session.id === selected.value?.sessionId))

const activeSessions = computed(() => schedule.courses.value.flatMap((course) => course.sessions
  .filter((session) => isSessionActive(session, schedule.viewedWeek.value))
  .map((session) => ({ course, session }))))

const selectedDaySessions = computed(() => activeSessions.value
  .filter(({ session }) => session.weekday === schedule.selectedDay.value)
  .sort((left, right) => left.session.startPeriod - right.session.startPeriod))

const activeCourseCount = computed(() => new Set(activeSessions.value.map(({ course }) => course.id)).size)
const activeCreditCount = computed(() => {
  const ids = new Set<string>()
  return activeSessions.value.reduce((sum, { course }) => {
    if (ids.has(course.id)) return sum
    ids.add(course.id)
    return sum + (course.credits ?? 0)
  }, 0)
})

const weekProgress = computed(() => {
  const todayWeek = schedule.currentAcademicWeek.value
  if (!todayWeek || todayWeek !== schedule.viewedWeek.value) return 0
  return Math.round((getMondayBasedWeekday(new Date()) / 7) * 100)
})

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 2800)
}

onMounted(() => {
  const error = schedule.hydrate()
  if (error) showNotice(`本地数据未载入：${error}`)
})

onBeforeUnmount(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
})

function openNewCourse() {
  selected.value = null
  editorOpen.value = true
}

function openCourse(selection: CourseSelection) {
  selected.value = selection
  editorOpen.value = true
}

function saveCourse(course: Course) {
  if (selected.value) {
    schedule.updateCourse(course)
    showNotice('课程修改已保存')
  }
  else {
    schedule.addCourse(course)
    showNotice('课程已添加')
  }
  editorOpen.value = false
  selected.value = null
}

function deleteCourseSession(courseId: string, sessionId: string) {
  schedule.deleteSession(courseId, sessionId)
  editorOpen.value = false
  selected.value = null
  showNotice('课程时段已删除')
}

function previousWeek() {
  if (schedule.viewedWeek.value > 1) schedule.viewedWeek.value -= 1
}

function nextWeek() {
  if (schedule.viewedWeek.value < schedule.settings.value.totalWeeks) schedule.viewedWeek.value += 1
}

function goToToday() {
  if (schedule.currentAcademicWeek.value) schedule.viewedWeek.value = schedule.currentAcademicWeek.value
  schedule.selectedDay.value = getMondayBasedWeekday(new Date())
}

function periodRange(session: CourseSession) {
  const start = schedule.settings.value.periods[session.startPeriod - 1]?.start ?? '--:--'
  const end = schedule.settings.value.periods[session.endPeriod - 1]?.end ?? '--:--'
  return `${start} – ${end}`
}

function importBackup(payload: { text: string, name: string }) {
  try {
    schedule.importBackupText(payload.text)
    importOpen.value = false
    showNotice(`已从 ${payload.name} 恢复课表`)
  }
  catch (error) {
    showNotice(error instanceof Error ? error.message : '导入失败')
  }
}

function exportBackup() {
  const backup = schedule.createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `拾光课表_${schedule.settings.value.name}_${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  showNotice('课表备份已导出')
}

function resetDemo() {
  if (!window.confirm('确定恢复示例课表吗？当前浏览器中的课程将被替换。')) return
  schedule.resetToDemo()
  showNotice('已恢复示例课表')
}

function upcomingFeature(name: string) {
  showNotice(`${name}将在下一阶段接入`)
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark"><CalendarDays :size="23" /></span>
        <div>
          <strong>拾光课表</strong>
          <small>Schedule</small>
        </div>
      </div>

      <nav class="main-nav" aria-label="主要导航">
        <p>工作台</p>
        <button class="nav-item nav-item--active" type="button">
          <LayoutGrid :size="19" />
          <span>我的课表</span>
          <kbd>1</kbd>
        </button>
        <button class="nav-item" type="button" @click="goToToday">
          <CalendarCheck2 :size="19" />
          <span>今日课程</span>
        </button>
        <button class="nav-item" type="button" @click="importOpen = true">
          <Import :size="19" />
          <span>导入课表</span>
        </button>

        <p>规划</p>
        <button class="nav-item" type="button" @click="upcomingFeature('学习计划')">
          <BookOpenCheck :size="19" />
          <span>学习计划</span>
          <small>Soon</small>
        </button>
        <button class="nav-item" type="button" @click="upcomingFeature('提醒设置')">
          <BellRing :size="19" />
          <span>课程提醒</span>
          <small>Soon</small>
        </button>
      </nav>

      <div class="sidebar-spacer" />

      <div class="local-card">
        <span><CloudOff :size="18" /></span>
        <div>
          <strong>本地模式</strong>
          <p>数据仅保存在此浏览器</p>
        </div>
      </div>

      <button class="nav-item sidebar-settings" type="button" @click="upcomingFeature('设置页')">
        <Settings :size="19" />
        <span>设置</span>
      </button>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-title">
          <p>{{ schedule.settings.value.name }}</p>
          <h1>第 {{ schedule.viewedWeek.value }} 周</h1>
          <span v-if="schedule.currentAcademicWeek.value === schedule.viewedWeek.value" class="current-week-chip">
            当前周
          </span>
        </div>

        <div class="topbar-actions">
          <div class="week-switcher" aria-label="切换周次">
            <button type="button" :disabled="schedule.viewedWeek.value <= 1" aria-label="上一周" @click="previousWeek">
              <ChevronLeft :size="18" />
            </button>
            <button type="button" class="week-switcher__today" @click="goToToday">回到今天</button>
            <button type="button" :disabled="schedule.viewedWeek.value >= schedule.settings.value.totalWeeks" aria-label="下一周" @click="nextWeek">
              <ChevronRight :size="18" />
            </button>
          </div>
          <button type="button" class="button button--ghost topbar-button" @click="importOpen = true">
            <Upload :size="17" />导入课表
          </button>
          <button type="button" class="button button--primary topbar-button" @click="openNewCourse">
            <Plus :size="18" />添加课程
          </button>
        </div>
      </header>

      <section class="summary-row" aria-label="课表概览">
        <div class="summary-copy">
          <span class="summary-icon"><Sparkles :size="20" /></span>
          <div>
            <strong>这周共有 {{ activeCourseCount }} 门课程</strong>
            <p>{{ activeSessions.length }} 个上课时段 · {{ activeCreditCount }} 学分</p>
          </div>
        </div>
        <div class="summary-actions">
          <button type="button" @click="exportBackup"><Download :size="16" />导出备份</button>
          <button type="button" @click="resetDemo"><RotateCcw :size="16" />恢复示例</button>
        </div>
      </section>

      <div class="workspace">
        <section class="schedule-card" aria-label="周课表">
          <div class="card-heading">
            <div>
              <p class="eyebrow">Weekly schedule</p>
              <h2>课程安排</h2>
            </div>
            <div class="legend">
              <span><i class="legend-dot legend-dot--active" />本周课程</span>
              <span><i class="legend-dot legend-dot--inactive" />非本周</span>
            </div>
          </div>

          <ScheduleGrid
            :settings="schedule.settings.value"
            :courses="schedule.courses.value"
            :week="schedule.viewedWeek.value"
            :dates="weekDates"
            :selected-day="schedule.selectedDay.value"
            @choose-day="schedule.selectedDay.value = $event"
            @edit="openCourse"
          />
        </section>

        <aside class="insight-panel" aria-label="当日课程详情">
          <section class="date-card side-card">
            <div class="date-card__top">
              <span class="date-number">{{ selectedDate.getDate() }}</span>
              <div>
                <p>第 {{ schedule.viewedWeek.value }} 周 · 周{{ ['一', '二', '三', '四', '五', '六', '日'][schedule.selectedDay.value - 1] }}</p>
                <h2>{{ formatFullChineseDate(selectedDate) }}</h2>
              </div>
            </div>
            <div class="date-card__progress">
              <span :style="{ width: `${weekProgress}%` }" />
            </div>
            <p class="date-card__foot">{{ selectedDaySessions.length ? `今天有 ${selectedDaySessions.length} 个课程时段` : '今天没有课程，适合安排自习' }}</p>
          </section>

          <section class="side-card today-card">
            <div class="side-card__heading">
              <div>
                <p class="eyebrow">Selected day</p>
                <h3>当日课程</h3>
              </div>
              <span>{{ selectedDaySessions.length }}</span>
            </div>

            <div v-if="selectedDaySessions.length" class="today-list">
              <button
                v-for="item in selectedDaySessions"
                :key="item.session.id"
                type="button"
                class="today-item"
                @click="openCourse({ courseId: item.course.id, sessionId: item.session.id })"
              >
                <i :style="{ backgroundColor: item.course.color }" />
                <div>
                  <strong>{{ item.course.name }}</strong>
                  <span><Clock3 :size="13" />{{ periodRange(item.session) }}</span>
                  <span><MapPin :size="13" />{{ item.session.room || '教室待定' }}</span>
                </div>
                <ArrowRight :size="16" />
              </button>
            </div>

            <div v-else class="empty-day">
              <span><CalendarCheck2 :size="26" /></span>
              <strong>暂无课程</strong>
              <p>点击课表上方“添加课程”安排新的上课时段。</p>
            </div>
          </section>

          <section class="side-card quick-card">
            <span class="quick-card__icon"><GraduationCap :size="21" /></span>
            <div>
              <p class="eyebrow">Import center</p>
              <h3>快速导入课表</h3>
              <p>备份导入已经可用，教务与文件解析器正在接入。</p>
            </div>
            <button type="button" aria-label="打开导入中心" @click="importOpen = true">
              <ArrowRight :size="18" />
            </button>
          </section>

          <button class="help-link" type="button" @click="upcomingFeature('使用帮助')">
            <CircleHelp :size="16" />导入遇到问题？查看使用帮助
          </button>
        </aside>
      </div>
    </main>

    <CourseEditorDialog
      :open="editorOpen"
      :settings="schedule.settings.value"
      :course="selectedCourse"
      :session="selectedSession"
      :default-day="schedule.selectedDay.value"
      :current-week="schedule.viewedWeek.value"
      @close="editorOpen = false; selected = null"
      @save="saveCourse"
      @delete="deleteCourseSession"
    />

    <ImportDialog
      :open="importOpen"
      @close="importOpen = false"
      @import-backup="importBackup"
      @export-backup="exportBackup"
    />

    <Transition name="toast">
      <div v-if="notice" class="toast-message" role="status">{{ notice }}</div>
    </Transition>
  </div>
</template>
