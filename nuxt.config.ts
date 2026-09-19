export default defineNuxtConfig({
  compatibilityDate: '2026-09-19',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '拾光课表',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'description', content: '简洁、离线优先的大学课程表' },
        { name: 'theme-color', content: '#f5f6fb' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  typescript: {
    typeCheck: true,
  },
})
