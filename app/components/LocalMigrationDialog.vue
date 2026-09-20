<script setup lang="ts">
import { ArrowRight, DatabaseBackup, HardDrive, LoaderCircle, ShieldCheck } from '@lucide/vue'
import type { ScheduleBackup } from '../types/schedule'

defineProps<{
  open: boolean
  backup: ScheduleBackup | null
  pending: boolean
}>()

const emit = defineEmits<{
  import: []
  dismiss: []
}>()

function sessionCount(backup: ScheduleBackup | null): number {
  return backup?.courses.reduce((total, course) => total + course.sessions.length, 0) ?? 0
}
</script>

<template>
  <BaseModal
    :open="open"
    title="发现这台电脑上的课表"
    description="云端课表目前为空，你可以把登录前保存的数据迁移到当前账号。"
    @close="pending ? undefined : emit('dismiss')"
  >
    <div v-if="backup" class="migration-content">
      <div class="migration-summary">
        <span><HardDrive :size="24" /></span>
        <div>
          <p>{{ backup.settings.name }}</p>
          <strong>{{ backup.courses.length }} 门课程 · {{ sessionCount(backup) }} 个时段</strong>
          <small>{{ backup.settings.termStart }} 开学 · 共 {{ backup.settings.totalWeeks }} 周</small>
        </div>
      </div>

      <div class="migration-note">
        <ShieldCheck :size="18" />
        <p><strong>不会静默覆盖数据</strong><span>只有云端仍为空时才允许迁移；成功提交后才移除旧的本地副本。</span></p>
      </div>
    </div>

    <template #footer>
      <button class="button button--ghost" type="button" :disabled="pending" @click="emit('dismiss')">
        暂不导入
      </button>
      <span class="modal-footer__spacer" />
      <button class="button button--primary" type="button" :disabled="pending" @click="emit('import')">
        <LoaderCircle v-if="pending" class="migration-spin" :size="17" />
        <DatabaseBackup v-else :size="17" />
        导入当前账号
        <ArrowRight v-if="!pending" :size="16" />
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.migration-content {
  display: grid;
  gap: 15px;
}

.migration-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e5e3f5;
  border-radius: 14px;
  background: #f8f7ff;
}

.migration-summary > span {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  color: #6659db;
  background: #fff;
  box-shadow: 0 7px 18px rgba(69, 56, 162, 0.1);
}

.migration-summary div {
  display: grid;
  gap: 3px;
}

.migration-summary p,
.migration-note p {
  margin: 0;
}

.migration-summary p {
  color: #22222e;
  font-size: 13px;
  font-weight: 800;
}

.migration-summary strong {
  color: #686979;
  font-size: 10px;
}

.migration-summary small {
  color: #9a9ba9;
  font-size: 9px;
}

.migration-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 11px;
  color: #267861;
  background: #eaf8f3;
}

.migration-note svg {
  flex: 0 0 auto;
}

.migration-note p {
  display: grid;
  gap: 3px;
}

.migration-note strong {
  font-size: 10px;
}

.migration-note span {
  color: #4f8575;
  font-size: 9px;
  line-height: 1.55;
}

.migration-spin {
  animation: migration-spin 0.8s linear infinite;
}

@keyframes migration-spin {
  to { transform: rotate(360deg); }
}
</style>
