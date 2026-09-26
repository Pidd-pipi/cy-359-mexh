from django.db import models
from django.utils import timezone


class Route(models.Model):
    """定向越野线路：设置名额、难度与报名截止时间。"""

    DIFFICULTY_FAMILY = "family"
    DIFFICULTY_ADULT = "adult"
    DIFFICULTY_PRO = "pro"
    DIFFICULTY_CHOICES = [
        (DIFFICULTY_FAMILY, "亲子"),
        (DIFFICULTY_ADULT, "成人"),
        (DIFFICULTY_PRO, "专业"),
    ]

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    quota = models.PositiveIntegerField(help_text="队伍名额")
    registration_deadline = models.DateTimeField(help_text="报名截止时间")
    start_time = models.DateTimeField(help_text="赛事开始时间")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name

    @property
    def registration_open(self):
        return timezone.now() < self.registration_deadline

    @property
    def started(self):
        return timezone.now() >= self.start_time


class Checkpoint(models.Model):
    """线路上的打卡点（CP点）。"""

    route = models.ForeignKey(Route, related_name="checkpoints", on_delete=models.CASCADE)
    seq = models.PositiveIntegerField(help_text="打卡顺序")
    name = models.CharField(max_length=120)
    clue = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["seq"]
        constraints = [
            models.UniqueConstraint(fields=["route", "seq"], name="uniq_checkpoint_seq_per_route"),
        ]

    def __str__(self):
        return f"{self.route_id}-CP{self.seq} {self.name}"


class Team(models.Model):
    """报名队伍：个人报名即一名成员的队伍。"""

    route = models.ForeignKey(Route, related_name="teams", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["route", "name"], name="uniq_team_name_per_route"),
        ]

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    """队员。route 冗余自 team.route，用于在数据库层保证同一线路内同一人只属于一支队伍。"""

    team = models.ForeignKey(Team, related_name="members", on_delete=models.CASCADE)
    route = models.ForeignKey(Route, related_name="roster", on_delete=models.CASCADE)
    name = models.CharField(max_length=80)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["route", "name"], name="uniq_member_per_route"),
            models.UniqueConstraint(fields=["team", "name"], name="uniq_member_per_team"),
        ]

    def __str__(self):
        return self.name


class Checkin(models.Model):
    """赛事开始后各队在打卡点的打卡记录。"""

    team = models.ForeignKey(Team, related_name="checkins", on_delete=models.CASCADE)
    checkpoint = models.ForeignKey(Checkpoint, related_name="checkins", on_delete=models.CASCADE)
    checked_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["checked_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["team", "checkpoint"], name="uniq_checkin_per_checkpoint"),
        ]

    def __str__(self):
        return f"team={self.team_id} cp={self.checkpoint_id}"
