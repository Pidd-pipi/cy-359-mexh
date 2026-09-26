from django.db import IntegrityError, OperationalError, transaction
from django.utils import timezone

import time

from .errors import AppError
from .models import Checkpoint, Checkin, Route, Team, TeamMember

OVERVIEW = {
  "appName": "城市定向越野活动平台",
  "appCode": "lporienteering",
  "description": "面向户外运动爱好者，提供定向越野线路设计、团队报名和积分排名的活动平台。",
  "features": [
    {
      "id": 1,
      "title": "活动线路设计与发布",
      "description": "管理员在地图上标记起点、终点和打卡点（CP点），设置各点线索和任务，发布活动时注明难度（亲子/成人/专业）、时长和装备要求。",
      "status": "已上线",
      "metric": "88%"
    },
    {
      "id": 2,
      "title": "线索打卡点（GPS/二维码）",
      "description": "参与者到达打卡点附近（GPS定位）或扫描二维码完成打卡，系统记录到达时间，打卡点可设置答题或拍照任务增加趣味性。",
      "status": "排期中",
      "metric": "31 单"
    },
    {
      "id": 3,
      "title": "团队报名与排名",
      "description": "用户以个人或团队形式报名，活动开始后系统记录各团队完成所有打卡点的总用时，按用时排名生成实时 leaderboard。",
      "status": "巡检中",
      "metric": "10 项"
    },
    {
      "id": 4,
      "title": "积分兑换商城",
      "description": "参与活动获得积分，积分可在商城兑换户外装备、活动优惠券或虚拟勋章，激励用户持续参与。",
      "status": "优化中",
      "metric": "4 级"
    },
    {
      "id": 5,
      "title": "历史线路收藏",
      "description": "用户可收藏感兴趣的已结束活动线路，查看其他参与者的成绩和路线轨迹，为下次报名提供参考。",
      "status": "可导出",
      "metric": "28 条"
    }
  ],
  "kpis": [
    {
      "label": "今日处理",
      "value": "132",
      "trend": "+12%",
      "tone": "primary"
    },
    {
      "label": "预约/订单",
      "value": "82",
      "trend": "+8%",
      "tone": "warm"
    },
    {
      "label": "履约率",
      "value": "90%",
      "trend": "+3%",
      "tone": "cool"
    },
    {
      "label": "待处理",
      "value": "5",
      "trend": "需跟进",
      "tone": "neutral"
    }
  ],
  "records": [
    {
      "key": "lporienteering-1",
      "name": "活动线路设计与发布",
      "owner": "运营组",
      "status": "已上线",
      "metric": "88%",
      "priority": "高"
    },
    {
      "key": "lporienteering-2",
      "name": "线索打卡点（GPS/二维码）",
      "owner": "管理员",
      "status": "排期中",
      "metric": "31 单",
      "priority": "中"
    },
    {
      "key": "lporienteering-3",
      "name": "团队报名与排名",
      "owner": "服务台",
      "status": "巡检中",
      "metric": "10 项",
      "priority": "低"
    },
    {
      "key": "lporienteering-4",
      "name": "积分兑换商城",
      "owner": "财务组",
      "status": "优化中",
      "metric": "4 级",
      "priority": "高"
    },
    {
      "key": "lporienteering-5",
      "name": "历史线路收藏",
      "owner": "审核组",
      "status": "可导出",
      "metric": "28 条",
      "priority": "中"
    }
  ]
}

DIFFICULTY_LABELS = dict(Route.DIFFICULTY_CHOICES)


def get_overview():
    return OVERVIEW


def _iso(dt):
    return dt.isoformat() if dt else None


def _route_status(route, now):
    if now < route.registration_deadline:
        return "报名中"
    if now < route.start_time:
        return "报名截止"
    return "赛事进行中"


def serialize_route(route, now=None):
    now = now or timezone.now()
    registered = route.teams.count()
    remaining = max(route.quota - registered, 0)
    return {
        "id": route.id,
        "name": route.name,
        "description": route.description,
        "difficulty": route.difficulty,
        "difficultyLabel": DIFFICULTY_LABELS.get(route.difficulty, route.difficulty),
        "quota": route.quota,
        "registered": registered,
        "remaining": remaining,
        "checkpointCount": route.checkpoints.count(),
        "registrationDeadline": _iso(route.registration_deadline),
        "startTime": _iso(route.start_time),
        "status": _route_status(route, now),
    }


