-- 城市定向越野活动平台数据库结构说明
-- 注意：实际建表由后端 Django 迁移（domain/migrations）在容器启动时自动执行，
-- 本脚本仅作为结构参考，不需要手动导入。

CREATE TABLE IF NOT EXISTS domain_route (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty VARCHAR(20) NOT NULL,          -- family 亲子 / adult 成人 / pro 专业
  quota INTEGER NOT NULL,                   -- 队伍名额
  registration_deadline TIMESTAMPTZ NOT NULL, -- 报名截止时间
  start_time TIMESTAMPTZ NOT NULL,          -- 赛事开始时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS domain_checkpoint (
  id BIGSERIAL PRIMARY KEY,
  route_id BIGINT NOT NULL REFERENCES domain_route(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,                     -- 打卡顺序
  name VARCHAR(120) NOT NULL,
  clue VARCHAR(255) NOT NULL DEFAULT '',
  CONSTRAINT uniq_checkpoint_seq_per_route UNIQUE (route_id, seq)
);

CREATE TABLE IF NOT EXISTS domain_team (
  id BIGSERIAL PRIMARY KEY,
  route_id BIGINT NOT NULL REFERENCES domain_route(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_team_name_per_route UNIQUE (route_id, name)
);

CREATE TABLE IF NOT EXISTS domain_teammember (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES domain_team(id) ON DELETE CASCADE,
  route_id BIGINT NOT NULL REFERENCES domain_route(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  -- 同一线路内同一人只属于一支队伍
  CONSTRAINT uniq_member_per_route UNIQUE (route_id, name),
  CONSTRAINT uniq_member_per_team UNIQUE (team_id, name)
);

CREATE TABLE IF NOT EXISTS domain_checkin (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES domain_team(id) ON DELETE CASCADE,
  checkpoint_id BIGINT NOT NULL REFERENCES domain_checkpoint(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_checkin_per_checkpoint UNIQUE (team_id, checkpoint_id)
);
