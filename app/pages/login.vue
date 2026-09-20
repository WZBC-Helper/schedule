<script setup lang="ts">
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from '@lucide/vue'
import { authClient } from '~~/lib/auth-client'

const route = useRoute()
const form = reactive({
  email: '',
  password: '',
  rememberMe: true,
})
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref('')

function safeRedirect(): string {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

async function submit() {
  if (pending.value) return
  errorMessage.value = ''
  pending.value = true

  try {
    const { error } = await authClient.signIn.email({
      email: form.email.trim(),
      password: form.password,
      rememberMe: form.rememberMe,
    })

    if (error) {
      throw new Error(error.status === 401 ? '邮箱或密码不正确' : (error.message || '登录失败，请稍后重试'))
    }

    await navigateTo(safeRedirect())
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthShell eyebrow="Welcome back" title="登录你的课表" description="登录后才能查看和管理课程数据">
    <form class="auth-form" @submit.prevent="submit">
      <label>
        <span>邮箱</span>
        <div class="auth-input">
          <Mail :size="17" />
          <input v-model="form.email" type="email" autocomplete="email" required placeholder="name@example.com">
        </div>
      </label>

      <label>
        <span>密码</span>
        <div class="auth-input">
          <LockKeyhole :size="17" />
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            minlength="8"
            placeholder="输入密码"
          >
          <button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
            <EyeOff v-if="showPassword" :size="17" />
            <Eye v-else :size="17" />
          </button>
        </div>
      </label>

      <label class="auth-checkbox">
        <input v-model="form.rememberMe" type="checkbox">
        <span>在这台设备上保持登录</span>
      </label>

      <p v-if="errorMessage" class="auth-error" role="alert">
        <AlertCircle :size="16" />{{ errorMessage }}
      </p>

      <button class="auth-submit" type="submit" :disabled="pending">
        <LoaderCircle v-if="pending" class="spin" :size="18" />
        <template v-else>登录<ArrowRight :size="17" /></template>
      </button>
    </form>

    <p class="auth-switch">还没有账号？<NuxtLink to="/register">创建账号</NuxtLink></p>
  </AuthShell>
</template>

<style scoped src="~/assets/css/auth-form.css" />
