from django.db import transaction
from django.db.models import Count, Prefetch
from django.utils import timezone

from .errors import AppError, ERROR_MESSAGES
from .models import Checkpoint, Course, CourseMembership, Punch, Team, TeamMember

OVERVIEW = {
    "appName": "城市定向越野活动平台",
    "appCode": "lporienteering",
    "description": "面向户外运动爱好者，提供定向越野线路设计、团队报名与赛后排名的活动平台。",
}


def get_overview():
    return OVERVIEW


# ---------------------------------------------------------------------------
# 序列化辅助
# ---------------------------------------------------------------------------

def _iso(value):
    if value is None:
        return None
    return value.isoformat()


def _course_status(course):
    """线路对外状态：
    - open：报名进行中
    - closed：报名已截止但赛事未开始
    - started：赛事已开始（打卡阶段）
    """

    if course.started:
        return "started"
    if timezone.now() >= course.register_deadline:
        return "closed"
    return "open"


def serialize_checkpoint(checkpoint):
    return {
        "id": checkpoint.id,
        "order": checkpoint.order,
        "code": checkpoint.code,
        "name": checkpoint.name,
    }


def serialize_course(course):
    registered = getattr(course, "registered_teams", None)
    if registered is None:
        registered = course.teams.count()
    remaining = max(course.capacity - registered, 0)
    status = _course_status(course)
    checkpoint_count = getattr(course, "checkpoint_count", None)
    if checkpoint_count is None:
        prefetched = getattr(course, "_prefetched_objects_cache", {})
        if "checkpoints" in prefetched:
            checkpoint_count = len(prefetched["checkpoints"])
        else:
            checkpoint_count = course.checkpoints.count()
    return {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "difficulty": course.difficulty,
        "difficultyLabel": Course.Difficulty(course.difficulty).label,
        "capacity": course.capacity,
        "registeredTeams": registered,
        "remainingSlots": remaining,
        "registerDeadline": _iso(course.register_deadline),
        "started": course.started,
        "status": status,
        "checkpointCount": checkpoint_count,
    }


def serialize_course_detail(course):
    data = serialize_course(course)
    data["checkpoints"] = [
        serialize_checkpoint(cp) for cp in course.checkpoints.all()
    ]
    return data


def serialize_team(team):
    return {
        "id": team.id,
        "name": team.name,
        "leaderName": team.leader_name,
        "contact": team.contact,
        "members": [m.name for m in team.members.all()],
        "createdAt": _iso(team.created_at),
    }


# ---------------------------------------------------------------------------
# 查询
# ---------------------------------------------------------------------------

def list_courses():
    courses = (
        Course.objects.annotate(registered_teams=Count("teams", distinct=True))
        .prefetch_related(
            Prefetch(
                "checkpoints",
                queryset=Checkpoint.objects.order_by("order"),
            )
        )
        .all()
    )
    # 名额走注解、检查点数走 prefetch 缓存，避免 N+1
    return [serialize_course(course) for course in courses]


def _get_course(course_id, for_update=False):
    queryset = Course.objects
    if for_update:
        queryset = queryset.select_for_update()
    try:
        return queryset.prefetch_related(
            Prefetch("checkpoints", queryset=Checkpoint.objects.order_by("order"))
        ).get(pk=course_id)
    except Course.DoesNotExist:
        raise AppError("course_not_found", ERROR_MESSAGES["course_not_found"], 404)


def get_course_detail(course_id):
    course = _get_course(course_id)
    return serialize_course_detail(course)


# ---------------------------------------------------------------------------
# 报名（个人可单独成队，也可组队；同一人只属于一支队伍）
# ---------------------------------------------------------------------------

def _normalize_members(payload, leader_name):
    raw_members = payload.get("members")
    if raw_members is None:
        # 未显式传 members：个人单独成队
        members = [leader_name]
    elif isinstance(raw_members, str):
        members = [raw_members]
    elif isinstance(raw_members, list):
        members = raw_members
    else:
        raise AppError("invalid_members", ERROR_MESSAGES["invalid_members"], 400)

    cleaned = []
    for name in members:
        if not isinstance(name, str):
            raise AppError("invalid_members", ERROR_MESSAGES["invalid_members"], 400)
        name = name.strip()
        if name:
            cleaned.append(name)

    if leader_name not in cleaned:
        # 队长始终计入成员
        cleaned.append(leader_name)

    # 去重（保序）
    seen = set()
    unique_members = []
    for name in cleaned:
        if name not in seen:
            seen.add(name)
            unique_members.append(name)

    if not unique_members:
        raise AppError("invalid_members", ERROR_MESSAGES["invalid_members"], 400)
    return unique_members


