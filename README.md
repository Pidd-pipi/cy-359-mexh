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
- API 示例：http://localhost:28519/api/routes

## 项目主要功能

- **团队报名**：线路设置名额、难度（亲子/成人/专业）与报名截止时间；个人可单独成队，也可多人组队；同一线路内同一人只属于一支队伍。并发抢最后名额或重复队员同时提交时，只保留一支有效队伍，失败方收到「名额已满」或「成员冲突」。
- **余位查看**：线路列表实时展示已报/总名额与剩余名额，报名截止或名额已满时报名入口自动关闭。
- **现场打卡**：赛事开始后记录各队在各检查点（CP点）的打卡时间，重复打卡幂等处理。
- **赛后排名**：只有走完全部检查点的队伍进入总用时榜（总用时 = 最后一次打卡 − 开赛时间），按用时升序排名；缺卡队伍显示「进行中」及打卡进度。
- **数据持久化**：所有线路、队伍、打卡记录保存在 PostgreSQL 命名卷中，重启后记录仍在。
- 活动线路设计与发布、线索打卡点（GPS/二维码）、积分兑换商城、历史线路收藏等模块见运营总览页。

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
python manage.py migrate
python manage.py seed_demo   # 可选：写入演示线路/队伍/打卡数据
python manage.py runserver 0.0.0.0:29519
```

本地开发默认使用 SQLite（无需数据库）；设置 `DB_HOST` 等环境变量后切换为 PostgreSQL。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/routes` | 线路列表（名额、余位、难度、截止时间、状态） |
| GET | `/api/routes/<id>` | 线路详情（检查点 + 已报名队伍） |
| GET | `/api/routes/<id>/teams` | 线路已报名队伍 |
| POST | `/api/routes/<id>/teams` | 队伍报名，body：`{"name": "队名", "members": ["队员1"]}` |
| GET | `/api/routes/<id>/leaderboard` | 总用时榜 + 进行中队伍 |
| GET | `/api/teams/<id>/checkins` | 队伍打卡记录 |
| POST | `/api/teams/<id>/checkins` | 打卡，body：`{"checkpointId": 1}`（重复打卡幂等） |

报名冲突返回 `409` 与业务错误码：`route_full`（名额已满）、`member_conflict`（成员冲突）、`registration_closed`（报名已截止）、`team_name_taken`（队名重复）。

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
├── backend/              # 后端服务
│   ├── config/           # Django 配置与路由
│   └── domain/           # 模型、报名/打卡/排名业务逻辑、接口视图
│       ├── migrations/   # 数据库迁移
│       └── management/   # seed_demo 演示数据命令
├── database/             # 数据库结构参考脚本
├── frontend/             # 前端应用
│   └── src/
│       ├── api/          # API 客户端
│       ├── components/   # 线路报名、排名、打卡等组件
│       └── types/        # TypeScript 类型
├── docker-compose.yml    # 一键部署编排
├── .env.example          # 环境变量示例
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

## Docker 部署说明

- 使用 `docker compose up -d` 启动，不需要额外传入 `-p`。
- `docker-compose.yml` 顶层已声明 `name: lporienteering`，并且 `.env` 包含 `COMPOSE_PROJECT_NAME=lporienteering`，可在中文目录名下启动。
- 数据库数据保存在命名卷 `db_data` 中，不依赖当前目录名，重启后报名与打卡记录仍在。
- 后端容器启动时自动执行 `migrate`（建表）与 `seed_demo`（幂等演示数据），再启动 Gunicorn。
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
