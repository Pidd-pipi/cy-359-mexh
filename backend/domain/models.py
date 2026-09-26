from django.db import models
from django.utils import timezone


class Course(models.Model):
    """定向越野线路：包含名额、难度、报名截止时间及若干检查点。"""

    class Difficulty(models.TextChoices):
        FAMILY = "family", "亲子"
        ADULT = "adult", "成人"
        PRO = "pro", "专业"

    name = models.CharField("线路名称", max_length=120, unique=True)
    description = models.CharField("线路简介", max_length=500, blank=True, default="")
    difficulty = models.CharField(
        "难度", max_length=16, choices=Difficulty.choices, default=Difficulty.ADULT
    )
    capacity = models.PositiveIntegerField("队伍名额")
    register_deadline = models.DateTimeField("报名截止时间")
    started = models.BooleanField("赛事是否已开始", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course"
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name


class Checkpoint(models.Model):
    """线路上的检查点（CP 点），参赛队伍需按序完成全部检查点打卡。"""

    course = models.ForeignKey(
        Course, related_name="checkpoints", on_delete=models.CASCADE
    )
    order = models.PositiveIntegerField("打卡顺序")
    code = models.CharField("检查点编码", max_length=40)
    name = models.CharField("检查点名称", max_length=120)

    class Meta:
        db_table = "checkpoint"
        ordering = ["course_id", "order"]
        unique_together = ("course", "order")

    def __str__(self) -> str:
        return f"{self.course.name}-CP{self.order}"


class Team(models.Model):
    """报名成功的队伍。个人报名时只含队长一名成员。"""

    course = models.ForeignKey(Course, related_name="teams", on_delete=models.CASCADE)
    name = models.CharField("队伍名称", max_length=120)
    leader_name = models.CharField("队长姓名", max_length=80)
    contact = models.CharField("联系方式", max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "team"
        ordering = ["id"]
        unique_together = ("course", "name")

    def __str__(self) -> str:
        return self.name


class TeamMember(models.Model):
    """队伍成员。同一人在同一线路中只能属于一支队伍。"""

    team = models.ForeignKey(Team, related_name="members", on_delete=models.CASCADE)
    name = models.CharField("成员姓名", max_length=80)

    class Meta:
        db_table = "team_member"
        ordering = ["id"]
        unique_together = ("team", "name")


class CourseMembership(models.Model):
    """线路级成员占位：跨队伍唯一，保证同一人在同一线路只属于一支队伍。"""

    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    member_name = models.CharField("成员姓名", max_length=80)

    class Meta:
        db_table = "course_membership"
        unique_together = ("course", "member_name")


class Punch(models.Model):
    """打卡记录：一支队伍在一个检查点至多打卡一次。"""

    team = models.ForeignKey(Team, related_name="punches", on_delete=models.CASCADE)
    checkpoint = models.ForeignKey(Checkpoint, on_delete=models.CASCADE)
    punched_at = models.DateTimeField("打卡时间", default=timezone.now)

    class Meta:
        db_table = "punch"
        ordering = ["punched_at"]
        unique_together = ("team", "checkpoint")
