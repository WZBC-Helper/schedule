# 拾光课表

面向 PC 浏览器的课程表网站，使用 Nuxt 4、Vue 3、Better Auth、Drizzle ORM 与 MySQL 8 构建。

## 本地开发

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:migrate
pnpm dev
```

先在 MySQL 中创建 `wzbc_schedule` 数据库，再按本机环境修改 `.env` 中的 `DATABASE_URL`、`BETTER_AUTH_SECRET` 和 `BETTER_AUTH_URL`。默认网站地址为 `http://localhost:3000`。

生产环境必须使用独立的最小权限 MySQL 账号和高熵认证密钥，不要使用 `root`，也不要提交 `.env`。

## 当前能力

- 桌面端周课表与周次切换
- 按当前周过滤并淡化非本周课程
- 邮箱密码注册、登录、数据库 Session 与退出登录
- 未登录页面守卫及所有业务 API 的服务端鉴权
- 按用户隔离的 MySQL 云端课表
- 新增、编辑和删除课程时段
- revision 乐观锁，避免多标签页或多设备静默覆盖
- JSON 备份导入与导出
- 登录后可选择迁移旧版浏览器本地课表

HTML、Excel、分享口令和教务系统直连入口已经纳入界面，解析器将在后续阶段逐项接入。

## 数据库

```powershell
pnpm db:generate # 根据 schema 生成迁移
pnpm db:migrate  # 应用尚未执行的迁移
pnpm db:studio   # 打开 Drizzle Studio
```

初始迁移创建 Better Auth 所需的用户、账号、Session、验证和限流表，以及 `schedules`、`courses`、`course_sessions` 三张业务表。业务数据通过外键与登录用户关联并启用级联删除。

## 校验

```powershell
pnpm typecheck
pnpm test
pnpm build
```

邮箱验证和密码重置需要额外配置 SMTP 或邮件服务，当前本地版本暂未启用这两项能力。
