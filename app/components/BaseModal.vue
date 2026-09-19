<script setup lang="ts">
import { X } from '@lucide/vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  width?: 'regular' | 'wide'
}>(), {
  description: '',
  width: 'regular',
})

const emit = defineEmits<{
  close: []
}>()

const titleId = `modal-title-${Math.random().toString(36).slice(2)}`

function handleKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') emit('close')
}

watch(() => props.open, (open) => {
  if (!import.meta.client) return
  document.body.classList.toggle('modal-open', open)
})

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (import.meta.client) document.body.classList.remove('modal-open')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="modal-backdrop"
        @mousedown.self="emit('close')"
      >
        <section
          class="modal-panel"
          :class="{ 'modal-panel--wide': width === 'wide' }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <header class="modal-header">
            <div>
              <h2 :id="titleId">{{ title }}</h2>
              <p v-if="description">{{ description }}</p>
            </div>
            <button class="icon-button" type="button" aria-label="关闭" @click="emit('close')">
              <X :size="20" />
            </button>
          </header>

          <div class="modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
