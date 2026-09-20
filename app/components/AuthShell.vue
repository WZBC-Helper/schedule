<script setup lang="ts">
import { CalendarDays, Cloud, LockKeyhole, ShieldCheck } from '@lucide/vue'

defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <main class="auth-page">
    <section class="auth-story" aria-label="产品介绍">
      <NuxtLink class="auth-brand" to="/">
        <span><CalendarDays :size="25" /></span>
        <div>
          <strong>拾光课表</strong>
          <small>Schedule</small>
        </div>
      </NuxtLink>

      <div class="auth-story__content">
        <p class="auth-kicker">A clearer semester</p>
        <h1>把每一周，<br>安排得从容一些。</h1>
        <p>课程、教室、周次与作息集中管理，在不同设备上继续你的学期计划。</p>

        <div class="auth-points">
          <div>
            <span><Cloud :size="18" /></span>
            <p><strong>账号云端保存</strong><small>登录后课表按账号隔离存储</small></p>
          </div>
          <div>
            <span><ShieldCheck :size="18" /></span>
            <p><strong>服务端权限校验</strong><small>每次读取和修改都验证身份</small></p>
          </div>
          <div>
            <span><LockKeyhole :size="18" /></span>
            <p><strong>安全会话</strong><small>密码加密，登录状态使用 HttpOnly Cookie</small></p>
          </div>
        </div>
      </div>

      <p class="auth-story__foot">© 2026 拾光课表 · 专注你的每一节课</p>
    </section>

    <section class="auth-main">
      <div class="auth-card">
        <header>
          <p>{{ eyebrow }}</p>
          <h2>{{ title }}</h2>
          <span>{{ description }}</span>
        </header>
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(410px, 0.9fr) minmax(520px, 1.1fr);
  background: #f6f6fa;
}

.auth-story {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow: hidden;
  padding: 38px 52px 34px;
  color: #fff;
  background:
    radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.18), transparent 28%),
    radial-gradient(circle at 85% 82%, rgba(166, 136, 255, 0.34), transparent 32%),
    linear-gradient(145deg, #5042ca 0%, #6f63e8 48%, #8b6ee5 100%);
}

.auth-story::before,
.auth-story::after {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  content: '';
}

.auth-story::before {
  width: 440px;
  height: 440px;
  right: -220px;
  top: 12%;
}

.auth-story::after {
  width: 240px;
  height: 240px;
  left: -120px;
  bottom: 8%;
}

.auth-brand {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  text-decoration: none;
}

.auth-brand > span {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 30px rgba(32, 22, 106, 0.22);
  backdrop-filter: blur(10px);
}

.auth-brand div {
  display: grid;
  gap: 2px;
}

.auth-brand strong {
  font-size: 17px;
  letter-spacing: 0.05em;
}

.auth-brand small {
  color: rgba(255, 255, 255, 0.64);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.auth-story__content {
  position: relative;
  z-index: 1;
  width: min(480px, 100%);
  margin: auto 0;
  padding: 54px 0;
}

.auth-kicker {
  margin: 0 0 18px;
  color: #d8d3ff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.auth-story h1 {
  margin: 0;
  font-size: clamp(38px, 4vw, 58px);
  line-height: 1.18;
  letter-spacing: -0.055em;
}

.auth-story__content > p:not(.auth-kicker) {
  max-width: 420px;
  margin: 22px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  line-height: 1.9;
}

.auth-points {
  display: grid;
  gap: 10px;
  margin-top: 38px;
}

.auth-points > div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.07);
}

.auth-points > div > span {
  display: grid;
  width: 35px;
  height: 35px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: #e4e0ff;
  background: rgba(255, 255, 255, 0.1);
}

.auth-points p {
  display: grid;
  gap: 2px;
  margin: 0;
}

.auth-points strong {
  font-size: 11px;
}

.auth-points small {
  color: rgba(255, 255, 255, 0.56);
  font-size: 9px;
}

.auth-story__foot {
  position: relative;
  z-index: 1;
  margin: 0;
  color: rgba(255, 255, 255, 0.48);
  font-size: 9px;
}

.auth-main {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 44px;
}

.auth-card {
  width: min(430px, 100%);
  padding: 38px 40px;
  border: 1px solid #e7e7ef;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 22px 70px rgba(41, 37, 79, 0.1);
}

.auth-card header > p {
  margin: 0 0 9px;
  color: #6f63e8;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.auth-card header h2 {
  margin: 0;
  font-size: 27px;
  letter-spacing: -0.04em;
}

.auth-card header span {
  display: block;
  margin-top: 8px;
  color: #9293a2;
  font-size: 11px;
  line-height: 1.6;
}

@media (max-width: 920px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-story {
    min-height: auto;
    padding: 24px 30px;
  }

  .auth-story__content,
  .auth-story__foot {
    display: none;
  }

  .auth-main {
    min-height: calc(100vh - 92px);
    padding: 30px 20px;
  }
}
</style>
