-- 城市定向越野活动平台 · 数据库结构参考
--
-- 实际建表由 Django migrations 完成（后端容器启动时执行 `python manage.py migrate`），
-- 本文件仅作为数据模型的 SQL 参考，不需要手动导入。
-- 演示线路、检查点与打卡成绩由迁移 0002_seed_data 自动写入。

-- 线路：名额、难度、报名截止时间
CREATE TABLE IF NOT EXISTS course (
  id                BIGSERIAL PRIMARY KEY,
  name              VARCHAR(120) NOT NULL UNIQUE,
  description       VARCHAR(500) NOT NULL DEFAULT '',
  difficulty        VARCHAR(16)  NOT NULL DEFAULT 'adult', -- family/adult/pro
  capacity          INTEGER      NOT NULL,                  -- 队伍名额
  register_deadline TIMESTAMPTZ  NOT NULL,                  -- 报名截止时间
  started           BOOLEAN      NOT NULL DEFAULT FALSE,    -- 赛事是否已开始
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 检查点（CP）
CREATE TABLE IF NOT EXISTS checkpoint (
  id        BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  "order"   INTEGER NOT NULL,
  code      VARCHAR(40) NOT NULL,
  name      VARCHAR(120) NOT NULL,
  UNIQUE (course_id, "order")
);

-- 队伍
CREATE TABLE IF NOT EXISTS team (
  id          BIGSERIAL PRIMARY KEY,
  course_id   BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  leader_name VARCHAR(80)  NOT NULL,
  contact     VARCHAR(120) NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, name)
);

-- 队伍成员
CREATE TABLE IF NOT EXISTS team_member (
  id      BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  name    VARCHAR(80) NOT NULL,
  UNIQUE (team_id, name)
);

-- 线路级成员占位：跨队伍唯一，保证“同一人在同一线路只属于一支队伍”
CREATE TABLE IF NOT EXISTS course_membership (
  id          BIGSERIAL PRIMARY KEY,
  course_id   BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  team_id     BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  member_name VARCHAR(80) NOT NULL,
  UNIQUE (course_id, member_name)
);

-- 打卡记录：一队在一个检查点至多一次
CREATE TABLE IF NOT EXISTS punch (
  id            BIGSERIAL PRIMARY KEY,
  team_id       BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  checkpoint_id BIGINT NOT NULL REFERENCES checkpoint(id) ON DELETE CASCADE,
  punched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, checkpoint_id)
);

-- 排名口径（由应用层计算）：
-- 走完全部检查点的队伍按 (最后打卡时间 - 首次打卡时间) 升序上榜；
-- 打卡数不足检查点数的队伍状态为“进行中”。
