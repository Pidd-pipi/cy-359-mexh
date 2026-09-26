# 城市定向越野活动平台

面向户外运动爱好者，提供定向越野线路设计、团队报名和积分排名的活动平台。

## Docker Compose 快速启动

首次启动前复制环境变量文件：

```bash
cp .env.example .env
docker compose up -d
```

访问地址：

- 前端：http://localhost:28519
- 后端健康检查：http://localhost:29519/health
- API 示例：http://localhost:28519/api/overview

## 项目主要功能

- **线路发布与名额管理**：每条线路设置队伍名额、难度（亲子/成人/专业）、报名截止时间与若干检查点（CP 点），页面实时展示已报名数与剩余名额。
- **团队报名**：个人可以单独成队，也可以和他人组队报名；同一人在同一线路只能属于一支队伍。截止时间过后或赛事开始后停止报名。
- **并发报名控制**：报名在数据库事务内对线路加行级锁并配合唯一约束，抢最后一个名额或多支队伍同时提交同一成员时，只有一支队伍报名成功，失败方收到「名额已满」或「成员冲突」提示，不会出现超卖或重复队员。
- **打卡计时**：赛事开始后，各队按检查点编码打卡，系统记录每个 CP 的到达时间；重复打卡与未开赛打卡会被拒绝。
- **实时排名榜**：走完全部检查点的队伍按总用时（首次打卡到末次打卡）升序进入总用时榜；缺卡（尚未走完）的队伍单独显示为「进行中」并展示打卡进度。排名页每 10 秒自动刷新。
- **数据持久化**：报名、队伍、打卡成绩均存于 PostgreSQL 命名卷，后端容器重启后记录仍在；首次启动自动迁移并写入三条演示线路。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/courses` | 线路列表（含余位、难度、截止时间、检查点数量） |
| GET | `/api/courses/{id}` | 线路详情（含全部检查点） |
| POST | `/api/courses/{id}/register` | 报名（个人省略 `members`；组队传队员姓名数组） |
| POST | `/api/courses/{id}/start` | 开始赛事（开赛后停止报名、开放打卡） |
| POST | `/api/teams/{id}/punch` | 队伍打卡，请求体 `{"checkpointCode": "PRO-01"}` |
| GET | `/api/courses/{id}/leaderboard` | 总用时榜 + 缺卡进行中名单 |

业务失败统一返回 `409/404` 与 `{"code": "...", "message": "..."}`，常见 code：`capacity_full`（名额已满）、`member_conflict`（成员冲突）、`registration_closed`（报名截止）、`race_started`（赛事已开始）、`duplicate_punch`（重复打卡）。

## 本地开发方式

前端：

```bash
cd frontend
npm install
npm run dev
```

后端：

```bash
cd backend
pip install -r requirements.txt
python manage.py runserver 0.0.0.0:29519
```

## 技术栈

| 分层 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript、Ant Design、Vite |
| 后端 | Django + Python |
| 数据库 | PostgreSQL |
| 认证 | JWT |
| 依赖 | Django ORM、djangorestframework-simplejwt |

## 项目目录结构

```text
.
├── backend/                  # 后端服务
│   ├── config/               # Django 项目配置（settings/urls/wsgi）
│   ├── domain/               # 赛事业务域
│   │   ├── models.py         # Course/Checkpoint/Team/TeamMember/CourseMembership/Punch
│   │   ├── services.py       # 报名事务、打卡、排名计算
│   │   ├── views.py          # HTTP 接口
│   │   └── migrations/       # 建表迁移 + 演示数据种子
│   ├── entrypoint.sh         # 容器启动时自动 migrate 再启动 gunicorn
│   └── manage.py
├── database/                 # 数据库结构参考 SQL（建表以迁移为准）
├── frontend/                 # 前端应用
│   └── src/
│       ├── api/              # 接口请求封装
│       ├── components/       # 线路报名页、排名页、报名弹窗
│       ├── constants/        # 常量与提示文案
│       ├── routes/ styles/ types/
│       └── App.tsx
├── docker-compose.yml        # 一键部署编排
├── .env.example              # 环境变量示例
└── README.md
```

## 环境变量说明

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| COMPOSE_PROJECT_NAME | Compose 项目名，避免中文目录名导致项目名为空 | lporienteering |
| DB_NAME | 数据库名称 | app |
| DB_USER | 数据库用户 | app |
| DB_PASSWORD | 数据库密码 | app_pwd |
| DB_ROOT_PASSWORD | 数据库 root 密码 | root_pwd |
| JWT_SECRET | JWT 签名密钥 | change_me_to_a_long_random_string |
| FRONTEND_PORT | 前端宿主机端口 | 28519 |
| BACKEND_PORT | 后端宿主机端口 | 29519 |
| DB_PORT | 数据库宿主机端口 | 5432 |
| GUNICORN_WORKERS | 后端 Gunicorn 工作进程数 | 3 |

## Docker 部署说明

- 使用 `docker compose up -d` 启动，不需要额外传入 `-p`。
- `docker-compose.yml` 顶层已声明 `name: lporienteering`，并且 `.env` 包含 `COMPOSE_PROJECT_NAME=lporienteering`，可在中文目录名下启动。
- 数据库数据保存在命名卷 `db_data` 中，不依赖当前目录名。
- 前端容器由 Nginx 托管静态资源，并把 `/api/` 反向代理到 `backend:29519`。
- 若本地端口冲突，可修改 `.env` 中的 `FRONTEND_PORT`、`BACKEND_PORT`、`DB_PORT`。

常用命令：

```bash
docker compose config --quiet
docker compose ps
docker compose down
```

## License

MIT
