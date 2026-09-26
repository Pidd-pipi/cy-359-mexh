"""初始化演示线路：三条不同难度的线路，其中专业线路已开赛并带打卡成绩。"""

from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def seed(apps, schema_editor):
    Course = apps.get_model("domain", "Course")
    Checkpoint = apps.get_model("domain", "Checkpoint")
    Team = apps.get_model("domain", "Team")
    TeamMember = apps.get_model("domain", "TeamMember")
    CourseMembership = apps.get_model("domain", "CourseMembership")
    Punch = apps.get_model("domain", "Punch")

    if Course.objects.exists():
        return

    now = timezone.now()

    # 1. 亲子线：报名中，名额 4
    family = Course.objects.create(
        name="滨江公园亲子寻宝线",
        description="沿江公园平路 3 公里，线索简单、任务趣味化，适合 6 岁以上家庭组队。",
        difficulty="family",
        capacity=4,
        register_deadline=now + timedelta(days=3),
        started=False,
    )
    family_cps = [
        ("FAM-01", "风筝广场"),
        ("FAM-02", "樱花步道"),
        ("FAM-03", "江边风车"),
    ]
    for order, (code, name) in enumerate(family_cps, start=1):
        Checkpoint.objects.create(
            course=family, order=order, code=code, name=name
        )

    # 2. 成人线：报名中，名额 6，截止时间较紧
    adult = Course.objects.create(
        name="老城街巷穿越线",
        description="穿梭老城胡同与城市地标，全程约 8 公里，考验路线规划与团队分工。",
        difficulty="adult",
        capacity=6,
        register_deadline=now + timedelta(hours=20),
        started=False,
    )
    adult_cps = [
        ("ADT-01", "钟楼起点"),
        ("ADT-02", "石板巷"),
        ("ADT-03", "文庙"),
        ("ADT-04", "河滨码头"),
        ("ADT-05", "南门城楼"),
    ]
    for order, (code, name) in enumerate(adult_cps, start=1):
        Checkpoint.objects.create(course=adult, order=order, code=code, name=name)

    # 3. 专业线：已开赛，名额 5，含两支已完赛队伍和一支缺卡队伍
    pro = Course.objects.create(
        name="西山山脊专业竞速线",
        description="山地越野 15 公里、累计爬升 600 米，强制装备头灯与急救包，限专业选手。",
        difficulty="pro",
        capacity=5,
        register_deadline=now - timedelta(hours=2),
        started=True,
    )
    pro_cps = [
        ("PRO-01", "西山北门"),
        ("PRO-02", "望风亭"),
        ("PRO-03", "鹰嘴崖"),
        ("PRO-04", "松林坡"),
        ("PRO-05", "山顶终点"),
    ]
    cps = []
    for order, (code, name) in enumerate(pro_cps, start=1):
        cps.append(
            Checkpoint.objects.create(course=pro, order=order, code=code, name=name)
        )

    def make_team(name, leader, members):
        team = Team.objects.create(
            course=pro, name=name, leader_name=leader, contact=""
        )
        TeamMember.objects.bulk_create(
            [TeamMember(team=team, name=member) for member in members]
        )
        CourseMembership.objects.bulk_create(
            [
                CourseMembership(course=pro, team=team, member_name=member)
                for member in members
            ]
        )
        return team

    # 疾风队：42 分钟完赛
    fast = make_team("疾风队", "李雷", ["李雷", "韩梅梅", "王强"])
    fast_schedule = [-42, -33, -24, -13, 0]
    Punch.objects.bulk_create(
        [
            Punch(team=fast, checkpoint=cps[i], punched_at=now + timedelta(minutes=m))
            for i, m in enumerate(fast_schedule)
        ]
    )

    # 山脊漫步者：58 分钟完赛
    slow = make_team("山脊漫步者", "周敏", ["周敏", "陈昊"])
    slow_schedule = [-58, -46, -35, -20, 0]
    Punch.objects.bulk_create(
        [
            Punch(team=slow, checkpoint=cps[i], punched_at=now + timedelta(minutes=m))
            for i, m in enumerate(slow_schedule)
        ]
    )

    # 指南针队：只打了 3 个点 -> 缺卡，进行中
    ongoing = make_team("指南针队", "赵琳", ["赵琳", "孙宇", "吴迪", "郑爽"])
    Punch.objects.bulk_create(
        [
            Punch(
                team=ongoing,
                checkpoint=cps[i],
                punched_at=now + timedelta(minutes=m),
            )
            for i, m in enumerate([-25, -18, -9])
        ]
    )


def rollback(apps, schema_editor):
    Course = apps.get_model("domain", "Course")
    Course.objects.filter(
        name__in=["滨江公园亲子寻宝线", "老城街巷穿越线", "西山山脊专业竞速线"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("domain", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, rollback),
    ]