def serialize_checkpoint(checkpoint):
    return {
        "id": checkpoint.id,
        "seq": checkpoint.seq,
        "name": checkpoint.name,
        "clue": checkpoint.clue,
    }


def serialize_team(team):
    return {
        "id": team.id,
        "name": team.name,
        "routeId": team.route_id,
        "members": [member.name for member in team.members.all()],
        "createdAt": _iso(team.created_at),
    }


def list_routes():
    now = timezone.now()
    routes = Route.objects.prefetch_related("teams", "checkpoints").all()
    return [serialize_route(route, now) for route in routes]


def get_route_detail(route_id):
    try:
        route = (
            Route.objects
            .prefetch_related("checkpoints", "teams__members")
            .get(id=route_id)
        )
    except Route.DoesNotExist:
        raise AppError("route_not_found", "线路不存在", status=404)
    payload = serialize_route(route)
    payload["checkpoints"] = [serialize_checkpoint(cp) for cp in route.checkpoints.all()]
    payload["teams"] = [serialize_team(team) for team in route.teams.all()]
    return payload


def list_route_teams(route_id):
    try:
        route = Route.objects.prefetch_related("teams__members").get(id=route_id)
    except Route.DoesNotExist:
        raise AppError("route_not_found", "线路不存在", status=404)
    return [serialize_team(team) for team in route.teams.all()]


def _normalize_members(member_names):
    if not isinstance(member_names, list):
        raise AppError("validation_error", "members 必须是字符串数组")
    cleaned = []
    seen = set()
    for raw in member_names:
        name = str(raw).strip()
        if not name:
            continue
        if name in seen:
            continue
        seen.add(name)
        cleaned.append(name)
    if not cleaned:
        raise AppError("validation_error", "至少需要一名队员（个人报名即本人）")
    if any(len(name) > 80 for name in cleaned):
        raise AppError("validation_error", "队员姓名过长")
    return cleaned


def _register_team_once(route_id, team_name, members):
    with transaction.atomic():
        route = Route.objects.select_for_update().get(id=route_id)
        now = timezone.now()
        if now >= route.registration_deadline:
            raise AppError("registration_closed", "报名已截止", status=409)

        registered = Team.objects.filter(route=route).count()
        if registered >= route.quota:
            raise AppError("route_full", "名额已满", status=409)

        conflicted = sorted(
            TeamMember.objects.filter(route=route, name__in=members)
            .values_list("name", flat=True)
        )
        if conflicted:
            raise AppError(
                "member_conflict",
                f"成员冲突：{'、'.join(conflicted)} 已报名本线路其他队伍",
                status=409,
            )

        if Team.objects.filter(route=route, name=team_name).exists():
            raise AppError("team_name_taken", "队伍名称已被使用", status=409)

        team = Team.objects.create(route=route, name=team_name)
        TeamMember.objects.bulk_create(
            [TeamMember(team=team, route=route, name=name) for name in members]
        )
        return team


def register_team(route_id, team_name, member_names):
    """报名队伍。

    并发安全：对线路行加 select_for_update 锁，把同一线路的报名串行化，
    抢最后名额或重复队员同时提交时，只有一笔事务能成功，其余收到
    名额已满 / 成员冲突。数据库唯一约束作为兜底。
    """
    team_name = (team_name or "").strip()
    if not team_name:
        raise AppError("validation_error", "队伍名称不能为空")
    if len(team_name) > 120:
        raise AppError("validation_error", "队伍名称过长")
    members = _normalize_members(member_names)

    attempts = 5
    for attempt in range(attempts):
        try:
            team = _register_team_once(route_id, team_name, members)
            break
        except Route.DoesNotExist:
            raise AppError("route_not_found", "线路不存在", status=404)
        except IntegrityError:
            # 唯一约束兜底（如数据库层面未拿到行锁的极端情况）
            raise AppError("member_conflict", "成员冲突：有成员已报名本线路其他队伍", status=409)
        except OperationalError:
            # sqlite 开发库写锁竞争：退避重试；PostgreSQL 行锁排队不会走到这里
            if attempt == attempts - 1:
                raise AppError("route_full", "名额已满", status=409)
            time.sleep(0.05 * (attempt + 1))

    return serialize_team(Team.objects.prefetch_related("members").get(id=team.id))


