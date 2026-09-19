# 拾光课表

面向 PC 浏览器的课程表网站初版，使用 Nuxt 4、Vue 3 和 TypeScript 构建。

## 本地开发

```powershell
pnpm install
pnpm dev
```

默认地址为 `http://localhost:3000`。

## 当前能力

- 桌面端周课表与周次切换
- 按当前周过滤并淡化非本周课程
- 本地新增、编辑和删除课程时段
- JSON 备份导入与导出
- 数据保存在浏览器本地，不需要账号

HTML、Excel、分享口令和教务系统直连入口已经纳入界面，解析器将在后续阶段逐项接入。

## 校验

```powershell
pnpm typecheck
pnpm test
pnpm build
```
