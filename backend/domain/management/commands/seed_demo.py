from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from domain.models import Checkpoint, Checkin, Route, Team, TeamMember


ROUTES = [
    {
        "name": "滨江亲子趣味线",
        "description": "沿江绿道轻松行，适合家庭组队，打卡点设有亲子互动任务。",
        "difficulty": Route.DIFFICULTY_FAMILY,
        "quota": 8,
        "deadline_days": 7,
        "start_days": 1,
        "checkpoints": [
            "滨江公园南门",
            "彩虹桥观景平台",
            "灯塔草坪终点",
        ],
    },
    {
        "name": "城市成人挑战线",
        "description": "穿梭老城街巷，线索解谜与体能并重，完赛需走完全部 5 个检查点。",
        "difficulty": Route.DIFFICULTY_ADULT,
        "quota": 6,
        "deadline_days": -1,
        "start_hours": -3,
        "checkpoints": [
            "老城钟楼广场",
            "书院巷牌坊",
            "河埠头码头",
            "山顶气象台",
            "体育馆北门终点",
        ],
    },
    {
        "name": "山地专业越野线",
        "description": "山地穿越线路，爬升大、导航难，建议有越野经验的队伍报名。",
        "difficulty": Route.DIFFICULTY_PRO,
        "quota": 4,
        "deadline_days": 3,
        "start_days": 2,
        "checkpoints": [
            "林场入口",
            "溪谷渡口",
            "北坡瞭望塔",
            "山脊垭口",
            "古寺遗址",
            "终点营地",
        ],
    },
]

# 已开赛线路的演示队伍与打卡（分钟，相对开赛时间）
DEMO_TEAMS = {
    "城市成人挑战线": [
        {
            "name": "风行者",
            "members": ["李雷", "韩梅梅"],
            "checkins": [18, 42, 67, 91, 118],
        },
        {
            "name": "城市猎人",
            "members": ["王强"],
            "checkins": [26, 55, 88, 121, 149],
        },
        {
            "name": "夜跑小队",
            "members": ["赵敏", "陈晨", "刘洋"],
            "checkins": [31, 64, 102],
        },
    ],
}


class Command(BaseCommand):
    help = "写入演示线路/队伍/打卡数据（幂等，可重复执行）"

    def handle(self, *args, **options):
        now = timezone.now()
        for spec in ROUTES:
            deadline = now + timedelta(days=spec["deadline_days"])
            if "start_days" in spec:
                start = now + timedelta(days=spec["start_days"])
            else:
                start = now + timedelta(hours=spec["start_hours"])
            route, created = Route.objects.get_or_create(
                name=spec["name"],
                defaults={
                    "description": spec["description"],
                    "difficulty": spec["difficulty"],
                    "quota": spec["quota"],
                    "registration_deadline": deadline,
                    "start_time": start,
                },
            )
            if not created:
                continue
            checkpoints = [
                Checkpoint.objects.create(
                    route=route,
                    seq=index,
                    name=name,
                    clue=f"到达「{name}」附近，扫码或 GPS 确认打卡。",
                )
                for index, name in enumerate(spec["checkpoints"], start=1)
            ]
            for team_spec in DEMO_TEAMS.get(spec["name"], []):
                team = Team.objects.create(route=route, name=team_spec["name"])
                TeamMember.objects.bulk_create(
                    [TeamMember(team=team, route=route, name=m) for m in team_spec["members"]]
                )
                for checkpoint, minutes in zip(checkpoints, team_spec["checkins"]):
                    Checkin.objects.create(
                        team=team,
                        checkpoint=checkpoint,
                        checked_at=start + timedelta(minutes=minutes),
                    )
        self.stdout.write(self.style.SUCCESS("演示数据已就绪"))