def record_checkin(team_id, checkpoint_id):
    try:
        team = Team.objects.select_related("route").get(id=team_id)
    except Team.DoesNotExist:
        raise AppError("team_not_found", "队伍不存在", status=404)
    try:
        checkpoint = Checkpoint.objects.get(id=checkpoint_id)
    except Checkpoint.DoesNotExist:
        raise AppError("checkpoint_not_found", "打卡点不存在", status=404)
    if checkpoint.route_id != team.route_id:
        raise AppError("validation_error", "打卡点不属于该队伍报名的线路")

    now = timezone.now()
    if now < team.route.start_time:
        raise AppError("race_not_started", "赛事尚未开始，无法打卡", status=409)

    existing = Checkin.objects.filter(team=team, checkpoint=checkpoint).first()
    if existing:
        return _serialize_checkin(existing, created=False)
    try:
        with transaction.atomic():
            checkin = Checkin.objects.create(team=team, checkpoint=checkpoint)
    except IntegrityError:
        checkin = Checkin.objects.get(team=team, checkpoint=checkpoint)
        return _serialize_checkin(checkin, created=False)
    return _serialize_checkin(checkin, created=True)


def _serialize_checkin(checkin, created):
    return {
        "id": checkin.id,
        "teamId": checkin.team_id,
        "checkpointId": checkin.checkpoint_id,
        "checkedAt": _iso(checkin.checked_at),
        "created": created,
    }


def list_team_checkins(team_id):
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        raise AppError("team_not_found", "队伍不存在", status=404)
    checkins = Checkin.objects.filter(team=team).select_related("checkpoint")
    return [
        {
            "id": c.id,
            "checkpointId": c.checkpoint_id,
            "checkpointName": c.checkpoint.name,
            "checkpointSeq": c.checkpoint.seq,
            "checkedAt": _iso(c.checked_at),
        }
        for c in checkins
    ]


def get_leaderboard(route_id):
    """总用时榜：只有走完全部检查点的队伍进榜，按总用时升序；
    缺卡队伍列入 inProgress，前端展示为“进行中”。
    """
    try:
        route = (
            Route.objects
            .prefetch_related("teams__members", "teams__checkins")
            .get(id=route_id)
        )
    except Route.DoesNotExist:
        raise AppError("route_not_found", "线路不存在", status=404)

    total_checkpoints = route.checkpoints.count()
    finished = []
    in_progress = []
    for team in route.teams.all():
        checkins = list(team.checkins.all())
        done = len({c.checkpoint_id for c in checkins})
        members = [m.name for m in team.members.all()]
        if total_checkpoints > 0 and done >= total_checkpoints:
            finished_at = max(c.checked_at for c in checkins)
            total_seconds = max((finished_at - route.start_time).total_seconds(), 0)
            finished.append({
                "teamId": team.id,
                "teamName": team.name,
                "members": members,
                "totalSeconds": int(total_seconds),
                "finishedAt": _iso(finished_at),
            })
        else:
            in_progress.append({
                "teamId": team.id,
                "teamName": team.name,
                "members": members,
                "doneCheckpoints": done,
                "totalCheckpoints": total_checkpoints,
                "lastCheckinAt": _iso(max((c.checked_at for c in checkins), default=None)),
            })

    finished.sort(key=lambda entry: (entry["totalSeconds"], entry["teamId"]))
    for index, entry in enumerate(finished, start=1):
        entry["rank"] = index
    in_progress.sort(key=lambda entry: (-entry["doneCheckpoints"], entry["teamId"]))

    return {
        "route": serialize_route(route),
        "started": timezone.now() >= route.start_time,
        "totalCheckpoints": total_checkpoints,
        "finished": finished,
        "inProgress": in_progress,
    }
