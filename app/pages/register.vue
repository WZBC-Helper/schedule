<script setup lang="ts">
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from '@lucide/vue'
import { authClient } from '~~/lib/auth-client'

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref('')

async function submit() {
  if (pending.value) return
  errorMessage.value = ''

  if (form.password !== form.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  pending.value = true
  try {
    const { error } = await authClient.signUp.email({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      callbackURL: '/',
    })

    if (error) {
      const message = error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
        ? '该邮箱已经注册，请直接登录'
        : (error.message || '注册失败，请稍后重试')
      throw new Error(message)
    }

    await navigateTo('/')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '注册失败，请稍后重试'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthShell eyebrow="Create account" title="开始新的学期" description="创建账号后，所有课程操作都会安全保存到你的账号">
    <form class="auth-form" @submit.prevent="submit">
      <label>
        <span>昵称</span>
        <div class="auth-input">
          <UserRound :size="17" />
          <input v-model="form.name" type="text" autocomplete="name" required maxlength="50" placeholder="怎么称呼你">
        </div>
      </label>

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
            autocomplete="new-password"
            required
            minlength="8"
            maxlength="128"
            placeholder="至少 8 个字符"
          >
          <button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
            <EyeOff v-if="showPassword" :size="17" />
            <Eye v-else :size="17" />
          </button>
        </div>
      </label>

      <label>
        <span>确认密码</span>
        <div class="auth-input">
          <LockKeyhole :size="17" />
          <input
            v-model="form.confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            minlength="8"
            maxlength="128"
            placeholder="再次输入密码"
          >
        </div>
      </label>

      <p v-if="errorMessage" class="auth-error" role="alert">
        <AlertCircle :size="16" />{{ errorMessage }}
      </p>

      <button class="auth-submit" type="submit" :disabled="pending">
        <LoaderCircle v-if="pending" class="spin" :size="18" />
        <template v-else>创建账号<ArrowRight :size="17" /></template>
      </button>
    </form>

    <p class="auth-switch">已经有账号？<NuxtLink to="/login">返回登录</NuxtLink></p>
  </AuthShell>
</template>

<style scoped src="~/assets/css/auth-form.css" />