def register_team(course_id, payload):
    if not isinstance(payload, dict):
        payload = {}

    team_name = str(payload.get("teamName", "")).strip()
    leader_name = str(payload.get("leaderName", "")).strip()
    contact = str(payload.get("contact", "")).strip()

    if not team_name:
        raise AppError("invalid_team_name", "请填写队伍名称", 400)
    if not leader_name:
        raise AppError("invalid_leader", "请填写队长姓名", 400)

    members = _normalize_members(payload, leader_name)

    # 行级锁串行化同一线路的并发报名，杜绝“抢最后名额”双花
    with transaction.atomic():
        course = _get_course(course_id, for_update=True)

        if course.started:
            raise AppError(
                "race_started", ERROR_MESSAGES["race_started"], 409
            )
        if timezone.now() >= course.register_deadline:
            raise AppError(
                "registration_closed", ERROR_MESSAGES["registration_closed"], 409
            )

        registered = course.teams.count()
        if registered >= course.capacity:
            raise AppError("capacity_full", ERROR_MESSAGES["capacity_full"], 409)

        if course.teams.filter(name=team_name).exists():
            raise AppError(
                "team_name_conflict",
                ERROR_MESSAGES["team_name_conflict"],
                409,
            )

        conflict = CourseMembership.objects.filter(
            course=course, member_name__in=members
        ).first()
        if conflict is not None:
            raise AppError(
                "member_conflict",
                ERROR_MESSAGES["member_conflict"] % conflict.member_name,
                409,
            )

        team = Team.objects.create(
            course=course,
            name=team_name,
            leader_name=leader_name,
            contact=contact,
        )
        TeamMember.objects.bulk_create(
            [TeamMember(team=team, name=name) for name in members]
        )
        CourseMembership.objects.bulk_create(
            [
                CourseMembership(course=course, team=team, member_name=name)
                for name in members
            ]
        )

    team.refresh_from_db()
    return serialize_team(team)


# ---------------------------------------------------------------------------
# 赛事开始 & 打卡
# ---------------------------------------------------------------------------

def start_race(course_id):
    with transaction.atomic():
        course = _get_course(course_id, for_update=True)
        if not course.started:
            course.started = True
            course.save(update_fields=["started"])
    return serialize_course_detail(course)


def punch(team_id, checkpoint_code):
    checkpoint_code = str(checkpoint_code or "").strip()
    if not checkpoint_code:
        raise AppError(
            "checkpoint_not_found", ERROR_MESSAGES["checkpoint_not_found"], 404
        )

    with transaction.atomic():
        try:
            team = (
                Team.objects.select_for_update()
                .select_related("course")
                .prefetch_related(
                    Prefetch(
                        "course__checkpoints",
                        queryset=Checkpoint.objects.order_by("order"),
                    )
                )
                .get(pk=team_id)
            )
        except Team.DoesNotExist:
            raise AppError(
                "team_not_found", ERROR_MESSAGES["team_not_found"], 404
            )

        course = team.course
        if not course.started:
            raise AppError(
                "race_not_started", ERROR_MESSAGES["race_not_started"], 409
            )

        try:
            checkpoint = course.checkpoints.get(code=checkpoint_code)
        except Checkpoint.DoesNotExist:
            raise AppError(
                "checkpoint_not_found",
                ERROR_MESSAGES["checkpoint_not_found"],
                404,
            )

        if Punch.objects.filter(team=team, checkpoint=checkpoint).exists():
            raise AppError(
                "duplicate_punch", ERROR_MESSAGES["duplicate_punch"], 409
            )

        punch_record = Punch.objects.create(team=team, checkpoint=checkpoint)

    return {
        "teamId": team.id,
        "checkpoint": serialize_checkpoint(checkpoint),
        "punchedAt": _iso(punch_record.punched_at),
    }


# ---------------------------------------------------------------------------
# 排名榜：走完全部检查点进总用时榜，缺卡显示进行中
# ---------------------------------------------------------------------------

def get_leaderboard(course_id):
    course = _get_course(course_id)
    checkpoints = list(course.checkpoints.all())
    total_cp = len(checkpoints)

    teams = (
        course.teams.prefetch_related(
            Prefetch("members", queryset=TeamMember.objects.order_by("id")),
            Prefetch(
                "punches",
                queryset=Punch.objects.select_related("checkpoint").order_by(
                    "punched_at"
                ),
            ),
        )
        .all()
    )

    finished_rows = []
    ongoing_rows = []

    for team in teams:
        punches = list(team.punches.all())
        punch_count = len(punches)
        punched_codes = {p.checkpoint.code for p in punches}
        started_racing = punch_count > 0

        row = {
            "teamId": team.id,
            "teamName": team.name,
            "leaderName": team.leader_name,
            "members": [m.name for m in team.members.all()],
            "punchCount": punch_count,
            "checkpointCount": total_cp,
            "punchedCheckpoints": sorted(
                punched_codes,
                key=lambda code: next(
                    (cp.order for cp in checkpoints if cp.code == code), 0
                ),
            ),
            "started": started_racing,
            "finished": False,
            "totalSeconds": None,
            "totalTimeLabel": None,
            "startTime": None,
            "finishTime": None,
        }

        if total_cp > 0 and punch_count >= total_cp:
            start_time = punches[0].punched_at
            finish_time = punches[-1].punched_at
            total_seconds = (finish_time - start_time).total_seconds()
            if total_seconds < 0:
                total_seconds = 0
            row.update(
                {
                    "finished": True,
                    "totalSeconds": int(total_seconds),
                    "totalTimeLabel": format_duration(total_seconds),
                    "startTime": _iso(start_time),
                    "finishTime": _iso(finish_time),
                }
            )
            finished_rows.append(row)
        else:
            ongoing_rows.append(row)

    # 完成队伍按总用时升序排名
    finished_rows.sort(key=lambda r: r["totalSeconds"])
    for index, row in enumerate(finished_rows, start=1):
        row["rank"] = index
    for row in ongoing_rows:
        row["rank"] = None

    return {
        "course": serialize_course_detail(course),
        "totalCheckpoints": total_cp,
        "finished": finished_rows,
        "ongoing": ongoing_rows,
    }


def format_duration(seconds):
    seconds = int(seconds)
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    parts = []
    if hours:
        parts.append(f"{hours}小时")
    if minutes or hours:
        parts.append(f"{minutes}分")
    parts.append(f"{secs}秒")
    return "".join(parts)
