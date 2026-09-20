<script setup lang="ts">
import {
  Braces,
  CheckCircle2,
  ClipboardPaste,
  FileJson,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  UploadCloud,
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
  pending?: boolean
}>()

const emit = defineEmits<{
  close: []
  'import-backup': [payload: { text: string, name: string }]
  'export-backup': []
}>()

const backupInput = ref<HTMLInputElement | null>(null)
const selectedId = ref('academic')
const fileError = ref('')

const options = [
  { id: 'academic', title: '从教务系统导入', description: '登录学校教务并自动识别', icon: GraduationCap, tone: 'violet', state: '规划中' },
  { id: 'share', title: '分享口令导入', description: '粘贴 WakeUp 等分享数据', icon: KeyRound, tone: 'blue', state: '待接入' },
  { id: 'excel', title: 'Excel 导入', description: '上传 .xlsx 或 .xls 课表', icon: FileSpreadsheet, tone: 'green', state: '待接入' },
  { id: 'html', title: 'HTML 导入', description: '解析教务系统保存的网页', icon: Braces, tone: 'orange', state: '待接入' },
  { id: 'paste', title: '粘贴课程数据', description: '识别文本或标准 JSON', icon: ClipboardPaste, tone: 'pink', state: '待接入' },
  { id: 'backup', title: '从备份导入', description: '恢复本站导出的 JSON 备份', icon: FileJson, tone: 'slate', state: '可用' },
]

const selected = computed(() => options.find((item) => item.id === selectedId.value) ?? options[0]!)

async function handleBackupFile(event: Event) {
  if (props.pending) return
  fileError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    fileError.value = '备份文件不能超过 5 MB'
    return
  }
  try {
    const text = await file.text()
    emit('import-backup', { text, name: file.name })
  }
  catch {
    fileError.value = '无法读取这个文件，请确认文件没有损坏'
  }
}
</script>

<template>
  <BaseModal
    :open="props.open"
    title="导入课程表"
    description="选择数据来源。导入内容会先校验，确认有效后才替换本地课表。"
    width="wide"
    @close="pending ? undefined : emit('close')"
  >
    <div class="import-layout">
      <div class="import-options">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="import-option"
          :class="{ 'import-option--active': selectedId === option.id }"
          :disabled="pending"
          @click="selectedId = option.id; fileError = ''"
        >
          <span class="import-option__icon" :class="`import-option__icon--${option.tone}`">
            <component :is="option.icon" :size="21" />
          </span>
          <span class="import-option__copy">
            <strong>{{ option.title }}</strong>
            <small>{{ option.description }}</small>
          </span>
          <span class="status-chip" :class="{ 'status-chip--ready': option.state === '可用' }">{{ option.state }}</span>
        </button>
      </div>

      <div class="import-detail">
        <span class="import-detail__icon" :class="`import-option__icon--${selected.tone}`">
          <component :is="selected.icon" :size="26" />
        </span>
        <p class="eyebrow">{{ selected.state }}</p>
        <h3>{{ selected.title }}</h3>

        <template v-if="selected.id === 'backup'">
          <p>导入本站导出的完整备份，包含课程、上课时段、节次时间和学期设置。</p>
          <div class="security-note">
            <CheckCircle2 :size="17" />
            文件会在浏览器本地校验，不会上传到服务器。
          </div>
          <p v-if="fileError" class="inline-error" role="alert">{{ fileError }}</p>
          <input ref="backupInput" type="file" accept="application/json,.json" hidden @change="handleBackupFile">
          <div class="import-actions">
            <button type="button" class="button button--primary" :disabled="pending" @click="backupInput?.click()">
              <UploadCloud :size="17" />{{ pending ? '正在导入…' : '选择备份文件' }}
            </button>
            <button type="button" class="button button--ghost" :disabled="pending" @click="emit('export-backup')">导出当前课表</button>
          </div>
        </template>

        <template v-else>
          <p>该入口的界面与数据边界已经预留，解析器会在下一阶段接入。</p>
          <div class="import-roadmap">
            <span>下一步</span>
            <strong v-if="selected.id === 'academic'">浏览器扩展登录桥接 + 正方/强智适配器</strong>
            <strong v-else-if="selected.id === 'excel'">工作簿结构识别 + 导入预览</strong>
            <strong v-else-if="selected.id === 'html'">协议探测 + HTML 表格解析</strong>
            <strong v-else>格式识别 + 导入草稿预览</strong>
          </div>
        </template>
      </div>
    </div>
  </BaseModal>
</template>
